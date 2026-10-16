import { describe, expect, it } from 'vitest'
import { safeRedirectPath } from './utils'
import { csvCell, csvRow } from './csv'
import { sniffImage } from './images/sniff'
import { filtersToQueryString, parseMemberFilters } from './admin/members-query'

describe('safeRedirectPath', () => {
  it('keeps same-origin paths with their query', () => {
    expect(safeRedirectPath('/directory?search=sawyer')).toBe('/directory?search=sawyer')
  })
  it.each(['https://evil.example', '//evil.example/x', '/\\evil.example', 'javascript:alert(1)'])('rejects %s', input => {
    const out = safeRedirectPath(input)
    expect(out === null || out.startsWith('/')).toBe(true)
    expect(out ?? '').not.toContain('evil.example')
  })
  it('returns null for empty input', () => {
    expect(safeRedirectPath(null)).toBeNull()
    expect(safeRedirectPath('')).toBeNull()
  })
})

describe('csv', () => {
  it('quotes commas, quotes and newlines', () => {
    expect(csvCell('Martin, Adeline')).toBe('"Martin, Adeline"')
    expect(csvCell('She said "hi"')).toBe('"She said ""hi"""')
    expect(csvCell('a\nb')).toBe('"a\nb"')
  })
  it('neutralises spreadsheet formulas', () => {
    expect(csvCell('=HYPERLINK("x")')).toBe(`"'=HYPERLINK(""x"")"`)
    expect(csvCell('+1 912 555 0199')).toBe("'+1 912 555 0199")
    expect(csvCell('@SUM(A1)')).toBe("'@SUM(A1)")
  })
  it('writes empty cells for null and CRLF line endings', () => {
    expect(csvRow(['a', null, undefined, 3])).toBe('a,,,3\r\n')
  })
})

describe('sniffImage', () => {
  const bytes = (...b: number[]) => new Uint8Array(b)
  it('recognises the four raster formats', () => {
    expect(sniffImage(bytes(0xff, 0xd8, 0xff, 0xe0))?.mime).toBe('image/jpeg')
    expect(sniffImage(bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a))?.mime).toBe('image/png')
    expect(sniffImage(bytes(0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50))?.mime).toBe('image/webp')
    expect(sniffImage(new TextEncoder().encode('GIF89a'))?.mime).toBe('image/gif')
  })
  it('rejects SVG and HTML whatever the file is called', () => {
    expect(sniffImage(new TextEncoder().encode('<svg xmlns="http://www.w3.org/2000/svg">'))).toBeNull()
    expect(sniffImage(new TextEncoder().encode('<?xml version="1.0"?><svg>'))).toBeNull()
    expect(sniffImage(new TextEncoder().encode('<html>'))).toBeNull()
  })
})

describe('member filters', () => {
  it('drops unknown statuses and roles and round-trips the rest', () => {
    const f = parseMemberFilters({ status: 'deleted', role: 'admin', search: 'sawyer', page: '3' })
    expect(f.status).toBeUndefined()
    expect(f.role).toBe('admin')
    expect(filtersToQueryString(f, { page: '1' })).toBe('search=sawyer&role=admin&page=1')
  })
})
