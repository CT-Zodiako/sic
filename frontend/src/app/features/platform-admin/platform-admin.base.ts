import { CommonModule } from '@angular/common';
import { Directive, OnInit, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { AuthStore } from '../../core/auth.store';
import { CompanyContextStore } from '../company-context/company-context.store';
import { HttpClientTransport } from '../../core/http-client.transport';
import { PlatformAdminApiClient, type Role } from './platform-admin.api';
import {
  PlatformAdminScreen,
  type DeactivationKind,
} from './platform-admin.screen';

export const ADMIN_IMPORTS = [
  CommonModule,
  MatButtonModule,
  MatCardModule,
  MatTableModule,
  MatFormFieldModule,
  MatInputModule,
  MatSelectModule,
];

/** Shared facade + helpers for every administration module. */
@Directive()
export abstract class AdminSectionBase implements OnInit {
  readonly screen = new PlatformAdminScreen(
    new PlatformAdminApiClient(new HttpClientTransport(inject(HttpClient))),
  );
  protected readonly auth = inject(AuthStore);
  protected readonly router = inject(Router);
  protected readonly companyContext = inject(CompanyContextStore);
  previewResource = '';
  selectedPermissionMenuId = '';
  previewAction = '';
  lastCreated = '';
  roleScope = '';
  lastCreatedRole = '';
  lastMembership = '';
  lastMenuItem = '';
  menuNamePreview = '';
  lastCompany = '';
  lastUser = '';
  serviceNameInput = '';
  selectedServiceCompanyId = '';
  selectedMembershipUserId = '';
  selectedAssignUserId = '';
  selectedAssignCompanyId = '';
  lastAssignment = '';
  selectedRoleMenuIds: string[] = [];
  userQuery = '';
  editingRoleId = '';
  editMenus: string[] = [];
  editPermissions: string[] = [];
  selectedUserId = '';
  selectedRoleId = '';
  selectedMenuId = '';
  menuActionInput = '';
  lastMenuAction = '';
  ngOnInit() {
    void this.screen.load();
  }
  signOut() {
    this.auth.logout();
    void this.router.navigate(['/login']);
  }
  currentCompanyName() {
    const id = this.companyContext.selectedCompanyId;
    return (
      this.companyContext.state.companies.find((company) => company.id === id)
        ?.name || 'Ninguna seleccionada (elígela en la barra superior)'
    );
  }
  statusLabel(status?: string) {
    return this.screen.statusLabel(status);
  }
  permissionLabel(permission: { code: string }) {
    return this.screen.permissionLabel(permission as never);
  }
  scopeLabel(role: Role) {
    return role.scope === 'COMPANY'
      ? `Solo una empresa: ${this.companyName(role.companyId || '')}`
      : this.screen.scopeLabels[role.scope];
  }
  roleCompaniesLabel(role: Role) {
    const ids = role.companyIds ?? [];
    return ids.length
      ? ids.map((id) => this.companyName(id)).join(', ')
      : 'todas las empresas';
  }
  rolesForCompany(companyId: string) {
    return this.screen.roles.filter(
      (role) =>
        role.status !== 'INACTIVE' &&
        (role.scope === 'COMPANY'
          ? role.companyId === companyId
          : role.scope === 'SHARED'
            ? !role.companyIds?.length || role.companyIds.includes(companyId)
            : false),
    );
  }
  resources() { return [...new Set(this.screen.permissions.map(p => p.resource))].sort(); }
  companyPeople(companyId: string) { const people = this.screen.memberships.filter(m => m.companyId === companyId && m.status !== 'INACTIVE').map(m => this.userName(m.userId)); return people.length ? people.join(', ') : 'Sin personas asignadas'; }
  userName(id: string) {
    return (
      this.screen.users.find((user) => user.id === id)?.name ||
      this.screen.users.find((user) => user.id === id)?.email ||
      'Persona no identificada'
    );
  }
  companyName(id: string) {
    return (
      this.screen.companies.find((company) => company.id === id)?.name ||
      'Empresa no identificada'
    );
  }
  confirmDisable(kind: DeactivationKind, name: string, action: () => void) {
    if (globalThis.confirm(this.screen.confirmationMessage(kind, name)))
      action();
  }
  confirmPermission(id: string, name: string) {
    this.confirmDisable('permiso', name, () => this.deactivatePermission(id));
  }
  confirmRole(id: string, name: string) {
    this.confirmDisable('rol', name, () => this.deactivateRole(id));
  }
  confirmMembership(id: string, name: string) {
    this.confirmDisable('asignación', name, () =>
      this.deactivateMembership(id),
    );
  }
  confirmMenuItem(id: string, name: string) {
    this.confirmDisable('elemento de menú', name, () =>
      this.deactivateMenuItem(id),
    );
  }
  confirmService(id: string, name: string) {
    this.confirmDisable('servicio', name, () => this.deactivateService(id));
  }
  confirmServiceAssignment(id: string, name: string) {
    this.confirmDisable('asignación de servicio', name, () =>
      this.deactivateServiceAssignment(id),
    );
  }
  deactivateCompany(id: string) {
    void this.screen.deactivateCompany(id);
  }
  deactivateMembership(id: string) {
    void this.screen.deactivateMembership(id);
  }
  deactivateRole(id: string) {
    void this.screen.deactivateRole(id);
  }
  deactivatePermission(id: string) {
    void this.screen.deactivatePermission(id);
  }
  activatePermission(id: string) {
    void this.screen.activatePermission(id);
  }
  deactivateMenuItem(id: string) {
    void this.screen.deactivateMenuItem(id);
  }
  activateMenuItem(id: string) {
    void this.screen.activateMenuItem(id);
  }
  deactivateService(id: string) {
    void this.screen.deactivateService(id);
  }
  activateService(id: string) {
    void this.screen.activateService(id);
  }
  deactivateServiceAssignment(id: string) {
    void this.screen.deactivateServiceAssignment(id);
  }
  protected normalizePart(value: string) {
    return value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9-]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }
  generatedPermissionCode() {
    const resource = this.normalizePart(this.previewResource);
    const action = this.normalizePart(this.previewAction);
    return resource && action ? `${resource}.${action}` : '';
  }
  permissionPreview() {
    return this.generatedPermissionCode() || 'recurso.acción';
  }
  selectPermissionMenu(itemId: string, hidden: HTMLInputElement) {
    this.selectedPermissionMenuId = itemId;
    const item = this.screen.menu.find((entry) => entry.id === itemId);
    this.previewResource = item ? this.normalizeRoutePart((item.route ?? '').replace(/^\/+/, '')) || this.normalizeRoutePart(item.name) : '';
    hidden.value = this.previewResource;
    this.updatePermissionPreview();
  }
  updatePermissionPreview() {
    const form = globalThis.document?.querySelector(
      'form[aria-label="Crear función"]',
    ) as HTMLFormElement | null;
    if (!form) return;
    const data = new FormData(form);
    if (data.get('resource')) this.previewResource = String(data.get('resource'));
    this.previewAction = String(data.get('action') ?? '');
  }
  protected normalizeRoutePart(value: string) {
    return value
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9-]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }
  generatedMenuRoute() {
    const name = this.normalizeRoutePart(this.menuNamePreview);
    return name ? `/${name}` : '';
  }
  menuRoutePreview() {
    return this.generatedMenuRoute() || '/nombre-del-menu';
  }
  selectMenuItem(id: string) {
    this.selectedMenuId = id;
  }
  selectedMenuName() {
    return this.screen.menu.find((item) => item.id === this.selectedMenuId)?.name ?? '';
  }
  selectedMenuPermissions() {
    const item = this.screen.menu.find((entry) => entry.id === this.selectedMenuId);
    return (item?.permissions ?? [])
      .map((code) => this.screen.permissions.find((permission) => permission.code === code))
      .filter((permission): permission is NonNullable<typeof permission> => Boolean(permission));
  }
  menuActionResource() {
    const item = this.screen.menu.find((entry) => entry.id === this.selectedMenuId);
    if (!item) return '';
    return this.normalizeRoutePart((item.route ?? '').replace(/^\/+/, '')) || this.normalizeRoutePart(item.name);
  }
  menuActionCode() {
    const resource = this.menuActionResource();
    const action = this.normalizeRoutePart(this.menuActionInput);
    return resource && action ? `${resource}.${action}` : '';
  }
  updateMenuActionPreview() {
    const form = globalThis.document?.querySelector('form[aria-label="Agregar acción al menú"]') as HTMLFormElement | null;
    if (!form) return;
    this.menuActionInput = String(new FormData(form).get('action') ?? '');
  }
  async addMenuAction(event: Event) {
    event.preventDefault();
    const target = event.target as HTMLFormElement;
    const data = new FormData(target);
    const itemId = String(data.get('itemId') ?? '');
    const code = this.menuActionCode();
    if (!itemId || !code) {
      this.screen.state = { ...this.screen.state, message: 'Elegí el elemento de menú y escribí la acción.' };
      return;
    }
    const resource = this.menuActionResource();
    const action = this.normalizeRoutePart(String(data.get('action') ?? ''));
    try {
      try {
        await this.screen.createPermission({ code, resource, action });
      } catch {
        /* exists: reuse */
      }
      const permission = this.screen.permissions.find((candidate) => candidate.code === code);
      if (!permission) throw new Error('Permission was not created.');
      await this.screen.addMenuPermission(itemId, permission.id);
      this.lastMenuAction = code;
      this.menuActionInput = '';
      target.reset();
      this.selectMenuItem(itemId);
    } catch {
      /* facade surfaces the error */
    }
  }
  updateMenuPreview() {
    const form = globalThis.document?.querySelector(
      'form[aria-label="Crear elemento de menú"]',
    ) as HTMLFormElement | null;
    if (!form) return;
    this.menuNamePreview = String(new FormData(form).get('name') ?? '');
  }
  async createPermission(event: Event) {
    event.preventDefault();
    const target = event.target as HTMLFormElement;
    const data = new FormData(target);
    try {
      const created = await this.screen.createPermission({
        code: data.get('code') ?? '',
        resource: data.get('resource') ?? '',
        action: data.get('action') ?? '',
      });
      if (created === undefined) return;
      target.reset();
      this.previewResource = '';
      this.previewAction = '';
      this.lastCreated = String(data.get('code'));
    } catch {
      /* facade surfaces the error */
    }
  }
  async createRole(event: Event) {
    event.preventDefault();
    const target = event.target as HTMLFormElement;
    const data = new FormData(target);
    const scope = String(data.get('scope') ?? '');
    const companyId = String(data.get('companyId') ?? '');
    const companyIds = String(data.get('companyIds') ?? '')
      .split(',')
      .filter(Boolean);
    if (scope === 'COMPANY' && !companyId) {
      this.screen.state = {
        ...this.screen.state,
        message: 'Elegí la empresa para un rol de «Solo una empresa».',
      };
      return;
    }
    try {
      const created = await this.screen.createRole({
        name: data.get('name') ?? '',
        scope,
        description: data.get('description') || undefined,
        companyId: companyId || undefined,
        companyIds,
      } as never);
      if (created === undefined) return;
      const roleId = (created as { id: string }).id;
      const linked = new Set<string>();
      const permissionIds = String(data.get('permissionIds') ?? '')
        .split(',')
        .filter(Boolean);
      for (const permissionId of permissionIds) {
        linked.add(permissionId);
        await this.screen.assignPermission(roleId, permissionId);
      }
      const menuIds = String(data.get('menuIds') ?? '')
        .split(',')
        .filter(Boolean);
      for (const itemId of menuIds) {
        const item = this.screen.menu.find((entry) => entry.id === itemId);
        // Menu access links ONLY the entry permission (ver), never every menu function.
        const linkedCodes = item?.permissions ?? [];
        const accessCodes = linkedCodes.filter((code) => {
          const permission = this.screen.permissions.find((candidate) => candidate.code === code);
          return permission?.action === 'ver' || code.endsWith('.ver');
        });
        for (const code of accessCodes.length ? accessCodes : linkedCodes.slice(0, 1)) {
          const permission = this.screen.permissions.find((candidate) => candidate.code === code);
          if (permission && !linked.has(permission.id)) {
            linked.add(permission.id);
            try { await this.screen.assignPermission(roleId, permission.id); } catch { /* duplicate: already linked */ }
          }
        }
      }
      this.lastCreatedRole = String(data.get('name')) + ` con ${linked.size} ${linked.size === 1 ? 'permiso' : 'permisos'}`;
      target.reset();
      this.roleScope = '';
    } catch {
      /* facade surfaces the error */
    }
  }
  async createUser(event: Event) {
    event.preventDefault();
    const target = event.target as HTMLFormElement;
    const data = new FormData(target);
    const email = String(data.get('email') ?? '');
    const companyId = String(data.get('companyId') ?? '');
    const roleId = String(data.get('roleId') ?? '');
    try {
      const created = await this.screen.createUser({
        email,
        name: data.get('name') ?? '',
        password: data.get('password') ?? '',
      });
      if (created === undefined) return;
      let summary = `✓ ${email} creada.`;
      if (companyId) {
        const membership = await this.screen.createMembership({
          userId: (created as { id: string }).id,
          companyId,
        });
        if (membership !== undefined) {
          summary += ' Vinculada a la empresa.';
          if (roleId) {
            await this.screen.assignRole(roleId, {
              membershipId: (membership as { id: string }).id,
              companyId,
            });
            summary += ' Rol asignado.';
          }
        }
      } else if (roleId)
        summary += ' Sin empresa elegida: el rol no se asignó.';
      this.lastUser = summary;
      target.reset();
    } catch {
      /* facade surfaces the error */
    }
  }
  async createCompany(event: Event) {
    event.preventDefault();
    const target = event.target as HTMLFormElement;
    const data = new FormData(target);
    try {
      const created = await this.screen.createCompany({
        name: data.get('name') ?? '',
        taxId: data.get('taxId') || undefined,
      });
      if (created === undefined) return;
      this.lastCompany = String(data.get('name'));
      target.reset();
    } catch {
      /* facade surfaces the error */
    }
  }
  async createMembership(event: Event) {
    event.preventDefault();
    const target = event.target as HTMLFormElement;
    const data = new FormData(target);
    try {
      const created = await this.screen.createMembership({
        userId: String(data.get('userId') ?? ''),
        companyId: String(data.get('companyId') ?? ''),
      });
      if (created === undefined) return;
      this.lastMembership = this.userName(String(data.get('userId')));
      target.reset();
    } catch {
      /* facade surfaces the error */
    }
  }
  async assignRole(event: Event) {
    event.preventDefault();
    const data = new FormData(event.target as HTMLFormElement);
    const userId = String(data.get('userId') ?? '');
    const companyId = String(data.get('companyId') ?? '');
    const membership = this.screen.memberships.find(
      (candidate) =>
        candidate.userId === userId &&
        candidate.companyId === companyId &&
        candidate.status !== 'INACTIVE',
    );
    if (!membership) {
      this.screen.state = {
        ...this.screen.state,
        message: `Primero vinculá a ${this.userName(userId)} con esa empresa (formulario «Vincular persona a una empresa»).`,
      };
      return;
    }
    try {
      await this.screen.assignRole(String(data.get('roleId')), {
        membershipId: membership.id,
        companyId,
      });
      const role = this.screen.roles.find((r) => r.id === String(data.get('roleId')));
      this.lastAssignment = `Rol «${role?.name ?? ''}» asignado a ${this.userName(userId)} en ${this.companyName(companyId)}.`;
      this.selectedAssignUserId = '';
      this.selectedAssignCompanyId = '';
    } catch {
      /* facade surfaces the error */
    }
  }
  assignPermission(event: Event) {
    event.preventDefault();
    const data = new FormData(event.target as HTMLFormElement);
    void this.screen.assignPermission(
      String(data.get('roleId')),
      String(data.get('permissionId')),
    );
  }
  assignMenuPermission(event: Event) {
    event.preventDefault();
    const data = new FormData(event.target as HTMLFormElement);
    void this.screen.addMenuPermission(
      String(data.get('itemId')),
      String(data.get('permissionId')),
    );
  }
  updateMenuRoute(event: Event, id: string) {
    event.preventDefault();
    const data = new FormData(event.target as HTMLFormElement);
    void this.screen.updateMenuRoute(id, data.get('route'));
  }
  async createMenuItem(event: Event) {
    event.preventDefault();
    const target = event.target as HTMLFormElement;
    const data = new FormData(target);
    const name = String(data.get('name') ?? '');
    const route = String(data.get('route') ?? '');
    if (route && !route.startsWith('/')) {
      this.screen.state = { ...this.screen.state, message: 'La URL debe empezar con / (por ejemplo: /inventario).' };
      return;
    }
    const moduleId = this.screen.menu[0]?.moduleId;
    if (!moduleId) {
      this.screen.state = { ...this.screen.state, message: 'No hay un módulo de menú disponible todavía.' };
      return;
    }
    try {
      const created = await this.screen.createMenuItem({ moduleId, name, route });
      if (created === undefined) return;
      this.lastMenuItem = name;
      this.menuNamePreview = '';
      target.reset();
    } catch {
      /* facade surfaces the error */
    }
  }
  // ── Tablas: búsqueda, ordenamiento y selección (reutilizable) ──
  tableQueries: Record<string, string | undefined> = {};
  tableSort: Record<string, { key: string; dir: 1 | -1 }> = {};
  selectedRows: Record<string, string> = {};
  queryOf(table: string) { return (this.tableQueries[table] ?? '').trim().toLowerCase(); }
  setQuery(table: string, value: string) { this.tableQueries[table] = value; }
  matchesQuery(row: Record<string, unknown>, query: string, fields: string[]) {
    if (!query) return true;
    return fields.some((field) => String(row[field] ?? '').toLowerCase().includes(query));
  }
  toggleSort(table: string, key: string) {
    const current = this.tableSort[table];
    this.tableSort[table] = current?.key === key ? { key, dir: current.dir === 1 ? -1 : 1 } : { key, dir: 1 };
  }
  sortIndicator(table: string, key: string) {
    const current = this.tableSort[table];
    return current?.key === key ? (current.dir === 1 ? '↑' : '↓') : '';
  }
  sortRows<T>(table: string, rows: T[], accessor: (row: T) => unknown): T[] {
    const current = this.tableSort[table];
    if (!current) return rows;
    return [...rows].sort((a, b) => String(accessor(a) ?? '').localeCompare(String(accessor(b) ?? '')) * current.dir);
  }
  isSelected(table: string, id: string) { return this.selectedRows[table] === id; }
  // ── KPI bento y paginación (reutilizable) ──
  tablePages: Record<string, number> = {};
  readonly pageSize = 8;
  pageOf(table: string) { return this.tablePages[table] ?? 1; }
  setPage(table: string, page: number) { this.tablePages[table] = Math.max(1, page); }
  pageCount(rows: unknown[]) { return Math.max(1, Math.ceil(rows.length / this.pageSize)); }
  pagedRows<T>(table: string, rows: T[]): T[] {
    const page = Math.min(this.pageOf(table), this.pageCount(rows));
    this.tablePages[table] = page;
    return rows.slice((page - 1) * this.pageSize, page * this.pageSize);
  }
  pageLabel(table: string, rows: unknown[]) {
    if (!rows.length) return 'Sin registros';
    const page = Math.min(this.pageOf(table), this.pageCount(rows));
    const from = (page - 1) * this.pageSize + 1;
    const to = Math.min(rows.length, page * this.pageSize);
    return `Mostrando ${from}–${to} de ${rows.length}`;
  }
  kpiOf(rows: Array<{ status?: string }>) {
    return { total: rows.length, activos: rows.filter((r) => r.status !== 'INACTIVE').length, inactivos: rows.filter((r) => r.status === 'INACTIVE').length };
  }
  filteredSorted<T extends Record<string, unknown>>(table: string, rows: T[], fields: string[], sortField: string): T[] {
    const q = this.queryOf(table);
    const filtered = q ? rows.filter((row) => fields.some((f) => String(row[f] ?? '').toLowerCase().includes(q))) : rows;
    return this.sortRows(table, filtered, (row) => row[sortField]);
  }
  selectRow(table: string, id: string) { this.selectedRows[table] = this.selectedRows[table] === id ? '' : id; }
  initials(name: string) { return name.split(/\s+/).map((part) => part[0] ?? '').join('').slice(0, 2).toUpperCase(); }
  filteredUsers() {
    const query = this.userQuery.trim().toLowerCase();
    if (!query) return this.screen.users;
    return this.screen.users.filter((user) => user.name.toLowerCase().includes(query) || user.email.toLowerCase().includes(query));
  }
  removeUserRole(roleId: string, membershipId: string, roleName: string) {
    if (!globalThis.confirm(`¿Quitar el rol «${roleName}»? La persona perderá sus funciones de inmediato.`)) return;
    void this.screen.unassignRole(roleId, membershipId);
  }
  async assignUserRole(event: Event, userId: string) {
    event.preventDefault();
    const data = new FormData(event.target as HTMLFormElement);
    const roleId = String(data.get('roleId') ?? '');
    const companyId = String(data.get('companyId') ?? '');
    const membership = this.screen.memberships.find((m) => m.userId === userId && m.companyId === companyId && m.status !== 'INACTIVE');
    if (!membership || !roleId) return;
    try {
      await this.screen.assignRole(roleId, { membershipId: membership.id, companyId });
      const role = this.screen.roles.find((r) => r.id === roleId);
      this.lastAssignment = `Rol «${role?.name ?? ''}» agregado a ${this.userName(userId)} en ${this.companyName(companyId)}.`;
    } catch {
      /* facade surfaces the error */
    }
  }
  viewUser(id: string) { this.selectedUserId = this.selectedUserId === id ? '' : id; }
  selectedUser() { return this.screen.users.find((user) => user.id === this.selectedUserId); }
  userRoleNames(userId: string) { return [...new Set(this.userMemberships(userId).flatMap((m) => m.roles ?? []))]; }
  userMemberships(userId: string) { return this.screen.memberships.filter((m) => m.userId === userId); }
  userPermissions(userId: string) {
    const roleNames = new Set(this.userMemberships(userId).flatMap((m) => m.roles ?? []));
    const codes = new Set<string>();
    for (const role of this.screen.roles) if (roleNames.has(role.name) && role.status !== 'INACTIVE') for (const code of role.permissions ?? []) codes.add(code);
    return [...codes].sort();
  }
  userMenus(userId: string) {
    const codes = new Set(this.userPermissions(userId));
    return this.screen.menu.filter((item) => (item.permissions ?? []).some((code) => codes.has(code))).map((item) => item.name);
  }
  toggleEditMenu(id: string, checked: boolean) {
    this.editMenus = checked ? [...this.editMenus, id] : this.editMenus.filter((entry) => entry !== id);
    if (!checked) {
      const item = this.screen.menu.find((entry) => entry.id === id);
      const codes = new Set(item?.permissions ?? []);
      this.editPermissions = this.editPermissions.filter((code) => !codes.has(code));
    }
  }
  toggleEditPermission(code: string, checked: boolean) {
    this.editPermissions = checked ? [...this.editPermissions, code] : this.editPermissions.filter((entry) => entry !== code);
  }
  editingRole() { return this.screen.roles.find((role) => role.id === this.editingRoleId); }
  startRoleEdit(id: string) {
    const role = this.screen.roles.find((entry) => entry.id === id);
    if (!role) return;
    this.editingRoleId = id;
    this.editPermissions = [...(role.permissions ?? [])];
    const codes = new Set(role.permissions ?? []);
    this.editMenus = this.screen.menu.filter((item) => (item.permissions ?? []).some((code) => codes.has(code))).map((item) => item.id);
  }
  cancelRoleEdit() { this.editingRoleId = ''; this.editMenus = []; this.editPermissions = []; }
  availableEditFunctions() {
    const codes = new Set<string>();
    for (const itemId of this.editMenus) {
      const item = this.screen.menu.find((entry) => entry.id === itemId);
      for (const code of item?.permissions ?? []) codes.add(code);
    }
    return this.screen.permissions.filter((permission) => codes.has(permission.code) && permission.status !== 'INACTIVE');
  }
  async saveRoleEdit() {
    const role = this.editingRole();
    if (!role) return;
    const desired = new Set(this.editPermissions);
    for (const itemId of this.editMenus) {
      const item = this.screen.menu.find((entry) => entry.id === itemId);
      for (const code of item?.permissions ?? []) {
        const permission = this.screen.permissions.find((candidate) => candidate.code === code);
        if (permission && (permission.action === 'ver' || code.endsWith('.ver'))) desired.add(permission.code);
      }
    }
    const current = new Set(role.permissions ?? []);
    const byCode = new Map(this.screen.permissions.map((permission) => [permission.code, permission.id]));
    try {
      for (const code of current) {
        if (!desired.has(code)) {
          const permissionId = byCode.get(code);
          if (permissionId) await this.screen.removeRolePermission(role.id, permissionId);
        }
      }
      for (const code of desired) {
        if (!current.has(code)) {
          const permissionId = byCode.get(code);
          if (permissionId) await this.screen.assignPermission(role.id, permissionId);
        }
      }
      this.lastCreatedRole = `${role.name} actualizado`;
      this.cancelRoleEdit();
    } catch {
      /* facade surfaces the error */
    }
  }
  viewRole(id: string) { this.selectedRoleId = this.selectedRoleId === id ? '' : id; }
  selectedRole() { return this.screen.roles.find((role) => role.id === this.selectedRoleId); }
  roleMenus(role: { permissions?: string[] }) {
    const codes = new Set(role.permissions ?? []);
    return this.screen.menu.filter((item) => (item.permissions ?? []).some((code) => codes.has(code))).map((item) => item.name);
  }
  availableRolePermissions() {
    const codes = new Set<string>();
    for (const itemId of this.selectedRoleMenuIds) {
      const item = this.screen.menu.find((entry) => entry.id === itemId);
      for (const code of item?.permissions ?? []) codes.add(code);
    }
    return this.screen.permissions.filter((permission) => codes.has(permission.code) && permission.status !== 'INACTIVE');
  }
  companiesOfUser() {
    if (!this.selectedAssignUserId) return [];
    const linked = new Set(
      this.screen.memberships
        .filter((m) => m.userId === this.selectedAssignUserId && m.status !== 'INACTIVE')
        .map((m) => m.companyId),
    );
    return this.screen.companies.filter((c) => c.status !== 'INACTIVE' && linked.has(c.id));
  }
  availableCompanies() {
    if (!this.selectedMembershipUserId) return this.screen.companies.filter((c) => c.status !== 'INACTIVE');
    const taken = new Set(
      this.screen.memberships
        .filter((m) => m.userId === this.selectedMembershipUserId && m.status !== 'INACTIVE')
        .map((m) => m.companyId),
    );
    return this.screen.companies.filter((c) => c.status !== 'INACTIVE' && !taken.has(c.id));
  }
  availableServices() {
    if (!this.selectedServiceCompanyId) return this.screen.services.filter((s) => s.status !== 'INACTIVE');
    const taken = new Set(
      this.screen.serviceAssignments
        .filter((a) => a.companyId === this.selectedServiceCompanyId && a.status !== 'INACTIVE')
        .map((a) => a.serviceId),
    );
    return this.screen.services.filter((s) => s.status !== 'INACTIVE' && !taken.has(s.id));
  }
  generatedServiceCode() {
    return this.normalizeRoutePart(this.serviceNameInput);
  }
  updateServicePreview() {
    const form = globalThis.document?.querySelector('form[aria-label="Crear servicio"]') as HTMLFormElement | null;
    if (!form) return;
    this.serviceNameInput = String(new FormData(form).get('name') ?? '');
  }
  async createService(event: Event) {
    event.preventDefault();
    const target = event.target as HTMLFormElement;
    const data = new FormData(target);
    const name = String(data.get('name') ?? '');
    const code = String(data.get('code') ?? '') || this.generatedServiceCode();
    try {
      await this.screen.createService({ code, name });
      this.serviceNameInput = '';
      target.reset();
    } catch {
      /* facade surfaces the error */
    }
  }
  assignService(event: Event) {
    event.preventDefault();
    const data = new FormData(event.target as HTMLFormElement);
    void this.screen.assignService(
      String(data.get('companyId')),
      String(data.get('serviceId')),
    );
  }
}

