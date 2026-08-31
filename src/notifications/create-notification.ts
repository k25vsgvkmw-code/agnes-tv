import type { NotificationDelivery } from './notification-delivery.js';
import {
  createPendingNotification,
  type Notification,
  type NotificationCandidate,
} from './notification.js';
import type { NotificationRepository } from './notification-repository.js';

export interface CreateAndDeliverDependencies {
  readonly repository: NotificationRepository;
  readonly delivery: NotificationDelivery;
  readonly now: () => Date;
}

export type CreateAndDeliverResult =
  | { readonly ok: true; readonly notification: Notification }
  | {
      readonly ok: false;
      readonly notification: Notification;
      readonly error: { readonly code: 'DELIVERY_FAILED' };
    };

export async function createAndDeliverNotification(
  candidate: NotificationCandidate,
  dependencies: CreateAndDeliverDependencies,
): Promise<CreateAndDeliverResult> {
  const createdAt = dependencies.now();
  const pending = createPendingNotification(candidate, createdAt);
  const delivering: Notification = {
    ...pending,
    state: 'delivering',
    updatedAt: new Date(createdAt),
  };
  await dependencies.repository.save(delivering);

  try {
    const receipt = await dependencies.delivery.send(delivering.id);
    const delivered: Notification = {
      ...delivering,
      state: 'delivered',
      updatedAt: new Date(receipt.deliveredAt),
      deliveredAt: new Date(receipt.deliveredAt),
      deliveryReceipt: {
        ...receipt,
        deliveredAt: new Date(receipt.deliveredAt),
      },
    };
    await dependencies.repository.save(delivered);
    return { ok: true, notification: delivered };
  } catch {
    const failedAt = dependencies.now();
    const failed: Notification = {
      ...delivering,
      state: 'failed',
      updatedAt: new Date(failedAt),
      failedAt: new Date(failedAt),
      failureCode: 'DELIVERY_FAILED',
    };
    await dependencies.repository.save(failed);
    return {
      ok: false,
      notification: failed,
      error: { code: 'DELIVERY_FAILED' },
    };
  }
}
