import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import type { MenuNode } from '../features/company-context/company-context.api';

export type RenderedMenuNode = MenuNode & { children: RenderedMenuNode[] };
const permitted = (node: any, permissions: ReadonlySet<string>) => {
  const values = node.permissions ?? (node.permission ? [node.permission] : []);
  const own = values.length > 0 && (node.permissionMode === 'all' ? values.every((p: string) => permissions.has(p)) : values.some((p: string) => permissions.has(p)));
  const children = renderAuthorizedMenu(node.children ?? [], permissions);
  return { ...node, children, navigable: Boolean(node.route && own), ...(node.route && !own ? { route: undefined } : {}) };
};
export const renderAuthorizedMenu = (nodes: MenuNode[], permissions: ReadonlySet<string>): RenderedMenuNode[] => nodes.map(n => permitted(n, permissions)).filter(n => n.navigable || n.children.length);

@Component({ selector: 'sic-navigation-menu', standalone: true, inputs: ['nodes', 'nested'], imports: [CommonModule, RouterLink, RouterLinkActive], template: `<ng-container *ngIf="nested; else rootNav"><div class="nav-group" role="group"><ul><ng-container *ngFor="let node of nodes"><li><a *ngIf="node.route && node.navigable; else branch" [routerLink]="linkTarget(node).path" [queryParams]="linkTarget(node).params" routerLinkActive="active" [attr.aria-current]="'page'"><span class="nav-dot" aria-hidden="true"></span>{{ node.label }}</a><ng-template #branch><button *ngIf="node.children.length" type="button" (click)="toggle(node.id)" [attr.aria-expanded]="expanded.has(node.id)">{{ node.label }} <span aria-hidden="true">⌄</span></button></ng-template><sic-navigation-menu *ngIf="node.children.length && expanded.has(node.id)" [nodes]="node.children" [nested]="true" /></li></ng-container></ul></div></ng-container><ng-template #rootNav><nav class="primary-nav" aria-label="Navegación principal"><div class="nav-group"><ul><ng-container *ngFor="let node of nodes"><li><a *ngIf="node.route && node.navigable; else branch" [routerLink]="linkTarget(node).path" [queryParams]="linkTarget(node).params" routerLinkActive="active" [attr.aria-current]="'page'"><span class="nav-dot" aria-hidden="true"></span>{{ node.label }}</a><ng-template #branch><button *ngIf="node.children.length" type="button" (click)="toggle(node.id)" [attr.aria-expanded]="expanded.has(node.id)">{{ node.label }} <span aria-hidden="true">⌄</span></button></ng-template><sic-navigation-menu *ngIf="node.children.length && expanded.has(node.id)" [nodes]="node.children" [nested]="true" /></li></ng-container></ul></div></nav></ng-template>` })
export class NavigationMenuComponent {
  nodes: RenderedMenuNode[] = [];
  nested = false;
  readonly expanded = new Set<string>();
  toggle(id: string) { this.expanded.has(id) ? this.expanded.delete(id) : this.expanded.add(id); }
  linkTarget(node: { route?: string }) { const [path, query] = (node.route ?? '').split('?'); const params: Record<string, string> = {}; new URLSearchParams(query ?? '').forEach((value, key) => { params[key] = value; }); return { path, params }; }
  onKey(key: string, index: number, length: number) { return key === 'ArrowDown' ? Math.min(index + 1, length - 1) : key === 'ArrowUp' ? Math.max(index - 1, 0) : index; }
}
