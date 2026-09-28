'use client'

import { useState, useRef, useTransition } from 'react'
import { updateProfile, uploadAvatar } from './actions'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'

export function ProfileForm({ 
  profile, 
  branches 
}: { 
  profile: any, 
  branches: { id: string, name: string }[] 
}) {
  const [isPending, startTransition] = useTransition()
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > 10 * 1024 * 1024) {
      alert('File must be less than 10MB')
      return
    }

    setIsUploading(true)
    const fd = new FormData()
    fd.append('avatar', file)
    
    try {
      await uploadAvatar(fd)
      alert('Avatar updated')
    } catch (err: any) {
      alert(`Error uploading: ${err.message}`)
    } finally {
      setIsUploading(false)
    }
  }

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    startTransition(() => {
      updateProfile(fd).catch(err => {
        alert(err.message)
      })
    })
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-6">
        <Avatar className="h-24 w-24 border border-rule">
          <AvatarImage src={profile.avatar_url || ''} alt={profile.full_name} sizes="96px" />
          <AvatarFallback className="text-3xl bg-paper text-ink border border-rule">{profile.full_name?.charAt(0)}</AvatarFallback>
        </Avatar>
        <div>
          <input 
            type="file" 
            accept="image/*" 
            className="hidden" 
            ref={fileInputRef} 
            onChange={handleAvatarChange} 
          />
          <Button 
            variant="outline" 
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
          >
            {isUploading ? 'Uploading...' : 'Change Avatar'}
          </Button>
          <p className="text-sm text-slate mt-2">JPG, PNG or WEBP. Max 10MB.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid sm:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="full_name">Full Name</label>
            <Input id="full_name" name="full_name" defaultValue={profile.full_name} required />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="display_name">Display Name</label>
            <Input id="display_name" name="display_name" defaultValue={profile.display_name || ''} />
          </div>
          
          <div className="space-y-2 sm:col-span-2">
            <label className="text-sm font-medium" htmlFor="bio">Bio</label>
            <textarea 
              id="bio" 
              name="bio" 
              className="flex min-h-[80px] w-full rounded-md border border-rule bg-transparent px-3 py-2 text-sm placeholder:text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              defaultValue={profile.bio || ''}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="phone">Phone</label>
            <Input id="phone" name="phone" type="tel" defaultValue={profile.phone || ''} />
            <label className="flex items-center gap-2 text-sm text-slate mt-1">
              <input type="checkbox" name="show_phone" defaultChecked={profile.show_phone} className="accent-brass" />
              Show phone to other members
            </label>
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-medium">Email Privacy</label>
            <div className="mt-2 text-sm text-ink">{profile.email}</div>
            <label className="flex items-center gap-2 text-sm text-slate mt-1">
              <input type="checkbox" name="show_email" defaultChecked={profile.show_email} className="accent-brass" />
              Show email to other members
            </label>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="birthday">Birthday</label>
            <Input id="birthday" name="birthday" type="date" defaultValue={profile.birthday || ''} />
            <label className="flex items-center gap-2 text-sm text-slate mt-1">
              <input type="checkbox" name="show_birthday" defaultChecked={profile.show_birthday} className="accent-brass" />
              Show birthday to other members
            </label>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="generation">Generation</label>
            <Input id="generation" name="generation" type="number" min="1" max="10" defaultValue={profile.generation || ''} />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="city">City</label>
            <Input id="city" name="city" defaultValue={profile.city || ''} />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="country">Country</label>
            <Input id="country" name="country" defaultValue={profile.country || ''} />
          </div>

          <div className="space-y-2 sm:col-span-2">
            <label className="text-sm font-medium" htmlFor="branch">Branch</label>
            <Select name="branch_id" defaultValue={profile.branch_id || ''}>
              <SelectTrigger>
                <SelectValue placeholder="Select a branch" />
              </SelectTrigger>
              <SelectContent>
                {branches.map(b => (
                  <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        
        <div className="pt-4 border-t border-rule flex justify-end">
          <Button type="submit" disabled={isPending}>
            {isPending ? 'Saving...' : 'Save changes'}
          </Button>
        </div>
      </form>
    </div>
  )
}
