'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import imageCompression from 'browser-image-compression'

import { createClient } from '@/lib/supabase/client'

// Resizes to 2000px on the long edge and converts to WebP in the browser
// (08, Phase 6), uploads one by one, and records each photo as pending so a
// steward approves it before anyone else sees it.
export function MultiUpload({ albumId }: { albumId?: string }) {
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null)
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null)
  const router = useRouter()
  const supabase = createClient()
  const uploading = progress !== null

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    e.target.value = ''
    if (files.length === 0) return

    setMessage(null)
    setProgress({ done: 0, total: files.length })
    let saved = 0
    let failed = 0
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('signed out')

      for (const file of files) {
        try {
          const compressed = await imageCompression(file, {
            maxSizeMB: 1,
            maxWidthOrHeight: 2000,
            useWebWorker: true,
            fileType: 'image/webp',
          })
          const filePath = `${user.id}/${crypto.randomUUID()}.webp`
          const { error: uploadError } = await supabase.storage.from('media').upload(filePath, compressed, { contentType: 'image/webp' })
          if (uploadError) throw uploadError
          const { error: dbError } = await supabase.from('photos').insert({
            uploader_id: user.id,
            storage_path: filePath,
            album_id: albumId || null,
            status: 'pending',
          })
          if (dbError) throw dbError
          saved++
        } catch {
          failed++
        }
        setProgress({ done: saved + failed, total: files.length })
      }

      setMessage(
        failed === 0
          ? { ok: true, text: `${saved} photo${saved === 1 ? '' : 's'} uploaded. They appear here once a steward approves them.` }
          : { ok: false, text: `${saved} uploaded, ${failed} could not be. Photos must be images under 10MB; try those again.` }
      )
      router.refresh()
    } catch {
      setMessage({ ok: false, text: 'Your session has ended. Sign in again to upload.' })
    } finally {
      setProgress(null)
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <input
        type="file"
        multiple
        accept="image/jpeg,image/png,image/webp,image/gif,image/heic"
        onChange={handleUpload}
        disabled={uploading}
        className="peer sr-only"
        id="multi-upload-input"
      />
      <label
        htmlFor="multi-upload-input"
        className={`peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-brass cursor-pointer ${uploading ? 'opacity-50 pointer-events-none' : ''} inline-flex items-center justify-center rounded-lg bg-brass px-4 py-2 text-sm font-medium text-white hover:bg-brass/90`}
      >
        {progress ? `Uploading ${progress.done + 1} of ${progress.total}…` : 'Upload photos'}
      </label>
      <p aria-live="polite" role={message && !message.ok ? 'alert' : 'status'} className={`text-sm ${message?.ok ? 'text-[#3F5A46]' : 'text-clay'}`}>
        {message?.text}
      </p>
    </div>
  )
}
