'use client'

import { useState } from 'react'
import { formatDistanceToNow } from 'date-fns'
import { Heart, MessageCircle } from 'lucide-react'
import { toggleLike, addComment, reportComment } from './actions'
import { PostComposer } from './post-composer'
import { Markdown } from '@/components/ui/markdown'

export function Feed({ initialPosts, userId }: { initialPosts: any[], userId: string }) {
  const [posts, setPosts] = useState(initialPosts)
  const [activeCommentPost, setActiveCommentPost] = useState<string | null>(null)
  const [commentContent, setCommentContent] = useState('')

  const handleLike = async (postId: string, currentlyLiked: boolean) => {
    // optimistic update
    setPosts(prev => prev.map(p => {
      if (p.id === postId) {
        return {
          ...p,
          hasLiked: !currentlyLiked,
          likesCount: currentlyLiked ? p.likesCount - 1 : p.likesCount + 1
        }
      }
      return p
    }))
    try {
      await toggleLike(postId)
    } catch (e: any) {
      alert(e.message)
      // revert omitted for brevity
    }
  }

  const handleComment = async (postId: string) => {
    if (!commentContent.trim()) return
    try {
      await addComment(postId, commentContent)
      setCommentContent('')
      setActiveCommentPost(null)
      // in a real app we'd refresh or optimistically add the comment,
      // but since we're using revalidatePath, the page will refresh.
      window.location.reload()
    } catch (e: any) {
      alert(e.message)
    }
  }

  return (
    <div className="space-y-8">
      <PostComposer />

      <div className="space-y-6">
        {posts.map(post => (
          <div key={post.id} className="bg-card border border-rule rounded-md p-4 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-muted overflow-hidden border border-rule">
                {post.author.avatar_url && (
                  <img src={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/avatars/${post.author.avatar_url}`} alt="" className="w-full h-full object-cover" />
                )}
              </div>
              <div>
                <p className="font-medium text-ink">{post.author.full_name}</p>
                <p className="text-xs text-slate">{formatDistanceToNow(new Date(post.created_at))} ago</p>
              </div>
            </div>

            {post.body && (
              <Markdown content={post.body} />
            )}

            {post.photos && post.photos.length > 0 && (
              <div className={`grid gap-2 ${post.photos.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
                {post.photos.map((photo: any) => (
                  <div key={photo.id} className="relative aspect-square bg-muted rounded-md overflow-hidden">
                    <img 
                      src={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/media/${photo.storage_path}`} 
                      alt="" 
                      className="w-full h-full object-cover" 
                    />
                  </div>
                ))}
              </div>
            )}

            <div className="flex items-center gap-4 pt-2 border-t border-rule text-slate">
              <button 
                onClick={() => handleLike(post.id, post.hasLiked)}
                className={`flex items-center gap-1.5 text-sm font-medium transition-colors ${post.hasLiked ? 'text-red-500' : 'hover:text-ink'}`}
              >
                <Heart className={`w-5 h-5 ${post.hasLiked ? 'fill-current' : ''}`} />
                {post.likesCount}
              </button>
              
              <button 
                onClick={() => setActiveCommentPost(activeCommentPost === post.id ? null : post.id)}
                className="flex items-center gap-1.5 text-sm font-medium hover:text-ink transition-colors"
              >
                <MessageCircle className="w-5 h-5" />
                {post.commentsCount}
              </button>
            </div>

            {activeCommentPost === post.id && (
              <div className="pt-4 border-t border-rule space-y-4">
                {(post.comments || []).map((c: any) => {
                  const author = Array.isArray(c.author) ? c.author[0] : c.author
                  return (
                    <div key={c.id} className="flex gap-3 text-sm group">
                      <div className="w-8 h-8 rounded-full bg-muted overflow-hidden shrink-0 border border-rule">
                        {author?.avatar_url && (
                          <img src={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/avatars/${author.avatar_url}`} alt="" className="w-full h-full object-cover" />
                        )}
                      </div>
                      <div className="bg-muted px-3 py-2 rounded-md flex-1 relative">
                        <p className="font-medium text-ink">{author?.full_name}</p>
                        <p className="text-ink">{c.body}</p>
                        {author?.id !== userId && (
                          <button 
                            onClick={async () => {
                              if (confirm('Report this comment to moderators?')) {
                                try {
                                  await reportComment(c.id)
                                  alert('Comment reported.')
                                  window.location.reload()
                                } catch (e: any) { alert(e.message) }
                              }
                            }}
                            className="absolute top-2 right-2 text-xs text-slate opacity-0 group-hover:opacity-100 hover:text-red-500 transition-all"
                          >
                            Report
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })}
                <div className="flex gap-2">
                  <input 
                    type="text"
                    placeholder="Write a comment..."
                    value={commentContent}
                    onChange={e => setCommentContent(e.target.value)}
                    className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  />
                  <button 
                    onClick={() => handleComment(post.id)}
                    className="inline-flex items-center justify-center rounded-md text-sm font-medium bg-brass text-card px-4 py-2 hover:bg-brass/90"
                  >
                    Post
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
        
        {posts.length === 0 && (
          <div className="text-center py-12 text-slate">
            No posts yet. Be the first to share!
          </div>
        )}
      </div>
    </div>
  )
}
