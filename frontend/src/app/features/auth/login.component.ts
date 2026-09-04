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
  pending = false; message = '';
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
Component({ selector: 'sic-login', standalone: true, imports: [ReactiveFormsModule, MatButtonModule, MatFormFieldModule, MatInputModule], template: `<main class="auth-page"><div class="auth-split"><section class="auth-panel" aria-labelledby="login-title"><div class="auth-logo"><span class="brand-mark">S</span><span class="auth-logo-name">SIC</span></div><h1 id="login-title">Iniciar sesión</h1><p class="auth-tagline">Gestión de servicios y operaciones</p><form [formGroup]="form" (ngSubmit)="submit()" novalidate><label class="auth-label">Correo electrónico<mat-form-field appearance="outline"><input matInput type="email" formControlName="email" autocomplete="username" placeholder="nombre@empresa.com"><mat-error>El correo electrónico es obligatorio</mat-error></mat-form-field></label><label class="auth-label">Contraseña<mat-form-field appearance="outline"><input matInput type="password" formControlName="password" autocomplete="current-password" placeholder="••••••••"><mat-error>La contraseña es obligatoria</mat-error></mat-form-field></label><p class="error" role="alert" aria-live="polite">{{ message }}</p><button class="auth-submit" mat-flat-button color="primary" type="submit" [disabled]="pending">{{ pending ? 'Comprobando…' : 'Iniciar sesión' }}</button></form><p class="auth-footnote">Tu acceso está protegido por permisos administrados por la plataforma.</p></section><aside class="auth-visual" aria-hidden="true"><div class="stars"></div><div class="glyphs"><svg class="glyph drop" viewBox="0 0 64 64" fill="none"><path d="M32 6C32 6 14 26 14 40a18 18 0 0 0 36 0C50 26 32 6 32 6Z" fill="#4fc3f7" opacity=".9"/></svg><svg class="glyph bolt" viewBox="0 0 64 64" fill="none"><path d="M36 4 12 38h14l-4 22 26-34H34l2-22Z" fill="#f5a623"/></svg><svg class="glyph flame" viewBox="0 0 64 64" fill="none"><path d="M32 4c2 10-10 14-10 26a10 10 0 0 0 20 0c0-6-4-8-4-8s10 4 10 16a16 16 0 1 1-32 0C16 20 32 16 32 4Z" fill="#ff7a59"/></svg></div><div class="visual-caption"><span class="meter-label">Agua · Energía · Gas</span></div><span class="watermark">SIC</span></aside></div></main>` })(LoginComponent);
