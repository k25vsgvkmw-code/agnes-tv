import type { HouseholdId, PersonId } from '../kernel/ids.js';
import type { DeliveryChannel } from '../notifications/delivery-channel.js';
import type { NotificationPrivacy } from '../notifications/notification-candidate.js';

export interface PersonAutomationAudience {
  readonly kind: 'PERSON';
  readonly personId: PersonId;
}

export interface AutomationCandidate {
  readonly id: string;
  readonly householdId: HouseholdId;
  readonly targetPersonId: PersonId;
  readonly privacy: NotificationPrivacy;
  readonly audience: PersonAutomationAudience;
  readonly situationFingerprint: string;
  readonly urgency: number;
  readonly expiresAt: Date;
  readonly allowedChannels: readonly DeliveryChannel[];
  readonly title: string;
  readonly message: string;
  readonly correlationId?: string;
}
