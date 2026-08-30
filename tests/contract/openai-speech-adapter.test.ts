import { describe, expect, it } from 'vitest';
import {
  OpenAiSpeechAdapter,
  type OpenAiSpeechClient,
} from '../../src/voice/openai-speech-adapter.js';

function arrayBufferOf(bytes: readonly number[]): ArrayBuffer {
  return Uint8Array.from(bytes).buffer;
}

describe('OpenAI speech adapter contract', () => {
  it('uses the default transcription model and returns provider text', async () => {
    const transcriptionInputs: unknown[] = [];
    const client: OpenAiSpeechClient = {
      audio: {
        transcriptions: {
          async create(input) {
            transcriptionInputs.push(input);
            return { text: 'καλημέρα' };
          },
        },
        speech: {
          async create() {
            return { arrayBuffer: async () => arrayBufferOf([9]) };
          },
        },
      },
    };
    const adapter = new OpenAiSpeechAdapter(client);

    await expect(
      adapter.transcribe({
        audio: new Uint8Array([1, 2, 3]),
        mimeType: 'audio/webm',
        language: 'el',
      }),
    ).resolves.toEqual({ text: 'καλημέρα' });

    expect(transcriptionInputs).toHaveLength(1);
    expect(transcriptionInputs[0]).toEqual(
      expect.objectContaining({
        model: 'gpt-4o-mini-transcribe',
        language: 'el',
      }),
    );
    const file = (transcriptionInputs[0] as { file: File }).file;
    expect(file).toBeInstanceOf(File);
    expect(file.type).toBe('audio/webm');
    await expect(file.arrayBuffer()).resolves.toEqual(arrayBufferOf([1, 2, 3]));
  });

  it('uses the default TTS model and marin voice and returns audio bytes', async () => {
    const speechInputs: unknown[] = [];
    const client: OpenAiSpeechClient = {
      audio: {
        transcriptions: {
          async create() {
            return { text: 'unused' };
          },
        },
        speech: {
          async create(input) {
            speechInputs.push(input);
            return { arrayBuffer: async () => arrayBufferOf([4, 5, 6]) };
          },
        },
      },
    };
    const adapter = new OpenAiSpeechAdapter(client);

    const result = await adapter.synthesize({ text: 'Καλημέρα Βασίλη', language: 'el' });

    expect(speechInputs).toEqual([
      {
        model: 'gpt-4o-mini-tts',
        voice: 'marin',
        input: 'Καλημέρα Βασίλη',
        response_format: 'mp3',
      },
    ]);
    expect(result.mimeType).toBe('audio/mpeg');
    expect(result.audio).toEqual(new Uint8Array([4, 5, 6]));
  });

  it('supports explicit model and voice overrides without changing the ports', async () => {
    const speechInputs: unknown[] = [];
    const client: OpenAiSpeechClient = {
      audio: {
        transcriptions: {
          async create(input) {
            return { text: String((input as { model: string }).model) };
          },
        },
        speech: {
          async create(input) {
            speechInputs.push(input);
            return { arrayBuffer: async () => arrayBufferOf([7]) };
          },
        },
      },
    };
    const adapter = new OpenAiSpeechAdapter(client, {
      transcribeModel: 'custom-transcribe',
      ttsModel: 'custom-tts',
      voice: 'cedar',
    });

    await expect(
      adapter.transcribe({ audio: new Uint8Array([1]), mimeType: 'audio/wav' }),
    ).resolves.toEqual({ text: 'custom-transcribe' });
    await adapter.synthesize({ text: 'hello', language: 'en' });
    expect(speechInputs[0]).toEqual(
      expect.objectContaining({ model: 'custom-tts', voice: 'cedar' }),
    );
  });
});
