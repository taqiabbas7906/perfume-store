import Image from 'next/image'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

interface ApiBrand {
  _id: string
  name: string
  slug: string
  logo?: string
  description?: string
  country?: string
  units: number
  revenue: number
}

interface ApiResponse {
  success?: boolean
  brands?: ApiBrand[]
}

const layoutClasses = [
  'col-span-2 row-span-2 md:col-span-2 md:row-span-2',
  '',
  '',
  '',
  '',
  'col-span-2 md:col-span-2',
  '',
  'col-span-2 md:col-span-2',
]

const fallbackImages = [
  'https://res.cloudinary.com/dplgqdkde/image/upload/v1783954973/fddcbc872a233a4b4d20d25521af4a4b_y59ghk.jpg',
  'https://res.cloudinary.com/dplgqdkde/image/upload/v1783955050/4eec826f28d304f6042af58b442d4c6a_lsm1v6.jpg',
  'https://res.cloudinary.com/dplgqdkde/image/upload/v1783955149/4eec826f28d304f6042af58b442d4c6a_fdxagz.jpg',
  'https://res.cloudinary.com/dplgqdkde/image/upload/v1783955187/a85d39ca38d462d74b93942dbab15b2e_fmsfqc.jpg',
  'https://res.cloudinary.com/dplgqdkde/image/upload/v1783955235/19ef2ab296346ff863a70ef53a9cf283_tvlsmz.jpg',
  'https://res.cloudinary.com/dplgqdkde/image/upload/v1783955274/87471dd3955fcdb6b053a25c3b3af23e_e9mobk.jpg',
  'https://res.cloudinary.com/dplgqdkde/image/upload/v1783955302/7529a2d96df617bf96b566d96ff15174_ke06j3.jpg',
  'https://res.cloudinary.com/dplgqdkde/image/upload/v1783955330/325007ec3f720d02da6ce47531ecdd40_mz2fli.jpg',
]

async function fetchTopBrands(): Promise<ApiBrand[]> {
  try {
    const base =
      process.env.NEXT_PUBLIC_APP_URL ||
      process.env.NEXT_PUBLIC_SITE_URL ||
      'http://localhost:3000'
    const res = await fetch(`${base}/api/brands/top-selling?limit=8&days=180`, {
      next: { revalidate: 300 },
    })
    if (!res.ok) return []
    const data = (await res.json()) as ApiResponse
    return data?.success && Array.isArray(data.brands) ? data.brands : []
  } catch {
    return []
  }
}

export default async function TopBrands() {
  const brands = await fetchTopBrands()
  if (brands.length === 0) return null

  return (
    <section id="brands" className="py-20 px-6 bg-[#faf9f7]">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-4">
          <div>
            <p className="text-[var(--color-gold)] tracking-[0.4em] uppercase text-[10px] font-semibold mb-2">
              Curated Houses
            </p>
            <h2
              className="text-4xl md:text-5xl font-light text-[var(--color-ink)]"
              style={{ fontFamily: "'Cormorant Garamond', serif" }}
            >
              Top Selling Brands
            </h2>
            <div className="w-10 h-[1px] bg-[var(--color-gold)] mt-4" />
          </div>
          <p className="text-gray-400 text-sm max-w-xs text-right leading-relaxed hidden md:block">
            Wholesale pricing. Always in stock.
            <br />
            No order minimums or nonsense.
          </p>
        </div>

        <div
          className="grid grid-cols-2 md:grid-cols-4 gap-3 auto-rows-[150px] sm:auto-rows-[180px] md:auto-rows-[220px]"
        >
          {brands.slice(0, 8).map((brand, index) => {
            const image = brand.logo || fallbackImages[index % fallbackImages.length]
            const isWide = index === 0 || index === 5 || index === 7

            return (
              <Link
                key={brand._id}
                href={`/shop?brand=${encodeURIComponent(brand.name)}`}
                className={`relative block group overflow-hidden cursor-pointer min-h-0 ${layoutClasses[index] ?? ''}`}
              >
                <div className="absolute inset-0">
                  <Image
                    src={image}
                    alt={brand.name}
                    fill
                    sizes={
                      isWide
                        ? '(min-width: 768px) 50vw, 100vw'
                        : '(min-width: 768px) 25vw, 50vw'
                    }
                    className="object-cover object-center transition-transform duration-700 group-hover:scale-110"
                  />

                  <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent" />
                  <div className="absolute inset-0 bg-[var(--color-gold)]/0 group-hover:bg-[var(--color-gold)]/10 transition-all duration-500" />

                  <div className="absolute bottom-0 left-0 right-0 p-4 transform translate-y-1 group-hover:translate-y-0 transition-transform duration-300">
                    <div className="flex items-end justify-between">
                      <div>
                        <h3
                          className={`text-white font-semibold tracking-wider uppercase leading-tight ${
                            index === 0 ? 'text-base' : 'text-xs'
                          }`}
                        >
                          {brand.name}
                        </h3>
                        <div className="flex items-center gap-2 mt-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                          <div className="w-5 h-[1px] bg-[var(--color-gold)]" />
                          <span className="text-[9px] tracking-widest uppercase text-[var(--color-gold)] font-semibold">
                            Shop Now
                          </span>
                        </div>
                      </div>
                      <div className="w-7 h-7 flex items-center justify-center border border-white/0 group-hover:border-white/40 opacity-0 group-hover:opacity-100 transition-all duration-300">
                        <i className="ri-arrow-right-up-line text-white text-xs" />
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            )
          })}
        </div>

        <div className="text-center mt-12">
          <Link
            href="/shop"
            className="inline-flex items-center gap-3 border border-[var(--color-gold)] text-[var(--color-gold)] hover:bg-[var(--color-gold)] hover:text-white text-[11px] tracking-[0.25em] uppercase font-bold px-14 py-4 transition-all duration-300 cursor-pointer whitespace-nowrap group"
          >
            Explore All Brands
            <i className="ri-arrow-right-line transition-transform duration-300 group-hover:translate-x-1" />
          </Link>
        </div>
      </div>
    </section>
  )
}
