'use client'

interface QuantityStepperProps {
  quantity: number
  onDecrease: () => void
  onIncrease: () => void
  containerClassName: string
  buttonClassName: string
  quantityClassName: string
  iconClassName?: string
  decreaseLabel?: string
  increaseLabel?: string
}

export default function QuantityStepper({
  quantity,
  onDecrease,
  onIncrease,
  containerClassName,
  buttonClassName,
  quantityClassName,
  iconClassName = '',
  decreaseLabel = 'Decrease quantity',
  increaseLabel = 'Increase quantity',
}: QuantityStepperProps) {
  return (
    <div className={containerClassName}>
      <button
        type="button"
        onClick={onDecrease}
        className={buttonClassName}
        aria-label={decreaseLabel}
      >
        <i className={`ri-subtract-line ${iconClassName}`} aria-hidden="true" />
      </button>
      <span className={quantityClassName}>{quantity}</span>
      <button
        type="button"
        onClick={onIncrease}
        className={buttonClassName}
        aria-label={increaseLabel}
      >
        <i className={`ri-add-line ${iconClassName}`} aria-hidden="true" />
      </button>
    </div>
  )
}
