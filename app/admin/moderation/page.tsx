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
    .select('id, storage_path, caption, uploader:profiles(full_name)')
    .eq('status', 'pending')
    .order('created_at', { ascending: false })

  // Fetch pending comments (reported)
  const { data: comments } = await supabase
    .from('comments')
    .select('id, body, author:profiles(full_name)')
    .eq('status', 'pending')
    .order('created_at', { ascending: false })

  return (
    <div className="space-y-12">
      <div>
        <h1 className="text-3xl font-serif mb-2">Moderation</h1>
        <p className="text-slate">Review pending photos and reported comments.</p>
      </div>

      <ModerationList 
        initialPhotos={(photos ?? []) as unknown as Parameters<typeof ModerationList>[0]['initialPhotos']}
        initialComments={(comments ?? []) as unknown as Parameters<typeof ModerationList>[0]['initialComments']}
        storageUrl={`${env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/media/`}
      />
    </div>
  )
}
