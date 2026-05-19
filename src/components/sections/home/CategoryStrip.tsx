import Link from 'next/link'
import Image from 'next/image'

export const dynamic = 'force-dynamic'

/**
 * Fixed four-card audience filter. Each card deep-links into /shop with the
 * filter pre-applied:
 *
 *   - Men / Women / Unisex map to the `audience` query param, which the shop
 *     converts into a `tag` filter on /api/products (matches the `men` /
 *     `women` / `unisex` tag stored on each product).
 *   - Beauty maps to `type=lipstick`. The shop reads `type` and forwards it
 *     to `/api/products` as `productType`, surfacing every cosmetics product.
 */
interface AudienceTile {
  label: string
  icon: string
  image: string
  href: string
  /** Filter params used to fetch the live product count for this tile. */
  countQuery: string
}

const AUDIENCES: AudienceTile[] = [
  {
    label: "Women's Perfumes",
    icon: 'ri-seedling-line',
    image:
      'https://images.unsplash.com/photo-1541643600914-78b084683601?w=640&h=440&fit=crop',
    href: '/shop?audience=women',
    countQuery: 'tag=women',
  },
  {
    label: "Men's Colognes",
    icon: 'ri-contrast-drop-line',
    image:
      'https://images.unsplash.com/photo-1523293188086-b1b6d4f53bf1?w=640&h=440&fit=crop',
    href: '/shop?audience=men',
    countQuery: 'tag=men',
  },
  {
    label: 'Unisex Fragrances',
    icon: 'ri-genderless-line',
    image:
      'https://images.unsplash.com/photo-1592945403244-b3fbafd7f539?w=640&h=440&fit=crop',
    href: '/shop?audience=unisex',
    countQuery: 'tag=unisex',
  },
  {
    label: 'Beauty',
    icon: 'ri-magic-line',
    image:
      'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=640&h=440&fit=crop',
    href: '/shop?type=lipstick',
    countQuery: 'productType=lipstick',
  },
]

interface CountResponse {
  success?: boolean
  pagination?: { total?: number }
}

async function fetchCount(query: string): Promise<number> {
  try {
    const base =
      process.env.NEXT_PUBLIC_APP_URL ||
      process.env.NEXT_PUBLIC_SITE_URL ||
      'http://localhost:3000'
    const res = await fetch(`${base}/api/products?${query}&limit=1`, {
      next: { revalidate: 300 },
    })
    if (!res.ok) return 0
    const data = (await res.json()) as CountResponse
    return data?.pagination?.total ?? 0
  } catch {
    return 0
  }
}

function formatCount(n: number): string {
  if (n <= 0) return ''
  if (n >= 100) return `${Math.floor(n / 10) * 10}+ Scents`
  return `${n} Scent${n === 1 ? '' : 's'}`
}

interface Tile extends AudienceTile {
  count: number
}

export default async function CategoryStrip() {
  // Run all four count queries in parallel so the section paints in roughly
  // the time of the slowest single query, not the sum.
  const counts = await Promise.all(
    AUDIENCES.map((tile) => fetchCount(tile.countQuery)),
  )

  const items: Tile[] = AUDIENCES.map((tile, i) => ({
    ...tile,
    count: counts[i],
  }))

  return (
    <section className="py-16 px-6 bg-white">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-10">
          <p className="text-[var(--color-gold)] tracking-[0.4em] uppercase text-[10px] font-semibold mb-2">
            Browse By Category
          </p>
          <h2 className="font-serif text-3xl font-light text-[var(--color-ink)]">
            Find Your Signature Scent
          </h2>
          <div className="w-10 h-[1px] bg-[var(--color-gold)] mx-auto mt-4" />
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {items.map((cat) => (
            <Link
              key={cat.label}
              href={cat.href}
              className="group block border border-[var(--color-border)] hover:border-[var(--color-gold)] transition-all duration-300 overflow-hidden bg-white"
            >
              <div className="relative h-[160px] md:h-[190px] w-full overflow-hidden">
                <Image
                  src={cat.image}
                  alt={cat.label}
                  fill
                  sizes="(min-width: 1024px) 25vw, 50vw"
                  className="object-cover object-center transition-transform duration-700 group-hover:scale-108"
                />
              </div>
              <div className="p-4 bg-white">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-[var(--color-ink)] text-sm font-semibold tracking-wide leading-tight">
                      {cat.label}
                    </h3>
                    {cat.count > 0 && (
                      <p className="text-[var(--color-gold)] text-[10px] tracking-widest uppercase mt-1 font-semibold">
                        {formatCount(cat.count)}
                      </p>
                    )}
                  </div>
                  <div className="w-8 h-8 flex items-center justify-center border border-[var(--color-border)] group-hover:border-[var(--color-gold)] group-hover:bg-[var(--color-gold)] transition-all duration-300 flex-shrink-0">
                    <i
                      className={`${cat.icon} text-[var(--color-gold)] group-hover:text-white text-sm transition-colors duration-300`}
                    />
                  </div>
                </div>
                <div className="mt-3 flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <div className="w-4 h-[1px] bg-[var(--color-gold)]" />
                  <span className="text-[9px] tracking-widest uppercase text-[var(--color-gold)] font-semibold">
                    Shop Now
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}
