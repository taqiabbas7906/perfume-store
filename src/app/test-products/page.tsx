'use client'

import { useState } from 'react'
import type { CSSProperties } from 'react'
import { authFetch } from '@/lib/api'

interface Variant {
  sku: string
  label: string
  originalPrice: number
  discountedPrice?: number
  quantity: number
  options?: Record<string, unknown>
}

type ProductType = 'perfume' | 'lipstick' | 'other'

export default function TestProductsPage() {
  const [result, setResult] = useState('')

  const [productType, setProductType] = useState<ProductType>('perfume')
  const [name, setName] = useState('Oud Royal')
  const [slug, setSlug] = useState('oud-royal')
  const [description, setDescription] = useState(
    'Luxurious oud fragrance with rich woody notes'
  )
  const [category, setCategory] = useState('fragrance')
  const [brand, setBrand] = useState('Arabian Oud')
  const [featured, setFeatured] = useState(true)
  const [tags, setTags] = useState('luxury,oud,arabian')

  // Perfume attributes
  const [topNotes, setTopNotes] = useState('Bergamot,Saffron')
  const [middleNotes, setMiddleNotes] = useState('Rose,Oud')
  const [baseNotes, setBaseNotes] = useState('Amber,Musk')
  const [concentration, setConcentration] = useState<
    'EDT' | 'EDP' | 'Parfum' | 'EDC' | 'Extrait'
  >('EDP')
  const [gender, setGender] = useState<'men' | 'women' | 'unisex'>('men')

  // Lipstick attributes
  const [shade, setShade] = useState('Ruby Red')
  const [finish, setFinish] = useState<'matte' | 'gloss' | 'satin' | 'metallic' | 'sheer'>('matte')

  const [variants, setVariants] = useState<Variant[]>([
    {
      sku: 'OUD-50ML',
      label: '50ml',
      originalPrice: 150,
      discountedPrice: 120,
      quantity: 10,
      options: { volumeMl: 50 },
    },
    {
      sku: 'OUD-100ML',
      label: '100ml',
      originalPrice: 250,
      discountedPrice: 200,
      quantity: 5,
      options: { volumeMl: 100 },
    },
  ])

  const [getSlug, setGetSlug] = useState('')
  const [deleteSlug, setDeleteSlug] = useState('')

  const updateVariant = (i: number, field: keyof Variant, value: unknown) => {
    setVariants((prev) => {
      const next = [...prev]
      next[i] = { ...next[i], [field]: value }
      return next
    })
  }

  const addVariant = () =>
    setVariants((prev) => [
      ...prev,
      {
        sku: '',
        label: '',
        originalPrice: 0,
        discountedPrice: undefined,
        quantity: 0,
        options: {},
      },
    ])

  const removeVariant = (i: number) =>
    setVariants((prev) => prev.filter((_, idx) => idx !== i))

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
      return { shade, finish }
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
        headers: {
          'Content-Type': 'application/json',
        },
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
    try {
      const res = await fetch('/api/products?limit=20&sort=newest')
      setResult(await safeJson(res))
    } catch (err) {
      setResult(JSON.stringify({ error: (err as Error).message }, null, 2))
    }
  }

  const getOne = async () => {
    if (!getSlug) return setResult('Please enter a slug')

    try {
      const res = await fetch(`/api/products/${encodeURIComponent(getSlug)}`)
      setResult(await safeJson(res))
    } catch (err) {
      setResult(JSON.stringify({ error: (err as Error).message }, null, 2))
    }
  }

  const remove = async () => {
    if (!deleteSlug) return setResult('Please enter a slug to delete')

    try {
      const res = await authFetch(
        `/api/products/${encodeURIComponent(deleteSlug)}`,
        { method: 'DELETE' }
      )
      setResult(await safeJson(res))
    } catch (err) {
      setResult(JSON.stringify({ error: (err as Error).message }, null, 2))
    }
  }

  const inputStyle: CSSProperties = {
    width: '100%',
    padding: '8px',
    marginBottom: '10px',
    border: '1px solid #ddd',
    borderRadius: '4px',
    color: '#111',
    background: '#fff',
  }

  const buttonStyle: CSSProperties = {
    padding: '10px 20px',
    margin: '5px',
    border: 'none',
    borderRadius: '5px',
    cursor: 'pointer',
    fontWeight: 'bold',
  }

  return (
    <div style={{ padding: '20px', maxWidth: '1400px', margin: '0 auto', color: '#111' }}>
      <h1>Test Products API</h1>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px' }}>
        <div style={{ border: '1px solid #ddd', padding: '20px', borderRadius: '8px', background: '#fff' }}>
          <h2>Create Product</h2>

          <label>Product Type:</label>
          <select
            value={productType}
            onChange={(e) => setProductType(e.target.value as ProductType)}
            style={inputStyle}
          >
            <option value="perfume">Perfume</option>
            <option value="lipstick">Lipstick</option>
            <option value="other">Other</option>
          </select>

          <label>Name:</label>
          <input value={name} onChange={(e) => setName(e.target.value)} style={inputStyle} />

          <label>Slug:</label>
          <input value={slug} onChange={(e) => setSlug(e.target.value)} style={inputStyle} />

          <label>Description:</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            style={{ ...inputStyle, height: '60px' }}
          />

          <label>Category:</label>
          <input value={category} onChange={(e) => setCategory(e.target.value)} style={inputStyle} />

          <label>Brand:</label>
          <input value={brand} onChange={(e) => setBrand(e.target.value)} style={inputStyle} />

          <label>Tags:</label>
          <input value={tags} onChange={(e) => setTags(e.target.value)} style={inputStyle} />

          <label style={{ display: 'flex', alignItems: 'center', marginBottom: '10px' }}>
            <input
              type="checkbox"
              checked={featured}
              onChange={(e) => setFeatured(e.target.checked)}
              style={{ marginRight: '8px' }}
            />
            Featured
          </label>

          <button
            onClick={create}
            style={{ ...buttonStyle, background: '#0070f3', color: '#fff', width: '100%' }}
          >
            Create Product
          </button>
        </div>

        <div>
          <button onClick={list} style={{ ...buttonStyle, background: '#28a745', color: '#fff', width: '100%' }}>
            List Products
          </button>

          <input
            value={getSlug}
            onChange={(e) => setGetSlug(e.target.value)}
            style={inputStyle}
            placeholder="slug"
          />

          <button onClick={getOne} style={{ ...buttonStyle, background: '#17a2b8', color: '#fff', width: '100%' }}>
            Get Product
          </button>

          <input
            value={deleteSlug}
            onChange={(e) => setDeleteSlug(e.target.value)}
            style={inputStyle}
            placeholder="slug"
          />

          <button onClick={remove} style={{ ...buttonStyle, background: '#dc3545', color: '#fff', width: '100%' }}>
            Delete Product
          </button>
        </div>
      </div>

      <pre style={{ marginTop: '20px', background: '#0b1020', color: '#e6edf3', padding: '15px' }}>
        {result || 'Results will appear here'}
      </pre>
    </div>
  )
}