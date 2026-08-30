export interface SpeechToTextInput {
  readonly audio: Uint8Array;
  readonly mimeType: string;
  readonly language?: string;
}

export interface SpeechToTextResult {
  readonly text: string;
}

export interface SpeechToTextPort {
  transcribe(input: SpeechToTextInput): Promise<SpeechToTextResult>;
}
