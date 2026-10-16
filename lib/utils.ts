export { cn } from "cn"

// Only ever returns a same-origin path, or null. Rejects protocol-relative
// URLs like "//evil.com" that pass a naive `.startsWith('/')` check.
export function safeRedirectPath(path: string | null | undefined): string | null {
  if (!path) return null
  try {
    const url = new URL(path, 'http://localhost')
    if (url.origin !== 'http://localhost') return null
    return `${url.pathname}${url.search}${url.hash}`
  } catch {
    return null
  }
}

// Avatars were stored as bare storage paths in early rows and as full public
// URLs since; accept either.
export function avatarSrc(value: string | null | undefined): string | null {
  if (!value) return null
  if (/^https?:\/\//.test(value)) return value
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/avatars/${value}`
}

/** "1 member", "2,400 members" */
export function plural(n: number, singular: string, pluralForm = `${singular}s`): string {
  return `${n.toLocaleString('en-US')} ${n === 1 ? singular : pluralForm}`
}
