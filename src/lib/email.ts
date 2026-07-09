import { Resend } from 'resend'
import type { IOrder } from '@/types'

const resend = new Resend(process.env.RESEND_API_KEY)
/**
 * `EMAIL_FROM` should be a verified Resend sender (e.g. `Brand <hello@yourdomain.com>`).
 * Until the user verifies a custom domain, Resend's `onboarding@resend.dev`
 * sender works out of the box — including for the dev account that owns the
 * API key — so the newsletter editor isn't blocked.
 */
const FROM = process.env.EMAIL_FROM ?? 'Inscentives <devlivered@resend.dev>'

/* ─── send helpers ───────────────────────────────── */

export async function sendEmail(
  to: string,
  subject: string,
  html: string,
  options: { headers?: Record<string, string> } = {},
) {
  if (!process.env.RESEND_API_KEY) return
  await resend.emails.send({
    from: FROM,
    to,
    subject,
    html,
    ...(options.headers ? { headers: options.headers } : {}),
  })
}

/**
 * Send the same campaign body to many recipients via Resend's batch endpoint
 * (one HTTP call per chunk of 100). Each recipient is rendered with the same
 * payload — pass `perRecipient` to inject per-email differences (e.g. an
 * unsubscribe link with the recipient's email baked in).
 *
 * Returns `{ sent, failed }` counts so callers can persist real numbers
 * rather than guess.
 */
export async function sendCampaignBatch(args: {
  recipients: string[]
  subject: string
  html: string
  /** Optional per-recipient transform — receives the recipient's email and
   *  returns the final HTML / headers for them. Defaults to the static body. */
  perRecipient?: (email: string) => { html: string; headers?: Record<string, string> }
}): Promise<{ sent: number; failed: number }> {
  if (!process.env.RESEND_API_KEY) {
    return { sent: 0, failed: args.recipients.length }
  }

  const chunkSize = 100
  let sent = 0
  let failed = 0

  for (let i = 0; i < args.recipients.length; i += chunkSize) {
    const chunk = args.recipients.slice(i, i + chunkSize)
    const payload = chunk.map((email) => {
      const custom = args.perRecipient?.(email)
      return {
        from: FROM,
        to: email,
        subject: args.subject,
        html: custom?.html ?? args.html,
        ...(custom?.headers ? { headers: custom.headers } : {}),
      }
    })

    try {
      const result = await resend.batch.send(payload)
      // resend.batch.send returns { data: { data: Email[] }, error } where each
      // entry has an id on success. If the whole call errors, all fail.
      if (result.error) {
        failed += chunk.length
      } else {
        sent += chunk.length
      }
    } catch {
      failed += chunk.length
    }
  }

  return { sent, failed }
}

/* ─── newsletter campaign template ───────────────── */

/**
 * Wrap admin-authored HTML content in a branded campaign shell that includes
 * the preview-text preheader (for inbox snippets), a header, and the legally
 * required unsubscribe footer.
 */
export function buildCampaignEmail(args: {
  previewText: string
  content: string
  unsubscribeUrl: string
  brand?: string
}) {
  const brand = args.brand ?? 'Inscentives'
  const previewText = (args.previewText || '').slice(0, 240)

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
</head>
<body style="margin:0;padding:0;background:#FDF9F3;font-family:Georgia,'Cormorant Garamond',serif;color:#1A1A1A;">
  <!-- Preview text (hidden, shows as inbox snippet) -->
  <div style="display:none;font-size:1px;color:#FDF9F3;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">
    ${previewText}
  </div>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#FDF9F3;">
    <tr><td align="center" style="padding:32px 16px;">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden;border:1px solid #E8DCCF;">
        <!-- Header -->
        <tr><td style="padding:32px 40px;text-align:center;border-bottom:1px solid #F3EDE5;">
          <div style="font-size:22px;font-weight:600;letter-spacing:2px;color:#8C6F48;text-transform:uppercase;">
            ${brand}
          </div>
          <div style="height:1px;width:48px;background:#C4A882;margin:12px auto 0;"></div>
        </td></tr>

        <!-- Body -->
        <tr><td style="padding:32px 40px;font-size:15px;line-height:1.7;color:#353535;">
          ${args.content}
        </td></tr>

        <!-- Footer -->
        <tr><td style="padding:24px 40px;background:#FDF9F3;text-align:center;font-size:12px;color:#818181;border-top:1px solid #F3EDE5;">
          <p style="margin:0 0 8px;">You are receiving this email because you subscribed to ${brand} updates.</p>
          <p style="margin:0;">
            <a href="${args.unsubscribeUrl}" style="color:#A68558;text-decoration:underline;">Unsubscribe</a>
            &nbsp;·&nbsp;
            <span>${brand} — The Art of Fine Fragrance</span>
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
}

