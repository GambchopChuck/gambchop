'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useAuth } from '@/lib/auth-context'
import { supabase } from '@/lib/supabase'

// ─── Design tokens ─────────────────────────────────────────────────────────────

const BG     = '#0a0a0f'
const CARD   = '#0f0f14'
const BORDER = '#1a1a24'
const TEXT   = '#f4f4f5'
const MUTED  = '#52525b'
const SUB    = '#a1a1aa'
const ACCENT = '#39ff9a'
const RED    = '#ef4444'
const PURPLE = '#8b5cf6'
const OSWALD = 'var(--font-oswald), "Oswald", sans-serif'
const MONO   = 'var(--font-oswald), "Oswald", sans-serif'

type SocialKey = 'twitter' | 'instagram' | 'tiktok' | 'youtube'

const SOCIAL_FIELDS: { key: SocialKey; label: string; prefix: string }[] = [
  { key: 'twitter',   label: 'X / Twitter',  prefix: 'x.com/'          },
  { key: 'instagram', label: 'Instagram',     prefix: 'instagram.com/'  },
  { key: 'tiktok',    label: 'TikTok',        prefix: 'tiktok.com/@'    },
  { key: 'youtube',   label: 'YouTube',       prefix: 'youtube.com/@'   },
]

interface ProfileForm {
  display_name:          string
  username:              string
  bio:                   string
  twitter_handle:        string
  instagram_handle:      string
  tiktok_handle:         string
  youtube_handle:        string
  show_favorites_public: boolean
  display_social_1:      string
  display_social_2:      string
}

const RESERVED = new Set([
  'settings', 'profile', 'api', 'admin', 'login', 'register', 'signup',
  'pricing', 'about', 'contact', 'terms', 'privacy', 'news', 'teams',
  'leagues', 'community', 'compare', 'schedule', 'merchandise', 'leaderboard',
])

function isValidUsername(u: string): boolean {
  if (!u) return true
  if (u.length < 3 || u.length > 20) return false
  if (!/^[a-z0-9_]+$/.test(u)) return false
  if (RESERVED.has(u)) return false
  return true
}

// ─── Input helpers ─────────────────────────────────────────────────────────────

const inputStyle: React.CSSProperties = {
  width: '100%', background: '#0c0c10', border: `1px solid ${BORDER}`,
  borderRadius: 8, padding: '11px 14px', color: TEXT,
  fontSize: 12, letterSpacing: '0.03em', outline: 'none',
  fontFamily: MONO, boxSizing: 'border-box', transition: 'border-color 0.15s',
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <label style={{ fontSize: 9, color: SUB, letterSpacing: '0.2em', textTransform: 'uppercase', fontWeight: 700, fontFamily: OSWALD }}>
        {label}
      </label>
      {children}
      {hint && <div style={{ fontSize: 9, color: MUTED, letterSpacing: '0.04em' }}>{hint}</div>}
    </div>
  )
}

// ─── Paywall ───────────────────────────────────────────────────────────────────

function SettingsPaywall() {
  const { openModal } = useAuth()
  return (
    <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 40 }}>
      <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 16, padding: '40px 48px', maxWidth: 440, textAlign: 'center' }}>
        <div style={{ fontSize: 40, marginBottom: 16 }}>⚡</div>
        <div style={{ fontSize: 9, color: ACCENT, letterSpacing: '0.25em', textTransform: 'uppercase', marginBottom: 10, fontWeight: 700, fontFamily: OSWALD }}>Pro Feature</div>
        <h2 style={{ fontSize: 24, fontWeight: 700, color: TEXT, letterSpacing: '0.06em', textTransform: 'uppercase', margin: '0 0 12px', fontFamily: OSWALD }}>Profile Settings</h2>
        <p style={{ fontSize: 12, color: SUB, lineHeight: 1.7, margin: '0 0 28px' }}>
          Customize your public profile, add social handles, and control your favorites visibility. Available on Pro.
        </p>
        <button
          onClick={() => openModal('pro')}
          style={{
            background: `linear-gradient(135deg, ${ACCENT}, #22c55e)`, border: 'none',
            borderRadius: 8, padding: '12px 28px', color: '#000', fontSize: 12, fontWeight: 900,
            letterSpacing: '0.12em', textTransform: 'uppercase', cursor: 'pointer',
            fontFamily: OSWALD, boxShadow: `0 0 20px ${ACCENT}44`,
          }}
        >
          Upgrade to Pro →
        </button>
      </div>
    </div>
  )
}

// ─── Main settings page ────────────────────────────────────────────────────────

