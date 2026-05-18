'use client'

interface ShopToolbarProps {
  searchInput: string
  setSearchInput: (value: string) => void
  hasFilters: boolean
  onSubmit: (event: React.FormEvent) => void
  onClearSearch: () => void
  onClearAll: () => void
  onOpenFilters: () => void
}

export default function ShopToolbar({
  searchInput,
  setSearchInput,
  hasFilters,
  onSubmit,
  onClearSearch,
  onClearAll,
  onOpenFilters,
}: ShopToolbarProps) {
  return (
    <section className="border-b border-[var(--color-border-soft)] bg-white px-6 py-3">
      <div className="max-w-7xl mx-auto flex items-center gap-2 sm:gap-4">
        <form
          onSubmit={onSubmit}
          className="flex-1 min-w-0 flex items-center gap-2 sm:gap-3 border border-[var(--color-border)] px-3 sm:px-4 py-2.5 focus-within:border-[var(--color-gold)] transition-colors"
          role="search"
        >
          <i
            className="ri-search-line text-[var(--color-gold)] text-sm shrink-0"
            aria-hidden="true"
          />
          <label htmlFor="shop-search" className="sr-only">
            Search products
          </label>
          <input
            id="shop-search"
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search..."
            className="flex-1 min-w-0 text-sm text-[var(--color-ink)] placeholder-gray-300 outline-none bg-transparent"
          />
          {searchInput && (
            <button
              type="button"
              onClick={onClearSearch}
              className="text-gray-300 hover:text-[var(--color-ink)] transition-colors shrink-0"
              aria-label="Clear search"
            >
              <i className="ri-close-circle-line text-sm" aria-hidden="true" />
            </button>
          )}
        </form>

        <button
          type="button"
          onClick={onOpenFilters}
          className="lg:hidden shrink-0 flex items-center gap-2 border border-[var(--color-border)] px-3 sm:px-4 py-2.5 text-[11px] tracking-widest uppercase font-semibold text-[var(--color-ink)] hover:border-[var(--color-gold)] transition-colors"
          aria-label="Open filters"
        >
          <i className="ri-filter-3-line" aria-hidden="true" />
          <span className="hidden sm:inline">Filters</span>
        </button>

        {hasFilters && (
          <button
            type="button"
            onClick={onClearAll}
            className="hidden lg:flex items-center gap-2 text-[10px] tracking-widest uppercase font-semibold text-[var(--color-gold)] hover:text-[var(--color-ink)] transition-colors whitespace-nowrap"
          >
            <i className="ri-close-line" aria-hidden="true" />
            Clear All
          </button>
        )}
      </div>
    </section>
  )
}
