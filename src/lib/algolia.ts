import { algoliasearch } from 'algoliasearch'

export const algoliaIndex = process.env.ALGOLIA_INDEX_NAME ?? 'products'

/* ─── Admin client (server-side only) ───────────────────── */

export function getAlgoliaClient() {
  return algoliasearch(
    process.env.NEXT_PUBLIC_ALGOLIA_APP_ID!,
    process.env.ALGOLIA_ADMIN_KEY!
  )
}

/* ─── Record shape sent to Algolia ──────────────────────── */

export function toAlgoliaRecord(product: Record<string, any>) {
  return {
    objectID:      String(product._id),
    name:          product.name ?? '',
    brand:         product.brand ?? '',
    description:   product.description ?? '',
    tags:          product.tags ?? [],
    category:      product.category ?? '',
    productType:   product.productType ?? '',
    slug:          product.slug ?? '',
    minPrice:      product.minPrice ?? 0,
    maxPrice:      product.maxPrice ?? 0,
    image:         product.images?.[0]?.url ?? '',
    ratingAverage: product.ratingAverage ?? 0,
    ratingCount:   product.ratingCount ?? 0,
    totalStock:    product.totalStock ?? 0,
    active:        product.active ?? false,
  }
}

/* ─── Fire-and-forget helpers ────────────────────────────── */

export async function syncProductToAlgolia(product: Record<string, any>) {
  if (!process.env.ALGOLIA_ADMIN_KEY) return
  const client = getAlgoliaClient()
  await client.saveObjects({
    indexName: algoliaIndex,
    objects:   [toAlgoliaRecord(product)],
  })
}

export async function deleteProductFromAlgolia(productId: string) {
  if (!process.env.ALGOLIA_ADMIN_KEY) return
  const client = getAlgoliaClient()
  await client.deleteObject({ indexName: algoliaIndex, objectID: productId })
}

/* ─── One-time index settings (call from sync endpoint) ─── */

export async function configureAlgoliaIndex() {
  if (!process.env.ALGOLIA_ADMIN_KEY) return
  const client = getAlgoliaClient()
  await client.setSettings({
    indexName: algoliaIndex,
    indexSettings: {
      searchableAttributes:  ['name', 'brand', 'description', 'tags', 'category'],
      attributesForFaceting: ['brand', 'category', 'productType', 'filterOnly(active)'],
      customRanking:         ['desc(ratingAverage)', 'desc(ratingCount)'],
      attributesToRetrieve:  [
        'objectID', 'name', 'brand', 'slug', 'image', 'minPrice', 'category', 'productType',
      ],
    },
  })
}
