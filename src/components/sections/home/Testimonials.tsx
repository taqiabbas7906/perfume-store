import TestimonialsClient, {
  type TestimonialItem,
} from './TestimonialsClient'

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
    // `cache: 'no-store'` — every render hits MongoDB, so deletions and new
    // reviews show up immediately (no 5-minute ISR window).
    const res = await fetch(
      `${base}/api/reviews?limit=9&minRating=4`,
      { cache: 'no-store' },
    )
    if (!res.ok) return { items: [], total: 0, average: null }
    const data = (await res.json()) as ApiReviewsResponse
    if (!data?.success || !Array.isArray(data.reviews)) {
      return { items: [], total: 0, average: null }
    }

    const items: TestimonialItem[] = data.reviews
      .filter((r) => r.rating >= 4 && r.comment?.trim().length > 0)
      .slice(0, 9)
      .map((r) => {
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

  // No qualifying reviews → hide the section entirely. We never show fake
  // testimonials. Aggregate badge text only renders when we have data.
  if (items.length === 0) return null

  return (
    <TestimonialsClient
      reviews={items}
      average={average ?? items[0]?.rating ?? 5}
      count={total}
    />
  )
}
