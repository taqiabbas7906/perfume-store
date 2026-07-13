import 'server-only'
import { text as readStreamText } from 'node:stream/consumers'
import { createElement } from 'react'
import { prerenderToNodeStream } from 'react-dom/static'
import { Resend } from 'resend'
import type { IOrder } from '@/types'
import NewsletterEmail from '@/components/emails/NewsletterEmail'
import OrderConfirmationEmail from '@/components/emails/OrderConfirmationEmail'
import OrderStatusEmail from '@/components/emails/OrderStatusEmail'

const FROM = process.env.EMAIL_FROM ?? 'Minzoshop <delivered@resend.dev>'
const BRAND = process.env.COMPANY_NAME ?? 'Minzoshop'
const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL ??
  process.env.NEXT_PUBLIC_SITE_URL ??
  'http://localhost:3000'
const SUPPORT_EMAIL = process.env.SUPPORT_EMAIL ?? 'support@Minzoshop.com'
const NEWSLETTER_HERO_IMAGE =
  process.env.NEWSLETTER_HERO_IMAGE_URL ??
  'https://readdy.ai/api/search-image?query=Elegant%20summer%20lifestyle%20scene%20with%20luxury%20perfume%20bottles%20on%20marble%20surface%2C%20soft%20golden%20sunlight%2C%20fresh%20citrus%20and%20white%20flowers%2C%20minimalist%20luxury%20aesthetic%2C%20warm%20cream%20and%20beige%20tones%2C%20editorial%20fragrance%20photography&width=600&height=300&seq=newsletter-hero-summer&orientation=landscape'

function getResend() {
  return process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null
}

/* ─── send helpers ───────────────────────────────── */

