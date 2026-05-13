'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { auth } from '@/lib/firebase'
import { authFetch } from '@/lib/api'
import { useAuth } from '@/context/AuthContext'

/* ─── local types ─── */

type ProductType = 'perfume' | 'lipstick' | 'makeup' | 'skincare' | 'jewelry' | 'other'

interface ImageSlot {
  url: string
  alt: string
  isPrimary: boolean
  publicId: string
  uploading: boolean
}

interface VariantRow {
  id: string
  sku: string
  label: string
  originalPrice: string
  discountedPrice: string
  quantity: string
}

/* ─── helpers ─── */

function slugify(n: string) {
  return n
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
}

let _uid = 0
function uid() { return String(++_uid) }

/* ══════════════════════════════════════════════
   PAGE
══════════════════════════════════════════════ */

export default function NewProductPage() {
  const router = useRouter()
  const { user } = useAuth()
  const fileRef = useRef<HTMLInputElement>(null)

  const [checked, setChecked]   = useState(false)
  const [isAdmin, setIsAdmin]   = useState(false)
  const [brands, setBrands]     = useState<{ _id: string; name: string }[]>([])
  const [cats, setCats]         = useState<{ _id: string; name: string; slug: string }[]>([])

  /* basic fields */
  const [name, setName]               = useState('')
  const [slug, setSlug]               = useState('')
  const [slugManual, setSlugManual]   = useState(false)
  const [description, setDescription] = useState('')
  const [productType, setProductType] = useState<ProductType>('perfume')
  const [brand, setBrand]             = useState('')
  const [category, setCategory]       = useState('')
  const [tagsInput, setTagsInput]     = useState('')

  /* toggles */
  const [active, setActive]               = useState(true)
  const [featured, setFeatured]           = useState(false)
  const [freeDelivery, setFreeDelivery]   = useState(false)
  const [isLimited, setIsLimited]         = useState(false)
  const [isSample, setIsSample]           = useState(false)
  const [giftOn, setGiftOn]               = useState(false)
  const [giftPrice, setGiftPrice]         = useState('0')

  /* images */
  const [images, setImages]             = useState<ImageSlot[]>([])
  const [uploading, setUploading]       = useState(0)

  /* variants */
  const [variants, setVariants] = useState<VariantRow[]>([
    { id: uid(), sku: '', label: '', originalPrice: '', discountedPrice: '', quantity: '0' },
  ])

  /* perfume attrs */
  const [pfConc, setPfConc]           = useState('')
  const [pfGender, setPfGender]       = useState('')
  const [pfLong, setPfLong]           = useState('')
  const [pfSill, setPfSill]           = useState('')
  const [pfYear, setPfYear]           = useState('')
  const [pfTop, setPfTop]             = useState('')
  const [pfMid, setPfMid]             = useState('')
  const [pfBase, setPfBase]           = useState('')

  /* lipstick attrs */
  const [lsFinish, setLsFinish]       = useState('')
  const [lsShade, setLsShade]         = useState('')
  const [lsForm, setLsForm]           = useState('')
  const [lsLong, setLsLong]           = useState(false)
  const [lsSpf, setLsSpf]             = useState('')

  /* SEO */
  const [seoTitle, setSeoTitle]       = useState('')
  const [seoDesc, setSeoDesc]         = useState('')
  const [seoCanonical, setSeoCanonical] = useState('')

  /* flash sale */
  const [flashActive, setFlashActive]     = useState(false)
  const [flashDiscount, setFlashDiscount] = useState('')
  const [flashStart, setFlashStart]       = useState('')
  const [flashEnd, setFlashEnd]           = useState('')

  /* submit */
  const [saving, setSaving]     = useState(false)
  const [error, setError]       = useState('')
  const [fieldErrors, setFieldErrors] = useState<string[]>([])

  /* ── auth check + load options ── */
  useEffect(() => {
    if (!user) return
    authFetch('/api/auth/me')
      .then(r => r.json())
      .then(d => {
        if (d.user?.role !== 'admin') { router.push('/'); return }
        setIsAdmin(true)
        Promise.all([
          authFetch('/api/admin/brands').then(r => r.json()),
          authFetch('/api/admin/categories').then(r => r.json()),
        ]).then(([b, c]) => {
          if (Array.isArray(b.brands))      setBrands(b.brands)
          if (Array.isArray(c.categories))  setCats(c.categories)
        }).catch(() => {})
      })
      .catch(() => router.push('/'))
      .finally(() => setChecked(true))
  }, [user, router])

  /* ── auto-slug ── */
  useEffect(() => {
    if (!slugManual) setSlug(slugify(name))
  }, [name, slugManual])

  /* ── image upload ── */
  const handleFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    if (!files.length) return
    e.target.value = ''

    for (const file of files) {
      const tempId = `tmp-${uid()}`
      setImages(prev => [
        ...prev,
        { url: '', alt: '', isPrimary: prev.length === 0, publicId: tempId, uploading: true },
      ])
      setUploading(n => n + 1)

      try {
        const u = auth.currentUser
        if (!u) throw new Error('Not authenticated')
        const token = await u.getIdToken(true)

        const fd = new FormData()
        fd.append('file', file)
        fd.append('folder', 'products')

        const res  = await fetch('/api/admin/upload', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: fd,
        })
        const data = await res.json()
        if (!data.success) throw new Error(data.error || 'Upload failed')

        setImages(prev => prev.map(img =>
          img.publicId === tempId
            ? { url: data.url, alt: '', isPrimary: img.isPrimary, publicId: data.publicId, uploading: false }
            : img
        ))
      } catch (err) {
        setImages(prev => prev.filter(img => img.publicId !== tempId))
        setError((err as Error).message)
      } finally {
        setUploading(n => n - 1)
      }
    }
  }

  const deleteImage = async (img: ImageSlot) => {
    const wasPrimary = img.isPrimary
    setImages(prev => {
      const next = prev.filter(i => i.publicId !== img.publicId)
      if (wasPrimary && next.length > 0) next[0] = { ...next[0], isPrimary: true }
      return next
    })
    authFetch('/api/admin/upload', {
      method: 'DELETE',
      body: JSON.stringify({ publicId: img.publicId }),
    }).catch(() => {})
  }

  const setPrimary = (publicId: string) =>
    setImages(prev => prev.map(i => ({ ...i, isPrimary: i.publicId === publicId })))

  /* ── variants ── */
  const addVariant = () =>
    setVariants(prev => [...prev, { id: uid(), sku: '', label: '', originalPrice: '', discountedPrice: '', quantity: '0' }])

  const removeVariant = (id: string) =>
    setVariants(prev => prev.length > 1 ? prev.filter(v => v.id !== id) : prev)

  const patchVariant = (id: string, field: keyof Omit<VariantRow, 'id'>, val: string) =>
    setVariants(prev => prev.map(v => v.id === id ? { ...v, [field]: val } : v))

  /* ── build attributes ── */
  const buildAttrs = () => {
    if (productType === 'perfume') {
      const a: Record<string, unknown> = {}
      if (pfConc)   a.concentration = pfConc
      if (pfGender) a.gender        = pfGender
      if (pfLong)   a.longevity     = pfLong
      if (pfSill)   a.sillage       = pfSill
      if (pfYear)   a.yearLaunched  = parseInt(pfYear)
      const notes: Record<string, string[]> = {}
      const split = (s: string) => s.split(',').map(x => x.trim()).filter(Boolean)
      if (pfTop)  notes.top    = split(pfTop)
      if (pfMid)  notes.middle = split(pfMid)
      if (pfBase) notes.base   = split(pfBase)
      if (Object.keys(notes).length) a.notes = notes
      return a
    }
    if (productType === 'lipstick') {
      const a: Record<string, unknown> = {}
      if (lsFinish) a.finish      = lsFinish
      if (lsShade)  a.shade       = lsShade
      if (lsForm)   a.formulation = lsForm
      a.longLasting = lsLong
      if (lsSpf)    a.spfProtection = parseInt(lsSpf)
      return a
    }
    return {}
  }

  /* ── submit ── */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setFieldErrors([])

    if (uploading > 0) { setError('Please wait for all images to finish uploading'); return }

    if (description.trim().length < 10) { setError('Description must be at least 10 characters'); return }

    const skuErrors: string[] = []
    const skuSet = new Set<string>()
    const skuRe = /^[A-Za-z0-9._\-]+$/
    for (const v of variants) {
      const sku = v.sku.trim()
      if (sku.length < 3) { skuErrors.push(`SKU "${sku || '(empty)'}" must be at least 3 characters`) }
      else if (!skuRe.test(sku)) { skuErrors.push(`SKU "${sku}" contains invalid characters (use letters, numbers, ., -, _)`) }
      else if (skuSet.has(sku)) { skuErrors.push(`Duplicate SKU: ${sku}`) }
      skuSet.add(sku)
    }
    if (skuErrors.length > 0) { setError(skuErrors[0]); return }

    const payload = {
      productType,
      name:        name.trim(),
      slug:        slug.trim(),
      description: description.trim(),
      brand:       brand.trim(),
      category:    category.trim(),
      tags:        tagsInput.split(',').map(t => t.trim()).filter(Boolean),
      images:      images.map(({ url, alt, isPrimary }) => ({ url, alt, isPrimary })),
      variants:    variants.map(v => ({
        sku:            v.sku.trim(),
        label:          v.label.trim(),
        originalPrice:  parseFloat(v.originalPrice) || 0,
        ...(v.discountedPrice.trim() ? { discountedPrice: parseFloat(v.discountedPrice) } : {}),
        quantity:       parseInt(v.quantity) || 0,
      })),
      featured,
      active,
      freeDelivery,
      isLimitedEdition: isLimited,
      isSample,
      giftWrapping: { available: giftOn, price: parseFloat(giftPrice) || 0 },
      attributes:   buildAttrs(),
      seo: {
        ...(seoTitle.trim()     && { metaTitle:       seoTitle.trim() }),
        ...(seoDesc.trim()      && { metaDescription: seoDesc.trim() }),
        ...(seoCanonical.trim() && { canonicalUrl:    seoCanonical.trim() }),
      },
      flashSale: {
        active:          flashActive,
        discountPercent: parseFloat(flashDiscount) || 0,
        ...(flashStart && { startsAt: new Date(flashStart).toISOString() }),
        ...(flashEnd   && { endsAt:   new Date(flashEnd).toISOString() }),
      },
    }

    setSaving(true)
    try {
      const res  = await authFetch('/api/products', { method: 'POST', body: JSON.stringify(payload) })
      const data = await res.json()
      if (data.success) {
        router.push('/admin/products')
      } else if (data.errors) {
        const msgs = Object.entries(data.errors as Record<string, string[]>)
          .flatMap(([field, errs]) => errs.map(e => `${field}: ${e}`))
        setFieldErrors(msgs)
        setError(data.error || 'Please fix the errors below')
      } else {
        setError(data.error || 'Failed to create product')
      }
    } catch {
      setError('Network error')
    } finally {
      setSaving(false)
    }
  }

  /* ── render guards ── */
  if (!checked) return <div className="container mx-auto px-4 py-10 text-gray-400">Checking access…</div>
  if (!isAdmin)  return null

  /* ══════════════════ JSX ══════════════════ */
  return (
    <form onSubmit={handleSubmit} className="container mx-auto px-4 py-8 max-w-6xl">

      {/* header */}
      <div className="flex flex-wrap justify-between items-center gap-4 mb-8">
        <div>
          <Link href="/admin/products" className="text-sm text-blue-600 hover:underline">← Products</Link>
          <h1 className="text-3xl font-bold mt-1">New product</h1>
        </div>
        <div className="flex gap-3">
          <Link href="/admin/products" className="px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50">
            Cancel
          </Link>
          <button
            type="submit"
            disabled={saving || uploading > 0}
            className="px-6 py-2 bg-black text-white rounded-lg text-sm disabled:opacity-50 hover:bg-gray-900"
          >
            {saving ? 'Creating…' : 'Create product'}
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-6 px-4 py-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
          <p className="font-medium">{error}</p>
          {fieldErrors.length > 0 && (
            <ul className="mt-1 list-disc list-inside space-y-0.5 text-xs">
              {fieldErrors.map((msg, i) => <li key={i}>{msg}</li>)}
            </ul>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* ── left column ── */}
        <div className="lg:col-span-2 space-y-6">

          {/* basic info */}
          <Card title="Basic information">
            <Field label="Product name" required>
              <input
                type="text" value={name} onChange={e => setName(e.target.value)}
                required placeholder="Oud Royale Eau de Parfum" className={inp}
              />
            </Field>

            <Field label="Slug" required hint="Auto-generated from name. URL-safe, lowercase, hyphen-separated.">
              <input
                type="text" value={slug}
                onChange={e => { setSlug(e.target.value); setSlugManual(true) }}
                required placeholder="oud-royale-eau-de-parfum" className={inp}
              />
            </Field>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Product type" required>
                <select value={productType} onChange={e => setProductType(e.target.value as ProductType)} required className={inp}>
                  {(['perfume','lipstick','makeup','skincare','jewelry','other'] as ProductType[]).map(t => (
                    <option key={t} value={t}>{t[0].toUpperCase() + t.slice(1)}</option>
                  ))}
                </select>
              </Field>

              <Field label="Brand" required>
                <input
                  list="brand-list" value={brand} onChange={e => setBrand(e.target.value)}
                  required placeholder="Chanel, Dior…" className={inp}
                />
                <datalist id="brand-list">
                  {brands.map(b => <option key={b._id} value={b.name} />)}
                </datalist>
              </Field>
            </div>

            <Field label="Category" required>
              <input
                list="cat-list" value={category} onChange={e => setCategory(e.target.value)}
                required placeholder="women, men, skincare…" className={inp}
              />
              <datalist id="cat-list">
                {cats.map(c => <option key={c._id} value={c.slug} label={c.name} />)}
              </datalist>
            </Field>

            <Field label="Description" required>
              <textarea
                value={description} onChange={e => setDescription(e.target.value)}
                required rows={4} placeholder="Describe this product…"
                className={`${inp} resize-none`}
              />
            </Field>
          </Card>

          {/* images */}
          <Card title="Images">
            <p className="text-xs text-gray-500 -mt-2 mb-3">
              Upload up to 20 images (JPEG, PNG, WebP, GIF · max 8 MB each).
              Click a thumbnail to set it as the primary image.
            </p>

            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
              {images.map(img => (
                <div
                  key={img.publicId}
                  onClick={() => !img.uploading && setPrimary(img.publicId)}
                  className={`relative aspect-square rounded-xl overflow-hidden cursor-pointer border-2 transition-colors ${
                    img.isPrimary ? 'border-black' : 'border-gray-200 hover:border-gray-400'
                  } ${img.uploading ? 'bg-gray-50' : 'bg-white'}`}
                >
                  {img.uploading ? (
                    <div className="w-full h-full flex items-center justify-center">
                      <span className="w-6 h-6 border-2 border-gray-200 border-t-gray-500 rounded-full animate-spin" />
                    </div>
                  ) : (
                    <>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={img.url} alt={img.alt || 'product'} className="w-full h-full object-cover" />
                      {img.isPrimary && (
                        <span className="absolute top-1 left-1 bg-black text-white text-[9px] px-1.5 py-0.5 rounded-full">
                          Primary
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={ev => { ev.stopPropagation(); deleteImage(img) }}
                        className="absolute top-1 right-1 w-5 h-5 bg-white/90 rounded-full text-red-500 text-xs flex items-center justify-center shadow hover:bg-red-50"
                      >
                        ×
                      </button>
                    </>
                  )}
                </div>
              ))}

              {/* upload trigger */}
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="aspect-square rounded-xl border-2 border-dashed border-gray-300 flex flex-col items-center justify-center text-gray-400 hover:border-gray-500 hover:text-gray-600 transition-colors"
              >
                <span className="text-2xl leading-none mb-1">+</span>
                <span className="text-xs">Add image</span>
              </button>
            </div>

            <input
              ref={fileRef} type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              multiple className="hidden" onChange={handleFiles}
            />

            {uploading > 0 && (
              <p className="text-xs text-gray-500 mt-2">
                Uploading {uploading} image{uploading > 1 ? 's' : ''}…
              </p>
            )}
          </Card>

          {/* variants */}
          <Card title="Variants" hint="At least one variant required. Each variant has its own SKU, price and stock.">
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[560px]">
                <thead>
                  <tr className="text-left text-xs text-gray-500 uppercase border-b border-gray-100">
                    <th className="pb-2 pr-2 font-medium">SKU</th>
                    <th className="pb-2 pr-2 font-medium">Label</th>
                    <th className="pb-2 pr-2 font-medium">Price ($)</th>
                    <th className="pb-2 pr-2 font-medium">Sale ($)</th>
                    <th className="pb-2 pr-2 font-medium w-20">Stock</th>
                    <th className="pb-2 w-6" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {variants.map(v => (
                    <tr key={v.id}>
                      <td className="py-2 pr-2">
                        <input
                          type="text" value={v.sku}
                          onChange={e => patchVariant(v.id, 'sku', e.target.value)}
                          required placeholder="SKU-001"
                          className={`${inp} font-mono text-xs`}
                        />
                      </td>
                      <td className="py-2 pr-2">
                        <input
                          type="text" value={v.label}
                          onChange={e => patchVariant(v.id, 'label', e.target.value)}
                          required placeholder="100ml"
                          className={inp}
                        />
                      </td>
                      <td className="py-2 pr-2">
                        <input
                          type="number" value={v.originalPrice}
                          onChange={e => patchVariant(v.id, 'originalPrice', e.target.value)}
                          required min="0" step="0.01" placeholder="0.00"
                          className={inp}
                        />
                      </td>
                      <td className="py-2 pr-2">
                        <input
                          type="number" value={v.discountedPrice}
                          onChange={e => patchVariant(v.id, 'discountedPrice', e.target.value)}
                          min="0" step="0.01" placeholder="—"
                          className={inp}
                        />
                      </td>
                      <td className="py-2 pr-2">
                        <input
                          type="number" value={v.quantity}
                          onChange={e => patchVariant(v.id, 'quantity', e.target.value)}
                          required min="0" step="1"
                          className={inp}
                        />
                      </td>
                      <td className="py-2 text-center">
                        <button
                          type="button" onClick={() => removeVariant(v.id)}
                          disabled={variants.length === 1}
                          className="text-red-400 hover:text-red-600 disabled:opacity-25 text-lg leading-none"
                        >×</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <button type="button" onClick={addVariant} className="mt-3 text-sm text-blue-600 hover:underline">
              + Add variant
            </button>
          </Card>

          {/* perfume attributes */}
          {productType === 'perfume' && (
            <Card title="Perfume details">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Concentration">
                  <select value={pfConc} onChange={e => setPfConc(e.target.value)} className={inp}>
                    <option value="">— none —</option>
                    {['EDC','EDT','EDP','Parfum','Extrait'].map(c => <option key={c}>{c}</option>)}
                  </select>
                </Field>
                <Field label="Gender">
                  <select value={pfGender} onChange={e => setPfGender(e.target.value)} className={inp}>
                    <option value="">— none —</option>
                    {['men','women','unisex'].map(g => (
                      <option key={g} value={g}>{g[0].toUpperCase() + g.slice(1)}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Longevity">
                  <select value={pfLong} onChange={e => setPfLong(e.target.value)} className={inp}>
                    <option value="">— none —</option>
                    {['low','moderate','long','eternal'].map(l => (
                      <option key={l} value={l}>{l[0].toUpperCase() + l.slice(1)}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Sillage">
                  <select value={pfSill} onChange={e => setPfSill(e.target.value)} className={inp}>
                    <option value="">— none —</option>
                    {['soft','moderate','strong','enormous'].map(s => (
                      <option key={s} value={s}>{s[0].toUpperCase() + s.slice(1)}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Year launched">
                  <input
                    type="number" value={pfYear} onChange={e => setPfYear(e.target.value)}
                    min="1800" max={new Date().getFullYear() + 1} placeholder="2024"
                    className={inp}
                  />
                </Field>
              </div>

              <Field label="Top notes" hint="Comma-separated — e.g. bergamot, lemon, pink pepper">
                <input type="text" value={pfTop} onChange={e => setPfTop(e.target.value)} placeholder="bergamot, lemon" className={inp} />
              </Field>
              <Field label="Heart (middle) notes" hint="Comma-separated">
                <input type="text" value={pfMid} onChange={e => setPfMid(e.target.value)} placeholder="rose, jasmine, iris" className={inp} />
              </Field>
              <Field label="Base notes" hint="Comma-separated">
                <input type="text" value={pfBase} onChange={e => setPfBase(e.target.value)} placeholder="sandalwood, musk, amber" className={inp} />
              </Field>
            </Card>
          )}

          {/* lipstick attributes */}
          {productType === 'lipstick' && (
            <Card title="Lipstick details">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Finish">
                  <select value={lsFinish} onChange={e => setLsFinish(e.target.value)} className={inp}>
                    <option value="">— none —</option>
                    {['matte','gloss','satin','metallic','sheer'].map(f => (
                      <option key={f} value={f}>{f[0].toUpperCase() + f.slice(1)}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Formulation">
                  <select value={lsForm} onChange={e => setLsForm(e.target.value)} className={inp}>
                    <option value="">— none —</option>
                    {['liquid','stick','pencil','balm'].map(f => (
                      <option key={f} value={f}>{f[0].toUpperCase() + f.slice(1)}</option>
                    ))}
                  </select>
                </Field>
              </div>
              <Field label="Shade name">
                <input type="text" value={lsShade} onChange={e => setLsShade(e.target.value)} placeholder="Ruby Rose" className={inp} />
              </Field>
              <Field label="SPF protection" hint="Leave blank if none">
                <input type="number" value={lsSpf} onChange={e => setLsSpf(e.target.value)} min="0" max="100" placeholder="0" className={inp} />
              </Field>
              <label className="flex items-center gap-2 cursor-pointer text-sm">
                <input type="checkbox" checked={lsLong} onChange={e => setLsLong(e.target.checked)} className="rounded" />
                Long-lasting formula
              </label>
            </Card>
          )}

        </div>

        {/* ── right column ── */}
        <div className="space-y-6">

          <Card title="Status &amp; visibility">
            <Toggle id="active"    label="Active (visible to customers)"  checked={active}       onChange={setActive} />
            <Toggle id="featured"  label="Featured on homepage"           checked={featured}     onChange={setFeatured} />
            <Toggle id="freeDeliv" label="Free delivery"                  checked={freeDelivery} onChange={setFreeDelivery} />
            <Toggle id="limited"   label="Limited edition"                checked={isLimited}    onChange={setIsLimited} />
            <Toggle id="sample"    label="Sample / tester"                checked={isSample}     onChange={setIsSample} />
          </Card>

          <Card title="Gift wrapping">
            <Toggle id="giftOn" label="Offer gift wrapping" checked={giftOn} onChange={setGiftOn} />
            {giftOn && (
              <Field label="Wrapping fee ($)" className="mt-3">
                <input
                  type="number" value={giftPrice} onChange={e => setGiftPrice(e.target.value)}
                  min="0" step="0.01" className={inp}
                />
              </Field>
            )}
          </Card>

          <Card title="Tags">
            <p className="text-xs text-gray-500 -mt-2 mb-2">Comma-separated. Used for search and filtering.</p>
            <textarea
              value={tagsInput} onChange={e => setTagsInput(e.target.value)}
              rows={3} placeholder="luxury, floral, summer, gift"
              className={`${inp} resize-none`}
            />
          </Card>

          <Card title="SEO">
            <Field label="Meta title" hint="Max 60 chars. Defaults to product name if blank.">
              <input
                type="text" value={seoTitle} onChange={e => setSeoTitle(e.target.value)}
                maxLength={60} placeholder="Oud Royale – Best Oud Perfume for Men"
                className={inp}
              />
              <p className="text-xs text-gray-400 mt-0.5">{seoTitle.length}/60</p>
            </Field>
            <Field label="Meta description" hint="Max 160 chars. Shown in search results.">
              <textarea
                value={seoDesc} onChange={e => setSeoDesc(e.target.value)}
                maxLength={160} rows={2} placeholder="A rich, smoky oud fragrance with notes of rose and sandalwood…"
                className={`${inp} resize-none`}
              />
              <p className="text-xs text-gray-400 mt-0.5">{seoDesc.length}/160</p>
            </Field>
            <Field label="Canonical URL" hint="Only set if this product has a duplicate URL.">
              <input
                type="url" value={seoCanonical} onChange={e => setSeoCanonical(e.target.value)}
                placeholder="https://yoursite.com/products/oud-royale"
                className={inp}
              />
            </Field>
          </Card>

          <Card title="Flash Sale">
            <Toggle id="flashActive" label="Enable flash sale" checked={flashActive} onChange={setFlashActive} />
            {flashActive && (
              <div className="space-y-4 mt-3">
                <Field label="Discount %" hint="Applied on top of regular price (0–99).">
                  <input
                    type="number" value={flashDiscount} onChange={e => setFlashDiscount(e.target.value)}
                    min="0" max="99" step="1" placeholder="20"
                    className={inp}
                  />
                </Field>
                <Field label="Starts at" hint="Leave blank for immediate start.">
                  <input
                    type="datetime-local" value={flashStart} onChange={e => setFlashStart(e.target.value)}
                    className={inp}
                  />
                </Field>
                <Field label="Ends at" hint="Leave blank for no expiry.">
                  <input
                    type="datetime-local" value={flashEnd} onChange={e => setFlashEnd(e.target.value)}
                    className={inp}
                  />
                </Field>
              </div>
            )}
          </Card>

          <button
            type="submit"
            disabled={saving || uploading > 0}
            className="w-full py-3 bg-black text-white rounded-xl text-sm font-medium disabled:opacity-50 hover:bg-gray-900 transition-colors"
          >
            {saving
              ? 'Creating product…'
              : uploading > 0
              ? `Uploading ${uploading} image${uploading > 1 ? 's' : ''}…`
              : 'Create product'}
          </button>

        </div>
      </div>
    </form>
  )
}

/* ══════════════════════════════════════════════
   Shared sub-components
══════════════════════════════════════════════ */

const inp = 'w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-black/10'

function Card({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="border border-gray-200 rounded-xl p-5 bg-white">
      <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-1">{title}</h2>
      {hint && <p className="text-xs text-gray-400 mb-3">{hint}</p>}
      <div className="space-y-4 mt-3">{children}</div>
    </div>
  )
}

function Field({
  label, required, hint, className, children,
}: {
  label: string
  required?: boolean
  hint?: string
  className?: string
  children: React.ReactNode
}) {
  return (
    <div className={className}>
      <label className="block text-xs font-medium text-gray-600 mb-1">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
      {hint && <p className="text-xs text-gray-400 mt-1">{hint}</p>}
    </div>
  )
}

function Toggle({ id, label, checked, onChange }: {
  id: string; label: string; checked: boolean; onChange: (v: boolean) => void
}) {
  return (
    <label htmlFor={id} className="flex items-center gap-3 cursor-pointer py-0.5">
      <button
        id={id} type="button" role="switch" aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative w-9 h-5 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-black/20 ${checked ? 'bg-black' : 'bg-gray-200'}`}
      >
        <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-4' : ''}`} />
      </button>
      <span className="text-sm text-gray-700">{label}</span>
    </label>
  )
}
