import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { User, Mail, ArrowLeft, Send, Phone, MapPin, Droplets, Shield, Calendar } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

const LANDING_THEME = {
  navy: '#1e40af',
  navyDeep: '#1e3a8a',
  navyMid: '#2563eb',
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
      className="fixed inset-0 flex items-center justify-center z-50 p-3 sm:p-4 overflow-hidden"
      style={{ background: LANDING_THEME.navy }}
    >
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div
          className="absolute inset-0"
          style={{
            background: `linear-gradient(180deg, ${LANDING_THEME.navyDeep} 0%, ${LANDING_THEME.navy} 52%, ${LANDING_THEME.navyMid} 100%)`,
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
      <div className="calendar-done-modal scrollbar-hide relative isolate w-full max-w-3xl animate-fade-in-up max-h-[92vh] overflow-y-auto overscroll-contain rounded-2xl border border-gray-200 bg-white shadow-[0_24px_70px_rgba(15,23,42,0.18)]">
        <div className="calendar-done-modal-header sticky top-0 z-50 flex items-center justify-between rounded-t-2xl border-b border-gray-200 bg-white p-4 sm:p-5">
          <div>
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-yellow-100">
                <User size={16} className="text-yellow-700" />
              </div>
              <h3 className="text-lg font-semibold text-gray-800">Recruitment Form</h3>
            </div>
          </div>
          <button
            type="button"
            onClick={() => navigate('/landing')}
            className="inline-flex items-center gap-2 rounded-lg border border-yellow-400 bg-transparent px-3 py-2 text-sm font-medium text-yellow-500 transition-colors hover:bg-yellow-400/10"
            aria-label="Back to landing"
          >
            Back
          </button>
        </div>

        <form onSubmit={handleSubmit} className="calendar-done-modal-body p-4 sm:p-6 space-y-5">
          {error && <p className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-600">{error}</p>}
          {success && <p className="rounded-xl border border-green-200 bg-green-50 p-3 text-sm text-green-700">{success}</p>}

          <div className="calendar-done-card rounded-xl border border-gray-200 bg-gray-50 p-4 sm:p-5 space-y-4">
            <h4 className="text-sm font-semibold uppercase tracking-wide text-gray-800">Applicant Details</h4>

            <div>
              <label htmlFor="recruitment-full-name" className="mb-2 block text-sm font-medium text-gray-700">Full Name</label>
              <div className="relative">
                <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-yellow-600" />
                <input
                  id="recruitment-full-name"
                  name="fullName"
                  type="text"
                  value={formData.fullName}
                  onChange={e => setFormData(prev => ({ ...prev, fullName: e.target.value }))}
                  className="w-full rounded-lg border border-gray-300 bg-white py-3 pl-10 pr-4 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500"
                  placeholder="Enter your full name"
                  autoComplete="name"
                  required
                />
              </div>
            </div>

            <div>
              <label htmlFor="recruitment-email" className="mb-2 block text-sm font-medium text-gray-700">Email</label>
              <div className="relative">
                <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-yellow-600" />
                <input
                  id="recruitment-email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={e => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  className="w-full rounded-lg border border-gray-300 bg-white py-3 pl-10 pr-4 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500"
                  placeholder="Enter your email"
                  autoComplete="email"
                  required
                />
              </div>
            </div>

            <div>
              <label htmlFor="recruitment-contact-number" className="mb-2 block text-sm font-medium text-gray-700">Contact Number</label>
              <div className="relative">
                <Phone size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-yellow-600" />
                <input
                  id="recruitment-contact-number"
                  name="contactNumber"
                  type="tel"
                  value={formData.contactNumber}
                  onChange={e => setFormData(prev => ({ ...prev, contactNumber: e.target.value }))}
                  className="w-full rounded-lg border border-gray-300 bg-white py-3 pl-10 pr-4 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500"
                  placeholder="e.g. +63 912 345 6789"
                  autoComplete="tel"
                  required
                />
              </div>
            </div>
          </div>

          <div className="calendar-done-card rounded-xl border border-gray-200 bg-gray-50 p-4 sm:p-5 space-y-4">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-yellow-100">
                <Shield size={16} className="text-yellow-700" />
              </div>
              <h4 className="text-sm font-semibold uppercase tracking-wide text-gray-800">Insurance</h4>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label htmlFor="recruitment-insurance-status" className="mb-2 block text-sm font-medium text-gray-700">Insurance</label>
                <div className="relative">
                  <Shield size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-yellow-600" />
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
                    className="w-full rounded-lg border border-gray-300 bg-white py-3 pl-10 pr-4 text-gray-900 focus:outline-none focus:ring-2 focus:ring-red-500 appearance-none"
                    required
                  >
                    <option value="N/A">N/A</option>
                    <option value="Insured">Insured</option>
                  </select>
                </div>
              </div>

              <div>
                <label htmlFor="recruitment-insurance-year" className="mb-2 block text-sm font-medium text-gray-700">What Year</label>
                <div className="relative">
                  <Calendar size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-yellow-600" />
                  <input
                    id="recruitment-insurance-year"
                    name="insuranceYear"
                    type="number"
                    inputMode="numeric"
                    value={formData.insuranceYear}
                    onChange={e => setFormData(prev => ({ ...prev, insuranceYear: e.target.value }))}
                    className="w-full rounded-lg border border-gray-300 bg-white py-3 pl-10 pr-4 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500 disabled:cursor-not-allowed disabled:opacity-60"
                    placeholder="What year"
                    min="1900"
                    max={String(new Date().getFullYear() + 1)}
                    disabled={formData.insuranceStatus !== 'Insured'}
                    required={formData.insuranceStatus === 'Insured'}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="calendar-done-card rounded-xl border border-gray-200 bg-gray-50 p-4 sm:p-5 space-y-4">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-yellow-100">
                <Phone size={16} className="text-yellow-700" />
              </div>
              <h4 className="text-sm font-semibold uppercase tracking-wide text-gray-800">Emergency Contact</h4>
            </div>
            <p className="text-sm text-gray-500">Optional: who should we contact in an emergency?</p>

            <div>
              <label htmlFor="recruitment-emergency-number" className="mb-2 block text-sm font-medium text-gray-700">Emergency Number</label>
              <div className="relative">
                <Phone size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-yellow-600" />
                <input
                  id="recruitment-emergency-number"
                  name="emergencyContactNumber"
                  type="tel"
                  value={formData.emergencyContactNumber}
                  onChange={e => setFormData(prev => ({ ...prev, emergencyContactNumber: e.target.value }))}
                  className="w-full rounded-lg border border-gray-300 bg-white py-3 pl-10 pr-4 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500"
                  placeholder="Emergency contact number"
                  autoComplete="tel"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label htmlFor="recruitment-emergency-name" className="mb-2 block text-sm font-medium text-gray-700">Name</label>
                <div className="relative">
                  <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-yellow-600" />
                  <input
                    id="recruitment-emergency-name"
                    name="emergencyContactName"
                    type="text"
                    value={formData.emergencyContactName}
                    onChange={e => setFormData(prev => ({ ...prev, emergencyContactName: e.target.value }))}
                    className="w-full rounded-lg border border-gray-300 bg-white py-3 pl-10 pr-4 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500"
                    placeholder="Emergency contact name"
                    autoComplete="name"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="recruitment-emergency-relationship" className="mb-2 block text-sm font-medium text-gray-700">Relationship</label>
                <div className="relative">
                  <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-yellow-600" />
                  <input
                    id="recruitment-emergency-relationship"
                    name="emergencyContactRelationship"
                    type="text"
                    value={formData.emergencyContactRelationship}
                    onChange={e => setFormData(prev => ({ ...prev, emergencyContactRelationship: e.target.value }))}
                    className="w-full rounded-lg border border-gray-300 bg-white py-3 pl-10 pr-4 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500"
                    placeholder="e.g. Parent, Sibling"
                    autoComplete="off"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="calendar-done-card rounded-xl border border-gray-200 bg-gray-50 p-4 sm:p-5 space-y-4">
            <h4 className="text-sm font-semibold uppercase tracking-wide text-gray-800">Additional Details</h4>

            <div>
              <label htmlFor="recruitment-address" className="mb-2 block text-sm font-medium text-gray-700">Address</label>
              <div className="relative">
                <MapPin size={16} className="absolute left-3 top-3 text-yellow-600" />
                <textarea
                  id="recruitment-address"
                  name="address"
                  value={formData.address}
                  onChange={e => setFormData(prev => ({ ...prev, address: e.target.value }))}
                  className="min-h-[88px] w-full rounded-lg border border-gray-300 bg-white py-3 pl-10 pr-4 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500 resize-y"
                  placeholder="Street, Barangay, City"
                  autoComplete="street-address"
                  required
                />
              </div>
            </div>

            <div>
              <label htmlFor="recruitment-blood-type" className="mb-2 block text-sm font-medium text-gray-700">Blood Type</label>
              <div className="relative">
                <Droplets size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-yellow-600" />
                <select
                  id="recruitment-blood-type"
                  name="bloodType"
                  value={formData.bloodType}
                  onChange={e => setFormData(prev => ({ ...prev, bloodType: e.target.value }))}
                  className="w-full rounded-lg border border-gray-300 bg-white py-3 pl-10 pr-4 text-gray-900 focus:outline-none focus:ring-2 focus:ring-red-500 appearance-none"
                  required
                >
                  <option value="">Select blood type</option>
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
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="form-primary-yellow w-full inline-flex items-center justify-center gap-2 rounded-lg px-4 py-3 font-semibold transition-colors disabled:opacity-60"
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
