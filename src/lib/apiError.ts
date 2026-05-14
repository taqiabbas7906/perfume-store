import { NextResponse } from 'next/server'
import { logger } from './logger'

export interface ApiErrorBody {
  error: string
  code?: string
  details?: unknown
}

export function apiError(
  status: number,
  body: ApiErrorBody | string
): NextResponse<ApiErrorBody> {
  const payload: ApiErrorBody =
    typeof body === 'string' ? { error: body } : body
  return NextResponse.json(payload, { status })
}

/* Lazy-loaded so Sentry stays a no-op when DSN is unset. */
let sentryCapture: ((err: unknown, ctx?: object) => void) | null = null
async function getSentryCapture() {
  if (sentryCapture !== null) return sentryCapture
  if (!process.env.SENTRY_DSN) { sentryCapture = () => {}; return sentryCapture }
  try {
    const Sentry = await import('@sentry/nextjs')
    sentryCapture = (err, ctx) => {
      Sentry.captureException(err instanceof Error ? err : new Error(String(err)), {
        extra: ctx as Record<string, unknown>,
      })
    }
  } catch {
    sentryCapture = () => {}
  }
  return sentryCapture
}

export function logRouteError(route: string, err: unknown, ctx?: object) {
  let message: string
  let stack: string | undefined

  if (err instanceof Error) {
    message = err.message
    stack   = err.stack
  } else if (err && typeof err === 'object') {
    const o = err as Record<string, unknown>
    message = String(o.message ?? o.error ?? o.msg ?? JSON.stringify(err))
    stack   = typeof o.stack === 'string' ? o.stack : undefined
  } else {
    message = String(err)
  }

  logger.error({ err: message, stack, route, ...ctx }, `${route} failed`)

  if (process.env.SENTRY_DSN) {
    void getSentryCapture().then((fn) => fn(err, { route, ...ctx }))
  }
}