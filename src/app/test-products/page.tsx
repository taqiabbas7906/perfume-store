'use client'

import { useState } from 'react'
import { authFetch } from '@/lib/api'
import { DELETE } from '../api/products/[slug]/route'

export default function TestProductsPage() {
  const [result, setResult] = useState('')

  const [name, setName] = useState('Oud Royal')
  const [slug, setSlug] = useState('oud-royal')
  const [description, setDescription] = useState('Luxurious oud fragrance with rich woody notes')
  const [price, setPrice] = useState(150)
  const [discountedPrice, setDiscountedPrice] = useState(120)
  const [category, setCategory] = useState<'men' | 'women' | 'unisex'>('men')
  const [brand, setBrand] = useState('Arabian Oud')
  const [quantity, setQuantity] = useState(10)
  const [featured, setFeatured] = useState(true)

  const [updateSlug, setUpdateSlug] = useState('')
  const [updatePrice, setUpdatePrice] = useState('')
  const [updateDiscountedPrice, setUpdateDiscountedPrice] = useState('')

  const [deleteSlug, setDeleteSlug] = useState('')
  const [getSlug, setGetSlug] = useState('')

  const [Checked, setChecked] = useState(false);

  const testCreateProduct = async () => {
    try {
      const res = await authFetch('/api/products', {
        method: 'POST',
        body: JSON.stringify({
          name,
          slug,
          description,
          price,
          discountedPrice,
          category,
          brand,
          quantity,
          sizes: ['50ml', '100ml'],
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

  const testUpdateProduct = async () => {
    if (!updateSlug) {
      setResult('Please enter a slug to update')
      return
    }

    const updateData: any = {}

    if (updatePrice) updateData.price = parseFloat(updatePrice)
    if (updateDiscountedPrice) updateData.discountedPrice = parseFloat(updateDiscountedPrice)

    if (Object.keys(updateData).length === 0) {
      setResult('Please enter at least one field to update')
      return
    }

    try {
      const res = await authFetch(`/api/products/${updateSlug}`, {
        method: 'PUT',
        body: JSON.stringify(updateData),
      })

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
      let res;
      if (Checked) {
        res = await authFetch(`/api/products/permanentDelete/${deleteSlug}`, { method: 'DELETE' })
      }
      else{
        res = await authFetch(`/api/products/${deleteSlug}`, {
        method: 'DELETE',
      })}

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
    fontWeight: 'bold',
  }

  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      <h1>Test Products API</h1>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>

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

          <label>Price:</label>
          <input
            type="number"
            value={price}
            onChange={(e) => setPrice(parseFloat(e.target.value))}
            style={inputStyle}
          />

          <label>Discounted Price:</label>
          <input
            type="number"
            value={discountedPrice}
            onChange={(e) => setDiscountedPrice(parseFloat(e.target.value))}
            style={inputStyle}
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

          <label>Quantity:</label>
          <input
            type="number"
            value={quantity}
            onChange={(e) => setQuantity(parseInt(e.target.value))}
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

          <div style={{ border: '1px solid #ddd', padding: '20px', borderRadius: '8px', marginBottom: '20px' }}>
            <h2>Update Product</h2>
            <label>Slug:</label>
            <input
              type="text"
              value={updateSlug}
              onChange={(e) => setUpdateSlug(e.target.value)}
              placeholder="Enter slug"
              style={inputStyle}
            />
            <label>New Price (optional):</label>
            <input
              type="number"
              value={updatePrice}
              onChange={(e) => setUpdatePrice(e.target.value)}
              placeholder="Leave empty to keep current"
              style={inputStyle}
            />
            <label>New Discounted Price (optional):</label>
            <input
              type="number"
              value={updateDiscountedPrice}
              onChange={(e) => setUpdateDiscountedPrice(e.target.value)}
              placeholder="Leave empty to keep current"
              style={inputStyle}
            />
            <button
              onClick={testUpdateProduct}
              style={{ ...buttonStyle, background: '#ffc107', color: 'black', width: '100%' }}
            >
              Update Product
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
            <input type='checkBox'
              onChange={(e) => setChecked(e.target.checked)}
              checked={Checked}
            ></input>
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