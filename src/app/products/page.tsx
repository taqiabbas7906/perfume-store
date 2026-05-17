import { redirect } from 'next/navigation'

interface PageProps {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}

export default async function ProductsRedirect({ searchParams }: PageProps) {
  const sp = (await searchParams) ?? {}
  const qs = new URLSearchParams()
  for (const [key, value] of Object.entries(sp)) {
    if (value == null) continue
    if (Array.isArray(value)) {
      for (const v of value) qs.append(key, v)
    } else {
      qs.set(key, value)
    }
  }
  const target = `/shop${qs.toString() ? `?${qs.toString()}` : ''}`
  redirect(target)
}
