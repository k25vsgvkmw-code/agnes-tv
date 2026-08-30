import { AgnesError } from '../kernel/errors.js';
import type { DeviceId, PersonId } from '../kernel/ids.js';

export interface StepUpChallengeInput {
  readonly actionId: string;
  readonly actorId: PersonId;
  readonly deviceId: DeviceId;
  readonly expiresAt: Date;
}

export interface ConsumeStepUpChallengeInput {
  readonly actionId: string;
  readonly actorId: PersonId;
  readonly deviceId: DeviceId;
  readonly now: Date;
}

export class StepUpChallenge {
  public readonly actionId: string;
  public readonly actorId: PersonId;
  public readonly deviceId: DeviceId;
  public readonly expiresAt: Date;
  public used = false;

  constructor(input: StepUpChallengeInput) {
    this.actionId = input.actionId;
    this.actorId = input.actorId;
    this.deviceId = input.deviceId;
    this.expiresAt = new Date(input.expiresAt);
  }

  consume(input: ConsumeStepUpChallengeInput): void {
    if (this.used) {
      throw new AgnesError('STEP_UP_REPLAYED', 'Step-up challenge has already been used');
    }

    if (input.now.getTime() >= this.expiresAt.getTime()) {
      throw new AgnesError('STEP_UP_EXPIRED', 'Step-up challenge has expired');
    }

    if (
      input.actionId !== this.actionId ||
      input.actorId !== this.actorId ||
      input.deviceId !== this.deviceId
    ) {
      throw new AgnesError('STEP_UP_MISMATCH', 'Step-up challenge binding does not match');
    }

    this.used = true;
  }
}

export function createStepUpChallenge(input: StepUpChallengeInput): StepUpChallenge {
  return new StepUpChallenge(input);
}
