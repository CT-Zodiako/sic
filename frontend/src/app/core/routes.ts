import { Component } from '@angular/core';
import { Routes } from '@angular/router';
import { LoginComponent } from '../features/auth/login.component';
import { authGuard as routeAuthGuard, platformAdminGuard } from './guards';
import { AuthenticatedShellComponent } from '../shared/authenticated-shell.component';

class PlaceholderComponent {}
Component({ selector: 'sic-placeholder', standalone: true, template: '<section class="empty-state" aria-live="polite"><span class="eyebrow">SIC Workspace</span><h1>Tu espacio de trabajo</h1><p>Selecciona una empresa y una opción del menú para comenzar.</p></section>' })(PlaceholderComponent);
class AccessDeniedComponent {}
Component({ selector: 'sic-access-denied', standalone: true, template: '<section class="empty-state access-denied" role="alert" aria-live="assertive"><span class="status-badge">403 · Sin acceso</span><h1>Acceso denegado</h1><p>No tienes permiso para acceder a esta sección. Cambia de empresa o solicita acceso al administrador.</p></section>' })(AccessDeniedComponent);

export const APP_ROUTES: Routes = [
  { path: 'login', component: LoginComponent }, { path: 'access-denied', component: AccessDeniedComponent },
  { path: 'not-found', component: PlaceholderComponent },
  { path: '', component: AuthenticatedShellComponent, canActivate: [routeAuthGuard], children: [
    { path: '', loadComponent: () => import('../features/home/home-redirect.component').then(m => m.HomeRedirectComponent) },
    { path: 'platform-admin', loadComponent: () => import('../features/platform-admin/platform-admin.screen').then(m => m.PlatformAdminComponent), canActivate: [routeAuthGuard, platformAdminGuard] },
    { path: 'platform-admin/roles', loadComponent: () => import('../features/platform-admin/admin-roles.component').then(m => m.AdminRolesComponent), canActivate: [routeAuthGuard, platformAdminGuard] },
    { path: 'platform-admin/permisos', loadComponent: () => import('../features/platform-admin/admin-permisos.component').then(m => m.AdminPermisosComponent), canActivate: [routeAuthGuard, platformAdminGuard] },
    { path: 'platform-admin/usuarios', loadComponent: () => import('../features/platform-admin/admin-usuarios.component').then(m => m.AdminUsuariosComponent), canActivate: [routeAuthGuard, platformAdminGuard] },
    { path: 'platform-admin/empresas', loadComponent: () => import('../features/platform-admin/admin-empresas.component').then(m => m.AdminEmpresasComponent), canActivate: [routeAuthGuard, platformAdminGuard] },
    { path: 'platform-admin/menus', loadComponent: () => import('../features/platform-admin/admin-menus.component').then(m => m.AdminMenusComponent), canActivate: [routeAuthGuard, platformAdminGuard] },
    { path: 'platform-admin/servicios', loadComponent: () => import('../features/platform-admin/admin-servicios.component').then(m => m.AdminServiciosComponent), canActivate: [routeAuthGuard, platformAdminGuard] },
    { path: 'sui', loadComponent: () => import('../features/sui/sui.component').then(m => m.SuiComponent), canActivate: [routeAuthGuard] },
    { path: 'operational-demo', loadComponent: () => import('../features/operational-demo/operational-demo.screen').then(m => m.OperationalDemoComponent), canActivate: [routeAuthGuard] },
  ] },
  { path: '**', redirectTo: '' },
];
export const authGuard = (authenticated: boolean, attemptedUrl = '/') => authenticated ? true : `/login?returnUrl=${encodeURIComponent(attemptedUrl)}`;
export class ProtectedShell { render(content = ''): string { return `<main aria-label="Authenticated application">${content}</main>`; } }
export const SECURITY_HEADERS: Readonly<Record<string, string>> = { 'Content-Security-Policy': "default-src 'self'; connect-src 'self'; img-src 'self' data:; object-src 'none'; base-uri 'self'; frame-ancestors 'none'", 'Referrer-Policy': 'no-referrer', 'X-Content-Type-Options': 'nosniff', 'X-Frame-Options': 'DENY' };
export const DEV_PROXY_TARGET = 'http://localhost:3000';
