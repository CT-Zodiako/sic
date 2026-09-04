import { PermissionResolver, type PolicyMode, type PermissionOptions } from './resolver.ts';

export type Policy = { permissions: string[]; mode?: PolicyMode; allowPlatform?: boolean };
const policies = new WeakMap<object, Policy>();

export function Authorize(...permissions: string[]): MethodDecorator & ClassDecorator {
  return (target: object, propertyKey?: string | symbol, descriptor?: PropertyDescriptor) => { policies.set(propertyKey && descriptor?.value ? descriptor.value : target, { permissions, mode: 'ANY' }); };
}
export function Policy(policy: Policy): MethodDecorator & ClassDecorator {
  return (target: object, propertyKey?: string | symbol, descriptor?: PropertyDescriptor) => { policies.set(propertyKey && descriptor?.value ? descriptor.value : target, policy); };
}
export function policyFor(target: object): Policy | undefined { return policies.get(target); }

export class PolicyGuard {
  constructor(private readonly resolver: PermissionResolver) {}
  canActivate(request: { user?: { id: string }; tenant?: { companyId: string }; policy?: Policy }, policy?: Policy) {
    const selected = policy ?? request.policy;
    if (!request.user) return false;
    if (!selected || !request.tenant) return false;
    const options: PermissionOptions = { allowPlatform: selected.allowPlatform === true };
    return this.resolver.can(request.user.id, request.tenant.companyId, selected.permissions, selected.mode ?? 'ANY', options);
  }
}
