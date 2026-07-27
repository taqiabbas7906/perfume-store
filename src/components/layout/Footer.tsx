import Link from 'next/link'
import Image from 'next/image'

const information = [
  { label: 'About Us', href: '/about' },
  { label: 'Cancellation Policy', href: '/policies/cancellation' },
  { label: 'Returns & Refund Policy', href: '/policies/returns' },
  { label: 'Privacy Policy', href: '/policies/privacy' },
  { label: 'Terms of Service', href: '/policies/terms' },
]

const quickShop = [
  { label: 'Best Sellers', href: '/shop?sort=popular' },
  { label: 'New Arrivals', href: '/shop?sort=newest' },
  { label: 'Designer Brands', href: '/shop?category=designer' },
  { label: "Women's Perfumes", href: '/shop?category=women' },
  { label: "Men's Colognes", href: '/shop?category=men' },
  { label: 'Sale Items', href: '/shop?sort=price_asc' },
]

const socials = [
  { icon: 'ri-instagram-line', href: 'https://instagram.com', label: 'Instagram' },
  { icon: 'ri-tiktok-line', href: 'https://tiktok.com', label: 'TikTok' },
  { icon: 'ri-facebook-circle-line', href: 'https://facebook.com', label: 'Facebook' },
  { icon: 'ri-twitter-x-line', href: 'https://x.com', label: 'X' },
]

export default function Footer() {
  return (
    <footer className="bg-[var(--color-cream-300)] border-t border-[var(--color-border)]">
      <div className="h-[2px] w-full bg-gradient-to-r from-transparent via-[var(--color-gold)] to-transparent" />

      <div className="max-w-7xl mx-auto px-6 pt-16 pb-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-12">
          <div className="lg:col-span-1">
            <Link href="/" className="flex flex-col items-center mb-6">
              <div className="h-12 flex items-center justify-center mb-3">
                <Image src="/logo.svg" width={50} height={50} className=" text-2xl" alt="Logo" />
              </div>
              <span className="tracking-[0.35em] uppercase text-sm font-semibold text-[var(--color-ink)]">
                Minzoshop
              </span>
            </Link>
            <p className="text-gray-500 text-xs leading-relaxed mb-6">
              Your trusted independent fragrance retailer. Authentic scents from
              the world&apos;s finest houses — curated with care, delivered with
              speed.
            </p>
            <div className="flex gap-3">
              {socials.map((s) => (
                <a
                  key={s.icon}
                  href={s.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={s.label}
                  className="w-8 h-8 flex items-center justify-center border border-[var(--color-gold-soft)] hover:border-[var(--color-gold)] hover:text-[var(--color-gold)] text-[var(--color-gold-deep)] bg-white transition-all duration-300"
                >
                  <i className={`${s.icon} text-sm`} />
                </a>
              ))}
            </div>
          </div>

          <nav aria-labelledby="footer-information-heading">
            <h2
              id="footer-information-heading"
              className="text-[10px] tracking-[0.4em] uppercase font-bold mb-6 text-[var(--color-ink)]"
            >
              Information
            </h2>
            <ul className="space-y-3">
              {information.map((item) => (
                <li key={item.label}>
                  <Link
                    href={item.href}
                    className="text-[11px] text-gray-500 hover:text-[var(--color-gold)] transition-colors tracking-wide flex items-center gap-2 group"
                  >
                    <span className="w-0 group-hover:w-3 h-[1px] bg-[var(--color-gold)] transition-all duration-300 block" />
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <nav aria-labelledby="footer-shop-heading">
            <h2
              id="footer-shop-heading"
              className="text-[10px] tracking-[0.4em] uppercase font-bold mb-6 text-[var(--color-ink)]"
            >
              Quick Shop
            </h2>
            <ul className="space-y-3">
              {quickShop.map((item) => (
                <li key={item.label}>
                  <Link
                    href={item.href}
                    className="text-[11px] text-gray-500 hover:text-[var(--color-gold)] transition-colors tracking-wide flex items-center gap-2 group"
                  >
                    <span className="w-0 group-hover:w-3 h-[1px] bg-[var(--color-gold)] transition-all duration-300 block" />
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <section aria-labelledby="footer-contact-heading">
            <h2
              id="footer-contact-heading"
              className="text-[10px] tracking-[0.4em] uppercase font-bold mb-6 text-[var(--color-ink)]"
            >
              Contact
            </h2>
            <ul className="space-y-4 mb-7">
              <li className="flex items-start gap-3">
                <div className="w-5 h-5 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <i className="ri-map-pin-2-line text-[var(--color-gold)] text-sm" />
                </div>
                <span className="text-[11px] text-gray-500 leading-relaxed">
                  PO Box 17, Hightstown,
                  <br />
                   NJ 08520, USA
                </span>
              </li>
              <li className="flex items-center gap-3">
                <div className="w-5 h-5 flex items-center justify-center flex-shrink-0">
                  <i className="ri-mail-line text-[var(--color-gold)] text-sm" />
                </div>
                <a
                  href="mailto:support@Minzoshop.com"
                  className="text-[11px] text-gray-500 hover:text-[var(--color-gold)] transition-colors"
                >
                  support@Minzoshop.com
                </a>
              </li>
            </ul>
          </section>
        </div>
      </div>

      <div className="border-t border-[var(--color-border)]">
        <div className="max-w-7xl mx-auto px-6 py-5 flex flex-col sm:flex-row items-center justify-between gap-4 bg-[var(--color-cream-400)]">
          <p className="text-[10px] text-gray-400 tracking-wide">
            &copy; {new Date().getFullYear()} Minzoshop Perfume. All rights
            reserved.
          </p>
          <div className="flex items-center gap-2 flex-wrap justify-center">
            {['VISA', 'MC', 'AMEX', 'DISCOVER'].map((card) => (
              <span
                key={card}
                className="border border-[var(--color-gold-soft)] bg-white text-[8px] text-[var(--color-gold-deep)] font-extrabold tracking-widest px-2 py-1"
              >
                {card}
              </span>
            ))}
          </div>
          <div className="flex gap-5">
            <Link
              href="/policies/privacy"
              className="text-[10px] text-gray-400 hover:text-[var(--color-gold)] transition-colors tracking-wide"
            >
              Privacy
            </Link>
            <Link
              href="/policies/terms"
              className="text-[10px] text-gray-400 hover:text-[var(--color-gold)] transition-colors tracking-wide"
            >
              Terms
            </Link>
            <Link
              href="/sitemap.xml"
              className="text-[10px] text-gray-400 hover:text-[var(--color-gold)] transition-colors tracking-wide"
            >
              Sitemap
            </Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
