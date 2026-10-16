// <input type="datetime-local"> has no timezone. Values are shown and read in
// the editor's own timezone, and converted to ISO in the browser before the
// form reaches the server (which runs in UTC).

export function toLocalInput(iso: string | null | undefined): string {
  if (!iso) return ''
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export function localInputsToIso(fd: FormData, names: string[]) {
  for (const name of names) {
    const v = fd.get(name)
    if (typeof v === 'string' && v) fd.set(name, new Date(v).toISOString())
  }
  return fd
}
