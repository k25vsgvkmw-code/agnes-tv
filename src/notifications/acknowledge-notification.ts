import { randomUUID } from 'node:crypto';
import type { AuditRepository } from '../audit/audit-repository.js';
import { NotFoundError, ValidationError } from '../kernel/errors.js';
import type { NotificationRepository } from './notification-repository.js';

export interface AcknowledgeNotificationDependencies {
  readonly repository: NotificationRepository;
  readonly auditRepository: AuditRepository;
  readonly now: () => Date;
}

export async function acknowledgeNotification(
  id: string,
  dependencies: AcknowledgeNotificationDependencies,
): Promise<void> {
  const notification = await dependencies.repository.get(id);
  if (!notification) {
    throw new NotFoundError('notification not found');
  }
  if (notification.state !== 'delivered') {
    throw new ValidationError('only delivered notifications can be acknowledged');
  }

  const acknowledgedAt = dependencies.now();
  await dependencies.repository.save({
    ...notification,
    state: 'acknowledged',
    updatedAt: acknowledgedAt,
    acknowledgedAt,
  });
  await dependencies.auditRepository.append({
    id: randomUUID(),
    type: 'notification.acknowledged.v1',
    entityType: 'notification',
    entityId: notification.id,
    correlationId: notification.correlationId,
    occurredAt: acknowledgedAt,
    metadata: { notificationType: notification.type },
  });
}
