'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { useSearch } from '@/context/SearchContext'
import { formatPrice } from '@/lib/utils/format'

interface SearchHit {
  _id?: string
  objectID?: string
  slug?: string
  name: string
  brand?: string
  minPrice?: number
  price?: number
  images?: Array<{ url: string }>
  image?: string
}

const TRENDING = [
  'Creed Aventus',
  'Le Labo Santal 33',
  'Tom Ford',
  'Byredo',
  'Dior Sauvage',
  'Parfums de Marly',
  'Xerjoff',
  'Gift Sets',
]

const RECENT_KEY = 'recentSearches'

function readRecent(): string[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(RECENT_KEY)
    return raw ? (JSON.parse(raw) as string[]) : []
  } catch {
    return []
  }
}

function writeRecent(values: string[]) {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(RECENT_KEY, JSON.stringify(values.slice(0, 5)))
  } catch {
    /* ignore */
  }
}

export default function SearchOverlay() {
  const { isOpen, closeSearch } = useSearch()
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const [query, setQuery] = useState('')
  const [hits, setHits] = useState<SearchHit[]>([])
  const [loading, setLoading] = useState(false)
  const [recent, setRecent] = useState<string[]>([])

  useEffect(() => {
    setRecent(readRecent())
  }, [])

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100)
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeSearch()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [closeSearch])

  useEffect(() => {
    if (!isOpen) return
    const term = query.trim()
    if (term.length < 2) {
      setHits([])
      return
    }
    const ac = new AbortController()
    setLoading(true)
    const timer = setTimeout(async () => {
      try {
        // Try Algolia-backed /api/search first, fall back to product list
        const algRes = await fetch(`/api/search?q=${encodeURIComponent(term)}&limit=8`, {
          signal: ac.signal,
        })
        if (algRes.ok) {
          const data = await algRes.json()
          if (Array.isArray(data.hits) && data.hits.length) {
            setHits(data.hits)
            setLoading(false)
            return
          }
        }
        const res = await fetch(
          `/api/products?search=${encodeURIComponent(term)}&limit=8`,
          { signal: ac.signal },
        )
        const data = await res.json()
        if (data.success) setHits(data.products)
      } catch {
        /* aborted */
      } finally {
        setLoading(false)
      }
    }, 220)
    return () => {
      ac.abort()
      clearTimeout(timer)
    }
  }, [query, isOpen])

  const commit = (term: string) => {
    const t = term.trim()
    if (!t) return
    const next = [t, ...recent.filter((r) => r !== t)].slice(0, 5)
    setRecent(next)
    writeRecent(next)
    closeSearch()
    setQuery('')
    router.push(`/shop?search=${encodeURIComponent(t)}`)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (query.trim()) commit(query)
  }

  return (
    <>
      <div
        className={`fixed inset-0 z-[80] bg-black/40 backdrop-blur-sm transition-opacity duration-300 ${
          isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={closeSearch}
      />

      <div
        className={`fixed top-0 left-0 right-0 z-[85] bg-white transition-transform duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] ${
          isOpen ? 'translate-y-0' : '-translate-y-full'
        }`}
      >
        <form
          onSubmit={handleSubmit}
          className="max-w-4xl mx-auto px-6 py-8 flex items-center gap-4"
        >
          <div className="w-8 h-8 flex items-center justify-center">
            <i className="ri-search-line text-2xl text-[var(--color-gold)]" />
          </div>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search fragrances, brands, collections..."
            className="flex-1 text-xl text-[var(--color-ink)] placeholder-gray-300 outline-none font-light tracking-wide bg-transparent font-serif"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-[var(--color-ink)] transition-colors"
              aria-label="Clear"
            >
              <i className="ri-close-circle-line text-lg" />
            </button>
          )}
          <button
            type="button"
            onClick={closeSearch}
            className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-[var(--color-ink)] transition-colors ml-2"
            aria-label="Close search"
          >
            <i className="ri-close-line text-xl" />
          </button>
        </form>

        <div className="border-t border-[var(--color-border-soft)]" />

        <div className="max-w-4xl mx-auto px-6 py-6 pb-8">
          {query.trim().length > 1 ? (
            <>
              {loading ? (
                <p className="py-6 text-center text-xs text-gray-400 tracking-widest uppercase">
                  Searching…
                </p>
              ) : hits.length > 0 ? (
                <>
                  <p className="text-[9px] text-[var(--color-gold)] tracking-[0.4em] uppercase font-semibold mb-4">
                    Products ({hits.length})
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    {hits.map((p) => {
                      const slug = p.slug ?? p.objectID ?? p._id
                      const img = p.images?.[0]?.url ?? p.image ?? ''
                      const price = p.minPrice ?? p.price ?? 0
                      return (
                        <button
                          key={slug}
                          onClick={() => {
                            closeSearch()
                            setQuery('')
                            router.push(`/product/${slug}`)
                          }}
                          className="flex gap-3 items-center p-2 hover:bg-[var(--color-cream-300)] transition-colors text-left rounded"
                        >
                          <div className="relative w-12 h-14 flex-shrink-0 bg-[var(--color-cream-500)] overflow-hidden">
                            {img && (
                              <Image
                                src={img}
                                alt={p.name}
                                fill
                                sizes="48px"
                                className="object-cover object-top"
                              />
                            )}
                          </div>
                          <div className="min-w-0">
                            {p.brand && (
                              <p className="text-[8px] text-[var(--color-gold)] tracking-widest uppercase font-bold">
                                {p.brand}
                              </p>
                            )}
                            <p className="text-xs font-semibold text-[var(--color-ink)] leading-snug line-clamp-2">
                              {p.name}
                            </p>
                            <p className="text-xs font-bold text-[var(--color-ink)] mt-0.5">
                              {formatPrice(price)}
                            </p>
                          </div>
                        </button>
                      )
                    })}
                  </div>
                  <button
                    onClick={() => commit(query)}
                    className="mt-5 flex items-center gap-2 text-[11px] tracking-widest uppercase font-bold text-[var(--color-gold)] hover:text-[var(--color-ink)] transition-colors"
                  >
                    See all results for &quot;{query}&quot;
                    <i className="ri-arrow-right-line" />
                  </button>
                </>
              ) : (
                <div className="py-6 text-center">
                  <p className="text-gray-400 text-sm">
                    No results found for &quot;{query}&quot;
                  </p>
                  <p className="text-[11px] text-gray-300 mt-1 tracking-wide">
                    Try a brand name or fragrance
                  </p>
                </div>
              )}
            </>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
              {recent.length > 0 && (
                <div>
                  <p className="text-[9px] text-[var(--color-gold)] tracking-[0.4em] uppercase font-semibold mb-3">
                    Recent
                  </p>
                  <ul className="space-y-2">
                    {recent.map((s) => (
                      <li key={s}>
                        <button
                          onClick={() => setQuery(s)}
                          className="flex items-center gap-3 text-sm text-[var(--color-ink)] hover:text-[var(--color-gold)] transition-colors"
                        >
                          <i className="ri-time-line text-gray-300 text-xs" />
                          {s}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <div>
                <p className="text-[9px] text-[var(--color-gold)] tracking-[0.4em] uppercase font-semibold mb-3">
                  Trending
                </p>
                <div className="flex flex-wrap gap-2">
                  {TRENDING.map((s) => (
                    <button
                      key={s}
                      onClick={() => setQuery(s)}
                      className="border border-[var(--color-border)] text-[var(--color-ink)] hover:border-[var(--color-gold)] hover:text-[var(--color-gold)] text-[11px] tracking-wide px-3 py-1.5 transition-all duration-200 whitespace-nowrap"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
