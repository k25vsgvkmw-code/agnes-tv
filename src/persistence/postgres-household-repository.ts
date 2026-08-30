import type { Pool } from 'pg';
import type { HouseholdRepository } from '../household/household-repository.js';
import type { Household } from '../household/household.js';
import type { Person } from '../household/person.js';
import type { HouseholdId, PersonId } from '../kernel/ids.js';

interface HouseholdRow {
  id: string;
  name: string;
  timezone: string;
  locale: string;
  status: Household['status'];
}

interface PersonRow {
  id: string;
  household_id: string;
  display_name: string;
  role: string;
  locale: string;
  timezone: string;
  status: Person['status'];
}

export class PostgresHouseholdRepository implements HouseholdRepository {
  constructor(private readonly pool: Pool) {}

  async saveHousehold(household: Household): Promise<void> {
    await this.pool.query(
      `INSERT INTO households (id, name, timezone, locale, status)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (id) DO UPDATE SET
         name = EXCLUDED.name,
         timezone = EXCLUDED.timezone,
         locale = EXCLUDED.locale,
         status = EXCLUDED.status,
         updated_at = now()`,
      [household.id, household.name, household.timezone, household.locale, household.status],
    );
  }

  async savePerson(person: Person): Promise<void> {
    await this.pool.query(
      `INSERT INTO people (id, household_id, display_name, role, locale, timezone, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (id) DO UPDATE SET
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
    const result = await this.pool.query<HouseholdRow>(
      'SELECT id, name, timezone, locale, status FROM households WHERE id = $1',
      [id],
    );
    const row = result.rows[0];
    return row === undefined
      ? null
      : {
          id: row.id as HouseholdId,
          name: row.name,
          timezone: row.timezone,
          locale: row.locale,
          status: row.status,
        };
  }

  async listPeople(householdId: HouseholdId): Promise<readonly Person[]> {
    const result = await this.pool.query<PersonRow>(
      `SELECT id, household_id, display_name, role, locale, timezone, status
       FROM people WHERE household_id = $1 ORDER BY display_name`,
      [householdId],
    );
    return result.rows.map((row) => ({
      id: row.id as PersonId,
      householdId: row.household_id as HouseholdId,
      displayName: row.display_name,
      role: row.role,
      locale: row.locale,
      timezone: row.timezone,
      status: row.status,
    }));
  }
}
