import { useMemo, useState } from 'react'
import { CheckCircle2, Shield, Bell, SlidersHorizontal, Lock } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useI18n } from '../i18n/useI18n'

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

const mergeSettings = (defaults, source, overrides, appLanguage) => {
  const safeDefaults = defaults && typeof defaults === 'object' ? defaults : createDefaultSettings('')
  const safeSource = source && typeof source === 'object' ? source : {}
  const safeOverrides = overrides && typeof overrides === 'object' ? overrides : {}

  return {
    ...safeDefaults,
    ...safeSource,
    ...safeOverrides,
    profile: { ...safeDefaults.profile, ...(safeSource.profile || {}), ...(safeOverrides.profile || {}) },
    security: { ...safeDefaults.security, ...(safeSource.security || {}), ...(safeOverrides.security || {}) },
    notifications: { ...safeDefaults.notifications, ...(safeSource.notifications || {}), ...(safeOverrides.notifications || {}) },
    preferences: {
      ...safeDefaults.preferences,
      ...(safeSource.preferences || {}),
      ...(safeOverrides.preferences || {}),
      language: appLanguage || safeDefaults.preferences.language,
    },
    privacy: { ...safeDefaults.privacy, ...(safeSource.privacy || {}), ...(safeOverrides.privacy || {}) },
  }
}


