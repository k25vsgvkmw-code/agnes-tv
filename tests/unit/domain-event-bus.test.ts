import { expect, it, vi } from 'vitest';
import { InMemoryDomainEventBus } from '../../src/events/domain-event-bus.js';
import type { AgnesEvent } from '../../src/events/agnes-event.js';

it('delivers an event to subscribers exactly once per publish call', async () => {
  const bus = new InMemoryDomainEventBus();
  const handler = vi.fn();
  bus.subscribe('calendar.event.created.v1', handler);

  const event = {
    id: 'event-1',
    type: 'calendar.event.created.v1',
    version: 1,
    occurredAt: new Date('2026-08-30T10:00:00Z'),
    receivedAt: new Date('2026-08-30T10:00:00Z'),
    source: 'test',
    householdId: 'household-1',
    payload: {},
    metadata: {},
  } as unknown as AgnesEvent<Record<string, never>>;

  await bus.publish(event);

  expect(handler).toHaveBeenCalledTimes(1);
  expect(handler).toHaveBeenCalledWith(event);
});
