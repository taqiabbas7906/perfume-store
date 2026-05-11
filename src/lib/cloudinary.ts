import { v2 as cloudinary } from 'cloudinary'
import { logger } from '@/lib/logger'

/* ─────────────────────────────────────────────
 * Lazy config — only throws when actually called,
 * so builds never fail if Cloudinary is absent.
 * ───────────────────────────────────────────── */
function configure() {
  const cloud = process.env.CLOUDINARY_CLOUD_NAME
  const key   = process.env.CLOUDINARY_API_KEY
  const secret = process.env.CLOUDINARY_API_SECRET

  if (!cloud || !key || !secret) {
    throw new Error(
      'Cloudinary is not configured. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET.'
    )
  }

  cloudinary.config({ cloud_name: cloud, api_key: key, api_secret: secret })
}

export function isCloudinaryConfigured(): boolean {
  return Boolean(
    process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET
  )
}

/* ─────────────────────────────────────────────
 * Upload a buffer (e.g. from FormData file)
 * ───────────────────────────────────────────── */
export interface UploadResult {
  url: string
  publicId: string
  width: number
  height: number
}

export async function uploadAvatarBuffer(
  buffer: Buffer,
  userId: string,
  mimeType: string
): Promise<UploadResult> {
  configure()

  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
  if (!allowedTypes.includes(mimeType)) {
    throw new Error(`Unsupported image type: ${mimeType}. Allowed: jpeg, png, webp, gif.`)
  }

  const base64 = `data:${mimeType};base64,${buffer.toString('base64')}`

  const result = await cloudinary.uploader.upload(base64, {
    folder: 'avatars',
    public_id: `user_${userId}`,
    overwrite: true,
    transformation: [
      { width: 400, height: 400, crop: 'fill', gravity: 'face' },
      { quality: 'auto', fetch_format: 'auto' },
    ],
    resource_type: 'image',
  })

  logger.info({ userId, publicId: result.public_id }, 'Avatar uploaded to Cloudinary')

  return {
    url: result.secure_url,
    publicId: result.public_id,
    width: result.width,
    height: result.height,
  }
}

/* ─────────────────────────────────────────────
 * Delete by public_id (used on account deletion)
 * ───────────────────────────────────────────── */
export async function deleteCloudinaryAsset(publicId: string): Promise<void> {
  try {
    configure()
    await cloudinary.uploader.destroy(publicId)
    logger.info({ publicId }, 'Cloudinary asset deleted')
  } catch (err) {
    logger.warn({ err, publicId }, 'Failed to delete Cloudinary asset')
  }
}