function ToggleSwitch({ checked, onChange, label, description }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-neutral-200 bg-white p-3 transition-all duration-200 hover:shadow-[0_8px_16px_rgba(0,0,0,0.08)] dark:border-zinc-700 dark:bg-zinc-900">
      <div>
        <p className="text-[16px] font-medium text-black dark:text-zinc-100">{label}</p>
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
  const { user, appLanguage, setAppLanguage, settings: savedSettings, saveSettings } = useAuth()
  const { t } = useI18n()
  const defaults = useMemo(() => createDefaultSettings(user?.name || ''), [user?.name])
  const sourceSettings = useMemo(() => {
    return savedSettings && typeof savedSettings === 'object' ? savedSettings : {}
  }, [savedSettings])
  const [overrides, setOverrides] = useState({})
  const settings = useMemo(() => {
    return mergeSettings(defaults, sourceSettings, overrides, appLanguage)
  }, [defaults, sourceSettings, overrides, appLanguage])
  const [saveState, setSaveState] = useState('idle')

  const handleSave = async () => {
    setSaveState('saving')
    const payload = {
      ...settings,
      preferences: {
        ...settings.preferences,
        language: appLanguage,
      },
    }

    const result = await saveSettings(payload)
    if (!result.success) {
      setSaveState('idle')
      return
    }

    setOverrides({})
    setSaveState('success')
    window.setTimeout(() => setSaveState('idle'), 1800)
  }

  const saveButtonLabel = useMemo(() => {
    if (saveState === 'saving') return t('Saving...')
    if (saveState === 'success') return t('Saved')
    return t('Save Changes')
  }, [saveState, t])

  return (
    <div className="animate-fade-in space-y-6">
<header className="rounded-2xl border border-red-600 bg-gradient-to-br from-white to-neutral-100 p-6 text-neutral-900 dark:border-red-600 dark:bg-gradient-to-br dark:from-black dark:to-neutral-900 dark:text-white">
        <h1 className="text-[32px] font-semibold leading-tight text-black dark:text-white">Settings</h1>
        <p className="mt-2 text-[14px] text-neutral-600 dark:text-neutral-300">Manage your account and dashboard preferences in one place.</p>
      </header>

      {saveState === 'success' && (
        <div className="flex items-center gap-2 rounded-xl border border-red-600 bg-red-50 p-4 text-red-700 dark:bg-zinc-900 dark:text-zinc-100">
          <CheckCircle2 size={18} className="text-red-600" />
          <p className="text-[14px]">{t('Your settings were updated successfully.')}</p>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
<section className="rounded-2xl border border-red-600 bg-white p-6 shadow-[0_8px_20px_rgba(0,0,0,0.08)] dark:border-red-600 dark:bg-zinc-900">
          <div className="mb-4 flex items-center gap-2">
            <Shield size={18} className="text-red-600" />
            <h2 className="text-[20px] font-semibold text-black dark:text-zinc-100">{t('Security')}</h2>
          </div>
          <p className="mb-4 text-[14px] text-neutral-600 dark:text-zinc-400">{t('Protect your account with simple safety controls.')}</p>
          <div className="space-y-2">
            <ToggleSwitch
              checked={settings.security.twoFactorAuth}
              onChange={() => {
                setOverrides(prev => ({
                  ...prev,
                  security: { ...(prev.security || {}), twoFactorAuth: !settings.security.twoFactorAuth },
                }))
              }}
              label={t('Two-Factor Authentication')}
              description={t('Add an extra verification step at sign in.')}
            />
            <ToggleSwitch
              checked={settings.security.loginAlerts}
              onChange={() => {
                setOverrides(prev => ({
                  ...prev,
                  security: { ...(prev.security || {}), loginAlerts: !settings.security.loginAlerts },
                }))
              }}
              label={t('Login Alerts')}
              description={t('Notify you about new sign-ins.')}
            />
          </div>
        </section>

<section className="rounded-2xl border border-red-600 bg-white p-6 shadow-[0_8px_20px_rgba(0,0,0,0.08)] dark:border-red-600 dark:bg-zinc-900">
          <div className="mb-4 flex items-center gap-2">
            <Bell size={18} className="text-red-600" />
            <h2 className="text-[20px] font-semibold text-black dark:text-zinc-100">{t('Notifications')}</h2>
          </div>
          <p className="mb-4 text-[14px] text-neutral-600 dark:text-zinc-400">{t('Choose how you want to receive updates.')}</p>
          <div className="space-y-2">
            <ToggleSwitch
              checked={settings.notifications.email}
              onChange={() => {
                setOverrides(prev => ({
                  ...prev,
                  notifications: { ...(prev.notifications || {}), email: !settings.notifications.email },
                }))
              }}
              label={t('Email Notifications')}
              description={t('Receive event and assignment updates by email.')}
            />
            <ToggleSwitch
              checked={settings.notifications.sms}
              onChange={() => {
                setOverrides(prev => ({
                  ...prev,
                  notifications: { ...(prev.notifications || {}), sms: !settings.notifications.sms },
                }))
              }}
              label={t('SMS Notifications')}
              description={t('Get urgent updates by text message.')}
            />
            <ToggleSwitch
              checked={settings.notifications.inApp}
              onChange={() => {
                setOverrides(prev => ({
                  ...prev,
                  notifications: { ...(prev.notifications || {}), inApp: !settings.notifications.inApp },
                }))
              }}
              label={t('In-App Notifications')}
              description={t('Show reminders while using the dashboard.')}
            />
          </div>
        </section>

<section className="rounded-2xl border border-red-600 bg-white p-6 shadow-[0_8px_20px_rgba(0,0,0,0.08)] dark:border-red-600 dark:bg-zinc-900">
          <div className="mb-4 flex items-center gap-2">
            <SlidersHorizontal size={18} className="text-red-600" />
            <h2 className="text-[20px] font-semibold text-black dark:text-zinc-100">{t('Preferences')}</h2>
          </div>
          <p className="mb-4 text-[14px] text-neutral-600 dark:text-zinc-400">{t('Adjust your dashboard view and language options.')}</p>
          <div className="space-y-2">
            <div className="rounded-xl border border-neutral-200 bg-white p-3 dark:border-zinc-700 dark:bg-zinc-900">
              <label className="mb-2 block text-[16px] font-medium text-black dark:text-zinc-100">{t('Language')}</label>
              <p className="mb-3 text-[14px] text-neutral-600 dark:text-zinc-400">{t('Select the language for your interface.')}</p>
              <select
                value={appLanguage}
                onChange={e => {
                  const nextLanguage = e.target.value
                  setAppLanguage(nextLanguage)
                }}
                className="w-full cursor-pointer rounded-xl border border-neutral-300 bg-white px-4 py-2 text-[14px] text-black transition-all duration-200 focus:border-red-600 focus:outline-none dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
              >
                <option>English</option>
                <option>Filipino</option>
                <option>Bisaya</option>
              </select>
            </div>
          </div>
        </section>

<section className="rounded-2xl border border-red-600 bg-white p-6 shadow-[0_8px_20px_rgba(0,0,0,0.08)] xl:col-span-2 dark:border-red-600 dark:bg-zinc-900">
          <div className="mb-4 flex items-center gap-2">
            <Lock size={18} className="text-red-600" />
            <h2 className="text-[20px] font-semibold text-black dark:text-zinc-100">{t('Privacy')}</h2>
          </div>
          <p className="mb-4 text-[14px] text-neutral-600 dark:text-zinc-400">{t('Control visibility of your personal and activity information.')}</p>
          <div className="space-y-2">
            <ToggleSwitch
              checked={settings.privacy.showProfileToVolunteers}
              onChange={() => {
                setOverrides(prev => ({
                  ...prev,
                  privacy: { ...(prev.privacy || {}), showProfileToVolunteers: !settings.privacy.showProfileToVolunteers },
                }))
              }}
              label={t('Show Profile')}
              description={t('Allow other volunteers to view your profile.')}
            />
            <ToggleSwitch
              checked={settings.privacy.shareActivityStatus}
              onChange={() => {
                setOverrides(prev => ({
                  ...prev,
                  privacy: { ...(prev.privacy || {}), shareActivityStatus: !settings.privacy.shareActivityStatus },
                }))
              }}
              label={t('Share Activity')}
              description={t('Display your participation status in reports.')}
            />
          </div>
        </section>
      </div>

      <div className="sticky bottom-2 z-20 flex justify-end">
        <button
          type="button"
          onClick={handleSave}
          className="inline-flex items-center gap-2 rounded-xl border border-red-600 bg-red-600 px-5 py-2.5 text-[14px] font-semibold text-white shadow-[0_10px_20px_rgba(0,0,0,0.25)] transition-all duration-200 hover:scale-[1.02] hover:bg-red-700"
        >
          <CheckCircle2 size={16} />
          {saveButtonLabel}
        </button>
      </div>
    </div>
  )
}

export default Settings
