// Identify an upload by its first bytes, not by its name or the browser's
// Content-Type. An SVG renamed to .png arrives labelled image/png but starts
// with "<svg" or "<?xml", and SVG can carry script (10, security matrix).

export type SniffedImage = { mime: 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif'; ext: 'jpg' | 'png' | 'webp' | 'gif' }

export function sniffImage(bytes: Uint8Array): SniffedImage | null {
  const b = (i: number) => bytes[i] ?? -1
  if (b(0) === 0xff && b(1) === 0xd8 && b(2) === 0xff) return { mime: 'image/jpeg', ext: 'jpg' }
  if (b(0) === 0x89 && b(1) === 0x50 && b(2) === 0x4e && b(3) === 0x47 && b(4) === 0x0d && b(5) === 0x0a && b(6) === 0x1a && b(7) === 0x0a) {
    return { mime: 'image/png', ext: 'png' }
  }
  // RIFF....WEBP
  if (b(0) === 0x52 && b(1) === 0x49 && b(2) === 0x46 && b(3) === 0x46 && b(8) === 0x57 && b(9) === 0x45 && b(10) === 0x42 && b(11) === 0x50) {
    return { mime: 'image/webp', ext: 'webp' }
  }
  // GIF87a / GIF89a
  if (b(0) === 0x47 && b(1) === 0x49 && b(2) === 0x46 && b(3) === 0x38 && (b(4) === 0x37 || b(4) === 0x39) && b(5) === 0x61) {
    return { mime: 'image/gif', ext: 'gif' }
  }
  return null
}

export const MAX_IMAGE_BYTES = 10 * 1024 * 1024
