// Dates are stored in UTC and the server renders in UTC (Vercel), so every
// date a member reads is formatted in the family's timezone explicitly.
// Otherwise a 6pm gathering in Savannah shows as 10:00 PM.
// Change NEXT_PUBLIC_SITE_TIMEZONE to move the whole site.

export const SITE_TIMEZONE = process.env.NEXT_PUBLIC_SITE_TIMEZONE || 'America/New_York'

const fmt = (locale: string, opts: Intl.DateTimeFormatOptions) =>
  new Intl.DateTimeFormat(locale, { timeZone: SITE_TIMEZONE, ...opts })

const longDate = fmt('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
const shortDate = fmt('en-GB', { day: 'numeric', month: 'short' })
const year = fmt('en-GB', { year: 'numeric' })
const weekdayDate = fmt('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
const time = fmt('en-US', { hour: 'numeric', minute: '2-digit' })
const timeWithZone = fmt('en-US', { hour: 'numeric', minute: '2-digit', timeZoneName: 'short' })
const time24 = fmt('en-GB', { hour: '2-digit', minute: '2-digit' })

const d = (v: string | Date) => (typeof v === 'string' ? new Date(v) : v)

// A plain calendar date such as a birthday ("1990-05-14") has no time and
// must not shift a day when viewed from another timezone.
const calendarDate = new Intl.DateTimeFormat('en-GB', { timeZone: 'UTC', day: 'numeric', month: 'long', year: 'numeric' })
const isCalendarDate = (v: string | Date) => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v)

/** 14 June 2026 */
export const formatLongDate = (v: string | Date) => (isCalendarDate(v) ? calendarDate.format(new Date(`${v}T00:00:00Z`)) : longDate.format(d(v)))
/** 14 Jun */
export const formatShortDate = (v: string | Date) => shortDate.format(d(v))
/** 2026 */
export const formatYear = (v: string | Date) => year.format(d(v))
/** Sunday, 14 June 2026 */
export const formatWeekdayDate = (v: string | Date) => weekdayDate.format(d(v))
/** 6:00 PM */
export const formatTime = (v: string | Date) => time.format(d(v))
/** 6:00 PM EDT */
export const formatTimeWithZone = (v: string | Date) => timeWithZone.format(d(v))
/** 14 June 2026, 18:00 */
export const formatDateTime = (v: string | Date) => `${longDate.format(d(v))}, ${time24.format(d(v))}`

// ---- <input type="datetime-local"> in the family's timezone ----
// The admin may be anywhere (Edward is in Vietnam); event times are always
// entered and shown as wall-clock time in SITE_TIMEZONE.

const partsFmt = new Intl.DateTimeFormat('en-US', {
  timeZone: SITE_TIMEZONE,
  hourCycle: 'h23',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
})

function zonedParts(date: Date) {
  const get = (t: string) => Number(partsFmt.formatToParts(date).find(p => p.type === t)?.value ?? 0)
  return { y: get('year'), m: get('month'), d: get('day'), h: get('hour'), mi: get('minute'), s: get('second') }
}

function offsetMs(date: Date) {
  const p = zonedParts(date)
  return Date.UTC(p.y, p.m - 1, p.d, p.h, p.mi, p.s) - Math.floor(date.getTime() / 1000) * 1000
}

/** "2026-06-14T18:00" read as SITE_TIMEZONE wall-clock time -> ISO (UTC). */
export function zonedInputToIso(value: string): string {
  const [date = '', clock = '00:00'] = value.split('T')
  const [y, m, d] = date.split('-').map(Number)
  const [h, mi] = clock.split(':').map(Number)
  const guess = Date.UTC(y!, m! - 1, d!, h!, mi!)
  let ts = guess - offsetMs(new Date(guess))
  const second = guess - offsetMs(new Date(ts)) // settles daylight saving edges
  if (second !== ts) ts = second
  return new Date(ts).toISOString()
}

/** ISO -> "2026-06-14T18:00" in SITE_TIMEZONE, for a datetime-local value. */
export function isoToZonedInput(iso: string | null | undefined): string {
  if (!iso) return ''
  const p = zonedParts(new Date(iso))
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${p.y}-${pad(p.m)}-${pad(p.d)}T${pad(p.h)}:${pad(p.mi)}`
}

/** "Eastern Time (America/New_York)" style label for form hints. */
export function siteTimezoneLabel(): string {
  const name = new Intl.DateTimeFormat('en-US', { timeZone: SITE_TIMEZONE, timeZoneName: 'long' })
    .formatToParts(new Date())
    .find(p => p.type === 'timeZoneName')?.value
  return name ? `${name} (${SITE_TIMEZONE})` : SITE_TIMEZONE
}

const dayNumber = fmt('en-US', { day: 'numeric' })
const monthYear = fmt('en-GB', { month: 'long', year: 'numeric' })
const weekday = fmt('en-GB', { weekday: 'long' })
/** 14 */
export const formatDayNumber = (v: string | Date) => dayNumber.format(d(v))
/** June 2026 */
export const formatMonthYear = (v: string | Date) => monthYear.format(d(v))
/** Sunday */
export const formatWeekday = (v: string | Date) => weekday.format(d(v))
