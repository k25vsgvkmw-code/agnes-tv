import { describe, expect, it } from 'vitest';
import { ConnectorRegistry } from '../../src/integrations/connector-registry.js';
import { FakeCalendarConnector } from '../../src/integrations/calendar/fake-calendar-connector.js';

const record = {
  provider: 'test-calendar',
  externalId: 'evt-1',
  title: 'Football',
  startsAt: '2026-09-01T18:30:00+03:00',
  endsAt: '2026-09-01T19:30:00+03:00',
  timezone: 'Asia/Nicosia',
  version: '1',
} as const;

describe('ConnectorRegistry', () => {
  it('reports capabilities and health for a registered connector', async () => {
    const registry = new ConnectorRegistry();
    const connector = new FakeCalendarConnector([record]);
    registry.register(connector);

    expect(registry.get('test-calendar')?.capabilities()).toMatchObject({
      read: true,
      write: false,
    });
    expect((await registry.health('test-calendar')).state).toBe('connected');
  });

  it('returns deterministic records from the fake calendar connector', async () => {
    const connector = new FakeCalendarConnector([record]);

    await connector.connect();
    const first = await connector.sync();
    const second = await connector.sync();

    expect(first).toEqual(second);
    expect(first.records).toEqual([record]);
  });

  it('rejects duplicate connector ids', () => {
    const registry = new ConnectorRegistry();
    registry.register(new FakeCalendarConnector([]));

    expect(() => registry.register(new FakeCalendarConnector([]))).toThrow('test-calendar');
  });
});
