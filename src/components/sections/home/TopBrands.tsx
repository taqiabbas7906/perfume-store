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
  'https://readdy.ai/api/search-image?query=Maison%20Francis%20Kurkdjian%20luxury%20perfume%20bottles%20collection%2C%20multiple%20elegant%20glass%20flacons%2C%20dark%20moody%20background%20with%20warm%20golden%20lighting%2C%20high-end%20niche%20fragrance%20brand%20display%2C%20opulent%20aesthetic&width=400&height=300&seq=b1&orientation=landscape',
  'https://readdy.ai/api/search-image?query=Creed%20perfume%20bottles%20luxury%20collection%2C%20dark%20dramatic%20background%2C%20royal%20crest%20branding%2C%20multiple%20flagship%20fragrances%20displayed%20together%2C%20premium%20masculine%20editorial%20photography%2C%20deep%20moody%20tones&width=400&height=300&seq=b2&orientation=landscape',
  'https://readdy.ai/api/search-image?query=Le%20Labo%20niche%20perfume%20apothecary%20bottles%20collection%2C%20industrial%20minimalist%20aesthetic%2C%20dark%20moody%20setting%20with%20warm%20amber%20lighting%2C%20artisanal%20fragrance%20brand%20photography%2C%20raw%20authentic%20mood&width=400&height=300&seq=b3&orientation=landscape',
  'https://readdy.ai/api/search-image?query=Parfums%20de%20Marly%20luxury%20perfume%20bottles%20collection%2C%20baroque%20ornate%20gold%20bottles%2C%20dark%20royal%20background%2C%20opulent%20French%20perfume%20house%20display%2C%20regal%20and%20sophisticated%2C%20deep%20dark%20setting&width=400&height=300&seq=b4&orientation=landscape',
  'https://readdy.ai/api/search-image?query=Tom%20Ford%20Black%20Orchid%20luxury%20perfume%20bottle%20collection%2C%20sleek%20modern%20dark%20bottles%2C%20dramatic%20black%20background%2C%20ultra%20luxurious%20editorial%20fragrance%20photography%2C%20bold%20masculine%20aesthetic&width=400&height=300&seq=b5&orientation=landscape',
  'https://readdy.ai/api/search-image?query=Byredo%20perfume%20bottles%20collection%20minimalist%20Scandinavian%20design%2C%20clean%20simple%20glass%20flacons%2C%20dark%20moody%20studio%20background%2C%20modern%20luxury%20niche%20fragrance%20brand%2C%20elegant%20and%20understated&width=400&height=300&seq=b6&orientation=landscape',
  'https://readdy.ai/api/search-image?query=Xerjoff%20luxury%20perfume%20Italian%20brand%20bottles%20collection%2C%20ornate%20decorative%20flacons%2C%20dark%20rich%20background%2C%20ultra%20premium%20niche%20fragrance%20photography%2C%20jewel-like%20opulent%20aesthetic&width=400&height=300&seq=b7&orientation=landscape',
  'https://readdy.ai/api/search-image?query=Bond%20No%209%20New%20York%20luxury%20perfume%20collection%20bottles%20shaped%20like%20shields%2C%20colorful%20vibrant%20designs%2C%20dark%20background%20with%20dramatic%20lighting%2C%20NYC%20inspired%20fragrance%20brand%2C%20bold%20artistic%20display&width=400&height=300&seq=b8&orientation=landscape',
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
