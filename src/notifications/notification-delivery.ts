import type { NotificationId } from '../kernel/ids.js';

export interface NotificationDeliveryReceipt {
  readonly provider: string;
  readonly receiptId: string;
  readonly deliveredAt: Date;
}

export interface NotificationDelivery {
  send(notificationId: NotificationId): Promise<NotificationDeliveryReceipt>;
}
