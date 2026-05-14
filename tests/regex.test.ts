import { describe, it, expect } from 'vitest'
import { escapeRegex } from '@/lib/utils/regex'

describe('escapeRegex', () => {
  it('escapes regex metacharacters', () => {
    expect(escapeRegex('a.b*c+d?e^f$g{h}i(j)k|l[m]n\\o'))
      .toBe('a\\.b\\*c\\+d\\?e\\^f\\$g\\{h\\}i\\(j\\)k\\|l\\[m\\]n\\\\o')
  })

  it('leaves alphanumeric input untouched', () => {
    expect(escapeRegex('Dior 999')).toBe('Dior 999')
  })

  it('makes user input safe for a RegExp constructor', () => {
    const search = '.*'
    const re = new RegExp(escapeRegex(search), 'i')
    expect(re.test('literal .* match')).toBe(true)
    expect(re.test('anything else')).toBe(false)
  })
})
