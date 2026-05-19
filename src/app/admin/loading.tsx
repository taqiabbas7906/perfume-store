export default function Loading() {
  return (
    <div className="flex items-center justify-center py-32">
      <div className="text-center">
        <div className="w-10 h-10 mx-auto mb-3 flex items-center justify-center text-gold-600 text-2xl">
          <i className="ri-loader-4-line animate-spin" />
        </div>
        <p className="text-sm text-charcoal-500">Loading…</p>
      </div>
    </div>
  )
}
