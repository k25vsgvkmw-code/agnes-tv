export type AgnesErrorCode =
  | 'validation_error'
  | 'not_found'
  | 'conflict'
  | 'permission_denied'
  | 'integration_error'
  | 'internal_error';

export class AgnesError extends Error {
  constructor(
    message: string,
    public readonly code: AgnesErrorCode,
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = new.target.name;
  }
}

export class ValidationError extends AgnesError {
  constructor(message: string, options?: ErrorOptions) {
    super(message, 'validation_error', options);
  }
}

export class NotFoundError extends AgnesError {
  constructor(message: string, options?: ErrorOptions) {
    super(message, 'not_found', options);
  }
}

export class ConflictError extends AgnesError {
  constructor(message: string, options?: ErrorOptions) {
    super(message, 'conflict', options);
  }
}

export class PermissionDeniedError extends AgnesError {
  constructor(message: string, options?: ErrorOptions) {
    super(message, 'permission_denied', options);
  }
}

export class IntegrationError extends AgnesError {
  constructor(message: string, options?: ErrorOptions) {
    super(message, 'integration_error', options);
  }
}

export class InternalError extends AgnesError {
  constructor(message: string, options?: ErrorOptions) {
    super(message, 'internal_error', options);
  }
}
