import { randomUUID } from 'node:crypto';
import { ApiError } from '../common/errors.ts';
import type { PolicyMode } from '../authorization/resolver.ts';

export type MenuItemRecord = {
  id: string; label?: string; name?: string; description?: string; icon?: string; route?: string | null;
  parentId?: string | null; sortOrder?: number; status?: 'ACTIVE' | 'INACTIVE'; permissionMode?: PolicyMode;
  permissions?: string[];
};
export type MenuNode = { id: string; label: string; icon?: string; route?: string; navigable: boolean; children: MenuNode[] };
export type MenuRepository = { list(): Promise<MenuItemRecord[]> };
export class InMemoryMenuRepository implements MenuRepository {
  private readonly records: MenuItemRecord[];
  constructor(records: MenuItemRecord[] = []) { this.records = records; }
  async list() { return this.records; }
}
export type MenuDelegate = { findMany(args: { where?: Record<string, unknown>; include?: Record<string, unknown>; orderBy?: unknown }): Promise<unknown[]> };
export class PrismaMenuRepository implements MenuRepository {
  private readonly delegate: MenuDelegate;
  constructor(delegate: MenuDelegate) { this.delegate = delegate; }
  async list() {
    const rows = await this.delegate.findMany({ where: { status: 'ACTIVE', module: { status: 'ACTIVE' } }, include: { permissions: { include: { permission: true } } }, orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }] });
    return rows.map(row => { const value = row as any; return { id: String(value.id), moduleId: value.moduleId ?? undefined, name: String(value.name), description: value.description ?? undefined, route: value.route, parentId: value.parentId, sortOrder: value.sortOrder, status: value.status, permissions: (value.permissions ?? []).filter((link: any) => link.permission?.status !== 'INACTIVE').map((link: any) => String(link.permission.code)) }; });
  }
}

export class MenuService {
  readonly items: MenuItemRecord[];
  private readonly repository: MenuRepository;
  constructor(items: MenuItemRecord[] = [], repository?: MenuRepository) { this.items = items; this.repository = repository ?? new InMemoryMenuRepository(items); }
  async list() { return this.repository.list(); }

  filter(permissionCodes: Iterable<string>, source = this.items): MenuNode[] {
    const permissions = new Set(permissionCodes);
    const active = source.filter(item => item.status !== 'INACTIVE');
    const byParent = new Map<string | null, MenuItemRecord[]>();
    for (const item of active) {
      const parent = item.parentId ?? null;
      const list = byParent.get(parent) ?? [];
      list.push(item); byParent.set(parent, list);
    }
    for (const list of byParent.values()) list.sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || a.id.localeCompare(b.id));
    const visiting = new Set<string>();
    const build = (item: MenuItemRecord): MenuNode | undefined => {
      if (visiting.has(item.id)) return undefined;
      visiting.add(item.id);
      const children = (byParent.get(item.id) ?? []).map(build).filter((x): x is MenuNode => Boolean(x));
      visiting.delete(item.id);
      const required = item.permissions ?? [];
      // Fail-closed: an entry only navigates when a linked permission grants it.
      // Route-less containers stay visible while an authorized descendant exists.
      const eligible = required.length > 0 && ((item.permissionMode ?? 'ANY') === 'ALL'
        ? required.every(code => permissions.has(code))
        : required.some(code => permissions.has(code)));
      // A route-less configured parent is only retained for an authorized child.
      // A routed parent can remain as an ancestor, but is not navigable without itself being eligible.
      if (!eligible && children.length === 0) return undefined;
      if (!item.route && !eligible && children.length === 0) return undefined;
      return {
        id: item.id, label: item.label ?? item.name ?? '',
        ...(item.icon ? { icon: item.icon } : {}), ...(item.route && eligible ? { route: item.route } : {}),
        navigable: Boolean(item.route && eligible), children,
      };
    };
    return (byParent.get(null) ?? []).map(build).filter((x): x is MenuNode => Boolean(x));
  }
}

export type MenuAdminRepository = {
  createModule(data: Record<string, unknown>, audit?: Record<string, unknown>): Promise<unknown>;
  createItem(data: Record<string, unknown>, audit?: Record<string, unknown>): Promise<unknown>;
  updateItem(id: string, data: Record<string, unknown>, audit?: Record<string, unknown>): Promise<unknown>;
  setPermission(itemId: string, permissionId: string, add: boolean, audit?: Record<string, unknown>): Promise<unknown>;
};

