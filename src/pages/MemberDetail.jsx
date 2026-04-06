import { useState } from 'react'
import { ArrowLeft, Mail, Calendar, User, Trash2, Eye, EyeOff, Shield } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useNavigate, useParams } from 'react-router-dom'

const BLOOD_TYPE_OPTIONS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']

function MemberDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user, loading: authLoading, authResolved, getAllMembers, getAdmins, deleteMembers, updateMember, uploadMemberProfileImage, committees } = useAuth()
  
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [showUpdateModal, setShowUpdateModal] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [newProfileImageFile, setNewProfileImageFile] = useState(null)
  const [actionError, setActionError] = useState('')
  const [editForm, setEditForm] = useState({
    idNumber: '',
    name: '',
    email: '',
    newPassword: '',
    address: '',
    contactNumber: '',
    bloodType: '',
    insuranceStatus: 'N/A',
    insuranceYear: '',
    committee: '',
    status: 'active',
    memberSince: '',
  })

  const members = getAllMembers()
  const admins = getAdmins()
  const member = [...admins, ...members].find(m => String(m.id) === String(id)) || null

  const getRoleBadge = (role) => {
    return role === 'admin' 
      ? 'bg-red-100 text-red-700 border-red-200'
      : 'bg-blue-100 text-blue-700 border-blue-200'
  }

  const isAdmin = user?.role === 'admin'

  const openUpdateModal = () => {
    if (!member) return
    setActionError('')
    setShowNewPassword(false)
    setNewProfileImageFile(null)
    setEditForm({
      idNumber: member.idNumber || '',
      name: member.name || '',
      email: member.email || '',
      newPassword: '',
      address: member.address || '',
      contactNumber: member.contactNumber || '',
      bloodType: member.bloodType || '',
      insuranceStatus: member.insuranceStatus || 'N/A',
      insuranceYear: member.insuranceYear || '',
      committee: member.committee || '',
      status: member.status || 'active',
      memberSince: (member.memberSince || new Date().toISOString()).split('T')[0],
    })
    setShowUpdateModal(true)
  }

  const handleDeleteMember = async () => {
    if (!member) return
    setActionError('')
    const result = await deleteMembers([member.id])
    if (!result.success) {
      setActionError(result.message || 'Unable to delete member.')
      return
    }
    navigate('/members')
  }

  const handleUpdateMember = async (e) => {
    e.preventDefault()
    if (!member) return
    setActionError('')

    const insuranceStatus = editForm.insuranceStatus === 'Insured' ? 'Insured' : 'N/A'
    const insuranceYearRaw = String(editForm.insuranceYear || '').trim()
    const insuranceYear = insuranceStatus === 'Insured' ? insuranceYearRaw : ''
    if (insuranceStatus === 'Insured') {
      if (!insuranceYear) {
        setActionError('Insurance year is required when insured.')
        return
      }
      if (!/^\d{4}$/.test(insuranceYear)) {
        setActionError('Insurance year must be a 4-digit year.')
        return
      }
    }

    const updates = {
      idNumber: editForm.idNumber,
      name: editForm.name,
      email: editForm.email,
      address: editForm.address,
      contactNumber: editForm.contactNumber,
      bloodType: editForm.bloodType,
      insuranceStatus,
      insuranceYear,
      committee: editForm.committee,
      status: editForm.status,
      memberSince: editForm.memberSince,
    }

    const nextPassword = String(editForm.newPassword || '').trim()
    if (nextPassword) updates.newPassword = nextPassword

    const result = await updateMember(member.id, updates)
    if (!result.success) {
      setActionError(result.message || 'Unable to update member.')
      return
    }

    if (newProfileImageFile) {
      const uploadResult = await uploadMemberProfileImage(member.id, newProfileImageFile)
      if (!uploadResult.success) {
        setActionError(uploadResult.message || 'Updated member but image upload failed.')
        return
      }
    }
    setShowUpdateModal(false)
  }

  if (!authResolved || authLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-red-600"></div>
      </div>
    )
  }

  if (!member) {
    return (
      <div className="animate-fade-in text-gray-900 dark:text-zinc-100">
        <div className="bg-white dark:bg-zinc-900 border border-red-600 rounded-xl shadow-md p-12 text-center">
          <User size={48} className="mx-auto text-gray-300 mb-4" />
          <p className="text-gray-500 dark:text-zinc-400 text-lg">Member not found</p>
          <button
            onClick={() => navigate('/members')}
            className="mt-4 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700 transition-colors"
          >
            Back to Members
          </button>
        </div>
      </div>
    )
  }

  const joinedDateLabel = (() => {
    const raw = member?.memberSince
    if (!raw) return 'N/A'
    const date = new Date(raw)
    if (Number.isNaN(date.getTime())) return 'N/A'
    return date.toLocaleDateString()
  })()

  return (
    <div className="animate-fade-in text-gray-900 dark:text-zinc-100">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <button
          onClick={() => navigate('/members')}
          className="flex items-center gap-2 text-gray-600 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-zinc-100 transition-colors mb-4"
        >
          <ArrowLeft size={20} />
          Back to Members
        </button>
        {isAdmin && (
          <button
            onClick={openUpdateModal}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            Update
          </button>
        )}
      </div>

      {actionError && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 dark:bg-red-500/20 dark:border-red-500/50 dark:text-red-200 text-sm">
          {actionError}
        </div>
      )}

      <div className="space-y-6">
        <div className="bg-white dark:bg-zinc-900 border border-red-600 rounded-xl shadow-md p-6">
          <div className="flex items-start gap-6">
            <div className="w-24 h-24 rounded-full bg-gradient-to-r from-red-600 to-red-700 flex items-center justify-center flex-shrink-0 overflow-hidden">
              <img
                src={member.profileImage || '/kvi.png'}
                alt={member.name}
                className="w-full h-full object-cover"
              />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2 flex-wrap">
                <h2 className="text-2xl font-bold text-gray-800 dark:text-zinc-100">{member.name}</h2>
                <span className={`px-3 py-1 rounded-full text-sm font-medium border ${getRoleBadge(member.role)}`}>
                  {member.role === 'admin' ? 'Administrator' : 'Member'}
                </span>
              </div>
              
              <div className="space-y-3 mt-4">
                <div className="flex items-center gap-3 text-gray-600 dark:text-zinc-400">
                  <Mail size={18} className="text-gray-400" />
                  <span>{member.email || 'N/A'}</span>
                </div>
                <div className="flex items-center gap-3 text-gray-600 dark:text-zinc-400">
                  <Calendar size={18} className="text-gray-400" />
                  <span>Joined {joinedDateLabel}</span>
                </div>
                <div className="flex flex-wrap gap-2 pt-1">
                  <span className="px-2 py-1 rounded bg-red-50 text-red-700 text-xs border border-red-200">
                    Committee: {member.committee || 'N/A'}
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
          <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 rounded-xl shadow-md p-5">
            <p className="text-sm text-gray-500 mb-1">ID Number</p>
            <p className="text-lg font-semibold text-gray-800">{member.idNumber || 'N/A'}</p>
          </div>
          <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 rounded-xl shadow-md p-5">
            <p className="text-sm text-gray-500 mb-1">Role</p>
            <p className="text-lg font-semibold text-gray-800">
              {member.role === 'admin' ? 'Administrator' : 'Member'}
            </p>
          </div>
          <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 rounded-xl shadow-md p-5">
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
          <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 rounded-xl shadow-md p-5">
            <p className="text-sm text-gray-500 mb-1">Member Since</p>
            <p className="text-lg font-semibold text-gray-800">
              {joinedDateLabel}
            </p>
          </div>
          <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 rounded-xl shadow-md p-5">
            <p className="text-sm text-gray-500 mb-1">Address</p>
            <p className="text-lg font-semibold text-gray-800">{member.address || 'N/A'}</p>
          </div>
          <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 rounded-xl shadow-md p-5">
            <p className="text-sm text-gray-500 mb-1">Contact Number</p>
            <p className="text-lg font-semibold text-gray-800">{member.contactNumber || 'N/A'}</p>
          </div>
          <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 rounded-xl shadow-md p-5">
            <p className="text-sm text-gray-500 mb-1">Blood Type</p>
            <p className="text-lg font-semibold text-gray-800">{member.bloodType || 'N/A'}</p>
          </div>
          <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 rounded-xl shadow-md p-5">
            <p className="text-sm text-gray-500 mb-1">Insurance</p>
            <p className="text-lg font-semibold text-gray-800">
              {member.insuranceStatus === 'Insured'
                ? `Insured${member.insuranceYear ? ` (${member.insuranceYear})` : ''}`
                : (member.insuranceStatus || 'N/A')}
            </p>
          </div>
        </div>
      </div>

      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-zinc-900 border border-red-600 rounded-xl shadow-xl p-6 max-w-md w-full mx-4 animate-fade-in">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                <Trash2 size={24} className="text-red-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-800 dark:text-zinc-100">Confirm Delete</h3>
                <p className="text-sm text-gray-500 dark:text-zinc-400">This action cannot be undone</p>
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
        <div className="fixed inset-0 bg-black/50 z-50 overflow-y-auto">
          <div className="min-h-full w-full p-4 flex items-start justify-center">
            <div className="bg-white dark:bg-zinc-900 border border-red-600 rounded-xl shadow-xl p-6 max-w-md w-full animate-fade-in max-h-[calc(100vh-2rem)] overflow-y-auto">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-zinc-100 mb-4">Update Member</h3>
            <form onSubmit={handleUpdateMember} className="space-y-4">
              <div>
                <label htmlFor="update-member-id-number" className="block text-sm font-medium text-gray-700 mb-1">ID Number</label>
                <input
                  id="update-member-id-number"
                  name="idNumber"
                  type="text"
                  required
                  value={editForm.idNumber}
                  onChange={(e) => setEditForm({ ...editForm, idNumber: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                  autoComplete="off"
                />
              </div>
              <div>
                <label htmlFor="update-member-name" className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <input
                  id="update-member-name"
                  name="name"
                  type="text"
                  required
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                  autoComplete="name"
                />
              </div>
              <div>
                <label htmlFor="update-member-email" className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  id="update-member-email"
                  name="email"
                  type="email"
                  required
                  value={editForm.email}
                  onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                  autoComplete="email"
                />
              </div>
              <div>
                <label htmlFor="update-member-address" className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                <input
                  id="update-member-address"
                  name="address"
                  type="text"
                  value={editForm.address}
                  onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                  autoComplete="street-address"
                />
              </div>
              <div>
                <label htmlFor="update-member-contact-number" className="block text-sm font-medium text-gray-700 mb-1">Contact Number</label>
                <input
                  id="update-member-contact-number"
                  name="contactNumber"
                  type="text"
                  value={editForm.contactNumber}
                  onChange={(e) => setEditForm({ ...editForm, contactNumber: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                  autoComplete="tel"
                />
              </div>
              <div>
                <label htmlFor="update-member-committee" className="block text-sm font-medium text-gray-700 mb-1">Committee</label>
                <select
                  id="update-member-committee"
                  name="committee"
                  value={editForm.committee}
                  onChange={(e) => setEditForm({ ...editForm, committee: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                >
                  <option value="">Select committee</option>
                  {(Array.isArray(committees) ? committees : []).map(name => (
                    <option key={name} value={name}>
                      {name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="update-member-blood-type" className="block text-sm font-medium text-gray-700 mb-1">Blood Type</label>
                <select
                  id="update-member-blood-type"
                  name="bloodType"
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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label htmlFor="update-member-insurance-status" className="block text-sm font-medium text-gray-700 mb-1">
                    Insurance Status
                  </label>
                  <div className="relative">
                    <Shield size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <select
                      id="update-member-insurance-status"
                      name="insuranceStatus"
                      value={editForm.insuranceStatus}
                      onChange={(e) => {
                        const next = e.target.value
                        setEditForm(prev => ({
                          ...prev,
                          insuranceStatus: next,
                          insuranceYear: next === 'Insured' ? prev.insuranceYear : '',
                        }))
                      }}
                      className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                    >
                      <option value="N/A">Not Insured</option>
                      <option value="Insured">Insured</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label htmlFor="update-member-insurance-year" className="block text-sm font-medium text-gray-700 mb-1">
                    Insurance Year
                  </label>
                  <input
                    id="update-member-insurance-year"
                    name="insuranceYear"
                    type="text"
                    inputMode="numeric"
                    placeholder={editForm.insuranceStatus === 'Insured' ? 'e.g. 2026' : 'Not applicable'}
                    value={editForm.insuranceYear}
                    onChange={(e) => setEditForm({ ...editForm, insuranceYear: e.target.value })}
                    disabled={editForm.insuranceStatus !== 'Insured'}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-60"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="update-member-status" className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select
                    id="update-member-status"
                    name="status"
                    value={editForm.status}
                    onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="update-member-since" className="block text-sm font-medium text-gray-700 mb-1">Member Since</label>
                  <input
                    id="update-member-since"
                    name="memberSince"
                    type="date"
                    value={editForm.memberSince}
                    onChange={(e) => setEditForm({ ...editForm, memberSince: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="update-member-new-password" className="block text-sm font-medium text-gray-700 mb-1">
                  New Password (optional)
                </label>
                <div className="relative">
                  <input
                    id="update-member-new-password"
                    name="newPassword"
                    type={showNewPassword ? 'text' : 'password'}
                    value={editForm.newPassword}
                    onChange={(e) => setEditForm({ ...editForm, newPassword: e.target.value })}
                    className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                    autoComplete="new-password"
                    placeholder="Leave blank to keep current password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(prev => !prev)}
                    className="absolute inset-y-0 right-0 flex items-center px-3 text-gray-500 hover:text-gray-700"
                    aria-label={showNewPassword ? 'Hide password' : 'Show password'}
                  >
                    {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <div>
                <label htmlFor="update-member-image" className="block text-sm font-medium text-gray-700 mb-1">
                  Profile Image (optional)
                </label>
                <input
                  id="update-member-image"
                  name="profileImage"
                  type="file"
                  accept="image/*"
                  onChange={(e) => setNewProfileImageFile(e.target.files?.[0] || null)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 bg-white"
                />
              </div>

              <div className="flex flex-wrap justify-between gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowUpdateModal(false)}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <div className="flex gap-2">
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
        </div>
      )}
    </div>
  )
}

export default MemberDetail
