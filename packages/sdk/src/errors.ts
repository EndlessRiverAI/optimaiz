/**
 * Custom error classes for Optimaiz SDK
 */

export class OptimaizError extends Error {
  public status?: number;
  public details?: string;
  public type?: string;

  constructor(message: string, status?: number, details?: string, type?: string) {
    super(message);
    this.name = 'OptimaizError';
    this.status = status;
    this.details = details;
    this.type = type;
  }
}

export class OptimaizAuthenticationError extends OptimaizError {
  constructor(message: string, details?: string) {
    super(message, 401, details, 'AUTHENTICATION_ERROR');
    this.name = 'OptimaizAuthenticationError';
  }
}

export class OptimaizValidationError extends OptimaizError {
  constructor(message: string, details?: string) {
    super(message, 400, details, 'VALIDATION_ERROR');
    this.name = 'OptimaizValidationError';
  }
}

export class OptimaizServerError extends OptimaizError {
  constructor(message: string, details?: string) {
    super(message, 500, details, 'SERVER_ERROR');
    this.name = 'OptimaizServerError';
  }
}

export class OptimaizNetworkError extends OptimaizError {
  constructor(message: string, details?: string) {
    super(message, 0, details, 'NETWORK_ERROR');
    this.name = 'OptimaizNetworkError';
  }
}

/**
 * Error type guards
 */
export function isOptimaizError(error: any): error is OptimaizError {
  return error instanceof OptimaizError;
}

export function isAuthenticationError(error: any): error is OptimaizAuthenticationError {
  return error instanceof OptimaizAuthenticationError || error?.type === 'AUTHENTICATION_ERROR';
}

export function isValidationError(error: any): error is OptimaizValidationError {
  return error instanceof OptimaizValidationError || error?.type === 'VALIDATION_ERROR';
}

export function isServerError(error: any): error is OptimaizServerError {
  return error instanceof OptimaizServerError || error?.type === 'SERVER_ERROR';
}

export function isNetworkError(error: any): error is OptimaizNetworkError {
  return error instanceof OptimaizNetworkError || error?.type === 'NETWORK_ERROR';
}
