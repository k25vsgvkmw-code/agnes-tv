import { ValidationError } from '../kernel/errors.js';
import type { HouseholdId, NotificationId } from '../kernel/ids.js';
import type { NotificationDeliveryReceipt } from './notification-delivery.js';

export type NotificationState =
  | 'pending'
  | 'delivering'
  | 'delivered'
  | 'failed'
  | 'acknowledged'
  | 'expired'
  | 'suppressed';

export type NotificationPriority = 'low' | 'normal' | 'high' | 'urgent';

export interface Notification {
  readonly id: NotificationId;
  readonly householdId: HouseholdId;
  readonly title: string;
  readonly message: string;
  readonly priority: NotificationPriority;
  readonly supportingFactors: Readonly<Record<string, unknown>>;
  readonly correlationId?: string;
  readonly state: NotificationState;
  readonly createdAt: Date;
  readonly updatedAt: Date;
  readonly deliveredAt?: Date;
  readonly acknowledgedAt?: Date;
  readonly failedAt?: Date;
  readonly deliveryReceipt?: NotificationDeliveryReceipt;
  readonly failureCode?: string;
}

export interface NotificationCandidate {
  readonly id: NotificationId;
  readonly householdId: HouseholdId;
  readonly title: string;
  readonly message: string;
  readonly priority: NotificationPriority;
  readonly supportingFactors: Readonly<Record<string, unknown>>;
  readonly correlationId?: string;
}

export function createPendingNotification(
  candidate: NotificationCandidate,
  createdAt: Date,
): Notification {
  const title = candidate.title.trim();
  const message = candidate.message.trim();

  if (!title) throw new ValidationError('notification title is required');
  if (!message) throw new ValidationError('notification message is required');
  if (!(createdAt instanceof Date) || Number.isNaN(createdAt.getTime())) {
    throw new ValidationError('notification createdAt must be a valid date');
  }

  return {
    id: candidate.id,
    householdId: candidate.householdId,
    title,
    message,
    priority: candidate.priority,
    supportingFactors: { ...candidate.supportingFactors },
    state: 'pending',
    createdAt: new Date(createdAt),
    updatedAt: new Date(createdAt),
    ...(candidate.correlationId === undefined ? {} : { correlationId: candidate.correlationId }),
  };
}
