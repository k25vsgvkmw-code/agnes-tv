export class AgnesError extends Error {
  constructor(
    readonly code: string,
    message: string,
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = new.target.name;
  }
}

export class ValidationError extends AgnesError {
  constructor(message: string, options?: ErrorOptions) {
    super('VALIDATION_ERROR', message, options);
  }
}

export class NotFoundError extends AgnesError {
  constructor(message: string, options?: ErrorOptions) {
    super('NOT_FOUND', message, options);
  }
}

export class ConflictError extends AgnesError {
  constructor(message: string, options?: ErrorOptions) {
    super('CONFLICT', message, options);
  }
}
