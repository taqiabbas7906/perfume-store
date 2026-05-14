import * as Sentry from '@sentry/nextjs'

if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV,
    release: process.env.npm_package_version,
    tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE ?? '0.1'),
    /* Strip query strings from URLs to avoid leaking session cookies / tokens. */
    sendDefaultPii: false,
    beforeSend(event) {
      if (event.request?.url) {
        try {
          const u = new URL(event.request.url)
          u.search = ''
          event.request.url = u.toString()
        } catch { /* ignore */ }
      }
      return event
    },
  })
}
