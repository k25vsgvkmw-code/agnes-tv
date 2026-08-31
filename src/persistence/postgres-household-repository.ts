import type { Pool } from 'pg';
import type { HouseholdRepository } from '../household/household-repository.js';
import type { Household, HouseholdStatus } from '../household/household.js';
import type { Person, PersonStatus } from '../household/person.js';
import type { HouseholdId, PersonId } from '../kernel/ids.js';

interface HouseholdRow {
  id: string;
  name: string;
  timezone: string;
  locale: string;
  home_location_id: string | null;
  status: HouseholdStatus;
  created_at: Date;
  updated_at: Date;
}

interface PersonRow {
  id: string;
  household_id: string;
  display_name: string;
  role: string;
  birth_date: string | null;
  locale: string;
  timezone: string;
  permissions_profile_id: string | null;
  status: PersonStatus;
  created_at: Date;
  updated_at: Date;
}

function toHousehold(row: HouseholdRow): Household {
  return {
    id: row.id as HouseholdId,
    name: row.name,
    timezone: row.timezone,
    locale: row.locale,
    homeLocationId: row.home_location_id,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toPerson(row: PersonRow): Person {
  return {
    id: row.id as PersonId,
    householdId: row.household_id as HouseholdId,
    displayName: row.display_name,
    role: row.role,
    birthDate: row.birth_date,
    locale: row.locale,
    timezone: row.timezone,
    permissionsProfileId: row.permissions_profile_id,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export class PostgresHouseholdRepository implements HouseholdRepository {
  constructor(private readonly db: Pool) {}

  async saveHousehold(household: Household): Promise<void> {
    await this.db.query(
      `insert into households(id,name,timezone,locale,home_location_id,status,created_at,updated_at)
       values($1,$2,$3,$4,$5,$6,$7,$8)
       on conflict(id) do update set
         name = excluded.name,
         timezone = excluded.timezone,
         locale = excluded.locale,
         home_location_id = excluded.home_location_id,
         status = excluded.status,
         updated_at = excluded.updated_at`,
      [
        household.id,
        household.name,
        household.timezone,
        household.locale,
        household.homeLocationId,
        household.status,
        household.createdAt,
        household.updatedAt,
      ],
    );
  }

  async savePerson(person: Person): Promise<void> {
    await this.db.query(
      `insert into people(
         id,household_id,display_name,role,birth_date,locale,timezone,
         permissions_profile_id,status,created_at,updated_at
       ) values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
       on conflict(id) do update set
         household_id = excluded.household_id,
         display_name = excluded.display_name,
         role = excluded.role,
         birth_date = excluded.birth_date,
         locale = excluded.locale,
         timezone = excluded.timezone,
         permissions_profile_id = excluded.permissions_profile_id,
         status = excluded.status,
         updated_at = excluded.updated_at`,
      [
        person.id,
        person.householdId,
        person.displayName,
        person.role,
        person.birthDate,
        person.locale,
        person.timezone,
        person.permissionsProfileId,
        person.status,
        person.createdAt,
        person.updatedAt,
      ],
    );
  }

  async getHousehold(id: HouseholdId): Promise<Household | null> {
    const result = await this.db.query<HouseholdRow>(
      `select id,name,timezone,locale,home_location_id,status,created_at,updated_at
       from households where id = $1`,
      [id],
    );
    const row = result.rows[0];
    return row ? toHousehold(row) : null;
  }

  async listPeople(householdId: HouseholdId): Promise<readonly Person[]> {
    const result = await this.db.query<PersonRow>(
      `select id,household_id,display_name,role,birth_date,locale,timezone,
              permissions_profile_id,status,created_at,updated_at
       from people where household_id = $1 order by created_at, id`,
      [householdId],
    );
    return result.rows.map(toPerson);
  }
}
