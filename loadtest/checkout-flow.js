/**
 * k6 load test — read-heavy customer browsing + occasional checkout.
 *
 * Run against staging:
 *   k6 run -e BASE_URL=https://staging.yourdomain.com loadtest/checkout-flow.js
 *
 * Custom shape:
 *   k6 run -e BASE_URL=... --vus 50 --duration 5m loadtest/checkout-flow.js
 */
import http from 'k6/http'
import { check, sleep, group } from 'k6'
import { Rate, Trend } from 'k6/metrics'

const BASE = __ENV.BASE_URL || 'http://localhost:3000'

const errorRate = new Rate('errors')
const productListLatency = new Trend('product_list_ms')
const productDetailLatency = new Trend('product_detail_ms')

export const options = {
  stages: [
    { duration: '30s', target: 10 },   // ramp up
    { duration: '2m',  target: 50 },   // steady state
    { duration: '30s', target: 100 },  // burst
    { duration: '1m',  target: 50 },   // recover
    { duration: '30s', target: 0 },    // ramp down
  ],
  thresholds: {
    http_req_duration:  ['p(95)<500', 'p(99)<1500'],
    http_req_failed:    ['rate<0.01'],
    errors:             ['rate<0.01'],
    product_list_ms:    ['p(95)<400'],
    product_detail_ms:  ['p(95)<300'],
  },
}

export default function () {
  group('browse', () => {
    const list = http.get(`${BASE}/api/products?limit=12`)
    productListLatency.add(list.timings.duration)
    const listOk = check(list, {
      'list 200':       (r) => r.status === 200,
      'list has items': (r) => r.json('products') !== undefined,
    })
    errorRate.add(!listOk)

    if (listOk) {
      const products = list.json('products')
      if (Array.isArray(products) && products.length > 0) {
        const slug = products[Math.floor(Math.random() * products.length)].slug
        const detail = http.get(`${BASE}/api/products/${slug}`)
        productDetailLatency.add(detail.timings.duration)
        errorRate.add(!check(detail, { 'detail 200': (r) => r.status === 200 }))
      }
    }
  })

  group('search', () => {
    const r = http.get(`${BASE}/api/search?q=oud&limit=6`)
    errorRate.add(!check(r, { 'search 200': (r) => r.status === 200 }))
  })

  group('navigation', () => {
    const brands = http.get(`${BASE}/api/brands`)
    const cats   = http.get(`${BASE}/api/categories`)
    errorRate.add(!check(brands, { 'brands 200':     (r) => r.status === 200 }))
    errorRate.add(!check(cats,   { 'categories 200': (r) => r.status === 200 }))
  })

  group('health', () => {
    const h = http.get(`${BASE}/api/health`)
    errorRate.add(!check(h, { 'health ok': (r) => r.status === 200 }))
  })

  sleep(Math.random() * 2 + 1)
}
