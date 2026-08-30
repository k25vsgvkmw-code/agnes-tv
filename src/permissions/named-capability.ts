import type { AuthenticationStrength } from '../authentication/authentication-strength.js';

export const NAMED_CAPABILITIES = [
  'live.presence.submit',
  'family.location.view',
  'calendar.read',
  'calendar.create',
  'family.message.send',
  'shopping.list.modify',
  'smart_home.light.control',
  'door.unlock',
  'purchase.confirm',
  'finance.transfer',
  'health.private.read',
] as const;

export type NamedCapability = (typeof NAMED_CAPABILITIES)[number];

export interface NamedCapabilityPolicy {
  readonly minimumAuthenticationStrength: AuthenticationStrength;
  readonly protectedOnSharedDevice: boolean;
}

const POLICY: Readonly<Record<NamedCapability, NamedCapabilityPolicy>> = Object.freeze({
  'live.presence.submit': {
    minimumAuthenticationStrength: 'DEVICE_TRUSTED',
    protectedOnSharedDevice: false,
  },
  'family.location.view': {
    minimumAuthenticationStrength: 'USER_AUTHENTICATED',
    protectedOnSharedDevice: true,
  },
  'calendar.read': {
    minimumAuthenticationStrength: 'SESSION_KNOWN',
    protectedOnSharedDevice: false,
  },
  'calendar.create': {
    minimumAuthenticationStrength: 'USER_AUTHENTICATED',
    protectedOnSharedDevice: false,
  },
  'family.message.send': {
    minimumAuthenticationStrength: 'USER_AUTHENTICATED',
    protectedOnSharedDevice: false,
  },
  'shopping.list.modify': {
    minimumAuthenticationStrength: 'USER_AUTHENTICATED',
    protectedOnSharedDevice: false,
  },
  'smart_home.light.control': {
    minimumAuthenticationStrength: 'USER_AUTHENTICATED',
    protectedOnSharedDevice: false,
  },
  'door.unlock': {
    minimumAuthenticationStrength: 'STRONG_AUTHENTICATED',
    protectedOnSharedDevice: true,
  },
  'purchase.confirm': {
    minimumAuthenticationStrength: 'STRONG_AUTHENTICATED',
    protectedOnSharedDevice: true,
  },
  'finance.transfer': {
    minimumAuthenticationStrength: 'STRONG_AUTHENTICATED',
    protectedOnSharedDevice: true,
  },
  'health.private.read': {
    minimumAuthenticationStrength: 'STRONG_AUTHENTICATED',
    protectedOnSharedDevice: true,
  },
});

export function namedCapabilityPolicy(capability: NamedCapability): NamedCapabilityPolicy {
  return POLICY[capability];
}
