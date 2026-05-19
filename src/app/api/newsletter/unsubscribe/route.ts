import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { rateLimit } from '@/lib/rateLimit'
import { validateData } from '@/lib/validate'
import { newsletterSchema } from '@/lib/validators'
import { apiError, logRouteError } from '@/lib/apiError'
import Newsletter from '@/models/Newsletter'
import { verifyUnsubscribeToken } from '@/lib/unsubscribeToken'

async function deactivate(email: string) {
  const subscriber = await Newsletter.findOne({ email })
  if (!subscriber || !subscriber.active) {
    return { ok: true, alreadyOff: true }
  }
  subscriber.active = false
  await subscriber.save()
  return { ok: true, alreadyOff: false }
}

/* ─────────────────────────────────────────────────────────────
 * POST /api/newsletter/unsubscribe
 * Body: { email }
 * Used by the in-app unsubscribe form and RFC 8058 one-click clients.
 * ───────────────────────────────────────────────────────────── */
export async function POST(req: NextRequest) {
  const limited = await rateLimit(req)
  if (limited) return limited

  try {
    /**
     * Email may arrive three ways:
     *   1. RFC 8058 one-click clients POST form-encoded with the signed token
     *      already in the query string from the List-Unsubscribe header.
     *   2. The in-app form sends JSON `{ email }`.
     *   3. Legacy form posts send `application/x-www-form-urlencoded` email.
     */
    const tokenParam = req.nextUrl.searchParams.get('token')
    if (tokenParam) {
      const verified = verifyUnsubscribeToken(tokenParam)
      if (!verified) return apiError(400, { error: 'Invalid token' })
      await connectDB()
      const result = await deactivate(verified)
      return NextResponse.json({
        success: true,
        message: result.alreadyOff
          ? 'Email not found or already unsubscribed'
          : 'Unsubscribed successfully',
      })
    }

    let email: string | undefined
    const ctype = req.headers.get('content-type') ?? ''
    if (ctype.includes('application/json')) {
      const body = await req.json().catch(() => null)
      if (!body) return apiError(400, { error: 'Invalid JSON body' })
      const validation = validateData(newsletterSchema, body)
      if (!validation.success) return validation.response
      email = validation.data.email
    } else {
      const form = await req.formData().catch(() => null)
      const raw = form?.get('email')
      if (typeof raw !== 'string') return apiError(400, { error: 'Missing email' })
      const validation = validateData(newsletterSchema, { email: raw })
      if (!validation.success) return validation.response
      email = validation.data.email
    }

    await connectDB()
    const result = await deactivate(email!)
    return NextResponse.json({
      success: true,
      message: result.alreadyOff
        ? 'Email not found or already unsubscribed'
        : 'Unsubscribed successfully',
    })
  } catch (err) {
    logRouteError('POST /api/newsletter/unsubscribe', err)
    return apiError(500, { error: 'Internal server error' })
  }
}

/* ─────────────────────────────────────────────────────────────
 * GET /api/newsletter/unsubscribe?email=...
 * Direct link target from campaign emails. Returns a tiny branded page
 * confirming the unsubscribe, so admins/users can verify it worked.
 * ───────────────────────────────────────────────────────────── */
export async function GET(req: NextRequest) {
  const limited = await rateLimit(req)
  if (limited) return limited

  /**
   * The link in campaign emails uses a signed `?token=` so only the original
   * recipient can act on it. We keep a legacy `?email=` fallback in case any
   * old emails still link by plain address — that path still validates the
   * email format but is no longer minted by new campaigns.
   */
  const token = req.nextUrl.searchParams.get('token')
  const emailParam = req.nextUrl.searchParams.get('email')

  let email: string | null = null
  if (token) {
    email = verifyUnsubscribeToken(token)
    if (!email) {
      return new NextResponse(
        renderPage({
          ok: false,
          message: 'This unsubscribe link is invalid or has expired.',
        }),
        { headers: { 'content-type': 'text/html; charset=utf-8' }, status: 400 },
      )
    }
  } else if (emailParam) {
    const validation = validateData(newsletterSchema, { email: emailParam })
    if (!validation.success) {
      return new NextResponse(renderPage({ ok: false, message: 'Invalid email address.' }), {
        headers: { 'content-type': 'text/html; charset=utf-8' },
        status: 400,
      })
    }
    email = validation.data.email
  } else {
    return new NextResponse(
      renderPage({ ok: false, message: 'Missing unsubscribe token.' }),
      { headers: { 'content-type': 'text/html; charset=utf-8' }, status: 400 },
    )
  }

  try {
    await connectDB()
    const result = await deactivate(email)
    return new NextResponse(
      renderPage({
        ok: true,
        message: result.alreadyOff
          ? 'You are not subscribed to our list — nothing to do.'
          : 'You have been unsubscribed. We are sorry to see you go.',
      }),
      { headers: { 'content-type': 'text/html; charset=utf-8' } },
    )
  } catch (err) {
    logRouteError('GET /api/newsletter/unsubscribe', err)
    return new NextResponse(
      renderPage({ ok: false, message: 'Something went wrong. Please try again.' }),
      { headers: { 'content-type': 'text/html; charset=utf-8' }, status: 500 },
    )
  }
}

function renderPage({ ok, message }: { ok: boolean; message: string }) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>Unsubscribe — Inscentives</title>
</head>
<body style="margin:0;padding:0;background:#FDF9F3;font-family:Georgia,serif;color:#1A1A1A;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
    <tr><td align="center" style="padding:64px 16px;">
      <table role="presentation" width="500" cellpadding="0" cellspacing="0" style="background:#fff;border:1px solid #E8DCCF;border-radius:8px;">
        <tr><td style="padding:40px;text-align:center;">
          <div style="font-size:24px;font-weight:600;letter-spacing:2px;color:#8C6F48;text-transform:uppercase;margin-bottom:12px;">Inscentives</div>
          <div style="height:1px;width:48px;background:#C4A882;margin:0 auto 32px;"></div>
          <h1 style="margin:0 0 8px;font-size:18px;color:#1A1A1A;">${ok ? 'Unsubscribed' : 'Cannot unsubscribe'}</h1>
          <p style="margin:0;color:#5E5E5E;font-size:14px;line-height:1.6;">${message}</p>
          <p style="margin:32px 0 0;">
            <a href="/" style="display:inline-block;background:#1A1A1A;color:#fff;padding:12px 24px;text-decoration:none;font-size:12px;letter-spacing:1.5px;text-transform:uppercase;">
              Back to site
            </a>
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
}
