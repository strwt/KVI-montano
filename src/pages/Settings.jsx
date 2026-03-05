import { useMemo, useState } from 'react'
import { CheckCircle2, Shield, Bell, SlidersHorizontal, Lock } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

const SETTINGS_STORAGE_KEY = 'kusgan_dashboard_settings'

const createDefaultSettings = (name = '') => ({
  profile: {
    displayName: name,
    contactNumber: '',
  },
  security: {
    twoFactorAuth: false,
    loginAlerts: true,
  },
  notifications: {
    email: true,
    sms: false,
    inApp: true,
  },
  preferences: {
    compactLayout: false,
    weeklySummary: true,
    language: 'English',
  },
  privacy: {
    showProfileToVolunteers: true,
    shareActivityStatus: false,
    allowMentions: true,
  },
})

const getStoredSettings = (name = '') => {
  const stored = localStorage.getItem(SETTINGS_STORAGE_KEY)
  if (!stored) return createDefaultSettings(name)

  try {
    const parsed = JSON.parse(stored)
    const defaults = createDefaultSettings(name)
    return {
      ...defaults,
      ...parsed,
      profile: { ...defaults.profile, ...(parsed.profile || {}) },
      security: { ...defaults.security, ...(parsed.security || {}) },
      notifications: { ...defaults.notifications, ...(parsed.notifications || {}) },
      preferences: { ...defaults.preferences, ...(parsed.preferences || {}) },
      privacy: { ...defaults.privacy, ...(parsed.privacy || {}) },
    }
  } catch {
    return createDefaultSettings(name)
  }
}

function ToggleSwitch({ checked, onChange, label, description }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-xl border border-neutral-200 bg-white p-4 transition-all duration-200 hover:shadow-[0_8px_16px_rgba(0,0,0,0.08)] dark:border-zinc-700 dark:bg-zinc-900">
      <div>
        <p className="text-[18px] font-medium text-black dark:text-zinc-100">{label}</p>
        <p className="text-[14px] text-neutral-600 dark:text-zinc-400">{description}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={onChange}
        className={`relative h-7 w-14 cursor-pointer rounded-full border transition-all duration-200 ${
          checked ? 'border-red-600 bg-red-600' : 'border-neutral-300 bg-neutral-200 dark:border-zinc-600 dark:bg-zinc-700'
        }`}
      >
        <span
          className={`absolute top-0.5 h-5.5 w-5.5 rounded-full bg-white transition-all duration-200 ${
            checked ? 'left-8' : 'left-0.5'
          }`}
        />
      </button>
    </div>
  )
}

