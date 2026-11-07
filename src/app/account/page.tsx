'use client'

import { assetUrl } from '@/lib/media'
import { useEffect, useState, useRef } from 'react'
import Image from 'next/image'
import { Camera, Check, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { Profile } from '@/types'

export default function AccountPage() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [fullName, setFullName] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const fetch = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      if (data) {
        setProfile(data as Profile)
        setFullName(data.full_name || '')
      }
      setLoading(false)
    }
    fetch()
  }, [])

  const handleSave = async () => {
    if (!profile) return
    setSaving(true)
    setError('')
    const supabase = createClient()
    const { error: err } = await supabase
      .from('profiles')
      .update({ full_name: fullName })
      .eq('id', profile.id)
    if (err) {
      setError(err.message)
    } else {
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    }
    setSaving(false)
  }

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !profile) return

    // Validate file
    if (!file.type.startsWith('image/')) {
      setError('Please upload an image file')
      return
    }
    if (file.size > 2 * 1024 * 1024) {
      setError('Image must be under 2MB')
      return
    }

    setUploading(true)
    setError('')
    const supabase = createClient()

    const ext = file.name.split('.').pop()
    const filePath = `avatars/${profile.id}.${ext}`

    // Upload to Supabase Storage
    const { error: uploadErr } = await supabase.storage
      .from('avatars')
      .upload(filePath, file, { upsert: false })

    if (uploadErr) {
      // If bucket doesn't exist, show helpful message
      if (uploadErr.message.includes('not found') || uploadErr.message.includes('Bucket')) {
        setError('Avatar storage not set up yet. Go to Supabase → Storage → Create bucket named "avatars" (public).')
      } else {
        setError(uploadErr.message)
      }
      setUploading(false)
      return
    }

    // Get public URL
    const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(filePath)

    // Update profile
    const { error: updateErr } = await supabase
      .from('profiles')
      .update({ avatar_url: assetUrl(filePath, 'avatars') })
      .eq('id', profile.id)

    if (updateErr) {
      setError(updateErr.message)
    } else {
      setProfile({ ...profile, avatar_url: assetUrl(filePath, 'avatars') } as Profile)
    }

    setUploading(false)
  }

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-warm-300 p-8 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Profile Picture */}
      <div className="bg-white rounded-xl border border-warm-300 p-6">
        <h2 className="text-lg font-semibold text-primary mb-4">Profile Picture</h2>
        <div className="flex items-center gap-6">
          <div className="relative group">
            {profile?.avatar_url ? (
              <Image
                src={profile.avatar_url}
                alt={profile.full_name}
                width={96}
                height={96}
                className="w-24 h-24 rounded-full object-cover border-2 border-warm-300"
              />
            ) : (
              <div className="w-24 h-24 rounded-full bg-warm-200 flex items-center justify-center text-3xl font-bold text-accent-dark">
                {(profile?.full_name || '?').charAt(0).toUpperCase()}
              </div>
            )}
            <button
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white"
            >
              {uploading ? <Loader2 size={20} className="animate-spin" /> : <Camera size={20} />}
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              onChange={handleAvatarUpload}
              className="hidden"
            />
          </div>
          <div>
            <p className="text-sm font-medium text-primary">Upload a profile photo</p>
            <p className="text-xs text-gray-500 mt-1">JPG or PNG, max 2MB</p>
            <button
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="mt-2 text-sm font-medium text-accent-dark hover:underline"
            >
              {uploading ? 'Uploading...' : 'Change Photo'}
            </button>
          </div>
        </div>
      </div>

      {/* Profile Info */}
      <div className="bg-white rounded-xl border border-warm-300 p-6">
        <h2 className="text-lg font-semibold text-primary mb-4">Profile Information</h2>

        {error && (
          <div className="p-3 rounded-lg mb-4 text-sm bg-red-50 text-red-600 border border-red-200">{error}</div>
        )}
        {saved && (
          <div className="p-3 rounded-lg mb-4 text-sm bg-green-50 text-green-700 border border-green-200 flex items-center gap-2">
            <Check size={16} /> Profile updated successfully!
          </div>
        )}

        <div className="space-y-4 max-w-md">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="input"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              value={profile?.email || ''}
              disabled
              className="input bg-warm-100 text-gray-500 cursor-not-allowed"
            />
            <p className="text-xs text-gray-400 mt-1">Email cannot be changed</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
            <input
              type="text"
              value={profile?.role || ''}
              disabled
              className="input bg-warm-100 text-gray-500 cursor-not-allowed capitalize"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Member Since</label>
            <input
              type="text"
              value={profile?.created_at ? new Date(profile.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : ''}
              disabled
              className="input bg-warm-100 text-gray-500 cursor-not-allowed"
            />
          </div>
          <button onClick={handleSave} disabled={saving} className="btn-primary">
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  )
}
