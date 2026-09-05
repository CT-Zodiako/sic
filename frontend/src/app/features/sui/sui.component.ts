import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTableModule } from '@angular/material/table';
import { CompanyContextStore } from '../company-context/company-context.store';

type View = 'home' | 'crear' | 'acumulado';
type AcumuladoRow = { periodo: string; consumo: number; energia: number; alumbrado: number; intereses: number; total: number };

const randomRow = (periodo: string, seed: number): AcumuladoRow => {
  const rnd = (n: number) => Math.floor(((Math.sin(seed * n) + 1) / 2) * 100 * n) / 100;
  const consumo = Math.floor(180 + rnd(3) * 240);
  const energia = Math.round(consumo * (180 + rnd(5) * 60));
  const alumbrado = Math.round(energia * 0.08);
  const intereses = Math.round(energia * rnd(2) * 0.03);
  return { periodo, consumo, energia, alumbrado, intereses, total: energia + alumbrado + intereses };
};

/** Sui module: home with permission-driven actions, a broad energy receipt form, and an accumulated table. */
@Component({
  selector: 'sic-sui', standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatButtonModule, MatCardModule, MatFormFieldModule, MatInputModule, MatSelectModule, MatTableModule],
  styles: [`.receipt { position: relative; overflow: hidden; } .receipt::before { content: ""; position: absolute; top: -120px; right: -120px; width: 260px; height: 260px; background: rgba(27, 95, 193, .06); border-radius: 999px; filter: blur(48px); pointer-events: none; } .receipt-head { margin-bottom: 20px; position: relative; } .receipt-head h2 { margin: 0 0 4px; font-size: 1.4rem; } .receipt-section { position: relative; margin-bottom: 26px; } .receipt-section h3 { display: flex; align-items: center; gap: 8px; margin: 0 0 14px; font-size: 1.02rem; color: var(--tinta); } .sec-icon { font-size: 1.1rem; } .receipt-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; } .field { display: flex; flex-direction: column; gap: 5px; } .field-label { font-family: var(--font-data); font-size: .68rem; font-weight: 600; letter-spacing: .09em; text-transform: uppercase; color: var(--tinta); } .field input, .field select, .field textarea { width: 100%; min-height: 40px; padding: 8px 12px; background: #ffffff; border: 1px solid #cbd5e1; border-radius: 7px; font-family: var(--font-body); font-size: .82rem; color: #0f172a; transition: border-color .15s, box-shadow .15s; } .field input:focus, .field select:focus, .field textarea:focus { outline: none; border-color: #0284c7; box-shadow: 0 0 0 1px #0284c7; } .field select { cursor: pointer; appearance: none; background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%233d5560' stroke-width='2' fill='none'/%3E%3C/svg%3E"); background-repeat: no-repeat; background-position: right 12px center; padding-right: 32px; } .field-help { font-size: .76rem; color: var(--tinta-suave); } .span-2 { grid-column: span 2; } .span-3 { grid-column: span 3; } .receipt-actions { display: flex; justify-content: flex-end; gap: 12px; padding-top: 18px; border-top: 1px solid var(--linea); } .chip-box { display: flex; flex-wrap: wrap; gap: 6px; padding: 8px 10px; background: #ffffff; border: 1px solid #cbd5e1; border-radius: 7px; align-items: center; } .chip-box:focus-within { border-color: #0284c7; box-shadow: 0 0 0 1px #0284c7; } .chip-chip { display: inline-flex; align-items: center; gap: 5px; padding: 3px 10px; background: rgba(2,132,199,.12); color: #0369a1; border: 1px solid rgba(2,132,199,.25); border-radius: 999px; font-size: .72rem; font-weight: 700; } .chip-chip button { border: 0; background: none; color: inherit; font-weight: 700; cursor: pointer; padding: 0; } .chip-input { border: 0; background: transparent; flex: 1; min-width: 90px; font-size: .9rem; } .chip-input:focus { outline: none; } .option-box { display: grid; gap: 8px; padding: 12px; background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 10px; } .option { display: flex; align-items: center; gap: 8px; padding: 8px 10px; background: #ffffff; border: 1px solid #cbd5e1; border-radius: 7px; font-size: .82rem; color: #0f172a; cursor: pointer; transition: border-color .15s; } .option:hover { border-color: #0284c7; } .option input { width: 15px; height: 15px; accent-color: #0284c7; margin: 0; } .switch-row { display: flex; align-items: center; justify-content: space-between; gap: 14px; padding: 10px 0; } .switch-text { display: grid; gap: 2px; } .switch-text small { color: var(--tinta-suave); } .switch { position: relative; display: inline-block; width: 44px; height: 24px; flex-shrink: 0; } .switch input { z-index: 1; } .switch input { position: absolute; opacity: 0; width: 100%; height: 100%; cursor: pointer; margin: 0; } .switch-track { position: absolute; inset: 0; background: #d8dadc; border-radius: 999px; transition: background .18s; pointer-events: none; } .switch-track::after { content: ""; position: absolute; top: 2px; left: 2px; width: 20px; height: 20px; background: #fff; border-radius: 999px; box-shadow: 0 1px 3px rgba(0,0,0,.25); transition: transform .18s; } .switch input:checked + .switch-track { background: #0284c7; } .switch input:checked + .switch-track::after { transform: translateX(20px); } .field-error { border-color: var(--btn-rojo) !important; } .field-error:focus { box-shadow: 0 0 0 3px rgba(198, 40, 40, .16) !important; } .field-error-text { font-size: .76rem; color: var(--btn-rojo); } @media (max-width: 760px) { .receipt-grid { grid-template-columns: 1fr; } .span-2, .span-3 { grid-column: span 1; } } .sui { max-width: 1100px; margin: 0 auto; padding: 8px 0 48px; } .sui-nav { display: flex; gap: 8px; margin: 12px 0 20px; border-bottom: 1px solid var(--border); padding-bottom: 10px; } .sui-nav button { font-weight: 600; } .sui-nav .active { background: var(--blue-soft); border-radius: 8px; color: var(--navy); } .sui-actions { display: flex; gap: 14px; margin: 22px 0; flex-wrap: wrap; } .sui-actions button { min-height: 56px; padding: 0 28px; font-size: 1rem; } .form-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px 16px; } .form-grid mat-form-field { width: 100%; } .span-2 { grid-column: span 2; } .span-3 { grid-column: span 3; } .acumulado-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; } table { width: 100%; margin-top: 12px; } .success { margin: 12px 0; padding: 12px 16px; background: #e6f4ea; color: #1e7e34; border-radius: 10px; } .muted { color: var(--text-muted); } @media (max-width: 760px) { .form-grid { grid-template-columns: 1fr; } .span-2, .span-3 { grid-column: span 1; } }`],
  template: `<section class="sui" aria-labelledby="sui-title">
    <h1 id="sui-title">Sui</h1>
    <nav class="sui-nav" aria-label="Acciones de sui">
      <button mat-button type="button" [class.active]="view === 'home'" (click)="view = 'home'">Inicio</button>
      <button *ngIf="can('sui.crear')" mat-button type="button" [class.active]="view === 'crear'" (click)="view = 'crear'">+ Crear</button>
      <button *ngIf="can('sui.veracomulado')" mat-button type="button" [class.active]="view === 'acumulado'" (click)="openAcumulado()">Ver acumulado</button>
    </nav>

    <ng-container [ngSwitch]="view">
      <!-- Home: acciones según permisos -->
      <div *ngSwitchCase="'home'">
        <p class="muted">Elegí una acción en la barra de arriba. Las acciones disponibles dependen de tus permisos en esta empresa.</p>
        <p *ngIf="!can('sui.crear') && !can('sui.veracomulado')" class="muted">No tenés acciones disponibles en sui. Pedile al administrador que te asigne funciones desde Roles.</p>
      </div>

      <!-- Crear: recibo de energía -->
      <mat-card *ngSwitchCase="'crear'" class="receipt">
        <div class="receipt-head">
          <h2>Nuevo recibo de energía</h2>
          <p class="muted">Completá los datos del recibo. Los campos con * son obligatorios.</p>
        </div>
        <form [formGroup]="form" (ngSubmit)="submit()" novalidate>
          <section class="receipt-section">
            <h3><span class="sec-icon">👤</span> Datos del titular</h3>
            <div class="receipt-grid">
              <label class="field"><span class="field-label">Estrato *</span><select formControlName="estrato"><option *ngFor="let n of [1,2,3,4,5,6]" [value]="n">Estrato {{n}}</option></select></label>
              <label class="field"><span class="field-label">Matrícula *</span><input formControlName="matricula" placeholder="Ej: 4589231"><small class="field-help">Número de cuenta del servicio.</small></label>
              <label class="field"><span class="field-label">NIC *</span><input formControlName="nic" placeholder="Ej: 7742016"></label>
              <label class="field span-2"><span class="field-label">Nombre del titular *</span><input formControlName="nombre" placeholder="Nombre y apellido"></label>
              <label class="field"><span class="field-label">Documento *</span><input formControlName="documento" placeholder="CC / NIT"></label>
              <label class="field span-2"><span class="field-label">Dirección *</span><input formControlName="direccion" placeholder="Calle 12 # 34-56"></label>
              <label class="field"><span class="field-label">Barrio</span><input formControlName="barrio"></label>
              <label class="field"><span class="field-label">Municipio *</span><input formControlName="municipio"></label>
              <label class="field"><span class="field-label">Departamento</span><input formControlName="departamento"></label>
            </div>
          </section>
          <section class="receipt-section">
            <h3><span class="sec-icon">🧾</span> Facturación</h3>
            <div class="receipt-grid">
              <label class="field"><span class="field-label">Periodo *</span><input formControlName="periodo" placeholder="2026-08"></label>
              <label class="field"><span class="field-label">Fecha de expedición</span><input formControlName="expedicion" type="date"></label>
              <label class="field"><span class="field-label">Lectura anterior (kWh) *</span><input formControlName="lecturaAnterior" type="number"></label>
              <label class="field"><span class="field-label">Lectura actual (kWh) *</span><input formControlName="lecturaActual" type="number"></label>
              <label class="field"><span class="field-label">Consumo (kWh) *</span><input formControlName="consumo" type="number"><small class="field-help">Se calcula: lectura actual − anterior.</small></label>
              <label class="field"><span class="field-label">Tarifa por kWh *</span><input formControlName="tarifa" type="number"></label>
            </div>
          </section>
          <section class="receipt-section">
            <h3><span class="sec-icon">⚡</span> Tipo y cargos</h3>
            <div class="receipt-grid">
              <div class="field span-2"><span class="field-label">Tipo de consumo</span>
                <div class="option-box">
                  <label class="option"><input type="radio" name="tipo-consumo" checked> <span>Residencial</span></label>
                  <label class="option"><input type="radio" name="tipo-consumo"> <span>Comercial</span></label>
                  <label class="option"><input type="radio" name="tipo-consumo"> <span>Industrial</span></label>
                </div>
              </div>
              <div class="field"><span class="field-label">Cargos adicionales</span>
                <div class="option-box">
                  <label class="option"><input type="checkbox" checked> <span>Alumbrado público</span></label>
                  <label class="option"><input type="checkbox"> <span>Intereses de mora</span></label>
                  <label class="option"><input type="checkbox"> <span>Reconexión</span></label>
                </div>
              </div>
              <label class="field"><span class="field-label">Subsidio (%)</span><input formControlName="subsidio" type="number"></label>
              <label class="field"><span class="field-label">Alumbrado público</span><input formControlName="alumbrado" type="number"></label>
              <label class="field"><span class="field-label">Intereses</span><input formControlName="intereses" type="number"></label>
              <label class="field"><span class="field-label">Otros cobros</span><input formControlName="otros" type="number"></label>
            </div>
          </section>
          <section class="receipt-section">
            <h3><span class="sec-icon">🔔</span> Entrega y servicios</h3>
            <div class="receipt-grid">
              <div class="field span-2"><span class="field-label">Entrega</span>
                <div class="switch-row">
                  <span class="switch-text"><strong>Recibo electrónico</strong><small>Envío por correo en vez de físico.</small></span>
                  <label class="switch"><input type="checkbox" checked><span class="switch-track"></span></label>
                </div>
                <div class="switch-row">
                  <span class="switch-text"><strong>Notificar consumos altos</strong><small>Alerta cuando el consumo supere el promedio.</small></span>
                  <label class="switch"><input type="checkbox"><span class="switch-track"></span></label>
                </div>
              </div>
              <div class="field"><span class="field-label">Servicios incluidos</span>
                <div class="chip-box"><span class="chip-chip">Energía <button type="button" aria-label="Quitar">×</button></span><input class="chip-input" placeholder="Añadir…"></div>
                <small class="field-help">Etiquetas removibles para servicios asociados.</small>
              </div>
            </div>
          </section>

          <section class="receipt-section">
            <h3><span class="sec-icon">📝</span> Observaciones</h3>
            <label class="field span-3"><textarea formControlName="observaciones" rows="3" placeholder="Notas internas del recibo…"></textarea></label>
          </section>
          <div class="receipt-actions">
            <button class="btn btn-outline" type="button" (click)="view = 'home'">Cancelar</button>
            <button class="btn btn-azul" type="submit" [disabled]="form.invalid">Guardar recibo</button>
          </div>
        </form>
        <p class="success" *ngIf="saved">✓ Recibo guardado correctamente (matrícula {{saved}}). Podés verlo en «Ver acumulado».</p>
      </mat-card>

      <!-- Acumulado: tabla con datos de ejemplo -->
      <mat-card *ngSwitchCase="'acumulado'">
        <div class="acumulado-head">
          <div>
            <mat-card-title>Acumulado</mat-card-title>
            <p class="muted">Consumos y cobros acumulados por periodo (datos de ejemplo).</p>
          </div>
          <button *ngIf="can('sui.exportar')" class="btn btn-azul" type="button" (click)="exportar()">Exportar</button>
        </div>
        <table mat-table [dataSource]="acumulado" aria-label="Acumulado">
          <ng-container matColumnDef="periodo"><th mat-header-cell *matHeaderCellDef>Periodo</th><td mat-cell *matCellDef="let row">{{row.periodo}}</td></ng-container>
          <ng-container matColumnDef="consumo"><th mat-header-cell *matHeaderCellDef>Consumo (kWh)</th><td mat-cell *matCellDef="let row">{{row.consumo}}</td></ng-container>
          <ng-container matColumnDef="energia"><th mat-header-cell *matHeaderCellDef>Energía</th><td mat-cell *matCellDef="let row">$ {{row.energia | number}}</td></ng-container>
          <ng-container matColumnDef="alumbrado"><th mat-header-cell *matHeaderCellDef>Alumbrado</th><td mat-cell *matCellDef="let row">$ {{row.alumbrado | number}}</td></ng-container>
          <ng-container matColumnDef="intereses"><th mat-header-cell *matHeaderCellDef>Intereses</th><td mat-cell *matCellDef="let row">$ {{row.intereses | number}}</td></ng-container>
          <ng-container matColumnDef="total"><th mat-header-cell *matHeaderCellDef>Total</th><td mat-cell *matCellDef="let row"><strong>$ {{row.total | number}}</strong></td></ng-container>
          <ng-container matColumnDef="acciones"><th mat-header-cell *matHeaderCellDef>Acciones</th><td mat-cell *matCellDef="let row"><button *ngIf="can('sui.anular')" class="danger" type="button" (click)="anular(row)">Anular</button></td></ng-container>
          <tr mat-header-row *matHeaderRowDef="['periodo','consumo','energia','alumbrado','intereses','total','acciones']"></tr>
          <tr mat-row *matRowDef="let row; columns: ['periodo','consumo','energia','alumbrado','intereses','total','acciones']"></tr>
        </table>
        <p><button mat-button type="button" (click)="view = 'home'">Volver</button></p>
      </mat-card>
    </ng-container>
  </section>`
})
export class SuiComponent {
  private readonly context = inject(CompanyContextStore);
  view: View = 'home';
  saved = '';
  acumulado: AcumuladoRow[] = [];
  readonly form = new FormGroup({
    estrato: new FormControl(1, { nonNullable: true, validators: Validators.required }),
    matricula: new FormControl('', { nonNullable: true, validators: Validators.required }),
    nic: new FormControl('', { nonNullable: true, validators: Validators.required }),
    nombre: new FormControl('', { nonNullable: true, validators: Validators.required }),
    documento: new FormControl('', { nonNullable: true, validators: Validators.required }),
    direccion: new FormControl('', { nonNullable: true, validators: Validators.required }),
    barrio: new FormControl('', { nonNullable: true }),
    municipio: new FormControl('', { nonNullable: true, validators: Validators.required }),
    departamento: new FormControl('', { nonNullable: true }),
    periodo: new FormControl('', { nonNullable: true, validators: Validators.required }),
    expedicion: new FormControl('', { nonNullable: true }),
    lecturaAnterior: new FormControl<number | null>(null, { validators: Validators.required }),
    lecturaActual: new FormControl<number | null>(null, { validators: Validators.required }),
    consumo: new FormControl<number | null>(null, { validators: Validators.required }),
    tarifa: new FormControl<number | null>(null, { validators: Validators.required }),
    subsidio: new FormControl<number | null>(null),
    alumbrado: new FormControl<number | null>(null),
    intereses: new FormControl<number | null>(null),
    otros: new FormControl<number | null>(null),
    observaciones: new FormControl('', { nonNullable: true }),
  });
  can(code: string) { return this.context.can(code); }
  exportar() { globalThis.alert?.('Exportación simulada: se descargó el acumulado.'); }
  anular(row: { periodo: string }) { if (globalThis.confirm?.(`¿Anular el periodo ${row.periodo}?`)) this.acumulado = this.acumulado.filter((entry) => entry.periodo !== row.periodo); }
  openAcumulado() {
    if (!this.acumulado.length) this.acumulado = ['2026-03', '2026-04', '2026-05', '2026-06', '2026-07', '2026-08'].map((periodo, index) => randomRow(periodo, index + 7));
    this.view = 'acumulado';
  }
  submit() { if (this.form.invalid) { this.form.markAllAsTouched(); return; } this.saved = this.form.controls.matricula.value; this.form.reset({ estrato: 1 }); }
}
