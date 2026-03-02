import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { User, Mail, Hash, ArrowLeft, Send } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

function Recruitment() {
  const navigate = useNavigate()
  const { submitRecruitmentApplication } = useAuth()
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    idNumber: '',
  })
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    setIsSubmitting(true)

    const result = submitRecruitmentApplication(formData)
    if (!result.success) {
      setError(result.message)
      setIsSubmitting(false)
      return
    }

    await new Promise(resolve => setTimeout(resolve, 450))
    setSuccess('Application submitted successfully. Please wait for admin review.')
    setFormData({ fullName: '', email: '', idNumber: '' })
    setIsSubmitting(false)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-red-900 flex items-center justify-center p-4">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-32 -left-20 w-72 h-72 bg-red-700/25 rounded-full blur-3xl" />
        <div className="absolute -bottom-28 -right-20 w-80 h-80 bg-red-500/20 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-2xl rounded-3xl bg-white/10 backdrop-blur-xl border border-white/20 shadow-2xl p-6 sm:p-8">
        <button
          type="button"
          onClick={() => navigate('/landing')}
          className="inline-flex items-center gap-2 text-sm text-gray-200 hover:text-white mb-6"
        >
          <ArrowLeft size={15} />
          Back to Landing
        </button>

        <div className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-white">Recruitment Form</h1>
          <p className="text-sm text-gray-300 mt-2">Submit your details to join KUSGAN Volunteer.</p>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-lg border border-red-400/40 bg-red-500/20 text-red-100 text-sm">
            {error}
          </div>
        )}
        {success && (
          <div className="mb-4 p-3 rounded-lg border border-green-400/40 bg-green-500/20 text-green-100 text-sm">
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-gray-200 mb-2">Full Name</label>
            <div className="relative">
              <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={formData.fullName}
                onChange={e => setFormData(prev => ({ ...prev, fullName: e.target.value }))}
                className="w-full pl-10 pr-4 py-3 rounded-lg border border-gray-600 bg-gray-900/60 text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                placeholder="Enter your full name"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm text-gray-200 mb-2">Email</label>
            <div className="relative">
              <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="email"
                value={formData.email}
                onChange={e => setFormData(prev => ({ ...prev, email: e.target.value }))}
                className="w-full pl-10 pr-4 py-3 rounded-lg border border-gray-600 bg-gray-900/60 text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                placeholder="Enter your email"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm text-gray-200 mb-2">ID Number</label>
            <div className="relative">
              <Hash size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={formData.idNumber}
                onChange={e => setFormData(prev => ({ ...prev, idNumber: e.target.value }))}
                className="w-full pl-10 pr-4 py-3 rounded-lg border border-gray-600 bg-gray-900/60 text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                placeholder="Enter your ID Number"
                required
              />
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
