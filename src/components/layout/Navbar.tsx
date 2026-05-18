'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useCart } from '@/context/CartContext'
import { useSearch } from '@/context/SearchContext'

const navLinks = [
  { label: 'Home', href: '/', isRoute: true },
  { label: 'Shop', href: '/shop', isRoute: true },
  { label: 'Brands', href: '/#brands', isRoute: false },
  { label: 'Collections', href: '/#collections', isRoute: false },
  { label: 'About Us', href: '/about', isRoute: true },
  { label: 'Reviews', href: '/#reviews', isRoute: false },
]

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const { openCart, totalItems } = useCart()
  const { openSearch } = useSearch()
  const pathname = usePathname()

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 40)
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const isHome = pathname === '/'
  const showSolid = scrolled || !isHome

  return (
    <>
      <div className="bg-[var(--color-cream-400)] text-[var(--color-gold-deep)] text-center text-[11px] sm:text-xs px-4 sm:px-6 py-2 tracking-widest uppercase font-semibold border-b border-[var(--color-border)]">
        Always Fast &amp; Free Shipping — No Minimum Order
      </div>

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
              Inscentives
            </span>
            <span className="tracking-[0.2em] uppercase text-[9px] text-[var(--color-gold)] -mt-0.5">
              Perfume
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => {
              const isActive = link.isRoute ? pathname === link.href : false
              const className = `text-xs tracking-widest uppercase font-medium transition-all duration-200 cursor-pointer whitespace-nowrap relative group ${
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
              return link.isRoute ? (
                <Link key={link.label} href={link.href} className={className}>
                  {link.label}
                  {underline}
                </Link>
              ) : (
                <a key={link.label} href={link.href} className={className}>
                  {link.label}
                  {underline}
                </a>
              )
            })}
          </nav>

          <div className="flex items-center gap-1">
            <button
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
              onClick={() => setMenuOpen(!menuOpen)}
              className="md:hidden w-9 h-9 flex items-center justify-center cursor-pointer text-[var(--color-ink)] ml-1"
              aria-label="Toggle menu"
            >
              <i
                className={`text-xl transition-all duration-200 ${
                  menuOpen ? 'ri-close-line' : 'ri-menu-line'
                }`}
              />
            </button>
          </div>
        </div>

        <div
          className={`md:hidden bg-white border-t border-gray-100 overflow-hidden transition-all duration-300 ${
            menuOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
          }`}
        >
          <div className="px-6 py-4 flex flex-col gap-4">
            {navLinks.map((link) =>
              link.isRoute ? (
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
              ),
            )}
            <div className="border-t border-[var(--color-border-soft)] pt-4">
              <Link
                href="/account"
                onClick={() => setMenuOpen(false)}
                className="flex items-center gap-2 text-xs tracking-widest uppercase font-medium text-[var(--color-ink)] hover:text-[var(--color-gold)] transition-colors"
              >
                <i className="ri-user-line" />
                My Account
              </Link>
            </div>
          </div>
        </div>
      </header>
    </>
  )
}
