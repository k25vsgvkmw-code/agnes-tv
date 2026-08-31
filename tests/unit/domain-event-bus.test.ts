import { expect, it, vi } from 'vitest';
import { InMemoryDomainEventBus } from '../../src/events/domain-event-bus.js';

it('delivers an event to subscribers exactly once per publish call', async () => {
  const bus = new InMemoryDomainEventBus();
  const handler = vi.fn();
  bus.subscribe('calendar.event.created.v1', handler);

  await bus.publish({ type: 'calendar.event.created.v1' } as never);

  expect(handler).toHaveBeenCalledTimes(1);
});
