export class AgnesError extends Error {
  constructor(
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = new.target.name;
  }
}

export class ValidationError extends AgnesError {
  constructor(message: string) {
    super('VALIDATION_ERROR', message);
  }
}

export class NotFoundError extends AgnesError {
  constructor(message: string) {
    super('NOT_FOUND', message);
  }
}

export class ConflictError extends AgnesError {
  constructor(message: string) {
    super('CONFLICT', message);
  }
}
