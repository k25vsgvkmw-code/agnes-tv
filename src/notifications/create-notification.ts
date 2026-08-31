import { err, ok, type Result } from '../kernel/result.js';
import type { NotificationDelivery } from './notification-delivery.js';
import type { NotificationRepository } from './notification-repository.js';
import type { Notification, NotificationCandidate } from './notification.js';

export interface CreateNotificationDependencies {
  readonly repository: NotificationRepository;
  readonly delivery: NotificationDelivery;
  readonly now: () => Date;
}

export interface NotificationDeliveryError {
  readonly code: 'DELIVERY_FAILED';
  readonly message: string;
}

export async function createAndDeliverNotification(
  candidate: NotificationCandidate,
  dependencies: CreateNotificationDependencies,
): Promise<Result<Notification, NotificationDeliveryError>> {
  const createdAt = dependencies.now();
  let notification: Notification = {
    ...candidate,
    state: 'pending',
    createdAt,
    updatedAt: createdAt,
    providerReceiptId: null,
    deliveredAt: null,
    acknowledgedAt: null,
    failureReason: null,
  };
  await dependencies.repository.save(notification);

  notification = { ...notification, state: 'delivering', updatedAt: dependencies.now() };
  await dependencies.repository.save(notification);

  try {
    const receipt = await dependencies.delivery.send(notification);
    notification = {
      ...notification,
      state: 'delivered',
      updatedAt: receipt.deliveredAt,
      providerReceiptId: receipt.receiptId,
      deliveredAt: receipt.deliveredAt,
      failureReason: null,
    };
    await dependencies.repository.save(notification);
    return ok(notification);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'notification delivery failed';
    notification = {
      ...notification,
      state: 'failed',
      updatedAt: dependencies.now(),
      failureReason: message,
    };
    await dependencies.repository.save(notification);
    return err({ code: 'DELIVERY_FAILED', message });
  }
}
