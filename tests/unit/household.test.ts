import { describe, expect, it } from 'vitest';
import { createHousehold } from '../../src/household/household.js';
import type { HouseholdRepository } from '../../src/household/household-repository.js';
import { createPerson } from '../../src/household/person.js';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

describe('household domain', () => {
  it('rejects a household without timezone', () => {
    expect(() => createHousehold({ name: 'Home', timezone: '', locale: 'el-CY' })).toThrow(
      'timezone',
    );
  });

  it('creates an active household with normalized name and UUID id', () => {
    const household = createHousehold({
      name: '  AGNES Home  ',
      timezone: 'Asia/Nicosia',
      locale: 'el-CY',
    });

    expect(household.id).toMatch(UUID_PATTERN);
    expect(household.name).toBe('AGNES Home');
    expect(household.timezone).toBe('Asia/Nicosia');
    expect(household.locale).toBe('el-CY');
    expect(household.status).toBe('active');
  });

  it('creates a normalized person belonging to the household', () => {
    const household = createHousehold({
      name: 'Home',
      timezone: 'Asia/Nicosia',
      locale: 'el-CY',
    });

    const person = createPerson({
      householdId: household.id,
      displayName: '  Alex  ',
      role: 'adult',
      locale: 'el-CY',
      timezone: 'Asia/Nicosia',
    });

    expect(person.id).toMatch(UUID_PATTERN);
    expect(person.householdId).toBe(household.id);
    expect(person.displayName).toBe('Alex');
    expect(person.role).toBe('adult');
    expect(person.status).toBe('active');
  });

  it('rejects an empty person display name', () => {
    const household = createHousehold({
      name: 'Home',
      timezone: 'Asia/Nicosia',
      locale: 'el-CY',
    });

    expect(() =>
      createPerson({
        householdId: household.id,
        displayName: '   ',
        role: 'adult',
        locale: 'el-CY',
        timezone: 'Asia/Nicosia',
      }),
    ).toThrow('displayName');
  });

  it('defines the persistence boundary without prescribing an adapter', () => {
    const repository: HouseholdRepository = {
      async saveHousehold() {},
      async savePerson() {},
      async getHousehold() {
        return null;
      },
      async listPeople() {
        return [];
      },
    };

    expect(repository).toHaveProperty('saveHousehold');
    expect(repository).toHaveProperty('savePerson');
    expect(repository).toHaveProperty('getHousehold');
    expect(repository).toHaveProperty('listPeople');
  });
});
