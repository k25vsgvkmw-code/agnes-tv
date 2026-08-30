export interface CooldownPolicyInput {
  readonly lastEmittedAt: Date;
  readonly now: Date;
  readonly materialChange: boolean;
}

const COOLDOWN_MS = 10 * 60 * 1000;

export function shouldSuppressByCooldown(input: CooldownPolicyInput): boolean {
  if (input.materialChange) return false;
  return input.now.getTime() - input.lastEmittedAt.getTime() < COOLDOWN_MS;
}
