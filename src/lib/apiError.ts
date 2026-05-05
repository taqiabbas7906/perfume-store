import { NextResponse } from 'next/server'
import { logger } from './logger'

/**
 * A tiny error-response helper so every controller has a uniform shape.
 *
 *   { error, code?, details? }
 *
 * The `code` field is for client logic (e.g. `OUT_OF_STOCK`,
 * `IDEMPOTENCY_CONFLICT`). The `details` is opaque per route.
 */

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

export function logRouteError(route: string, err: unknown, ctx?: object) {
  const error = err instanceof Error ? err : new Error(String(err))
  logger.error(
    { err: error.message, stack: error.stack, route, ...ctx },
    `${route} failed`
  )
}