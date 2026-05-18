'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { SearchResultsSkeleton } from '@/components/ui/Skeleton'

interface AlgoliaHit {
  objectID: string
  name: string
  brand: string
  slug: string
  image?: string
  minPrice: number
  category: string
}

export default function SearchBar() {
  const router                          = useRouter()
  const [query, setQuery]               = useState('')
  const [hits, setHits]                 = useState<AlgoliaHit[]>([])
  const [open, setOpen]                 = useState(false)
  const [loading, setLoading]           = useState(false)
  const containerRef                    = useRef<HTMLDivElement>(null)
  const inputRef                        = useRef<HTMLInputElement>(null)
  const debounceRef                     = useRef<ReturnType<typeof setTimeout> | null>(null)

  /* ── Fetch results with 250ms debounce ── */
  const search = useCallback(async (q: string) => {
    if (!q.trim()) { setHits([]); setOpen(false); return }
    setLoading(true)
    try {
      const res  = await fetch(`/api/search?q=${encodeURIComponent(q)}&limit=6`)
      const data = await res.json()
      setHits(data.hits ?? [])
      setOpen(true)
    } catch {
      setHits([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => search(query), 250)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [query, search])

  /* ── Close on outside click ── */
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  /* ── Keyboard: Escape closes, Enter navigates ── */
  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Escape') { setOpen(false); inputRef.current?.blur() }
    if (e.key === 'Enter' && query.trim()) {
      setOpen(false)
      router.push(`/products?search=${encodeURIComponent(query.trim())}`)
    }
  }

  function handleResultClick() {
    setOpen(false)
    setQuery('')
  }

  function handleSeeAll() {
    if (!query.trim()) return
    setOpen(false)
    router.push(`/products?search=${encodeURIComponent(query.trim())}`)
  }

  return (
    <div ref={containerRef} className="relative flex-1 max-w-sm mx-4">
      {/* Input */}
      <div className="relative">
        <input
          ref={inputRef}
          type="search"
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => hits.length > 0 && setOpen(true)}
          placeholder="Search perfumes…"
          className="w-full pl-3 pr-9 py-1.5 text-sm bg-gray-700 text-white placeholder-gray-400 border border-gray-600 rounded-lg focus:outline-none focus:border-gray-400 focus:bg-gray-600 transition-colors"
        />
        <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm pointer-events-none">
          {loading ? (
            <span className="inline-block w-3 h-3 border border-gray-400 border-t-white rounded-full animate-spin" />
          ) : '🔍'}
        </span>
      </div>

      {/* Dropdown */}
      {open && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-lg shadow-xl border border-gray-100 overflow-hidden z-50">
          {loading ? (
            <div className="p-3">
              <SearchResultsSkeleton count={3} />
            </div>
          ) : hits.length === 0 ? (
            <div className="px-4 py-3 text-sm text-gray-500">
              No results for &quot;{query}&quot;
            </div>
          ) : (
            <>
              <ul>
                {hits.map(hit => (
                  <li key={hit.objectID}>
                    <Link
                      href={`/products/${hit.slug}`}
                      onClick={handleResultClick}
                      className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 transition-colors"
                    >
                      {/* Thumbnail */}
                      <div className="w-10 h-10 rounded bg-gray-100 shrink-0 overflow-hidden">
                        {hit.image ? (
                          <img src={hit.image} alt={hit.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-300 text-xs">🧴</div>
                        )}
                      </div>
                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{hit.name}</p>
                        <p className="text-xs text-gray-500 truncate">{hit.brand}</p>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
              {/* See all */}
              <button
                onClick={handleSeeAll}
                className="w-full px-4 py-2.5 text-xs text-center text-indigo-600 font-medium bg-gray-50 hover:bg-gray-100 border-t border-gray-100 transition-colors"
              >
                See all results for &quot;{query}&quot;
              </button>
            </>
          )}
        </div>
      )}
    </div>
  )
}
