'use client'

import { useState } from 'react'
import { authFetch } from '@/lib/api'

interface Sku {
  sku: string
  variant: string
  originalPrice: number
  discountedPrice?: number
  quantity: number
}

export default function TestProductsPage() {
  const [result, setResult] = useState('')
  
  const [name, setName] = useState('Oud Royal')
  const [slug, setSlug] = useState('oud-royal')
  const [description, setDescription] = useState('Luxurious oud fragrance with rich woody notes')
  const [category, setCategory] = useState<'men' | 'women' | 'unisex'>('men')
  const [brand, setBrand] = useState('Arabian Oud')
  const [featured, setFeatured] = useState(true)
  
  const [skus, setSkus] = useState<Sku[]>([
    {
      sku: 'OUD-50ML',
      variant: '50ml',
      originalPrice: 150,
      discountedPrice: 120,
      quantity: 10,
    },
    {
      sku: 'OUD-100ML',
      variant: '100ml',
      originalPrice: 250,
      discountedPrice: 200,
      quantity: 5,
    },
  ])
  
  const [updateSlug, setUpdateSlug] = useState('')
  const [deleteSlug, setDeleteSlug] = useState('')
  const [getSlug, setGetSlug] = useState('')

  const addSku = () => {
    setSkus([...skus, {
      sku: '',
      variant: '',
      originalPrice: 0,
      discountedPrice: 0,
      quantity: 0,
    }])
  }

  const removeSku = (index: number) => {
    setSkus(skus.filter((_, i) => i !== index))
  }

  const updateSku = (index: number, field: keyof Sku, value: any) => {
    const updated = [...skus]
    updated[index] = { ...updated[index], [field]: value }
    setSkus(updated)
  }

  const testCreateProduct = async () => {
    try {
      const res = await authFetch('/api/products', {
        method: 'POST',
        body: JSON.stringify({
          name,
          slug,
          description,
          category,
          brand,
          skus,
          images: [],
          featured,
          active: true,
        }),
      })
      
      const data = await res.json()
      setResult(JSON.stringify(data, null, 2))
      
      if (data.success) {
        setUpdateSlug(slug)
        setDeleteSlug(slug)
        setGetSlug(slug)
      }
    } catch (err: any) {
      setResult(JSON.stringify({ error: err.message }, null, 2))
    }
  }

  const testGetProducts = async () => {
    try {
      const res = await fetch('/api/products')
      const data = await res.json()
      setResult(JSON.stringify(data, null, 2))
    } catch (err: any) {
      setResult(JSON.stringify({ error: err.message }, null, 2))
    }
  }

  const testGetProduct = async () => {
    if (!getSlug) {
      setResult('Please enter a slug')
      return
    }
    
    try {
      const res = await fetch(`/api/products/${getSlug}`)
      const data = await res.json()
      setResult(JSON.stringify(data, null, 2))
    } catch (err: any) {
      setResult(JSON.stringify({ error: err.message }, null, 2))
    }
  }

  const testDeleteProduct = async () => {
    if (!deleteSlug) {
      setResult('Please enter a slug to delete')
      return
    }
    
    try {
      const res = await authFetch(`/api/products/${deleteSlug}`, {
        method: 'DELETE',
      })
      
      const data = await res.json()
      setResult(JSON.stringify(data, null, 2))
    } catch (err: any) {
      setResult(JSON.stringify({ error: err.message }, null, 2))
    }
  }

  const inputStyle = {
    width: '100%',
    padding: '8px',
    marginBottom: '10px',
    border: '1px solid #ddd',
    borderRadius: '4px',
  }

  const buttonStyle = {
    padding: '10px 20px',
    margin: '5px',
    border: 'none',
    borderRadius: '5px',
    cursor: 'pointer',
    fontWeight: 'bold' as const,
  }

  return (
    <div style={{ padding: '20px', maxWidth: '1400px', margin: '0 auto' }}>
      <h1>Test Products API (SKU Variants)</h1>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px' }}>
        
        <div style={{ border: '1px solid #ddd', padding: '20px', borderRadius: '8px' }}>
          <h2>Create Product</h2>
          
          <label>Name:</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            style={inputStyle}
          />
          
          <label>Slug:</label>
          <input
            type="text"
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            style={inputStyle}
          />
          
          <label>Description:</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            style={{ ...inputStyle, height: '60px' }}
          />
          
          <label>Category:</label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as 'men' | 'women' | 'unisex')}
            style={inputStyle}
          >
            <option value="men">Men</option>
            <option value="women">Women</option>
            <option value="unisex">Unisex</option>
          </select>
          
          <label>Brand:</label>
          <input
            type="text"
            value={brand}
            onChange={(e) => setBrand(e.target.value)}
            style={inputStyle}
          />
          
          <label style={{ display: 'flex', alignItems: 'center', marginBottom: '10px' }}>
            <input
              type="checkbox"
              checked={featured}
              onChange={(e) => setFeatured(e.target.checked)}
              style={{ marginRight: '8px' }}
            />
            Featured
          </label>

          <h3>SKUs / Variants</h3>
          {skus.map((sku, index) => (
            <div key={index} style={{ border: '1px solid #eee', padding: '10px', marginBottom: '10px', borderRadius: '4px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h4>Variant {index + 1}</h4>
                {skus.length > 1 && (
                  <button
                    onClick={() => removeSku(index)}
                    style={{ ...buttonStyle, background: '#dc3545', color: 'white', padding: '5px 10px' }}
                  >
                    Remove
                  </button>
                )}
              </div>
              
              <label>SKU Code:</label>
              <input
                type="text"
                value={sku.sku}
                onChange={(e) => updateSku(index, 'sku', e.target.value)}
                placeholder="e.g., OUD-50ML"
                style={inputStyle}
              />
              
              <label>Variant:</label>
              <input
                type="text"
                value={sku.variant}
                onChange={(e) => updateSku(index, 'variant', e.target.value)}
                placeholder="e.g., 50ml"
                style={inputStyle}
              />
              
              <label>Original Price:</label>
              <input
                type="number"
                value={sku.originalPrice}
                onChange={(e) => updateSku(index, 'originalPrice', parseFloat(e.target.value))}
                style={inputStyle}
              />
              
              <label>Discounted Price (optional):</label>
              <input
                type="number"
                value={sku.discountedPrice || ''}
                onChange={(e) => updateSku(index, 'discountedPrice', e.target.value ? parseFloat(e.target.value) : undefined)}
                style={inputStyle}
              />
              
              <label>Quantity:</label>
              <input
                type="number"
                value={sku.quantity}
                onChange={(e) => updateSku(index, 'quantity', parseInt(e.target.value))}
                style={inputStyle}
              />
            </div>
          ))}
          
          <button
            onClick={addSku}
            style={{ ...buttonStyle, background: '#28a745', color: 'white', width: '100%', marginBottom: '10px' }}
          >
            + Add SKU Variant
          </button>
          
          <button
            onClick={testCreateProduct}
            style={{ ...buttonStyle, background: '#0070f3', color: 'white', width: '100%' }}
          >
            Create Product
          </button>
        </div>

        <div>
          <div style={{ border: '1px solid #ddd', padding: '20px', borderRadius: '8px', marginBottom: '20px' }}>
            <h2>Get All Products</h2>
            <button
              onClick={testGetProducts}
              style={{ ...buttonStyle, background: '#28a745', color: 'white', width: '100%' }}
            >
              Get All Products
            </button>
          </div>

          <div style={{ border: '1px solid #ddd', padding: '20px', borderRadius: '8px', marginBottom: '20px' }}>
            <h2>Get Single Product</h2>
            <label>Slug:</label>
            <input
              type="text"
              value={getSlug}
              onChange={(e) => setGetSlug(e.target.value)}
              placeholder="Enter slug"
              style={inputStyle}
            />
            <button
              onClick={testGetProduct}
              style={{ ...buttonStyle, background: '#17a2b8', color: 'white', width: '100%' }}
            >
              Get Product
            </button>
          </div>

          <div style={{ border: '1px solid #ddd', padding: '20px', borderRadius: '8px' }}>
            <h2>Delete Product</h2>
            <label>Slug:</label>
            <input
              type="text"
              value={deleteSlug}
              onChange={(e) => setDeleteSlug(e.target.value)}
              placeholder="Enter slug"
              style={inputStyle}
            />
            <button
              onClick={testDeleteProduct}
              style={{ ...buttonStyle, background: '#dc3545', color: 'white', width: '100%' }}
            >
              Delete Product
            </button>
          </div>
        </div>
      </div>

      <div style={{ marginTop: '20px', border: '1px solid #ddd', padding: '20px', borderRadius: '8px' }}>
        <h2>Result</h2>
        <pre style={{
          background: 'blue',
          padding: '15px',
          borderRadius: '5px',
          overflow: 'auto',
          maxHeight: '400px',
          fontSize: '12px'
        }}>
          {result || 'Results will appear here'}
        </pre>
      </div>
    </div>
  )
}