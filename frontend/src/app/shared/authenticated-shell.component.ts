import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';
import { AuthStore } from '../core/auth.store';
import { CompanyContextStore } from '../features/company-context/company-context.store';
import { NavigationMenuComponent } from './navigation-menu.component';

@Component({
  selector: 'sic-authenticated-shell',
  standalone: true,
  imports: [CommonModule, RouterOutlet, NavigationMenuComponent],
  template: `<section class="shell" aria-label="Aplicación autenticada"><aside class="sidebar"><div class="sidebar-brand"><span class="brand-mark" aria-hidden="true">S</span><span>SIC <small>Workspace</small></span></div><div class="sidebar-label">Navegación</div><sic-navigation-menu [nodes]="context.menu" /><div class="sidebar-spacer"></div><button class="sidebar-signout" type="button" (click)="signOut()"><span aria-hidden="true">↪</span> Cerrar sesión</button></aside><div class="shell-main"><header class="shell-topbar"><div class="topbar-context" *ngIf="!isAdminArea()"><label for="company-context">Empresa</label><select id="company-context" [value]="context.selectedCompanyId || ''" (change)="select($any($event.target).value)" [disabled]="context.state.state === 'selecting'"><option value="">Selecciona una empresa</option><option *ngFor="let company of context.state.companies" [value]="company.id">{{company.name}}</option></select><span class="context-feedback" *ngIf="context.state.state === 'loading-companies' || context.state.state === 'loading-context'" aria-live="polite">Cargando…</span><span class="context-feedback" *ngIf="context.state.state === 'no-company'" aria-live="polite">Sin empresa disponible.</span></div></header><main class="shell-content"><router-outlet /></main></div></section>`
})
export class AuthenticatedShellComponent implements OnInit {
  readonly context = inject(CompanyContextStore);
  private readonly auth = inject(AuthStore);
  private readonly router = inject(Router);
  ngOnInit() { if (!this.context.state.companies.length) void this.context.loadCompanies(); }
  select(companyId: string) { if (companyId) void this.context.selectCompany(companyId); }
  isAdminArea() { return this.router.url.startsWith('/platform-admin'); }
  signOut() { this.auth.logout(); this.context.clear(); void this.router.navigate(['/login']); }
}
