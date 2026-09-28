'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { moderatePhoto, moderateComment } from './actions'

export function ModerationList({ initialPhotos, initialComments, storageUrl }: { initialPhotos: any[], initialComments: any[], storageUrl: string }) {
  const [photos, setPhotos] = useState(initialPhotos)
  const [comments, setComments] = useState(initialComments)

  const handlePhoto = async (id: string, status: 'approved' | 'rejected') => {
    try {
      await moderatePhoto(id, status)
      setPhotos(prev => prev.filter(p => p.id !== id))
    } catch (e: any) { alert(e.message) }
  }

  const handleComment = async (id: string, status: 'approved' | 'rejected') => {
    try {
      await moderateComment(id, status)
      setComments(prev => prev.filter(c => c.id !== id))
    } catch (e: any) { alert(e.message) }
  }

  return (
    <div className="space-y-12">
      <section>
        <h2 className="text-xl font-medium border-b border-rule pb-2 mb-4">Pending Photos ({photos.length})</h2>
        {photos.length === 0 ? (
          <p className="text-slate text-sm">No photos pending review.</p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {photos.map(photo => (
              <div key={photo.id} className="border border-rule rounded-md bg-card overflow-hidden">
                <img src={`${storageUrl}${photo.storage_path}`} alt="" className="w-full aspect-square object-cover bg-muted" />
                <div className="p-3 text-sm">
                  <p className="font-medium truncate">{!Array.isArray(photo.uploader) ? (photo.uploader as any)?.full_name : ''}</p>
                  <div className="flex gap-2 mt-3">
                    <Button size="sm" onClick={() => handlePhoto(photo.id, 'approved')} className="flex-1 bg-brass hover:bg-brass/90">Approve</Button>
                    <Button size="sm" variant="outline" onClick={() => handlePhoto(photo.id, 'rejected')} className="flex-1 text-red-600">Reject</Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="text-xl font-medium border-b border-rule pb-2 mb-4">Reported Comments ({comments.length})</h2>
        {comments.length === 0 ? (
          <p className="text-slate text-sm">No reported comments.</p>
        ) : (
          <div className="space-y-4">
            {comments.map(comment => (
              <div key={comment.id} className="border border-rule rounded-md bg-card p-4 space-y-3">
                <p className="font-medium text-sm text-ink">{!Array.isArray(comment.author) ? (comment.author as any)?.full_name : ''}</p>
                <p className="text-sm bg-muted p-3 rounded-md">{comment.body}</p>
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => handleComment(comment.id, 'approved')} className="bg-brass hover:bg-brass/90">Keep (Approve)</Button>
                  <Button size="sm" variant="outline" onClick={() => handleComment(comment.id, 'rejected')} className="text-red-600">Delete (Reject)</Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
