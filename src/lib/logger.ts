import pino from 'pino'

export const logger = pino({
  level: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),
  base: {
    env: process.env.NODE_ENV,
    service: process.env.SERVICE_NAME ?? 'perfume-store',
    version: process.env.npm_package_version,
  },
  redact: {
    paths: [
      'password',
      'currentPassword',
      'newPassword',
      'token',
      'idToken',
      'accessToken',
      'refreshToken',
      'authorization',
      'cardNonce',
      'sourceId',
      'verificationToken',
      '*.password',
      '*.token',
      '*.authorization',
      'headers.authorization',
      'headers.cookie',
      'headers["x-square-hmacsha256-signature"]',
    ],
    censor: '[REDACTED]',
  },
  customLevels: {
    security: 35,
  },
  formatters: {
    level: (label) => ({ level: label }),
  },
  timestamp: pino.stdTimeFunctions.isoTime,
})

export type Logger = typeof logger