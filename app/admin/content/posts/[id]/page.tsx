import Link from 'next/link'
import { notFound } from 'next/navigation'
import { requireRole } from '@/lib/auth/guards'
import { PostForm } from './post-form'

export const dynamic = 'force-dynamic'

export default async function AdminPostPage({ params }: { params: Promise<{ id: string }> }) {
  const { supabase } = await requireRole(['steward', 'admin', 'owner'])
  const { id } = await params

  let post = null
  if (id !== 'new') {
    const { data } = await supabase
      .from('posts')
      .select('title, slug, kind, excerpt, body, visibility, min_tier_level, published_at')
      .eq('id', id)
      .maybeSingle()
    if (!data) notFound()
    post = data
  }
  const { data: tiers } = await supabase.from('membership_tiers').select('name, level').order('sort_order')

  return (
    <div className="max-w-3xl space-y-6">
      <Link href="/admin/content" className="text-sm text-brass hover:underline">All content</Link>
      <h1 className="text-3xl font-serif">{id === 'new' ? 'New announcement' : 'Edit post'}</h1>
      <PostForm post={post} id={id} tiers={tiers ?? []} />
    </div>
  )
}
