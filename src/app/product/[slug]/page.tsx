import { notFound } from 'next/navigation'
import Link from 'next/link'
import type { Metadata } from 'next'
import ProductGallery from '@/components/sections/product/ProductGallery'
import ProductInfo from '@/components/sections/product/ProductInfo'
import ProductNotes from '@/components/sections/product/ProductNotes'
import ProductReviews from '@/components/sections/product/ProductReviews'
import RelatedProducts from '@/components/sections/product/RelatedProducts'
import type { StorefrontProduct } from '@/types/storefront'

interface Params {
  params: Promise<{ slug: string }>
}

async function getProduct(slug: string): Promise<StorefrontProduct | null> {
  try {
    const base = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
    const res = await fetch(`${base}/api/products/${slug}`, {
      next: { revalidate: 60 },
    })
    if (!res.ok) return null
    const data = await res.json()
    if (!data?.success) return null
    return data.product as StorefrontProduct
  } catch {
    return null
  }
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params
  const product = await getProduct(slug)
  if (!product) return { title: 'Product not found' }
  return {
    title: `${product.name} — ${product.brand}`,
    description:
      product.description?.slice(0, 160) ??
      `Buy ${product.name} by ${product.brand} at Inscentives.`,
    openGraph: {
      title: product.name,
      description: product.description?.slice(0, 160),
      images: product.images?.[0]?.url ? [product.images[0].url] : [],
    },
  }
}

function attrArray(value: unknown, fallbackIcon: string) {
  if (!Array.isArray(value)) return []
  return value
    .filter((v) => typeof v === 'string' && v.length > 0)
    .map((name) => ({ name: String(name), icon: fallbackIcon }))
}

export default async function ProductDetailPage({ params }: Params) {
  const { slug } = await params
  const product = await getProduct(slug)
  if (!product) notFound()

  const attrs = (product as unknown as { attributes?: Record<string, unknown> })
    .attributes
  const topNotes = attrArray(attrs?.topNotes, 'ri-sun-line')
  const heartNotes = attrArray(attrs?.heartNotes, 'ri-flower-line')
  const baseNotes = attrArray(attrs?.baseNotes, 'ri-contrast-drop-line')

  const breadcrumbs = [
    { label: 'Home', href: '/' },
    { label: 'Shop', href: '/shop' },
    {
      label: product.brand,
      href: `/shop?brand=${encodeURIComponent(product.brand)}`,
    },
    { label: product.name, href: '#' },
  ]

  return (
    <>
      <div className="h-[calc(2.5rem+5rem)]" />

      <div className="border-b border-[var(--color-border-soft)] bg-[var(--color-cream-100)]">
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center gap-2 flex-wrap">
          {breadcrumbs.map((crumb, i) => (
            <span key={`${crumb.label}-${i}`} className="flex items-center gap-2">
              {i < breadcrumbs.length - 1 ? (
                <Link
                  href={crumb.href}
                  className="text-[10px] tracking-widest uppercase text-gray-400 hover:text-[var(--color-gold)] transition-colors whitespace-nowrap"
                >
                  {crumb.label}
                </Link>
              ) : (
                <span className="text-[10px] tracking-widest uppercase text-[var(--color-gold)] font-semibold whitespace-nowrap">
                  {crumb.label}
                </span>
              )}
              {i < breadcrumbs.length - 1 && (
                <i className="ri-arrow-right-s-line text-gray-300 text-xs" />
              )}
            </span>
          ))}
        </div>
      </div>

      <section className="max-w-7xl mx-auto px-6 py-10 lg:py-14">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16">
          <div className="animate-fade-up">
            <ProductGallery images={product.images} name={product.name} />
          </div>
          <div className="animate-fade-up" style={{ animationDelay: '80ms' }}>
            <ProductInfo product={product} />
          </div>
        </div>
      </section>

      <ProductNotes
        topNotes={topNotes}
        heartNotes={heartNotes}
        baseNotes={baseNotes}
      />

      {product.ratingCount && product.ratingCount > 0 ? (
        <ProductReviews
          productId={product._id}
          ratingAverage={product.ratingAverage ?? 0}
          ratingCount={product.ratingCount ?? 0}
        />
      ) : null}

      <RelatedProducts
        currentSlug={product.slug}
        brand={product.brand}
        category={product.category}
      />
    </>
  )
}
