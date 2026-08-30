import { describe, expect, it } from 'vitest';
import { ConnectorRegistry } from '../../src/integrations/connector-registry.js';
import { FakeCalendarConnector } from '../../src/integrations/calendar/fake-calendar-connector.js';

describe('ConnectorRegistry', () => {
  it('reports capabilities and health for a registered connector', async () => {
    const registry = new ConnectorRegistry();
    const fakeCalendarConnector = new FakeCalendarConnector('test-calendar', []);

    registry.register(fakeCalendarConnector);

    expect(registry.get('test-calendar')?.capabilities()).toMatchObject({
      read: true,
      write: false,
    });
    expect((await registry.health('test-calendar')).state).toBe('connected');
  });
});
