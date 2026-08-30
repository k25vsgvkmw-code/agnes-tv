import { describe, expect, it } from 'vitest';
import type { CalendarRepository } from '../../src/calendar/calendar-repository.js';
import { newHouseholdId } from '../../src/kernel/ids.js';
import { normalizeCalendarRecord } from '../../src/integrations/calendar/calendar-normalizer.js';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

describe('calendar normalization', () => {
  it('normalizes provider data into a canonical authoritative calendar event', () => {
    const householdId = newHouseholdId();
    const lastSyncedAt = new Date('2026-08-30T08:00:00Z');

    const result = normalizeCalendarRecord(
      {
        provider: 'test-calendar',
        externalId: 'evt-1',
        title: '  Football  ',
        startsAt: '2026-09-01T18:30:00+03:00',
        endsAt: '2026-09-01T19:30:00+03:00',
        timezone: 'Asia/Nicosia',
        version: '7',
      },
      { householdId, lastSyncedAt },
    );

    expect(result.id).toMatch(UUID_PATTERN);
    expect(result.householdId).toBe(householdId);
    expect(result.title).toBe('Football');
    expect(result.startsAt.toISOString()).toBe('2026-09-01T15:30:00.000Z');
    expect(result.endsAt.toISOString()).toBe('2026-09-01T16:30:00.000Z');
    expect(result.externalReference.provider).toBe('test-calendar');
    expect(result.externalReference.externalId).toBe('evt-1');
    expect(result.externalReference.externalVersion).toBe('7');
    expect(result.externalReference.authoritative).toBe(true);
    expect(result.externalReference.lastSyncedAt).toEqual(lastSyncedAt);
  });

  it('rejects a calendar record whose end is not after its start', () => {
    expect(() =>
      normalizeCalendarRecord(
        {
          provider: 'test-calendar',
          externalId: 'evt-invalid',
          title: 'Invalid event',
          startsAt: '2026-09-01T18:30:00+03:00',
          endsAt: '2026-09-01T18:00:00+03:00',
          timezone: 'Asia/Nicosia',
        },
        { householdId: newHouseholdId(), lastSyncedAt: new Date('2026-08-30T08:00:00Z') },
      ),
    ).toThrow('endsAt');
  });

  it('defines the canonical calendar persistence boundary', () => {
    const repository: CalendarRepository = {
      async upsertByExternalReference(event) {
        return { event, change: 'created' };
      },
      async listUpcoming() {
        return [];
      },
      async getById() {
        return null;
      },
    };

    expect(repository).toHaveProperty('upsertByExternalReference');
    expect(repository).toHaveProperty('listUpcoming');
    expect(repository).toHaveProperty('getById');
  });
});
