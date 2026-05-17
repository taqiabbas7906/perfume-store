import Link from 'next/link'

export default function Home() {
  return (
    <div className="min-h-screen">
      <section className="bg-gradient-to-r from-purple-600 to-blue-600 text-white py-20">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-4xl md:text-6xl font-bold mb-6">Discover Premium Perfumes</h1>
          <p className="text-xl mb-8 max-w-2xl mx-auto">
            Explore our collection of luxury fragrances from top brands around the world
          </p>
          <Link
            href="/products"
            className="bg-white text-blue-600 px-8 py-3 rounded-full font-semibold text-lg hover:bg-gray-100 transition-colors"
          >
            Shop Now
          </Link>
        </div>
      </section>
    </div>
  )
}