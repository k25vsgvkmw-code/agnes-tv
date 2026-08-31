import type { AuditRepository } from '../audit/audit-record.js';
import { ConflictError, NotFoundError } from '../kernel/errors.js';
import { newAuditRecordId, type NotificationId } from '../kernel/ids.js';
import type { Notification } from './notification.js';
import type { NotificationRepository } from './notification-repository.js';

export interface AcknowledgeNotificationDependencies {
  readonly repository: NotificationRepository;
  readonly auditRepository: AuditRepository;
  readonly now: () => Date;
  readonly actorId?: string;
}

export async function acknowledgeNotification(
  notificationId: NotificationId,
  dependencies: AcknowledgeNotificationDependencies,
): Promise<Notification> {
  const current = await dependencies.repository.get(notificationId);
  if (current === null) throw new NotFoundError('notification not found');
  if (current.state === 'acknowledged') return current;
  if (current.state !== 'delivered') {
    throw new ConflictError(`notification in state ${current.state} cannot be acknowledged`);
  }

  const acknowledgedAt = dependencies.now();
  const acknowledged: Notification = {
    ...current,
    state: 'acknowledged',
    updatedAt: new Date(acknowledgedAt),
    acknowledgedAt: new Date(acknowledgedAt),
  };

  await dependencies.repository.save(acknowledged);
  await dependencies.auditRepository.append({
    id: newAuditRecordId(),
    householdId: acknowledged.householdId,
    action: 'notification.acknowledged',
    outcome: 'success',
    entityType: 'notification',
    entityId: acknowledged.id,
    metadata: { previousState: current.state },
    occurredAt: new Date(acknowledgedAt),
    ...(dependencies.actorId === undefined ? {} : { actorId: dependencies.actorId }),
    ...(acknowledged.correlationId === undefined
      ? {}
      : { correlationId: acknowledged.correlationId }),
  });

  return acknowledged;
}
