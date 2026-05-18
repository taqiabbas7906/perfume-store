import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'About Inscentives — Our Story',
  description:
    'Inscentives is an independent fragrance retailer in West Palm Beach, Florida. Discover our story, our values, and the team behind the bottles.',
}

const values = [
  {
    icon: 'ri-shield-check-line',
    title: '100% Authentic',
    desc: 'Every fragrance is sourced directly from authorized distributors and verified for authenticity. We never compromise on quality.',
  },
  {
    icon: 'ri-truck-line',
    title: 'Always Free Shipping',
    desc: 'No minimum order. No gimmicks. Free, fast shipping on every single order we fulfill — because your experience matters.',
  },
  {
    icon: 'ri-medal-line',
    title: 'Best Price Guarantee',
    desc: "Find a lower price anywhere online? We'll match it. We're committed to giving you the best deal on designer fragrances.",
  },
  {
    icon: 'ri-heart-line',
    title: 'Passionate Curation',
    desc: 'Our team of fragrance lovers personally tests and curates every scent we carry. No filler, just the very best.',
  },
  {
    icon: 'ri-customer-service-2-line',
    title: 'White-Glove Support',
    desc: 'Real people, real answers. Our fragrance advisors are here to guide you to your perfect scent — no bots, no scripts.',
  },
  {
    icon: 'ri-refresh-line',
    title: 'Hassle-Free Returns',
    desc: 'Not what you expected? We make returns simple and painless. Your satisfaction is our top priority, always.',
  },
]

const team = [
  {
    name: 'Marcus Rivera',
    role: 'Founder & Chief Curator',
    bio: "Former luxury retail consultant with 15 years in fine fragrance. Marcus' nose is legendary in the industry.",
    image:
      'https://readdy.ai/api/search-image?query=professional%20man%20portrait%20business%20founder%20clean%20white%20background%2C%20warm%20confident%20smile%2C%20mid%2030s%2C%20elegant%20minimal%20clothing%2C%20studio%20photography%20quality%2C%20soft%20warm%20lighting%2C%20sophisticated%20look&width=300&height=380&seq=team1&orientation=portrait',
  },
  {
    name: 'Sophia Chen',
    role: 'Head of Curation',
    bio: "Trained perfumer with a Master's in fragrance chemistry. Sophia ensures every bottle we carry meets our exacting standards.",
    image:
      'https://readdy.ai/api/search-image?query=professional%20woman%20portrait%20business%20elegant%20clean%20white%20background%2C%20warm%20confident%20smile%2C%20late%2020s%20asian%20woman%2C%20minimal%20stylish%20clothing%2C%20studio%20photography%20quality%2C%20soft%20natural%20lighting%2C%20sophisticated%20look&width=300&height=380&seq=team2&orientation=portrait',
  },
  {
    name: 'James Thornton',
    role: 'Customer Experience Director',
    bio: 'James built our support team from scratch. His obsession? Making sure every customer has a 5-star experience.',
    image:
      'https://readdy.ai/api/search-image?query=professional%20man%20portrait%20business%20customer%20director%20clean%20white%20background%2C%20friendly%20warm%20smile%2C%20early%2040s%2C%20smart%20casual%20clothing%2C%20studio%20photography%20quality%2C%20soft%20warm%20lighting%2C%20approachable%20look&width=300&height=380&seq=team3&orientation=portrait',
  },
  {
    name: 'Aisha Okonkwo',
    role: 'Brand Partnerships',
    bio: 'With direct relationships at 80+ fragrance houses, Aisha secures authentic inventory at prices our customers love.',
    image:
      'https://readdy.ai/api/search-image?query=professional%20woman%20portrait%20business%20elegant%20clean%20white%20background%2C%20warm%20confident%20smile%2C%20early%2030s%20black%20woman%2C%20stylish%20professional%20clothing%2C%20studio%20photography%20quality%2C%20natural%20lighting%2C%20sophisticated%20look&width=300&height=380&seq=team4&orientation=portrait',
  },
]

