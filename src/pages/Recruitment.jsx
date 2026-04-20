import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { User, Mail, ArrowLeft, Send, Phone, MapPin, Droplets, Shield, Calendar } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

const LANDING_THEME = {
  navy: '#4169E1',
  navyDeep: '#1E3A8A',
  navyMid: '#93C5FD',
}

function Recruitment() {
  const navigate = useNavigate()
  const { submitRecruitmentApplication } = useAuth()
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    contactNumber: '',
    emergencyContactNumber: '',
    emergencyContactName: '',
    emergencyContactRelationship: '',
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
      emergencyContactNumber: '',
      emergencyContactName: '',
      emergencyContactRelationship: '',
      address: '',
      bloodType: '',
      insuranceStatus: 'N/A',
      insuranceYear: '',
    })
    setIsSubmitting(false)
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden text-white"
      style={{ background: LANDING_THEME.navyDeep }}
    >
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div
          className="absolute inset-0"
          style={{
            background: `linear-gradient(135deg, ${LANDING_THEME.navyDeep} 0%, ${LANDING_THEME.navy} 50%, ${LANDING_THEME.navyMid} 100%)`,
          }}
        />
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px)',
            backgroundSize: '60px 60px',
          }}
        />
        <div
          className="absolute -top-40 -right-40 rounded-full"
          style={{
            width: 600,
            height: 600,
            background: 'radial-gradient(circle, rgba(250,204,21,0.14) 0%, transparent 70%)',
          }}
        />
        <div
          className="absolute top-1/2 -left-64 rounded-full"
          style={{
            width: 500,
            height: 500,
            background: 'radial-gradient(circle, rgba(250,204,21,0.12) 0%, transparent 70%)',
          }}
        />
        <div
          className="absolute -bottom-40 right-1/3 rounded-full"
          style={{
            width: 400,
            height: 400,
            background: 'radial-gradient(circle, rgba(250,204,21,0.1) 0%, transparent 70%)',
          }}
        />
      </div>

      <div
        className="relative w-full max-w-2xl rounded-3xl backdrop-blur-xl border border-white/20 shadow-2xl p-6 sm:p-8"
        style={{
          background: 'linear-gradient(145deg, rgba(255,255,255,0.18), rgba(255,255,255,0.04))',
          boxShadow: '0 24px 70px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.25)',
        }}
      >
        <button
          type="button"
          onClick={() => navigate('/landing')}
          className="inline-flex items-center gap-2 text-sm text-white/75 hover:text-white mb-6"
        >
          <ArrowLeft size={15} />
          Back to Landing
        </button>

        <div className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-white">Recruitment Form</h1>
          <p className="text-sm text-white/75 mt-2">Submit your details to join KUSGAN Volunteer.</p>
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
            <label htmlFor="recruitment-full-name" className="block text-sm text-white/80 mb-2">Full Name</label>
            <div className="relative">
              <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/45" />
              <input
                id="recruitment-full-name"
                name="fullName"
                type="text"
                value={formData.fullName}
                onChange={e => setFormData(prev => ({ ...prev, fullName: e.target.value }))}
                className="w-full pl-10 pr-4 py-3 rounded-lg border border-white/20 bg-white/10 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-red-500"
                placeholder="Enter your full name"
                autoComplete="name"
                required
              />
            </div>
          </div>

          <div>
            <label htmlFor="recruitment-email" className="block text-sm text-white/80 mb-2">Email</label>
            <div className="relative">
              <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/45" />
              <input
                id="recruitment-email"
                name="email"
                type="email"
                value={formData.email}
                onChange={e => setFormData(prev => ({ ...prev, email: e.target.value }))}
                className="w-full pl-10 pr-4 py-3 rounded-lg border border-white/20 bg-white/10 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-red-500"
                placeholder="Enter your email"
                autoComplete="email"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="recruitment-insurance-status" className="block text-sm text-white/80 mb-2">Insurance</label>
              <div className="relative">
                <Shield size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/45" />
                <select
                  id="recruitment-insurance-status"
                  name="insuranceStatus"
                  value={formData.insuranceStatus}
                  onChange={e => {
                    const nextStatus = e.target.value
                    setFormData(prev => ({
                      ...prev,
                      insuranceStatus: nextStatus,
                      insuranceYear: nextStatus === 'Insured' ? prev.insuranceYear : '',
                    }))
                  }}
                  className="w-full pl-10 pr-4 py-3 rounded-lg border border-white/20 bg-white/10 text-white focus:outline-none focus:ring-2 focus:ring-red-500 appearance-none"
                  required
                >
                  <option value="N/A" className="text-gray-900">N/A</option>
                  <option value="Insured" className="text-gray-900">Insured</option>
                </select>
              </div>
            </div>

            <div>
              <label htmlFor="recruitment-insurance-year" className="block text-sm text-white/80 mb-2">What Year</label>
              <div className="relative">
                <Calendar size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/45" />
                <input
                  id="recruitment-insurance-year"
                  name="insuranceYear"
                  type="number"
                  inputMode="numeric"
                  value={formData.insuranceYear}
                  onChange={e => setFormData(prev => ({ ...prev, insuranceYear: e.target.value }))}
                  className="w-full pl-10 pr-4 py-3 rounded-lg border border-white/20 bg-white/10 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-60 disabled:cursor-not-allowed"
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
            <label htmlFor="recruitment-contact-number" className="block text-sm text-white/80 mb-2">Contact Number</label>
            <div className="relative">
              <Phone size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/45" />
              <input
                id="recruitment-contact-number"
                name="contactNumber"
                type="tel"
                value={formData.contactNumber}
                onChange={e => setFormData(prev => ({ ...prev, contactNumber: e.target.value }))}
                className="w-full pl-10 pr-4 py-3 rounded-lg border border-white/20 bg-white/10 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-red-500"
                placeholder="e.g. +63 912 345 6789"
                autoComplete="tel"
                required
              />
            </div>
          </div>

          <div className="pt-2">
            <p className="text-sm font-semibold text-white">In Case of Emergency</p>
            <p className="text-xs text-white/70">Optional: who should we contact in an emergency?</p>
          </div>

          <div>
            <label htmlFor="recruitment-emergency-number" className="block text-sm text-white/80 mb-2">Emergency Number</label>
            <div className="relative">
              <Phone size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/45" />
              <input
                id="recruitment-emergency-number"
                name="emergencyContactNumber"
                type="tel"
                value={formData.emergencyContactNumber}
                onChange={e => setFormData(prev => ({ ...prev, emergencyContactNumber: e.target.value }))}
                className="w-full pl-10 pr-4 py-3 rounded-lg border border-white/20 bg-white/10 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-red-500"
                placeholder="Emergency contact number"
                autoComplete="tel"
              />
            </div>
          </div>

          <div>
            <label htmlFor="recruitment-emergency-name" className="block text-sm text-white/80 mb-2">Name</label>
            <div className="relative">
              <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/45" />
              <input
                id="recruitment-emergency-name"
                name="emergencyContactName"
                type="text"
                value={formData.emergencyContactName}
                onChange={e => setFormData(prev => ({ ...prev, emergencyContactName: e.target.value }))}
                className="w-full pl-10 pr-4 py-3 rounded-lg border border-white/20 bg-white/10 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-red-500"
                placeholder="Emergency contact name"
                autoComplete="name"
              />
            </div>
          </div>

          <div>
            <label htmlFor="recruitment-emergency-relationship" className="block text-sm text-white/80 mb-2">Relationship</label>
            <div className="relative">
              <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/45" />
              <input
                id="recruitment-emergency-relationship"
                name="emergencyContactRelationship"
                type="text"
                value={formData.emergencyContactRelationship}
                onChange={e => setFormData(prev => ({ ...prev, emergencyContactRelationship: e.target.value }))}
                className="w-full pl-10 pr-4 py-3 rounded-lg border border-white/20 bg-white/10 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-red-500"
                placeholder="e.g. Parent, Sibling"
                autoComplete="off"
              />
            </div>
          </div>

          <div>
            <label htmlFor="recruitment-address" className="block text-sm text-white/80 mb-2">Address</label>
            <div className="relative">
              <MapPin size={16} className="absolute left-3 top-3 text-white/45" />
              <textarea
                id="recruitment-address"
                name="address"
                value={formData.address}
                onChange={e => setFormData(prev => ({ ...prev, address: e.target.value }))}
                className="w-full pl-10 pr-4 py-3 rounded-lg border border-white/20 bg-white/10 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-red-500 min-h-[88px] resize-y"
                placeholder="Street, Barangay, City"
                autoComplete="street-address"
                required
              />
            </div>
          </div>

          <div>
            <label htmlFor="recruitment-blood-type" className="block text-sm text-white/80 mb-2">Blood Type</label>
            <div className="relative">
              <Droplets size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/45" />
              <select
                id="recruitment-blood-type"
                name="bloodType"
                value={formData.bloodType}
                onChange={e => setFormData(prev => ({ ...prev, bloodType: e.target.value }))}
                className="w-full pl-10 pr-4 py-3 rounded-lg border border-white/20 bg-white/10 text-white focus:outline-none focus:ring-2 focus:ring-red-500 appearance-none"
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
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-gradient-to-r from-yellow-400 to-amber-300 text-slate-950 font-semibold hover:from-yellow-300 hover:to-amber-200 transition-colors disabled:opacity-60 shadow-[0_16px_34px_rgba(250,204,21,0.28)]"
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
