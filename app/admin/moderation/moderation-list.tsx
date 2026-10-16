'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { moderatePhoto, moderateComment } from './actions'

type PendingPhoto = { id: string; storage_path: string; caption: string | null; uploader: { full_name: string } | null }
type ReportedComment = { id: string; body: string; author: { full_name: string } | null }

export function ModerationList({
  initialPhotos,
  initialComments,
  storageUrl,
}: {
  initialPhotos: PendingPhoto[]
  initialComments: ReportedComment[]
  storageUrl: string
}) {
  const [photos, setPhotos] = useState(initialPhotos)
  const [comments, setComments] = useState(initialComments)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const handlePhoto = (id: string, status: 'approved' | 'rejected') =>
    startTransition(async () => {
      const res = await moderatePhoto(id, status)
      if (res.ok) {
        setPhotos(prev => prev.filter(p => p.id !== id))
        setError(null)
      } else setError(res.error)
    })

  const handleComment = (id: string, decision: 'keep' | 'remove') =>
    startTransition(async () => {
      const res = await moderateComment(id, decision)
      if (res.ok) {
        setComments(prev => prev.filter(c => c.id !== id))
        setError(null)
      } else setError(res.error)
    })

  return (
    <div className="space-y-12" aria-busy={pending}>
      {error ? <p role="alert" className="text-sm text-clay">{error}</p> : null}

      <section aria-labelledby="photos-heading">
        <h2 id="photos-heading" className="text-xl font-serif border-b border-rule pb-2 mb-4">
          Photos waiting for review <span className="text-slate tabular-nums">({photos.length})</span>
        </h2>
        {photos.length === 0 ? (
          <p className="text-slate text-sm">No photos are waiting. New uploads appear here.</p>
        ) : (
          <ul className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {photos.map(photo => (
              <li key={photo.id} className="overflow-hidden rounded-md border border-rule bg-card">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`${storageUrl}${photo.storage_path}`}
                  alt={photo.caption || `Photo uploaded by ${photo.uploader?.full_name ?? 'a member'}`}
                  className="aspect-square w-full object-cover bg-rule"
                />
                <div className="p-3 text-sm">
                  <p className="truncate font-medium">{photo.uploader?.full_name ?? 'Unknown member'}</p>
                  <div className="mt-3 flex gap-2">
                    <Button size="sm" onClick={() => handlePhoto(photo.id, 'approved')} className="flex-1" disabled={pending}>Approve</Button>
                    <Button size="sm" variant="destructive" onClick={() => handlePhoto(photo.id, 'rejected')} className="flex-1" disabled={pending}>Reject</Button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="comments-heading">
        <h2 id="comments-heading" className="text-xl font-serif border-b border-rule pb-2 mb-4">
          Reported comments <span className="text-slate tabular-nums">({comments.length})</span>
        </h2>
        {comments.length === 0 ? (
          <p className="text-slate text-sm">No comments have been reported.</p>
        ) : (
          <ul className="space-y-4">
            {comments.map(comment => (
              <li key={comment.id} className="space-y-3 rounded-md border border-rule bg-card p-4">
                <p className="text-sm font-medium">{comment.author?.full_name ?? 'Unknown member'}</p>
                <p className="whitespace-pre-wrap rounded-md bg-paper p-3 text-sm">{comment.body}</p>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => handleComment(comment.id, 'keep')} disabled={pending}>Keep comment</Button>
                  <Button size="sm" variant="destructive" onClick={() => handleComment(comment.id, 'remove')} disabled={pending}>Remove comment</Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
