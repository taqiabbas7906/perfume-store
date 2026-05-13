import { Resend } from 'resend'
import type { IOrder } from '@/types'
import { logger } from '@/lib/logger'

const resend = new Resend(process.env.RESEND_API_KEY)

/* ───────────────────────────────────────────── */
/* EMAIL CONFIGURATION */
/* ───────────────────────────────────────────── */

const FROM_EMAIL = process.env.EMAIL_FROM || 'orders@perfumestore.com'
const COMPANY_NAME = process.env.COMPANY_NAME || 'Perfume Store'
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

/* ───────────────────────────────────────────── */
/* EMAIL TEMPLATES */
/* ───────────────────────────────────────────── */

function getOrderConfirmationEmailHTML(order: IOrder): string {
  const orderDate = new Date(order.createdAt!).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  const itemsHTML = order.items
    .map(
      (item) => `
    <tr>
      <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">
        <div style="font-weight: 500; color: #111827;">${item.name}</div>
        <div style="font-size: 14px; color: #6b7280;">${item.variantSku}</div>
      </td>
      <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: center; color: #6b7280;">
        ${item.quantity}
      </td>
      <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: right; font-weight: 500; color: #111827;">
        $${item.price.toFixed(2)}
      </td>
      <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: right; font-weight: 500; color: #111827;">
        $${item.subtotal.toFixed(2)}
      </td>
    </tr>
  `
    )
    .join('')

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Order Confirmation</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f9fafb;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f9fafb; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
          
          <!-- Header -->
          <tr>
            <td style="padding: 40px 40px 20px 40px; text-align: center; border-bottom: 1px solid #e5e7eb;">
              <h1 style="margin: 0; font-size: 28px; font-weight: 700; color: #111827;">${COMPANY_NAME}</h1>
            </td>
          </tr>
          
          <!-- Success Message -->
          <tr>
            <td style="padding: 40px 40px 20px 40px;">
              <div style="text-align: center; margin-bottom: 30px;">
                <div style="width: 60px; height: 60px; background-color: #10b981; border-radius: 50%; margin: 0 auto 20px auto; display: flex; align-items: center; justify-content: center;">
                  <span style="color: white; font-size: 32px; line-height: 60px;">✓</span>
                </div>
                <h2 style="margin: 0; font-size: 24px; font-weight: 600; color: #111827;">Order Confirmed!</h2>
                <p style="margin: 12px 0 0 0; font-size: 16px; color: #6b7280;">Thank you for your order. We've received it and will process it shortly.</p>
              </div>
            </td>
          </tr>
          
          <!-- Order Details -->
          <tr>
            <td style="padding: 0 40px 20px 40px;">
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f9fafb; border-radius: 6px; padding: 20px;">
                <tr>
                  <td>
                    <div style="margin-bottom: 8px;">
                      <span style="font-size: 14px; color: #6b7280;">Order Number</span>
                    </div>
                    <div style="font-size: 16px; font-weight: 600; color: #111827;">#${String(order._id).slice(-8).toUpperCase()}</div>
                  </td>
                  <td align="right">
                    <div style="margin-bottom: 8px;">
                      <span style="font-size: 14px; color: #6b7280;">Order Date</span>
                    </div>
                    <div style="font-size: 16px; font-weight: 600; color: #111827;">${orderDate}</div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Items Table -->
          <tr>
            <td style="padding: 0 40px 20px 40px;">
              <h3 style="margin: 0 0 16px 0; font-size: 18px; font-weight: 600; color: #111827;">Order Items</h3>
              <table width="100%" cellpadding="0" cellspacing="0" style="border: 1px solid #e5e7eb; border-radius: 6px; overflow: hidden;">
                <thead>
                  <tr style="background-color: #f9fafb;">
                    <th style="padding: 12px; text-align: left; font-size: 14px; font-weight: 600; color: #6b7280; border-bottom: 1px solid #e5e7eb;">Product</th>
                    <th style="padding: 12px; text-align: center; font-size: 14px; font-weight: 600; color: #6b7280; border-bottom: 1px solid #e5e7eb;">Qty</th>
                    <th style="padding: 12px; text-align: right; font-size: 14px; font-weight: 600; color: #6b7280; border-bottom: 1px solid #e5e7eb;">Price</th>
                    <th style="padding: 12px; text-align: right; font-size: 14px; font-weight: 600; color: #6b7280; border-bottom: 1px solid #e5e7eb;">Total</th>
                  </tr>
                </thead>
                <tbody>
                  ${itemsHTML}
                </tbody>
              </table>
            </td>
          </tr>
          
          <!-- Order Summary -->
          <tr>
            <td style="padding: 0 40px 20px 40px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding: 8px 0; font-size: 15px; color: #6b7280;">Subtotal</td>
                  <td align="right" style="padding: 8px 0; font-size: 15px; font-weight: 500; color: #111827;">$${order.subtotal.toFixed(2)}</td>
                </tr>
                ${
                  order.discount > 0
                    ? `
                <tr>
                  <td style="padding: 8px 0; font-size: 15px; color: #10b981;">Discount</td>
                  <td align="right" style="padding: 8px 0; font-size: 15px; font-weight: 500; color: #10b981;">-$${order.discount.toFixed(2)}</td>
                </tr>
                `
                    : ''
                }
                <tr>
                  <td style="padding: 8px 0; font-size: 15px; color: #6b7280;">Shipping</td>
                  <td align="right" style="padding: 8px 0; font-size: 15px; font-weight: 500; color: #111827;">${order.shipping === 0 ? 'Free' : `$${order.shipping.toFixed(2)}`}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; font-size: 15px; color: #6b7280;">Tax</td>
                  <td align="right" style="padding: 8px 0; font-size: 15px; font-weight: 500; color: #111827;">$${order.tax.toFixed(2)}</td>
                </tr>
                <tr style="border-top: 2px solid #e5e7eb;">
                  <td style="padding: 16px 0 0 0; font-size: 18px; font-weight: 600; color: #111827;">Total</td>
                  <td align="right" style="padding: 16px 0 0 0; font-size: 18px; font-weight: 700; color: #111827;">$${order.totalAmount.toFixed(2)}</td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Shipping Address -->
          <tr>
            <td style="padding: 20px 40px;">
              <h3 style="margin: 0 0 12px 0; font-size: 18px; font-weight: 600; color: #111827;">Shipping Address</h3>
              <div style="background-color: #f9fafb; border-radius: 6px; padding: 16px;">
                <div style="font-weight: 500; color: #111827; margin-bottom: 4px;">${order.shippingAddress.name}</div>
                <div style="color: #6b7280; line-height: 1.6;">
                  ${order.shippingAddress.address}<br>
                  ${order.shippingAddress.city}, ${order.shippingAddress.zip}<br>
                  ${order.shippingAddress.country}
                </div>
              </div>
            </td>
          </tr>
          
          <!-- Track Order Button -->
          <tr>
            <td style="padding: 20px 40px 40px 40px; text-align: center;">
              <a href="${APP_URL}/orders/${order._id}" style="display: inline-block; padding: 14px 32px; background-color: #111827; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">View Order Details</a>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 30px 40px; background-color: #f9fafb; border-top: 1px solid #e5e7eb; text-align: center; border-radius: 0 0 8px 8px;">
              <p style="margin: 0 0 8px 0; font-size: 14px; color: #6b7280;">Need help? Contact us at <a href="mailto:support@perfumestore.com" style="color: #111827; text-decoration: none;">support@perfumestore.com</a></p>
              <p style="margin: 0; font-size: 12px; color: #9ca3af;">© ${new Date().getFullYear()} ${COMPANY_NAME}. All rights reserved.</p>
            </td>
          </tr>
          
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `
}

function getStatusUpdateEmailHTML(
  order: IOrder,
  oldStatus: string,
  newStatus: string
): string {
  const statusConfig: Record<
    string,
    { title: string; message: string; color: string; icon: string }
  > = {
    paid: {
      title: 'Payment Confirmed',
      message: 'Your payment has been processed successfully. We are preparing your order for shipment.',
      color: '#10b981',
      icon: '💳',
    },
    shipped: {
      title: 'Order Shipped',
      message: 'Great news! Your order is on its way. You should receive it soon.',
      color: '#3b82f6',
      icon: '📦',
    },
    delivered: {
      title: 'Order Delivered',
      message: 'Your order has been delivered. We hope you enjoy your purchase!',
      color: '#10b981',
      icon: '✅',
    },
    cancelled: {
      title: 'Order Cancelled',
      message: 'Your order has been cancelled as requested. If you have any questions, please contact us.',
      color: '#ef4444',
      icon: '❌',
    },
    refunded: {
      title: 'Order Refunded',
      message: 'Your refund has been processed. The amount will be credited to your original payment method within 5-10 business days.',
      color: '#f59e0b',
      icon: '💰',
    },
    failed: {
      title: 'Payment Failed',
      message: 'Unfortunately, we couldn\'t process your payment. Please try again or contact support.',
      color: '#ef4444',
      icon: '⚠️',
    },
  }

  const config = statusConfig[newStatus] || {
    title: 'Order Status Updated',
    message: `Your order status has been updated to ${newStatus}.`,
    color: '#6b7280',
    icon: 'ℹ️',
  }

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Order Status Update</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f9fafb;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f9fafb; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
          
          <!-- Header -->
          <tr>
            <td style="padding: 40px 40px 20px 40px; text-align: center; border-bottom: 1px solid #e5e7eb;">
              <h1 style="margin: 0; font-size: 28px; font-weight: 700; color: #111827;">${COMPANY_NAME}</h1>
            </td>
          </tr>
          
          <!-- Status Update Message -->
          <tr>
            <td style="padding: 40px 40px 20px 40px;">
              <div style="text-align: center; margin-bottom: 30px;">
                <div style="width: 60px; height: 60px; background-color: ${config.color}; border-radius: 50%; margin: 0 auto 20px auto; display: flex; align-items: center; justify-content: center;">
                  <span style="font-size: 32px; line-height: 60px;">${config.icon}</span>
                </div>
                <h2 style="margin: 0; font-size: 24px; font-weight: 600; color: #111827;">${config.title}</h2>
                <p style="margin: 12px 0 0 0; font-size: 16px; color: #6b7280; line-height: 1.6;">${config.message}</p>
              </div>
            </td>
          </tr>
          
          <!-- Order Info -->
          <tr>
            <td style="padding: 0 40px 20px 40px;">
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f9fafb; border-radius: 6px; padding: 20px;">
                <tr>
                  <td>
                    <div style="margin-bottom: 8px;">
                      <span style="font-size: 14px; color: #6b7280;">Order Number</span>
                    </div>
                    <div style="font-size: 16px; font-weight: 600; color: #111827;">#${String(order._id).slice(-8).toUpperCase()}</div>
                  </td>
                  <td align="right">
                    <div style="margin-bottom: 8px;">
                      <span style="font-size: 14px; color: #6b7280;">Status</span>
                    </div>
                    <div style="display: inline-block; padding: 6px 12px; background-color: ${config.color}; color: white; border-radius: 4px; font-size: 14px; font-weight: 600; text-transform: capitalize;">
                      ${newStatus}
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Order Items Summary -->
          <tr>
            <td style="padding: 0 40px 20px 40px;">
              <h3 style="margin: 0 0 16px 0; font-size: 18px; font-weight: 600; color: #111827;">Order Summary</h3>
              ${order.items
                .map(
                  (item) => `
              <div style="padding: 12px; border: 1px solid #e5e7eb; border-radius: 6px; margin-bottom: 12px; display: flex; justify-content: space-between; align-items: center;">
                <div>
                  <div style="font-weight: 500; color: #111827; margin-bottom: 4px;">${item.name}</div>
                  <div style="font-size: 14px; color: #6b7280;">${item.variantSku} × ${item.quantity}</div>
                </div>
                <div style="font-weight: 600; color: #111827;">$${item.subtotal.toFixed(2)}</div>
              </div>
              `
                )
                .join('')}
              <div style="padding-top: 12px; border-top: 2px solid #e5e7eb; margin-top: 12px;">
                <div style="display: flex; justify-content: space-between; font-size: 18px;">
                  <span style="font-weight: 600; color: #111827;">Total</span>
                  <span style="font-weight: 700; color: #111827;">$${order.totalAmount.toFixed(2)}</span>
                </div>
              </div>
            </td>
          </tr>
          
          <!-- View Order Button -->
          <tr>
            <td style="padding: 20px 40px 40px 40px; text-align: center;">
              <a href="${APP_URL}/orders/${order._id}" style="display: inline-block; padding: 14px 32px; background-color: #111827; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">View Order Details</a>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 30px 40px; background-color: #f9fafb; border-top: 1px solid #e5e7eb; text-align: center; border-radius: 0 0 8px 8px;">
              <p style="margin: 0 0 8px 0; font-size: 14px; color: #6b7280;">Questions about your order? Contact us at <a href="mailto:support@perfumestore.com" style="color: #111827; text-decoration: none;">support@perfumestore.com</a></p>
              <p style="margin: 0; font-size: 12px; color: #9ca3af;">© ${new Date().getFullYear()} ${COMPANY_NAME}. All rights reserved.</p>
            </td>
          </tr>
          
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `
}

