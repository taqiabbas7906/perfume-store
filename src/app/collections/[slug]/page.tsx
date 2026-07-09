import Image from 'next/image'
import Link from 'next/link'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import ProductCard from '@/components/commerce/ProductCard'
import type { StorefrontProduct } from '@/types/storefront'

interface Params {
  params: Promise<{ slug: string }>
}

interface CollectionDetail {
  _id: string
  name: string
  slug: string
  description?: string
  image?: string
  isLimitedEdition?: boolean
  endsAt?: string
  products: StorefrontProduct[]
}

async function fetchCollection(slug: string): Promise<CollectionDetail | null> {
  try {
    const base = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
    const res = await fetch(`${base}/api/collections/${slug}`, {
      cache: 'no-store',
    })
    if (!res.ok) return null
    const data = await res.json()
    if (!data?.success) return null
    return data.collection as CollectionDetail
  } catch {
    return null
  }
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params
  const c = await fetchCollection(slug)
  if (!c) return { title: 'Collection not found' }
  return {
    title: c.name,
    description: c.description?.slice(0, 160) ?? `Shop the ${c.name} collection at Minzoshop.`,
    openGraph: {
      title: c.name,
      description: c.description?.slice(0, 160),
      images: c.image ? [c.image] : [],
    },
  }
}

function formatEndsAt(iso?: string) {
  if (!iso) return null
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return null
  return d.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
}

export default async function CollectionDetailPage({ params }: Params) {
  const { slug } = await params
  const collection = await fetchCollection(slug)
  if (!collection) notFound()

  const endsAtLabel = formatEndsAt(collection.endsAt)
  const productCount = collection.products?.length ?? 0

  return (
    <main className="pt-28 pb-20 bg-white min-h-screen">
      {/* Hero */}
      <section className="relative w-full h-[55vh] min-h-[420px] overflow-hidden">
        {collection.image ? (
          <Image
            src={collection.image}
            alt={collection.name}
            fill
            priority
            sizes="100vw"
            className="object-cover object-center"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-[var(--color-cream-300)] via-[var(--color-cream-400)] to-[var(--color-cream-500)]" />
        )}
        <div className="absolute inset-0 bg-gradient-to-r from-[var(--color-cream-200)]/95 via-[var(--color-cream-200)]/60 to-[var(--color-cream-200)]/20" />

        <div className="absolute inset-0 flex flex-col justify-center px-6 md:px-16 lg:px-24">
          <div className="max-w-2xl">
            <nav
              aria-label="Breadcrumb"
              className="flex items-center gap-2 mb-5 text-[10px] tracking-widest uppercase text-gray-400"
            >
              <Link
                href="/"
                className="hover:text-[var(--color-gold)] transition-colors"
              >
                Home
              </Link>
              <i className="ri-arrow-right-s-line text-xs" />
              <Link
                href="/collections"
                className="hover:text-[var(--color-gold)] transition-colors"
              >
                Collections
              </Link>
              <i className="ri-arrow-right-s-line text-xs" />
              <span className="text-[var(--color-gold)] font-semibold">
                {collection.name}
              </span>
            </nav>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-[1px] bg-[var(--color-gold)]" />
              <span className="text-[var(--color-gold)] tracking-[0.5em] uppercase text-[10px] font-semibold">
                {collection.isLimitedEdition ? 'Limited Edition' : 'Collection'}
              </span>
            </div>

            <h1 className="font-serif text-5xl md:text-6xl font-light text-[var(--color-ink)] leading-tight mb-5">
              {collection.name}
            </h1>

            {collection.description && (
              <p className="text-[var(--color-ink-soft)] text-base font-light max-w-lg leading-relaxed tracking-wide mb-6">
                {collection.description}
              </p>
            )}

            <div className="flex items-center gap-5 text-[10px] tracking-widest uppercase">
              <span className="text-[var(--color-gold-deep)] font-semibold">
                {productCount} {productCount === 1 ? 'product' : 'products'}
              </span>
              {endsAtLabel && (
                <>
                  <span className="text-gray-400">·</span>
                  <span className="text-gray-500 flex items-center gap-1.5">
                    <i className="ri-time-line" />
                    Available until {endsAtLabel}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Products */}
      <section className="max-w-7xl mx-auto px-6 py-12 lg:py-16">
        {productCount === 0 ? (
          <div className="text-center py-20">
            <div className="w-16 h-16 flex items-center justify-center border border-[var(--color-border)] rounded-full mx-auto mb-5">
              <i className="ri-search-line text-2xl text-[var(--color-gold)]" />
            </div>
            <p className="text-[var(--color-ink)] font-medium tracking-wide">
              No products in this collection yet
            </p>
            <p className="text-gray-400 text-xs mt-1.5 tracking-wide">
              The curation is in progress — check back soon.
            </p>
            <Link
              href="/collections"
              className="mt-8 inline-flex items-center gap-2 text-[10px] tracking-[0.3em] uppercase font-semibold text-[var(--color-gold)] hover:text-[var(--color-ink)] transition-colors"
            >
              <i className="ri-arrow-left-line text-sm" />
              Back to collections
            </Link>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-5">
              {collection.products.map((p) => (
                <ProductCard key={p._id} product={p} />
              ))}
            </div>

            <div className="text-center mt-14">
              <Link
                href="/collections"
                className="inline-flex items-center gap-2 text-[10px] tracking-[0.3em] uppercase font-semibold text-[var(--color-gold)] hover:text-[var(--color-ink)] transition-colors"
              >
                <i className="ri-arrow-left-line text-sm" />
                Browse all collections
              </Link>
            </div>
          </>
        )}
      </section>
    </main>
  )
}
