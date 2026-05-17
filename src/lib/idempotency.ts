import crypto from 'crypto'
import IdempotencyKey from '@/models/IdempotencyKey'
import type { IIdempotencyKey, IdempotencyScope } from '@/types/commerce'

export function hashRequest(payload: unknown): string {
  return crypto
    .createHash('sha256')
    .update(JSON.stringify(payload ?? {}))
    .digest('hex')
}

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
  } catch (err: unknown) {
    if ((err as { code?: number })?.code !== 11000) throw err

    const existing = await IdempotencyKey.findOne({
      key: args.key,
      scope: args.scope,
      ...(args.userId ? { user: args.userId } : {}),
    }).lean<IIdempotencyKey>()

    if (existing) return { existing }
    throw err
  }
}

export async function completeIdempotency(args: {
  key: string
  scope: IdempotencyScope
  status: number
  response: unknown
  resourceId?: string
}): Promise<void> {
  await IdempotencyKey.updateOne(
    {
      key: args.key,
      scope: args.scope,
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

export async function failIdempotency(args: {
  key: string
  scope: IdempotencyScope
  status: number
  response: unknown
}): Promise<void> {
  await IdempotencyKey.updateOne(
    {
      key: args.key,
      scope: args.scope,
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

export async function releaseIdempotency(
  key: string,
  scope: IdempotencyScope
): Promise<void> {
  const cutoff = new Date(Date.now() - 5 * 60 * 1000)

  await IdempotencyKey.deleteOne({
    key,
    scope,
    state: 'in_progress',
    createdAt: { $lt: cutoff },
  })
}