/* ───────────────────────────────────────────── */
/* SHIPPING CONFIRMATION EMAIL */
/* ───────────────────────────────────────────── */

function getShippingConfirmationEmailHTML(
  order: IOrder,
  tracking: { number: string; carrier: string; url?: string }
): string {
  const shippedDate = new Date(order.shippedAt ?? Date.now()).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  const itemsHTML = order.items
    .map(
      (item) => `
    <tr>
      <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">
        <div style="font-weight: 500; color: #111827;">${item.name}</div>
        <div style="font-size: 14px; color: #6b7280;">${item.variantSku} × ${item.quantity}</div>
      </td>
      <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: right; font-weight: 500; color: #111827;">
        $${item.subtotal.toFixed(2)}
      </td>
    </tr>
  `
    )
    .join('')

  const trackingButton = tracking.url
    ? `<a href="${tracking.url}" style="display: inline-block; padding: 14px 32px; background-color: #3b82f6; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">Track Your Package</a>`
    : `<a href="${APP_URL}/orders/${order._id}" style="display: inline-block; padding: 14px 32px; background-color: #111827; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">View Order Details</a>`

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your order has shipped</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f9fafb;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f9fafb; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
          <tr>
            <td style="padding: 40px 40px 20px 40px; text-align: center; border-bottom: 1px solid #e5e7eb;">
              <h1 style="margin: 0; font-size: 28px; font-weight: 700; color: #111827;">${COMPANY_NAME}</h1>
            </td>
          </tr>

          <tr>
            <td style="padding: 40px 40px 20px 40px;">
              <div style="text-align: center; margin-bottom: 30px;">
                <div style="width: 60px; height: 60px; background-color: #3b82f6; border-radius: 50%; margin: 0 auto 20px auto; display: flex; align-items: center; justify-content: center;">
                  <span style="font-size: 32px; line-height: 60px;">📦</span>
                </div>
                <h2 style="margin: 0; font-size: 24px; font-weight: 600; color: #111827;">Your order is on its way!</h2>
                <p style="margin: 12px 0 0 0; font-size: 16px; color: #6b7280;">We've handed your parcel to ${tracking.carrier}. Use the tracking number below to follow its journey.</p>
              </div>
            </td>
          </tr>

          <tr>
            <td style="padding: 0 40px 20px 40px;">
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px; padding: 20px;">
                <tr>
                  <td>
                    <div style="font-size: 12px; color: #1e40af; text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 6px;">Tracking number</div>
                    <div style="font-size: 18px; font-weight: 600; color: #1e3a8a; font-family: monospace; letter-spacing: 0.04em;">${tracking.number}</div>
                    <div style="font-size: 13px; color: #1e40af; margin-top: 6px;">Carrier: <strong>${tracking.carrier}</strong></div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <tr>
            <td style="padding: 0 40px 20px 40px;">
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f9fafb; border-radius: 6px; padding: 20px;">
                <tr>
                  <td>
                    <div style="font-size: 14px; color: #6b7280; margin-bottom: 6px;">Order Number</div>
                    <div style="font-size: 16px; font-weight: 600; color: #111827;">#${String(order._id).slice(-8).toUpperCase()}</div>
                  </td>
                  <td align="right">
                    <div style="font-size: 14px; color: #6b7280; margin-bottom: 6px;">Shipped on</div>
                    <div style="font-size: 16px; font-weight: 600; color: #111827;">${shippedDate}</div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <tr>
            <td style="padding: 0 40px 20px 40px;">
              <h3 style="margin: 0 0 16px 0; font-size: 18px; font-weight: 600; color: #111827;">Shipment Contents</h3>
              <table width="100%" cellpadding="0" cellspacing="0" style="border: 1px solid #e5e7eb; border-radius: 6px; overflow: hidden;">
                <tbody>
                  ${itemsHTML}
                </tbody>
              </table>
            </td>
          </tr>

          <tr>
            <td style="padding: 0 40px 20px 40px;">
              <h3 style="margin: 0 0 12px 0; font-size: 18px; font-weight: 600; color: #111827;">Shipping to</h3>
              <div style="background-color: #f9fafb; border-radius: 6px; padding: 16px;">
                <div style="font-weight: 500; color: #111827; margin-bottom: 4px;">${order.shippingAddress.name}</div>
                <div style="color: #6b7280; line-height: 1.6;">
                  ${order.shippingAddress.address}<br>
                  ${order.shippingAddress.city}, ${order.shippingAddress.zip}<br>
                  ${order.shippingAddress.country}<br>
                  ${order.shippingAddress.phone}
                </div>
              </div>
            </td>
          </tr>

          <tr>
            <td style="padding: 20px 40px 40px 40px; text-align: center;">
              ${trackingButton}
            </td>
          </tr>

          <tr>
            <td style="padding: 30px 40px; background-color: #f9fafb; border-top: 1px solid #e5e7eb; text-align: center; border-radius: 0 0 8px 8px;">
              <p style="margin: 0 0 8px 0; font-size: 14px; color: #6b7280;">Questions about your shipment? Contact us at <a href="mailto:support@perfumestore.com" style="color: #111827; text-decoration: none;">support@perfumestore.com</a></p>
              <p style="margin: 0; font-size: 12px; color: #9ca3af;">© ${new Date().getFullYear()} ${COMPANY_NAME}. All rights reserved.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `
}

/* ───────────────────────────────────────────── */
/* EMAIL SENDING FUNCTIONS */
/* ───────────────────────────────────────────── */

export interface SendOrderConfirmationInput {
  order: IOrder
  recipientEmail: string
}

export async function sendOrderConfirmationEmail(
  input: SendOrderConfirmationInput
): Promise<{ success: boolean; error?: string }> {
  try {
    if (!process.env.RESEND_API_KEY) {
      logger.warn('RESEND_API_KEY not configured, skipping email')
      return { success: false, error: 'Email service not configured' }
    }

    const { order, recipientEmail } = input

    const emailHTML = getOrderConfirmationEmailHTML(order)

    const result = await resend.emails.send({
      from: FROM_EMAIL,
      to: recipientEmail,
      subject: `Order Confirmation #${String(order._id).slice(-8).toUpperCase()} - ${COMPANY_NAME}`,
      html: emailHTML,
    })

    if (result.error) {
      logger.error({ error: result.error, orderId: order._id }, 'Failed to send order confirmation email')
      return { success: false, error: result.error.message }
    }

    logger.info({ orderId: order._id, emailId: result.data?.id }, 'Order confirmation email sent')
    return { success: true }
  } catch (error) {
    logger.error({ error, orderId: input.order._id }, 'Error sending order confirmation email')
    return { success: false, error: String(error) }
  }
}

