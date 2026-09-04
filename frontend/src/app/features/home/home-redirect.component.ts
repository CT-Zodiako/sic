import { Component, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import { CompanyContextStore } from '../company-context/company-context.store';

/** Root entry: sends the user to their first authorized menu entry; no home screen exists. */
@Component({ selector: 'sic-home-redirect', standalone: true, template: '' })
export class HomeRedirectComponent implements OnInit {
  private readonly context = inject(CompanyContextStore);
  private readonly router = inject(Router);
  ngOnInit() {
    const go = () => {
      const first = this.context.menu.find((item) => item.navigable && item.route);
      if (first?.route) void this.router.navigateByUrl(first.route);
    };
    if (this.context.menu.length) { go(); return; }
    const unsubscribe = this.context.subscribe(() => { if (this.context.menu.length) { go(); unsubscribe(); } });
    if (!this.context.state.companies.length) void this.context.loadCompanies();
  }
}
