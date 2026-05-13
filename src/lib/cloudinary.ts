import { v2 as cloudinary } from 'cloudinary'
import { logger } from '@/lib/logger'


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
 * Delete by public_id (admin asset cleanup)
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
