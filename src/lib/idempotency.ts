import crypto from 'crypto'
import IdempotencyKey from '@/models/IdempotencyKey'
import type { IIdempotencyKey, IdempotencyScope } from '@/types/commerce'

/* ───────────────────────────────────────────── */

export function hashRequest(payload: unknown): string {
  return crypto
    .createHash('sha256')
    .update(JSON.stringify(payload ?? {}))
    .digest('hex')
}

/* ───────────────────────────────────────────── */
/* ACQUIRE (ATOMIC SAFE VERSION) */
/* ───────────────────────────────────────────── */

export async function acquireIdempotency(args: {
  key: string
  scope: IdempotencyScope
  userId?: string
  requestHash: string
}): Promise<{
  acquired?: IIdempotencyKey
  existing?: IIdempotencyKey
}> {
  const now = new Date()

  try {
    const doc = await IdempotencyKey.create({
      key: args.key,
      scope: args.scope,
      user: args.userId,
      requestHash: args.requestHash,
      state: 'in_progress',
      createdAt: now,
      updatedAt: now,
    })

    return { acquired: doc.toObject() as IIdempotencyKey }
  } catch (err: any) {
    if (err?.code !== 11000) throw err

    // 🔐 IMPORTANT: include user in lookup to avoid cross-user replay
    const existing = await IdempotencyKey.findOne({
      key: args.key,
      ...(args.userId ? { user: args.userId } : {}),
    }).lean<IIdempotencyKey>()

    if (existing) {
      return { existing }
    }

    // fallback safety
    throw err
  }
}

/* ───────────────────────────────────────────── */
/* COMPLETE */
/* ───────────────────────────────────────────── */

export async function completeIdempotency(args: {
  key: string
  status: number
  response: unknown
  resourceId?: string
}): Promise<void> {
  await IdempotencyKey.updateOne(
    {
      key: args.key,
      state: { $ne: 'failed' },
    },
    {
      $set: {
        state: 'completed',
        status: args.status,
        response: args.response,
        resourceId: args.resourceId,
        updatedAt: new Date(),
      },
    }
  )
}

/* ───────────────────────────────────────────── */
/* FAIL */
/* ───────────────────────────────────────────── */

export async function failIdempotency(args: {
  key: string
  status: number
  response: unknown
}): Promise<void> {
  await IdempotencyKey.updateOne(
    {
      key: args.key,
      state: 'in_progress',
    },
    {
      $set: {
        state: 'failed',
        status: args.status,
        response: args.response,
        updatedAt: new Date(),
      },
    }
  )
}

/* ───────────────────────────────────────────── */
/* SAFE RELEASE (only if stuck) */
/* ───────────────────────────────────────────── */

export async function releaseIdempotency(key: string): Promise<void> {
  const cutoff = new Date(Date.now() - 5 * 60 * 1000) // 5 min safety window

  await IdempotencyKey.deleteOne({
    key,
    state: 'in_progress',
    createdAt: { $lt: cutoff },
  })
}