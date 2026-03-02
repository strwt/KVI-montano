import { useState, useEffect } from 'react'
import { ArrowLeft, Mail, Calendar, User } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useNavigate, useParams } from 'react-router-dom'

function MemberDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { getAllMembers } = useAuth()
  
  const [member, setMember] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const allMembers = getAllMembers()
    const foundMember = allMembers.find(m => m.id === parseInt(id))
    if (foundMember) {
      setMember(foundMember)
    }
    setLoading(false)
  }, [id, getAllMembers])

  const getRoleBadge = (role) => {
    return role === 'admin' 
      ? 'bg-red-100 text-red-700 border-red-200'
      : 'bg-blue-100 text-blue-700 border-blue-200'
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-red-600"></div>
      </div>
    )
  }

  if (!member) {
    return (
      <div className="animate-fade-in">
        <div className="bg-white rounded-xl shadow-md p-12 text-center">
          <User size={48} className="mx-auto text-gray-300 mb-4" />
          <p className="text-gray-500 text-lg">Member not found</p>
          <button
            onClick={() => navigate('/members')}
            className="mt-4 px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors"
          >
            Back to Members
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => navigate('/members')}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors mb-4"
        >
          <ArrowLeft size={20} />
          Back to Members
        </button>
      </div>

      <div className="space-y-6">
        <div className="bg-white rounded-xl shadow-md p-6">
          <div className="flex items-start gap-6">
            <div className="w-24 h-24 rounded-full bg-gradient-to-r from-red-600 to-red-700 flex items-center justify-center flex-shrink-0">
              <span className="text-white font-bold text-3xl">
                {member.name.charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2 flex-wrap">
                <h2 className="text-2xl font-bold text-gray-800">{member.name}</h2>
                <span className={`px-3 py-1 rounded-full text-sm font-medium border ${getRoleBadge(member.role)}`}>
                  {member.role === 'admin' ? 'Administrator' : 'Member'}
                </span>
              </div>
              
              <div className="space-y-3 mt-4">
                <div className="flex items-center gap-3 text-gray-600">
                  <Mail size={18} className="text-gray-400" />
                  <span>{member.email || member.idNumber}</span>
                </div>
                <div className="flex items-center gap-3 text-gray-600">
                  <Calendar size={18} className="text-gray-400" />
                  <span>Joined {new Date().toLocaleDateString()}</span>
                </div>
                <div className="flex flex-wrap gap-2 pt-1">
                  <span className="px-2 py-1 rounded bg-red-50 text-red-700 text-xs border border-red-200">
                    Committee: {member.committee || 'Unassigned'}
                  </span>
                  <span className="px-2 py-1 rounded bg-blue-50 text-blue-700 text-xs border border-blue-200">
                    Category: {member.category || 'General Member'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl shadow-md p-5">
            <p className="text-sm text-gray-500 mb-1">Member ID</p>
            <p className="text-lg font-semibold text-gray-800">{member.id}</p>
          </div>
          <div className="bg-white rounded-xl shadow-md p-5">
            <p className="text-sm text-gray-500 mb-1">Role</p>
            <p className="text-lg font-semibold text-gray-800">
              {member.role === 'admin' ? 'Administrator' : 'Member'}
            </p>
          </div>
          <div className="bg-white rounded-xl shadow-md p-5">
            <p className="text-sm text-gray-500 mb-1">Status</p>
            <p className="text-lg font-semibold text-green-600 flex items-center gap-2">
              <span className="w-2 h-2 bg-green-500 rounded-full"></span>
              Active
            </p>
          </div>
          <div className="bg-white rounded-xl shadow-md p-5">
            <p className="text-sm text-gray-500 mb-1">Member Since</p>
            <p className="text-lg font-semibold text-gray-800">{new Date().toLocaleDateString()}</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default MemberDetail