export default function AboutPage() {
  return (
    <main>
      <section className="relative w-full h-[70vh] min-h-[500px] overflow-hidden">
        <Image
          src="https://readdy.ai/api/search-image?query=luxury%20perfume%20boutique%20interior%20store%20beautiful%20bright%20white%20marble%20walls%20and%20floors%2C%20elegant%20glass%20perfume%20displays%2C%20warm%20golden%20accent%20lighting%2C%20high-end%20fragrance%20shop%20atmosphere%2C%20airy%20sophisticated%20retail%20space%2C%20crystal%20clear%20bottles%20on%20white%20shelves%2C%20minimalist%20luxury%20aesthetic%2C%20editorial%20photography%20quality&width=1600&height=900&seq=about-hero-1&orientation=landscape"
          alt="Inscentives Perfume Boutique"
          fill
          priority
          sizes="100vw"
          className="object-cover object-top"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#fdf8f2]/95 via-[#fdf8f2]/70 to-[#fdf8f2]/20" />

        <div className="absolute inset-0 flex flex-col justify-center px-8 md:px-20 lg:px-32">
          <div className="max-w-2xl">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-8 h-[1px] bg-[var(--color-gold)]" />
              <span className="text-[var(--color-gold)] tracking-[0.5em] uppercase text-[10px] font-semibold">
                Our Story
              </span>
            </div>
            <h1 className="font-serif text-6xl md:text-7xl font-light text-[var(--color-ink)] leading-tight mb-6">
              About
              <br />
              <span className="font-bold">Inscentives</span>
            </h1>
            <p className="text-[var(--color-ink-soft)] text-base font-light max-w-md leading-relaxed tracking-wide">
              Born out of a love for fine fragrance and a belief that luxury
              should never be out of reach — we&apos;re your trusted
              independent perfume retailer.
            </p>
          </div>
        </div>
      </section>

      <section className="py-24 px-6 bg-white">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <div className="relative">
            <div className="relative aspect-[4/5] overflow-hidden">
              <Image
                src="https://readdy.ai/api/search-image?query=elegant%20woman%20smelling%20luxury%20perfume%20bottle%20in%20bright%20white%20modern%20room%2C%20sunlight%20streaming%20through%20window%2C%20sophisticated%20fragrance%20shopping%20experience%2C%20warm%20golden%20light%2C%20ivory%20and%20cream%20interior%2C%20minimalist%20luxury%20lifestyle%20photography&width=600&height=750&seq=about-story-1&orientation=portrait"
                alt="Our Fragrance Story"
                fill
                sizes="(min-width: 1024px) 50vw, 100vw"
                className="object-cover object-top"
              />
            </div>
            <div className="absolute -bottom-6 -right-6 bg-[var(--color-gold)] p-7 hidden md:block">
              <div className="font-serif text-4xl font-light text-white leading-none">
                10+
              </div>
              <div className="text-[10px] tracking-[0.3em] uppercase text-white/80 mt-1 font-semibold">
                Years of Passion
              </div>
            </div>
          </div>

          <div>
            <p className="text-[var(--color-gold)] tracking-[0.4em] uppercase text-[10px] font-semibold mb-4">
              How It Started
            </p>
            <h2 className="font-serif text-4xl md:text-5xl font-light text-[var(--color-ink)] leading-tight mb-8">
              Fragrance is our
              <br />
              <span className="font-bold">first language</span>
            </h2>

            <div className="space-y-5 text-[var(--color-ink-soft)] text-sm leading-relaxed font-light">
              <p>
                Inscentives Perfume was founded in West Palm Beach, Florida, by
                a group of fragrance enthusiasts who grew tired of paying
                inflated retail prices for authentic luxury scents. We believed
                then — and still believe today — that everyone deserves access
                to the world&apos;s finest fragrances.
              </p>
              <p>
                Starting from a small collection of hand-curated bottles, we
                have grown into one of the most trusted independent fragrance
                retailers in the United States. Our inventory spans over 500
                authentic products from 80+ designer and niche houses, all
                sourced directly from authorized distributors.
              </p>
              <p>
                Every fragrance we carry is 100% authentic, rigorously verified,
                and accompanied by our price-match guarantee. We treat every
                order as if we&apos;re sending it to a close friend.
              </p>
            </div>

            <div className="grid grid-cols-3 gap-6 mt-10 pt-10 border-t border-[var(--color-border-soft)]">
              {[
                { value: '500+', label: 'Fragrances' },
                { value: '80+', label: 'Brands' },
                { value: '12K+', label: 'Happy Customers' },
              ].map((s) => (
                <div key={s.label}>
                  <div className="font-serif text-3xl font-light text-[var(--color-gold)]">
                    {s.value}
                  </div>
                  <div className="text-[10px] tracking-widest uppercase text-gray-400 mt-1">
                    {s.label}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="sourcing" className="py-24 px-6 bg-[var(--color-cream-600)]">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-[var(--color-gold)] tracking-[0.4em] uppercase text-[10px] font-semibold mb-3">
              What We Stand For
            </p>
            <h2 className="font-serif text-4xl md:text-5xl font-light text-[var(--color-ink)]">
              Our Core Values
            </h2>
            <div className="w-10 h-[1px] bg-[var(--color-gold)] mx-auto mt-5" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {values.map((v) => (
              <article
                key={v.title}
                className="bg-white p-8 group hover:-translate-y-1 transition-all duration-300"
              >
                <div className="w-12 h-12 flex items-center justify-center border border-[var(--color-border)] group-hover:border-[var(--color-gold)] group-hover:bg-[var(--color-gold)] transition-all duration-300 mb-6">
                  <i
                    className={`${v.icon} text-xl text-[var(--color-gold)] group-hover:text-white transition-colors duration-300`}
                  />
                </div>
                <h3 className="text-base font-semibold text-[var(--color-ink)] mb-3 tracking-wide">
                  {v.title}
                </h3>
                <p className="text-sm text-gray-500 leading-relaxed font-light">
                  {v.desc}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="py-24 px-6 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-[var(--color-gold)] tracking-[0.4em] uppercase text-[10px] font-semibold mb-3">
              The People Behind the Bottles
            </p>
            <h2 className="font-serif text-4xl md:text-5xl font-light text-[var(--color-ink)]">
              Meet Our Team
            </h2>
            <div className="w-10 h-[1px] bg-[var(--color-gold)] mx-auto mt-5" />
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8">
            {team.map((member) => (
              <article key={member.name} className="group text-center">
                <div className="relative overflow-hidden mb-5 aspect-[3/4]">
                  <Image
                    src={member.image}
                    alt={member.name}
                    fill
                    sizes="(min-width: 768px) 25vw, 50vw"
                    className="object-cover object-top transition-transform duration-500 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-[var(--color-gold)]/0 group-hover:bg-[var(--color-gold)]/10 transition-all duration-300" />
                </div>
                <h3 className="text-sm font-semibold text-[var(--color-ink)] tracking-wide">
                  {member.name}
                </h3>
                <p className="text-[10px] text-[var(--color-gold)] tracking-widest uppercase font-bold mt-1 mb-3">
                  {member.role}
                </p>
                <p className="text-xs text-gray-500 leading-relaxed font-light max-w-[200px] mx-auto">
                  {member.bio}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="relative py-24 px-6 overflow-hidden">
        <Image
          src="https://readdy.ai/api/search-image?query=top%20down%20flat%20lay%20of%20luxury%20perfume%20bottles%20on%20cream%20marble%20surface%2C%20golden%20light%2C%20soft%20shadows%2C%20editorial%20luxury%20fragrance%20photography%2C%20warm%20ivory%20tones%2C%20clean%20minimal%20arrangement%2C%20beautiful%20composition&width=1600&height=700&seq=about-cta-1&orientation=landscape"
          alt="Shop Fragrances"
          fill
          sizes="100vw"
          className="object-cover object-top"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#fdf8f2]/95 via-[#fdf8f2]/80 to-[#fdf8f2]/50" />

        <div className="relative max-w-2xl mx-auto text-center">
          <p className="text-[var(--color-gold)] tracking-[0.5em] uppercase text-[10px] font-semibold mb-5">
            Ready to Explore?
          </p>
          <h2 className="font-serif text-4xl md:text-5xl font-light text-[var(--color-ink)] leading-tight mb-6">
            Discover Your
            <br />
            <span className="font-bold">Signature Scent</span>
          </h2>
          <p className="text-[var(--color-ink-soft)] text-sm leading-relaxed mb-10 max-w-md mx-auto font-light">
            Browse our curated collection of 500+ authentic fragrances. Free
            shipping, best prices, 100% genuine.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/shop"
              className="bg-[var(--color-ink)] hover:bg-[var(--color-gold)] text-white text-[11px] tracking-[0.25em] uppercase font-bold px-12 py-4 transition-all duration-300 whitespace-nowrap"
            >
              Shop Now
            </Link>
            <Link
              href="/"
              className="border border-[var(--color-ink)] text-[var(--color-ink)] hover:border-[var(--color-gold)] hover:text-[var(--color-gold)] text-[11px] tracking-[0.25em] uppercase font-semibold px-12 py-4 transition-all duration-300 whitespace-nowrap"
            >
              Back to Home
            </Link>
          </div>
        </div>
      </section>
    </main>
  )
}
