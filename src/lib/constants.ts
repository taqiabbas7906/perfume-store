import type { OrderStatus, PaymentStatus } from '@/types'

export const ORDER_STATUSES: readonly OrderStatus[] = [
  'pending',
  'paid',
  'failed',
  'shipped',
  'delivered',
  'cancelled',
  'refunded',
] as const

export const PAYMENT_STATUSES: readonly PaymentStatus[] = [
  'pending',
  'authorized',
  'completed',
  'failed',
  'canceled',
  'refunded',
] as const

export const REVENUE_STATUSES: readonly OrderStatus[] = [
  'paid',
  'shipped',
  'delivered',
] as const

export const REVIEW_ELIGIBLE_STATUSES: readonly OrderStatus[] = [
  'paid',
  'shipped',
  'delivered',
] as const
