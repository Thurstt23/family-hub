import { requireActiveMember } from '@/lib/auth/guards'
import { createClient } from '@/lib/supabase/server'
import { Feed } from './feed'

export const dynamic = 'force-dynamic'

export default async function HubPage() {
  const { user } = await requireActiveMember()
  const supabase = await createClient()

  // Fetch posts with related data
  // Due to Supabase limits on nested counts + data, we might just fetch the data we need.
  const { data: posts, error } = await supabase
    .from('posts')
    .select(`
      id, slug, title, kind, created_at, published_at, body,
      author:profiles!posts_author_id_fkey(id, full_name, avatar_url),
      photos(id, storage_path, caption),
      comments(id, body, created_at, status, author:profiles(full_name, avatar_url)),
      post_likes(user_id)
    `)
    // Staff can read drafts and scheduled posts through RLS; the feed shows
    // only what is published, newest first. Removed comments stay out too.
    .not('published_at', 'is', null)
    .lte('published_at', new Date().toISOString())
    .eq('comments.status', 'approved')
    .order('published_at', { ascending: false })
    .limit(50)

  if (error) {
    console.error(error)
  }

  // Transform data for the client
  const feedPosts = (posts || []).map(p => ({
    id: p.id,
    slug: p.slug,
    title: p.kind === 'story' ? null : p.title,
    created_at: p.published_at ?? p.created_at,
    body: p.body,
    author: Array.isArray(p.author) ? p.author[0] : p.author,
    photos: p.photos || [],
    comments: (p.comments || []).sort((a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()),
    commentsCount: p.comments ? p.comments.length : 0,
    likesCount: p.post_likes ? p.post_likes.length : 0,
    hasLiked: p.post_likes ? p.post_likes.some((l: any) => l.user_id === user.id) : false
  }))

  return (
    <div className="max-w-2xl mx-auto py-8 space-y-8">
      <Feed initialPosts={feedPosts} userId={user.id} />
    </div>
  )
}