function Settings() {
  const { user } = useAuth()
  const [settings, setSettings] = useState(() => getStoredSettings(user?.name || ''))
  const [saveState, setSaveState] = useState('idle')

  const handleSave = () => {
    setSaveState('saving')
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings))
    window.setTimeout(() => {
      setSaveState('success')
      window.setTimeout(() => setSaveState('idle'), 1800)
    }, 300)
  }

  const saveButtonLabel = useMemo(() => {
    if (saveState === 'saving') return 'Saving...'
    if (saveState === 'success') return 'Saved'
    return 'Save Changes'
  }, [saveState])

  return (
    <div className="animate-fade-in space-y-6">
      <header className="rounded-2xl border border-neutral-200 bg-gradient-to-br from-white to-neutral-100 p-6 text-neutral-900 dark:border-neutral-800 dark:bg-gradient-to-br dark:from-black dark:to-neutral-900 dark:text-white">
        <h1 className="text-[32px] font-semibold leading-tight text-black dark:text-white">Settings</h1>
        <p className="mt-2 text-[14px] text-neutral-600 dark:text-neutral-300">Manage your account and dashboard preferences in one place.</p>
      </header>

      {saveState === 'success' && (
        <div className="flex items-center gap-2 rounded-xl border border-red-600 bg-red-50 p-4 text-red-700 dark:bg-zinc-900 dark:text-zinc-100">
          <CheckCircle2 size={18} className="text-red-600" />
          <p className="text-[14px]">Your settings were updated successfully.</p>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <section className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-[0_8px_20px_rgba(0,0,0,0.08)] dark:border-zinc-700 dark:bg-zinc-900">
          <div className="mb-4 flex items-center gap-2">
            <Shield size={18} className="text-red-600" />
            <h2 className="text-[24px] font-semibold text-black dark:text-zinc-100">Security</h2>
          </div>
          <p className="mb-4 text-[14px] text-neutral-600 dark:text-zinc-400">Protect your account with simple safety controls.</p>
          <div className="space-y-2">
            <ToggleSwitch
              checked={settings.security.twoFactorAuth}
              onChange={() => setSettings(prev => ({ ...prev, security: { ...prev.security, twoFactorAuth: !prev.security.twoFactorAuth } }))}
              label="Two-Factor Authentication"
              description="Add an extra verification step at sign in."
            />
            <ToggleSwitch
              checked={settings.security.loginAlerts}
              onChange={() => setSettings(prev => ({ ...prev, security: { ...prev.security, loginAlerts: !prev.security.loginAlerts } }))}
              label="Login Alerts"
              description="Notify you about new sign-ins."
            />
          </div>
        </section>

        <section className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-[0_8px_20px_rgba(0,0,0,0.08)] dark:border-zinc-700 dark:bg-zinc-900">
          <div className="mb-4 flex items-center gap-2">
            <Bell size={18} className="text-red-600" />
            <h2 className="text-[24px] font-semibold text-black dark:text-zinc-100">Notifications</h2>
          </div>
          <p className="mb-4 text-[14px] text-neutral-600 dark:text-zinc-400">Choose how you want to receive updates.</p>
          <div className="space-y-2">
            <ToggleSwitch
              checked={settings.notifications.email}
              onChange={() => setSettings(prev => ({ ...prev, notifications: { ...prev.notifications, email: !prev.notifications.email } }))}
              label="Email Notifications"
              description="Receive event and assignment updates by email."
            />
            <ToggleSwitch
              checked={settings.notifications.sms}
              onChange={() => setSettings(prev => ({ ...prev, notifications: { ...prev.notifications, sms: !prev.notifications.sms } }))}
              label="SMS Notifications"
              description="Get urgent updates by text message."
            />
            <ToggleSwitch
              checked={settings.notifications.inApp}
              onChange={() => setSettings(prev => ({ ...prev, notifications: { ...prev.notifications, inApp: !prev.notifications.inApp } }))}
              label="In-App Notifications"
              description="Show reminders while using the dashboard."
            />
          </div>
        </section>

        <section className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-[0_8px_20px_rgba(0,0,0,0.08)] dark:border-zinc-700 dark:bg-zinc-900">
          <div className="mb-4 flex items-center gap-2">
            <SlidersHorizontal size={18} className="text-red-600" />
            <h2 className="text-[24px] font-semibold text-black dark:text-zinc-100">Preferences</h2>
          </div>
          <p className="mb-4 text-[14px] text-neutral-600 dark:text-zinc-400">Adjust your dashboard view and language options.</p>
          <div className="space-y-2">
            <ToggleSwitch
              checked={settings.preferences.compactLayout}
              onChange={() => setSettings(prev => ({ ...prev, preferences: { ...prev.preferences, compactLayout: !prev.preferences.compactLayout } }))}
              label="Compact Layout"
              description="Reduce spacing to show more information."
            />
            <div className="rounded-xl border border-neutral-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-900">
              <label className="mb-2 block text-[18px] font-medium text-black dark:text-zinc-100">Language</label>
              <p className="mb-3 text-[14px] text-neutral-600 dark:text-zinc-400">Select the language for your interface.</p>
              <select
                value={settings.preferences.language}
                onChange={e => setSettings(prev => ({ ...prev, preferences: { ...prev.preferences, language: e.target.value } }))}
                className="w-full cursor-pointer rounded-xl border border-neutral-300 bg-white px-4 py-2 text-[14px] text-black transition-all duration-200 focus:border-red-600 focus:outline-none dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
              >
                <option>English</option>
                <option>Filipino</option>
              </select>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-[0_8px_20px_rgba(0,0,0,0.08)] xl:col-span-2 dark:border-zinc-700 dark:bg-zinc-900">
          <div className="mb-4 flex items-center gap-2">
            <Lock size={18} className="text-red-600" />
            <h2 className="text-[24px] font-semibold text-black dark:text-zinc-100">Privacy</h2>
          </div>
          <p className="mb-4 text-[14px] text-neutral-600 dark:text-zinc-400">Control visibility of your personal and activity information.</p>
          <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
            <ToggleSwitch
              checked={settings.privacy.showProfileToVolunteers}
              onChange={() => setSettings(prev => ({ ...prev, privacy: { ...prev.privacy, showProfileToVolunteers: !prev.privacy.showProfileToVolunteers } }))}
              label="Show Profile"
              description="Allow other volunteers to view your profile."
            />
            <ToggleSwitch
              checked={settings.privacy.shareActivityStatus}
              onChange={() => setSettings(prev => ({ ...prev, privacy: { ...prev.privacy, shareActivityStatus: !prev.privacy.shareActivityStatus } }))}
              label="Share Activity"
              description="Display your participation status in reports."
            />
            <ToggleSwitch
              checked={settings.privacy.allowMentions}
              onChange={() => setSettings(prev => ({ ...prev, privacy: { ...prev.privacy, allowMentions: !prev.privacy.allowMentions } }))}
              label="Allow Mentions"
              description="Let teammates tag you in notes and updates."
            />
          </div>
        </section>
      </div>

      <div className="sticky bottom-4 z-20 flex justify-end">
        <button
          type="button"
          onClick={handleSave}
          className="inline-flex items-center gap-2 rounded-xl border border-red-600 bg-red-600 px-6 py-3 text-[14px] font-semibold text-white shadow-[0_10px_20px_rgba(0,0,0,0.25)] transition-all duration-200 hover:scale-[1.02] hover:bg-red-700"
        >
          <CheckCircle2 size={16} />
          {saveButtonLabel}
        </button>
      </div>
    </div>
  )
}

export default Settings
