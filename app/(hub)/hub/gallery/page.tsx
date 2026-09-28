import { requireActiveMember } from '@/lib/auth/guards'
import { createClient } from '@/lib/supabase/server'
import { env } from '@/lib/env'
import Link from 'next/link'
import { MultiUpload } from '@/components/member/multi-upload'

export const dynamic = 'force-dynamic'

export default async function GalleryPage() {
  const { user } = await requireActiveMember()
  const supabase = await createClient()

  const { data: photos } = await supabase
    .from('photos')
    .select(`
      id, storage_path, post_id, created_at,
      posts(slug, title)
    `)
    .eq('status', 'approved')
    .order('created_at', { ascending: false })

  return (
    <div className="max-w-5xl mx-auto py-8 space-y-6">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <h1 className="text-3xl font-serif">Gallery</h1>
        <div className="flex items-center gap-4">
          <Link href="/hub/albums" className="text-brass hover:underline text-sm font-medium">View Albums</Link>
          <MultiUpload />
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {photos?.map(photo => {
          const content = (
            <div className="relative aspect-square bg-muted rounded-md overflow-hidden group">
              <img 
                src={`${env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/media/${photo.storage_path}`} 
                alt="" 
                className="w-full h-full object-cover transition-transform group-hover:scale-105"
              />
              {photo.posts && (
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-end p-4 transition-opacity">
                  <span className="text-white text-sm truncate">{!Array.isArray(photo.posts) ? (photo.posts as any).title : ''}</span>
                </div>
              )}
            </div>
          )

          if (photo.post_id && photo.posts && !Array.isArray(photo.posts)) {
            return (
              <Link key={photo.id} href={`/hub/posts/${(photo.posts as any).slug}`}>
                {content}
              </Link>
            )
          }

          return <div key={photo.id}>{content}</div>
        })}
        {(!photos || photos.length === 0) && (
          <div className="col-span-full text-center py-12 text-slate">
            No photos have been uploaded yet.
          </div>
        )}
      </div>
    </div>
  )
}
