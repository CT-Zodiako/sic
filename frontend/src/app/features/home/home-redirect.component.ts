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
      const findRoute = (items: typeof this.context.menu): string | undefined => {
        for (const item of items) {
          if (item.navigable && item.route) return item.route;
          const child = findRoute(item.children ?? []);
          if (child) return child;
        }
        return undefined;
      };
      const first = findRoute(this.context.menu);
      if (first) void this.router.navigateByUrl(first);
    };
    if (this.context.menu.length) { go(); return; }
    const unsubscribe = this.context.subscribe(() => { if (this.context.menu.length) { go(); unsubscribe(); } });
    if (!this.context.state.companies.length) void this.context.loadCompanies();
  }
}
