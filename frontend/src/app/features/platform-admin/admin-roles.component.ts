import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import { ADMIN_CHROME_END, ADMIN_CHROME_STATUS, ADMIN_CHROME_TOP, ADMIN_IMPORTS, ADMIN_STYLES, AdminSectionBase } from './platform-admin.base';

const TITLE = '<h1 id="admin-title">Roles</h1><p class="intro">Creá roles, elegí a qué menús pueden entrar y qué funciones pueden hacer.</p>';

@Component({
  selector: 'sic-admin-roles',
  standalone: true,
  imports: [...ADMIN_IMPORTS, RouterModule],
  styles: [ADMIN_STYLES],
  template: ADMIN_CHROME_TOP + TITLE + ADMIN_CHROME_STATUS + `<mat-card aria-labelledby="step-roles">
      <mat-card-title id="step-roles">Roles</mat-card-title>
      <h3 class="group-title">Crear rol</h3>
      <div class="create-panel"><form aria-label="Crear rol" (submit)="createRole($event)"><mat-form-field appearance="outline"><mat-label>Nombre del rol</mat-label><input matInput name="name" required><mat-hint>Por ejemplo: Operador de depósito</mat-hint></mat-form-field><mat-form-field appearance="outline"><mat-label>Ámbito</mat-label><input type="hidden" name="scope" #roleScopeHidden><mat-select required (selectionChange)="roleScope = $event.value; roleScopeHidden.value = $event.value"><mat-option value="COMPANY">Solo una empresa</mat-option><mat-option value="SHARED">Compartido entre empresas</mat-option><mat-option value="PLATFORM">Toda la plataforma</mat-option></mat-select><mat-hint>Define dónde puede asignarse</mat-hint></mat-form-field><mat-form-field appearance="outline" *ngIf="roleScope === 'SHARED'"><mat-label>Empresas donde puede asignarse</mat-label><input type="hidden" name="companyIds" #roleCompaniesHidden><mat-select multiple (selectionChange)="roleCompaniesHidden.value = ($event.value ?? []).join(',')"><mat-option *ngFor="let company of screen.companies" [value]="company.id">{{company.name}}</mat-option></mat-select><mat-hint>Elegí solo las empresas que deben usar este rol; vacío = todas</mat-hint></mat-form-field><mat-form-field appearance="outline" *ngIf="roleScope === 'COMPANY'"><mat-label>Empresa</mat-label><input type="hidden" name="companyId" #roleCompanyHidden><mat-select [required]="roleScope === 'COMPANY'" (selectionChange)="roleCompanyHidden.value = $event.value"><mat-option *ngFor="let company of screen.companies" [value]="company.id">{{company.name}}</mat-option></mat-select><mat-hint>Obligatoria para roles de una empresa</mat-hint></mat-form-field><mat-form-field appearance="outline"><mat-label>Descripción</mat-label><input matInput name="description"><mat-hint>Opcional: qué agrupa este rol</mat-hint></mat-form-field><input type="hidden" name="permissionIds" #rolePermissionsHidden><input type="hidden" name="menuIds" #roleMenusHidden><mat-form-field appearance="outline"><mat-label>Opciones de menú que puede abrir</mat-label><mat-select multiple (selectionChange)="roleMenusHidden.value = ($event.value ?? []).join(','); selectedRoleMenuIds = $event.value ?? []"><mat-option *ngFor="let item of screen.menu" [value]="item.id">{{item.name}}</mat-option></mat-select><mat-hint>A qué pantallas puede entrar quien tenga este rol</mat-hint></mat-form-field><mat-form-field appearance="outline"><mat-label>Funciones que puede hacer</mat-label><mat-select multiple (selectionChange)="rolePermissionsHidden.value = ($event.value ?? []).join(',')" [disabled]="!selectedRoleMenuIds.length"><mat-option *ngFor="let permission of availableRolePermissions()" [value]="permission.id">{{permissionLabel(permission)}} ({{permission.code}})</mat-option></mat-select><mat-hint>{{selectedRoleMenuIds.length ? (availableRolePermissions().length ? 'Solo las funciones de los menús elegidos' : 'Esos menús no tienen funciones; agregálas en el módulo Menús') : 'Primero elegí las opciones de menú'}}</mat-hint></mat-form-field><button class="btn-create" mat-flat-button color="primary" type="submit">+ Crear rol</button></form><p class="inline-success" *ngIf="lastCreatedRole" role="status">✓ {{lastCreatedRole}}</p></div>
      <p class="muted action-help">«Desactivar» retira los permisos del rol a quienes lo tienen asignado, sin borrar nada.</p>
      <table mat-table [dataSource]="screen.roles" aria-label="Roles" class="data-table"><ng-container matColumnDef="name"><th mat-header-cell *matHeaderCellDef>Rol</th><td mat-cell *matCellDef="let role"><strong>{{role.name}}</strong></td></ng-container><ng-container matColumnDef="scope"><th mat-header-cell *matHeaderCellDef>Ámbito</th><td mat-cell *matCellDef="let role"><span class="chip chip-scope">{{scopeLabel(role)}}</span></td></ng-container><ng-container matColumnDef="status"><th mat-header-cell *matHeaderCellDef>Estado</th><td mat-cell *matCellDef="let role"><span class="chip chip-table" [class.chip-inactive]="role.status === 'INACTIVE'">{{statusLabel(role.status)}}</span></td></ng-container><ng-container matColumnDef="actions"><th mat-header-cell *matHeaderCellDef>Acciones</th><td mat-cell *matCellDef="let role"><button mat-button color="primary" type="button" (click)="viewRole(role.id)" title="Ver el detalle completo del rol.">Ver</button><button mat-button type="button" (click)="startRoleEdit(role.id)" title="Agregar o quitar opciones de menú y funciones.">Editar</button><button mat-button class="danger" type="button" (click)="confirmRole(role.id, role.name)" [disabled]="role.status === 'INACTIVE'" title="Desactivar retira los permisos del rol a quienes lo tienen asignado. Nada se borra.">Desactivar</button></td></ng-container><tr mat-header-row *matHeaderRowDef="['name','scope','status','actions']"></tr><tr mat-row *matRowDef="let row; columns: ['name','scope','status','actions']" [class.row-inactive]="row.status === 'INACTIVE'"></tr></table>
      <div class="modal-backdrop" *ngIf="selectedRole() as role" (click)="viewRole('')" role="presentation">
        <mat-card class="role-detail modal" (click)="$event.stopPropagation()" role="dialog" aria-modal="true" [attr.aria-label]="'Detalle del rol ' + role.name">
        <mat-card-title>Detalle: {{role.name}}</mat-card-title>
        <p><span class="chip chip-scope">{{scopeLabel(role)}}</span> <span class="chip" [class.chip-inactive]="role.status === 'INACTIVE'">{{statusLabel(role.status)}}</span></p>
        <p *ngIf="role.description" class="muted">{{role.description}}</p>
        <h3 class="group-title">Empresas donde puede asignarse</h3>
        <p>{{roleCompaniesLabel(role) === 'todas las empresas' ? 'Todas las empresas' : roleCompaniesLabel(role)}}</p>
        <h3 class="group-title">Opciones de menú que puede abrir</h3>
        <ul class="list"><li *ngFor="let item of roleMenus(role)">{{item}}</li></ul>
        <p *ngIf="!roleMenus(role).length" class="muted">No puede abrir ninguna opción de menú todavía.</p>
        <h3 class="group-title">Funciones que puede hacer</h3>
        <ul class="list"><li *ngFor="let code of role.permissions ?? []"><strong>{{permissionLabel({code})}}</strong> <small><code>{{code}}</code></small></li></ul>
        <p *ngIf="!(role.permissions ?? []).length" class="muted">No tiene funciones asignadas todavía.</p>
        <button mat-flat-button color="primary" type="button" (click)="viewRole('')">Cerrar</button>
        </mat-card>
      </div>
      <p class="empty-state" *ngIf="!screen.roles.length">Aún no hay roles configurados. Creá el primero con el formulario de arriba.</p>
    </mat-card>
      <div class="modal-backdrop" *ngIf="editingRole() as role" (click)="cancelRoleEdit()" role="presentation">
        <mat-card class="user-detail modal modal-wide" (click)="$event.stopPropagation()" role="dialog" aria-modal="true" [attr.aria-label]="'Editar rol ' + role.name">
          <header class="detail-head">
            <div class="detail-id">
              <h2>Editar: {{role.name}}</h2>
              <span class="detail-email">Agregá o quitá opciones de menú y funciones</span>
            </div>
            <button class="detail-close" type="button" (click)="cancelRoleEdit()" aria-label="Cancelar">×</button>
          </header>
          <section class="detail-section">
            <h3><span class="sec-icon">🧭</span> Opciones de menú que puede abrir</h3>
            <p class="muted">Activá las pantallas a las que puede entrar quien tenga este rol.</p>
            <div class="toggle-table">
              <div class="toggle-row" *ngFor="let item of screen.menu">
                <span class="toggle-name">{{item.name}}<small class="meter" *ngIf="item.route">{{item.route}}</small></span>
                <label class="switch"><input type="checkbox" [checked]="editMenus.includes(item.id)" (change)="toggleEditMenu(item.id, $any($event.target).checked)"><span class="switch-track"></span></label>
              </div>
            </div>
          </section>
          <section class="detail-section">
            <h3><span class="sec-icon">⚙️</span> Funciones que puede hacer</h3>
            <p class="muted">Activá las acciones que puede ejecutar dentro de los menús elegidos.</p>
            <div class="toggle-table" *ngIf="editMenus.length">
              <div class="toggle-row" *ngFor="let permission of availableEditFunctions()">
                <span class="toggle-name">{{permissionLabel(permission)}}<small class="meter">{{permission.code}}</small></span>
                <label class="switch"><input type="checkbox" [checked]="editPermissions.includes(permission.code)" (change)="toggleEditPermission(permission.code, $any($event.target).checked)"><span class="switch-track"></span></label>
              </div>
            </div>
            <p *ngIf="!editMenus.length" class="detail-empty">Primero activá las opciones de menú para ver sus funciones.</p>
          </section>
          <footer class="detail-foot">
            <button class="btn btn-outline" type="button" (click)="cancelRoleEdit()">Cancelar</button>
            <button class="btn btn-azul" type="button" (click)="saveRoleEdit()">Guardar cambios</button>
          </footer>
        </mat-card>
      </div>
    ` + ADMIN_CHROME_END,
})
export class AdminRolesComponent extends AdminSectionBase {}
