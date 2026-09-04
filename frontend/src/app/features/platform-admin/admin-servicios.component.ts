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
      <mat-card-title id="step-services">Servicios</mat-card-title>

      <h3 class="group-title">Crear servicio</h3>
      <p class="muted">Escribí solo el nombre; el código técnico se genera solo.</p>
      <div class="create-panel"><form aria-label="Crear servicio" (submit)="createService($event)"><mat-form-field appearance="outline"><mat-label>Nombre del servicio</mat-label><input matInput name="name" required (input)="updateServicePreview()"><mat-hint>Por ejemplo: Agua, Energía, Gas</mat-hint></mat-form-field><mat-form-field appearance="outline"><mat-label>Código (se genera solo)</mat-label><input matInput name="code" [value]="generatedServiceCode()" readonly><mat-hint>Identificador técnico automático</mat-hint></mat-form-field><button class="btn-create" mat-flat-button color="primary" type="submit">+ Crear servicio</button></form><p class="preview-line">Después lo asignás a las empresas con el formulario de abajo.</p></div>
      <p class="muted action-help">«Crear servicio» lo agrega al catálogo con estado Activo; todavía no está habilitado en ninguna empresa hasta que lo asignes.</p>
      <h3 class="group-title">Catálogo de servicios</h3>
      <p class="muted action-help">«Desactivar» impide nuevas asignaciones y lo oculta en las empresas que ya lo tienen; «Activar» lo vuelve a habilitar.</p>
      <table mat-table [dataSource]="screen.services" aria-label="Catálogo de servicios" class="data-table"><ng-container matColumnDef="name"><th mat-header-cell *matHeaderCellDef>Servicio</th><td mat-cell *matCellDef="let service"><strong>{{service.name}}</strong><br><small><code>{{service.code}}</code></small></td></ng-container><ng-container matColumnDef="status"><th mat-header-cell *matHeaderCellDef>Estado</th><td mat-cell *matCellDef="let service"><span class="chip chip-table" [class.chip-inactive]="service.status === 'INACTIVE'">{{statusLabel(service.status)}}</span></td></ng-container><ng-container matColumnDef="actions"><th mat-header-cell *matHeaderCellDef>Acciones</th><td mat-cell *matCellDef="let service"><button mat-button class="danger" type="button" (click)="confirmService(service.id, service.name)" [disabled]="service.status === 'INACTIVE'" title="Desactivar impide nuevas asignaciones y oculta el servicio en las empresas que ya lo tienen. Nada se borra.">Desactivar</button><button *ngIf="service.status === 'INACTIVE'" mat-button type="button" (click)="activateService(service.id)" title="El servicio vuelve a estar disponible para asignarse y se muestra en las empresas que lo tienen asignado.">Activar</button></td></ng-container><tr mat-header-row *matHeaderRowDef="['name','status','actions']"></tr><tr mat-row *matRowDef="let row; columns: ['name','status','actions']" [class.row-inactive]="row.status === 'INACTIVE'"></tr></table>
      <p class="empty-state" *ngIf="!screen.services.length">Aún no hay servicios en el catálogo. Siguiente paso: crea el primer servicio con el formulario «Crear servicio».</p>
      <h3 class="group-title">Asignar servicio a una empresa</h3>
      <form aria-label="Asignar servicio a una empresa" (submit)="assignService($event)"><input type="hidden" name="companyId" #serviceCompanyId><input type="hidden" name="serviceId" #serviceServiceId><mat-form-field><mat-label>Empresa</mat-label><mat-select required (selectionChange)="serviceCompanyId.value = $event.value; selectedServiceCompanyId = $event.value"><mat-option *ngFor="let company of screen.companies" [value]="company.id">{{company.name}}</mat-option></mat-select><mat-hint>Quién recibe el servicio</mat-hint></mat-form-field><mat-form-field><mat-label>Servicio</mat-label><mat-select required (selectionChange)="serviceServiceId.value = $event.value" [disabled]="!selectedServiceCompanyId"><mat-option *ngFor="let service of availableServices()" [value]="service.id">{{service.name}}</mat-option></mat-select><mat-hint>{{selectedServiceCompanyId ? (availableServices().length ? 'Solo los que la empresa aún no tiene' : 'Esta empresa ya tiene todos los servicios') : 'Primero elegí la empresa'}}</mat-hint></mat-form-field><button mat-flat-button color="primary" type="submit" [disabled]="!availableServices().length">Asignar servicio</button></form>
      <p class="muted action-help">«Asignar servicio» habilita el servicio solo para la empresa elegida; aparece en su pantalla Operaciones de inmediato.</p>
      <h3 class="group-title">Servicios asignados</h3>
      <p class="muted action-help">«Desactivar» retira el servicio de esa empresa, sin borrar nada; podés reasignarlo después.</p>
      <table mat-table [dataSource]="screen.serviceAssignments" aria-label="Servicios asignados" class="data-table"><ng-container matColumnDef="company"><th mat-header-cell *matHeaderCellDef>Empresa</th><td mat-cell *matCellDef="let assignment"><strong>{{assignment.companyName}}</strong></td></ng-container><ng-container matColumnDef="service"><th mat-header-cell *matHeaderCellDef>Servicio</th><td mat-cell *matCellDef="let assignment">{{assignment.serviceName}}</td></ng-container><ng-container matColumnDef="status"><th mat-header-cell *matHeaderCellDef>Estado</th><td mat-cell *matCellDef="let assignment"><span class="chip chip-table" [class.chip-inactive]="assignment.status === 'INACTIVE'">{{statusLabel(assignment.status)}}</span></td></ng-container><ng-container matColumnDef="actions"><th mat-header-cell *matHeaderCellDef>Acciones</th><td mat-cell *matCellDef="let assignment"><button mat-button class="danger" type="button" (click)="confirmServiceAssignment(assignment.id, assignment.serviceName + ' en ' + assignment.companyName)" [disabled]="assignment.status === 'INACTIVE'" title="Desactivar retira el servicio de esta empresa. Nada se borra.">Desactivar</button></td></ng-container><tr mat-header-row *matHeaderRowDef="['company','service','status','actions']"></tr><tr mat-row *matRowDef="let row; columns: ['company','service','status','actions']" [class.row-inactive]="row.status === 'INACTIVE'"></tr></table>
      <p class="empty-state" *ngIf="!screen.serviceAssignments.length">Aún no hay servicios asignados. Siguiente paso: asigna un servicio a una empresa con el formulario de arriba.</p>
    </mat-card>` +
    ADMIN_CHROME_END,
})
export class AdminServiciosComponent extends AdminSectionBase {}
