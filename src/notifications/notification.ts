import type { DecisionOutcome } from '../decisions/decide-situation.js';
import type { HouseholdId } from '../kernel/ids.js';
import type { SituationSupportingFactor } from '../situations/situation.js';
import type { NotificationDeliveryReceipt } from './notification-delivery.js';

export type NotificationState =
  | 'pending'
  | 'delivering'
  | 'delivered'
  | 'failed'
  | 'acknowledged'
  | 'expired'
  | 'suppressed';

export interface Notification {
  readonly id: string;
  readonly householdId: HouseholdId;
  readonly outcome: Exclude<DecisionOutcome, 'ignore'>;
  readonly title: string;
  readonly message: string;
  readonly situationType: string;
  readonly supportingFactors: readonly SituationSupportingFactor[];
  readonly state: NotificationState;
  readonly createdAt: Date;
  readonly updatedAt: Date;
  readonly deliveryReceipt?: NotificationDeliveryReceipt;
}
