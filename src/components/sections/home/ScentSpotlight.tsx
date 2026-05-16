'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'

const featured = [
  {
    id: 1,
    brand: 'Creed',
    name: 'Aventus',
    tagline: 'The Scent of Triumph',
    desc: 'A bold declaration of success. Aventus opens with a burst of blackcurrant and Italian bergamot, dries down to a rich birch and ambergris base. The fragrance of legends.',
    notes: ['Blackcurrant', 'Bergamot', 'Birch', 'Musk', 'Ambergris'],
    price: 520,
    originalPrice: 580,
    size: '3.4 oz EDP',
    rating: 4.9,
    reviews: 445,
    href: '/shop?search=Creed+Aventus',
    image:
      'https://readdy.ai/api/search-image?query=Creed%20Aventus%20luxury%20perfume%20hero%20shot%2C%20single%20bottle%20dramatically%20lit%20against%20soft%20cream%20ivory%20background%2C%20warm%20golden%20studio%20spotlight%20from%20above%2C%20gold%20cap%20gleaming%2C%20ultra%20high%20end%20product%20photography%2C%20elegant%20light%20warm%20tones%2C%20professional%20advertising%20quality&width=600&height=700&seq=spot1light&orientation=portrait',
  },
  {
    id: 2,
    brand: 'Maison Francis Kurkdjian',
    name: 'Baccarat Rouge 540',
    tagline: 'The Art of Luminous Sillage',
    desc: 'Saffron and jasmine ignite like a flame, leaving a trail of warm cedarwood and ambergris. Baccarat Rouge 540 is the modern classic that turned the fragrance world upside down.',
    notes: ['Saffron', 'Jasmine', 'Ambergris', 'Fir Resin', 'Cedar'],
    price: 380,
    originalPrice: 420,
    size: '2.4 oz EDP',
    rating: 4.9,
    reviews: 678,
    href: '/shop?search=Baccarat+Rouge+540',
    image:
      'https://readdy.ai/api/search-image?query=Baccarat%20Rouge%20540%20Maison%20Francis%20Kurkdjian%20perfume%20bottle%20crystal%20clear%20glass%2C%20warm%20amber%20golden%20glow%2C%20bright%20clean%20white%20cream%20background%20with%20soft%20diffused%20light%2C%20ultra%20premium%20niche%20fragrance%20hero%20photography%2C%20luxury%20editorial%20quality%2C%20stunning%20glass%20bottle&width=600&height=700&seq=spot2light&orientation=portrait',
  },
  {
    id: 3,
    brand: 'Tom Ford',
    name: 'Oud Wood',
    tagline: 'Rare. Smoky. Unforgettable.',
    desc: "Exotic oud wood blended with sandalwood, vetiver and amber. An opulent journey through the mystical Orient that lingers hours after you've left the room.",
    notes: ['Oud Wood', 'Sandalwood', 'Vetiver', 'Amber', 'Cardamom'],
    price: 290,
    originalPrice: 340,
    size: '1.7 oz EDP',
    rating: 4.8,
    reviews: 392,
    href: '/shop?search=Tom+Ford+Oud+Wood',
    image:
      'https://readdy.ai/api/search-image?query=Tom%20Ford%20Oud%20Wood%20luxury%20perfume%20bottle%20warm%20editorial%20shot%2C%20amber%20brown%20tones%2C%20single%20bottle%20on%20warm%20beige%20stone%20surface%20with%20soft%20side%20lighting%2C%20premium%20masculine%20fragrance%20photography%2C%20warm%20cream%20linen%20background%2C%20professional%20advertising&width=600&height=700&seq=spot3light&orientation=portrait',
  },
]

