export type AuthUser = { id: string; email: string; name: string; companyId?: string };
export type AuthState = 'anonymous' | 'authenticated';
export type AuthSnapshot = { state: AuthState; accessToken: string | null; user: AuthUser | null };

/** Access tokens intentionally have no persistence adapter: they live only for this page session. */
export class AuthStore {
  private snapshot: AuthSnapshot = (() => {
    try {
    // TODO(TEST-ONLY): persistent localStorage session is for the testing phase only — REMOVE before production.
    const token = globalThis.sessionStorage?.getItem('sic_access_token') ?? globalThis.localStorage?.getItem('sic_access_token');
    const user = globalThis.sessionStorage?.getItem('sic_user') ?? globalThis.localStorage?.getItem('sic_user');
    return token ? { state: 'authenticated', accessToken: token, user: user ? JSON.parse(user) as AuthUser : null } : { state: 'anonymous', accessToken: null, user: null };
  } catch { return { state: 'anonymous', accessToken: null, user: null }; }
  })();
  private readonly listeners = new Set<(state: AuthSnapshot) => void>();

  get state(): AuthSnapshot { return this.snapshot; }
  get accessToken(): string | null { return this.snapshot.accessToken; }
  get authenticated(): boolean { return this.snapshot.state === 'authenticated'; }
  subscribe(listener: (state: AuthSnapshot) => void): () => void { this.listeners.add(listener); return () => this.listeners.delete(listener); }
  setSession(accessToken: string, user: AuthUser | null = null): void {
    if (!accessToken.trim()) { this.logout(); return; }
    try { globalThis.sessionStorage?.setItem('sic_access_token', accessToken); if (user) globalThis.sessionStorage?.setItem('sic_user', JSON.stringify(user)); globalThis.localStorage?.setItem('sic_access_token', accessToken); if (user) globalThis.localStorage?.setItem('sic_user', JSON.stringify(user)); } catch { /* storage is optional */ } // TODO(TEST-ONLY): localStorage mirror — REMOVE before production.
    this.publish({ state: 'authenticated', accessToken, user });
  }
  setAccessToken(accessToken: string): void {
    if (this.snapshot.state === 'authenticated') { try { globalThis.sessionStorage?.setItem('sic_access_token', accessToken); globalThis.localStorage?.setItem('sic_access_token', accessToken); } catch { /* storage is optional */ } this.publish({ ...this.snapshot, accessToken }); }
    else this.setSession(accessToken);
  }
  logout(): void { try { globalThis.sessionStorage?.removeItem('sic_access_token'); globalThis.sessionStorage?.removeItem('sic_user'); globalThis.localStorage?.removeItem('sic_access_token'); globalThis.localStorage?.removeItem('sic_user'); } catch { /* storage is optional */ } this.publish({ state: 'anonymous', accessToken: null, user: null }); }
  private publish(snapshot: AuthSnapshot): void { this.snapshot = Object.freeze(snapshot); for (const listener of this.listeners) listener(this.snapshot); }
}