export interface SendShippingConfirmationInput {
  order: IOrder
  recipientEmail: string
  trackingNumber: string
  trackingCarrier: string
  trackingUrl?: string
}

export async function sendShippingConfirmationEmail(
  input: SendShippingConfirmationInput
): Promise<{ success: boolean; error?: string }> {
  try {
    if (!process.env.RESEND_API_KEY) {
      logger.warn('RESEND_API_KEY not configured, skipping shipping confirmation email')
      return { success: false, error: 'Email service not configured' }
    }

    const { order, recipientEmail, trackingNumber, trackingCarrier, trackingUrl } = input

    const emailHTML = getShippingConfirmationEmailHTML(order, {
      number: trackingNumber,
      carrier: trackingCarrier,
      url: trackingUrl,
    })

    const result = await resend.emails.send({
      from: FROM_EMAIL,
      to: recipientEmail,
      subject: `Your order has shipped — #${String(order._id).slice(-8).toUpperCase()}`,
      html: emailHTML,
    })

    if (result.error) {
      logger.error(
        { error: result.error, orderId: order._id },
        'Failed to send shipping confirmation email'
      )
      return { success: false, error: result.error.message }
    }

    logger.info(
      { orderId: order._id, emailId: result.data?.id, trackingNumber },
      'Shipping confirmation email sent'
    )
    return { success: true }
  } catch (error) {
    logger.error(
      { error, orderId: input.order._id },
      'Error sending shipping confirmation email'
    )
    return { success: false, error: String(error) }
  }
}