export class PrismaMenuAdminRepository implements MenuAdminRepository {
  private readonly client: any;
  constructor(client: any) { this.client = client; }
  private mutate(work: (tx: any) => Promise<unknown>, audit?: Record<string, unknown>) { return this.client.$transaction ? this.client.$transaction(async (tx: any) => { const result = await work(tx); if (audit && tx.auditEvent) await tx.auditEvent.create({ data: audit }); return result; }) : work(this.client); }
  createModule(data: Record<string, unknown>, audit?: Record<string, unknown>) { return this.mutate((tx) => tx.menuModule.create({ data }), audit); }
  createItem(data: Record<string, unknown>, audit?: Record<string, unknown>) { return this.mutate((tx) => tx.menuItem.create({ data }), audit); }
  updateItem(id: string, data: Record<string, unknown>, audit?: Record<string, unknown>) { return this.mutate((tx) => tx.menuItem.update({ where: { id }, data }), audit); }
  setPermission(itemId: string, permissionId: string, add: boolean, audit?: Record<string, unknown>) { return this.mutate((tx) => add ? tx.menuPermission.create({ data: { menuItemId: itemId, permissionId } }) : tx.menuPermission.delete({ where: { menuItemId_permissionId: { menuItemId: itemId, permissionId } } }), audit); }
}

export class MenuAdminService {
  private readonly repository: MenuAdminRepository; private readonly audit?: (event: Record<string, unknown>) => void | Promise<void>;
  constructor(repository: MenuAdminRepository, audit?: (event: Record<string, unknown>) => void | Promise<void>) { this.repository = repository; this.audit = audit; }
  private text(v: unknown, field: string) { if (typeof v !== 'string' || !v.trim()) throw new ApiError(400, 'VALIDATION_ERROR', `${field} is required.`); return v.trim(); }
  async createModule(body: Record<string, unknown>, actorId?: string) { const data = { id: randomUUID(), name: this.text(body.name, 'name'), sortOrder: Number(body.sortOrder ?? 0), status: body.status ?? 'ACTIVE' }; const result = await this.repository.createModule(data, { userId: actorId, resource: 'menu-module', action: 'create', recordId: data.id, result: 'SUCCESS' }); await this.audit?.({ userId: actorId, resource: 'menu-module', action: 'create', recordId: data.id, result: 'SUCCESS' }); return result; }
  async createItem(body: Record<string, unknown>, actorId?: string) { const newId = randomUUID(); const parentId = body.parentId ?? null; if (parentId === newId) throw new ApiError(400, 'MENU_CYCLE', 'A menu item cannot be its own parent.'); const data: any = { id: newId, moduleId: this.text(body.moduleId, 'moduleId'), name: this.text(body.name, 'name'), description: body.description, route: body.route ?? null, parentId, sortOrder: Number(body.sortOrder ?? 0), status: body.status ?? 'ACTIVE', permissionMode: body.permissionMode ?? 'ANY' }; if (data.permissionMode !== 'ANY' && data.permissionMode !== 'ALL') throw new ApiError(400, 'VALIDATION_ERROR', 'permissionMode is invalid.'); const result = await this.repository.createItem(data, { userId: actorId, resource: 'menu-item', action: 'create', recordId: data.id, result: 'SUCCESS' }); await this.audit?.({ userId: actorId, resource: 'menu-item', action: 'create', recordId: data.id, result: 'SUCCESS' }); return result; }
  async updateItem(id: unknown, body: Record<string, unknown>, actorId?: string) { const itemId = this.text(id, 'id'); const allowed = ['name', 'description', 'route', 'parentId', 'sortOrder', 'status', 'permissionMode']; const keys = Object.keys(body).filter(k => !allowed.includes(k)); if (keys.length) throw new ApiError(400, 'VALIDATION_ERROR', `Unknown fields: ${keys.join(', ')}.`); if (body.parentId === itemId) throw new ApiError(400, 'MENU_CYCLE', 'A menu item cannot be its own parent.'); if (body.permissionMode !== undefined && body.permissionMode !== 'ANY' && body.permissionMode !== 'ALL') throw new ApiError(400, 'VALIDATION_ERROR', 'permissionMode is invalid.'); const result = await this.repository.updateItem(itemId, body, { userId: actorId, resource: 'menu-item', action: 'update', recordId: itemId, result: 'SUCCESS' }); await this.audit?.({ userId: actorId, resource: 'menu-item', action: 'update', recordId: itemId, result: 'SUCCESS' }); return result; }
  async permission(id: unknown, body: Record<string, unknown>, actorId?: string, add = true) { const itemId = this.text(id, 'id'); const permissionId = this.text(body.permissionId ?? body.code, 'permissionId'); const result = await this.repository.setPermission(itemId, permissionId, add, { userId: actorId, resource: 'menu-permission', action: add ? 'add' : 'remove', recordId: itemId, result: 'SUCCESS' }); await this.audit?.({ userId: actorId, resource: 'menu-permission', action: add ? 'add' : 'remove', recordId: itemId, result: 'SUCCESS' }); return result; }
}

export const filterMenu = (items: MenuItemRecord[], permissions: Iterable<string>) => new MenuService(items).filter(permissions);
