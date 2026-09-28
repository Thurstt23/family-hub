import { requireActiveMember } from '@/lib/auth/guards'
import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { Feed } from '../../feed'

export const dynamic = 'force-dynamic'

export default async function PostDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { user } = await requireActiveMember()
  const supabase = await createClient()
  const { slug } = await params

  const { data: p, error } = await supabase
    .from('posts')
    .select(`
      id, created_at, body,
      author:profiles!posts_author_id_fkey(id, full_name, avatar_url),
      photos(id, storage_path),
      comments(id, body, created_at, author:profiles(full_name, avatar_url)),
      post_likes(user_id)
    `)
    .eq('slug', slug)
    .single()

  if (error || !p) notFound()

  // Format as single post for the Feed component (reusing it)
  const feedPost = {
    id: p.id,
    created_at: p.created_at,
    body: p.body,
    author: Array.isArray(p.author) ? p.author[0] : p.author,
    photos: p.photos || [],
    comments: (p.comments || []).sort((a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()),
    commentsCount: p.comments ? p.comments.length : 0,
    likesCount: p.post_likes ? p.post_likes.length : 0,
    hasLiked: p.post_likes ? p.post_likes.some((l: any) => l.user_id === user.id) : false
  }

  return (
    <div className="max-w-2xl mx-auto py-8">
      <Feed initialPosts={[feedPost]} userId={user.id} />
    </div>
  )
}
