import { requireRole } from '@/lib/auth/guards'
import { createClient } from '@/lib/supabase/server'
import { env } from '@/lib/env'
import { ModerationList } from './moderation-list'

export const dynamic = 'force-dynamic'

export default async function ModerationPage() {
  await requireRole(['steward', 'admin', 'owner'])
  const supabase = await createClient()

  // Fetch pending photos
  const { data: photos } = await supabase
    .from('photos')
    .select('*, uploader:profiles(full_name)')
    .eq('status', 'pending')
    .order('created_at', { ascending: false })

  // Fetch pending comments (reported)
  const { data: comments } = await supabase
    .from('comments')
    .select('*, author:profiles(full_name)')
    .eq('status', 'pending')
    .order('created_at', { ascending: false })

  return (
    <div className="space-y-12">
      <div>
        <h1 className="text-3xl font-serif mb-6">Moderation Queue</h1>
        <p className="text-slate">Review pending photos and reported comments.</p>
      </div>

      <ModerationList 
        initialPhotos={photos || []} 
        initialComments={comments || []} 
        storageUrl={`${env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/media/`}
      />
    </div>
  )
}
