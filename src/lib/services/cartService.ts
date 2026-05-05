import { Types } from 'mongoose'
import Cart from '@/models/Cart'
import Product from '@/models/Product'
import type { ICart, IProduct } from '@/types'
import type { CartErrorCode } from '@/types/commerce'

/* ───────────────────────────────────────────── */

const PER_LINE_MAX = 100
const MAX_LINES = 50

/* ───────────────────────────────────────────── */

interface CartOwner {
  userId?: string | Types.ObjectId
  sessionId?: string
}

/* ───────────────────────────────────────────── */

type CartSuccess = {
  ok: true
  cart: ICart
}

type CartFailure = {
  ok: false
  code: CartErrorCode | 'CART_NOT_FOUND'
  message: string
  available?: number
}

type CartResult = CartSuccess | CartFailure

/* ───────────────────────────────────────────── */

function ownerFilter(owner: CartOwner) {
  if (owner.userId) {
    return { user: new Types.ObjectId(owner.userId.toString()) }
  }
  if (owner.sessionId) {
    return { sessionId: owner.sessionId }
  }
  throw new Error('cart owner required')
}

function ownerSet(owner: CartOwner) {
  if (owner.userId) return { user: new Types.ObjectId(owner.userId.toString()) }
  if (owner.sessionId) return { sessionId: owner.sessionId }
  throw new Error('cart owner required')
}

/* ───────────────────────────────────────────── */

export async function getOrCreateCart(owner: CartOwner): Promise<ICart> {
  const filter = ownerFilter(owner)
  const set = ownerSet(owner)

  const cart = await Cart.findOneAndUpdate(
    filter,
    {
      $setOnInsert: {
        ...set,
        items: [],
        expiresAt: new Date(Date.now() + 30 * 86400000),
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  ).lean<ICart>()

  if (!cart) throw new Error('failed to create cart')
  return cart
}

/* ───────────────────────────────────────────── */

export async function getCart(owner: CartOwner): Promise<ICart | null> {
  return Cart.findOne(ownerFilter(owner)).lean<ICart>()
}

/* ───────────────────────────────────────────── */

interface ResolvedVariant {
  product: IProduct
  variant: IProduct['variants'][number]
  unitPrice: number
}

/* ───────────────────────────────────────────── */

async function resolveVariant(
  productId: string,
  sku: string
): Promise<ResolvedVariant | null> {
  if (!Types.ObjectId.isValid(productId)) return null

  const product = await Product.findOne({
    _id: productId,
    active: true,
    'variants.sku': sku,
  }).lean<IProduct>()

  if (!product) return null

  const variant = product.variants.find(v => v.sku === sku)
  if (!variant) return null

  return {
    product,
    variant,
    unitPrice: variant.discountedPrice ?? variant.originalPrice,
  }
}

/* ───────────────────────────────────────────── */
/* ADD ITEM */
/* ───────────────────────────────────────────── */

export async function addItem(args: {
  owner: CartOwner
  productId: string
  variantSku: string
  quantity: number
}): Promise<CartResult> {
  const resolved = await resolveVariant(args.productId, args.variantSku)

  if (!resolved) {
    return {
      ok: false,
      code: 'PRODUCT_NOT_FOUND',
      message: 'Product not found',
    }
  }

  const { product, variant, unitPrice } = resolved

  if (args.quantity > PER_LINE_MAX) {
    return {
      ok: false,
      code: 'PER_LINE_LIMIT',
      message: `Max ${PER_LINE_MAX} per item`,
    }
  }

  const filter = ownerFilter(args.owner)

  const inc = await Cart.updateOne(
    {
      ...filter,
      items: {
        $elemMatch: {
          productId: product._id,
          variantSku: variant.sku,
        },
      },
    },
    {
      $inc: { 'items.$.quantity': args.quantity },
      $set: { 'items.$.price': unitPrice },
    }
  )

  if (inc.modifiedCount === 1) {
    const cart = await Cart.findOne(filter).lean<ICart>()
    if (!cart) {
      return {
        ok: false,
        code: 'CART_NOT_FOUND',
        message: 'Cart not found',
      }
    }
    return { ok: true, cart }
  }

  const cart = await Cart.findOne(filter).lean<ICart>()

  if (!cart) {
    return {
      ok: false,
      code: 'CART_NOT_FOUND',
      message: 'Cart not found',
    }
  }

  const existing = cart.items.find(
    i =>
      i.productId.toString() === product._id.toString() &&
      i.variantSku === variant.sku
  )

  if (existing) {
    const newQty = existing.quantity + args.quantity

    if (newQty > variant.quantity) {
      return {
        ok: false,
        code: 'OUT_OF_STOCK',
        message: `Only ${variant.quantity} available`,
        available: variant.quantity,
      }
    }
  } else {
    if (cart.items.length >= MAX_LINES) {
      return {
        ok: false,
        code: 'CART_FULL',
        message: 'Cart full',
      }
    }
  }

  await Cart.updateOne(
    {
      ...filter,
      'items.variantSku': { $ne: variant.sku },
    },
    {
      $push: {
        items: {
          productId: product._id,
          variantSku: variant.sku,
          quantity: args.quantity,
          price: unitPrice,
          name: product.name,
          variantLabel: variant.label,
          image: product.images?.[0]?.url ?? '',
          addedAt: new Date(),
        },
      },
    },
    { upsert: true }
  )

  const finalCart = await Cart.findOne(filter).lean<ICart>()

  if (!finalCart) {
    return {
      ok: false,
      code: 'CART_NOT_FOUND',
      message: 'Cart not found after insert',
    }
  }

  return { ok: true, cart: finalCart }
}

/* ───────────────────────────────────────────── */
/* UPDATE ITEM */
/* ───────────────────────────────────────────── */

export async function updateItem(args: {
  owner: CartOwner
  variantSku: string
  quantity: number
}): Promise<CartResult> {
  const filter = ownerFilter(args.owner)

  if (args.quantity === 0) {
    return removeItem(args.owner, args.variantSku)
  }

  const updated = await Cart.findOneAndUpdate(
    { ...filter, 'items.variantSku': args.variantSku },
    { $set: { 'items.$.quantity': args.quantity } },
    { new: true }
  ).lean<ICart>()

  if (!updated) {
    return {
      ok: false,
      code: 'CART_NOT_FOUND',
      message: 'Cart not found',
    }
  }

  return { ok: true, cart: updated }
}

/* ───────────────────────────────────────────── */
/* REMOVE ITEM */
/* ───────────────────────────────────────────── */

export async function removeItem(
  owner: CartOwner,
  sku: string
): Promise<CartResult> {
  const filter = ownerFilter(owner)

  await Cart.updateOne(filter, {
    $pull: { items: { variantSku: sku } },
  })

  const cart = await Cart.findOne(filter).lean<ICart>()

  if (!cart) {
    return {
      ok: false,
      code: 'CART_NOT_FOUND',
      message: 'Cart not found',
    }
  }

  return { ok: true, cart }
}

/* ───────────────────────────────────────────── */

export async function clearCart(owner: CartOwner) {
  await Cart.updateOne(ownerFilter(owner), { $set: { items: [] } })
}

/* ───────────────────────────────────────────── */

export async function summarizeCart(cart: ICart | null) {
  if (!cart) {
    return { cart: null, subtotal: 0, itemCount: 0 }
  }

  const subtotal = cart.items.reduce(
    (s, i) => s + i.quantity * i.price,
    0
  )

  const itemCount = cart.items.reduce((s, i) => s + i.quantity, 0)

  return { cart, subtotal, itemCount }
}