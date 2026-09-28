import { requireActiveMember } from '@/lib/auth/guards'
import { createClient } from '@/lib/supabase/server'
import { env } from '@/lib/env'
import Link from 'next/link'
import { buttonVariants } from '@/components/ui/button'

export const dynamic = 'force-dynamic'

export default async function AlbumsPage() {
  const { user } = await requireActiveMember()
  const supabase = await createClient()

  const { data: albums } = await supabase
    .from('albums')
    .select('id, title, cover_url, created_at')
    .order('created_at', { ascending: false })

  return (
    <div className="max-w-5xl mx-auto py-8 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-serif">Albums</h1>
        <div className="flex gap-2">
          <Link href="/hub/gallery" className={buttonVariants({ variant: 'outline' })}>All Photos</Link>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {albums?.map(album => (
          <Link key={album.id} href={`/hub/albums/${album.id}`} className="group block space-y-3">
            <div className="relative aspect-video bg-muted rounded-md overflow-hidden border border-rule">
              {album.cover_url ? (
                <img 
                  src={`${env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/media/${album.cover_url}`} 
                  alt="" 
                  className="w-full h-full object-cover transition-transform group-hover:scale-105"
                />
              ) : (
                <div className="flex items-center justify-center w-full h-full bg-paper">
                  <span className="text-slate">No Cover</span>
                </div>
              )}
            </div>
            <h2 className="font-serif text-xl font-medium group-hover:text-brass transition-colors">{album.title}</h2>
          </Link>
        ))}
        {(!albums || albums.length === 0) && (
          <div className="col-span-full text-center py-12 text-slate">
            No albums created yet.
          </div>
        )}
      </div>
    </div>
  )
}
