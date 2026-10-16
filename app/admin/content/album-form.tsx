'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { FieldLabel, NativeSelect } from '@/components/ui/native-select'
import { ActionForm } from '@/components/admin/action-form'
import { createAlbum } from './actions'

export function AlbumForm({ events, tiers }: { events: { id: string; title: string }[]; tiers: { name: string; level: number }[] }) {
  const [visibility, setVisibility] = useState('members')
  return (
    <ActionForm action={createAlbum} className="grid gap-3 rounded-md border border-rule bg-card p-4 sm:grid-cols-2 lg:grid-cols-5 items-end">
      <div className="lg:col-span-2">
        <FieldLabel htmlFor="album-title">Album title</FieldLabel>
        <Input id="album-title" name="title" required placeholder="Savannah reunion, June 2026" />
      </div>
      <div>
        <FieldLabel htmlFor="album-event">Event (optional)</FieldLabel>
        <NativeSelect id="album-event" name="event_id" defaultValue="">
          <option value="">None</option>
          {events.map(e => <option key={e.id} value={e.id}>{e.title}</option>)}
        </NativeSelect>
      </div>
      <div>
        <FieldLabel htmlFor="album-visibility">Who can see it</FieldLabel>
        <NativeSelect id="album-visibility" name="visibility" value={visibility} onChange={e => setVisibility(e.target.value)}>
          <option value="members">Members</option>
          <option value="tier_gated">Members on a paid tier</option>
        </NativeSelect>
      </div>
      {visibility === 'tier_gated' ? (
        <div>
          <FieldLabel htmlFor="album-tier">Lowest tier</FieldLabel>
          <NativeSelect id="album-tier" name="min_tier_level" defaultValue="10">
            {tiers.filter(t => t.level > 0).map(t => <option key={t.level} value={t.level}>{t.name}</option>)}
          </NativeSelect>
        </div>
      ) : null}
      <div>
        <Button type="submit">Create album</Button>
      </div>
    </ActionForm>
  )
}
