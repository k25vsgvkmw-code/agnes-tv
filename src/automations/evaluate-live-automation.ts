import type { PersonId } from '../kernel/ids.js';
import type { DeliveryChannel } from '../notifications/delivery-channel.js';
import type { LiveSituation } from '../situations/live-situation.js';
import type { AutomationCandidate } from './automation-candidate.js';

export interface EvaluateLiveAutomationInput {
  readonly situation: LiveSituation;
  readonly targetPersonId: PersonId;
  readonly title: string;
  readonly message: string;
  readonly urgency: number;
  readonly allowedChannels: readonly DeliveryChannel[];
}

export function evaluateLiveAutomation(input: EvaluateLiveAutomationInput): AutomationCandidate {
  const base = {
    id: `live:${input.situation.fingerprint}`,
    householdId: input.situation.householdId,
    targetPersonId: input.targetPersonId,
    privacy: 'HOUSEHOLD' as const,
    audience: { kind: 'PERSON' as const, personId: input.targetPersonId },
    situationFingerprint: input.situation.fingerprint,
    urgency: input.urgency,
    expiresAt: new Date(input.situation.expiresAt),
    allowedChannels: [...input.allowedChannels],
    title: input.title,
    message: input.message,
  };

  return {
    ...base,
    ...(input.situation.correlationId === undefined
      ? {}
      : { correlationId: input.situation.correlationId }),
  };
}
