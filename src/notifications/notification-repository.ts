import type { NotificationId } from '../kernel/ids.js';
import type { Notification } from './notification.js';

export interface NotificationRepository {
  get(id: NotificationId): Promise<Notification | null>;
  save(notification: Notification): Promise<void>;
}

function cloneNotification(notification: Notification): Notification {
  return {
    ...notification,
    supportingFactors: { ...notification.supportingFactors },
    createdAt: new Date(notification.createdAt),
    updatedAt: new Date(notification.updatedAt),
    ...(notification.deliveredAt === undefined
      ? {}
      : { deliveredAt: new Date(notification.deliveredAt) }),
    ...(notification.acknowledgedAt === undefined
      ? {}
      : { acknowledgedAt: new Date(notification.acknowledgedAt) }),
    ...(notification.failedAt === undefined ? {} : { failedAt: new Date(notification.failedAt) }),
    ...(notification.deliveryReceipt === undefined
      ? {}
      : {
          deliveryReceipt: {
            ...notification.deliveryReceipt,
            deliveredAt: new Date(notification.deliveryReceipt.deliveredAt),
          },
        }),
  };
}

export class InMemoryNotificationRepository implements NotificationRepository {
  readonly #notifications = new Map<NotificationId, Notification>();

  async get(id: NotificationId): Promise<Notification | null> {
    const notification = this.#notifications.get(id);
    return notification === undefined ? null : cloneNotification(notification);
  }

  async save(notification: Notification): Promise<void> {
    this.#notifications.set(notification.id, cloneNotification(notification));
  }
}
