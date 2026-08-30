import { randomUUID } from 'node:crypto';
import type { AuditRepository } from '../audit/audit-repository.js';
import type { Clock } from '../kernel/clock.js';
import type { Notification } from './notification.js';
import type { NotificationRepository } from './notification-repository.js';

export interface AcknowledgeNotificationDependencies {
  readonly repository: NotificationRepository;
  readonly auditRepository: AuditRepository;
  readonly clock: Clock;
}

export async function acknowledgeNotification(
  id: string,
  dependencies: AcknowledgeNotificationDependencies,
): Promise<Notification> {
  const notification = await dependencies.repository.get(id);
  if (notification === null) {
    throw new Error('notification not found');
  }
  if (notification.state !== 'delivered') {
    throw new Error('notification must be delivered before acknowledgement');
  }

  const acknowledged: Notification = {
    ...notification,
    state: 'acknowledged',
    updatedAt: dependencies.clock.now(),
  };
  await dependencies.repository.save(acknowledged);
  await dependencies.auditRepository.append({
    id: randomUUID(),
    action: 'notification.acknowledged',
    entityType: 'notification',
    entityId: notification.id,
    householdId: notification.householdId,
    occurredAt: dependencies.clock.now(),
    metadata: {},
  });

  return acknowledged;
}
