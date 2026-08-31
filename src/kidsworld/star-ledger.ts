import { ValidationError } from '../kernel/errors.js';
import {
  newStarLedgerEntryId,
  type HouseholdId,
  type PersonId,
  type StarLedgerEntryId,
} from '../kernel/ids.js';

export interface StarLedgerEntry {
  readonly id: StarLedgerEntryId;
  readonly householdId: HouseholdId;
  readonly personId: PersonId;
  readonly amount: number;
  readonly reason: string;
  readonly correlationId: string;
  readonly createdAt: Date;
}

export interface CreateStarLedgerEntryInput {
  readonly householdId: HouseholdId;
  readonly personId: PersonId;
  readonly amount: number;
  readonly reason: string;
  readonly correlationId: string;
  readonly createdAt?: Date;
}

function requireText(value: string, field: string): string {
  const normalized = value.trim();
  if (normalized.length === 0) {
    throw new ValidationError(`star ledger ${field} is required`);
  }
  return normalized;
}

export function createStarLedgerEntry(input: CreateStarLedgerEntryInput): StarLedgerEntry {
  if (!Number.isInteger(input.amount) || input.amount === 0) {
    throw new ValidationError('star ledger amount must be a non-zero integer');
  }

  return {
    id: newStarLedgerEntryId(),
    householdId: input.householdId,
    personId: input.personId,
    amount: input.amount,
    reason: requireText(input.reason, 'reason'),
    correlationId: requireText(input.correlationId, 'correlationId'),
    createdAt: new Date(input.createdAt ?? new Date()),
  };
}
