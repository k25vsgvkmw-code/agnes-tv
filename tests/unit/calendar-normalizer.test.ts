import { expect, it } from 'vitest';
import { normalizeCalendarRecord } from '../../src/integrations/calendar/calendar-normalizer.js';

it('normalizes provider data into canonical calendar event data', () => {
  const result = normalizeCalendarRecord({
    provider: 'test-calendar',
    externalId: 'evt-1',
    title: 'Football',
    startsAt: '2026-09-01T18:30:00+03:00',
    endsAt: '2026-09-01T19:30:00+03:00',
    timezone: 'Asia/Nicosia',
    version: '7',
  });

  expect(result.title).toBe('Football');
  expect(result.externalReference.externalId).toBe('evt-1');
  expect(result.externalReference.authoritative).toBe(true);
});

it('rejects events whose end is not after the start', () => {
  expect(() =>
    normalizeCalendarRecord({
      provider: 'test-calendar',
      externalId: 'evt-2',
      title: 'Broken event',
      startsAt: '2026-09-01T18:30:00+03:00',
      endsAt: '2026-09-01T18:30:00+03:00',
      timezone: 'Asia/Nicosia',
    }),
  ).toThrow('endsAt');
});
