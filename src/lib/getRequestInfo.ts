import { NextRequest } from 'next/server'
import { UAParser } from 'ua-parser-js'

export async function getRequestInfo(req: NextRequest) {
  const userAgent = req.headers.get('user-agent') || 'Unknown'
  
  const forwarded = req.headers.get('x-forwarded-for')
  const realIp = req.headers.get('x-real-ip')
  const ipAddress = forwarded
    ? forwarded.split(',')[0].trim()
    : realIp || 'Unknown'

  const parser = new UAParser(userAgent)
  const result = parser.getResult()

  const browser = result.browser.name
    ? `${result.browser.name} ${result.browser.version}`
    : 'Unknown'

  const os = result.os.name
    ? `${result.os.name} ${result.os.version}`
    : 'Unknown'

  const device = result.device.type || 'desktop'

  let country = 'Unknown'
  let city = 'Unknown'

  try {
    const geoRes = await fetch(`https://ipapi.co/${ipAddress}/json/`)
    const geoData = await geoRes.json()
    country = geoData.country_name || 'Unknown'
    city = geoData.city || 'Unknown'
  } catch {
    country = 'Unknown'
    city = 'Unknown'
  }

  return {
    ipAddress,
    userAgent,
    browser,
    device,
    os,
    country,
    city,
    timestamp: new Date(),
  }
}