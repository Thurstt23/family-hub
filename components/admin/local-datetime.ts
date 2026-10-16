import { isoToZonedInput, zonedInputToIso } from '@/lib/dates'

// <input type="datetime-local"> has no timezone. Values are shown and read as
// wall-clock time in the family's timezone (lib/dates.ts), whatever the
// editor's own computer is set to, and converted to ISO before the form
// reaches the server.

export function toLocalInput(iso: string | null | undefined): string {
  return isoToZonedInput(iso)
}

export function localInputsToIso(fd: FormData, names: string[]) {
  for (const name of names) {
    const v = fd.get(name)
    if (typeof v === 'string' && v) fd.set(name, zonedInputToIso(v))
  }
  return fd
}
