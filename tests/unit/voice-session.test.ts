import { describe, expect, it } from 'vitest';
import type { AuthenticationStrength } from '../../src/authentication/authentication-strength.js';
import { AgnesError } from '../../src/kernel/errors.js';
import { newPersonId } from '../../src/kernel/ids.js';
import { FakeSpeechToText } from '../../src/voice/fake-speech.js';
import { createVoiceSession } from '../../src/voice/voice-session.js';

async function expectCode(operation: Promise<unknown>, code: string): Promise<void> {
  try {
    await operation;
    throw new Error(`Expected ${code}`);
  } catch (error) {
    expect(error).toBeInstanceOf(AgnesError);
    expect((error as AgnesError).code).toBe(code);
  }
}

describe('Live v2 voice session', () => {
  it('moves OPEN to ACTIVE on first audio and preserves supplied authentication strength', async () => {
    const likelyPersonId = newPersonId();
    const authenticationStrength: AuthenticationStrength = 'DEVICE_TRUSTED';
    const speech = new FakeSpeechToText('πάρε μπουφάν');
    const session = createVoiceSession({
      authenticationStrength,
      openedAt: new Date('2026-09-01T15:00:00Z'),
      expiresAt: new Date('2026-09-01T15:10:00Z'),
    });

    expect(session.state).toBe('OPEN');
    const result = await session.acceptAudio({
      audio: new Uint8Array([1, 2, 3]),
      mimeType: 'audio/webm',
      language: 'el',
      now: new Date('2026-09-01T15:01:00Z'),
      speechToText: speech,
      likelyPersonId,
      confidence: 0.99,
    });

    expect(result).toEqual({ text: 'πάρε μπουφάν' });
    expect(session.state).toBe('ACTIVE');
    expect(session.authenticationStrength).toBe('DEVICE_TRUSTED');
    expect(session.latestAttribution).toEqual({ likelyPersonId, confidence: 0.99 });
    expect(speech.calls).toEqual([
      {
        audio: new Uint8Array([1, 2, 3]),
        mimeType: 'audio/webm',
        language: 'el',
      },
    ]);
  });

  it('rejects audio at or after expiry and closes the session', async () => {
    const speech = new FakeSpeechToText('ignored');
    const session = createVoiceSession({
      authenticationStrength: 'USER_AUTHENTICATED',
      openedAt: new Date('2026-09-01T15:00:00Z'),
      expiresAt: new Date('2026-09-01T15:05:00Z'),
    });

    await expectCode(
      session.acceptAudio({
        audio: new Uint8Array([1]),
        mimeType: 'audio/webm',
        now: new Date('2026-09-01T15:05:00Z'),
        speechToText: speech,
      }),
      'VOICE_SESSION_EXPIRED',
    );
    expect(session.state).toBe('CLOSED');
    expect(speech.calls).toHaveLength(0);
  });

  it('rejects audio after explicit close', async () => {
    const speech = new FakeSpeechToText('ignored');
    const session = createVoiceSession({
      authenticationStrength: 'USER_AUTHENTICATED',
      openedAt: new Date('2026-09-01T15:00:00Z'),
      expiresAt: new Date('2026-09-01T15:10:00Z'),
    });
    session.close();

    await expectCode(
      session.acceptAudio({
        audio: new Uint8Array([1]),
        mimeType: 'audio/webm',
        now: new Date('2026-09-01T15:01:00Z'),
        speechToText: speech,
      }),
      'VOICE_SESSION_CLOSED',
    );
    expect(speech.calls).toHaveLength(0);
  });
});
