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
  '<h1 id="admin-title">Servicios</h1><p class="intro">Administrá el catálogo (Acueducto, Energía, Gas y los que crees) y qué servicios tiene habilitada cada empresa.</p>';

@Component({
  selector: 'sic-admin-servicios',
  standalone: true,
  imports: [...ADMIN_IMPORTS, RouterModule],
  styles: [ADMIN_STYLES],
  template:
    ADMIN_CHROME_TOP +
    TITLE +
    ADMIN_CHROME_STATUS +
    `<mat-card aria-labelledby="step-services">

      <h3 class="group-title">Crear servicio</h3>
      <div class="create-panel"><form aria-label="Crear servicio" (submit)="createService($event)"><label class="tw-field"><span class="tw-field-label">Nombre del servicio <span class="req">*</span></span><input class="tw-input" name="name" required (input)="updateServicePreview()" placeholder="Por ejemplo: Agua, Energía, Gas"></label><label class="tw-field"><span class="tw-field-label">Código (se genera solo)</span><input class="tw-input" name="code" [value]="generatedServiceCode()" readonly><small class="tw-hint">Identificador técnico automático</small></label><button class="btn-create" mat-flat-button color="primary" type="submit">+ Crear servicio</button></form></div>
      <h3 class="group-title">Catálogo de servicios</h3>
      <p class="muted action-help">«Desactivar» impide nuevas asignaciones y lo oculta en las empresas que ya lo tienen; «Activar» lo vuelve a habilitar.</p>
      <div class="kpi-grid">
        <div class="kpi-card" style="--kpi-color:#0284c7"><span class="kpi-label">Total servicios</span><span class="kpi-value">{{kpiOf(screen.services).total}}</span><span class="kpi-foot">En el catálogo</span></div>
        <div class="kpi-card" style="--kpi-color:#059669"><span class="kpi-label">Activos</span><span class="kpi-value">{{kpiOf(screen.services).activos}}</span><span class="kpi-foot">Asignables</span></div>
        <div class="kpi-card" style="--kpi-color:#dc2626"><span class="kpi-label">Inactivos</span><span class="kpi-value">{{kpiOf(screen.services).inactivos}}</span><span class="kpi-foot">Ocultos</span></div>
      </div>
      <div class="tw-table-search"><span class="material-symbols-outlined">search</span><input type="text" [value]="tableQueries['servicios'] ?? ''" (input)="setQuery('servicios', $any($event.target).value)" placeholder="Buscar servicio por nombre o código…" aria-label="Buscar servicio"></div>
      <table mat-table [dataSource]="pagedRows('servicios', filteredSorted('servicios', screen.services, ['name', 'code', 'status'], 'name'))" aria-label="Catálogo de servicios" class="data-table"><ng-container matColumnDef="name"><th mat-header-cell *matHeaderCellDef class="sortable" (click)="toggleSort('servicios', 'name')">Servicio <span class="sort-arrow">{{sortIndicator('servicios', 'name')}}</span></th><td mat-cell *matCellDef="let service"><span class="cell-main">{{service.name}}</span><span class="cell-sub">{{service.code}}</span></td></ng-container><ng-container matColumnDef="status"><th mat-header-cell *matHeaderCellDef class="sortable" (click)="toggleSort('servicios', 'status')">Estado <span class="sort-arrow">{{sortIndicator('servicios', 'status')}}</span></th><td mat-cell *matCellDef="let service"><span class="chip chip-table" [class.chip-inactive]="service.status === 'INACTIVE'">{{statusLabel(service.status)}}</span></td></ng-container><ng-container matColumnDef="actions"><th mat-header-cell *matHeaderCellDef>Acciones</th><td mat-cell *matCellDef="let service"><span class="actions-cell"><button class="icon-btn danger" type="button" (click)="confirmService(service.id, service.name)" [disabled]="service.status === 'INACTIVE'" title="Desactivar" aria-label="Desactivar"><span class="material-symbols-outlined">block</span></button><button class="icon-btn success" *ngIf="service.status === 'INACTIVE'" type="button" (click)="activateService(service.id)" title="Activar" aria-label="Activar"><span class="material-symbols-outlined">play_circle</span></button></span></td></ng-container><tr mat-header-row *matHeaderRowDef="['name','status','actions']"></tr><tr mat-row *matRowDef="let row; columns: ['name','status','actions']" [class.row-inactive]="row.status === 'INACTIVE'" [class.row-selected]="isSelected('servicios', row.id)" (click)="selectRow('servicios', row.id)"></tr></table>
      <div class="tw-pagination" *ngIf="screen.services.length">
        <span>{{pageLabel('servicios', filteredSorted('servicios', screen.services, ['name', 'code', 'status'], 'name'))}}</span>
        <span class="tw-page-btns">
          <button type="button" (click)="setPage('servicios', pageOf('servicios') - 1)" [disabled]="pageOf('servicios') <= 1" aria-label="Página anterior">‹</button>
          <button type="button" (click)="setPage('servicios', pageOf('servicios') + 1)" [disabled]="pageOf('servicios') >= pageCount(filteredSorted('servicios', screen.services, ['name', 'code', 'status'], 'name'))" aria-label="Página siguiente">›</button>
        </span>
      </div>
      <p class="empty-state" *ngIf="!screen.services.length">Aún no hay servicios en el catálogo. Siguiente paso: crea el primer servicio con el formulario «Crear servicio».</p>
      <h3 class="group-title">Asignar servicio a una empresa</h3>
      <form aria-label="Asignar servicio a una empresa" (submit)="assignService($event)"><input type="hidden" name="companyId" #serviceCompanyId><input type="hidden" name="serviceId" #serviceServiceId><mat-form-field><mat-label>Empresa</mat-label><mat-select required (selectionChange)="serviceCompanyId.value = $event.value; selectedServiceCompanyId = $event.value"><mat-option *ngFor="let company of screen.companies" [value]="company.id">{{company.name}}</mat-option></mat-select><mat-hint>Quién recibe el servicio</mat-hint></mat-form-field><mat-form-field><mat-label>Servicio</mat-label><mat-select required (selectionChange)="serviceServiceId.value = $event.value" [disabled]="!selectedServiceCompanyId"><mat-option *ngFor="let service of availableServices()" [value]="service.id">{{service.name}}</mat-option></mat-select><mat-hint>{{selectedServiceCompanyId ? (availableServices().length ? 'Solo los que la empresa aún no tiene' : 'Esta empresa ya tiene todos los servicios') : 'Primero elegí la empresa'}}</mat-hint></mat-form-field><button mat-flat-button color="primary" type="submit" [disabled]="!availableServices().length">Asignar servicio</button></form>
      <p class="muted action-help">«Asignar servicio» habilita el servicio solo para la empresa elegida; aparece en su pantalla Operaciones de inmediato.</p>
      <h3 class="group-title">Servicios asignados</h3>
      <p class="muted action-help">«Desactivar» retira el servicio de esa empresa, sin borrar nada; podés reasignarlo después.</p>
      <div class="tw-table-search"><span class="material-symbols-outlined">search</span><input type="text" [value]="tableQueries['asignados'] ?? ''" (input)="setQuery('asignados', $any($event.target).value)" placeholder="Buscar por empresa o servicio…" aria-label="Buscar asignación"></div>
      <table mat-table [dataSource]="pagedRows('asignados', filteredSorted('asignados', screen.serviceAssignments, ['companyName', 'serviceName', 'status'], 'companyName'))" aria-label="Servicios asignados" class="data-table"><ng-container matColumnDef="company"><th mat-header-cell *matHeaderCellDef class="sortable" (click)="toggleSort('asignados', 'companyName')">Empresa <span class="sort-arrow">{{sortIndicator('asignados', 'companyName')}}</span></th><td mat-cell *matCellDef="let assignment"><span class="cell-main">{{assignment.companyName}}</span></td></ng-container><ng-container matColumnDef="service"><th mat-header-cell *matHeaderCellDef class="sortable" (click)="toggleSort('asignados', 'serviceName')">Servicio <span class="sort-arrow">{{sortIndicator('asignados', 'serviceName')}}</span></th><td mat-cell *matCellDef="let assignment">{{assignment.serviceName}}</td></ng-container><ng-container matColumnDef="status"><th mat-header-cell *matHeaderCellDef class="sortable" (click)="toggleSort('asignados', 'status')">Estado <span class="sort-arrow">{{sortIndicator('asignados', 'status')}}</span></th><td mat-cell *matCellDef="let assignment"><span class="chip chip-table" [class.chip-inactive]="assignment.status === 'INACTIVE'">{{statusLabel(assignment.status)}}</span></td></ng-container><ng-container matColumnDef="actions"><th mat-header-cell *matHeaderCellDef>Acciones</th><td mat-cell *matCellDef="let assignment"><span class="actions-cell"><button class="icon-btn danger" type="button" (click)="confirmServiceAssignment(assignment.id, assignment.serviceName + ' en ' + assignment.companyName)" [disabled]="assignment.status === 'INACTIVE'" title="Desactivar" aria-label="Desactivar"><span class="material-symbols-outlined">block</span></button></span></td></ng-container><tr mat-header-row *matHeaderRowDef="['company','service','status','actions']"></tr><tr mat-row *matRowDef="let row; columns: ['company','service','status','actions']" [class.row-inactive]="row.status === 'INACTIVE'" [class.row-selected]="isSelected('asignados', row.id)" (click)="selectRow('asignados', row.id)"></tr></table>
      <div class="tw-pagination" *ngIf="screen.serviceAssignments.length">
        <span>{{pageLabel('asignados', filteredSorted('asignados', screen.serviceAssignments, ['companyName', 'serviceName', 'status'], 'companyName'))}}</span>
        <span class="tw-page-btns">
          <button type="button" (click)="setPage('asignados', pageOf('asignados') - 1)" [disabled]="pageOf('asignados') <= 1" aria-label="Página anterior">‹</button>
          <button type="button" (click)="setPage('asignados', pageOf('asignados') + 1)" [disabled]="pageOf('asignados') >= pageCount(filteredSorted('asignados', screen.serviceAssignments, ['companyName', 'serviceName', 'status'], 'companyName'))" aria-label="Página siguiente">›</button>
        </span>
      </div>
      <p class="empty-state" *ngIf="!screen.serviceAssignments.length">Aún no hay servicios asignados. Siguiente paso: asigna un servicio a una empresa con el formulario de arriba.</p>
    </mat-card>` +
    ADMIN_CHROME_END,
})
export class AdminServiciosComponent extends AdminSectionBase {}