export async function sendEmail(
  to: string,
  subject: string,
  html: string,
  options: { headers?: Record<string, string> } = {},
) {
  const resend = getResend()
  if (!resend) return
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
  perRecipient?: (
    email: string,
  ) =>
    | { html: string; headers?: Record<string, string> }
    | Promise<{ html: string; headers?: Record<string, string> }>
}): Promise<{ sent: number; failed: number }> {
  const resend = getResend()
  if (!resend) {
    return { sent: 0, failed: args.recipients.length }
  }

  const chunkSize = 100
  let sent = 0
  let failed = 0

  for (let i = 0; i < args.recipients.length; i += chunkSize) {
    const chunk = args.recipients.slice(i, i + chunkSize)
    const payload = await Promise.all(chunk.map(async (email) => {
      const custom = args.perRecipient?.(email)
      const resolved = custom ? await custom : null
      return {
        from: FROM,
        to: email,
        subject: args.subject,
        html: resolved?.html ?? args.html,
        ...(resolved?.headers ? { headers: resolved.headers } : {}),
      }
    }))

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
export async function buildCampaignEmail(args: {
  subject?: string
  previewText: string
  content: string
  unsubscribeUrl: string
  brand?: string
}) {
  const brand = args.brand ?? BRAND
  const previewText = (args.previewText || '').slice(0, 240)
  const subject = args.subject?.trim() || `${brand} Newsletter`
  const htmlContent = normalizeCampaignContent(args.content)
  const body = await renderStaticEmail(
    createElement(NewsletterEmail, {
      brandName: brand,
      edition: subject,
      date: formatDate(new Date()),
      heroTitle: subject,
      heroSubtitle: previewText || 'Latest updates from our fragrance world.',
      heroImage: NEWSLETTER_HERO_IMAGE,
      contentHtml: htmlContent,
      unsubscribeUrl: args.unsubscribeUrl,
    }),
  )

  return wrapEmailHtml(body, previewText)
}

/* ─── order confirmation ─────────────────────────── */

export async function buildOrderConfirmationEmail(order: IOrder, customerName: string) {
  const orderNumber = shortOrderNumber(order)
  const body = await renderStaticEmail(
    createElement(OrderConfirmationEmail, {
      brandName: BRAND,
      supportEmail: SUPPORT_EMAIL,
      customerName,
      orderNumber,
      orderDate: formatDate(order.createdAt),
      items: order.items.map((item) => ({
        name: item.name,
        size: item.variantSku,
        qty: item.quantity,
        price: item.subtotal,
        image: absoluteAssetUrl(item.image),
      })),
      shippingAddress: {
        name: order.shippingAddress.name,
        street: order.shippingAddress.address,
        city: order.shippingAddress.city,
        state: order.shippingAddress.state,
        zip: order.shippingAddress.zip,
        country: order.shippingAddress.country,
      },
      subtotal: order.subtotal,
      shipping: order.shipping,
      tax: order.tax,
      discount: order.discount,
      total: order.totalAmount,
      estimatedDelivery: undefined,
      paymentMethod: paymentMethodLabel(order),
      orderUrl: orderDetailsUrl(order),
      trackingUrl: order.trackingUrl,
      privacyUrl: `${APP_URL}/policies/privacy`,
      termsUrl: `${APP_URL}/policies/terms`,
      returnsUrl: `${APP_URL}/policies/returns`,
    }),
  )

  return {
    subject: `Order Confirmed — #${orderNumber}`,
    html: wrapEmailHtml(body, `Your order #${orderNumber} has been confirmed.`),
  }
}

/* ─── status update email ────────────────────────── */

const STATUS_COPY: Record<string, { subject: string; body: string }> = {
  paid: {
    subject: 'Payment Confirmed',
    body: 'Great news — your payment has been confirmed and your order is being prepared.',
  },
  shipped: {
    subject: 'Your Order Has Shipped',
    body: 'Your order is on its way to you.',
  },
  delivered: {
    subject: 'Order Delivered',
    body: 'Your order has been delivered. We hope you love your new fragrance.',
  },
  cancelled: {
    subject: 'Order Cancelled',
    body: 'Your order has been cancelled. If you have questions, please contact us.',
  },
  refunded: {
    subject: 'Refund Processed',
    body: 'Your refund has been processed. Please allow 3–5 business days to appear on your statement.',
  },
}

export async function buildStatusUpdateEmail(
  order: IOrder,
  customerName: string,
  newStatus: string
) {
  const copy = STATUS_COPY[newStatus]
  if (!copy) return null
  const oldStatus =
    order.statusHistory.length > 1
      ? prettifyStatus(order.statusHistory[order.statusHistory.length - 2]?.status)
      : 'Pending'
  const statusLabel = prettifyStatus(newStatus)
  const body = await renderStaticEmail(
    createElement(OrderStatusEmail, {
      brandName: BRAND,
      supportEmail: SUPPORT_EMAIL,
      customerName,
      orderNumber: shortOrderNumber(order),
      oldStatus,
      newStatus: statusLabel,
      statusDate: formatDate(order.updatedAt ?? new Date()),
      trackingNumber: order.trackingNumber,
      carrier: order.trackingCarrier,
      trackingUrl: order.trackingUrl,
      items: order.items.map((item) => ({
        name: item.name,
        size: item.variantSku,
        qty: item.quantity,
        price: item.subtotal,
        image: absoluteAssetUrl(item.image),
      })),
      estimatedDelivery: undefined,
      orderUrl: orderDetailsUrl(order),
    }),
  )

  return {
    subject: `${copy.subject} — #${shortOrderNumber(order)}`,
    html: wrapEmailHtml(body, copy.body),
  }
}

function wrapEmailHtml(body: string, previewText?: string) {
  const preheader = (previewText || '').trim()
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
</head>
<body style="margin:0;padding:0;background:#FDF9F3;">
  <div style="display:none;font-size:1px;color:#FDF9F3;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">
    ${escapeHtml(preheader)}
  </div>
  ${body}
</body>
</html>`
}

async function renderStaticEmail(node: ReturnType<typeof createElement>) {
  const { prelude } = await prerenderToNodeStream(node)
  return readStreamText(prelude)
}

function shortOrderNumber(order: IOrder) {
  return String(order._id).slice(-8).toUpperCase()
}

function formatDate(value: Date | string | undefined) {
  const date = value ? new Date(value) : new Date()
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

function prettifyStatus(status: string | undefined) {
  if (!status) return 'Pending'
  return status.charAt(0).toUpperCase() + status.slice(1)
}

function absoluteAssetUrl(url: string) {
  if (!url) return `${APP_URL}/next.svg`
  if (/^https?:\/\//i.test(url)) return url
  return `${APP_URL}${url.startsWith('/') ? url : `/${url}`}`
}

function orderDetailsUrl(order: IOrder) {
  return `${APP_URL}/orders/${order._id}`
}

function paymentMethodLabel(order: IOrder) {
  if (order.paymentStatus === 'completed' || order.paymentStatus === 'authorized') {
    return order.squarePaymentId ? 'Paid via Square' : 'Payment confirmed'
  }
  if (order.paymentStatus === 'pending') return 'Payment pending'
  if (order.paymentStatus === 'failed') return 'Payment failed'
  if (order.paymentStatus === 'refunded') return 'Payment refunded'
  return `Payment ${order.paymentStatus}`
}

function escapeHtml(input: string) {
  return input
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

function normalizeCampaignContent(content: string) {
  const trimmed = content.trim()
  if (!trimmed) return '<p></p>'
  if (/<[a-z][\s\S]*>/i.test(trimmed)) return trimmed

  return trimmed
    .split(/\n{2,}/)
    .map((paragraph) => `<p style="margin:0 0 16px 0;">${escapeHtml(paragraph).replaceAll('\n', '<br />')}</p>`)
    .join('')
}
