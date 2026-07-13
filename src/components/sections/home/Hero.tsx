'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useStoreSettings } from '@/lib/useStoreSettings'
import { smartFetch } from '@/lib/api'
import { Skeleton } from '@/components/ui/Skeleton'

interface FeaturedVoucher {
  _id: string
  code: string
  type: 'percentage' | 'fixed' | 'free_shipping'
  value: number
  minOrderAmount: number
  maxDiscountAmount?: number
  expiresAt?: string
}

function fallbackCopy(text: string) {
  if (typeof document === 'undefined') return false
  const t = document.createElement('textarea')
  t.value = text
  t.setAttribute('readonly', '')
  t.style.position = 'fixed'
  t.style.left = '-9999px'
  document.body.appendChild(t)
  t.select()
  try {
    return document.execCommand('copy')
  } finally {
    document.body.removeChild(t)
  }
}

const slides = [
  {
    image:
      'https://res.cloudinary.com/dplgqdkde/image/upload/v1783955603/ca6afc90a137e7b8abd62b2aba29ca02_vtlncg.jpg',
    eyebrow: 'New Season Collection',
    headline: 'Top Niche &',
    headline2: 'Designer Fragrances',
    sub: "The world's most coveted scents — curated for the discerning few.",
    cta: 'Shop Now',
    ctaSecondary: 'Explore Brands',
  },
  {
    image:
      'https://res.cloudinary.com/dplgqdkde/image/upload/v1783956014/2482b4321038e480a641ed3a63b2040a_lzu9qh.jpg',
    eyebrow: 'Exclusive Limited Editions',
    headline: 'Rare & Exclusive',
    headline2: 'Collections',
    sub: 'Discover scents that tell a story only you can wear.',
    cta: 'Explore Now',
    ctaSecondary: 'View Lookbook',
  },
  {
    image:
      'https://res.cloudinary.com/dplgqdkde/image/upload/v1783956070/fb6a4c46d0cbe405ef94e18a9292e6f2_pavjid.jpg',
    eyebrow: 'Designer Pricing — Unmatched',
    headline: 'Authentic Scents,',
    headline2: 'Honest Prices',
    sub: '100% genuine. Honest prices. No compromises.',
    cta: 'Shop Designer',
    ctaSecondary: 'See All Brands',
  },
]

