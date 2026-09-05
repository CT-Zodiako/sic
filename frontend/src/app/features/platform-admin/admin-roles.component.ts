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
      <div class="create-panel"><form aria-label="Crear rol" (submit)="createRole($event)"><label class="tw-field"><span class="tw-field-label">Nombre del rol <span class="req">*</span></span><input class="tw-input" name="name" required placeholder="Por ejemplo: Operador de depósito"></label><div class="compact-select-field"><span class="tw-field-label" aria-hidden="true">Ámbito</span><mat-form-field appearance="outline"><mat-label>Ámbito</mat-label><input type="hidden" name="scope" #roleScopeHidden><mat-select required (selectionChange)="roleScope = $event.value; roleScopeHidden.value = $event.value"><mat-option value="COMPANY">Solo una empresa</mat-option><mat-option value="SHARED">Compartido entre empresas</mat-option><mat-option value="PLATFORM">Toda la plataforma</mat-option></mat-select><mat-hint>Define dónde puede asignarse</mat-hint></mat-form-field></div><div class="compact-select-field" *ngIf="roleScope === 'SHARED'"><span class="tw-field-label" aria-hidden="true">Empresas donde puede asignarse</span><mat-form-field appearance="outline"><mat-label>Empresas donde puede asignarse</mat-label><input type="hidden" name="companyIds" #roleCompaniesHidden><mat-select multiple (selectionChange)="roleCompaniesHidden.value = ($event.value ?? []).join(',')"><mat-option *ngFor="let company of screen.companies" [value]="company.id">{{company.name}}</mat-option></mat-select><mat-hint>Elegí solo las empresas que deben usar este rol; vacío = todas</mat-hint></mat-form-field></div><div class="compact-select-field" *ngIf="roleScope === 'COMPANY'"><span class="tw-field-label" aria-hidden="true">Empresa</span><mat-form-field appearance="outline"><mat-label>Empresa</mat-label><input type="hidden" name="companyId" #roleCompanyHidden><mat-select [required]="roleScope === 'COMPANY'" (selectionChange)="roleCompanyHidden.value = $event.value"><mat-option *ngFor="let company of screen.companies" [value]="company.id">{{company.name}}</mat-option></mat-select><mat-hint>Obligatoria para roles de una empresa</mat-hint></mat-form-field></div><label class="tw-field"><span class="tw-field-label">Descripción</span><input class="tw-input" name="description" placeholder="Opcional: qué agrupa este rol"></label><input type="hidden" name="permissionIds" #rolePermissionsHidden><input type="hidden" name="menuIds" #roleMenusHidden><div class="compact-select-field"><span class="tw-field-label" aria-hidden="true">Opciones de menú que puede abrir</span><mat-form-field appearance="outline"><mat-label>Opciones de menú que puede abrir</mat-label><mat-select multiple (selectionChange)="roleMenusHidden.value = ($event.value ?? []).join(','); selectedRoleMenuIds = $event.value ?? []"><mat-option *ngFor="let item of screen.menu" [value]="item.id">{{item.name}}</mat-option></mat-select><mat-hint>A qué pantallas puede entrar quien tenga este rol</mat-hint></mat-form-field></div><div class="compact-select-field"><span class="tw-field-label" aria-hidden="true">Funciones que puede hacer</span><mat-form-field appearance="outline"><mat-label>Funciones que puede hacer</mat-label><mat-select multiple (selectionChange)="rolePermissionsHidden.value = ($event.value ?? []).join(',')" [disabled]="!selectedRoleMenuIds.length"><mat-option *ngFor="let permission of availableRolePermissions()" [value]="permission.id">{{permissionLabel(permission)}} ({{permission.code}})</mat-option></mat-select><mat-hint>{{selectedRoleMenuIds.length ? (availableRolePermissions().length ? 'Solo las funciones de los menús elegidos' : 'Esos menús no tienen funciones; agregálas en el módulo Menús') : 'Primero elegí las opciones de menú'}}</mat-hint></mat-form-field></div><button class="btn-create" mat-flat-button color="primary" type="submit">+ Crear rol</button></form><p class="inline-success" *ngIf="lastCreatedRole" role="status">✓ {{lastCreatedRole}}</p></div>
      <p class="muted action-help">«Desactivar» retira los permisos del rol a quienes lo tienen asignado, sin borrar nada.</p>
      <div class="kpi-grid">
        <div class="kpi-card" style="--kpi-color:#0284c7"><span class="kpi-label">Total roles</span><span class="kpi-value">{{kpiOf(screen.roles).total}}</span><span class="kpi-foot">En el sistema</span></div>
        <div class="kpi-card" style="--kpi-color:#059669"><span class="kpi-label">Activos</span><span class="kpi-value">{{kpiOf(screen.roles).activos}}</span><span class="kpi-foot">Asignables</span></div>
        <div class="kpi-card" style="--kpi-color:#dc2626"><span class="kpi-label">Inactivos</span><span class="kpi-value">{{kpiOf(screen.roles).inactivos}}</span><span class="kpi-foot">No autorizan</span></div>
      </div>
      <div class="tw-table-search"><span class="material-symbols-outlined">search</span><input type="text" [value]="tableQueries['roles'] ?? ''" (input)="setQuery('roles', $any($event.target).value)" placeholder="Buscar rol por nombre, ámbito o estado…" aria-label="Buscar rol"></div>
      <table mat-table [dataSource]="pagedRows('roles', filteredSorted('roles', screen.roles, ['name', 'scope', 'status'], 'name'))" aria-label="Roles" class="data-table"><ng-container matColumnDef="name"><th mat-header-cell *matHeaderCellDef class="sortable" (click)="toggleSort('roles', 'name')">Rol <span class="sort-arrow">{{sortIndicator('roles', 'name')}}</span></th><td mat-cell *matCellDef="let role"><span class="cell-main">{{role.name}}</span><span class="cell-sub">{{role.description || 'Sin descripción'}}</span></td></ng-container><ng-container matColumnDef="scope"><th mat-header-cell *matHeaderCellDef class="sortable" (click)="toggleSort('roles', 'scope')">Ámbito <span class="sort-arrow">{{sortIndicator('roles', 'scope')}}</span></th><td mat-cell *matCellDef="let role"><span class="chip chip-scope">{{scopeLabel(role)}}</span></td></ng-container><ng-container matColumnDef="status"><th mat-header-cell *matHeaderCellDef class="sortable" (click)="toggleSort('roles', 'status')">Estado <span class="sort-arrow">{{sortIndicator('roles', 'status')}}</span></th><td mat-cell *matCellDef="let role"><span class="chip chip-table" [class.chip-inactive]="role.status === 'INACTIVE'">{{statusLabel(role.status)}}</span></td></ng-container><ng-container matColumnDef="actions"><th mat-header-cell *matHeaderCellDef>Acciones</th><td mat-cell *matCellDef="let role"><span class="actions-cell"><button class="icon-btn" type="button" (click)="viewRole(role.id)" title="Ver detalle" aria-label="Ver detalle"><span class="material-symbols-outlined">visibility</span></button><button class="icon-btn" type="button" (click)="startRoleEdit(role.id)" title="Editar rol" aria-label="Editar rol"><span class="material-symbols-outlined">edit</span></button><button class="icon-btn danger" type="button" (click)="confirmRole(role.id, role.name)" [disabled]="role.status === 'INACTIVE'" title="Desactivar rol" aria-label="Desactivar rol"><span class="material-symbols-outlined">block</span></button></span></td></ng-container><tr mat-header-row *matHeaderRowDef="['name','scope','status','actions']"></tr><tr mat-row *matRowDef="let row; columns: ['name','scope','status','actions']" [class.row-inactive]="row.status === 'INACTIVE'" [class.row-selected]="isSelected('roles', row.id)" (click)="selectRow('roles', row.id)"></tr></table>
      <div class="tw-pagination" *ngIf="screen.roles.length">
        <span>{{pageLabel('roles', filteredSorted('roles', screen.roles, ['name', 'scope', 'status'], 'name'))}}</span>
        <span class="tw-page-btns">
          <button type="button" (click)="setPage('roles', pageOf('roles') - 1)" [disabled]="pageOf('roles') <= 1" aria-label="Página anterior">‹</button>
          <button type="button" *ngFor="let page of [].constructor(pageCount(filteredSorted('roles', screen.roles, ['name', 'scope', 'status'], 'name'))); let i = index" (click)="setPage('roles', i + 1)" [class.current]="pageOf('roles') === i + 1">{{i + 1}}</button>
          <button type="button" (click)="setPage('roles', pageOf('roles') + 1)" [disabled]="pageOf('roles') >= pageCount(filteredSorted('roles', screen.roles, ['name', 'scope', 'status'], 'name'))" aria-label="Página siguiente">›</button>
        </span>
      </div>
      <p class="empty-state" *ngIf="!filteredSorted('roles', screen.roles, ['name', 'scope', 'status'], 'name').length && screen.roles.length">Sin resultados para «{{tableQueries['roles']}}». Probá con otro término.</p>
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
