import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { buttonVariants } from '@/components/ui/button'
import { format } from 'date-fns'

export const dynamic = 'force-dynamic'

export default async function AdminContentPage() {
  const supabase = await createClient()
  
  const { data: events } = await supabase
    .from('events')
    .select('*')
    .order('starts_at', { ascending: false })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-serif">Events</h1>
        <Link href="/admin/content/events/new" className={buttonVariants()}>
          Create Event
        </Link>
      </div>

      <div className="bg-card border border-rule rounded-md overflow-hidden">
        <table className="w-full text-sm text-left">
          <thead className="bg-paper/50 border-b border-rule">
            <tr>
              <th className="px-4 py-3 font-medium text-slate">Event</th>
              <th className="px-4 py-3 font-medium text-slate">Date</th>
              <th className="px-4 py-3 font-medium text-slate">Visibility</th>
              <th className="px-4 py-3 font-medium text-slate text-right">Capacity</th>
              <th className="px-4 py-3 font-medium text-slate text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-rule">
            {events?.map(e => (
              <tr key={e.id} className="hover:bg-paper/30 transition-colors">
                <td className="px-4 py-3 font-medium">{e.title}</td>
                <td className="px-4 py-3">{format(new Date(e.starts_at), 'd MMM yyyy')}</td>
                <td className="px-4 py-3 capitalize">{e.visibility.replace('_', ' ')}</td>
                <td className="px-4 py-3 text-right tabular-nums">{e.capacity || '∞'}</td>
                <td className="px-4 py-3 text-right">
                  <Link href={`/admin/content/events/${e.id}`} className="text-brass hover:underline">
                    Edit
                  </Link>
                </td>
              </tr>
            ))}
            {(!events || events.length === 0) && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-slate">
                  No events found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
