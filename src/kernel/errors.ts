export type ErrorDetails = Readonly<Record<string, unknown>>;

export class AgnesError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly details: ErrorDetails = {},
  ) {
    super(message);
    this.name = 'AgnesError';
  }
}

export class ValidationError extends AgnesError {
  constructor(message: string, details: ErrorDetails = {}) {
    super('VALIDATION_ERROR', message, details);
    this.name = 'ValidationError';
  }
}
