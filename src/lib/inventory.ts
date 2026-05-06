import { ClientSession, Types } from 'mongoose'
import Product from '@/models/Product'
import { logger } from './logger'

/* ───────────────────────────────────────────── */

export interface DecrementInput {
  productId: Types.ObjectId | string
  variantSku: string
  quantity: number
}

/* ───────────────────────────────────────────── */
/* SAFE OBJECT ID */
/* ───────────────────────────────────────────── */

function toObjectId(id: Types.ObjectId | string): Types.ObjectId | null {
  if (!id) return null
  if (id instanceof Types.ObjectId) return id
  if (!Types.ObjectId.isValid(id)) return null
  return new Types.ObjectId(id)
}

/* ───────────────────────────────────────────── */
/* VALIDATION */
/* ───────────────────────────────────────────── */

function validate(input: DecrementInput):
  | { ok: true; productId: Types.ObjectId }
  | { ok: false } {
  const productId = toObjectId(input.productId)

  if (!productId) return { ok: false }
  if (!input.variantSku) return { ok: false }
  if (!Number.isInteger(input.quantity) || input.quantity <= 0) {
    return { ok: false }
  }

  return { ok: true, productId }
}

/* ───────────────────────────────────────────── */
/* ATOMIC DECREMENT (SAFE AGAINST RACE CONDITIONS) */
/* ───────────────────────────────────────────── */

export async function decrementStock(
  input: DecrementInput,
  session?: ClientSession
): Promise<boolean> {
  const v = validate(input)
  if (!v.ok) return false

  /**
   * IMPORTANT FIX:
   * We ensure BOTH conditions atomically:
   * - variant exists
   * - sufficient stock exists
   * - decrement happens in same query
   */
  const result = await Product.updateOne(
    {
      _id: v.productId,
      variants: {
        $elemMatch: {
          sku: input.variantSku,
          quantity: { $gte: input.quantity },
        },
      },
    },
    {
      $inc: {
        'variants.$.quantity': -input.quantity,
        totalStock: -input.quantity,
      },
    },
    session ? { session } : {}
  )

  return result.modifiedCount === 1
}

/* ───────────────────────────────────────────── */
/* RESTORE STOCK (SAFE) */
/* ───────────────────────────────────────────── */

export async function restoreStock(
  input: DecrementInput,
  session?: ClientSession
): Promise<boolean> {
  const v = validate(input)
  if (!v.ok) return false

  const result = await Product.updateOne(
    {
      _id: v.productId,
      'variants.sku': input.variantSku,
    },
    {
      $inc: {
        'variants.$.quantity': input.quantity,
        totalStock: input.quantity,
      },
    },
    session ? { session } : {}
  )

  return result.modifiedCount === 1
}

/* ───────────────────────────────────────────── */
/* BATCH DECREMENT (SAFE + FAIL-FAST + ROLLBACK) */
/* ───────────────────────────────────────────── */

export async function decrementStockBatch(
  items: DecrementInput[],
  session?: ClientSession
): Promise<
  | { ok: true }
  | { ok: false; failedSku: string; restored: DecrementInput[] }
> {
  const succeeded: DecrementInput[] = []

  for (const item of items) {
    const v = validate(item)

    if (!v.ok) {
      await rollback(succeeded, session)
      return {
        ok: false,
        failedSku: item.variantSku,
        restored: succeeded,
      }
    }

    const ok = await decrementStock(item, session)

    if (!ok) {
      await rollback(succeeded, session)
      return {
        ok: false,
        failedSku: item.variantSku,
        restored: succeeded,
      }
    }

    succeeded.push(item)
  }

  return { ok: true }
}

/* ───────────────────────────────────────────── */
/* ROLLBACK HELPER (CENTRALIZED SAFETY) */
/* ───────────────────────────────────────────── */

async function rollback(items: DecrementInput[], session?: ClientSession) {
  for (const item of items) {
    try {
      const success = await restoreStock(item, session)
      if (!success) {
        logger.fatal(
          { item },
          'Failed to restore stock during rollback'
        )
      }
    } catch (err) {
      logger.fatal(
        { err, item },
        'Error restoring stock during rollback'
      )
    }
  }
}