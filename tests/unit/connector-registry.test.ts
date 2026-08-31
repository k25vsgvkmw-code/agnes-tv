import { expect, it } from 'vitest';
import { ConnectorRegistry } from '../../src/integrations/connector-registry.js';
import { FakeCalendarConnector } from '../../src/integrations/calendar/fake-calendar-connector.js';

it('reports capabilities and health for a registered connector', async () => {
  const registry = new ConnectorRegistry();
  const connector = new FakeCalendarConnector('test-calendar', []);

  await connector.connect();
  registry.register(connector);

  expect(registry.get('test-calendar')?.capabilities()).toMatchObject({ read: true, write: false });
  expect((await registry.health('test-calendar')).state).toBe('connected');
});

it('returns deterministic records and cursor from the fake calendar connector', async () => {
  const connector = new FakeCalendarConnector('test-calendar', [
    {
      provider: 'test-calendar',
      externalId: 'evt-1',
      title: 'Football',
      startsAt: '2026-09-01T18:30:00+03:00',
      endsAt: '2026-09-01T19:30:00+03:00',
      timezone: 'Asia/Nicosia',
    },
  ]);

  await connector.connect();
  const result = await connector.sync();

  expect(result.records).toHaveLength(1);
  expect(result.records[0]?.externalId).toBe('evt-1');
  expect(result.cursor).toBe('1');
});
