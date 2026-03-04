import { useEffect, useState } from 'react'
import { Save, Image as ImageIcon, Phone, MapPin, Droplets } from 'lucide-react'
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

  const handleSave = () => {
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

    const res = updateCurrentUser(payload)
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
      <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-6xl mx-auto">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Edit Account Information</h3>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">{error}</div>
        )}
        {success && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">{success}</div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-3 relative z-10">
            <label className="block text-sm text-gray-600 mb-1 flex items-center gap-1"><ImageIcon size={16} /> Avatar / Profile Image</label>
            <div className="flex flex-col sm:flex-row items-start gap-4">
              <div className="w-20 h-20 shrink-0 rounded-2xl overflow-hidden border border-gray-200 bg-gray-50 shadow-sm flex items-center justify-center">
                <img
                  src={uploadedImageData || form.profileImage || '/image-removebg-preview.png'}
                  alt="Avatar Preview"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="flex-1 grid grid-cols-1 gap-2">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="block w-full text-sm text-gray-700 file:mr-3 file:py-2 file:px-3 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-gray-900 file:text-white hover:file:bg-gray-800"
                />
                <input
                  type="url"
                  placeholder="https://example.com/avatar.jpg"
                  value={form.profileImage}
                  onChange={(e) => {
                    setUploadedImageData('')
                    setForm({ ...form, profileImage: e.target.value })
                  }}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                />
                <button
                  type="button"
                  onClick={handleRemovePhoto}
                  className="w-fit px-3 py-2 text-sm font-medium text-red-700 bg-red-50 border border-red-200 rounded-md hover:bg-red-100 transition-colors"
                >
                  Remove Photo
                </button>
                <p className="text-xs text-gray-500">Upload an image (max 2MB) or provide a URL. Saved avatar updates are reflected across the dashboard.</p>
              </div>
            </div>
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">Full Name</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">Email</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
            />
          </div>
          <div className="lg:col-span-3">
            <label className="block text-sm text-gray-600 mb-1 flex items-center gap-1"><MapPin size={16} /> Address</label>
            <input
              type="text"
              placeholder="Street, City, Province"
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1 flex items-center gap-1"><Phone size={16} /> Contact Number</label>
            <input
              type="tel"
              placeholder="e.g. +63 912 345 6789"
              value={form.contactNumber}
              onChange={(e) => setForm({ ...form, contactNumber: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1 flex items-center gap-1"><Droplets size={16} /> Blood Type</label>
            <select
              value={form.bloodType}
              onChange={(e) => setForm({ ...form, bloodType: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
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

        <div className="flex justify-end gap-2 mt-4">
          <button
            onClick={() => navigate('/profile')}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-1"
          >
            <Save size={16} />
            Save Changes
          </button>
        </div>
      </div>
    </div>
  )
}

export default EditAccount
