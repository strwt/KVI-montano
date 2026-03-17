import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { User, Mail, ArrowLeft, Send, Phone, MapPin, Droplets, Shield, Calendar } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

function Recruitment() {
  const navigate = useNavigate()
  const { submitRecruitmentApplication } = useAuth()
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    contactNumber: '',
    address: '',
    bloodType: '',
    insuranceStatus: 'N/A',
    insuranceYear: '',
  })
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    setIsSubmitting(true)

    const result = await submitRecruitmentApplication(formData)
    if (!result.success) {
      setError(result.message)
      setIsSubmitting(false)
      return
    }

    await new Promise(resolve => setTimeout(resolve, 450))
    setSuccess('Application submitted successfully. Please wait for admin review.')
    setFormData({
      fullName: '',
      email: '',
      contactNumber: '',
      address: '',
      bloodType: '',
      insuranceStatus: 'N/A',
      insuranceYear: '',
    })
    setIsSubmitting(false)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-zinc-100 to-red-100 dark:from-black dark:via-gray-900 dark:to-red-900 flex items-center justify-center p-4">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-32 -left-20 w-72 h-72 bg-red-700/25 rounded-full blur-3xl" />
        <div className="absolute -bottom-28 -right-20 w-80 h-80 bg-red-500/20 rounded-full blur-3xl" />
      </div>

<div className="relative w-full max-w-2xl rounded-3xl bg-white dark:bg-white/10 backdrop-blur-xl border border-red-600 shadow-2xl p-6 sm:p-8">
        <button
          type="button"
          onClick={() => navigate('/landing')}
          className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 dark:text-gray-200 dark:hover:text-white mb-6"
        >
          <ArrowLeft size={15} />
          Back to Landing
        </button>

        <div className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">Recruitment Form</h1>
          <p className="text-sm text-gray-600 dark:text-gray-300 mt-2">Submit your details to join KUSGAN Volunteer.</p>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-lg border border-red-200 bg-red-50 text-red-700 dark:border-red-400/40 dark:bg-red-500/20 dark:text-red-100 text-sm">
            {error}
          </div>
        )}
        {success && (
          <div className="mb-4 p-3 rounded-lg border border-green-200 bg-green-50 text-green-700 dark:border-green-400/40 dark:bg-green-500/20 dark:text-green-100 text-sm">
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-gray-700 dark:text-gray-200 mb-2">Full Name</label>
            <div className="relative">
              <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={formData.fullName}
                onChange={e => setFormData(prev => ({ ...prev, fullName: e.target.value }))}
                className="w-full pl-10 pr-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900/60 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                placeholder="Enter your full name"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm text-gray-700 dark:text-gray-200 mb-2">Email</label>
            <div className="relative">
              <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="email"
                value={formData.email}
                onChange={e => setFormData(prev => ({ ...prev, email: e.target.value }))}
                className="w-full pl-10 pr-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900/60 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                placeholder="Enter your email"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm text-gray-700 dark:text-gray-200 mb-2">Insurance</label>
              <div className="relative">
                <Shield size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <select
                  value={formData.insuranceStatus}
                  onChange={e => {
                    const nextStatus = e.target.value
                    setFormData(prev => ({
                      ...prev,
                      insuranceStatus: nextStatus,
                      insuranceYear: nextStatus === 'Insured' ? prev.insuranceYear : '',
                    }))
                  }}
                  className="w-full pl-10 pr-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900/60 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500 appearance-none"
                  required
                >
                  <option value="N/A" className="text-gray-900">N/A</option>
                  <option value="Insured" className="text-gray-900">Insured</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm text-gray-700 dark:text-gray-200 mb-2">What Year</label>
              <div className="relative">
                <Calendar size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="number"
                  inputMode="numeric"
                  value={formData.insuranceYear}
                  onChange={e => setFormData(prev => ({ ...prev, insuranceYear: e.target.value }))}
                  className="w-full pl-10 pr-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900/60 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-60 disabled:cursor-not-allowed"
                  placeholder="What year"
                  min="1900"
                  max={String(new Date().getFullYear() + 1)}
                  disabled={formData.insuranceStatus !== 'Insured'}
                  required={formData.insuranceStatus === 'Insured'}
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm text-gray-700 dark:text-gray-200 mb-2">Contact Number</label>
            <div className="relative">
              <Phone size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="tel"
                value={formData.contactNumber}
                onChange={e => setFormData(prev => ({ ...prev, contactNumber: e.target.value }))}
                className="w-full pl-10 pr-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900/60 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                placeholder="e.g. +63 912 345 6789"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm text-gray-700 dark:text-gray-200 mb-2">Address</label>
            <div className="relative">
              <MapPin size={16} className="absolute left-3 top-3 text-gray-400" />
              <textarea
                value={formData.address}
                onChange={e => setFormData(prev => ({ ...prev, address: e.target.value }))}
                className="w-full pl-10 pr-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900/60 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500 min-h-[88px] resize-y"
                placeholder="Street, Barangay, City"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm text-gray-700 dark:text-gray-200 mb-2">Blood Type</label>
            <div className="relative">
              <Droplets size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <select
                value={formData.bloodType}
                onChange={e => setFormData(prev => ({ ...prev, bloodType: e.target.value }))}
                className="w-full pl-10 pr-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900/60 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500 appearance-none"
                required
              >
                <option value="" className="text-gray-900">Select blood type</option>
                <option value="A+" className="text-gray-900">A+</option>
                <option value="A-" className="text-gray-900">A-</option>
                <option value="B+" className="text-gray-900">B+</option>
                <option value="B-" className="text-gray-900">B-</option>
                <option value="AB+" className="text-gray-900">AB+</option>
                <option value="AB-" className="text-gray-900">AB-</option>
                <option value="O+" className="text-gray-900">O+</option>
                <option value="O-" className="text-gray-900">O-</option>
              </select>
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-gradient-to-r from-red-600 to-red-700 text-white font-semibold hover:from-red-700 hover:to-red-800 transition-colors disabled:opacity-60"
          >
            <Send size={16} />
            {isSubmitting ? 'Submitting...' : 'Submit Application'}
          </button>
        </form>
      </div>
    </div>
  )
}

export default Recruitment
