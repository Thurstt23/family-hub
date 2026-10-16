// RFC 4180 quoting, plus a guard against spreadsheet formula injection:
// a cell starting with = + - @ (or a tab/CR) is prefixed with a quote so
// Excel and Sheets treat it as text.
export function csvCell(value: unknown): string {
  if (value === null || value === undefined) return ''
  let s = String(value)
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`
  if (/[",\r\n]/.test(s)) s = `"${s.replace(/"/g, '""')}"`
  return s
}

export function csvRow(values: unknown[]): string {
  return values.map(csvCell).join(',') + '\r\n'
}
