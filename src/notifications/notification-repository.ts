import type { Notification } from './notification.js';

export interface NotificationRepository {
  save(notification: Notification): Promise<void>;
  get(id: string): Promise<Notification | null>;
}
