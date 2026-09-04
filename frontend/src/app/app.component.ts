import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { MatToolbarModule } from '@angular/material/toolbar';

const DEFAULT_TITLE = 'Servicios SIC';
export class AppComponent {
  readonly title: string;
  constructor(...args: [string?]) { this.title = args[0] ?? DEFAULT_TITLE; }
  render(): string { return `<main>${this.title}</main>`; }
}
Component({ selector: 'app-root', standalone: true, imports: [RouterOutlet, MatToolbarModule], template: `<a class="skip-link" href="#content">Saltar al contenido</a><div class="app-frame"><main id="content" class="app-content"><router-outlet /></main></div>` })(AppComponent);
