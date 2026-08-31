import type { Notification } from './notification.js';

export interface NotificationDeliveryReceipt {
  readonly provider: string;
  readonly receiptId: string;
  readonly deliveredAt: Date;
}

export interface NotificationDelivery {
  send(notification: Notification): Promise<NotificationDeliveryReceipt>;
}
