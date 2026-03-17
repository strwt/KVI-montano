import { useEffect, useState } from 'react'
import { Save, Image as ImageIcon, Phone, MapPin, Droplets, User, Mail, Shield } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'

function EditAccount() {
  const navigate = useNavigate()
  const { user, updateCurrentUser } = useAuth()

  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [form, setForm] = useState({ name: '', email: '', address: '', contactNumber: '', bloodType: '', profileImage: '' })
  const [uploadedImageData, setUploadedImageData] = useState('')

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
      profileImage: user.profileImage || '',
    })
    setUploadedImageData('')
    setSuccess('')
    setError('')
  }, [user, navigate])

  const handleFileChange = (e) => {
    setError('')
    setSuccess('')
    const file = e.target.files && e.target.files[0]
    if (!file) {
      setUploadedImageData('')
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

    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setUploadedImageData(reader.result)
      }
    }
    reader.onerror = () => {
      setError('Unable to read image file. Please try another image.')
    }
    reader.readAsDataURL(file)
  }

  const handleSave = async () => {
    setError('')
    setSuccess('')

    // Basic validations
    const phone = form.contactNumber.trim()
    if (phone && !/^\+?[0-9\-\s]{7,15}$/.test(phone)) {
      setError('Please enter a valid contact number (7-15 digits, optional +, - or spaces).')
      return
    }

    const blood = form.bloodType.trim().toUpperCase()
    const validBlood = ['', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']
    if (!validBlood.includes(blood)) {
      setError('Blood type must be one of: A+, A-, B+, B-, AB+, AB-, O+, O-.')
      return
    }

    const payload = {
      name: form.name,
      email: form.email,
      address: form.address,
      contactNumber: phone,
      bloodType: blood,
      profileImage: uploadedImageData || form.profileImage,
    }

    const res = await updateCurrentUser(payload)
    if (!res.success) {
      setError(res.message)
      return
    }
    setSuccess('Account information updated successfully.')
    setTimeout(() => navigate('/profile'), 350)
  }

  const handleRemovePhoto = () => {
    setUploadedImageData('')
    setForm(prev => ({ ...prev, profileImage: '' }))
    setError('')
    setSuccess('')
  }

  return (
    <div className="animate-fade-in py-4">
      <div className="w-full max-w-6xl mx-auto">
        <div className="relative overflow-hidden rounded-3xl border border-red-200 bg-gradient-to-br from-white via-zinc-50 to-red-50 p-1 dark:border-red-900/35 dark:from-black dark:via-zinc-950 dark:to-red-950">
          <div className="absolute -right-20 -top-20 w-56 h-56 rounded-full bg-red-600/12 blur-3xl dark:bg-red-600/25" />
          <div className="absolute -left-16 -bottom-20 w-64 h-64 rounded-full bg-red-500/10 blur-3xl dark:bg-red-500/20" />
          <div className="relative rounded-[22px] bg-white/95 backdrop-blur-md p-6 md:p-8">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-red-700 font-semibold mb-1">Profile Management</p>
                <h3 className="text-2xl md:text-3xl font-bold text-zinc-900 font-heading">Edit Account Information</h3>
                <p className="text-sm text-zinc-600 mt-1">Update your personal information and profile display settings.</p>
              </div>
              <div className="inline-flex items-center gap-2 rounded-full border border-zinc-200 px-3 py-1.5 text-xs font-semibold text-zinc-600 bg-white">
                <Shield size={14} className="text-red-600" />
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
              <div className="md:col-span-3 relative z-10 rounded-2xl border border-zinc-200 bg-gradient-to-b from-white to-zinc-50 p-4 md:p-5">
                <label className="block text-sm text-zinc-700 mb-3 font-medium flex items-center gap-2">
                  <ImageIcon size={16} className="text-red-600" />
                  Avatar / Profile Image
                </label>

                <div className="grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-4 lg:gap-5">
                  <div className="rounded-2xl border border-red-100 bg-white p-4 shadow-md shadow-red-900/10">
                    <div className="mx-auto w-28 h-28 rounded-2xl overflow-hidden border-2 border-zinc-200 bg-zinc-100 flex items-center justify-center">
                      <img
                        src={uploadedImageData || form.profileImage || '/image-removebg-preview.png'}
                        alt="Avatar Preview"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <p className="text-center text-xs font-medium text-zinc-600 mt-3">Live Preview</p>
                    <p className="text-center text-[11px] text-zinc-500 mt-1">JPG, PNG up to 2MB</p>
                  </div>

                  <div className="rounded-2xl border border-zinc-200 bg-white p-4">
                    <div className="grid grid-cols-1 gap-3">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleFileChange}
                        className="block w-full text-sm text-zinc-700 file:mr-3 file:py-2.5 file:px-3.5 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-black file:text-white hover:file:bg-zinc-900"
                      />
                      <div>
                        <label className="block text-xs font-semibold uppercase tracking-[0.12em] text-zinc-500 mb-1.5">
                          Or use image URL
                        </label>
                        <input
                          type="url"
                          placeholder="https://example.com/avatar.jpg"
                          value={form.profileImage}
                          onChange={(e) => {
                            setUploadedImageData('')
                            setForm({ ...form, profileImage: e.target.value })
                          }}
                          className="w-full border border-zinc-300 rounded-lg px-3 py-2 text-zinc-800 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-red-500/30 focus:border-red-500"
                        />
                      </div>
                      <div className="flex flex-wrap items-center gap-2 pt-1">
                        <button
                          type="button"
                          onClick={handleRemovePhoto}
                          className="px-3 py-2 text-sm font-medium text-red-700 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition-colors"
                        >
                          Remove Photo
                        </button>
                        <p className="text-xs text-zinc-500">Avatar updates are reflected across the system.</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-zinc-200 bg-white p-4">
                <label className="block text-sm text-zinc-700 mb-1.5 font-medium flex items-center gap-2">
                  <User size={15} className="text-red-600" />
                  Full Name
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full border border-zinc-300 rounded-lg px-3 py-2 text-zinc-800 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-red-500/30 focus:border-red-500"
                />
              </div>

              <div className="rounded-2xl border border-zinc-200 bg-white p-4">
                <label className="block text-sm text-zinc-700 mb-1.5 font-medium flex items-center gap-2">
                  <Mail size={15} className="text-red-600" />
                  Email
                </label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full border border-zinc-300 rounded-lg px-3 py-2 text-zinc-800 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-red-500/30 focus:border-red-500"
                />
              </div>

              <div className="md:col-span-3 rounded-2xl border border-zinc-200 bg-white p-4">
                <label className="block text-sm text-zinc-700 mb-1.5 font-medium flex items-center gap-2">
                  <MapPin size={16} className="text-red-600" />
                  Address
                </label>
                <input
                  type="text"
                  placeholder="Street, City, Province"
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  className="w-full border border-zinc-300 rounded-lg px-3 py-2 text-zinc-800 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-red-500/30 focus:border-red-500"
                />
              </div>

              <div className="rounded-2xl border border-zinc-200 bg-white p-4">
                <label className="block text-sm text-zinc-700 mb-1.5 font-medium flex items-center gap-2">
                  <Phone size={16} className="text-red-600" />
                  Contact Number
                </label>
                <input
                  type="tel"
                  placeholder="e.g. +63 912 345 6789"
                  value={form.contactNumber}
                  onChange={(e) => setForm({ ...form, contactNumber: e.target.value })}
                  className="w-full border border-zinc-300 rounded-lg px-3 py-2 text-zinc-800 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-red-500/30 focus:border-red-500"
                />
              </div>

              <div className="rounded-2xl border border-zinc-200 bg-white p-4">
                <label className="block text-sm text-zinc-700 mb-1.5 font-medium flex items-center gap-2">
                  <Droplets size={16} className="text-red-600" />
                  Blood Type
                </label>
                <select
                  value={form.bloodType}
                  onChange={(e) => setForm({ ...form, bloodType: e.target.value })}
                  className="w-full border border-zinc-300 rounded-lg px-3 py-2 text-zinc-800 focus:outline-none focus:ring-2 focus:ring-red-500/30 focus:border-red-500"
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
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => navigate('/profile')}
                className="px-4 py-2.5 bg-zinc-200 text-zinc-700 rounded-lg hover:bg-zinc-300 transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="px-4 py-2.5 bg-black text-white border border-red-600/80 rounded-lg hover:bg-zinc-900 transition-colors flex items-center gap-1.5 font-medium shadow-md shadow-red-900/25"
              >
                <Save size={16} />
                Save Changes
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default EditAccount