export default function Hero() {
  const [current, setCurrent] = useState(0)
  const [animating, setAnimating] = useState(false)
  const { settings } = useStoreSettings()
  const freeDeliveryOn = settings.freeDelivery.enabled
  const [voucher, setVoucher] = useState<FeaturedVoucher | null>(null)
  const [voucherLoading, setVoucherLoading] = useState(true)
  const [copied, setCopied] = useState(false)
  const copyTimerRef = useRef<number | null>(null)

  useEffect(() => {
    let cancelled = false
    smartFetch('/api/vouchers/featured')
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return
        setVoucher(data?.success && data.voucher ? data.voucher : null)
      })
      .catch(() => {
        if (!cancelled) setVoucher(null)
      })
      .finally(() => {
        if (!cancelled) setVoucherLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    return () => {
      if (copyTimerRef.current) window.clearTimeout(copyTimerRef.current)
    }
  }, [])

  async function copyCode(code: string) {
    let ok = false
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(code)
        ok = true
      } else {
        ok = fallbackCopy(code)
      }
    } catch {
      ok = fallbackCopy(code)
    }
    if (!ok) return
    setCopied(true)
    if (copyTimerRef.current) window.clearTimeout(copyTimerRef.current)
    copyTimerRef.current = window.setTimeout(() => {
      setCopied(false)
      copyTimerRef.current = null
    }, 1800)
  }

  const goTo = useCallback(
    (idx: number) => {
      if (animating) return
      setAnimating(true)
      setTimeout(() => {
        setCurrent(idx)
        setAnimating(false)
      }, 400)
    },
    [animating],
  )

  useEffect(() => {
    const timer = setInterval(() => {
      goTo((current + 1) % slides.length)
    }, 6000)
    return () => clearInterval(timer)
  }, [current, goTo])

  const slide = slides[current]

  return (
    <section className="relative w-full h-screen min-h-[700px] overflow-hidden">
      {slides.map((s, i) => (
        <div
          key={i}
          className={`absolute inset-0 transition-all duration-700 ${
            i === current ? 'opacity-100 scale-100' : 'opacity-0 scale-105'
          }`}
          style={{ transitionTimingFunction: 'cubic-bezier(0.4,0,0.2,1)' }}
        >
          <Image
            src={s.image}
            alt={s.headline}
            fill
            sizes="100vw"
            priority={i === 0}
            className="object-cover object-center"
          />
        </div>
      ))}

      <div className="absolute inset-0 bg-gradient-to-r from-[#fdf8f2]/95 via-[#fdf8f2]/75 to-[#fdf8f2]/10 pointer-events-none" />

      <div className="absolute inset-0 flex flex-col justify-center px-8 md:px-20 lg:px-32 w-full">
        <div className="max-w-2xl">
          <div
            className={`flex items-center gap-3 mb-5 transition-all duration-500 ${
              animating ? 'opacity-0 -translate-y-3' : 'opacity-100 translate-y-0'
            }`}
          >
            <div className="w-8 h-[1px] bg-[var(--color-gold)]" />
            <span className="text-[var(--color-gold)] tracking-[0.5em] uppercase text-[10px] font-semibold">
              {slide.eyebrow}
            </span>
          </div>

          <h1
            className={`font-serif text-6xl md:text-8xl font-light text-[var(--color-ink)] leading-[1.05] transition-all duration-500 delay-75 ${
              animating ? 'opacity-0 translate-y-4' : 'opacity-100 translate-y-0'
            }`}
          >
            {slide.headline}
          </h1>
          <h2
            className={`font-serif text-6xl md:text-8xl font-bold text-[var(--color-ink)] leading-[1.05] mb-7 transition-all duration-500 delay-100 ${
              animating ? 'opacity-0 translate-y-4' : 'opacity-100 translate-y-0'
            }`}
          >
            {slide.headline2}
          </h2>

          <p
            className={`text-[var(--color-ink-soft)] text-base font-light mb-10 max-w-md leading-relaxed tracking-wide transition-all duration-500 delay-150 ${
              animating ? 'opacity-0 translate-y-3' : 'opacity-100 translate-y-0'
            }`}
          >
            {slide.sub}
          </p>

          <div
            className={`flex flex-wrap gap-4 transition-all duration-500 delay-200 ${
              animating ? 'opacity-0 translate-y-3' : 'opacity-100 translate-y-0'
            }`}
          >
            <Link
              href="/shop"
              className="group bg-[var(--color-ink)] text-white text-[11px] tracking-[0.25em] uppercase font-bold px-10 py-4 whitespace-nowrap transition-all duration-300 hover:bg-[var(--color-gold)]"
            >
              {slide.cta}
              <span className="ml-3 inline-block transition-transform duration-300 group-hover:translate-x-1">
                →
              </span>
            </Link>
            <a
              href="#brands"
              className="border border-[var(--color-ink)] text-[var(--color-ink)] hover:border-[var(--color-gold)] hover:text-[var(--color-gold)] text-[11px] tracking-[0.25em] uppercase font-semibold px-10 py-4 transition-all duration-300 whitespace-nowrap"
            >
              {slide.ctaSecondary}
            </a>
          </div>
        </div>
      </div>

      {voucherLoading && (
        <div
          aria-hidden="true"
          className="absolute top-1/2 right-8 md:right-20 -translate-y-1/2 hidden md:flex flex-col items-center border border-[var(--color-gold-soft)] bg-white p-7 gap-2 w-[180px]"
        >
          <Skeleton className="h-2 w-20" />
          <Skeleton className="h-10 w-16 mt-1" />
          <Skeleton className="h-2 w-10" />
          <Skeleton className="h-2 w-16 mt-1" />
          <Skeleton className="h-7 w-full mt-2" />
        </div>
      )}

      {!voucherLoading && voucher && (
        <button
          type="button"
          onClick={() => void copyCode(voucher.code)}
          aria-label={`Copy voucher code ${voucher.code}`}
          className="absolute top-1/2 right-8 md:right-20 -translate-y-1/2 hidden md:flex flex-col items-center border border-[var(--color-gold-soft)] bg-white p-7 gap-1 cursor-pointer transition-colors hover:border-[var(--color-gold)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-gold)] focus-visible:ring-offset-2"
        >
          <span className="text-[9px] tracking-[0.4em] uppercase text-[var(--color-gold-deep)] font-medium">
            Exclusive Offer
          </span>
          {voucher.type === 'free_shipping' ? (
            <>
              <span className="text-3xl font-bold text-[var(--color-gold)] leading-none mt-1">
                Free
              </span>
              <span className="text-[10px] font-bold tracking-widest uppercase text-[var(--color-ink)] mt-1">
                Shipping
              </span>
            </>
          ) : voucher.type === 'percentage' ? (
            <>
              <span className="text-5xl font-bold text-[var(--color-gold)] leading-none">
                {voucher.value}%
              </span>
              <span className="text-[10px] font-bold tracking-widest uppercase text-[var(--color-ink)]">
                OFF
              </span>
            </>
          ) : (
            <>
              <span className="text-5xl font-bold text-[var(--color-gold)] leading-none">
                ${voucher.value}
              </span>
              <span className="text-[10px] font-bold tracking-widest uppercase text-[var(--color-ink)]">
                OFF
              </span>
            </>
          )}
          <span className="text-[9px] tracking-widest uppercase font-light text-[var(--color-gold-deep)] mt-1">
            {voucher.minOrderAmount > 0
              ? `Min $${voucher.minOrderAmount}`
              : 'Your Order'}
          </span>
          <div className="border border-[var(--color-gold-soft)] mt-3 py-1.5 px-4 w-full text-center bg-[var(--color-cream-300)]">
            <span className="text-[11px] font-bold tracking-[0.3em] text-[var(--color-gold)]">
              {copied ? 'COPIED' : voucher.code}
            </span>
          </div>
          {freeDeliveryOn && voucher.type !== 'free_shipping' && (
            <span className="text-[9px] mt-2 text-[var(--color-ink-muted)] tracking-wider">
              + Free Shipping
            </span>
          )}
        </button>
      )}

      <div className="absolute bottom-10 left-8 md:left-20 lg:left-32 flex items-center gap-6">
        <div className="flex gap-2">
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={() => goTo(i)}
              aria-label={`Slide ${i + 1}`}
              className={`transition-all duration-500 rounded-full ${
                i === current
                  ? 'w-8 h-2 bg-[var(--color-gold)]'
                  : 'w-2 h-2 bg-[var(--color-ink)]/20 hover:bg-[var(--color-gold)]/50'
              }`}
            />
          ))}
        </div>
        <span className="text-[var(--color-ink)]/40 text-xs tracking-widest font-light">
          0{current + 1} / 0{slides.length}
        </span>
      </div>

      <div className="absolute bottom-10 right-8 md:right-20 hidden md:flex flex-col items-center gap-2">
        <span className="text-[9px] tracking-[0.4em] uppercase text-[var(--color-ink-muted)] rotate-90 mb-4">
          Scroll
        </span>
        <div className="w-[1px] h-12 bg-gradient-to-b from-[var(--color-gold)]/60 to-transparent" />
      </div>
    </section>
  )
}
