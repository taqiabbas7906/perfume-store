import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-white flex flex-col">
      <main className="flex-1 flex items-center justify-center py-32">
        <div className="max-w-2xl mx-auto px-6 text-center">
          {/* Decorative Icon */}
          <div className="w-20 h-20 flex items-center justify-center mx-auto mb-8 border border-[#e8d5b7] bg-[#fdf4e8]/60">
            <i className="ri-leaf-line text-4xl text-[#b89a6a] opacity-40"></i>
          </div>

          {/* 404 */}
          <p className="tracking-[0.5em] uppercase text-[10px] text-[#b89a6a] font-semibold mb-2">
            Error 404
          </p>
          <h1 className="text-4xl md:text-6xl tracking-tight mb-4 text-[#1a1a1a] font-heading">
            Page Not Found
          </h1>

          {/* Subtitle */}
          <p className="text-sm text-gray-500 leading-relaxed max-w-md mx-auto mb-6">
            The page you&apos;re looking for doesn&apos;t exist or has been moved. 
            Maybe the scent trail went cold — let&apos;s get you back on track.
          </p>

          {/* Path Display */}
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#fdf4e8] border border-[#e8d5b7] text-[11px] text-[#7a5c36] tracking-wide font-mono mb-10">
            <div className="w-4 h-4 flex items-center justify-center">
              <i className="ri-links-line text-[#b89a6a] text-xs"></i>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/"
              className="px-6 py-3 bg-[#b89a6a] text-white text-xs tracking-widest uppercase font-semibold hover:bg-[#a38a5a] transition-colors cursor-pointer whitespace-nowrap inline-flex items-center gap-2"
            >
              <div className="w-4 h-4 flex items-center justify-center">
                <i className="ri-arrow-left-line"></i>
              </div>
              Back to Home
            </Link>
            <Link
              href="/shop"
              className="px-6 py-3 border border-[#d4b896] text-[#7a5c36] text-xs tracking-widest uppercase font-semibold hover:border-[#b89a6a] hover:text-[#b89a6a] hover:bg-[#fdfbf7] transition-all cursor-pointer whitespace-nowrap inline-flex items-center gap-2"
            >
              <div className="w-4 h-4 flex items-center justify-center">
                <i className="ri-store-2-line"></i>
              </div>
              Browse Shop
            </Link>
          </div>

          {/* Quick Links */}
          <div className="mt-14 pt-10 border-t border-[#f0e8da]">
            <p className="text-[10px] tracking-[0.4em] uppercase text-gray-400 font-semibold mb-4">
              Maybe you were looking for
            </p>
            <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
              {[
                { label: "Shop All", href: "/shop" },
                { label: "Best Sellers", href: "/shop" },
                { label: "About Us", href: "/about" },
                { label: "FAQs", href: "/faqs" },
                { label: "Account", href: "/account" },
                { label: "Shipping", href: "/shipping" },
              ].map((link) => (
                <Link
                  key={link.label}
                  href={link.href}
                  className="text-xs text-gray-500 hover:text-[#b89a6a] transition-colors cursor-pointer tracking-wide"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}