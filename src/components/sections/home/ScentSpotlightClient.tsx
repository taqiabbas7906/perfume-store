'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'

export interface SpotlightItem {
  id: string
  brand: string
  name: string
  tagline: string
  desc: string
  notes: string[]
  price: number
  originalPrice: number
  size: string
  rating: number
  reviews: number
  href: string
  image: string
}

export default function ScentSpotlightClient({ items }: { items: SpotlightItem[] }) {
  const [activeIdx, setActiveIdx] = useState(0)
  const product = items[Math.min(activeIdx, items.length - 1)]

  // Safety: parent should already short-circuit if `items` is empty, but
  // bail here too so this never crashes when toggling tabs.
  if (!product) return null

  const savings =
    product.originalPrice > product.price ? product.originalPrice - product.price : 0

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
          {items.length > 1 && (
            <div className="flex gap-2 flex-wrap">
              {items.map((f, i) => (
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
          )}
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
              {product.rating > 0 && (
                <div className="absolute bottom-6 left-6 bg-white/90 backdrop-blur-md border border-[var(--color-border)] px-5 py-3 flex items-center gap-3 rounded">
                  <div className="flex gap-0.5">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <i
                        key={i}
                        className={`text-xs ${
                          i < Math.round(product.rating)
                            ? 'ri-star-fill text-[var(--color-gold)]'
                            : 'ri-star-line text-[var(--color-gold-soft)]'
                        }`}
                      />
                    ))}
                  </div>
                  <span className="text-[var(--color-ink)] text-xs font-semibold">
                    {product.rating.toFixed(1)}
                  </span>
                  {product.reviews > 0 && (
                    <span className="text-gray-400 text-xs">
                      ({product.reviews} review{product.reviews === 1 ? '' : 's'})
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="w-full lg:w-7/12">
            <p className="text-[var(--color-gold)] tracking-[0.4em] uppercase text-[10px] font-bold mb-2">
              {product.brand}
            </p>
            <h3 className="font-serif text-5xl md:text-6xl font-bold text-[var(--color-ink)] mb-2">
              {product.name}
            </h3>
            {product.tagline && (
              <p className="text-[var(--color-gold)] text-sm italic mb-6 tracking-wide">
                {product.tagline}
              </p>
            )}

            {product.desc && (
              <p className="text-gray-500 text-sm leading-relaxed mb-8 max-w-xl">
                {product.desc}
              </p>
            )}

            {product.notes.length > 0 && (
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
            )}

            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
              <div>
                {product.size && (
                  <p className="text-[10px] tracking-widest uppercase text-gray-400 mb-1">
                    {product.size}
                  </p>
                )}
                <div className="flex items-baseline gap-3">
                  <span className="text-3xl font-bold text-[var(--color-ink)]">
                    ${product.price}
                  </span>
                  {savings > 0 && (
                    <>
                      <span className="text-base text-gray-400 line-through">
                        ${product.originalPrice}
                      </span>
                      <span className="text-xs font-bold text-[var(--color-gold)]">
                        Save ${savings}
                      </span>
                    </>
                  )}
                </div>
              </div>
              <div className="flex gap-3">
                <Link
                  href={product.href}
                  className="bg-[var(--color-gold)] hover:bg-[var(--color-gold-dark)] text-white text-[11px] tracking-widest uppercase font-bold px-8 py-4 transition-colors whitespace-nowrap"
                >
                  Shop Now
                </Link>
                <Link
                  href={product.href}
                  aria-label={`Find ${product.name}`}
                  className="border border-[var(--color-gold-soft)] hover:border-[var(--color-gold)] hover:bg-[var(--color-cream-300)] text-[var(--color-gold)] w-12 h-12 flex items-center justify-center transition-all duration-300 flex-shrink-0"
                >
                  <i className="ri-heart-line text-base" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
