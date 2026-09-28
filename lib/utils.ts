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
