import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { CompanyContextStore, type ContextState } from './company-context.store';

@Component({ selector: 'sic-company-selector', standalone: true, imports: [CommonModule, MatFormFieldModule, MatSelectModule, MatProgressSpinnerModule], template: `
      <section aria-live="polite" aria-label="Contexto de empresa">
        <mat-progress-spinner *ngIf="loading" diameter="24" aria-label="Cargando empresas" />
        <p *ngIf="!loading && (state === 'no-company' || state === 'invalidated')">{{ statusMessage(state) }}</p>
        <mat-form-field *ngIf="companies.length && state !== 'invalidated'" appearance="outline">
          <mat-label>Empresa activa</mat-label><mat-select [value]="selectedCompanyId" (selectionChange)="select($event.value)">
            <mat-option *ngFor="let company of companies" [value]="company.id">{{ company.name }}</mat-option>
          </mat-select>
        </mat-form-field>
      </section>` })
export class CompanySelectorComponent {
  readonly store: CompanyContextStore;
  constructor(store?: CompanyContextStore) { this.store = store ?? inject(CompanyContextStore); }
  get state() { return this.store.state.state; }
  get companies() { return this.store.state.companies; }
  get selectedCompanyId() { return this.store.selectedCompanyId; }
  get loading() { return this.state === 'loading-companies' || this.state === 'selecting' || this.state === 'loading-context'; }
  statusMessage(state: ContextState) { return state === 'no-company' ? 'No hay empresas disponibles.' : state === 'invalidated' ? 'Acceso denegado. Selecciona una empresa autorizada.' : 'Cargando empresas…'; }
  select(id: string) { void this.store.selectCompany(id); }
}
