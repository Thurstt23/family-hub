'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import imageCompression from 'browser-image-compression'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'
import { attachPhoto } from '@/app/(hub)/hub/actions'

export function MultiUpload({ albumId }: { albumId?: string }) {
  const [uploading, setUploading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    setUploading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not logged in')

      for (let i = 0; i < files.length; i++) {
        const file = files[i]
        
        // compress and resize
        const options = {
          maxSizeMB: 1,
          maxWidthOrHeight: 2000,
          useWebWorker: true,
          fileType: 'image/webp'
        }
        
        const compressedFile = await imageCompression(file as File, options)
        
        // upload to storage
        const filePath = `${user.id}/${crypto.randomUUID()}.webp`
        const { error: uploadError } = await supabase.storage
          .from('media')
          .upload(filePath, compressedFile)
          
        if (uploadError) throw uploadError

        // save to DB with status pending
        const { error: dbError } = await supabase.from('photos').insert({
          uploader_id: user.id,
          storage_path: filePath,
          album_id: albumId || null,
          status: 'pending'
        })
        
        if (dbError) throw dbError
      }
      
      router.refresh()
    } catch (error: any) {
      alert(error.message)
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  return (
    <div>
      <input
        type="file"
        multiple
        accept="image/*"
        onChange={handleUpload}
        disabled={uploading}
        className="hidden"
        id="multi-upload-input"
      />
      <Button asChild disabled={uploading}>
        <label htmlFor="multi-upload-input" className="cursor-pointer">
          {uploading ? 'Uploading...' : 'Upload Photos'}
        </label>
      </Button>
    </div>
  )
}
