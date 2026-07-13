import type { IOrder } from '@/types'
import { logger } from '@/lib/logger'
import {
  buildOrderConfirmationEmail,
  buildStatusUpdateEmail,
  sendEmail,
} from '@/lib/email'

export interface SendOrderConfirmationInput {
  order: IOrder
  recipientEmail: string
}

export async function sendOrderConfirmationEmail(
  input: SendOrderConfirmationInput
): Promise<{ success: boolean; error?: string }> {
  try {
    const { order, recipientEmail } = input
    const tpl = await buildOrderConfirmationEmail(order, order.shippingAddress.name)
    await sendEmail(recipientEmail, tpl.subject, tpl.html)
    logger.info({ orderId: order._id }, 'Order confirmation email sent')
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
    const { order, recipientEmail, trackingNumber, trackingCarrier, trackingUrl } = input
    const shippedOrder: IOrder = {
      ...order,
      trackingNumber,
      trackingCarrier,
      trackingUrl,
      shippedAt: order.shippedAt ?? new Date(),
    }
    const tpl = await buildStatusUpdateEmail(
      shippedOrder,
      order.shippingAddress.name,
      'shipped',
    )
    if (!tpl) return { success: false, error: 'Failed to build shipping email' }

    await sendEmail(recipientEmail, tpl.subject, tpl.html)
    logger.info({ orderId: order._id, trackingNumber }, 'Shipping confirmation email sent')
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
    const { order, recipientEmail, oldStatus, newStatus } = input

    // Don't send email if status hasn't actually changed
    if (oldStatus === newStatus) {
      return { success: true }
    }

    const tpl = await buildStatusUpdateEmail(order, order.shippingAddress.name, newStatus)
    if (!tpl) return { success: false, error: 'Failed to build status email' }

    await sendEmail(recipientEmail, tpl.subject, tpl.html)
    logger.info({ orderId: order._id, oldStatus, newStatus }, 'Order status update email sent')
    return { success: true }
  } catch (error) {
    logger.error({ error, orderId: input.order._id }, 'Error sending status update email')
    return { success: false, error: String(error) }
  }
}
