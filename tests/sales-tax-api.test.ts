import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fetchUsSalesTax } from '@/lib/salesTaxApi'

describe('fetchUsSalesTax', () => {
  const originalApiKey = process.env.API_NINJAS_KEY

  beforeEach(() => {
    process.env.API_NINJAS_KEY = 'test-key'
  })

  afterEach(() => {
    process.env.API_NINJAS_KEY = originalApiKey
    vi.restoreAllMocks()
  })

  it('uses ZIP lookup first when a valid postal code is present', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [
          {
            zip_code: '10001',
            state_rate: '0.04',
            city_rate: '0.045',
            county_rate: '0.00375',
            additional_rate: '0.00125',
            total_rate: '0.09',
          },
        ],
      })

    vi.stubGlobal('fetch', fetchMock)

    const result = await fetchUsSalesTax({
      zipCode: '10001-1234',
      city: 'New York',
      state: 'NY',
    })

    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock.mock.calls[0]?.[0]).toContain('zip_code=10001')
    expect(result).toMatchObject({
      lookupType: 'zip',
      zipCode: '10001',
      rate: 0.09,
    })
  })

  it('falls back to city and state when ZIP lookup returns no data', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [],
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [
          {
            zip_code: '77001',
            state_rate: '0.0625',
            city_rate: '0.01',
            county_rate: '0.01',
            additional_rate: '0.0',
            total_rate: '0.0825',
          },
          {
            zip_code: '77002',
            state_rate: '0.0625',
            city_rate: '0.01',
            county_rate: '0.01',
            additional_rate: '0.005',
            total_rate: '0.0875',
          },
        ],
      })

    vi.stubGlobal('fetch', fetchMock)

    const result = await fetchUsSalesTax({
      zipCode: '99999',
      city: 'Houston',
      state: 'TX',
    })

    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(fetchMock.mock.calls[1]?.[0]).toContain('city=Houston')
    expect(fetchMock.mock.calls[1]?.[0]).toContain('state=Texas')
    expect(result).toMatchObject({
      lookupType: 'city',
      locationLabel: 'Houston, Texas',
      zipCodes: ['77001', '77002'],
    })
    expect(result?.rate).toBeCloseTo(0.085, 6)
  })
})
