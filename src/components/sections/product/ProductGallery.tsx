'use client'

import { useState } from 'react'
import Image from 'next/image'

interface ProductGalleryProps {
  images: { url: string; alt?: string }[]
  name: string
  badge?: string
}

const BADGE_COLORS: Record<string, string> = {
  HOT: 'bg-red-500',
  NEW: 'bg-[var(--color-ink-muted)]',
  SALE: 'bg-[var(--color-gold)]',
  BESTSELLER: 'bg-emerald-800',
}

export default function ProductGallery({ images, name, badge }: ProductGalleryProps) {
  const [activeIndex, setActiveIndex] = useState(0)
  const [zoomed, setZoomed] = useState(false)
  const [zoomPos, setZoomPos] = useState({ x: 50, y: 50 })
  const list = images.length > 0 ? images : [{ url: '', alt: name }]
  const active = list[activeIndex]

  const prev = () => setActiveIndex((i) => (i === 0 ? list.length - 1 : i - 1))
  const next = () => setActiveIndex((i) => (i === list.length - 1 ? 0 : i + 1))

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!zoomed) return
    const rect = e.currentTarget.getBoundingClientRect()
    setZoomPos({
      x: ((e.clientX - rect.left) / rect.width) * 100,
      y: ((e.clientY - rect.top) / rect.height) * 100,
    })
  }

  return (
    <div className="flex flex-col-reverse md:flex-row gap-4 lg:gap-5 w-full">
      {list.length > 1 && (
        <div className="flex md:flex-col gap-2.5 overflow-x-auto md:overflow-visible pb-1 md:pb-0">
          {list.map((img, i) => (
            <button
              key={i}
              onClick={() => setActiveIndex(i)}
              className={`relative flex-shrink-0 w-16 h-20 md:w-[72px] md:h-[90px] border-2 overflow-hidden transition-all duration-200 ${
                i === activeIndex
                  ? 'border-[var(--color-gold)]'
                  : 'border-transparent hover:border-[var(--color-border)]'
              }`}
            >
              {img.url && (
                <Image
                  src={img.url}
                  alt={img.alt || `${name} view ${i + 1}`}
                  fill
                  sizes="72px"
                  className="object-cover object-top"
                />
              )}
            </button>
          ))}
        </div>
      )}

      <div className="flex-1 relative">
        {badge && (
          <span
            className={`absolute top-4 left-4 z-10 text-[10px] font-bold tracking-widest uppercase text-white px-3 py-1 ${
              BADGE_COLORS[badge] ?? 'bg-[var(--color-ink)]'
            }`}
          >
            {badge}
          </span>
        )}

        <div
          className="relative w-full aspect-[4/5] bg-[var(--color-cream-500)] overflow-hidden cursor-zoom-in select-none"
          onMouseEnter={() => setZoomed(true)}
          onMouseLeave={() => setZoomed(false)}
          onMouseMove={handleMouseMove}
        >
          {active.url && (
            <Image
              src={active.url}
              alt={active.alt || name}
              fill
              priority
              sizes="(min-width: 1024px) 40vw, 100vw"
              className="object-cover object-top"
              style={
                zoomed
                  ? {
                      transform: 'scale(2)',
                      transformOrigin: `${zoomPos.x}% ${zoomPos.y}%`,
                      transition: 'transform 0.1s ease',
                    }
                  : { transform: 'scale(1)', transition: 'transform 0.3s ease' }
              }
            />
          )}

          {list.length > 1 && (
            <>
              <button
                onClick={prev}
                className="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center bg-white/80 hover:bg-white text-[var(--color-ink)] transition-all duration-200 z-10"
                aria-label="Previous image"
              >
                <i className="ri-arrow-left-s-line text-lg" />
              </button>
              <button
                onClick={next}
                className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center bg-white/80 hover:bg-white text-[var(--color-ink)] transition-all duration-200 z-10"
                aria-label="Next image"
              >
                <i className="ri-arrow-right-s-line text-lg" />
              </button>
            </>
          )}
        </div>

        {list.length > 1 && (
          <div className="flex items-center justify-center gap-1.5 mt-3">
            {list.map((_, i) => (
              <button
                key={i}
                aria-label={`Image ${i + 1}`}
                onClick={() => setActiveIndex(i)}
                className={`transition-all duration-200 rounded-full ${
                  i === activeIndex
                    ? 'w-5 h-1.5 bg-[var(--color-gold)]'
                    : 'w-1.5 h-1.5 bg-[var(--color-border)]'
                }`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