export default function ScentSpotlight() {
  const [activeIdx, setActiveIdx] = useState(0)
  const product = featured[activeIdx]

  return (
    <section className="bg-[var(--color-cream-200)] py-24 px-6 overflow-hidden">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-14 gap-4">
          <div>
            <p className="text-[var(--color-gold)] tracking-[0.5em] uppercase text-[10px] font-semibold mb-2">
              Editor&apos;s Choice
            </p>
            <h2 className="font-serif text-4xl md:text-5xl font-light text-[var(--color-ink)]">
              Scent Spotlight
            </h2>
            <div className="w-10 h-[1px] bg-[var(--color-gold)] mt-4" />
          </div>
          <div className="flex gap-2 flex-wrap">
            {featured.map((f, i) => (
              <button
                key={f.id}
                onClick={() => setActiveIdx(i)}
                className={`text-[10px] tracking-widest uppercase font-semibold px-4 py-2 transition-all duration-300 whitespace-nowrap ${
                  activeIdx === i
                    ? 'bg-[var(--color-gold)] text-white'
                    : 'border border-[var(--color-gold-soft)] text-[var(--color-gold)] hover:bg-[var(--color-cream-400)]'
                }`}
              >
                {f.brand}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-12 items-center">
          <div className="w-full lg:w-5/12 flex-shrink-0">
            <div className="relative w-full h-[480px] md:h-[560px]">
              <Image
                key={product.id}
                src={product.image}
                alt={product.name}
                fill
                sizes="(min-width: 1024px) 40vw, 90vw"
                className="object-cover object-top transition-opacity duration-500 rounded-lg"
              />
              <div className="absolute bottom-6 left-6 bg-white/90 backdrop-blur-md border border-[var(--color-border)] px-5 py-3 flex items-center gap-3 rounded">
                <div className="flex gap-0.5">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <i key={i} className="ri-star-fill text-[var(--color-gold)] text-xs" />
                  ))}
                </div>
                <span className="text-[var(--color-ink)] text-xs font-semibold">
                  {product.rating}
                </span>
                <span className="text-gray-400 text-xs">({product.reviews} reviews)</span>
              </div>
            </div>
          </div>

          <div className="w-full lg:w-7/12">
            <p className="text-[var(--color-gold)] tracking-[0.4em] uppercase text-[10px] font-bold mb-2">
              {product.brand}
            </p>
            <h3 className="font-serif text-5xl md:text-6xl font-bold text-[var(--color-ink)] mb-2">
              {product.name}
            </h3>
            <p className="text-[var(--color-gold)] text-sm italic mb-6 tracking-wide">
              {product.tagline}
            </p>

            <p className="text-gray-500 text-sm leading-relaxed mb-8 max-w-xl">
              {product.desc}
            </p>

            <div className="mb-8">
              <p className="text-[10px] tracking-[0.4em] uppercase text-gray-400 font-semibold mb-3">
                Scent Notes
              </p>
              <div className="flex flex-wrap gap-2">
                {product.notes.map((note) => (
                  <span
                    key={note}
                    className="border border-[var(--color-gold-soft)] text-[var(--color-gold-deep)] text-[10px] tracking-widest uppercase px-3 py-1.5 font-medium bg-[var(--color-cream-300)]"
                  >
                    {note}
                  </span>
                ))}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
              <div>
                <p className="text-[10px] tracking-widest uppercase text-gray-400 mb-1">
                  {product.size}
                </p>
                <div className="flex items-baseline gap-3">
                  <span className="text-3xl font-bold text-[var(--color-ink)]">
                    ${product.price}
                  </span>
                  <span className="text-base text-gray-400 line-through">
                    ${product.originalPrice}
                  </span>
                  <span className="text-xs font-bold text-[var(--color-gold)]">
                    Save ${product.originalPrice - product.price}
                  </span>
                </div>
              </div>
              <Link
                href={product.href}
                className="bg-[var(--color-gold)] hover:bg-[var(--color-gold-dark)] text-white text-[11px] tracking-widest uppercase font-bold px-8 py-4 transition-colors whitespace-nowrap"
              >
                Shop Now
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
