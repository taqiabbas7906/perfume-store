import Image from 'next/image'
import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Collections',
  description:
    'Browse curated Minzoshop collections — seasonal edits, limited editions, and category spotlights.',
}

interface CollectionRow {
  _id: string
  name: string
  slug: string
  description?: string
  image?: string
  isLimitedEdition?: boolean
}

async function fetchCollections(): Promise<CollectionRow[]> {
  try {
    const base = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
    const res = await fetch(`${base}/api/collections`, { cache: 'no-store' })
    if (!res.ok) return []
    const data = await res.json()
    if (!data?.success) return []
    return (data.collections as CollectionRow[]) ?? []
  } catch {
    return []
  }
}

export default async function CollectionsIndexPage() {
  const collections = await fetchCollections()

  return (
    <main className="pt-28 pb-20 bg-white min-h-screen">
      <div className="pt-4 pb-10 px-6 bg-[var(--color-cream-600)] border-b border-[var(--color-border-soft)]">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-6 h-[1px] bg-[var(--color-gold)]" />
            <span className="text-[var(--color-gold)] tracking-[0.5em] uppercase text-[10px] font-semibold">
              Curated Edits
            </span>
          </div>
          <h1 className="font-serif text-4xl md:text-5xl font-light text-[var(--color-ink)] mb-2">
            Collections
          </h1>
          <p className="text-sm text-gray-500 font-light max-w-xl">
            Hand-picked groupings — seasonal moods, limited editions, and category
            spotlights to help you find what fits the moment.
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-12">
        {collections.length === 0 ? (
          <div className="text-center py-24">
            <div className="w-16 h-16 flex items-center justify-center border border-[var(--color-border)] rounded-full mx-auto mb-5">
              <i className="ri-stack-line text-2xl text-[var(--color-gold)]" />
            </div>
            <p className="text-[var(--color-ink)] font-medium tracking-wide">
              No collections live just yet
            </p>
            <p className="text-gray-400 text-xs mt-1.5 tracking-wide">
              Check back soon — the team is curating the next drop.
            </p>
            <Link
              href="/shop"
              className="mt-8 inline-flex items-center gap-3 border border-[var(--color-gold)] text-[var(--color-gold)] hover:bg-[var(--color-gold)] hover:text-white text-[11px] tracking-[0.25em] uppercase font-bold px-10 py-3.5 transition-all duration-300"
            >
              Browse all products
              <i className="ri-arrow-right-line" />
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-6">
            {collections.map((c) => (
              <Link
                key={c._id}
                href={`/collections/${c.slug}`}
                className="group block relative overflow-hidden bg-[var(--color-cream-500)] border border-[var(--color-border-soft)] hover:border-[var(--color-gold)] transition-all duration-300"
              >
                <div className="relative aspect-[4/5] overflow-hidden">
                  {c.image ? (
                    <Image
                      src={c.image}
                      alt={c.name}
                      fill
                      sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                      className="object-cover object-center transition-transform duration-700 group-hover:scale-105"
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-[var(--color-cream-400)] to-[var(--color-cream-300)]">
                      <i className="ri-stack-line text-5xl text-[var(--color-gold)]/60" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
                  {c.isLimitedEdition && (
                    <span className="absolute top-4 left-4 bg-[var(--color-gold)] text-white text-[9px] tracking-[0.25em] uppercase font-bold px-2.5 py-1">
                      Limited
                    </span>
                  )}

                  <div className="absolute inset-x-0 bottom-0 p-5 text-white">
                    <p className="text-[10px] tracking-[0.4em] uppercase font-bold text-[var(--color-gold)] mb-2">
                      Collection
                    </p>
                    <h2 className="font-serif text-2xl md:text-3xl font-light leading-tight mb-2">
                      {c.name}
                    </h2>
                    {c.description && (
                      <p className="text-[11px] text-white/80 leading-relaxed line-clamp-2 mb-3">
                        {c.description}
                      </p>
                    )}
                    <span className="inline-flex items-center gap-2 text-[10px] tracking-[0.25em] uppercase font-semibold text-white opacity-90 group-hover:opacity-100 transition-opacity">
                      Explore
                      <i className="ri-arrow-right-line transition-transform duration-300 group-hover:translate-x-1" />
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}
