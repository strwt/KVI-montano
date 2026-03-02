import { useState, useEffect } from 'react'
import { ArrowLeft, Mail, Calendar, User, Trash2 } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useNavigate, useParams } from 'react-router-dom'

const DEFAULT_COMMITTEE = 'Environmental'
const BLOOD_TYPE_OPTIONS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']

function MemberDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user, getAllMembers, deleteMembers, updateMember } = useAuth()
  
  const [member, setMember] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [showUpdateModal, setShowUpdateModal] = useState(false)
  const [editForm, setEditForm] = useState({
    idNumber: '',
    name: '',
    email: '',
    address: '',
    contactNumber: '',
    bloodType: '',
    status: 'active',
    memberSince: '',
  })

  useEffect(() => {
    const allMembers = getAllMembers()
    const foundMember = allMembers.find(m => String(m.id) === String(id))
    if (foundMember) {
      setMember(foundMember)
      setEditForm({
        idNumber: foundMember.idNumber || '',
        name: foundMember.name || '',
        email: foundMember.email || '',
        address: foundMember.address || '',
        contactNumber: foundMember.contactNumber || '',
        bloodType: foundMember.bloodType || '',
        status: foundMember.status || 'active',
        memberSince: (foundMember.memberSince || new Date().toISOString()).split('T')[0],
      })
    }
    setLoading(false)
  }, [id, getAllMembers])

  const getRoleBadge = (role) => {
    return role === 'admin' 
      ? 'bg-red-100 text-red-700 border-red-200'
      : 'bg-blue-100 text-blue-700 border-blue-200'
  }

  const isAdmin = user?.role === 'admin'

  const handleDeleteMember = () => {
    deleteMembers([member.id])
    navigate('/members')
  }

  const handleUpdateMember = (e) => {
    e.preventDefault()
    updateMember(member.id, {
      idNumber: editForm.idNumber,
      name: editForm.name,
      email: editForm.email,
      address: editForm.address,
      contactNumber: editForm.contactNumber,
      bloodType: editForm.bloodType,
      status: editForm.status,
      memberSince: editForm.memberSince,
    })
    setMember(prev => ({
      ...prev,
      ...editForm,
    }))
    setShowUpdateModal(false)
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
      <div className="mb-6 flex items-center justify-between">
        <button
          onClick={() => navigate('/members')}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors mb-4"
        >
          <ArrowLeft size={20} />
          Back to Members
        </button>
        {isAdmin && (
          <button
            onClick={() => setShowUpdateModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            Update
          </button>
        )}
      </div>

      <div className="space-y-6">
        <div className="bg-white rounded-xl shadow-md p-6">
          <div className="flex items-start gap-6">
            <div className="w-24 h-24 rounded-full bg-gradient-to-r from-red-600 to-red-700 flex items-center justify-center flex-shrink-0 overflow-hidden">
              <img
                src={member.profileImage || '/image-removebg-preview.png'}
                alt={member.name}
                className="w-full h-full object-cover"
              />
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
                  <span>{member.email || 'N/A'}</span>
                </div>
                <div className="flex items-center gap-3 text-gray-600">
                  <Calendar size={18} className="text-gray-400" />
                  <span>Joined {new Date(member.memberSince || Date.now()).toLocaleDateString()}</span>
                </div>
                <div className="flex flex-wrap gap-2 pt-1">
                  <span className="px-2 py-1 rounded bg-red-50 text-red-700 text-xs border border-red-200">
                    Committee: {member.committee || DEFAULT_COMMITTEE}
                  </span>
                  <span className="px-2 py-1 rounded bg-blue-50 text-blue-700 text-xs border border-blue-200">
                    Role: {member.role === 'admin' ? 'Admin' : 'Member'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl shadow-md p-5">
            <p className="text-sm text-gray-500 mb-1">ID Number</p>
            <p className="text-lg font-semibold text-gray-800">{member.idNumber || 'N/A'}</p>
          </div>
          <div className="bg-white rounded-xl shadow-md p-5">
            <p className="text-sm text-gray-500 mb-1">Role</p>
            <p className="text-lg font-semibold text-gray-800">
              {member.role === 'admin' ? 'Administrator' : 'Member'}
            </p>
          </div>
          <div className="bg-white rounded-xl shadow-md p-5">
            <p className="text-sm text-gray-500 mb-1">Status</p>
            <p className={`text-lg font-semibold flex items-center gap-2 ${
              member.status === 'inactive' ? 'text-gray-600' : 'text-green-600'
            }`}>
              <span className={`w-2 h-2 rounded-full ${
                member.status === 'inactive' ? 'bg-gray-500' : 'bg-green-500'
              }`}></span>
              {member.status === 'inactive' ? 'Inactive' : 'Active'}
            </p>
          </div>
          <div className="bg-white rounded-xl shadow-md p-5">
            <p className="text-sm text-gray-500 mb-1">Member Since</p>
            <p className="text-lg font-semibold text-gray-800">
              {new Date(member.memberSince || Date.now()).toLocaleDateString()}
            </p>
          </div>
          <div className="bg-white rounded-xl shadow-md p-5">
            <p className="text-sm text-gray-500 mb-1">Address</p>
            <p className="text-lg font-semibold text-gray-800">{member.address || 'N/A'}</p>
          </div>
          <div className="bg-white rounded-xl shadow-md p-5">
            <p className="text-sm text-gray-500 mb-1">Contact Number</p>
            <p className="text-lg font-semibold text-gray-800">{member.contactNumber || 'N/A'}</p>
          </div>
          <div className="bg-white rounded-xl shadow-md p-5">
            <p className="text-sm text-gray-500 mb-1">Blood Type</p>
            <p className="text-lg font-semibold text-gray-800">{member.bloodType || 'N/A'}</p>
          </div>
        </div>
      </div>

      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 max-w-md w-full mx-4 animate-fade-in">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                <Trash2 size={24} className="text-red-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-800">Confirm Delete</h3>
                <p className="text-sm text-gray-500">This action cannot be undone</p>
              </div>
            </div>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete this member?
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteMember}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {showUpdateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 max-w-md w-full mx-4 animate-fade-in">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Update Member</h3>
            <form onSubmit={handleUpdateMember} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">ID Number</label>
                <input
                  type="text"
                  required
                  value={editForm.idNumber}
                  onChange={(e) => setEditForm({ ...editForm, idNumber: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <input
                  type="text"
                  required
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  required
                  value={editForm.email}
                  onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                <input
                  type="text"
                  value={editForm.address}
                  onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Contact Number</label>
                <input
                  type="text"
                  value={editForm.contactNumber}
                  onChange={(e) => setEditForm({ ...editForm, contactNumber: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Blood Type</label>
                <select
                  value={editForm.bloodType}
                  onChange={(e) => setEditForm({ ...editForm, bloodType: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                >
                  <option value="">Select Blood Type</option>
                  {BLOOD_TYPE_OPTIONS.map(type => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select
                    value={editForm.status}
                    onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Member Since</label>
                  <input
                    type="date"
                    value={editForm.memberSince}
                    onChange={(e) => setEditForm({ ...editForm, memberSince: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                </div>
              </div>
              <div className="flex flex-wrap justify-between gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowUpdateModal(false)
                    setShowDeleteConfirm(true)
                  }}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                  Delete Member
                </button>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setShowUpdateModal(false)}
                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                  >
                    Save Changes
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default MemberDetail
