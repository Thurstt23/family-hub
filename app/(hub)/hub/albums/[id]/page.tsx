import { requireActiveMember } from '@/lib/auth/guards'
import { createClient } from '@/lib/supabase/server'
import { env } from '@/lib/env'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { MultiUpload } from '@/components/member/multi-upload'

export const dynamic = 'force-dynamic'

export default async function AlbumDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { user } = await requireActiveMember()
  const supabase = await createClient()
  const { id } = await params

  const { data: album } = await supabase
    .from('albums')
    .select('*, profiles(full_name)')
    .eq('id', id)
    .single()

  if (!album) notFound()

  const { data: photos } = await supabase
    .from('photos')
    .select('id, storage_path, created_at')
    .eq('album_id', id)
    .eq('status', 'approved')
    .order('created_at', { ascending: false })

  return (
    <div className="max-w-5xl mx-auto py-8 space-y-6">
      <div className="mb-4">
        <Link href="/hub/albums" className="text-slate hover:underline text-sm">&larr; Back to Albums</Link>
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <h1 className="text-3xl font-serif">{album.title}</h1>
        <MultiUpload albumId={album.id} />
      </div>
      
      <p className="text-slate text-sm">
        Created by {!Array.isArray(album.profiles) ? (album.profiles as any)?.full_name : ''}
      </p>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mt-8">
        {photos?.map(photo => (
          <div key={photo.id} className="relative aspect-square bg-muted rounded-md overflow-hidden group">
            <img 
              src={`${env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/media/${photo.storage_path}`} 
              alt="" 
              className="w-full h-full object-cover transition-transform group-hover:scale-105"
            />
          </div>
        ))}
        {(!photos || photos.length === 0) && (
          <div className="col-span-full text-center py-12 text-slate">
            No photos in this album yet.
          </div>
        )}
      </div>
    </div>
  )
}
