'use client'

import { useState } from 'react'

const reviews = [
  {
    id: 1,
    name: 'Shannon A.',
    location: 'Miami, FL',
    rating: 5,
    date: 'March 2026',
    text:
      'Awesome customer service and team! Great prices and they ship incredibly fast. I will definitely be a return customer for all of my fragrance needs. Best online perfume shop, period.',
    avatar: 'S',
    color: 'bg-rose-500',
    product: 'Creed Aventus',
  },
  {
    id: 2,
    name: 'LaSyd S.',
    location: 'Atlanta, GA',
    rating: 5,
    date: 'February 2026',
    text:
      'Great price and very fast shipping! City Rhythm Miami is intoxicating! Only wished I had ordered a bigger bottle. Should have bought the 100ml. Inscentives Perfume is legit!',
    avatar: 'L',
    color: 'bg-amber-500',
    product: 'Bond No.9 City Rhythm',
  },
  {
    id: 3,
    name: 'Donovan M.',
    location: 'New York, NY',
    rating: 5,
    date: 'April 2026',
    text:
      'Excellent product, excellent service. Packaging was perfect and the fragrance is absolutely divine. Will order again without hesitation. Highly recommend to any fragrance enthusiast.',
    avatar: 'D',
    color: 'bg-emerald-600',
    product: 'Tom Ford Oud Wood',
  },
  {
    id: 4,
    name: 'Priya K.',
    location: 'Houston, TX',
    rating: 5,
    date: 'April 2026',
    text:
      'I was skeptical buying fragrances online but Inscentives completely won me over. The bottle arrived beautifully wrapped and the scent is 100% authentic. Incredible value for money.',
    avatar: 'P',
    color: 'bg-violet-600',
    product: 'MFK Baccarat Rouge 540',
  },
  {
    id: 5,
    name: 'Marcus T.',
    location: 'Chicago, IL',
    rating: 5,
    date: 'March 2026',
    text:
      "Third time ordering and every experience has been flawless. Their selection is unmatched — I found fragrances here I couldn't find anywhere else. Fast shipping, great prices, authentic products.",
    avatar: 'M',
    color: 'bg-sky-600',
    product: 'Byredo Mojave Ghost',
  },
  {
    id: 6,
    name: 'Isabella R.',
    location: 'Los Angeles, CA',
    rating: 5,
    date: 'May 2026',
    text:
      'Ordered Santal 33 as a gift and my friend absolutely loved it. The presentation was gorgeous. Will be gifting from Inscentives for every occasion from now on. Highly recommend!',
    avatar: 'I',
    color: 'bg-pink-500',
    product: 'Le Labo Santal 33',
  },
]

const trust = [
  { icon: 'ri-verified-badge-line', label: '100% Authentic' },
  { icon: 'ri-truck-line', label: 'Free Shipping' },
  { icon: 'ri-lock-password-line', label: 'Secure Checkout' },
  { icon: 'ri-refresh-line', label: 'Easy Returns' },
  { icon: 'ri-customer-service-2-line', label: 'Expert Support' },
]

export default function Testimonials() {
  const [page, setPage] = useState(0)
  const perPage = 3
  const totalPages = Math.ceil(reviews.length / perPage)
  const visible = reviews.slice(page * perPage, page * perPage + perPage)

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
                <i key={i} className="ri-star-fill text-[var(--color-gold)] text-base" />
              ))}
            </div>
            <span className="text-xl font-bold text-[var(--color-ink)]">4.9</span>
            <span className="text-sm text-gray-400">
              / 5 &nbsp;·&nbsp; 1,200+ verified reviews
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
                    <p className="text-sm font-semibold text-[var(--color-ink)]">{r.name}</p>
                    <p className="text-[10px] text-gray-400 tracking-wider">{r.location}</p>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <div className="flex gap-0.5">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <i key={i} className="ri-star-fill text-[var(--color-gold)] text-xs" />
                    ))}
                  </div>
                  <p className="text-[9px] text-gray-400 tracking-wider">{r.date}</p>
                </div>
              </div>

              <i className="ri-double-quotes-l text-[var(--color-gold)]/30 text-3xl -mb-2" />

              <p className="text-sm text-gray-500 leading-relaxed flex-1">{r.text}</p>

              <div className="flex items-center gap-2 pt-3 border-t border-gray-100">
                <i className="ri-shopping-bag-2-line text-[var(--color-gold)] text-xs" />
                <span className="text-[10px] text-gray-400 tracking-wider">
                  Purchased:{' '}
                  <strong className="text-[var(--color-ink)] font-semibold">
                    {r.product}
                  </strong>
                </span>
              </div>
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
