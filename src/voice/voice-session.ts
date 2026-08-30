import type { AuthenticationStrength } from '../authentication/authentication-strength.js';
import { AgnesError } from '../kernel/errors.js';
import type { PersonId } from '../kernel/ids.js';
import type { SpeechToTextPort, SpeechToTextResult } from './speech-to-text-port.js';

export type VoiceSessionState = 'OPEN' | 'ACTIVE' | 'CLOSED';

export interface VoiceAttribution {
  readonly likelyPersonId: PersonId;
  readonly confidence: number;
}

export interface CreateVoiceSessionInput {
  readonly authenticationStrength: AuthenticationStrength;
  readonly openedAt: Date;
  readonly expiresAt: Date;
}

export interface AcceptVoiceAudioInput {
  readonly audio: Uint8Array;
  readonly mimeType: string;
  readonly language?: string;
  readonly now: Date;
  readonly speechToText: SpeechToTextPort;
  readonly likelyPersonId?: PersonId;
  readonly confidence?: number;
}

export class VoiceSession {
  state: VoiceSessionState = 'OPEN';
  latestAttribution: VoiceAttribution | undefined;

  readonly authenticationStrength: AuthenticationStrength;
  readonly openedAt: Date;
  readonly expiresAt: Date;

  constructor(input: CreateVoiceSessionInput) {
    this.authenticationStrength = input.authenticationStrength;
    this.openedAt = new Date(input.openedAt);
    this.expiresAt = new Date(input.expiresAt);
  }

  close(): void {
    this.state = 'CLOSED';
  }

  async acceptAudio(input: AcceptVoiceAudioInput): Promise<SpeechToTextResult> {
    if (this.state === 'CLOSED') {
      throw new AgnesError('VOICE_SESSION_CLOSED', 'Voice session is closed');
    }

    if (input.now.getTime() >= this.expiresAt.getTime()) {
      this.state = 'CLOSED';
      throw new AgnesError('VOICE_SESSION_EXPIRED', 'Voice session has expired');
    }

    const result = await input.speechToText.transcribe({
      audio: input.audio,
      mimeType: input.mimeType,
      ...(input.language === undefined ? {} : { language: input.language }),
    });

    if (input.likelyPersonId !== undefined && input.confidence !== undefined) {
      this.latestAttribution = {
        likelyPersonId: input.likelyPersonId,
        confidence: input.confidence,
      };
    }

    this.state = 'ACTIVE';
    return result;
  }
}

export function createVoiceSession(input: CreateVoiceSessionInput): VoiceSession {
  return new VoiceSession(input);
}
