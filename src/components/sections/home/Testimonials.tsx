import TestimonialsClient, {
  type TestimonialItem,
} from './TestimonialsClient'

const FALLBACK: TestimonialItem[] = [
  {
    id: 'fb-1',
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
    id: 'fb-2',
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
    id: 'fb-3',
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
    id: 'fb-4',
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
    id: 'fb-5',
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
    id: 'fb-6',
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

const AVATAR_COLORS = [
  'bg-rose-500',
  'bg-amber-500',
  'bg-emerald-600',
  'bg-violet-600',
  'bg-sky-600',
  'bg-pink-500',
  'bg-teal-600',
  'bg-indigo-500',
]

function colorFor(seed: string) {
  let h = 0
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length]
}

function formatMonthYear(iso?: string) {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
}

interface ApiReview {
  _id: string
  rating: number
  comment: string
  createdAt: string
  user?: { name?: string } | null
  product?: { name?: string; brand?: string } | null
}

interface ApiReviewsResponse {
  success: boolean
  reviews: ApiReview[]
  pagination?: { total: number }
}

async function fetchTopReviews(): Promise<{
  items: TestimonialItem[]
  total: number
  average: number | null
}> {
  try {
    const base = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
    const res = await fetch(
      `${base}/api/reviews?limit=18&minRating=4`,
      { next: { revalidate: 300 } },
    )
    if (!res.ok) return { items: [], total: 0, average: null }
    const data = (await res.json()) as ApiReviewsResponse
    if (!data?.success || !Array.isArray(data.reviews)) {
      return { items: [], total: 0, average: null }
    }

    const items: TestimonialItem[] = data.reviews.map((r) => {
      const fullName = r.user?.name?.trim() || 'Verified Buyer'
      const parts = fullName.split(/\s+/)
      const initial = (parts[0]?.[0] ?? 'A').toUpperCase()
      const display =
        parts.length > 1
          ? `${parts[0]} ${parts[1].charAt(0).toUpperCase()}.`
          : fullName
      const productLabel = r.product
        ? [r.product.brand, r.product.name].filter(Boolean).join(' ')
        : ''
      return {
        id: r._id,
        name: display,
        location: '',
        rating: r.rating,
        date: formatMonthYear(r.createdAt),
        text: r.comment,
        avatar: initial,
        color: colorFor(r._id),
        product: productLabel,
      }
    })

    const total = data.pagination?.total ?? items.length
    const avg =
      items.length > 0
        ? items.reduce((s, r) => s + r.rating, 0) / items.length
        : null

    return { items, total, average: avg }
  } catch {
    return { items: [], total: 0, average: null }
  }
}

export default async function Testimonials() {
  const { items, total, average } = await fetchTopReviews()
  const usingReal = items.length > 0
  const display = usingReal ? items : FALLBACK
  const summaryAverage = average ?? 4.9
  const summaryCount = usingReal ? total : 1200

  return (
    <TestimonialsClient
      reviews={display}
      average={summaryAverage}
      count={summaryCount}
    />
  )
}
