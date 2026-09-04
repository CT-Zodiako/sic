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
  '<h1 id="admin-title">Funciones de menú</h1>';

@Component({
  selector: 'sic-admin-permisos',
  standalone: true,
  imports: [...ADMIN_IMPORTS, RouterModule],
  styles: [ADMIN_STYLES],
  template:
    ADMIN_CHROME_TOP +
    TITLE +
    ADMIN_CHROME_STATUS +
    `<mat-card aria-labelledby="step-permissions">
      <mat-card-title id="step-permissions">Funciones de menú</mat-card-title>

      <h3 class="group-title">Crear función</h3>
      <div class="create-panel"><form aria-label="Crear función" (submit)="createPermission($event)"><input type="hidden" name="resource" #permissionResourceHidden><mat-form-field appearance="outline"><mat-label>Menú (módulo)</mat-label><mat-select required (selectionChange)="selectPermissionMenu($event.value, permissionResourceHidden)"><mat-option *ngFor="let item of screen.menu" [value]="item.id">{{item.name}}</mat-option></mat-select><mat-hint>La acción se crea para este menú</mat-hint></mat-form-field><mat-form-field appearance="outline"><mat-label>Acción (qué se permite)</mat-label><input matInput name="action" (input)="updatePermissionPreview()"><mat-hint>Por ejemplo: ver, crear o borrar</mat-hint></mat-form-field><mat-form-field appearance="outline"><mat-label>Código del permiso (se genera solo)</mat-label><input matInput name="code" [value]="generatedPermissionCode()" readonly><mat-hint>Se compone automáticamente: recurso.acción</mat-hint></mat-form-field><button class="btn-create" mat-flat-button color="primary" type="submit">+ Crear función</button></form><p class="preview-line">Así se compone: <strong>recurso.acción</strong> → <code class="preview-code">{{permissionPreview()}}</code></p><p class="inline-success" *ngIf="lastCreated" role="status">✓ Función <strong>{{lastCreated}}</strong> creada. Aparece en «Funciones existentes» con estado Activo.</p></div>
      <p class="muted action-help">«Crear permiso» define una acción nueva; al guardar aparece en «Permisos existentes» con estado Activo.</p>
      <h3 class="group-title">Funciones existentes</h3>
      <p class="muted action-help">«Desactivar» deja de autorizar la acción en todos los roles que la incluyen, sin borrar nada; «Activar» la vuelve a autorizar.</p>
      <table mat-table [dataSource]="screen.permissions" aria-label="Funciones existentes" class="data-table"><ng-container matColumnDef="name"><th mat-header-cell *matHeaderCellDef>Permiso</th><td mat-cell *matCellDef="let permission"><strong>{{permissionLabel(permission)}}</strong><br><small><code>{{permission.code}}</code></small></td></ng-container><ng-container matColumnDef="resource"><th mat-header-cell *matHeaderCellDef>Recurso</th><td mat-cell *matCellDef="let permission"><code>{{permission.resource}}</code></td></ng-container><ng-container matColumnDef="action"><th mat-header-cell *matHeaderCellDef>Acción</th><td mat-cell *matCellDef="let permission"><code>{{permission.action}}</code></td></ng-container><ng-container matColumnDef="status"><th mat-header-cell *matHeaderCellDef>Estado</th><td mat-cell *matCellDef="let permission"><span class="chip chip-table" [class.chip-inactive]="permission.status === 'INACTIVE'">{{statusLabel(permission.status)}}</span></td></ng-container><ng-container matColumnDef="actions"><th mat-header-cell *matHeaderCellDef>Acciones</th><td mat-cell *matCellDef="let permission"><button mat-button class="danger" type="button" (click)="confirmPermission(permission.id, permissionLabel(permission))" [disabled]="permission.status === 'INACTIVE'" title="Desactivar revoca esta acción en todos los roles que la incluyen. Nada se borra.">Desactivar</button><button *ngIf="permission.status === 'INACTIVE'" mat-button type="button" (click)="activatePermission(permission.id)" title="Vuelve a autorizar la acción en los roles que incluyen este permiso.">Activar</button></td></ng-container><tr mat-header-row *matHeaderRowDef="['name','resource','action','status','actions']"></tr><tr mat-row *matRowDef="let row; columns: ['name','resource','action','status','actions']" [class.row-inactive]="row.status === 'INACTIVE'"></tr></table>
      <p class="empty-state" *ngIf="!screen.permissions.length">Aún no hay funciones configuradas. Siguiente paso: creá la primera función con el formulario «Crear función».</p>
    </mat-card>

` +
    ADMIN_CHROME_END,
})
export class AdminPermisosComponent extends AdminSectionBase {}
