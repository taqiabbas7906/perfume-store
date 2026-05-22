'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useStoreSettings } from '@/lib/useStoreSettings'

const baseTrust = [
  { icon: 'ri-shield-check-line', text: 'BBB Accredited Business' },
  { icon: 'ri-store-line', text: 'Independent Fragrance Retailer' },
]
const freeTrust = { icon: 'ri-truck-line', text: 'Always Fast & Free Shipping' }

export default function AboutBanner() {
  const { settings } = useStoreSettings()
  const trust = settings.freeDelivery.enabled ? [...baseTrust, freeTrust] : baseTrust

  return (
    <section id="about" className="bg-[var(--color-cream-500)] py-20 px-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col lg:flex-row items-center gap-12">
          <div className="w-full lg:w-1/2">
            <div className="relative">
              <div className="relative w-full h-[420px]">
                <Image
                  src="https://readdy.ai/api/search-image?query=two%20professional%20perfume%20shop%20owners%20standing%20in%20elegant%20fragrance%20boutique%2C%20surrounded%20by%20luxury%20perfume%20bottles%20on%20shelves%2C%20well%20dressed%20confident%20business%20owners%2C%20warm%20inviting%20store%20interior%2C%20golden%20lighting%2C%20professional%20portrait%20photography&width=600&height=420&seq=about1&orientation=landscape"
                  alt="About Inscentives Perfume"
                  fill
                  sizes="(min-width: 1024px) 50vw, 100vw"
                  className="object-cover object-top"
                />
              </div>
              <div className="absolute -bottom-6 -right-6 bg-[var(--color-gold)] text-white p-6 hidden md:block">
                <div className="text-3xl font-bold text-white">10+</div>
                <div className="text-xs tracking-widest uppercase mt-1 text-white/80 font-light">
                  Years of Excellence
                </div>
              </div>
            </div>
          </div>

          <div className="w-full lg:w-1/2 lg:pl-8">
            <p className="text-[var(--color-gold)] tracking-[0.4em] uppercase text-xs font-semibold mb-4">
              Who We Are
            </p>
            <h2 className="font-serif text-4xl font-light text-[var(--color-ink)] leading-tight mb-6">
              Your Trusted Fragrance{' '}
              <strong className="font-bold">Retailer</strong>
            </h2>
            <p className="text-gray-500 leading-relaxed mb-6 text-sm">
              Inscentives Perfume is an independent fragrance retailer committed
              to bringing you the world&apos;s finest scents at prices that
              won&apos;t break the bank. Every bottle we carry is 100% authentic,
              sourced directly from brand distributors.
            </p>
            <p className="text-gray-500 leading-relaxed mb-8 text-sm">
              From niche artisan houses to beloved designer names, our curated
              collection spans the full spectrum of fine fragrance — with expert
              guidance to help you find your perfect scent.
            </p>

            <div className="flex flex-col gap-3 mb-8">
              {trust.map((point) => (
                <div key={point.text} className="flex items-center gap-3">
                  <div className="w-8 h-8 flex items-center justify-center bg-[var(--color-gold)]/10">
                    <i className={`${point.icon} text-[var(--color-gold)] text-base`} />
                  </div>
                  <span className="text-sm text-[var(--color-ink)] font-medium">
                    {point.text}
                  </span>
                </div>
              ))}
            </div>

            <Link
              href="/shop"
              className="inline-block bg-[var(--color-gold)] hover:bg-[var(--color-gold-dark)] text-white text-xs tracking-widest uppercase font-semibold px-10 py-4 transition-colors whitespace-nowrap"
            >
              Shop Our Collection
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}
