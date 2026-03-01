export class AppError extends Error {
  constructor(
    public code: string,
    message: string,
    public statusCode: number = 400,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export const Errors = {
  UNAUTHORIZED: new AppError('UNAUTHORIZED', 'Authentication required', 401),
  FORBIDDEN: new AppError('FORBIDDEN', 'Insufficient permissions', 403),
  NOT_FOUND: (entity: string) => new AppError('NOT_FOUND', `${entity} not found`, 404),
  DUPLICATE: (entity: string) => new AppError('DUPLICATE', `${entity} already exists`, 409),
  VALIDATION: (message: string) => new AppError('VALIDATION', message, 400),
  INVALID_CREDENTIALS: new AppError('INVALID_CREDENTIALS', 'Invalid email or password', 401),
  TOKEN_EXPIRED: new AppError('TOKEN_EXPIRED', 'Token expired', 401),
  WS_AUTH_REQUIRED: new AppError('WS_AUTH_REQUIRED', 'WebSocket authentication required', 401),
} as const;
