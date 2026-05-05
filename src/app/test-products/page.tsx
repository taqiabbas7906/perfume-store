'use client'

import { useState } from 'react'
import type { CSSProperties } from 'react'
import { authFetch } from '@/lib/api'

type ProductType = 'perfume' | 'lipstick' | 'other'

interface Variant {
  sku: string
  label: string
  originalPrice: number
  discountedPrice?: number
  quantity: number
  options?: Record<string, unknown>
}

export default function TestProductsPage() {
  const [result, setResult] = useState<string>('')

  const [productType, setProductType] = useState<ProductType>('perfume')

  const [name, setName] = useState('Oud Royal')
  const [slug, setSlug] = useState('oud-royal')
  const [description, setDescription] = useState(
    'Luxurious fragrance with deep oriental notes'
  )

  const [brand, setBrand] = useState('Arabian Oud')
  const [category, setCategory] = useState('fragrance')
  const [tags, setTags] = useState('luxury,oud,arabian')

  const [featured, setFeatured] = useState(true)

  /* ───────── Perfume ───────── */
  const [topNotes, setTopNotes] = useState('Bergamot,Saffron')
  const [middleNotes, setMiddleNotes] = useState('Rose,Oud')
  const [baseNotes, setBaseNotes] = useState('Amber,Musk')
  const [concentration, setConcentration] =
    useState<'EDT' | 'EDP' | 'Parfum' | 'EDC' | 'Extrait'>('EDP')
  const [gender, setGender] =
    useState<'men' | 'women' | 'unisex'>('men')

  /* ───────── Lipstick ───────── */
  const [shade, setShade] = useState('Ruby Red')
  const [finish, setFinish] =
    useState<'matte' | 'gloss' | 'satin' | 'metallic' | 'sheer'>('matte')

  /* ───────── Variants ───────── */
  const [variants, setVariants] = useState<Variant[]>([
    {
      sku: 'OUD-50',
      label: '50ml',
      originalPrice: 150,
      discountedPrice: 120,
      quantity: 10,
      options: { volumeMl: 50 },
    },
    {
      sku: 'OUD-100',
      label: '100ml',
      originalPrice: 250,
      discountedPrice: 200,
      quantity: 5,
      options: { volumeMl: 100 },
    },
  ])

  const [getSlug, setGetSlug] = useState('')
  const [deleteSlug, setDeleteSlug] = useState('')

  /* ───────── Helpers ───────── */

  const updateVariant = (i: number, field: keyof Variant, value: any) => {
    setVariants((prev) => {
      const next = [...prev]
      next[i] = { ...next[i], [field]: value }
      return next
    })
  }

  const addVariant = () => {
    setVariants((prev) => [
      ...prev,
      {
        sku: '',
        label: '',
        originalPrice: 0,
        quantity: 0,
        options: {},
      },
    ])
  }

  const removeVariant = (i: number) => {
    setVariants((prev) => prev.filter((_, idx) => idx !== i))
  }

  const buildAttributes = () => {
    if (productType === 'perfume') {
      return {
        notes: {
          top: topNotes.split(',').map((s) => s.trim()).filter(Boolean),
          middle: middleNotes.split(',').map((s) => s.trim()).filter(Boolean),
          base: baseNotes.split(',').map((s) => s.trim()).filter(Boolean),
        },
        concentration,
        gender,
      }
    }

    if (productType === 'lipstick') {
      return {
        shade,
        finish,
      }
    }

    return {}
  }

  const safeJson = async (res: Response) => {
    try {
      return JSON.stringify(await res.json(), null, 2)
    } catch {
      return `HTTP ${res.status}`
    }
  }

  /* ───────── API Actions ───────── */

  const create = async () => {
    try {
      const payload = {
        productType,
        name,
        slug,
        description,
        brand,
        category,
        tags: tags.split(',').map((s) => s.trim()).filter(Boolean),
        images: [],
        variants,
        attributes: buildAttributes(),
        featured,
        active: true,
      }

      const res = await authFetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      setResult(await safeJson(res))

      if (res.ok) {
        setGetSlug(slug)
        setDeleteSlug(slug)
      }
    } catch (err) {
      setResult(JSON.stringify({ error: (err as Error).message }, null, 2))
    }
  }

  const list = async () => {
    const res = await fetch('/api/products?limit=20&sort=newest')
    setResult(await safeJson(res))
  }

  const getOne = async () => {
    if (!getSlug) return setResult('Enter slug')

    const res = await fetch(`/api/products/${encodeURIComponent(getSlug)}`)
    setResult(await safeJson(res))
  }

  const remove = async () => {
    if (!deleteSlug) return setResult('Enter slug')

    const res = await authFetch(
      `/api/products/${encodeURIComponent(deleteSlug)}`,
      { method: 'DELETE' }
    )

    setResult(await safeJson(res))
  }

  /* ───────── UI ───────── */

  const inputStyle: CSSProperties = {
    width: '100%',
    padding: 8,
    marginBottom: 10,
    border: '1px solid #ddd',
    borderRadius: 4,
  }

  const btn: CSSProperties = {
    padding: '10px 16px',
    margin: 5,
    borderRadius: 6,
    border: 'none',
    cursor: 'pointer',
    fontWeight: 600,
  }

  return (
    <div style={{ padding: 20, maxWidth: 1200, margin: '0 auto' }}>
      <h1>Product Test Panel</h1>

      {/* TYPE */}
      <label>Type</label>
      <select
        value={productType}
        onChange={(e) => setProductType(e.target.value as ProductType)}
        style={inputStyle}
      >
        <option value="perfume">Perfume</option>
        <option value="lipstick">Lipstick</option>
        <option value="other">Other</option>
      </select>

      {/* BASIC INFO */}
      <input value={name} onChange={(e) => setName(e.target.value)} style={inputStyle} placeholder="Name" />
      <input value={slug} onChange={(e) => setSlug(e.target.value)} style={inputStyle} placeholder="Slug" />
      <textarea value={description} onChange={(e) => setDescription(e.target.value)} style={inputStyle} />

      <input value={brand} onChange={(e) => setBrand(e.target.value)} style={inputStyle} placeholder="Brand" />
      <input value={category} onChange={(e) => setCategory(e.target.value)} style={inputStyle} placeholder="Category" />
      <input value={tags} onChange={(e) => setTags(e.target.value)} style={inputStyle} placeholder="tags comma separated" />

      {/* ATTRIBUTES */}
      {productType === 'perfume' && (
        <>
          <h3>Perfume Attributes</h3>
          <input value={topNotes} onChange={(e) => setTopNotes(e.target.value)} style={inputStyle} placeholder="Top Notes" />
          <input value={middleNotes} onChange={(e) => setMiddleNotes(e.target.value)} style={inputStyle} placeholder="Middle Notes" />
          <input value={baseNotes} onChange={(e) => setBaseNotes(e.target.value)} style={inputStyle} placeholder="Base Notes" />
        </>
      )}

      {productType === 'lipstick' && (
        <>
          <h3>Lipstick Attributes</h3>
          <input value={shade} onChange={(e) => setShade(e.target.value)} style={inputStyle} />
          <select value={finish} onChange={(e) => setFinish(e.target.value as any)} style={inputStyle}>
            <option value="matte">Matte</option>
            <option value="gloss">Gloss</option>
            <option value="satin">Satin</option>
            <option value="metallic">Metallic</option>
            <option value="sheer">Sheer</option>
          </select>
        </>
      )}

      {/* VARIANTS */}
      <h3>Variants (SKU-based)</h3>

      {variants.map((v, i) => (
        <div key={i} style={{ border: '1px solid #ddd', padding: 10, marginBottom: 10 }}>
          <input
            value={v.sku}
            onChange={(e) => updateVariant(i, 'sku', e.target.value)}
            placeholder="SKU"
            style={inputStyle}
          />
          <input
            value={v.label}
            onChange={(e) => updateVariant(i, 'label', e.target.value)}
            placeholder="Label"
            style={inputStyle}
          />
          <input
            type="number"
            value={v.originalPrice}
            onChange={(e) => updateVariant(i, 'originalPrice', Number(e.target.value))}
            style={inputStyle}
          />
          <input
            type="number"
            value={v.quantity}
            onChange={(e) => updateVariant(i, 'quantity', Number(e.target.value))}
            style={inputStyle}
          />

          <button onClick={() => removeVariant(i)} style={{ ...btn, background: '#dc3545', color: '#fff' }}>
            Remove
          </button>
        </div>
      ))}

      <button onClick={addVariant} style={{ ...btn, background: '#666', color: '#fff' }}>
        Add Variant
      </button>

      {/* ACTIONS */}
      <div style={{ marginTop: 20 }}>
        <button onClick={create} style={{ ...btn, background: '#0070f3', color: '#fff' }}>
          Create
        </button>
        <button onClick={list} style={{ ...btn, background: '#28a745', color: '#fff' }}>
          List
        </button>
        <button onClick={getOne} style={{ ...btn, background: '#17a2b8', color: '#fff' }}>
          Get
        </button>
        <button onClick={remove} style={{ ...btn, background: '#dc3545', color: '#fff' }}>
          Delete
        </button>
      </div>

      {/* RESULT */}
      <pre style={{ marginTop: 20, background: '#0b1020', color: '#fff', padding: 15 }}>
        {result || 'No result yet'}
      </pre>
    </div>
  )
}