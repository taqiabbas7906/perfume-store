import pino from 'pino'

export const logger = pino({
  level: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),
  base: {
    env: process.env.NODE_ENV,
  },
  redact: {
    paths: [
      'email',
      'password',
      'currentPassword',
      'newPassword',
      'token',
      'authorization',
      '*.password',
      '*.token',
      '*.authorization',
      'headers.authorization',
      'headers.cookie',
    ],
    censor: '[REDACTED]',
  },
  customLevels: {
    security: 35, // between warn (40) and info (30)
  },
  formatters: {
    level: (label) => ({ level: label }),
  },
  timestamp: pino.stdTimeFunctions.isoTime,
})

export type Logger = typeof logger