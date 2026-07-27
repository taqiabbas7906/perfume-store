'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useStoreSettings } from '@/lib/useStoreSettings'

const baseStats = [
  { value: '50+', label: 'Brands Available' },
  { value: '10K+', label: 'Happy Customers' },
  { value: '100%', label: 'Secure Checkout' },
]
const freeStat = { value: 'Free', label: 'Fast Shipping Always' }

const baseTrust = [
  { icon: 'ri-verified-badge-line', text: '100% Authentic' },
  { icon: 'ri-lock-line', text: 'Secure Checkout' },
]
const freeTrust = { icon: 'ri-truck-line', text: 'Free Shipping' }

export default function PromoBanner() {
  const { settings } = useStoreSettings()
  const freeOn = settings.freeDelivery.enabled
  // Keep the bottom stats row at 4 items so the grid layout doesn't collapse —
  // swap the "Free Shipping" tile for an authenticity tile when free delivery
  // is off.
  const stats = freeOn
    ? [...baseStats, freeStat]
    : [...baseStats, { value: '100%', label: 'Authentic Guarantee' }]
  const trust = freeOn ? [baseTrust[0], freeTrust, baseTrust[1]] : baseTrust

  return (
    <section className="relative w-full overflow-hidden">
      <div className="flex flex-col lg:flex-row min-h-[420px] md:min-h-[500px]">
        <div className="w-full lg:w-[48%] bg-[var(--color-cream-300)] flex flex-col justify-center px-8 md:px-14 lg:px-16 py-16 lg:py-0 flex-shrink-0">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-8 h-[1px] bg-[var(--color-gold)]" />
            <p className="text-[var(--color-gold)] tracking-[0.45em] uppercase text-[10px] font-bold">
              Designer Collection
            </p>
          </div>

          <h2 className="font-serif text-4xl md:text-5xl lg:text-6xl font-light text-[var(--color-ink)] leading-[1.1] mb-1">
            Best Pricing On
          </h2>
          <h3 className="font-serif text-4xl md:text-5xl lg:text-6xl font-bold text-[var(--color-ink)] leading-[1.1] mb-6">
            Designer Fragrances
          </h3>

          <p className="text-[var(--color-ink-soft)] text-sm md:text-base font-light max-w-sm mb-8 leading-relaxed">
            Discover our Designer Fragrance Collection — your favorite designer
            perfumes, all in one place. Authentic, affordable, unforgettable.
          </p>

          <div className="flex items-center gap-4">
            <Link
              href="/shop?category=designer"
              className="inline-block bg-[var(--color-ink)] text-white hover:bg-[var(--color-gold)] text-[11px] tracking-widest uppercase font-bold px-10 py-4 transition-all duration-300 whitespace-nowrap"
            >
              Shop Designer
            </Link>
            <Link
              href="/shop"
              className="text-[11px] tracking-widest uppercase font-semibold text-[var(--color-gold)] hover:text-[var(--color-gold-dark)] whitespace-nowrap flex items-center gap-2 group"
            >
              View All
              <i className="ri-arrow-right-line transition-transform duration-300 group-hover:translate-x-1" />
            </Link>
          </div>

          <div className="flex flex-wrap gap-5 mt-10 pt-8 border-t border-[var(--color-border)]">
            {trust.map((b) => (
              <div key={b.text} className="flex items-center gap-2">
                <div className="w-6 h-6 flex items-center justify-center">
                  <i className={`${b.icon} text-[var(--color-gold)] text-sm`} />
                </div>
                <span className="text-[10px] tracking-wider uppercase text-[var(--color-gold-deep)] font-semibold">
                  {b.text}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="w-full lg:w-[52%] relative min-h-[280px] lg:min-h-0 flex-shrink-0">
          <Image
            src="https://res.cloudinary.com/dplgqdkde/image/upload/v1783956142/a240f9f8dcf0be925f7f3bda06dff918_p4xd4r.jpg"
            alt="Designer Fragrances"
            fill
            sizes="(min-width: 1024px) 52vw, 100vw"
            className="object-cover object-center"
          />
        </div>
      </div>

      <div className="bg-[var(--color-ink)] py-8 px-6">
        <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {stats.map((stat) => (
            <div key={stat.label} className="flex flex-col items-center">
              <span className="text-3xl font-bold text-[var(--color-gold)]">
                {stat.value}
              </span>
              <span className="text-white/60 text-xs tracking-widest uppercase mt-1 font-light">
                {stat.label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
