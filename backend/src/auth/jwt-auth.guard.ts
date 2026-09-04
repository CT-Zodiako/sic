import { AuthService } from './auth.service.ts';

export class JwtAuthGuard {
  constructor(private readonly auth: AuthService) {}
  canActivate(authorization: string | undefined) { return this.auth.authenticate(authorization ?? ''); }
}
