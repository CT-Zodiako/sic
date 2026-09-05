import { HttpClient } from '@angular/common/http';
import { Component, inject } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { AuthApiClient } from '../../core/auth.api';
import { AuthStore } from '../../core/auth.store';
import { HttpClientTransport } from '../../core/http-client.transport';

export class LoginComponent {
  readonly form = new FormGroup({ email: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.email] }), password: new FormControl('', { nonNullable: true, validators: Validators.required }) });
  pending = false; message = ''; env: 'comercial' | 'operativo' = 'comercial';
  private readonly api: Pick<AuthApiClient, 'login'>;
  private readonly store?: AuthStore;
  private readonly router?: Router;
  constructor(...args: [Pick<AuthApiClient, 'login'>?, AuthStore?, Router?]) {
    this.api = args[0] ?? new AuthApiClient(new HttpClientTransport(inject(HttpClient)));
    this.store = args[1] ?? this.tryInject(() => inject(AuthStore));
    this.router = args[2] ?? this.tryInject(() => inject(Router));
  }
  async submit(): Promise<void> {
    this.message = ''; if (this.form.invalid) { this.form.markAllAsTouched(); return; } this.pending = true;
    try { const result = await this.api.login(this.form.controls.email.value, this.form.controls.password.value); if (!result.body || !this.store || !this.router) throw new Error('login dependencies unavailable'); this.store.setSession(result.body.accessToken, result.body.user); await this.router.navigateByUrl('/'); }
    catch { this.message = 'No se pudo iniciar sesión. Comprueba tus credenciales.'; } finally { this.pending = false; }
  }
  private tryInject<T>(factory: () => T): T | undefined { try { return factory(); } catch { return undefined; } }
}
Component({ selector: 'sic-login', standalone: true, imports: [ReactiveFormsModule, MatButtonModule, MatFormFieldModule, MatInputModule], template: `<div class="min-h-screen flex flex-col bg-[#f8fafc] text-on-surface font-sans antialiased">
  <header class="w-full bg-white border-b border-slate-200 px-6 h-16 flex items-center justify-between shadow-sm">
    <div class="flex items-center gap-3">
      <span class="w-9 h-9 rounded-lg bg-primary text-on-primary flex items-center justify-center font-bold shadow-md shadow-sky-600/20">S</span>
      <h1 class="text-base font-bold tracking-tight text-slate-900 hidden sm:block">SIC <span class="text-primary font-semibold">| Servicios Públicos</span></h1>
    </div>

  </header>

  <main class="flex-1 grid grid-cols-1 lg:grid-cols-12 w-full max-w-[1500px] mx-auto p-4 lg:p-6 gap-5 items-stretch">
    <!-- Panel de acceso -->
    <section class="lg:col-span-4 flex flex-col bg-white border border-slate-200 rounded-xl shadow-xl relative overflow-hidden">
      <div class="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary via-error to-tertiary"></div>
      <div class="p-6 flex flex-col gap-6 flex-1">
        <div>
          <label class="block text-[0.68rem] font-semibold uppercase tracking-widest text-slate-600 mb-1.5">Entorno de gestión</label>
          <div class="grid grid-cols-2 gap-1 p-1 bg-slate-100 border border-slate-200 rounded">
            <button type="button" (click)="env = 'comercial'" class="flex items-center justify-center gap-1.5 py-1.5 px-2 rounded text-xs font-semibold transition-all" [class]="env === 'comercial' ? 'bg-primary text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'">
              <span class="material-symbols-outlined text-sm">receipt_long</span> Comercial
            </button>
            <button type="button" (click)="env = 'operativo'" class="flex items-center justify-center gap-1.5 py-1.5 px-2 rounded text-xs font-semibold transition-all" [class]="env === 'operativo' ? 'bg-primary text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'">
              <span class="material-symbols-outlined text-sm">sensors</span> Operativo
            </button>
          </div>
        </div>

        <form [formGroup]="form" (ngSubmit)="submit()" novalidate class="flex flex-col gap-5">
          <div>
            <label class="block text-[0.68rem] font-semibold uppercase tracking-widest text-slate-700 mb-1.5" for="role-select">Perfil de acceso</label>
            <div class="relative">
              <select id="role-select" class="w-full bg-white border border-slate-300 text-slate-900 rounded py-2.5 px-3 text-sm outline-none transition appearance-none shadow-sm focus:border-primary focus:ring-2 focus:ring-sky-100">
                <option>Administrador de la plataforma</option>
                <option>Operaciones</option>
              </select>
              <span class="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" style="font-size:20px">expand_more</span>
            </div>
          </div>

          <div>
            <label class="block text-[0.68rem] font-semibold uppercase tracking-widest text-slate-700 mb-1.5" for="email">Correo electrónico / ID</label>
            <div class="relative">
              <span class="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" style="font-size:20px">mail</span>
              <input id="email" formControlName="email" type="email" autocomplete="username" placeholder="nombre@empresa.com" class="w-full bg-white border border-slate-300 rounded py-2.5 pl-10 pr-3 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition shadow-sm focus:border-primary focus:ring-2 focus:ring-sky-100">
            </div>
          </div>

          <div>
            <div class="flex justify-between items-center mb-1.5">
              <label class="text-[0.68rem] font-semibold uppercase tracking-widest text-slate-700" for="password">Contraseña</label>
              <a class="text-[0.68rem] font-semibold text-primary hover:text-sky-700 hover:underline" href="javascript:void(0)">¿Olvidó su contraseña?</a>
            </div>
            <div class="relative">
              <span class="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" style="font-size:20px">lock</span>
              <input id="password" formControlName="password" type="password" autocomplete="current-password" placeholder="••••••••••••" class="w-full bg-white border border-slate-300 rounded py-2.5 pl-10 pr-10 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition shadow-sm focus:border-primary focus:ring-2 focus:ring-sky-100">
              <span class="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" style="font-size:20px">visibility</span>
            </div>
          </div>

          <p class="text-sm text-error min-h-[1rem] -my-2" role="alert" aria-live="polite">{{ message }}</p>

          <button type="submit" [disabled]="pending" class="w-full py-2.5 px-4 rounded text-sm font-semibold bg-primary text-white transition duration-150 shadow-md shadow-sky-600/20 hover:bg-sky-700 active:scale-[0.99] flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
            <span class="material-symbols-outlined text-lg">login</span>
            {{ pending ? 'Comprobando…' : 'Iniciar sesión' }}
          </button>
        </form>
      </div>
      <div class="px-6 py-4 border-t border-slate-200 text-center">
        <p class="text-[0.7rem] text-slate-500">Sistema Integral de Servicios · Acceso restringido a personal autorizado</p>
      </div>
    </section>

    <!-- Panel de servicios -->
    <section class="hidden lg:flex lg:col-span-8 flex-col gap-5">
      <div class="bg-white border border-slate-200 rounded-xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
        <div class="max-w-2xl">
          <div class="inline-flex items-center gap-2 mb-1.5">
            <span class="text-[0.68rem] font-semibold uppercase tracking-widest text-primary">Panel de acceso</span>
          </div>
          <h2 class="text-xl font-bold text-slate-900 mb-1.5">Gestión integral de servicios públicos</h2>
          <p class="text-sm text-slate-600">Infraestructura digital para la administración, monitoreo y distribución eficiente de Agua, Energía y Gas.</p>
        </div>
        <div class="hidden md:flex flex-col items-end shrink-0 gap-1 border-l border-slate-200 pl-6">
          <span class="text-2xl font-bold text-slate-900 tracking-tight">3</span>
          <span class="text-[0.68rem] font-semibold uppercase tracking-widest text-slate-500">Servicios activos</span>
        </div>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-3 gap-5 flex-1 items-stretch">
        <!-- Agua -->
        <div class="group relative flex flex-col bg-white border-2 border-sky-500/80 hover:border-sky-600 rounded-xl p-5 transition-all duration-300 hover:-translate-y-1 shadow-sm">
          <div class="absolute top-0 left-0 right-0 h-1.5 bg-sky-500 rounded-t-xl"></div>
          <div class="flex justify-between items-center mb-4 mt-1">
            <div class="w-9 h-9 rounded-full bg-sky-50 flex items-center justify-center text-sky-600 border border-sky-100">
              <span class="material-symbols-outlined">water_drop</span>
            </div>
            <span class="text-[0.62rem] font-semibold uppercase tracking-widest text-sky-700 bg-sky-50 border border-sky-100 rounded-full px-2 py-0.5">Activo</span>
          </div>
          <div class="w-full h-32 rounded-lg bg-gradient-to-b from-sky-50/80 to-sky-100/50 border border-sky-100 flex items-center justify-center relative overflow-hidden mb-4 group-hover:scale-[1.02] transition-transform">
            <div class="w-16 h-16 rounded-full bg-gradient-to-tr from-sky-600 to-sky-400 flex items-center justify-center shadow-lg shadow-sky-500/30 border-2 border-sky-200">
              <span class="material-symbols-outlined text-white" style="font-size:32px">water_drop</span>
            </div>
          </div>
          <h3 class="text-base font-bold text-slate-900 mb-1">Agua</h3>
          <p class="text-xs text-slate-600 leading-relaxed flex-1">Distribución, medición y facturación del servicio de acueducto con control de consumos por periodo.</p>
          <div class="mt-4 pt-3 border-t border-slate-200 flex items-center gap-2 text-sky-700 text-[0.68rem] font-semibold uppercase tracking-widest">
            <span class="material-symbols-outlined text-sm">monitoring</span>
            <span>Lecturas y consumos IRCA</span>
          </div>
        </div>

        <!-- Energía -->
        <div class="group relative flex flex-col bg-white border-2 border-amber-500/80 hover:border-amber-600 rounded-xl p-5 transition-all duration-300 hover:-translate-y-1 shadow-sm">
          <div class="absolute top-0 left-0 right-0 h-1.5 bg-amber-500 rounded-t-xl"></div>
          <div class="flex justify-between items-center mb-4 mt-1">
            <div class="w-9 h-9 rounded-full bg-amber-50 flex items-center justify-center text-amber-600 border border-amber-100">
              <span class="material-symbols-outlined">bolt</span>
            </div>
            <span class="text-[0.62rem] font-semibold uppercase tracking-widest text-amber-700 bg-amber-50 border border-amber-100 rounded-full px-2 py-0.5">Activo</span>
          </div>
          <div class="w-full h-32 rounded-lg bg-gradient-to-b from-amber-50/80 to-amber-100/50 border border-amber-100 flex items-center justify-center relative overflow-hidden mb-4 group-hover:scale-[1.02] transition-transform">
            <div class="w-16 h-16 rounded-full bg-gradient-to-tr from-amber-600 to-amber-400 flex items-center justify-center shadow-lg shadow-amber-500/30 border-2 border-amber-200">
              <span class="material-symbols-outlined text-white" style="font-size:32px">bolt</span>
            </div>
          </div>
          <h3 class="text-base font-bold text-slate-900 mb-1">Energía</h3>
          <p class="text-xs text-slate-600 leading-relaxed flex-1">Recibos de energía con lecturas, tarifas por kWh, subsidios y cargos adicionales por periodo.</p>
          <div class="mt-4 pt-3 border-t border-slate-200 flex items-center gap-2 text-amber-700 text-[0.68rem] font-semibold uppercase tracking-widest">
            <span class="material-symbols-outlined text-sm">electric_meter</span>
            <span>Recibos y tarifas kWh</span>
          </div>
        </div>

        <!-- Gas -->
        <div class="group relative flex flex-col bg-white border-2 border-emerald-500/80 hover:border-emerald-600 rounded-xl p-5 transition-all duration-300 hover:-translate-y-1 shadow-sm">
          <div class="absolute top-0 left-0 right-0 h-1.5 bg-emerald-600 rounded-t-xl"></div>
          <div class="flex justify-between items-center mb-4 mt-1">
            <div class="w-9 h-9 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600 border border-emerald-100">
              <span class="material-symbols-outlined">local_fire_department</span>
            </div>
            <span class="text-[0.62rem] font-semibold uppercase tracking-widest text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-full px-2 py-0.5">Activo</span>
          </div>
          <div class="w-full h-32 rounded-lg bg-gradient-to-b from-emerald-50/80 to-emerald-100/50 border border-emerald-100 flex items-center justify-center relative overflow-hidden mb-4 group-hover:scale-[1.02] transition-transform">
            <div class="w-16 h-16 rounded-full bg-gradient-to-tr from-emerald-600 to-emerald-400 flex items-center justify-center shadow-lg shadow-emerald-500/30 border-2 border-emerald-200">
              <span class="material-symbols-outlined text-white" style="font-size:32px">local_fire_department</span>
            </div>
          </div>
          <h3 class="text-base font-bold text-slate-900 mb-1">Gas</h3>
          <p class="text-xs text-slate-600 leading-relaxed flex-1">Gestión de redes de gas natural, inspecciones periódicas y control de habilitación por empresa.</p>
          <div class="mt-4 pt-3 border-t border-slate-200 flex items-center gap-2 text-emerald-700 text-[0.68rem] font-semibold uppercase tracking-widest">
            <span class="material-symbols-outlined text-sm">propane_tank</span>
            <span>Redes e inspecciones</span>
          </div>
        </div>
      </div>
    </section>
  </main>

  <footer class="w-full bg-white border-t border-slate-200 px-6 py-4 flex items-center justify-center gap-6 text-[0.7rem] text-slate-500">
    <span>© 2026 SIC · Sistema Integral de Servicios</span>
    <a href="javascript:void(0)" class="hover:text-slate-700 hover:underline">Términos de servicio</a>
    <span>·</span>
    <a href="javascript:void(0)" class="hover:text-slate-700 hover:underline">Política de privacidad</a>
  </footer>
</div>` })(LoginComponent);
