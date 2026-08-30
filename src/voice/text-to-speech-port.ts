export interface TextToSpeechInput {
  readonly text: string;
  readonly language: string;
}

export interface TextToSpeechResult {
  readonly audio: Uint8Array;
  readonly mimeType: string;
}

export interface TextToSpeechPort {
  synthesize(input: TextToSpeechInput): Promise<TextToSpeechResult>;
}
