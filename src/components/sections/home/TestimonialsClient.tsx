'use client'

import { useState } from 'react'
import { useStoreSettings } from '@/lib/useStoreSettings'

export interface TestimonialItem {
  id: string
  name: string
  location: string
  rating: number
  date: string
  text: string
  avatar: string
  color: string
  product: string
}

const baseTrust = [
  { icon: 'ri-verified-badge-line', label: '100% Authentic' },
  { icon: 'ri-lock-password-line', label: 'Secure Checkout' },
  { icon: 'ri-refresh-line', label: 'Easy Returns' },
  { icon: 'ri-customer-service-2-line', label: 'Expert Support' },
]
const freeTrust = { icon: 'ri-truck-line', label: 'Free Shipping' }

const PER_PAGE = 3

export default function TestimonialsClient({
  reviews,
  average,
  count,
}: {
  reviews: TestimonialItem[]
  average: number
  count: number
}) {
  const [page, setPage] = useState(0)
  const totalPages = Math.max(1, Math.ceil(reviews.length / PER_PAGE))
  const visible = reviews.slice(page * PER_PAGE, page * PER_PAGE + PER_PAGE)
  const { settings } = useStoreSettings()
  // Slot the Free Shipping badge in between Authentic and Secure Checkout so
  // the badge row keeps its original visual rhythm when the toggle is on.
  const trust = settings.freeDelivery.enabled
    ? [baseTrust[0], freeTrust, ...baseTrust.slice(1)]
    : baseTrust

  const formattedCount = count >= 1000 ? `${(count / 1000).toFixed(1).replace(/\.0$/, '')}K+` : count.toString()

  return (
    <section id="reviews" className="py-20 px-6 bg-white">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-14">
          <p className="text-[var(--color-gold)] tracking-[0.5em] uppercase text-[10px] font-semibold mb-3">
            Customer Love
          </p>
          <h2 className="font-serif text-4xl md:text-5xl font-light text-[var(--color-ink)]">
            What Our Customers Say
          </h2>
          <div className="flex items-center justify-center gap-2 mt-5">
            <div className="flex gap-1">
              {Array.from({ length: 5 }).map((_, i) => (
                <i
                  key={i}
                  className={`text-base ${
                    i < Math.floor(average)
                      ? 'ri-star-fill text-[var(--color-gold)]'
                      : i < average
                        ? 'ri-star-half-fill text-[var(--color-gold)]'
                        : 'ri-star-line text-gray-300'
                  }`}
                />
              ))}
            </div>
            <span className="text-xl font-bold text-[var(--color-ink)]">
              {average.toFixed(1)}
            </span>
            <span className="text-sm text-gray-400">
              / 5 &nbsp;·&nbsp; {formattedCount} verified reviews
            </span>
          </div>
          <div className="w-10 h-[1px] bg-[var(--color-gold)] mx-auto mt-5" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {visible.map((r) => (
            <div
              key={r.id}
              className="bg-[var(--color-cream-500)] p-7 flex flex-col gap-4 hover:bg-[var(--color-cream-600)] transition-colors duration-300"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-10 h-10 flex items-center justify-center rounded-full text-white text-sm font-bold flex-shrink-0 ${r.color}`}
                  >
                    {r.avatar}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-[var(--color-ink)]">
                      {r.name}
                    </p>
                    {r.location && (
                      <p className="text-[10px] text-gray-400 tracking-wider">
                        {r.location}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <div className="flex gap-0.5">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <i
                        key={i}
                        className={`text-xs ${
                          i < r.rating
                            ? 'ri-star-fill text-[var(--color-gold)]'
                            : 'ri-star-line text-gray-300'
                        }`}
                      />
                    ))}
                  </div>
                  {r.date && (
                    <p className="text-[9px] text-gray-400 tracking-wider">
                      {r.date}
                    </p>
                  )}
                </div>
              </div>

              <i className="ri-double-quotes-l text-[var(--color-gold)]/30 text-3xl -mb-2" />

              <p className="text-sm text-gray-500 leading-relaxed flex-1">
                {r.text}
              </p>

              {r.product && (
                <div className="flex items-center gap-2 pt-3 border-t border-gray-100">
                  <i className="ri-shopping-bag-2-line text-[var(--color-gold)] text-xs" />
                  <span className="text-[10px] text-gray-400 tracking-wider">
                    Purchased:{' '}
                    <strong className="text-[var(--color-ink)] font-semibold">
                      {r.product}
                    </strong>
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>

        {totalPages > 1 && (
          <div className="flex justify-center gap-2 mt-10">
            {Array.from({ length: totalPages }).map((_, i) => (
              <button
                key={i}
                aria-label={`Page ${i + 1}`}
                onClick={() => setPage(i)}
                className={`transition-all duration-300 rounded-full ${
                  i === page
                    ? 'w-8 h-2 bg-[var(--color-gold)]'
                    : 'w-2 h-2 bg-gray-300 hover:bg-gray-400'
                }`}
              />
            ))}
          </div>
        )}

        <div className="flex flex-wrap items-center justify-center gap-10 mt-16 pt-12 border-t border-gray-100">
          {trust.map((b) => (
            <div key={b.label} className="flex flex-col items-center gap-2.5">
              <div className="w-11 h-11 flex items-center justify-center border border-[var(--color-gold)]/30 hover:bg-[var(--color-gold)]/5 transition-colors">
                <i className={`${b.icon} text-[var(--color-gold)] text-lg`} />
              </div>
              <span className="text-[10px] tracking-widest uppercase text-gray-400 font-semibold">
                {b.label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
