'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useCart } from '@/context/CartContext'
import { useSearch } from '@/context/SearchContext'
import { useStoreSettings } from '@/lib/useStoreSettings'

interface BrandOption {
  _id: string
  name: string
  slug?: string
}

const navLinks = [
  { label: 'Home', href: '/', isRoute: true },
  { label: 'Shop', href: '/shop', isRoute: true },
  { label: 'Brands', href: '/shop', isRoute: true, kind: 'brands' as const },
  { label: 'Collections', href: '/collections', isRoute: true },
  { label: 'About Us', href: '/about', isRoute: true },
  { label: 'Reviews', href: '/#reviews', isRoute: false },
]

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [brandsDropdownOpen, setBrandsDropdownOpen] = useState(false)
  const [mobileBrandsOpen, setMobileBrandsOpen] = useState(false)
  const [brands, setBrands] = useState<BrandOption[]>([])
  const [brandsLoaded, setBrandsLoaded] = useState(false)
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const { openCart, totalItems } = useCart()
  const { openSearch } = useSearch()
  const { settings: storeSettings } = useStoreSettings()

  /**
   * Top-bar copy resolves in this order:
   *   1. Admin-configured tagline (Dashboard → Homepage Message)
   *   2. Auto-generated free-delivery message when the store has global
   *      free delivery turned on
   *   3. null → the bar is hidden entirely
   * That way the operator can ship store-wide promotions without code
   * changes, and turning free delivery off also turns off the free-delivery
   * brag without leaving stale copy on the site.
   */
  const adminTagline = storeSettings.homepage.tagline.trim()
  const { enabled: freeDeliveryOn, threshold } = storeSettings.freeDelivery
  const autoTagline = freeDeliveryOn
    ? threshold > 0
      ? `Free Shipping on Orders Over $${threshold.toFixed(2).replace(/\.00$/, '')}`
      : 'Always Fast & Free Shipping — No Minimum Order'
    : null
  const topBarText = adminTagline || autoTagline
  const pathname = usePathname()

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 40)
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // Lazy-fetch brands the first time the user opens the dropdown.
  useEffect(() => {
    if (!brandsDropdownOpen && !mobileBrandsOpen) return
    if (brandsLoaded) return
    let cancelled = false
    fetch('/api/brands')
      .then((r) => r.json())
      .then((data) => {
        if (cancelled || !data?.success) return
        setBrands(
          (data.brands ?? []).map(
            (b: { _id: string; name: string; slug?: string }) => ({
              _id: String(b._id),
              name: b.name,
              slug: b.slug,
            }),
          ),
        )
        setBrandsLoaded(true)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [brandsDropdownOpen, mobileBrandsOpen, brandsLoaded])

  // Close dropdown when route changes.
  useEffect(() => {
    const timer = window.setTimeout(() => {
      setBrandsDropdownOpen(false)
      setMobileBrandsOpen(false)
      setMenuOpen(false)
    }, 0)
    return () => window.clearTimeout(timer)
  }, [pathname])

  // Close on Escape.
  useEffect(() => {
    if (!brandsDropdownOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setBrandsDropdownOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [brandsDropdownOpen])

  const isHome = pathname === '/'
  const showSolid = scrolled || !isHome

  const openBrands = () => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current)
      closeTimerRef.current = null
    }
    setBrandsDropdownOpen(true)
  }
  const scheduleCloseBrands = () => {
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current)
    closeTimerRef.current = setTimeout(() => {
      setBrandsDropdownOpen(false)
      closeTimerRef.current = null
    }, 120)
  }

  return (
    <>
      {topBarText && (
        <div className="bg-[var(--color-cream-400)] text-[var(--color-gold-deep)] text-center text-[11px] sm:text-xs px-4 sm:px-6 py-2 tracking-widest uppercase font-semibold border-b border-[var(--color-border)]">
          {topBarText}
        </div>
      )}

      <header
        className={`w-full z-50 transition-all duration-400 ${
          showSolid
            ? 'fixed top-0 bg-white border-b border-[var(--color-border-soft)]'
            : 'absolute top-8 bg-transparent'
        }`}
      >
        <div className="mt-[8px] max-w-7xl mx-auto px-6 flex items-center justify-between h-20">
          <Link href="/" className="flex flex-col items-center group">
            <div className="w-8 h-8 flex items-center justify-center transition-transform duration-300 group-hover:scale-110">
              <i className="ri-leaf-line text-2xl text-[var(--color-gold)]" />
            </div>
            <span className="tracking-[0.3em] uppercase text-xs font-semibold text-[var(--color-ink)] mt-0.5">
              Minzoshop
            </span>
            <span className="tracking-[0.2em] uppercase text-[9px] text-[var(--color-gold)] -mt-0.5">
              Perfume
            </span>
          </Link>

          <nav
            className="hidden md:flex items-center gap-8"
            aria-label="Primary navigation"
          >
            {navLinks.map((link) => {
              // Brands shares the /shop href but isn't the "current page";
              // suppress the active underline for it so only "Shop" lights up.
              const isActive =
                link.kind === 'brands'
                  ? false
                  : link.isRoute
                    ? pathname === link.href
                    : false
              const baseCls = `text-xs tracking-widest uppercase font-medium transition-all duration-200 cursor-pointer whitespace-nowrap relative group ${
                isActive
                  ? 'text-[var(--color-gold)]'
                  : 'text-[var(--color-ink)] hover:text-[var(--color-gold)]'
              }`
              const underline = (
                <span
                  className={`absolute -bottom-1 left-0 h-[1px] bg-[var(--color-gold)] transition-all duration-300 ${
                    isActive ? 'w-full' : 'w-0 group-hover:w-full'
                  }`}
                />
              )

              if (link.kind === 'brands') {
                return (
                  <div
                    key={link.label}
                    className="relative"
                    onMouseEnter={openBrands}
                    onMouseLeave={scheduleCloseBrands}
                  >
                    <Link
                      href="/shop"
                      className={`${baseCls} inline-flex items-center gap-1`}
                      aria-haspopup="true"
                      aria-expanded={brandsDropdownOpen}
                    >
                      {link.label}
                      <i
                        className={`ri-arrow-down-s-line text-sm transition-transform duration-200 ${
                          brandsDropdownOpen ? 'rotate-180' : ''
                        }`}
                      />
                      {underline}
                    </Link>

                    {brandsDropdownOpen && (
                      <BrandsDropdown brands={brands} loaded={brandsLoaded} />
                    )}
                  </div>
                )
              }

              return link.isRoute ? (
                <Link key={link.label} href={link.href} className={baseCls}>
                  {link.label}
                  {underline}
                </Link>
              ) : (
                <a key={link.label} href={link.href} className={baseCls}>
                  {link.label}
                  {underline}
                </a>
              )
            })}
          </nav>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={openSearch}
              className="w-9 h-9 flex items-center justify-center cursor-pointer text-[var(--color-ink)] hover:text-[var(--color-gold)] transition-colors rounded-full hover:bg-[var(--color-cream-300)]"
              aria-label="Search"
            >
              <i className="ri-search-line text-lg" />
            </button>

            <Link
              href="/account"
              className={`w-9 h-9 flex items-center justify-center cursor-pointer transition-colors rounded-full hover:bg-[var(--color-cream-300)] ${
                pathname?.startsWith('/account')
                  ? 'text-[var(--color-gold)]'
                  : 'text-[var(--color-ink)] hover:text-[var(--color-gold)]'
              }`}
              aria-label="My Account"
            >
              <i className="ri-user-line text-lg" />
            </Link>

            <button
              type="button"
              onClick={openCart}
              className="w-9 h-9 flex items-center justify-center cursor-pointer text-[var(--color-ink)] hover:text-[var(--color-gold)] transition-colors rounded-full hover:bg-[var(--color-cream-300)] relative"
              aria-label="Shopping Cart"
            >
              <i className="ri-shopping-bag-line text-lg" />
              {totalItems > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 flex items-center justify-center bg-[var(--color-gold)] text-white text-[9px] font-bold rounded-full animate-bounce-once">
                  {totalItems > 9 ? '9+' : totalItems}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setMenuOpen(!menuOpen)}
              className="md:hidden w-9 h-9 flex items-center justify-center cursor-pointer text-[var(--color-ink)] ml-1"
              aria-label="Toggle menu"
              aria-expanded={menuOpen}
              aria-controls="mobile-navigation"
            >
              <i
                className={`text-xl transition-all duration-200 ${
                  menuOpen ? 'ri-close-line' : 'ri-menu-line'
                }`}
              />
            </button>
          </div>
        </div>

        <nav
          id="mobile-navigation"
          aria-label="Mobile navigation"
          className={`md:hidden bg-white border-t border-gray-100 overflow-hidden transition-all duration-300 ${
            menuOpen
              ? 'max-h-[80vh] opacity-100 overflow-y-auto'
              : 'max-h-0 opacity-0'
          }`}
        >
          <div className="px-6 py-4 flex flex-col gap-4">
            {navLinks.map((link) => {
              if (link.kind === 'brands') {
                return (
                  <div key={link.label}>
                    <button
                      type="button"
                      onClick={() => setMobileBrandsOpen((v) => !v)}
                      className="w-full flex items-center justify-between text-xs tracking-widest uppercase font-medium text-[var(--color-ink)] hover:text-[var(--color-gold)] transition-colors"
                      aria-expanded={mobileBrandsOpen}
                    >
                      <span>{link.label}</span>
                      <i
                        className={`ri-arrow-down-s-line text-sm transition-transform duration-200 ${
                          mobileBrandsOpen ? 'rotate-180' : ''
                        }`}
                      />
                    </button>
                    {mobileBrandsOpen && (
                      <div className="mt-3 pl-3 border-l border-[var(--color-border-soft)] flex flex-col gap-2.5 max-h-64 overflow-y-auto">
                        <Link
                          href="/shop"
                          onClick={() => setMenuOpen(false)}
                          className="text-[11px] tracking-widest uppercase font-semibold text-[var(--color-gold)] hover:text-[var(--color-ink)] transition-colors"
                        >
                          All Brands
                        </Link>
                        {!brandsLoaded && (
                          <p className="text-[10px] text-gray-400 tracking-wide">
                            Loading…
                          </p>
                        )}
                        {brandsLoaded && brands.length === 0 && (
                          <p className="text-[10px] text-gray-400 tracking-wide">
                            No brands yet
                          </p>
                        )}
                        {brands.map((b) => (
                          <Link
                            key={b._id}
                            href={`/shop?brand=${encodeURIComponent(b.name)}`}
                            onClick={() => setMenuOpen(false)}
                            className="text-[11px] tracking-wide text-[var(--color-ink)] hover:text-[var(--color-gold)] transition-colors"
                          >
                            {b.name}
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                )
              }

              return link.isRoute ? (
                <Link
                  key={link.label}
                  href={link.href}
                  onClick={() => setMenuOpen(false)}
                  className="text-xs tracking-widest uppercase font-medium text-[var(--color-ink)] hover:text-[var(--color-gold)] transition-colors"
                >
                  {link.label}
                </Link>
              ) : (
                <a
                  key={link.label}
                  href={link.href}
                  onClick={() => setMenuOpen(false)}
                  className="text-xs tracking-widest uppercase font-medium text-[var(--color-ink)] hover:text-[var(--color-gold)] transition-colors"
                >
                  {link.label}
                </a>
              )
            })}
          </div>
        </nav>
      </header>
    </>
  )
}

function BrandsDropdown({
  brands,
  loaded,
}: {
  brands: BrandOption[]
  loaded: boolean
}) {
  return (
    <div className="absolute left-1/2 -translate-x-1/2 top-full pt-3 z-50 animate-fadeIn">
      <div className="w-[min(640px,90vw)] bg-white border border-[var(--color-border-soft)] shadow-lg">
        <div className="px-5 py-4 border-b border-[var(--color-border-soft)] flex items-center justify-between gap-4">
          <p className="text-[10px] tracking-[0.4em] uppercase font-bold text-[var(--color-gold)]">
            Shop By Brand
          </p>
          <Link
            href="/shop"
            className="text-[10px] tracking-[0.25em] uppercase font-semibold text-[var(--color-ink)] hover:text-[var(--color-gold)] transition-colors whitespace-nowrap"
          >
            All Brands →
          </Link>
        </div>
        <div className="p-5">
          {!loaded ? (
            <p className="text-xs text-gray-400 tracking-wide">
              Loading brands…
            </p>
          ) : brands.length === 0 ? (
            <p className="text-xs text-gray-400 tracking-wide">
              No brands available yet.
            </p>
          ) : (
            <ul className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-2.5 max-h-[60vh] overflow-y-auto pr-1">
              {brands.map((b) => (
                <li key={b._id}>
                  <Link
                    href={`/shop?brand=${encodeURIComponent(b.name)}`}
                    className="block text-xs tracking-wide text-[var(--color-ink)] hover:text-[var(--color-gold)] transition-colors py-1.5 truncate"
                  >
                    {b.name}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}
