import type { Notification } from './notification.js';

export interface NotificationDeliveryReceipt {
  readonly provider: string;
  readonly receiptId: string;
}

export interface NotificationDelivery {
  send(notification: Notification): Promise<NotificationDeliveryReceipt>;
}
