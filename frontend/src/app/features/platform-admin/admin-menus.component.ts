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
  '<h1 id="admin-title">Menús</h1>';

@Component({
  selector: 'sic-admin-menus',
  standalone: true,
  imports: [...ADMIN_IMPORTS, RouterModule],
  styles: [ADMIN_STYLES],
  template:
    ADMIN_CHROME_TOP +
    TITLE +
    ADMIN_CHROME_STATUS +
    `<mat-card aria-labelledby="step-menus">

      <h3 class="group-title">Crear elemento de menú</h3>
      <div class="create-panel"><form aria-label="Crear elemento de menú" (submit)="createMenuItem($event)"><mat-form-field appearance="outline"><mat-label>Nombre visible</mat-label><input matInput name="name" required (input)="updateMenuPreview()"><mat-hint>Lo que se lee en la navegación. Ejemplo: Inventario</mat-hint></mat-form-field><mat-form-field appearance="outline"><mat-label>URL de la pantalla (se genera sola)</mat-label><input matInput name="route" [value]="generatedMenuRoute()" readonly><mat-hint>Se compone automáticamente desde el nombre</mat-hint></mat-form-field><button class="btn-create" mat-flat-button color="primary" type="submit">+ Crear elemento</button></form><p class="preview-line">Así queda la URL: <code class="preview-code">{{menuRoutePreview()}}</code> · Siguiente paso: vinculá un permiso a este elemento abajo.</p><p class="inline-success" *ngIf="lastMenuItem" role="status">✓ Elemento <strong>{{lastMenuItem}}</strong> creado.</p></div>
      <h3 class="group-title">Permisos del menú</h3>
      <div class="create-panel"><form aria-label="Agregar acción al menú" (submit)="addMenuAction($event)"><input type="hidden" name="itemId" #actionItemId><mat-form-field appearance="outline"><mat-label>Elemento de menú</mat-label><mat-select required (selectionChange)="actionItemId.value = $event.value; selectMenuItem($event.value)"><mat-option *ngFor="let item of screen.menu" [value]="item.id">{{item.name}}</mat-option></mat-select><mat-hint>Los permisos se crean para este menú</mat-hint></mat-form-field><mat-form-field appearance="outline"><mat-label>Acción</mat-label><input matInput name="action" required (input)="updateMenuActionPreview()"><mat-hint>Por ejemplo: ver, crear, delete, validar, ver-detalle</mat-hint></mat-form-field><mat-form-field appearance="outline"><mat-label>Código (se genera solo)</mat-label><input matInput [value]="menuActionCode()" readonly><mat-hint>Así queda el permiso</mat-hint></mat-form-field><button class="btn-create" mat-flat-button color="primary" type="submit">+ Agregar acción</button></form><p class="inline-success" *ngIf="lastMenuAction" role="status">✓ Acción <strong>{{lastMenuAction}}</strong> agregada al menú. Aparece en la tabla de abajo.</p></div>
      <h3 class="group-title" *ngIf="selectedMenuId">Permisos de «{{selectedMenuName()}}»</h3>
      <table mat-table [dataSource]="selectedMenuPermissions()" aria-label="Permisos del menú seleccionado" class="data-table" *ngIf="selectedMenuId"><ng-container matColumnDef="code"><th mat-header-cell *matHeaderCellDef>Código</th><td mat-cell *matCellDef="let permission"><code>{{permission.code}}</code></td></ng-container><ng-container matColumnDef="resource"><th mat-header-cell *matHeaderCellDef>Recurso</th><td mat-cell *matCellDef="let permission"><code>{{permission.resource}}</code></td></ng-container><ng-container matColumnDef="action"><th mat-header-cell *matHeaderCellDef>Acción</th><td mat-cell *matCellDef="let permission"><code>{{permission.action}}</code></td></ng-container><ng-container matColumnDef="status"><th mat-header-cell *matHeaderCellDef>Estado</th><td mat-cell *matCellDef="let permission"><span class="chip chip-table" [class.chip-inactive]="permission.status === 'INACTIVE'">{{statusLabel(permission.status)}}</span></td></ng-container><tr mat-header-row *matHeaderRowDef="['code','resource','action','status']"></tr><tr mat-row *matRowDef="let row; columns: ['code','resource','action','status']" [class.row-inactive]="row.status === 'INACTIVE'"></tr></table>
      <p class="empty-state" *ngIf="selectedMenuId && !selectedMenuPermissions().length">Este menú todavía no tiene permisos. Siguiente paso: agregá su primera acción con el formulario de arriba («ver» es la recomendada para empezar).</p>
      <p class="empty-state" *ngIf="!selectedMenuId">Elegí un elemento de menú en el formulario de arriba para ver y agregar sus permisos.</p>
</mat-card>` +
    ADMIN_CHROME_END,
})
export class AdminMenusComponent extends AdminSectionBase {}
