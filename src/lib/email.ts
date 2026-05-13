import { Resend } from 'resend'
import type { IOrder } from '@/types'

const resend = new Resend(process.env.RESEND_API_KEY)
const FROM = process.env.EMAIL_FROM ?? 'orders@yourdomain.com'

/* ─── send helper ────────────────────────────────── */

export async function sendEmail(to: string, subject: string, html: string) {
  if (!process.env.RESEND_API_KEY) return
  await resend.emails.send({ from: FROM, to, subject, html })
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
