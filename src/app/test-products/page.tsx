'use client'

import { useState } from 'react'
import { authFetch } from '@/lib/api'

export default function TestProductsPage() {
  const [result, setResult] = useState('')
  const [slug, setSlug] = useState('')

  const testCreateProduct = async () => {
    const newSlug = `oud-royal-${Date.now()}`
    
    try {
      const res = await authFetch('/api/products', {
        method: 'POST',
        body: JSON.stringify({
          name: 'Oud Royal',
          slug: newSlug,
          description: 'Luxurious oud fragrance with rich woody notes',
          price: 150,
          discountedPrice: 120,
          category: 'men',
          brand: 'Arabian Oud',
          quantity: 10,
          sizes: ['50ml', '100ml'],
          images: [],
          featured: true,
          active: true,
        }),
      })
      
      const data = await res.json()
      
      if (data.success) {
        setSlug(newSlug)
      }
      
      setResult(JSON.stringify(data, null, 2))
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
    if (!slug) {
      setResult('Please create a product first')
      return
    }
    
    try {
      const res = await fetch(`/api/products/${slug}`)
      const data = await res.json()
      setResult(JSON.stringify(data, null, 2))
    } catch (err: any) {
      setResult(JSON.stringify({ error: err.message }, null, 2))
    }
  }

  const testUpdateProduct = async () => {
    if (!slug) {
      setResult('Please create a product first')
      return
    }
    
    try {
      const res = await authFetch(`/api/products/${slug}`, {
        method: 'PUT',
        body: JSON.stringify({
          price: 160,
        }),
      })
      
      const data = await res.json()
      setResult(JSON.stringify(data, null, 2))
    } catch (err: any) {
      setResult(JSON.stringify({ error: err.message }, null, 2))
    }
  }

  const testDeleteProduct = async () => {
    if (!slug) {
      setResult('Please create a product first')
      return
    }
    
    try {
      const res = await authFetch(`/api/products/${slug}`, {
        method: 'DELETE',
      })
      
      const data = await res.json()
      setResult(JSON.stringify(data, null, 2))
    } catch (err: any) {
      setResult(JSON.stringify({ error: err.message }, null, 2))
    }
  }

  return (
    <div style={{ padding: '20px', maxWidth: '900px', margin: '0 auto' }}>
      <h1>Test Products API</h1>

      <div style={{ marginBottom: '20px' }}>
        <p><strong>Current Slug:</strong> {slug || 'None - create a product first'}</p>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <button 
          onClick={testCreateProduct} 
          style={{ 
            margin: '5px', 
            padding: '10px 20px', 
            background: '#0070f3', 
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer'
          }}
        >
          1. Create Product (Admin)
        </button>
        
        <button 
          onClick={testGetProducts} 
          style={{ 
            margin: '5px', 
            padding: '10px 20px', 
            background: '#28a745', 
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer'
          }}
        >
          2. Get All Products
        </button>
        
        <button 
          onClick={testGetProduct} 
          style={{ 
            margin: '5px', 
            padding: '10px 20px', 
            background: '#17a2b8', 
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer'
          }}
        >
          3. Get Single Product
        </button>
        
        <button 
          onClick={testUpdateProduct} 
          style={{ 
            margin: '5px', 
            padding: '10px 20px', 
            background: '#ffc107', 
            color: 'black',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer'
          }}
        >
          4. Update Product (Admin)
        </button>
        
        <button 
          onClick={testDeleteProduct} 
          style={{ 
            margin: '5px', 
            padding: '10px 20px', 
            background: '#dc3545', 
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer'
          }}
        >
          5. Delete Product (Admin)
        </button>
      </div>

      <pre style={{ 
        background: 'blue', 
        padding: '15px', 
        borderRadius: '5px',
        overflow: 'auto', 
        maxHeight: '600px',
        fontSize: '12px'
      }}>
        {result || 'Click a button to test the API'}
      </pre>
    </div>
  )
}