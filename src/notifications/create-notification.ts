import { randomUUID } from 'node:crypto';
import type { DecisionOutcome } from '../decisions/decide-situation.js';
import type { Clock } from '../kernel/clock.js';
import type { HouseholdId } from '../kernel/ids.js';
import type { SituationSupportingFactor } from '../situations/situation.js';
import type { NotificationDelivery } from './notification-delivery.js';
import type { Notification } from './notification.js';
import type { NotificationRepository } from './notification-repository.js';

export interface CreateNotificationInput {
  readonly householdId: HouseholdId;
  readonly outcome: Exclude<DecisionOutcome, 'ignore'>;
  readonly title: string;
  readonly message: string;
  readonly situationType: string;
  readonly supportingFactors: readonly SituationSupportingFactor[];
  readonly correlationId?: string;
}

export interface CreateNotificationDependencies {
  readonly repository: NotificationRepository;
  readonly delivery: NotificationDelivery;
  readonly clock: Clock;
}

export async function createNotification(
  input: CreateNotificationInput,
  dependencies: CreateNotificationDependencies,
): Promise<Notification> {
  const createdAt = dependencies.clock.now();
  const pending: Notification = {
    id: randomUUID(),
    householdId: input.householdId,
    outcome: input.outcome,
    title: input.title,
    message: input.message,
    situationType: input.situationType,
    supportingFactors: input.supportingFactors,
    state: 'pending',
    createdAt,
    updatedAt: createdAt,
    ...(input.correlationId === undefined ? {} : { correlationId: input.correlationId }),
  };
  await dependencies.repository.save(pending);

  const delivering: Notification = {
    ...pending,
    state: 'delivering',
    updatedAt: dependencies.clock.now(),
  };
  await dependencies.repository.save(delivering);

  try {
    const deliveryReceipt = await dependencies.delivery.send(delivering);
    const delivered: Notification = {
      ...delivering,
      state: 'delivered',
      deliveryReceipt,
      updatedAt: dependencies.clock.now(),
    };
    await dependencies.repository.save(delivered);
    return delivered;
  } catch {
    const failed: Notification = {
      ...delivering,
      state: 'failed',
      updatedAt: dependencies.clock.now(),
    };
    await dependencies.repository.save(failed);
    return failed;
  }
}
