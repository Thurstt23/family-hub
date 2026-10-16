import Link from 'next/link'
import { requireRole } from '@/lib/auth/guards'
import { buttonVariants } from '@/components/ui/button'
import { Button } from '@/components/ui/button'
import { DateStamp } from '@/components/admin/marks'
import { ActionForm } from '@/components/admin/action-form'
import { setPostPublished } from './actions'
import { AlbumForm } from './album-form'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Content' }

function postState(published_at: string | null) {
  if (!published_at) return 'Draft'
  return new Date(published_at) > new Date() ? 'Scheduled' : 'Published'
}

export default async function AdminContentPage() {
  const { supabase } = await requireRole(['steward', 'admin', 'owner'])

  const [{ data: posts }, { data: events }, { data: albums }, { data: tiers }] = await Promise.all([
    supabase
      .from('posts')
      .select('id, title, slug, kind, visibility, published_at, created_at')
      .neq('kind', 'story')
      .order('created_at', { ascending: false })
      .limit(50),
    supabase
      .from('events')
      .select('id, title, starts_at, visibility, capacity')
      .order('starts_at', { ascending: false })
      .limit(50),
    supabase
      .from('albums')
      .select('id, title, visibility, created_at, photos(count)')
      .order('created_at', { ascending: false })
      .limit(50),
    supabase.from('membership_tiers').select('name, level').order('sort_order'),
  ])

  return (
    <div className="space-y-12">
      <section aria-labelledby="posts-heading" className="space-y-4">
        <div className="flex items-center justify-between">
          <h1 id="posts-heading" className="text-3xl font-serif">Announcements and notices</h1>
          <Link href="/admin/content/posts/new" className={buttonVariants()}>Write an announcement</Link>
        </div>
        <div className="overflow-x-auto rounded-md border border-rule bg-card">
          <table className="w-full text-sm text-left">
            <thead className="border-b border-rule text-slate">
              <tr>
                <th scope="col" className="px-4 py-3 font-medium">Title</th>
                <th scope="col" className="px-4 py-3 font-medium">Kind</th>
                <th scope="col" className="px-4 py-3 font-medium">State</th>
                <th scope="col" className="px-4 py-3 font-medium">Date</th>
                <th scope="col" className="px-4 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-rule">
              {posts?.map(p => {
                const state = postState(p.published_at)
                return (
                  <tr key={p.id}>
                    <td className="px-4 py-3 font-medium">{p.title}</td>
                    <td className="px-4 py-3 capitalize">{p.kind}</td>
                    <td className="px-4 py-3">{state}</td>
                    <td className="px-4 py-3"><DateStamp value={p.published_at ?? p.created_at} /></td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-3">
                        <Link href={`/admin/content/posts/${p.id}`} className="text-brass hover:underline">Edit</Link>
                        <ActionForm action={setPostPublished}>
                          <input type="hidden" name="id" value={p.id} />
                          <input type="hidden" name="publish" value={state === 'Published' ? 'false' : 'true'} />
                          <Button type="submit" size="sm" variant={state === 'Published' ? 'ghost' : 'outline'}>
                            {state === 'Published' ? 'Unpublish' : 'Publish now'}
                          </Button>
                        </ActionForm>
                      </div>
                    </td>
                  </tr>
                )
              })}
              {!posts?.length ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-slate">No announcements yet. Write the first one.</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
        <p className="text-sm text-slate">
          Member stories from the hub feed are moderated from <Link href="/admin/moderation" className="text-brass hover:underline">Moderation</Link>.
        </p>
      </section>

      <section aria-labelledby="events-heading" className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 id="events-heading" className="text-3xl font-serif">Events</h2>
          <Link href="/admin/content/events/new" className={buttonVariants()}>Create an event</Link>
        </div>
        <div className="overflow-x-auto rounded-md border border-rule bg-card">
          <table className="w-full text-sm text-left">
            <thead className="border-b border-rule text-slate">
              <tr>
                <th scope="col" className="px-4 py-3 font-medium">Event</th>
                <th scope="col" className="px-4 py-3 font-medium">Date</th>
                <th scope="col" className="px-4 py-3 font-medium">Visibility</th>
                <th scope="col" className="px-4 py-3 font-medium text-right">Capacity</th>
                <th scope="col" className="px-4 py-3 font-medium text-right"><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-rule">
              {events?.map(e => (
                <tr key={e.id}>
                  <td className="px-4 py-3 font-medium">{e.title}</td>
                  <td className="px-4 py-3"><DateStamp value={e.starts_at} /></td>
                  <td className="px-4 py-3 capitalize">{e.visibility.replace('_', ' ')}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{e.capacity ?? 'No limit'}</td>
                  <td className="px-4 py-3 text-right">
                    <Link href={`/admin/content/events/${e.id}`} className="text-brass hover:underline">Edit</Link>
                  </td>
                </tr>
              ))}
              {!events?.length ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-slate">No events yet. Create the next gathering.</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      <section aria-labelledby="albums-heading" className="space-y-4">
        <h2 id="albums-heading" className="text-3xl font-serif">Photo albums</h2>
        <p className="text-sm text-slate max-w-[68ch]">
          Members add photos to an album from its page in the hub. Every upload waits in{' '}
          <Link href="/admin/moderation" className="text-brass hover:underline">Moderation</Link> until a steward approves it.
        </p>
        <AlbumForm events={(events ?? []).map(e => ({ id: e.id, title: e.title }))} tiers={tiers ?? []} />
        {albums?.length ? (
          <ul className="divide-y divide-rule border-y border-rule text-sm">
            {albums.map(a => (
              <li key={a.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                <Link href={`/hub/albums/${a.id}`} className="font-medium hover:underline">{a.title}</Link>
                <span className="flex gap-4 text-slate">
                  <span className="capitalize">{a.visibility.replace('_', ' ')}</span>
                  <span className="tabular-nums">{(a.photos as unknown as { count: number }[])?.[0]?.count ?? 0} photos</span>
                  <DateStamp value={a.created_at} />
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-slate">No albums yet. Create one for the next gathering.</p>
        )}
      </section>
    </div>
  )
}
