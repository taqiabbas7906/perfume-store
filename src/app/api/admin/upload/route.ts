import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { rateLimit } from '@/lib/rateLimit'
import { getAuthAdmin, getAuthUser } from '@/lib/getAuthUser'
import { apiError, logRouteError } from '@/lib/apiError'
import { isCloudinaryConfigured } from '@/lib/cloudinary'
import { v2 as cloudinary } from 'cloudinary'
import { logger } from '@/lib/logger'

const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
const MAX_SIZE_MB  = 8
const MAX_SIZE_B   = MAX_SIZE_MB * 1024 * 1024

type UploadFolder = 'products' | 'brands' | 'categories' | 'collections'
const ALLOWED_FOLDERS: UploadFolder[] = ['products', 'brands', 'categories', 'collections']

const PUBLIC_ID_PATTERN = /^[a-zA-Z0-9_-]{1,80}$/

function sanitizePublicId(raw: unknown): string | undefined {
  if (typeof raw !== 'string' || !raw) return undefined
  if (!PUBLIC_ID_PATTERN.test(raw)) return undefined
  return raw
}

function configureCld() {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME!,
    api_key:    process.env.CLOUDINARY_API_KEY!,
    api_secret: process.env.CLOUDINARY_API_SECRET!,
  })
}

async function uploadBuffer(
  buffer: Buffer,
  mimeType: string,
  folder: UploadFolder,
  publicId?: string
) {
  configureCld()
  const base64 = `data:${mimeType};base64,${buffer.toString('base64')}`

  const opts: Record<string, unknown> = {
    folder,
    overwrite: true,
    resource_type: 'image',
    transformation: [
      { quality: 'auto', fetch_format: 'auto' },
    ],
  }

  if (publicId) opts.public_id = publicId

  // Product images — larger output
  if (folder === 'products') {
    opts.transformation = [
      { width: 1200, height: 1200, crop: 'limit' },
      { quality: 'auto', fetch_format: 'auto' },
    ]
  }

  // Brand/category logos — square crop
  if (folder === 'brands') {
    opts.transformation = [
      { width: 400, height: 400, crop: 'fill', gravity: 'face' },
      { quality: 'auto', fetch_format: 'auto' },
    ]
  }

  return cloudinary.uploader.upload(base64, opts as any)
}

/**
 * POST /api/admin/upload
 *
 * Multipart FormData:
 *   file     File    (required)
 *   folder   string  products | brands | categories | collections
 *   publicId string  (optional — deterministic public_id)
 *
 * Admin only — user profile pictures are no longer stored.
 */
export async function POST(req: NextRequest) {
  const limited = await rateLimit(req)
  if (limited) return limited

  try {
    if (!isCloudinaryConfigured()) {
      return apiError(503, { error: 'Image uploads unavailable: Cloudinary not configured.' })
    }

    await connectDB()
    const admin = await getAuthAdmin(req)
    if (!admin) return apiError(403, { error: 'Admin access required' })

    let formData: FormData
    try { formData = await req.formData() }
    catch { return apiError(400, { error: 'Could not parse multipart form data' }) }

    const file     = formData.get('file') as File | null
    const folder   = (formData.get('folder') as UploadFolder | null) ?? 'products'
    const rawId    = formData.get('publicId')
    const publicId = sanitizePublicId(rawId)

    if (rawId && !publicId) {
      return apiError(400, { error: 'publicId must be 1-80 chars, alphanumeric, underscore or hyphen' })
    }
    if (!file || file.size === 0) return apiError(400, { error: 'No file provided' })
    if (!ALLOWED_MIME.includes(file.type)) {
      return apiError(400, { error: `Unsupported file type: ${file.type}. Allowed: jpeg, png, webp, gif` })
    }
    if (file.size > MAX_SIZE_B) {
      return apiError(400, { error: `File too large. Maximum size is ${MAX_SIZE_MB} MB` })
    }

    if (!ALLOWED_FOLDERS.includes(folder)) {
      return apiError(400, { error: `Invalid folder. Allowed: ${ALLOWED_FOLDERS.join(', ')}` })
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const result = await uploadBuffer(buffer, file.type, folder, publicId)

    logger.info(
      { folder, publicId: result.public_id, adminId: admin._id, size: file.size },
      'Image uploaded'
    )

    return NextResponse.json({
      success: true,
      url: result.secure_url,
      publicId: result.public_id,
      width: result.width,
      height: result.height,
      format: result.format,
      bytes: result.bytes,
    }, { status: 201 })
  } catch (err) {
    logRouteError('POST /api/admin/upload', err)
    return apiError(500, { error: 'Upload failed. Please try again.' })
  }
}

/**
 * DELETE /api/admin/upload
 * Body: { publicId: string }
 * Admin only
 */
export async function DELETE(req: NextRequest) {
  const limited = await rateLimit(req)
  if (limited) return limited

  try {
    if (!isCloudinaryConfigured()) {
      return apiError(503, { error: 'Cloudinary not configured' })
    }

    await connectDB()
    const admin = await getAuthAdmin(req)
    if (!admin) return apiError(403, { error: 'Forbidden' })

    const body = await req.json().catch(() => null)
    const rawId = body?.publicId
    if (typeof rawId !== 'string' || !rawId) {
      return apiError(400, { error: 'publicId is required' })
    }
    // Cloudinary public IDs include the folder prefix (e.g. "products/abc_def").
    // Allow one optional folder segment; reject path traversal.
    if (!/^[a-zA-Z0-9_-]+(?:\/[a-zA-Z0-9_-]+)?$/.test(rawId) || rawId.length > 160) {
      return apiError(400, { error: 'Invalid publicId format' })
    }

    configureCld()
    await cloudinary.uploader.destroy(rawId)
    logger.info({ publicId: rawId, adminId: admin._id }, 'Image deleted from Cloudinary')

    return NextResponse.json({ success: true })
  } catch (err) {
    logRouteError('DELETE /api/admin/upload', err)
    return apiError(500, { error: 'Delete failed' })
  }
}
