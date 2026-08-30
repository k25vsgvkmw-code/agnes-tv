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

export interface OpenAiTranscriptionInput {
  readonly model: string;
  readonly file: File;
  readonly language?: string;
}

export interface OpenAiSpeechCreateInput {
  readonly model: string;
  readonly voice: string;
  readonly input: string;
  readonly response_format: 'mp3';
}

export interface OpenAiSpeechClient {
  readonly audio: {
    readonly transcriptions: {
      create(input: OpenAiTranscriptionInput): Promise<{ readonly text: string }>;
    };
    readonly speech: {
      create(input: OpenAiSpeechCreateInput): Promise<{ arrayBuffer(): Promise<ArrayBuffer> }>;
    };
  };
}

export interface OpenAiSpeechAdapterConfig {
  readonly transcribeModel?: string;
  readonly ttsModel?: string;
  readonly voice?: string;
}

const DEFAULT_TRANSCRIBE_MODEL = 'gpt-4o-mini-transcribe';
const DEFAULT_TTS_MODEL = 'gpt-4o-mini-tts';
const DEFAULT_TTS_VOICE = 'marin';

export class OpenAiSpeechAdapter implements SpeechToTextPort, TextToSpeechPort {
  private readonly transcribeModel: string;
  private readonly ttsModel: string;
  private readonly voice: string;

  constructor(
    private readonly client: OpenAiSpeechClient,
    config: OpenAiSpeechAdapterConfig = {},
  ) {
    this.transcribeModel = config.transcribeModel ?? DEFAULT_TRANSCRIBE_MODEL;
    this.ttsModel = config.ttsModel ?? DEFAULT_TTS_MODEL;
    this.voice = config.voice ?? DEFAULT_TTS_VOICE;
  }

  async transcribe(input: SpeechToTextInput): Promise<SpeechToTextResult> {
    const audio = Uint8Array.from(input.audio);
    const file = new File([audio.buffer], 'audio', { type: input.mimeType });
    const result = await this.client.audio.transcriptions.create({
      model: this.transcribeModel,
      file,
      ...(input.language === undefined ? {} : { language: input.language }),
    });
    return { text: result.text };
  }

  async synthesize(input: TextToSpeechInput): Promise<TextToSpeechResult> {
    const response = await this.client.audio.speech.create({
      model: this.ttsModel,
      voice: this.voice,
      input: input.text,
      response_format: 'mp3',
    });
    const audio = new Uint8Array(await response.arrayBuffer());
    return {
      audio,
      mimeType: 'audio/mpeg',
    };
  }
}
