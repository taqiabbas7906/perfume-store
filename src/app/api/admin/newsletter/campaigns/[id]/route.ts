import { NextRequest, NextResponse, after } from 'next/server'
import { z } from 'zod'
import mongoose from 'mongoose'
import { connectDB } from '@/lib/db'
import { rateLimit } from '@/lib/rateLimit'
import { getAuthAdmin } from '@/lib/getAuthUser'
import { apiError, logRouteError } from '@/lib/apiError'
import { validateData } from '@/lib/validate'
import { buildCampaignEmail, sendCampaignBatch, sendEmail } from '@/lib/email'
import { REVENUE_STATUSES } from '@/lib/constants'
import { makeUnsubscribeToken } from '@/lib/unsubscribeToken'
import Newsletter from '@/models/Newsletter'
import NewsletterCampaign from '@/models/NewsletterCampaign'
import Order from '@/models/Order'
import User from '@/models/User'
import type { NewsletterCampaignAudience } from '@/types'

function unsubscribeUrl(email: string) {
  const base =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    'http://localhost:3000'
  const token = makeUnsubscribeToken(email)
  return `${base.replace(/\/$/, '')}/api/newsletter/unsubscribe?token=${encodeURIComponent(token)}`
}

type Ctx = { params: Promise<{ id: string }> }

const campaignUpdateSchema = z
  .object({
    subject: z.string().trim().min(1).max(160).optional(),
    previewText: z.string().trim().max(240).optional(),
    content: z.string().trim().min(1).max(100_000).optional(),
    audience: z.enum(['all', 'active', 'customers', 'vip']).optional(),
    scheduledAt: z.string().datetime().nullable().optional(),
  })
  .refine(
    (data) =>
      data.subject !== undefined ||
      data.previewText !== undefined ||
      data.content !== undefined ||
      data.audience !== undefined ||
      data.scheduledAt !== undefined,
    { message: 'At least one field is required' },
  )

function isValidId(id: string) {
  return mongoose.Types.ObjectId.isValid(id)
}

async function activeSubscriberEmails() {
  const subscribers = await Newsletter.find({ active: true })
    .select('email')
    .lean<{ email: string }[]>()
  return Array.from(new Set(subscribers.map((subscriber) => subscriber.email)))
}

async function recipientEmailsForAudience(audience: NewsletterCampaignAudience) {
  const emails = await activeSubscriberEmails()
  if (audience === 'all' || audience === 'active') return emails

  const users = await User.find({ email: { $in: emails } })
    .select('_id email')
    .lean<{ _id: mongoose.Types.ObjectId; email: string }[]>()
  const userIds = users.map((user) => user._id)
  const emailByUserId = new Map(users.map((user) => [String(user._id), user.email]))

  const orders = await Order.find({
    status: { $in: REVENUE_STATUSES },
    $or: [
      { guestEmail: { $in: emails } },
      { user: { $in: userIds } },
    ],
  })
    .select('guestEmail user totalAmount')
    .lean<{
      guestEmail?: string
      user?: mongoose.Types.ObjectId
      totalAmount: number
    }[]>()

  const customerStats = new Map<string, { orderCount: number; totalSpent: number }>()
  for (const order of orders) {
    const email =
      order.guestEmail || (order.user ? emailByUserId.get(String(order.user)) : undefined)
    if (!email) continue

    const current = customerStats.get(email) ?? { orderCount: 0, totalSpent: 0 }
    current.orderCount += 1
    current.totalSpent += order.totalAmount
    customerStats.set(email, current)
  }

  if (audience === 'customers') return Array.from(customerStats.keys())

  return Array.from(customerStats.entries())
    .filter(([, stats]) => stats.orderCount >= 3 || stats.totalSpent >= 500)
    .map(([email]) => email)
}

async function sendCampaignToRecipients(args: {
  subject: string
  previewText: string
  content: string
  recipients: string[]
}) {
  return sendCampaignBatch({
    recipients: args.recipients,
    subject: args.subject,
    html: '', // overridden per-recipient below
    perRecipient: (email) => {
      const url = unsubscribeUrl(email)
      const html = buildCampaignEmail({
        previewText: args.previewText,
        content: args.content,
        unsubscribeUrl: url,
      })
      // RFC 8058 one-click unsubscribe headers — boosts deliverability and
      // satisfies Gmail/Yahoo bulk-sender requirements.
      return {
        html,
        headers: {
          'List-Unsubscribe': `<${url}>`,
          'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
        },
      }
    },
  })
}

export async function GET(req: NextRequest, ctx: Ctx) {
  const limited = await rateLimit(req)
  if (limited) return limited

  try {
    const { id } = await ctx.params
    if (!isValidId(id)) return apiError(400, { error: 'Invalid id' })

    const admin = await getAuthAdmin(req)
    if (!admin) return apiError(403, { error: 'Admin access required' })

    await connectDB()

    const campaign = await NewsletterCampaign.findById(id).lean()
    if (!campaign) return apiError(404, { error: 'Campaign not found' })

    return NextResponse.json({ success: true, campaign })
  } catch (err) {
    logRouteError('GET /api/admin/newsletter/campaigns/[id]', err)
    return apiError(500, { error: 'Internal server error' })
  }
}

