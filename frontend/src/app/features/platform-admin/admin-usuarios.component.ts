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
  '<h1 id="admin-title">Usuarios</h1><p class="intro">Creá personas, vinculalas a empresas y asignales roles. Todo el acceso empieza acá.</p>';

@Component({
  selector: 'sic-admin-usuarios',
  standalone: true,
  imports: [...ADMIN_IMPORTS, RouterModule],
  styles: [ADMIN_STYLES],
  template:
    ADMIN_CHROME_TOP +
    TITLE +
    ADMIN_CHROME_STATUS +
    `    <mat-card>
      <h3 class="group-title">Registrar persona</h3>
      <p class="muted">Crea la cuenta de acceso. Ejemplo: ana&#64;empresa.test con una contraseña temporal que la persona cambiará.</p>
      <div class="create-panel"><form aria-label="Crear persona" (submit)="createUser($event)"><label class="tw-field"><span class="tw-field-label">Correo electrónico <span class="req">*</span></span><input class="tw-input" name="email" required type="email" placeholder="nombre@empresa.com"><small class="tw-hint">Será su usuario de acceso</small></label><label class="tw-field"><span class="tw-field-label">Nombre <span class="req">*</span></span><input class="tw-input" name="name" required placeholder="Nombre y apellido"></label><label class="tw-field"><span class="tw-field-label">Contraseña temporal <span class="req">*</span></span><input class="tw-input" name="password" required type="password" placeholder="••••••••"><small class="tw-hint">Compártela por un canal seguro</small></label><button class="btn-create" mat-flat-button color="primary" type="submit">+ Crear persona</button></form></div>
      <p class="muted action-help">«Crear persona» habilita la cuenta de acceso. Después la vinculás a una empresa y le asignás un rol con los formularios de abajo.</p><p class="inline-success" *ngIf="lastUser" role="status">{{lastUser}}</p>
      <h3 class="group-title">Buscar persona</h3>
      <p class="muted">Buscá por nombre o correo y presioná Ver para ver todo lo que tiene: roles, empresas, menús y funciones.</p>
      <div class="create-panel"><form aria-label="Buscar persona" (submit)="$event.preventDefault()"><label class="tw-field"><span class="tw-field-label">Nombre o correo</span><input class="tw-input" name="query" (input)="userQuery = $any($event.target).value" placeholder="Ej: Cristian o usuario@gmail.com"><small class="tw-hint">Filtra mientras escribís</small></label></form></div>
      <table mat-table [dataSource]="filteredUsers()" aria-label="Resultados de búsqueda" class="data-table"><ng-container matColumnDef="name"><th mat-header-cell *matHeaderCellDef class="sortable" (click)="toggleSort('usuarios', 'name')">Nombre</th><td mat-cell *matCellDef="let user"><strong>{{user.name}}</strong></td></ng-container><ng-container matColumnDef="email"><th mat-header-cell *matHeaderCellDef class="sortable" (click)="toggleSort('usuarios', 'email')">Correo electrónico</th><td mat-cell *matCellDef="let user">{{user.email}}</td></ng-container><ng-container matColumnDef="companies"><th mat-header-cell *matHeaderCellDef>Empresas</th><td mat-cell *matCellDef="let user"><span class="chip chip-table" *ngFor="let membership of userMemberships(user.id)" [class.chip-inactive]="membership.status === 'INACTIVE'">{{companyName(membership.companyId)}}</span><small class="muted" *ngIf="!userMemberships(user.id).length">Sin empresas</small></td></ng-container><ng-container matColumnDef="roles"><th mat-header-cell *matHeaderCellDef>Roles</th><td mat-cell *matCellDef="let user"><span class="chip chip-table chip-scope" *ngFor="let role of userRoleNames(user.id)">{{role}}</span><small class="muted" *ngIf="!userRoleNames(user.id).length">Sin rol</small></td></ng-container><ng-container matColumnDef="menus"><th mat-header-cell *matHeaderCellDef>Menús</th><td mat-cell *matCellDef="let user"><span class="chip chip-table chip-menu" *ngFor="let menu of userMenus(user.id)">{{menu}}</span><small class="muted" *ngIf="!userMenus(user.id).length">Sin acceso</small></td></ng-container><ng-container matColumnDef="status"><th mat-header-cell *matHeaderCellDef class="sortable" (click)="toggleSort('usuarios', 'status')">Estado</th><td mat-cell *matCellDef="let user"><span class="chip chip-table" [class.chip-inactive]="user.status === 'INACTIVE'">{{statusLabel(user.status)}}</span></td></ng-container><ng-container matColumnDef="actions"><th mat-header-cell *matHeaderCellDef>Acciones</th><td mat-cell *matCellDef="let user"><button mat-button color="primary" type="button" (click)="viewUser(user.id)" title="Ver todo lo que tiene esta persona.">Ver</button></td></ng-container><tr mat-header-row *matHeaderRowDef="['name','email','companies','roles','menus','status','actions']"></tr><tr mat-row *matRowDef="let row; columns: ['name','email','companies','roles','menus','status','actions']" [class.row-inactive]="row.status === 'INACTIVE'" [class.row-selected]="isSelected('usuarios', row.id)" (click)="selectRow('usuarios', row.id)"></tr></table>
      <p class="empty-state" *ngIf="!filteredUsers().length">Sin resultados para «{{userQuery}}». Revisá el nombre o el correo.</p>

      <div class="modal-backdrop" *ngIf="selectedUser() as user" (click)="viewUser('')" role="presentation">
        <mat-card class="user-detail modal" (click)="$event.stopPropagation()" role="dialog" aria-modal="true" [attr.aria-label]="'Detalle de ' + user.name">
          <header class="detail-head">
            <span class="detail-avatar" aria-hidden="true">{{initials(user.name)}}</span>
            <div class="detail-id">
              <h2>{{user.name}}</h2>
              <span class="detail-email meter">{{user.email}}</span>
            </div>
            <span class="chip detail-status" [class.chip-inactive]="user.status === 'INACTIVE'">{{statusLabel(user.status)}}</span>
            <button class="detail-close" type="button" (click)="viewUser('')" aria-label="Cerrar detalle">×</button>
          </header>

          <section class="detail-section">
            <h3><span class="sec-icon">🏢</span> Empresas vinculadas</h3>
            <div class="detail-rows">
              <div class="detail-row" *ngFor="let membership of userMemberships(user.id)">
                <div class="detail-row-main">
                  <strong>{{companyName(membership.companyId)}}</strong>
                  <div class="role-chips" *ngIf="membership.roleDetails?.length">
                    <span class="chip chip-scope role-chip" *ngFor="let role of membership.roleDetails">{{role.name}}<button class="chip-remove" type="button" (click)="removeUserRole(role.id, membership.id, role.name)" title="Quitar este rol">×</button></span>
                  </div>
                  <small class="muted" *ngIf="!membership.roleDetails?.length">Sin rol asignado</small>
                </div>
                <span class="chip chip-table" [class.chip-inactive]="membership.status === 'INACTIVE'">{{statusLabel(membership.status)}}</span>
              </div>
            </div>
            <form class="assign-inline" *ngIf="userMemberships(user.id).length" aria-label="Agregar rol a la persona" (submit)="assignUserRole($event, user.id)">
              <input type="hidden" name="companyId" #inlineCompanyId><input type="hidden" name="roleId" #inlineRoleId>
              <input type="hidden" name="userId" [value]="user.id">
              <mat-form-field appearance="outline"><mat-label>Empresa</mat-label><mat-select required (selectionChange)="inlineCompanyId.value = $event.value"><mat-option *ngFor="let membership of userMemberships(user.id)" [value]="membership.companyId">{{companyName(membership.companyId)}}</mat-option></mat-select></mat-form-field>
              <mat-form-field appearance="outline"><mat-label>Rol a agregar</mat-label><mat-select required (selectionChange)="inlineRoleId.value = $event.value"><mat-option *ngFor="let role of screen.roles" [value]="role.id">{{role.name}} ({{scopeLabel(role)}})</mat-option></mat-select></mat-form-field>
              <button class="btn btn-azul" type="submit">+ Agregar rol</button>
            </form>
            <p *ngIf="!userMemberships(user.id).length" class="detail-empty">No está vinculada a ninguna empresa.</p>
          </section>

          <section class="detail-section">
            <h3><span class="sec-icon">🧭</span> Menús que puede abrir</h3>
            <div class="chip-cloud" *ngIf="userMenus(user.id).length"><span class="chip chip-menu" *ngFor="let menu of userMenus(user.id)">{{menu}}</span></div>
            <p *ngIf="!userMenus(user.id).length" class="detail-empty">Sin acceso a menús.</p>
          </section>

          <section class="detail-section">
            <h3><span class="sec-icon">⚙️</span> Funciones que puede hacer</h3>
            <div class="chip-cloud" *ngIf="userPermissions(user.id).length"><span class="chip chip-func" *ngFor="let code of userPermissions(user.id)">{{permissionLabel({code})}} <code>{{code}}</code></span></div>
            <p *ngIf="!userPermissions(user.id).length" class="detail-empty">Sin funciones asignadas.</p>
          </section>

          <footer class="detail-foot"><button class="btn btn-azul" type="button" (click)="viewUser('')">Cerrar</button></footer>
        </mat-card>
      </div>

      <h3 class="group-title">Asignar rol a una persona</h3>
      <p class="muted">Elegí la persona, después la empresa (solo las que tiene vinculadas) y finalmente el rol disponible en esa empresa.</p>
      <div class="create-panel"><form aria-label="Asignar rol a una persona" (submit)="assignRole($event)"><input type="hidden" name="userId" #assignUserId><input type="hidden" name="companyId" #assignCompanyId><input type="hidden" name="roleId" #assignRoleId><div class="compact-select-field"><span class="tw-field-label" aria-hidden="true">Persona <span class="req">*</span></span><mat-form-field appearance="outline"><mat-label>Persona</mat-label><mat-select required (selectionChange)="assignUserId.value = $event.value; selectedAssignUserId = $event.value"><mat-option *ngFor="let user of screen.users" [value]="user.id">{{user.name}} · {{user.email}}</mat-option></mat-select><mat-hint>Quién recibe el rol</mat-hint></mat-form-field></div><div class="compact-select-field"><span class="tw-field-label" aria-hidden="true">Empresa <span class="req">*</span></span><mat-form-field appearance="outline"><mat-label>Empresa</mat-label><mat-select required (selectionChange)="assignCompanyId.value = $event.value; selectedAssignCompanyId = $event.value" [disabled]="!selectedAssignUserId"><mat-option *ngFor="let company of companiesOfUser()" [value]="company.id">{{company.name}}</mat-option></mat-select><mat-hint>{{selectedAssignUserId ? (companiesOfUser().length ? 'Solo sus empresas vinculadas' : 'Esta persona no está vinculada a ninguna empresa') : 'Primero elegí la persona'}}</mat-hint></mat-form-field></div><div class="compact-select-field"><span class="tw-field-label" aria-hidden="true">Rol <span class="req">*</span></span><mat-form-field appearance="outline"><mat-label>Rol</mat-label><mat-select required (selectionChange)="assignRoleId.value = $event.value" [disabled]="!selectedAssignCompanyId"><mat-option *ngFor="let role of rolesForCompany(selectedAssignCompanyId)" [value]="role.id">{{role.name}} ({{scopeLabel(role)}})</mat-option></mat-select><mat-hint>{{selectedAssignCompanyId ? 'Roles disponibles en esa empresa' : 'Primero elegí la empresa'}}</mat-hint></mat-form-field></div><button class="btn-create" mat-flat-button color="primary" type="submit" [disabled]="!selectedAssignCompanyId">Asignar rol</button></form><p class="inline-success" *ngIf="lastAssignment" role="status">✓ {{lastAssignment}}</p></div>
      <p class="empty-state" *ngIf="!screen.users.length">Aún no hay personas registradas. Siguiente paso: registra la primera persona con el formulario «Registrar persona».</p>


      <p class="empty-state" *ngIf="!screen.memberships.length">Aún no hay asignaciones configuradas. Siguiente paso: asigna un rol a una persona en una empresa con el formulario de arriba.</p>
    </mat-card>` +
    ADMIN_CHROME_END,
})
export class AdminUsuariosComponent extends AdminSectionBase {}