export interface SendOrderStatusUpdateInput {
  order: IOrder
  recipientEmail: string
  oldStatus: string
  newStatus: string
}

export async function sendOrderStatusUpdateEmail(
  input: SendOrderStatusUpdateInput
): Promise<{ success: boolean; error?: string }> {
  try {
    if (!process.env.RESEND_API_KEY) {
      logger.warn('RESEND_API_KEY not configured, skipping email')
      return { success: false, error: 'Email service not configured' }
    }

    const { order, recipientEmail, oldStatus, newStatus } = input

    // Don't send email if status hasn't actually changed
    if (oldStatus === newStatus) {
      return { success: true }
    }

    const emailHTML = getStatusUpdateEmailHTML(order, oldStatus, newStatus)

    const statusTitles: Record<string, string> = {
      paid: 'Payment Confirmed',
      shipped: 'Order Shipped',
      delivered: 'Order Delivered',
      cancelled: 'Order Cancelled',
      refunded: 'Order Refunded',
      failed: 'Payment Failed',
    }

    const subject = `${statusTitles[newStatus] || 'Order Status Update'} - Order #${String(order._id).slice(-8).toUpperCase()}`

    const result = await resend.emails.send({
      from: FROM_EMAIL,
      to: recipientEmail,
      subject,
      html: emailHTML,
    })

    if (result.error) {
      logger.error({ error: result.error, orderId: order._id }, 'Failed to send status update email')
      return { success: false, error: result.error.message }
    }

    logger.info(
      { orderId: order._id, emailId: result.data?.id, oldStatus, newStatus },
      'Order status update email sent'
    )
    return { success: true }
  } catch (error) {
    logger.error({ error, orderId: input.order._id }, 'Error sending status update email')
    return { success: false, error: String(error) }
  }
}