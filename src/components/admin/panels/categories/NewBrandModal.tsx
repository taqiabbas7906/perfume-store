'use client'

import { useRef, useState, type ChangeEvent, type FormEvent } from 'react'
import { authFetch } from '@/lib/api'

interface EditableBrand {
  _id: string
  name: string
  slug: string
  description?: string
  logo?: string
  website?: string
  country?: string
  isLuxury: boolean
  active: boolean
}

interface Props {
  initial?: EditableBrand | null
  onClose: () => void
  onSaved: () => void
  onError: (message: string) => void
}

function slugify(n: string) {
  return n
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
}

export default function NewBrandModal({
  initial,
  onClose,
  onSaved,
  onError,
}: Props) {
  const isEdit = Boolean(initial?._id)
  const fileRef = useRef<HTMLInputElement>(null)

  const [name, setName] = useState(initial?.name ?? '')
  const [slug, setSlug] = useState(initial?.slug ?? '')
  const [slugManual, setSlugManual] = useState(isEdit)
  const [description, setDescription] = useState(initial?.description ?? '')
  const [country, setCountry] = useState(initial?.country ?? '')
  const [logo, setLogo] = useState(initial?.logo ?? '')
  const [website, setWebsite] = useState(initial?.website ?? '')
  const [isLuxury, setIsLuxury] = useState(initial?.isLuxury ?? false)
  const [active, setActive] = useState(initial?.active ?? true)
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function handleImageImport(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return

    setError('')
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('folder', 'brands')

      const res = await authFetch('/api/admin/upload', {
        method: 'POST',
        body: fd,
      })
      const data = await res.json()
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Upload failed')
      }
      setLogo(data.url as string)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Upload failed'
      setError(msg)
      onError(msg)
    } finally {
      setUploading(false)
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    if (uploading) {
      setError('Please wait for the image upload to finish')
      return
    }
    if (name.trim().length < 1) {
      setError('Name is required')
      return
    }
    const finalSlug = slug.trim() || slugify(name)
    if (!/^[a-z0-9-]+$/.test(finalSlug)) {
      setError('Slug must contain only lowercase letters, numbers and hyphens.')
      return
    }

    const body: Record<string, unknown> = {
      name: name.trim(),
      slug: finalSlug,
      isLuxury,
      active,
    }

    const trimmedDescription = description.trim()
    if (trimmedDescription) body.description = trimmedDescription
    else if (isEdit) body.description = null

    const trimmedCountry = country.trim()
    if (trimmedCountry) body.country = trimmedCountry
    else if (isEdit) body.country = undefined

    if (logo) body.logo = logo
    else if (isEdit) body.logo = null

    const trimmedWebsite = website.trim()
    if (trimmedWebsite) body.website = trimmedWebsite
    else if (isEdit) body.website = null

    setSaving(true)
    try {
      const res = await authFetch(
        isEdit ? `/api/admin/brands/${initial!._id}` : '/api/admin/brands',
        {
          method: isEdit ? 'PATCH' : 'POST',
          body: JSON.stringify(body),
        },
      )
      const data = await res.json()
      if (!res.ok || !data.success) {
        throw new Error(
          data.error ||
            (isEdit ? 'Failed to update brand' : 'Failed to create brand'),
        )
      }
      onSaved()
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : isEdit
            ? 'Failed to update brand'
            : 'Failed to create brand'
      setError(msg)
      onError(msg)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-lg w-full max-w-lg max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between p-5 border-b border-paper-200">
          <h3 className="font-serif text-lg font-medium text-charcoal-900">
            {isEdit ? 'Edit Brand' : 'New Brand'}
          </h3>
          <button
            type="button"
            onClick={onClose}
            disabled={saving || uploading}
            className="text-charcoal-400 hover:text-charcoal-700 transition-colors disabled:opacity-50"
          >
            <span className="w-5 h-5 flex items-center justify-center">
              <i className="ri-close-line" />
            </span>
          </button>
        </div>

        <div className="p-5 space-y-4">
          {error && (
            <div className="px-3 py-2 bg-red-50 border border-red-200 text-red-700 rounded text-xs">
              {error}
            </div>
          )}

          <div>
            <label className="text-xs font-medium text-charcoal-700 block mb-1.5">
              Name
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => {
                const next = e.target.value
                setName(next)
                if (!slugManual) setSlug(slugify(next))
              }}
              placeholder="Tom Ford"
              className="w-full bg-paper-50 border border-paper-300 px-3 py-2 text-sm text-charcoal-900 rounded focus:outline-none focus:border-gold-400"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-charcoal-700 block mb-1.5">
              Slug
            </label>
            <input
              type="text"
              value={slug}
              onChange={(e) => {
                setSlug(e.target.value)
                setSlugManual(true)
              }}
              placeholder="tom-ford"
              className="w-full bg-paper-50 border border-paper-300 px-3 py-2 text-sm text-charcoal-900 rounded focus:outline-none focus:border-gold-400"
            />
            <p className="text-xs text-charcoal-400 mt-1">
              Auto-generated from name. Used in the storefront URL.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-charcoal-700 block mb-1.5">
                Country
              </label>
              <input
                type="text"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                placeholder="USA"
                className="w-full bg-paper-50 border border-paper-300 px-3 py-2 text-sm text-charcoal-900 rounded focus:outline-none focus:border-gold-400"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-charcoal-700 block mb-1.5">
                Website
              </label>
              <input
                type="url"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                placeholder="https://…"
                className="w-full bg-paper-50 border border-paper-300 px-3 py-2 text-sm text-charcoal-900 rounded focus:outline-none focus:border-gold-400"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-charcoal-700 block mb-1.5">
              Description
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="A Stockholm-based luxury brand…"
              className="w-full bg-paper-50 border border-paper-300 px-3 py-2 text-sm text-charcoal-900 rounded focus:outline-none focus:border-gold-400"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-charcoal-700 block mb-1.5">
              Logo
            </label>
            <div className="flex items-start gap-3">
              <div className="w-28 h-20 shrink-0 rounded bg-paper-100 border border-paper-200 overflow-hidden flex items-center justify-center text-paper-400">
                {logo ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={logo}
                    alt={name || 'Brand logo'}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <i className="ri-image-line text-2xl" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    disabled={saving || uploading}
                    className="bg-charcoal-900 text-white text-xs uppercase tracking-wider px-4 py-2 hover:bg-charcoal-800 transition-colors disabled:opacity-50 flex items-center gap-1.5"
                  >
                    <span className="w-4 h-4 flex items-center justify-center">
                      <i className="ri-upload-cloud-2-line" />
                    </span>
                    {logo ? 'Replace Image' : 'Import Image'}
                  </button>
                  {logo && (
                    <button
                      type="button"
                      onClick={() => setLogo('')}
                      disabled={saving || uploading}
                      className="border border-paper-300 text-charcoal-600 text-xs uppercase tracking-wider px-4 py-2 hover:border-red-200 hover:text-red-600 transition-colors disabled:opacity-50"
                    >
                      Remove
                    </button>
                  )}
                </div>
                <p className="text-xs text-charcoal-400 mt-2">
                  JPEG, PNG, WebP or GIF. Uploaded to Cloudinary.
                </p>
                {uploading && (
                  <p className="text-xs text-charcoal-500 mt-1">Uploading image…</p>
                )}
              </div>
            </div>
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="hidden"
              onChange={handleImageImport}
            />
          </div>

          <div className="flex flex-wrap items-center gap-5">
            <label className="flex items-center gap-2 text-sm text-charcoal-700 cursor-pointer">
              <input
                type="checkbox"
                checked={isLuxury}
                onChange={(e) => setIsLuxury(e.target.checked)}
                className="w-4 h-4 accent-gold-500"
              />
              Luxury brand
            </label>
            <label className="flex items-center gap-2 text-sm text-charcoal-700 cursor-pointer">
              <input
                type="checkbox"
                checked={active}
                onChange={(e) => setActive(e.target.checked)}
                className="w-4 h-4 accent-charcoal-900"
              />
              Active
            </label>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 p-5 border-t border-paper-200">
          <button
            type="button"
            onClick={onClose}
            disabled={saving || uploading}
            className="text-sm text-charcoal-600 hover:text-charcoal-900 px-4 py-2 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving || uploading}
            className="bg-charcoal-900 text-white text-xs uppercase tracking-wider px-5 py-2.5 hover:bg-charcoal-800 transition-colors disabled:opacity-50"
          >
            {saving
              ? isEdit
                ? 'Saving…'
                : 'Creating…'
              : isEdit
                ? 'Save Changes'
                : 'Create Brand'}
          </button>
        </div>
      </form>
    </div>
  )
}
