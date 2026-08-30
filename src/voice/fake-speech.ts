import type {
  SpeechToTextInput,
  SpeechToTextPort,
  SpeechToTextResult,
} from './speech-to-text-port.js';
import type {
  TextToSpeechInput,
  TextToSpeechPort,
  TextToSpeechResult,
} from './text-to-speech-port.js';

export class FakeSpeechToText implements SpeechToTextPort {
  readonly calls: SpeechToTextInput[] = [];

  constructor(private readonly text: string) {}

  async transcribe(input: SpeechToTextInput): Promise<SpeechToTextResult> {
    this.calls.push({
      audio: Uint8Array.from(input.audio),
      mimeType: input.mimeType,
      ...(input.language === undefined ? {} : { language: input.language }),
    });
    return { text: this.text };
  }
}

export class FakeTextToSpeech implements TextToSpeechPort {
  readonly calls: TextToSpeechInput[] = [];

  constructor(
    private readonly audio: Uint8Array = new Uint8Array(),
    private readonly mimeType = 'audio/mpeg',
  ) {}

  async synthesize(input: TextToSpeechInput): Promise<TextToSpeechResult> {
    this.calls.push({ ...input });
    return {
      audio: Uint8Array.from(this.audio),
      mimeType: this.mimeType,
    };
  }
}
