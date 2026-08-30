import { describe, expect, it, vi } from 'vitest';
import { InMemoryDomainEventBus } from '../../src/events/domain-event-bus.js';
import { createAgnesEvent } from '../../src/events/agnes-event.js';
import { newHouseholdId } from '../../src/kernel/ids.js';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

describe('AGNES domain events', () => {
  it('creates a versioned traceable event envelope with defensive timestamps', () => {
    const occurredAt = new Date('2026-09-01T15:30:00Z');
    const receivedAt = new Date('2026-09-01T15:30:01Z');
    const event = createAgnesEvent({
      type: 'calendar.event.created.v1',
      version: 1,
      occurredAt,
      receivedAt,
      source: 'test-calendar',
      householdId: newHouseholdId(),
      correlationId: 'flow-1',
      payload: { externalId: 'evt-1' },
      metadata: { authoritative: true },
    });

    occurredAt.setUTCFullYear(2030);
    receivedAt.setUTCFullYear(2030);

    expect(event.id).toMatch(UUID_PATTERN);
    expect(event.type).toBe('calendar.event.created.v1');
    expect(event.version).toBe(1);
    expect(event.occurredAt.toISOString()).toBe('2026-09-01T15:30:00.000Z');
    expect(event.receivedAt.toISOString()).toBe('2026-09-01T15:30:01.000Z');
    expect(event.correlationId).toBe('flow-1');
    expect(event.payload).toEqual({ externalId: 'evt-1' });
  });
});

describe('in-memory domain event bus', () => {
  it('delivers an event to matching subscribers exactly once per publish call', async () => {
    const bus = new InMemoryDomainEventBus();
    const matching = vi.fn(async () => undefined);
    const unrelated = vi.fn(async () => undefined);
    bus.subscribe('calendar.event.created.v1', matching);
    bus.subscribe('weather.rain_expected.v1', unrelated);

    const event = createAgnesEvent({
      type: 'calendar.event.created.v1',
      version: 1,
      occurredAt: new Date('2026-09-01T15:30:00Z'),
      receivedAt: new Date('2026-09-01T15:30:01Z'),
      source: 'test-calendar',
      householdId: newHouseholdId(),
      payload: {},
      metadata: {},
    });

    await bus.publish(event);

    expect(matching).toHaveBeenCalledTimes(1);
    expect(matching).toHaveBeenCalledWith(event);
    expect(unrelated).not.toHaveBeenCalled();
  });

  it('waits for asynchronous subscribers before publish resolves', async () => {
    const bus = new InMemoryDomainEventBus();
    let handled = false;
    bus.subscribe('task.overdue.v1', async () => {
      await Promise.resolve();
      handled = true;
    });

    await bus.publish(
      createAgnesEvent({
        type: 'task.overdue.v1',
        version: 1,
        occurredAt: new Date('2026-09-01T15:30:00Z'),
        receivedAt: new Date('2026-09-01T15:30:01Z'),
        source: 'agnes-core',
        householdId: newHouseholdId(),
        payload: {},
        metadata: {},
      }),
    );

    expect(handled).toBe(true);
  });
});