export default function ProfileSettingsPage() {
  const { user, memberTier, username: contextUsername } = useAuth()

  const [form, setForm] = useState<ProfileForm>({
    display_name:          '',
    username:              '',
    bio:                   '',
    twitter_handle:        '',
    instagram_handle:      '',
    tiktok_handle:         '',
    youtube_handle:        '',
    show_favorites_public: true,
    display_social_1:      '',
    display_social_2:      '',
  })

  const [initialUsername, setInitialUsername] = useState('')
  const [usernameError,   setUsernameError]   = useState('')
  const [usernameOk,      setUsernameOk]      = useState(false)
  const [saving,          setSaving]          = useState(false)
  const [saveError,       setSaveError]       = useState('')
  const [saveSuccess,     setSaveSuccess]     = useState(false)
  const [loading,         setLoading]         = useState(true)

  // Load existing profile data
  useEffect(() => {
    if (!user) return
    supabase
      .from('profiles')
      .select('display_name, username, bio, twitter_handle, instagram_handle, tiktok_handle, youtube_handle, show_favorites_public, display_social_1, display_social_2')
      .eq('id', user.id)
      .single()
      .then(({ data }) => {
        if (data) {
          const f: ProfileForm = {
            display_name:          data.display_name          ?? '',
            username:              data.username              ?? '',
            bio:                   data.bio                   ?? '',
            twitter_handle:        data.twitter_handle        ?? '',
            instagram_handle:      data.instagram_handle      ?? '',
            tiktok_handle:         data.tiktok_handle         ?? '',
            youtube_handle:        data.youtube_handle        ?? '',
            show_favorites_public: data.show_favorites_public ?? true,
            display_social_1:      data.display_social_1      ?? '',
            display_social_2:      data.display_social_2      ?? '',
          }
          setForm(f)
          setInitialUsername(data.username ?? '')
        }
        setLoading(false)
      })
  }, [user])

  // Debounced username uniqueness check
  const checkUsername = useCallback((value: string) => {
    if (!value || value === initialUsername) { setUsernameError(''); setUsernameOk(false); return }
    if (!isValidUsername(value)) { setUsernameError('3–20 chars, lowercase letters/numbers/underscores only, no reserved words'); setUsernameOk(false); return }

    const timer = setTimeout(async () => {
      const { data } = await supabase
        .from('profiles')
        .select('id')
        .eq('username', value)
        .maybeSingle()
      if (data) { setUsernameError('Username already taken'); setUsernameOk(false) }
      else       { setUsernameError(''); setUsernameOk(true) }
    }, 500)

    return () => clearTimeout(timer)
  }, [initialUsername])

  useEffect(() => {
    const cleanup = checkUsername(form.username)
    return cleanup
  }, [form.username, checkUsername])

  function set<K extends keyof ProfileForm>(key: K, value: ProfileForm[K]) {
    setForm(prev => ({ ...prev, [key]: value }))
    setSaveSuccess(false)
  }

  // Toggle display_social selection (max 2)
  function toggleDisplaySocial(key: SocialKey) {
    const { display_social_1: s1, display_social_2: s2 } = form
    if (s1 === key) { set('display_social_1', s2); set('display_social_2', ''); return }
    if (s2 === key) { set('display_social_2', ''); return }
    if (!s1)        { set('display_social_1', key); return }
    if (!s2)        { set('display_social_2', key); return }
    // Both slots full — replace slot 2
    set('display_social_2', key)
  }

  async function handleSave() {
    if (!user) return
    if (usernameError) { setSaveError('Fix the username error first'); return }
    if (form.username && !isValidUsername(form.username)) { setSaveError('Invalid username'); return }

    setSaving(true)
    setSaveError('')
    setSaveSuccess(false)

    const { error } = await supabase
      .from('profiles')
      .upsert({
        id:                    user.id,
        display_name:          form.display_name          || null,
        username:              form.username              || null,
        bio:                   form.bio                   || null,
        twitter_handle:        form.twitter_handle        || null,
        instagram_handle:      form.instagram_handle      || null,
        tiktok_handle:         form.tiktok_handle         || null,
        youtube_handle:        form.youtube_handle        || null,
        show_favorites_public: form.show_favorites_public,
        display_social_1:      form.display_social_1      || null,
        display_social_2:      form.display_social_2      || null,
      }, { onConflict: 'id' })

    setSaving(false)
    if (error) setSaveError('Save failed: ' + error.message)
    else       setSaveSuccess(true)
  }

  // ── Gates ──────────────────────────────────────────────────────────────────

  if (memberTier !== 'pro') return (
    <div style={{ background: BG, minHeight: '100vh', fontFamily: MONO }}>
      <SettingsPaywall />
    </div>
  )

  if (!user || loading) return (
    <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: MUTED, fontSize: 11, letterSpacing: '0.1em', fontFamily: MONO }}>
      Loading…
    </div>
  )

  // ── Which platforms have handles + are eligible to display ─────────────────
  const filledPlatforms = SOCIAL_FIELDS.filter(p => !!form[`${p.key}_handle` as keyof ProfileForm])
  const selected = [form.display_social_1, form.display_social_2].filter(Boolean)

  return (
    <div style={{ background: BG, minHeight: '100vh', paddingBottom: 80, fontFamily: MONO }}>

      {/* Header */}
      <div style={{ borderBottom: `1px solid ${BORDER}`, padding: '28px 24px' }}>
        <div style={{ maxWidth: 680, margin: '0 auto' }}>
          <div style={{ fontSize: 9, color: ACCENT, letterSpacing: '0.25em', textTransform: 'uppercase', fontWeight: 700, fontFamily: OSWALD, marginBottom: 6 }}>
            ⚡ Pro · Profile Settings
          </div>
          <h1 style={{ fontSize: 28, fontWeight: 700, color: TEXT, letterSpacing: '0.08em', textTransform: 'uppercase', margin: '0 0 4px', fontFamily: OSWALD }}>
            Edit Profile
          </h1>
          <div style={{ fontSize: 10, color: MUTED }}>
            {contextUsername ? (
              <>Public profile at{' '}
                <Link href={`/profile/${contextUsername}`} style={{ color: ACCENT, textDecoration: 'none' }}>
                  /profile/{contextUsername}
                </Link>
              </>
            ) : 'Set a username to get a public profile URL'}
          </div>
        </div>
      </div>

      {/* Form */}
      <div style={{ maxWidth: 680, margin: '0 auto', padding: '32px 24px', display: 'flex', flexDirection: 'column', gap: 28 }}>

        {/* Identity */}
        <section style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, padding: '24px 24px', display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div style={{ fontSize: 10, color: ACCENT, letterSpacing: '0.2em', textTransform: 'uppercase', fontWeight: 700, fontFamily: OSWALD }}>Identity</div>

          <Field label="Display Name" hint="Shown on your public profile. Max 40 characters.">
            <input
              style={inputStyle}
              placeholder="e.g. Sharp Bettor"
              value={form.display_name}
              onChange={e => set('display_name', e.target.value.slice(0, 40))}
              maxLength={40}
            />
          </Field>

          <Field label="Username" hint="Lowercase letters, numbers, underscores. 3–20 chars. Cannot use reserved words.">
            <div style={{ position: 'relative' }}>
              <input
                style={{
                  ...inputStyle,
                  borderColor: usernameError ? RED : usernameOk ? ACCENT : BORDER,
                  paddingRight: 36,
                }}
                placeholder="e.g. sharpbettor99"
                value={form.username}
                onChange={e => set('username', e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 20))}
                maxLength={20}
              />
              {form.username && (
                <span style={{
                  position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                  fontSize: 12, color: usernameError ? RED : usernameOk ? ACCENT : MUTED,
                }}>
                  {usernameError ? '✗' : usernameOk ? '✓' : '…'}
                </span>
              )}
            </div>
            {usernameError && <div style={{ fontSize: 9, color: RED }}>{usernameError}</div>}
          </Field>

          <Field label="Bio" hint={`${form.bio.length}/160 characters`}>
            <textarea
              style={{ ...inputStyle, minHeight: 80, resize: 'vertical' } as React.CSSProperties}
              placeholder="A short bio shown on your public profile…"
              value={form.bio}
              onChange={e => set('bio', e.target.value.slice(0, 160))}
              maxLength={160}
            />
          </Field>
        </section>

        {/* Social handles */}
        <section style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, padding: '24px 24px', display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div style={{ fontSize: 10, color: ACCENT, letterSpacing: '0.2em', textTransform: 'uppercase', fontWeight: 700, fontFamily: OSWALD }}>Social Handles</div>
          <div style={{ fontSize: 9, color: MUTED }}>Enter handles without the @ symbol.</div>

          {SOCIAL_FIELDS.map(({ key, label, prefix }) => (
            <Field key={key} label={label} hint={form[`${key}_handle` as keyof ProfileForm] ? `${prefix}${form[`${key}_handle` as keyof ProfileForm]}` : undefined}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 10, color: MUTED, whiteSpace: 'nowrap', letterSpacing: '0.04em' }}>@</span>
                <input
                  style={{ ...inputStyle, flex: 1 }}
                  placeholder={`Your ${label} handle`}
                  value={form[`${key}_handle` as keyof ProfileForm] as string}
                  onChange={e => set(`${key}_handle` as keyof ProfileForm, e.target.value.replace(/^@/, '') as ProfileForm[keyof ProfileForm])}
                />
              </div>
            </Field>
          ))}

          {/* Choose 2 to display */}
          {filledPlatforms.length > 0 && (
            <div style={{ borderTop: `1px solid ${BORDER}`, paddingTop: 20 }}>
              <div style={{ fontSize: 9, color: SUB, letterSpacing: '0.15em', textTransform: 'uppercase', fontWeight: 700, fontFamily: OSWALD, marginBottom: 12 }}>
                Choose up to 2 to display on comments
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {filledPlatforms.map(({ key, label }) => {
                  const isSelected = selected.includes(key)
                  const slotLabel  = form.display_social_1 === key ? '1st' : form.display_social_2 === key ? '2nd' : null
                  return (
                    <button
                      key={key}
                      onClick={() => toggleDisplaySocial(key)}
                      style={{
                        background:    isSelected ? `${ACCENT}18` : 'transparent',
                        border:        `1px solid ${isSelected ? ACCENT : BORDER}`,
                        borderRadius:  6,
                        color:         isSelected ? ACCENT : MUTED,
                        fontSize:      11, fontWeight: isSelected ? 700 : 400,
                        letterSpacing: '0.06em', padding: '7px 14px',
                        cursor:        'pointer', fontFamily: MONO, transition: 'all 0.15s',
                        display:       'flex', alignItems: 'center', gap: 6,
                      }}
                    >
                      {label}
                      {slotLabel && (
                        <span style={{ fontSize: 8, color: ACCENT, background: `${ACCENT}22`, borderRadius: 3, padding: '1px 5px', fontWeight: 800, letterSpacing: '0.1em' }}>
                          {slotLabel}
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>
              {selected.length === 2 && (
                <div style={{ fontSize: 9, color: MUTED, marginTop: 8 }}>
                  2 selected. Click a selected handle to remove it.
                </div>
              )}
            </div>
          )}
        </section>

        {/* Privacy */}
        <section style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, padding: '24px 24px' }}>
          <div style={{ fontSize: 10, color: ACCENT, letterSpacing: '0.2em', textTransform: 'uppercase', fontWeight: 700, fontFamily: OSWALD, marginBottom: 16 }}>Privacy</div>

          <button
            onClick={() => set('show_favorites_public', !form.show_favorites_public)}
            style={{
              display: 'flex', alignItems: 'center', gap: 14,
              background: 'none', border: 'none', cursor: 'pointer',
              padding: 0, fontFamily: MONO, width: '100%', textAlign: 'left',
            }}
          >
            {/* Toggle pill */}
            <div className="toggle-track" style={{
              width: 44, height: 24, borderRadius: 12, flexShrink: 0, position: 'relative',
              background: form.show_favorites_public ? ACCENT : '#2a2a34',
              transition: 'background 0.2s',
            }}>
              <div style={{
                position: 'absolute', top: 3, borderRadius: '50%',
                width: 18, height: 18, background: '#fff',
                left: form.show_favorites_public ? 23 : 3,
                transition: 'left 0.2s',
                boxShadow: '0 1px 3px rgba(0,0,0,0.4)',
              }} />
            </div>
            <div>
              <div style={{ fontSize: 12, color: TEXT, fontWeight: 600, letterSpacing: '0.02em' }}>
                Show my favorites publicly
              </div>
              <div style={{ fontSize: 9, color: MUTED, marginTop: 3 }}>
                {form.show_favorites_public
                  ? 'Visitors can see your favorites list on your public profile.'
                  : 'Your favorites are hidden from your public profile.'}
              </div>
            </div>
          </button>
        </section>

        {/* Save */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
          <div>
            {saveError   && <div style={{ fontSize: 11, color: RED }}>{saveError}</div>}
            {saveSuccess && <div style={{ fontSize: 11, color: ACCENT }}>✓ Profile saved</div>}
          </div>
          <button
            onClick={handleSave}
            disabled={saving || !!usernameError}
            style={{
              background:    saving || usernameError ? '#1a1a24' : `linear-gradient(135deg, ${ACCENT}, #22c55e)`,
              border:        'none', borderRadius: 8,
              color:         saving || usernameError ? MUTED : '#000',
              fontSize:      12, fontWeight: 900, letterSpacing: '0.1em',
              textTransform: 'uppercase', cursor: saving || usernameError ? 'default' : 'pointer',
              padding:       '13px 28px', fontFamily: OSWALD,
              boxShadow:     saving || usernameError ? 'none' : `0 0 16px ${ACCENT}44`,
              transition:    'all 0.15s',
            }}
          >
            {saving ? 'Saving…' : 'Save Profile'}
          </button>
        </div>

      </div>
    </div>
  )
}
