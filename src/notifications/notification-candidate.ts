import type { HouseholdId, PersonId } from '../kernel/ids.js';
import type { DeliveryChannel } from './delivery-channel.js';

export type NotificationPrivacy = 'HOUSEHOLD' | 'PRIVATE';

export interface NotificationCandidate {
  readonly id: string;
  readonly householdId: HouseholdId;
  readonly targetPersonId: PersonId;
  readonly privacy: NotificationPrivacy;
  readonly allowedChannels: readonly DeliveryChannel[];
  readonly title: string;
  readonly message: string;
}
