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

export function logRouteError(route: string, err: unknown, ctx?: object) {
  let message: string
  let stack: string | undefined

  if (err instanceof Error) {
    message = err.message
    stack   = err.stack
  } else if (err && typeof err === 'object') {
    // Cloudinary and other SDKs throw plain objects
    const o = err as Record<string, unknown>
    message = String(o.message ?? o.error ?? o.msg ?? JSON.stringify(err))
    stack   = typeof o.stack === 'string' ? o.stack : undefined
  } else {
    message = String(err)
  }

  logger.error(
    { err: message, stack, route, ...ctx },
    `${route} failed`
  )
}