/** Shared chrome pieces; AOT needs static string concatenation, not function calls. */
export const ADMIN_CHROME_TOP = `<section class="admin" aria-labelledby="admin-title">`;
export const ADMIN_CHROME_STATUS = '<div class="workflow">';
export const ADMIN_CHROME_END = '</div></section>';

export const ADMIN_STYLES = `.admin { display: block; max-width: 1240px; margin: 0 auto; padding: 8px 0 48px; } .intro { max-width: 760px; color: var(--text-muted); } .admin-topbar { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; } .workflow { display: grid; gap: 20px; } mat-card { padding: 8px; } form, .items { display: flex; flex-wrap: wrap; gap: 12px; align-items: center; } .create-panel form, .assign-inline { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); grid-auto-rows: max-content; align-content: start; gap: 14px; align-items: start; } .create-panel form button[type='submit'], .create-panel form .btn-create { justify-self: start; align-self: start; margin-top: 19px; } mat-form-field { min-width: 220px; width: auto; flex: 1 1 240px; } table { width: 100%; margin-top: 12px; } .item { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 14px 0; border-bottom: 1px solid var(--border); } .item-main { min-width: 220px; } .muted { color: var(--text-muted); } .status { margin: 12px 0; } .group-title { margin: 18px 0 6px; font-size: .95rem; color: var(--navy); } .example { font-size: .85rem; } .empty-state { padding: 14px; border: 1px dashed var(--border); border-radius: 12px; color: var(--text-muted); } .actions-group { display: flex; gap: 8px; align-items: center; } .action-help { margin: 6px 0 0; font-size: .85rem; } .danger { color: #b3261e; } .inline-success { margin: 10px 0 4px; padding: 10px 14px; background: #e6f4ea; color: #1e7e34; border-radius: 8px; font-size: .88rem; } .preview-code { background: #ffffff; border: 1px dashed #8fc3cc; border-radius: 6px; padding: 3px 10px; font-weight: 700; color: var(--navy); } .create-panel { background: #eef6f7; border: 1px solid #cfe3e6; border-left: 4px solid var(--agua); border-radius: 14px; padding: 18px 18px 12px; margin: 8px 0 14px; } .create-panel form { align-items: start; } .btn-create { height: 40px; min-height: 40px; padding: 0 16px; font-weight: 700; font-size: .82rem; letter-spacing: .1px; box-shadow: 0 2px 5px rgba(27, 95, 193, .22); } .preview-line { margin: 10px 0 4px; font-size: .85rem; color: var(--text-muted); } .menu-item-details { min-width: 260px; } .data-table { background: white; border: 1px solid var(--border); border-radius: 12px; overflow: hidden; } .data-table th { font-weight: 700; color: var(--navy); } .chip-table { margin-left: 0; } .row-inactive td { background: #faf5f5; color: var(--text-muted); } .chip { display: inline-block; padding: 2px 10px; border-radius: 6px; font-size: .72rem; font-weight: 700; background: rgba(5,150,105,.1); color: #059669; border: 1px solid rgba(5,150,105,.2); margin-left: 8px; vertical-align: middle; } .chip-inactive { background: rgba(220,38,38,.1); color: #dc2626; border: 1px solid rgba(220,38,38,.2); } .chip-scope { background: #e3f1f3; color: var(--agua); font-family: var(--font-data); } .chip-context { background: #eef1f6; color: var(--navy); margin-left: 0; } .quick-nav { display: flex; flex-wrap: wrap; gap: 8px; margin: 4px 0 16px; } .quick-nav a { padding: 6px 14px; border: 1px solid var(--border); border-radius: 999px; background: white; color: var(--navy); font-size: .82rem; font-weight: 600; text-decoration: none; } .quick-nav a:hover, .quick-nav a:focus-visible { background: var(--blue-soft); border-color: #b9c8ea; } .functions-fieldset { border: 1px solid var(--border); border-radius: 10px; padding: 12px 16px; margin: 4px 0; flex-basis: 100%; } .functions-fieldset legend { font-size: .85rem; font-weight: 600; color: var(--navy); padding: 0 6px; } .check { display: inline-flex; align-items: center; gap: 6px; margin-right: 16px; font-size: .9rem; } .check small { color: var(--text-muted); } .user-detail.modal { max-width: 960px; width: 92vw; padding: 0; overflow-y: auto; max-height: 92vh; } .detail-head { display: flex; align-items: center; gap: 14px; padding: 20px 22px; border-bottom: 1px solid var(--linea); background: var(--papel); } .detail-avatar { display: inline-grid; place-items: center; width: 46px; height: 46px; border-radius: 12px; background: linear-gradient(140deg, var(--agua), var(--agua-oscuro)); color: #fff; font-family: var(--font-display); font-weight: 700; font-size: 1.1rem; flex-shrink: 0; } .detail-id { flex: 1; min-width: 0; } .detail-id h2 { margin: 0; font-size: 1.15rem; color: var(--tinta); } .detail-email { font-size: .82rem; color: var(--tinta-suave); } .detail-status { margin-left: auto; } .detail-close { border: 0; background: none; font-size: 1.4rem; color: var(--tinta-suave); cursor: pointer; padding: 4px 8px; border-radius: 8px; line-height: 1; } .detail-close:hover { background: var(--linea); color: var(--tinta); } .detail-section { padding: 18px 22px; border-bottom: 1px solid var(--linea); } .detail-section h3 { display: flex; align-items: center; gap: 8px; margin: 0 0 12px; font-size: .95rem; color: var(--tinta); } .detail-rows { display: grid; gap: 10px; } .detail-row { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 10px 14px; border: 1px solid var(--linea); border-radius: 10px; background: var(--surface); } .chip-cloud { display: flex; flex-wrap: wrap; gap: 8px; } .chip-menu { background: #e3f1f3; color: var(--agua); } .role-chip { display: inline-flex; align-items: center; gap: 4px; margin: 4px 8px 0 0; } .chip-remove { border: 0; background: none; color: inherit; font-weight: 700; cursor: pointer; padding: 0 2px; border-radius: 999px; } .chip-remove:hover { color: #b3261e; } .assign-inline { display: flex; gap: 10px; align-items: center; margin-top: 14px; padding-top: 14px; border-top: 1px dashed var(--linea); } .detail-row-main { flex: 1; min-width: 0; } .chip-func { background: #eef2f7; color: var(--tinta); } .chip-func code { font-family: var(--font-data); font-size: .72rem; color: var(--tinta-suave); } .detail-empty { margin: 0; color: var(--tinta-suave); font-size: .85rem; } .detail-foot { display: flex; justify-content: flex-end; padding: 14px 22px; } .modal-wide { max-width: 1100px !important; width: 92vw !important; }
.toggle-table { display: grid; border: 1px solid var(--linea); border-radius: 10px; overflow: hidden; max-height: 300px; overflow-y: auto; background: var(--surface); }
.toggle-row { display: flex; align-items: center; justify-content: space-between; gap: 14px; padding: 11px 16px; border-bottom: 1px solid var(--linea); transition: background .12s; }
.toggle-row:last-child { border-bottom: 0; }
.toggle-row:hover { background: #f4f8fa; }
.toggle-name { display: grid; gap: 2px; font-size: .92rem; color: var(--tinta); }
.toggle-name .meter { font-size: .72rem; color: var(--tinta-suave); }
.toggle-table .switch { flex-shrink: 0; }
.switch { position: relative; display: inline-block; width: 44px; height: 24px; flex-shrink: 0; } .switch input { position: absolute; opacity: 0; width: 100%; height: 100%; cursor: pointer; margin: 0; } .switch-track { position: absolute; inset: 0; background: #d8dadc; border-radius: 999px; transition: background .18s; pointer-events: none; } .switch-track::after { content: ""; position: absolute; top: 2px; left: 2px; width: 20px; height: 20px; background: #fff; border-radius: 999px; box-shadow: 0 1px 3px rgba(0,0,0,.25); transition: transform .18s; } .switch input:checked + .switch-track { background: var(--btn-azul); } .switch input:checked + .switch-track::after { transform: translateX(20px); }
.modal-backdrop { position: fixed; inset: 0; background: rgba(24, 35, 56, .45); display: grid; place-items: center; z-index: 1000; padding: 16px; } .modal { max-width: 92vw; width: 100%; max-height: 92vh; overflow-y: auto; box-shadow: 0 12px 40px rgba(24, 35, 56, .3); border-radius: 16px; } .role-detail .list { margin: 6px 0 14px; padding-left: 20px; display: grid; gap: 4px; } @media (max-width: 720px) { .admin { padding: 0 0 32px; } .item { align-items: flex-start; flex-direction: column; } }`;
