import { useEffect, useState } from 'react'
import { Save, Image as ImageIcon, Phone, MapPin, Droplets, User, Mail, Shield, Trash2 } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'

function EditAccount() {
  const navigate = useNavigate()
  const { user, updateCurrentUser, uploadProfileImage } = useAuth()

  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [form, setForm] = useState({
    name: '',
    email: '',
    address: '',
    contactNumber: '',
    bloodType: '',
    insuranceStatus: 'N/A',
    insuranceYear: '',
    profileImage: '',
  })
  const [selectedFile, setSelectedFile] = useState(null)
  const [previewUrl, setPreviewUrl] = useState('')
  const [selectedFileName, setSelectedFileName] = useState('')

  useEffect(() => {
    if (!user) {
      navigate('/login', { replace: true })
      return
    }
    setForm({
      name: user.name || '',
      email: user.email || '',
      address: user.address || '',
      contactNumber: user.contactNumber || '',
      bloodType: user.bloodType || '',
      insuranceStatus: user.insuranceStatus || 'N/A',
      insuranceYear: user.insuranceYear || '',
      profileImage: user.profileImage || '',
    })
    setSelectedFile(null)
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setPreviewUrl('')
    setSuccess('')
    setError('')
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, navigate])

  const handleFileChange = (e) => {
    setError('')
    setSuccess('')
    const file = e.target.files && e.target.files[0]
    if (!file) {
      setSelectedFile(null)
      if (previewUrl) URL.revokeObjectURL(previewUrl)
      setPreviewUrl('')
      setSelectedFileName('')
      return
    }
    if (!file.type.startsWith('image/')) {
      setError('Please select a valid image file (JPEG, PNG, etc.).')
      return
    }
    const maxBytes = 2 * 1024 * 1024 // 2MB
    if (file.size > maxBytes) {
      setError('Image must be 2MB or smaller.')
      return
    }

    setSelectedFile(file)
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setPreviewUrl(URL.createObjectURL(file))
    setSelectedFileName(file.name)
  }

  const handleSave = async () => {
    if (isSaving) return
    setError('')
    setSuccess('')
    setIsSaving(true)

    // Basic validations
    const phone = form.contactNumber.trim()
    if (phone && !/^\+?[0-9\-\s]{7,15}$/.test(phone)) {
      setError('Please enter a valid contact number (7-15 digits, optional +, - or spaces).')
      setIsSaving(false)
      return
    }

    const blood = form.bloodType.trim().toUpperCase()
    const validBlood = ['', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']
    if (!validBlood.includes(blood)) {
      setError('Blood type must be one of: A+, A-, B+, B-, AB+, AB-, O+, O-.')
      setIsSaving(false)
      return
    }

    const insuranceStatus = form.insuranceStatus === 'Insured' ? 'Insured' : 'N/A'
    const insuranceYearRaw = String(form.insuranceYear || '').trim()
    const insuranceYear = insuranceStatus === 'Insured' ? insuranceYearRaw : ''
    if (insuranceStatus === 'Insured') {
      if (!insuranceYear) {
        setError('Insurance year is required when insured.')
        setIsSaving(false)
        return
      }
      if (!/^\d{4}$/.test(insuranceYear)) {
        setError('Insurance year must be a 4-digit year.')
        setIsSaving(false)
        return
      }
      const yearNumber = Number(insuranceYear)
      const currentYear = new Date().getFullYear()
      if (yearNumber < 1990 || yearNumber > currentYear + 1) {
        setError(`Insurance year must be between 1990 and ${currentYear + 1}.`)
        setIsSaving(false)
        return
      }
    }

    const payload = {
      name: form.name,
      email: form.email,
      address: form.address,
      contactNumber: phone,
      bloodType: blood,
      insuranceStatus,
      insuranceYear,
    }

    if (selectedFile) {
      const uploaded = await uploadProfileImage(selectedFile)
      if (!uploaded?.success) {
        setError(uploaded?.message || 'Unable to upload image.')
        setIsSaving(false)
        return
      }
      payload.profileImage = uploaded.path
    } else if (!form.profileImage) {
      // User removed their photo.
      payload.profileImage = ''
    }

    try {
      const res = await updateCurrentUser(payload)
      if (!res.success) {
        setError(res.message)
        return
      }
      setSuccess(res.message || 'Account information updated successfully.')
      setTimeout(() => navigate('/profile'), 350)
    } finally {
      setIsSaving(false)
    }
  }

  const handleRemovePhoto = () => {
    setSelectedFile(null)
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setPreviewUrl('')
    setForm(prev => ({ ...prev, profileImage: '' }))
    setSelectedFileName('')
    setError('')
    setSuccess('')
  }

  return (
    <div className="animate-fade-in py-4">
      <div className="w-full max-w-6xl mx-auto">
        <div
          className="relative overflow-hidden rounded-3xl border border-white/15 p-1"
          style={{
            background: 'linear-gradient(145deg, rgba(14,116,144,0.88), rgba(30,64,175,0.84) 52%, rgba(59,130,246,0.78))',
            backdropFilter: 'blur(18px)',
          }}
        >
          <div className="absolute -right-20 -top-20 h-56 w-56 rounded-full bg-cyan-300/15 blur-3xl" />
          <div className="absolute -left-16 -bottom-20 h-64 w-64 rounded-full bg-blue-200/10 blur-3xl" />
          <div
            className="relative rounded-[22px] border border-white/10 p-6 backdrop-blur-md md:p-8"
            style={{
              background: 'linear-gradient(145deg, rgba(14,116,144,0.34), rgba(30,64,175,0.28) 52%, rgba(96,165,250,0.24))',
            }}
          >
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
              <div>
                <p className="mb-1 text-xs font-semibold uppercase tracking-[0.2em] text-cyan-100">Profile Management</p>
                <h3 className="font-heading text-2xl font-bold text-white md:text-3xl">Edit Account Information</h3>
                <p className="mt-1 text-sm text-white/75">Update your personal information and profile display settings.</p>
              </div>
              <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-semibold text-white">
                <Shield size={14} className="text-yellow-300" />
                Secure Profile
              </div>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">{error}</div>
            )}
            {success && (
              <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-700 text-sm">{success}</div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div
                className="relative z-10 rounded-2xl border border-white/10 p-4 md:col-span-3 md:p-5"
                style={{
                  background: 'linear-gradient(145deg, rgba(14,116,144,0.24), rgba(30,64,175,0.2) 52%, rgba(96,165,250,0.16))',
                }}
              >
                <div className="mb-3 flex items-center gap-2 text-sm font-medium text-white">
                  <ImageIcon size={16} className="text-yellow-300" />
                  Avatar / Profile Image
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-4 lg:gap-5">
                  <div className="rounded-2xl border border-white/10 bg-white/10 p-4 shadow-[0_14px_32px_rgba(15,23,42,0.14)] backdrop-blur-md">
                    <div className="mx-auto flex h-44 w-44 items-center justify-center overflow-hidden rounded-2xl border-2 border-white/30 bg-white">
                      <img
                        src={previewUrl || form.profileImage || '/kvi.png'}
                        alt="Avatar Preview"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <p className="mt-3 text-center text-xs font-medium text-white/80">Live Preview</p>
                    <p className="mt-1 text-center text-[11px] text-white/60">JPG, PNG up to 2MB</p>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur-md">
                    <div className="grid grid-cols-1 gap-4">
                      <input
                        id="profile-image-upload"
                        type="file"
                        accept="image/*"
                        onChange={handleFileChange}
                        className="sr-only"
                      />
                      <div className="flex flex-wrap items-center gap-3">
                        <label
                          htmlFor="profile-image-upload"
                          className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-yellow-400 px-4 py-2.5 text-sm font-semibold text-slate-900 transition-all duration-200 hover:-translate-y-0.5 hover:bg-yellow-300"
                          style={{ boxShadow: '0 8px 24px rgba(250,204,21,0.35)' }}
                        >
                          Choose file
                        </label>
                        <div className="flex items-center gap-2 text-xs text-white/70">
                          <span className="max-w-[220px] truncate">
                            {selectedFileName || 'No file chosen'}
                          </span>
                          <button
                            type="button"
                            onClick={handleRemovePhoto}
                            disabled={!selectedFileName && !(previewUrl || form.profileImage)}
                            className="inline-flex items-center justify-center rounded-full border border-white/20 bg-white p-1 text-slate-500 transition-colors hover:border-red-200 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-40"
                            aria-label="Remove selected image"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className="rounded-xl border border-white/10 bg-white/10 p-3">
                          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-white/65">Recommended</p>
                          <p className="mt-1 text-sm text-white/80">Square image, centered face, good lighting.</p>
                        </div>
                        <div className="rounded-xl border border-white/10 bg-white/10 p-3">
                          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-white/65">Allowed</p>
                          <p className="mt-1 text-sm text-white/80">JPG or PNG, up to 2MB total size.</p>
                        </div>
                      </div>
                      <div className="rounded-xl border border-emerald-300/20 bg-emerald-300/10 p-3">
                        <p className="text-sm font-medium text-emerald-100">Avatar updates are reflected across the system.</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur-md">
                <label htmlFor="edit-account-name" className="mb-1.5 flex items-center gap-2 text-sm font-medium text-white">
                  <User size={15} className="text-yellow-300" />
                  Full Name
                </label>
                <input
                  id="edit-account-name"
                  name="name"
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  autoComplete="name"
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-zinc-800 placeholder:text-zinc-400 focus:border-yellow-300 focus:outline-none focus:ring-2 focus:ring-yellow-400/40"
                />
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur-md">
                <label htmlFor="edit-account-email" className="mb-1.5 flex items-center gap-2 text-sm font-medium text-white">
                  <Mail size={15} className="text-yellow-300" />
                  Email
                </label>
                <input
                  id="edit-account-email"
                  name="email"
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  autoComplete="email"
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-zinc-800 placeholder:text-zinc-400 focus:border-yellow-300 focus:outline-none focus:ring-2 focus:ring-yellow-400/40"
                />
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur-md md:col-span-3">
                <label htmlFor="edit-account-address" className="mb-1.5 flex items-center gap-2 text-sm font-medium text-white">
                  <MapPin size={16} className="text-yellow-300" />
                  Address
                </label>
                <input
                  id="edit-account-address"
                  name="address"
                  type="text"
                  placeholder="Street, City, Province"
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  autoComplete="street-address"
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-zinc-800 placeholder:text-zinc-400 focus:border-yellow-300 focus:outline-none focus:ring-2 focus:ring-yellow-400/40"
                />
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur-md">
                <label htmlFor="edit-account-contact-number" className="mb-1.5 flex items-center gap-2 text-sm font-medium text-white">
                  <Phone size={16} className="text-yellow-300" />
                  Contact Number
                </label>
                <input
                  id="edit-account-contact-number"
                  name="contactNumber"
                  type="tel"
                  placeholder="e.g. +63 912 345 6789"
                  value={form.contactNumber}
                  onChange={(e) => setForm({ ...form, contactNumber: e.target.value })}
                  autoComplete="tel"
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-zinc-800 placeholder:text-zinc-400 focus:border-yellow-300 focus:outline-none focus:ring-2 focus:ring-yellow-400/40"
                />
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur-md">
                <label htmlFor="edit-account-blood-type" className="mb-1.5 flex items-center gap-2 text-sm font-medium text-white">
                  <Droplets size={16} className="text-yellow-300" />
                  Blood Type
                </label>
                <select
                  id="edit-account-blood-type"
                  name="bloodType"
                  value={form.bloodType}
                  onChange={(e) => setForm({ ...form, bloodType: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-zinc-800 focus:border-yellow-300 focus:outline-none focus:ring-2 focus:ring-yellow-400/40"
                >
                  <option value="">Select</option>
                  <option value="A+">A+</option>
                  <option value="A-">A-</option>
                  <option value="B+">B+</option>
                  <option value="B-">B-</option>
                  <option value="AB+">AB+</option>
                  <option value="AB-">AB-</option>
                  <option value="O+">O+</option>
                  <option value="O-">O-</option>
                </select>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur-md">
                <label htmlFor="edit-account-insurance-status" className="mb-1.5 flex items-center gap-2 text-sm font-medium text-white">
                  <Shield size={16} className="text-yellow-300" />
                  Insurance Status
                </label>
                <select
                  id="edit-account-insurance-status"
                  name="insuranceStatus"
                  value={form.insuranceStatus}
                  onChange={(e) => {
                    const next = e.target.value
                    setForm(prev => ({
                      ...prev,
                      insuranceStatus: next,
                      insuranceYear: next === 'Insured' ? prev.insuranceYear : '',
                    }))
                  }}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-zinc-800 focus:border-yellow-300 focus:outline-none focus:ring-2 focus:ring-yellow-400/40"
                >
                  <option value="N/A">Not Insured</option>
                  <option value="Insured">Insured</option>
                </select>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur-md">
                <label htmlFor="edit-account-insurance-year" className="mb-1.5 flex items-center gap-2 text-sm font-medium text-white">
                  <Shield size={16} className="text-yellow-300" />
                  Insurance Year
                </label>
                <input
                  id="edit-account-insurance-year"
                  name="insuranceYear"
                  type="text"
                  inputMode="numeric"
                  placeholder={form.insuranceStatus === 'Insured' ? 'e.g. 2026' : 'Not applicable'}
                  value={form.insuranceYear}
                  onChange={(e) => setForm({ ...form, insuranceYear: e.target.value })}
                  disabled={form.insuranceStatus !== 'Insured'}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-zinc-800 placeholder:text-zinc-400 focus:border-yellow-300 focus:outline-none focus:ring-2 focus:ring-yellow-400/40 disabled:opacity-60"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => navigate('/profile')}
                className="px-4 py-2.5 bg-[black] text-[white] rounded-lg hover:bg-zinc-300  transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="inline-flex items-center gap-1.5 rounded-xl bg-yellow-400 px-5 py-3 font-medium text-slate-900 transition-all duration-200 hover:-translate-y-0.5 hover:bg-yellow-300 disabled:cursor-not-allowed disabled:opacity-60"
                style={{ boxShadow: '0 8px 24px rgba(250,204,21,0.35)' }}
              >
                <Save size={16} />
                {isSaving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default EditAccount