/* ─── order confirmation ─────────────────────────── */

export function buildOrderConfirmationEmail(order: IOrder, customerName: string) {
  const itemRows = order.items
    .map(
      (item) => `
      <tr>
        <td style="padding:8px 0;border-bottom:1px solid #f0ece8;">${item.name} — ${item.variantSku}</td>
        <td style="padding:8px 0;border-bottom:1px solid #f0ece8;text-align:center;">${item.quantity}</td>
        <td style="padding:8px 0;border-bottom:1px solid #f0ece8;text-align:right;">$${item.subtotal.toFixed(2)}</td>
      </tr>`
    )
    .join('')

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8" /></head>
<body style="margin:0;padding:0;background:#faf8f5;font-family:Georgia,serif;color:#2d2016;">
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr><td align="center" style="padding:40px 20px;">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:8px;overflow:hidden;">
        <!-- Header -->
        <tr><td style="background:#2d2016;padding:32px 40px;text-align:center;">
          <h1 style="margin:0;color:#f5e6c8;font-size:24px;letter-spacing:2px;">ORDER CONFIRMED</h1>
        </td></tr>
        <!-- Body -->
        <tr><td style="padding:40px;">
          <p style="margin:0 0 8px;">Dear ${customerName},</p>
          <p style="margin:0 0 24px;color:#6b5a4e;">Thank you for your order. We'll let you know when it ships.</p>

          <p style="margin:0 0 4px;font-size:12px;color:#9e8c7e;text-transform:uppercase;letter-spacing:1px;">Order ID</p>
          <p style="margin:0 0 24px;font-family:monospace;font-size:14px;">#${String(order._id).slice(-8).toUpperCase()}</p>

          <!-- Items -->
          <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
            <thead>
              <tr style="border-bottom:2px solid #2d2016;">
                <th style="text-align:left;padding:0 0 8px;font-size:12px;text-transform:uppercase;letter-spacing:1px;">Item</th>
                <th style="text-align:center;padding:0 0 8px;font-size:12px;text-transform:uppercase;letter-spacing:1px;">Qty</th>
                <th style="text-align:right;padding:0 0 8px;font-size:12px;text-transform:uppercase;letter-spacing:1px;">Price</th>
              </tr>
            </thead>
            <tbody>${itemRows}</tbody>
          </table>

          <!-- Totals -->
          <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:32px;">
            ${order.discount > 0 ? `<tr><td style="padding:4px 0;color:#6b5a4e;">Discount</td><td style="text-align:right;color:#6b5a4e;">−$${order.discount.toFixed(2)}</td></tr>` : ''}
            <tr><td style="padding:4px 0;color:#6b5a4e;">Shipping</td><td style="text-align:right;color:#6b5a4e;">${order.shipping === 0 ? 'Free' : '$' + order.shipping.toFixed(2)}</td></tr>
            <tr><td style="padding:8px 0 0;font-weight:bold;font-size:16px;">Total</td><td style="text-align:right;font-weight:bold;font-size:16px;">$${order.totalAmount.toFixed(2)}</td></tr>
          </table>

          <!-- Shipping address -->
          <p style="margin:0 0 4px;font-size:12px;color:#9e8c7e;text-transform:uppercase;letter-spacing:1px;">Ship To</p>
          <p style="margin:0;line-height:1.6;">${order.shippingAddress.name}<br/>
            ${order.shippingAddress.address}<br/>
            ${order.shippingAddress.city}, ${order.shippingAddress.country} ${order.shippingAddress.zip}
          </p>
        </td></tr>
        <!-- Footer -->
        <tr><td style="background:#faf8f5;padding:24px 40px;text-align:center;font-size:12px;color:#9e8c7e;">
          Questions? Reply to this email. We're here to help.
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`

  return { subject: `Order Confirmed — #${String(order._id).slice(-8).toUpperCase()}`, html }
}

