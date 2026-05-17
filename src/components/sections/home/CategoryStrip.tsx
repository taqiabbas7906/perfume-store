import Link from 'next/link'
import Image from 'next/image'

interface Tile {
  label: string
  icon: string
  image: string
  count: string
  href: string
}

const fallback: Tile[] = [
  {
    label: "Women's Perfumes",
    icon: 'ri-seedling-line',
    image:
      'https://readdy.ai/api/search-image?query=womens%20luxury%20perfume%20bottles%20feminine%20floral%20arrangement%2C%20soft%20pink%20and%20rose%20gold%20tones%2C%20elegant%20glass%20flacons%20on%20white%20marble%2C%20delicate%20and%20refined%20beauty%20product%20photography%2C%20bright%20airy%20light%20background&width=320&height=220&seq=cat1&orientation=landscape',
    count: '240+ Scents',
    href: '/shop?category=women',
  },
  {
    label: "Men's Colognes",
    icon: 'ri-contrast-drop-line',
    image:
      'https://readdy.ai/api/search-image?query=mens%20luxury%20cologne%20bottles%20warm%20masculine%20aesthetic%2C%20warm%20tan%20and%20leather%20tones%2C%20strong%20bold%20fragrance%20bottles%20on%20warm%20beige%20stone%20surface%2C%20sophisticated%20premium%20photography%2C%20bright%20warm%20light&width=320&height=220&seq=cat2&orientation=landscape',
    count: '180+ Scents',
    href: '/shop?category=men',
  },
  {
    label: 'Niche & Artisan',
    icon: 'ri-magic-line',
    image:
      'https://readdy.ai/api/search-image?query=niche%20artisan%20perfume%20bottles%20collection%20unique%20unusual%20designs%2C%20bright%20editorial%20light%2C%20rare%20exclusive%20fragrance%20flacons%20on%20cream%20marble%2C%20elegant%20cinematic%20soft%20lighting%2C%20warm%20white%20background&width=320&height=220&seq=cat3&orientation=landscape',
    count: '120+ Scents',
    href: '/shop?category=niche',
  },
  {
    label: 'Gift Sets',
    icon: 'ri-gift-line',
    image:
      'https://readdy.ai/api/search-image?query=luxury%20perfume%20gift%20set%20box%2C%20elegant%20packaging%20with%20ribbon%2C%20multiple%20miniature%20fragrance%20bottles%20in%20premium%20gift%20box%2C%20bright%20warm%20golden%20lighting%2C%20premium%20holiday%20gifting%20photography%2C%20white%20background&width=320&height=220&seq=cat4&orientation=landscape',
    count: '60+ Sets',
    href: '/shop?category=gift-sets',
  },
]

const ICON_BY_SLUG: Record<string, string> = {
  women: 'ri-seedling-line',
  womens: 'ri-seedling-line',
  men: 'ri-contrast-drop-line',
  mens: 'ri-contrast-drop-line',
  niche: 'ri-magic-line',
  gifts: 'ri-gift-line',
  'gift-sets': 'ri-gift-line',
}

interface ApiCategory {
  _id: string
  name: string
  slug: string
  image?: string
}

async function fetchCategories(): Promise<Tile[]> {
  try {
    const base = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
    const res = await fetch(`${base}/api/categories`, {
      next: { revalidate: 300 },
    })
    if (!res.ok) return fallback
    const data = await res.json()
    const cats: ApiCategory[] = data?.categories ?? []
    if (cats.length === 0) return fallback
    return cats.slice(0, 4).map((c, i) => ({
      label: c.name,
      icon: ICON_BY_SLUG[c.slug] ?? fallback[i % fallback.length].icon,
      image: c.image || fallback[i % fallback.length].image,
      count: '',
      href: `/shop?category=${encodeURIComponent(c.slug)}`,
    }))
  } catch {
    return fallback
  }
}

export default async function CategoryStrip() {
  const items = await fetchCategories()

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
                  className="object-cover object-top transition-transform duration-700 group-hover:scale-108"
                />
              </div>
              <div className="p-4 bg-white">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-[var(--color-ink)] text-sm font-semibold tracking-wide leading-tight">
                      {cat.label}
                    </h3>
                    {cat.count && (
                      <p className="text-[var(--color-gold)] text-[10px] tracking-widest uppercase mt-1 font-semibold">
                        {cat.count}
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
