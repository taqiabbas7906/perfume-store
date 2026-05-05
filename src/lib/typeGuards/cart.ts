import type { CartErrorCode } from '@/types/commerce'

export function isCartErrorCode(code: string): code is CartErrorCode {
  return (
    code === 'PRODUCT_NOT_FOUND' ||
    code === 'OUT_OF_STOCK' ||
    code === 'PER_LINE_LIMIT' ||
    code === 'CART_FULL'
  )
}