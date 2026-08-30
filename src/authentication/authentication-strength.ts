export const AUTHENTICATION_STRENGTH = [
  'ANONYMOUS',
  'SESSION_KNOWN',
  'DEVICE_TRUSTED',
  'USER_AUTHENTICATED',
  'STRONG_AUTHENTICATED',
] as const;

export type AuthenticationStrength = (typeof AUTHENTICATION_STRENGTH)[number];

const AUTHENTICATION_RANK = new Map<AuthenticationStrength, number>(
  AUTHENTICATION_STRENGTH.map((strength, index) => [strength, index]),
);

export function meetsAuthenticationStrength(
  actual: AuthenticationStrength,
  required: AuthenticationStrength,
): boolean {
  return (AUTHENTICATION_RANK.get(actual) ?? -1) >= (AUTHENTICATION_RANK.get(required) ?? -1);
}
