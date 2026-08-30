import type { Pool } from 'pg';
import type { HouseholdRepository } from '../household/household-repository.js';
import type { Household, HouseholdStatus } from '../household/household.js';
import type { Person, PersonRole, PersonStatus } from '../household/person.js';
import type { HouseholdId, PersonId } from '../kernel/ids.js';

interface HouseholdRow {
  readonly id: string;
  readonly name: string;
  readonly timezone: string;
  readonly locale: string;
  readonly status: HouseholdStatus;
}

interface PersonRow {
  readonly id: string;
  readonly household_id: string;
  readonly display_name: string;
  readonly role: PersonRole;
  readonly locale: string;
  readonly timezone: string;
  readonly status: PersonStatus;
}

function mapHousehold(row: HouseholdRow): Household {
  return {
    id: row.id as HouseholdId,
    name: row.name,
    timezone: row.timezone,
    locale: row.locale,
    status: row.status,
  };
}

function mapPerson(row: PersonRow): Person {
  return {
    id: row.id as PersonId,
    householdId: row.household_id as HouseholdId,
    displayName: row.display_name,
    role: row.role,
    locale: row.locale,
    timezone: row.timezone,
    status: row.status,
  };
}

export class PostgresHouseholdRepository implements HouseholdRepository {
  constructor(private readonly database: Pool) {}

  async saveHousehold(household: Household): Promise<void> {
    await this.database.query(
      `INSERT INTO households(id, name, timezone, locale, status)
       VALUES($1, $2, $3, $4, $5)
       ON CONFLICT(id) DO UPDATE SET
         name = EXCLUDED.name,
         timezone = EXCLUDED.timezone,
         locale = EXCLUDED.locale,
         status = EXCLUDED.status,
         updated_at = now()`,
      [household.id, household.name, household.timezone, household.locale, household.status],
    );
  }

  async savePerson(person: Person): Promise<void> {
    await this.database.query(
      `INSERT INTO people(id, household_id, display_name, role, locale, timezone, status)
       VALUES($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT(id) DO UPDATE SET
         household_id = EXCLUDED.household_id,
         display_name = EXCLUDED.display_name,
         role = EXCLUDED.role,
         locale = EXCLUDED.locale,
         timezone = EXCLUDED.timezone,
         status = EXCLUDED.status,
         updated_at = now()`,
      [
        person.id,
        person.householdId,
        person.displayName,
        person.role,
        person.locale,
        person.timezone,
        person.status,
      ],
    );
  }

  async getHousehold(id: HouseholdId): Promise<Household | null> {
    const result = await this.database.query<HouseholdRow>(
      `SELECT id, name, timezone, locale, status
       FROM households
       WHERE id = $1`,
      [id],
    );

    const row = result.rows[0];
    return row === undefined ? null : mapHousehold(row);
  }

  async listPeople(householdId: HouseholdId): Promise<readonly Person[]> {
    const result = await this.database.query<PersonRow>(
      `SELECT id, household_id, display_name, role, locale, timezone, status
       FROM people
       WHERE household_id = $1
       ORDER BY display_name, id`,
      [householdId],
    );

    return result.rows.map(mapPerson);
  }
}
