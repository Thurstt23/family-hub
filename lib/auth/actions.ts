'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { safeRedirectPath } from '@/lib/utils'

export async function login(formData: FormData) {
  const email = formData.get('email') as string
  const password = formData.get('password') as string
  const next = safeRedirectPath(formData.get('next') as string | null)

  if (!email || !password) {
    redirect(`/login?error=${encodeURIComponent('Email and password are required')}`)
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    redirect(`/login?error=${encodeURIComponent(error.message)}${next ? `&next=${encodeURIComponent(next)}` : ''}`)
  }

  revalidatePath('/', 'layout')
  redirect(next || '/hub')
}

export async function signup(formData: FormData) {
  const email = formData.get('email') as string
  const password = formData.get('password') as string

  if (!email || !password) {
    redirect(`/signup?error=${encodeURIComponent('Email and password are required')}`)
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`,
    },
  })

  if (error) {
    redirect(`/signup?error=${encodeURIComponent(error.message)}`)
  }

  redirect(`/signup?success=${encodeURIComponent('Check your email to confirm your account')}`)
}

export async function signInWithGoogle(next?: string | null) {
  const supabase = await createClient()
  const safeNext = safeRedirectPath(next)
  const redirectTo = `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback${safeNext ? `?next=${encodeURIComponent(safeNext)}` : ''}`
  
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo,
    },
  })

  if (error) throw error
  if (data.url) redirect(data.url)
}

export async function signInWithMagicLink(formData: FormData) {
  const email = formData.get('email') as string
  const next = safeRedirectPath(formData.get('next') as string | null)

  const supabase = await createClient()
  const redirectTo = `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback${next ? `?next=${encodeURIComponent(next)}` : ''}`
  
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: redirectTo,
    },
  })

  if (error) {
    redirect(`/login?error=${encodeURIComponent(error.message)}${next ? `&next=${encodeURIComponent(next)}` : ''}`)
  }
  redirect(`/login?success=${encodeURIComponent('Check your email for the magic link')}${next ? `&next=${encodeURIComponent(next)}` : ''}`)
}

export async function updatePassword(formData: FormData) {
  const password = formData.get('password') as string

  if (!password || password.length < 10) {
    redirect(`/update-password?error=${encodeURIComponent('Password must be at least 10 characters')}`)
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.updateUser({ password })

  if (error) {
    redirect(`/update-password?error=${encodeURIComponent(error.message)}`)
  }

  redirect('/hub')
}

export async function signOut() {
  const supabase = await createClient()
  // global scope invalidates the session on all devices as requested
  await supabase.auth.signOut({ scope: 'global' })
  redirect('/login')
}
