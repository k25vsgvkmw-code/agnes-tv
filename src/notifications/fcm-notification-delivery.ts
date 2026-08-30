import type { NotificationDelivery, NotificationDeliveryReceipt } from './notification-delivery.js';
import type { Notification } from './notification.js';

export interface FcmSender {
  send(message: unknown): Promise<string>;
}

export interface FcmNotificationDeliveryConfig {
  readonly sender: FcmSender;
  readonly targetToken: string;
}

export class FcmNotificationDelivery implements NotificationDelivery {
  constructor(private readonly config: FcmNotificationDeliveryConfig) {}

  async send(notification: Notification): Promise<NotificationDeliveryReceipt> {
    const data: Record<string, string> = {
      notificationId: notification.id,
      situationType: notification.situationType,
      ...(notification.correlationId === undefined
        ? {}
        : { correlationId: notification.correlationId }),
    };

    const receiptId = await this.config.sender.send({
      token: this.config.targetToken,
      notification: {
        title: notification.title,
        body: notification.message,
      },
      data,
    });

    return {
      provider: 'fcm',
      receiptId,
    };
  }
}
