import mongoose, { Schema, Model } from 'mongoose'

/**
 * Store-wide settings — modelled as a singleton document. There should only
 * ever be ONE document in this collection, addressed by the fixed
 * `SETTINGS_SINGLETON_KEY` value below. The helper `getSettings()` will
 * upsert that doc on first read so callers never have to worry about its
 * existence.
 */

export const SETTINGS_SINGLETON_KEY = 'global'

export interface ISettings {
  _id: mongoose.Types.ObjectId
  key: string

  /**
   * Free Delivery configuration:
   *  - enabled = false      → no global free delivery; per-product overrides
   *                           still apply at cart/checkout
   *  - enabled = true, no threshold (or 0) → everything ships free
   *  - enabled = true, threshold > 0       → free above threshold, normal below
   */
  freeDelivery: {
    enabled: boolean
    threshold: number
  }

  updatedAt: Date
  createdAt: Date
}

const SettingsSchema = new Schema<ISettings>(
  {
    key: { type: String, required: true, unique: true, index: true },
    freeDelivery: {
      enabled: { type: Boolean, default: false },
      threshold: { type: Number, default: 0, min: 0 },
    },
  },
  { timestamps: true, minimize: false },
)

const Settings: Model<ISettings> =
  mongoose.models.Settings || mongoose.model<ISettings>('Settings', SettingsSchema)

export default Settings

/**
 * Read (and lazily create) the global settings document. Always returns a
 * fully-shaped object so callers can rely on `freeDelivery.enabled` /
 * `freeDelivery.threshold` being present even on a brand-new install.
 */
export async function getSettings(): Promise<ISettings> {
  const doc = await Settings.findOneAndUpdate(
    { key: SETTINGS_SINGLETON_KEY },
    { $setOnInsert: { freeDelivery: { enabled: false, threshold: 0 } } },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  ).lean<ISettings>()
  // findOneAndUpdate with upsert + new always returns the doc.
  return doc!
}
