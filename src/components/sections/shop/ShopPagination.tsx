'use client'

import type { StorefrontPagination } from '@/types/storefront'

interface ShopPaginationProps {
  pagination: StorefrontPagination | null
  onPageChange: (page: number) => void
}

export default function ShopPagination({
  pagination,
  onPageChange,
}: ShopPaginationProps) {
  if (!pagination || pagination.totalPages <= 1) return null

  return (
    <nav
      className="flex items-center justify-center gap-2 mt-12"
      aria-label="Product pages"
    >
      <button
        type="button"
        disabled={pagination.page <= 1}
        onClick={() => onPageChange(Math.max(1, pagination.page - 1))}
        className="inline-flex items-center gap-2 text-xs tracking-widest uppercase font-semibold text-[var(--color-ink)] hover:text-[var(--color-gold)] disabled:opacity-30 disabled:cursor-not-allowed px-3 py-2 border border-[var(--color-border)]"
      >
        <i className="ri-arrow-left-line" aria-hidden="true" />
        Prev
      </button>
      <span className="text-xs tracking-widest uppercase text-gray-500 mx-2">
        Page {pagination.page} / {pagination.totalPages}
      </span>
      <button
        type="button"
        disabled={!pagination.hasMore}
        onClick={() => onPageChange(pagination.page + 1)}
        className="inline-flex items-center gap-2 text-xs tracking-widest uppercase font-semibold text-[var(--color-ink)] hover:text-[var(--color-gold)] disabled:opacity-30 disabled:cursor-not-allowed px-3 py-2 border border-[var(--color-border)]"
      >
        Next
        <i className="ri-arrow-right-line" aria-hidden="true" />
      </button>
    </nav>
  )
}
