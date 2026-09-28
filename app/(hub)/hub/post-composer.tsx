'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import imageCompression from 'browser-image-compression'
import { createPost, attachPhoto } from './actions'
import { Button } from '@/components/ui/button'
import { ImagePlus, Loader2, X } from 'lucide-react'

export function PostComposer() {
  const [body, setBody] = useState('')
  const [files, setFiles] = useState<File[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const supabase = createClient()

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files)
      if (files.length + newFiles.length > 4) {
        alert('You can only upload up to 4 photos per post.')
        return
      }
      setFiles(prev => [...prev, ...newFiles])
    }
  }

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index))
  }

  const handleSubmit = async () => {
    if (!body.trim() && files.length === 0) return
    setIsSubmitting(true)
    try {
      // 1. Compress images sequentially
      const compressedFiles = []
      for (const file of files) {
        const compressed = await imageCompression(file, {
          maxSizeMB: 1,
          maxWidthOrHeight: 1920,
          useWebWorker: false,
        })
        compressedFiles.push(compressed)
      }

      // 2. Create post
      const postId = await createPost(body)

      // 3. Upload images and attach
      for (let i = 0; i < compressedFiles.length; i++) {
        const file = compressedFiles[i]
        if (!file) continue
        const ext = file.type.split('/')[1] || 'jpg'
        const path = `${postId}/${crypto.randomUUID()}.${ext}`
        
        const { error: uploadError } = await supabase.storage
          .from('media')
          .upload(path, file)

        if (uploadError) throw uploadError

        await attachPhoto(postId, path, 0, 0)
      }

      setBody('')
      setFiles([])
    } catch (e: any) {
      console.error('Post composition error:', e)
      alert(e.message || 'An error occurred during upload')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="bg-card border border-rule rounded-md p-4 space-y-4">
      <textarea 
        placeholder="What's new with your branch?"
        value={body}
        onChange={e => setBody(e.target.value)}
        className="w-full bg-transparent min-h-[100px] border-none focus-visible:outline-none resize-none text-ink placeholder:text-slate"
      />
      
      {files.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {files.map((f, i) => (
            <div key={i} className="relative aspect-square bg-muted rounded-md overflow-hidden group">
              <img src={URL.createObjectURL(f)} alt="" className="object-cover w-full h-full" />
              <button 
                onClick={() => removeFile(i)}
                className="absolute top-1 right-1 bg-black/50 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between border-t border-rule pt-4">
        <label className="cursor-pointer text-brass hover:text-brass/80 inline-flex items-center gap-2">
          <ImagePlus className="w-5 h-5" />
          <span className="text-sm font-medium">Add Photo</span>
          <input type="file" accept="image/*" multiple className="hidden" onChange={handleFileChange} disabled={isSubmitting || files.length >= 4} />
        </label>
        
        <Button onClick={handleSubmit} disabled={isSubmitting || (!body.trim() && files.length === 0)}>
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Post
        </Button>
      </div>
    </div>
  )
}
