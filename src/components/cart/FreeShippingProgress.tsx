import { formatPrice } from '@/lib/utils/format'

interface FreeShippingProgressProps {
  total: number
  threshold: number
  label: string
  className?: string
  showUnlocked?: boolean
}

export default function FreeShippingProgress({
  total,
  threshold,
  label,
  className = '',
  showUnlocked,
}: FreeShippingProgressProps) {
  const delta = threshold - total
  const progress = Math.min((total / threshold) * 100, 100)

  if (!showUnlocked && delta <= 0) return null

  return (
    <div className={className}>
      <div className="flex justify-between text-[10px] text-gray-500 mb-1.5">
        <span className="tracking-wide">{label}</span>
        <span className="font-semibold text-[var(--color-gold)]">
          {delta <= 0 ? 'Unlocked!' : `${formatPrice(delta)} away`}
        </span>
      </div>
      <div className="h-1 bg-[var(--color-border-soft)] rounded-full overflow-hidden">
        <div
          className="h-full bg-[var(--color-gold)] rounded-full transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  )
}