/* ─── status update email ────────────────────────── */

const STATUS_COPY: Record<string, { subject: string; headline: string; body: string }> = {
  paid: {
    subject: 'Payment Confirmed',
    headline: 'Payment Received',
    body: 'Great news — your payment has been confirmed and your order is being prepared.',
  },
  shipped: {
    subject: 'Your Order Has Shipped',
    headline: 'On Its Way',
    body: 'Your order is on its way to you.',
  },
  delivered: {
    subject: 'Order Delivered',
    headline: 'Delivered',
    body: 'Your order has been delivered. We hope you love your new fragrance.',
  },
  cancelled: {
    subject: 'Order Cancelled',
    headline: 'Order Cancelled',
    body: 'Your order has been cancelled. If you have questions, please contact us.',
  },
  refunded: {
    subject: 'Refund Processed',
    headline: 'Refund Processed',
    body: 'Your refund has been processed. Please allow 3–5 business days to appear on your statement.',
  },
}

export function buildStatusUpdateEmail(
  order: IOrder,
  customerName: string,
  newStatus: string
) {
  const copy = STATUS_COPY[newStatus]
  if (!copy) return null

  const trackingBlock =
    newStatus === 'shipped' && order.trackingNumber
      ? `<div style="background:#f5e6c8;border-radius:6px;padding:16px 20px;margin:24px 0;">
           <p style="margin:0 0 4px;font-size:12px;color:#9e8c7e;text-transform:uppercase;letter-spacing:1px;">Tracking</p>
           <p style="margin:0;font-weight:bold;">${order.trackingCarrier ?? ''} ${order.trackingNumber}</p>
           ${order.trackingUrl ? `<p style="margin:8px 0 0;"><a href="${order.trackingUrl}" style="color:#2d2016;">Track your package →</a></p>` : ''}
         </div>`
      : ''

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8" /></head>
<body style="margin:0;padding:0;background:#faf8f5;font-family:Georgia,serif;color:#2d2016;">
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr><td align="center" style="padding:40px 20px;">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:8px;overflow:hidden;">
        <tr><td style="background:#2d2016;padding:32px 40px;text-align:center;">
          <h1 style="margin:0;color:#f5e6c8;font-size:24px;letter-spacing:2px;">${copy.headline.toUpperCase()}</h1>
        </td></tr>
        <tr><td style="padding:40px;">
          <p style="margin:0 0 8px;">Dear ${customerName},</p>
          <p style="margin:0 0 24px;color:#6b5a4e;">${copy.body}</p>
          ${trackingBlock}
          <p style="margin:0 0 4px;font-size:12px;color:#9e8c7e;text-transform:uppercase;letter-spacing:1px;">Order ID</p>
          <p style="margin:0;font-family:monospace;font-size:14px;">#${String(order._id).slice(-8).toUpperCase()}</p>
        </td></tr>
        <tr><td style="background:#faf8f5;padding:24px 40px;text-align:center;font-size:12px;color:#9e8c7e;">
          Questions? Reply to this email. We're here to help.
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`

  return { subject: `${copy.subject} — #${String(order._id).slice(-8).toUpperCase()}`, html }
}
