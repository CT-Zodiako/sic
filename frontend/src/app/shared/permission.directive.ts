export type PermissionView = { show(): void; hide(): void; disable?(): void };
/** UX only: this directive never intercepts or authorizes an HTTP request. */
export class PermissionActionDirective {
  private readonly view: PermissionView;
  private readonly permissions: () => ReadonlySet<string>;
  constructor(view: PermissionView, permissions: () => ReadonlySet<string>) { this.view = view; this.permissions = permissions; }
  update(required: string | string[], mode: 'any' | 'all' = 'any') {
    const needed = Array.isArray(required) ? required : [required];
    const granted = mode === 'all' ? needed.every(p => this.permissions().has(p)) : needed.some(p => this.permissions().has(p));
    if (granted) this.view.show(); else this.view.hide();
    return granted;
  }
}
export const can = (permissions: ReadonlySet<string>, required: string | string[], mode: 'any' | 'all' = 'any') => {
  const values = Array.isArray(required) ? required : [required];
  return mode === 'all' ? values.every(p => permissions.has(p)) : values.some(p => permissions.has(p));
};