export async function PATCH(req: NextRequest, ctx: Ctx) {
  const limited = await rateLimit(req)
  if (limited) return limited

  try {
    const { id } = await ctx.params
    if (!isValidId(id)) return apiError(400, { error: 'Invalid id' })

    const admin = await getAuthAdmin(req)
    if (!admin) return apiError(403, { error: 'Admin access required' })

    const body = await req.json().catch(() => null)
    if (!body) return apiError(400, { error: 'Invalid JSON body' })

    const validation = validateData(campaignUpdateSchema, body)
    if (!validation.success) return validation.response

    await connectDB()

    const campaign = await NewsletterCampaign.findById(id)
    if (!campaign) return apiError(404, { error: 'Campaign not found' })
    if (campaign.status === 'sent' || campaign.status === 'sending') {
      return apiError(400, { error: 'Sent campaigns cannot be edited' })
    }

    const data = validation.data
    if (data.subject !== undefined) campaign.subject = data.subject
    if (data.previewText !== undefined) campaign.previewText = data.previewText
    if (data.content !== undefined) campaign.content = data.content
    if (data.audience !== undefined) campaign.audience = data.audience
    if (data.scheduledAt !== undefined) {
      campaign.scheduledAt = data.scheduledAt ? new Date(data.scheduledAt) : undefined
      campaign.status = data.scheduledAt ? 'scheduled' : 'draft'
    }

    await campaign.save()

    return NextResponse.json({ success: true, campaign })
  } catch (err) {
    logRouteError('PATCH /api/admin/newsletter/campaigns/[id]', err)
    return apiError(500, { error: 'Internal server error' })
  }
}

export async function POST(req: NextRequest, ctx: Ctx) {
  const limited = await rateLimit(req)
  if (limited) return limited

  try {
    const { id } = await ctx.params
    if (!isValidId(id)) return apiError(400, { error: 'Invalid id' })

    const admin = await getAuthAdmin(req)
    if (!admin) return apiError(403, { error: 'Admin access required' })

    if (!process.env.RESEND_API_KEY) {
      return apiError(503, { error: 'RESEND_API_KEY is not configured' })
    }

    await connectDB()

    const campaign = await NewsletterCampaign.findById(id)
    if (!campaign) return apiError(404, { error: 'Campaign not found' })

    // ── Test send mode ────────────────────────────────────────────────
    // ?test=email — fires the campaign to a single address (the admin's
    // own inbox by default) without mutating campaign status or counts.
    const testParam = req.nextUrl.searchParams.get('test')
    if (testParam !== null) {
      const target =
        (testParam && /\S+@\S+\.\S+/.test(testParam) ? testParam : admin.email) ?? ''
      if (!target) {
        return apiError(400, { error: 'No test recipient available' })
      }
      const url = unsubscribeUrl(target)
      const html = buildCampaignEmail({
        previewText: campaign.previewText,
        content: campaign.content,
        unsubscribeUrl: url,
      })
      try {
        await sendEmail(target, `[TEST] ${campaign.subject}`, html, {
          headers: {
            'List-Unsubscribe': `<${url}>`,
            'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
          },
        })
        return NextResponse.json({ success: true, test: true, sentTo: target })
      } catch (err) {
        logRouteError('POST /api/admin/newsletter/campaigns/[id] (test)', err)
        return apiError(500, { error: 'Failed to send test email' })
      }
    }

    // ── Real send ────────────────────────────────────────────────────
    if (campaign.status === 'sent') {
      return NextResponse.json({
        success: true,
        campaign,
        result: { sent: campaign.sentCount, failed: 0 },
      })
    }

    const recipients = await recipientEmailsForAudience(campaign.audience)
    if (recipients.length === 0) {
      return apiError(400, {
        error: 'No subscribers match this audience yet — nothing to send.',
      })
    }

    // Flip to 'sending' synchronously so the UI reflects that the campaign
    // has been queued the moment the request returns.
    campaign.status = 'sending'
    await campaign.save()

    const campaignId = campaign._id
    const payload = {
      subject: campaign.subject,
      previewText: campaign.previewText,
      content: campaign.content,
    }

    /**
     * Hand the actual delivery off to `after()` so the HTTP request returns
     * immediately. Vercel keeps the function alive for the deferred work,
     * so a 12,000-subscriber send no longer needs to fit inside the request
     * timeout. The campaign row is then updated when the batch settles.
     */
    after(async () => {
      try {
        const result = await sendCampaignToRecipients({
          ...payload,
          recipients,
        })
        await NewsletterCampaign.updateOne(
          { _id: campaignId },
          {
            $set: {
              status: 'sent',
              sentAt: new Date(),
              sentCount: result.sent,
            },
          },
        )
      } catch (err) {
        logRouteError('after(POST /api/admin/newsletter/campaigns/[id])', err)
        // Roll back to 'draft' so the admin can retry.
        await NewsletterCampaign.updateOne(
          { _id: campaignId },
          { $set: { status: 'draft' } },
        ).catch(() => {})
      }
    })

    return NextResponse.json({
      success: true,
      campaign,
      queued: true,
      result: { recipients: recipients.length, sent: 0, failed: 0 },
    })
  } catch (err) {
    logRouteError('POST /api/admin/newsletter/campaigns/[id]', err)
    return apiError(500, { error: 'Failed to send campaign' })
  }
}

export async function DELETE(req: NextRequest, ctx: Ctx) {
  const limited = await rateLimit(req)
  if (limited) return limited

  try {
    const { id } = await ctx.params
    if (!isValidId(id)) return apiError(400, { error: 'Invalid id' })

    const admin = await getAuthAdmin(req)
    if (!admin) return apiError(403, { error: 'Admin access required' })

    await connectDB()

    const campaign = await NewsletterCampaign.findByIdAndDelete(id).lean()
    if (!campaign) return apiError(404, { error: 'Campaign not found' })

    return NextResponse.json({ success: true })
  } catch (err) {
    logRouteError('DELETE /api/admin/newsletter/campaigns/[id]', err)
    return apiError(500, { error: 'Internal server error' })
  }
}
