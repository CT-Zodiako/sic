import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import {
  ADMIN_CHROME_END,
  ADMIN_CHROME_STATUS,
  ADMIN_CHROME_TOP,
  ADMIN_IMPORTS,
  ADMIN_STYLES,
  AdminSectionBase,
} from './platform-admin.base';

const TITLE =
  '<h1 id="admin-title">Empresas</h1><p class="intro">Creá empresas y revisá las existentes. Las asignaciones de rol siempre ocurren dentro de una empresa.</p>';

@Component({
  selector: 'sic-admin-empresas',
  standalone: true,
  imports: [...ADMIN_IMPORTS, RouterModule],
  styles: [ADMIN_STYLES],
  template:
    ADMIN_CHROME_TOP +
    TITLE +
    ADMIN_CHROME_STATUS +
    `    <mat-card>
      <h3 class="group-title">Empresas</h3>
      <p class="muted">Las asignaciones de rol siempre ocurren dentro de una empresa.</p>
      <div class="create-panel"><form aria-label="Crear empresa" (submit)="createCompany($event)"><label class="tw-field"><span class="tw-field-label">Nombre de la empresa <span class="req">*</span></span><input class="tw-input" name="name" required placeholder="Como la van a ver las personas. Ejemplo: Empresa C"></label><button class="btn-create" mat-flat-button color="primary" type="submit">+ Crear empresa</button></form><p class="preview-line">Resultado: la empresa queda disponible para vincular personas, crear roles y asignar servicios.</p><p class="inline-success" *ngIf="lastCompany" role="status">✓ Empresa <strong>{{lastCompany}}</strong> creada. Ya podés vincularle personas y servicios.</p></div>
      <div class="kpi-grid">
        <div class="kpi-card" style="--kpi-color:#0284c7"><span class="kpi-label">Total empresas</span><span class="kpi-value">{{kpiOf(screen.companies).total}}</span><span class="kpi-foot">Registradas</span></div>
        <div class="kpi-card" style="--kpi-color:#059669"><span class="kpi-label">Activas</span><span class="kpi-value">{{kpiOf(screen.companies).activos}}</span><span class="kpi-foot">Operando</span></div>
        <div class="kpi-card" style="--kpi-color:#dc2626"><span class="kpi-label">Inactivas</span><span class="kpi-value">{{kpiOf(screen.companies).inactivos}}</span><span class="kpi-foot">Sin acceso</span></div>
      </div>
      <div class="tw-table-search"><span class="material-symbols-outlined">search</span><input type="text" [value]="tableQueries['empresas'] ?? ''" (input)="setQuery('empresas', $any($event.target).value)" placeholder="Buscar empresa por nombre o persona…" aria-label="Buscar empresa"></div>
      <table mat-table [dataSource]="pagedRows('empresas', filteredSorted('empresas', screen.companies, ['name', 'status'], 'name'))" aria-label="Empresas creadas" class="data-table"><ng-container matColumnDef="name"><th mat-header-cell *matHeaderCellDef class="sortable" (click)="toggleSort('empresas', 'name')">Empresa <span class="sort-arrow">{{sortIndicator('empresas', 'name')}}</span></th><td mat-cell *matCellDef="let company"><span class="cell-main">{{company.name}}</span></td></ng-container><ng-container matColumnDef="people"><th mat-header-cell *matHeaderCellDef>Personas asignadas</th><td mat-cell *matCellDef="let company">{{companyPeople(company.id)}}</td></ng-container><ng-container matColumnDef="status"><th mat-header-cell *matHeaderCellDef class="sortable" (click)="toggleSort('empresas', 'status')">Estado <span class="sort-arrow">{{sortIndicator('empresas', 'status')}}</span></th><td mat-cell *matCellDef="let company"><span class="chip chip-table" [class.chip-inactive]="company.status === 'INACTIVE'">{{statusLabel(company.status)}}</span></td></ng-container><tr mat-header-row *matHeaderRowDef="['name','people','status']"></tr><tr mat-row *matRowDef="let row; columns: ['name','people','status']" [class.row-inactive]="row.status === 'INACTIVE'" [class.row-selected]="isSelected('empresas', row.id)" (click)="selectRow('empresas', row.id)"></tr></table>
      <div class="tw-pagination" *ngIf="screen.companies.length">
        <span>{{pageLabel('empresas', filteredSorted('empresas', screen.companies, ['name', 'status'], 'name'))}}</span>
        <span class="tw-page-btns">
          <button type="button" (click)="setPage('empresas', pageOf('empresas') - 1)" [disabled]="pageOf('empresas') <= 1" aria-label="Página anterior">‹</button>
          <button type="button" (click)="setPage('empresas', pageOf('empresas') + 1)" [disabled]="pageOf('empresas') >= pageCount(filteredSorted('empresas', screen.companies, ['name', 'status'], 'name'))" aria-label="Página siguiente">›</button>
        </span>
      </div>
      <p class="empty-state" *ngIf="!screen.companies.length">Aún no hay empresas configuradas. Siguiente paso: registra una empresa antes de asignar roles.</p>

      <h3 class="group-title">Vincular persona a una empresa</h3>
      <p class="muted"><strong>Qué hace:</strong> conecta el correo de una persona con una empresa. Sin este vínculo, la persona no puede elegir esa empresa ni recibir roles dentro de ella.</p>
      <div class="create-panel"><form aria-label="Vincular persona a una empresa" (submit)="createMembership($event)"><input type="hidden" name="userId" #memberUserId><input type="hidden" name="companyId" #memberCompanyId><mat-form-field appearance="outline"><mat-label>Persona (correo)</mat-label><mat-select required (selectionChange)="memberUserId.value = $event.value; selectedMembershipUserId = $event.value"><mat-option *ngFor="let user of screen.users" [value]="user.id">{{user.name}} · {{user.email}}</mat-option></mat-select><mat-hint>Quién obtiene acceso</mat-hint></mat-form-field><mat-form-field appearance="outline"><mat-label>Empresa</mat-label><mat-select required (selectionChange)="memberCompanyId.value = $event.value" [disabled]="!selectedMembershipUserId"><mat-option *ngFor="let company of availableCompanies()" [value]="company.id">{{company.name}}</mat-option></mat-select><mat-hint>{{selectedMembershipUserId ? (availableCompanies().length ? 'Solo las que aún no tiene vinculadas' : 'Esta persona ya está en todas las empresas') : 'Primero elegí la persona'}}</mat-hint></mat-form-field><button class="btn-create" mat-flat-button color="primary" type="submit" [disabled]="!availableCompanies().length">+ Vincular</button></form><p class="preview-line">Resultado: la persona puede elegir la empresa en la barra superior y ya aparece en «Asignar rol».</p><p class="inline-success" *ngIf="lastMembership" role="status">✓ {{lastMembership}} vinculada a la empresa. Ya podés asignarle un rol.</p></div>



<h3 class="group-title">Asignaciones vigentes</h3>
      <p class="muted action-help">«Desactivar» retira el acceso de la persona a esa empresa, sin borrar nada.</p>
      <table mat-table [dataSource]="screen.memberships" aria-label="Asignaciones vigentes" class="data-table"><ng-container matColumnDef="person"><th mat-header-cell *matHeaderCellDef>Persona</th><td mat-cell *matCellDef="let membership"><strong>{{userName(membership.userId)}}</strong></td></ng-container><ng-container matColumnDef="company"><th mat-header-cell *matHeaderCellDef>Empresa</th><td mat-cell *matCellDef="let membership">{{companyName(membership.companyId)}}</td></ng-container><ng-container matColumnDef="status"><th mat-header-cell *matHeaderCellDef>Estado</th><td mat-cell *matCellDef="let membership"><span class="chip chip-table" [class.chip-inactive]="membership.status === 'INACTIVE'">{{statusLabel(membership.status)}}</span></td></ng-container><ng-container matColumnDef="actions"><th mat-header-cell *matHeaderCellDef>Acciones</th><td mat-cell *matCellDef="let membership"><button mat-button class="danger" type="button" (click)="confirmMembership(membership.id, userName(membership.userId))" [disabled]="membership.status === 'INACTIVE'" title="Desactivar retira el acceso de la persona a esta empresa. Nada se borra.">Desactivar</button></td></ng-container><tr mat-header-row *matHeaderRowDef="['person','company','status','actions']"></tr><tr mat-row *matRowDef="let row; columns: ['person','company','status','actions']" [class.row-inactive]="row.status === 'INACTIVE'"></tr></table>
    </mat-card>` +
    ADMIN_CHROME_END,
})
export class AdminEmpresasComponent extends AdminSectionBase {}
