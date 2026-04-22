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
    type: 'member',
    idNumber: '',
    name: '',
    email: '',
    newPassword: '',
    address: '',
    contactNumber: '',
    emergencyContactNumber: '',
    emergencyContactName: '',
    emergencyContactRelationship: '',
    bloodType: '',
    insuranceStatus: 'N/A',
    insuranceYear: '',
    committee: '',
    committeeRole: 'Member',
    status: 'active',
    memberSince: '',
  })

  const members = getAllMembers()
  const admins = getAdmins()
  const member = [...admins, ...members].find(m => String(m.id) === String(id)) || null
  const memberCommitteeRole = member?.committeeRole || member?.committee_role || 'Member'
  const memberType = memberCommitteeRole === 'OIC' ? 'oic' : (member?.role === 'admin' ? 'admin' : 'member')

  const getRoleBadge = (role) => {
    if (role === 'admin') return 'bg-red-100 text-red-700 border-red-200'
    if (role === 'oic') return 'bg-amber-100 text-amber-700 border-amber-200'
    return 'bg-blue-100 text-blue-700 border-blue-200'
  }

  const isAdmin = user?.role === 'admin'
  const isSelf = member?.id && user?.id && String(member.id) === String(user.id)

  const openUpdateModal = () => {
    if (!member) return
    setActionError('')
    setShowNewPassword(false)
    setNewProfileImageFile(null)
    const resolvedType = memberType
    setEditForm({
      type: resolvedType,
      idNumber: member.idNumber || '',
      name: member.name || '',
      email: member.email || '',
      newPassword: '',
      address: member.address || '',
      contactNumber: member.contactNumber || '',
      emergencyContactNumber: member.emergencyContactNumber || '',
      emergencyContactName: member.emergencyContactName || '',
      emergencyContactRelationship: member.emergencyContactRelationship || '',
      bloodType: member.bloodType || '',
      insuranceStatus: member.insuranceStatus || 'N/A',
      insuranceYear: member.insuranceYear || '',
      committee: resolvedType === 'member' ? (member.committee || '') : '',
      committeeRole: resolvedType === 'oic' ? 'OIC' : 'Member',
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

    const resolvedType = editForm.type === 'admin' || editForm.type === 'oic' || editForm.type === 'member'
      ? editForm.type
      : memberType
    const nextRole = resolvedType === 'admin' || resolvedType === 'oic' ? 'admin' : 'member'
    const nextCommitteeRole = resolvedType === 'oic' ? 'OIC' : 'Member'
    const nextCommittee = resolvedType === 'member' ? editForm.committee : ''

    const updates = {
      role: nextRole,
      idNumber: editForm.idNumber,
      name: editForm.name,
      email: editForm.email,
      address: editForm.address,
      contactNumber: editForm.contactNumber,
      emergencyContactNumber: editForm.emergencyContactNumber,
      emergencyContactName: editForm.emergencyContactName,
      emergencyContactRelationship: editForm.emergencyContactRelationship,
      bloodType: editForm.bloodType,
      insuranceStatus,
      insuranceYear,
      committee: nextCommittee,
      committeeRole: nextCommitteeRole,
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
      </div>

      {actionError && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 dark:bg-red-500/20 dark:border-red-500/50 dark:text-red-200 text-sm">
          {actionError}
        </div>
      )}

      <div className="space-y-6">
        <div
          className="rounded-xl border border-white/20 p-6 shadow-[0_24px_70px_rgba(8,47,73,0.26)]"
          style={{
            background: 'linear-gradient(145deg, rgba(14,116,144,0.88), rgba(30,64,175,0.84) 52%, rgba(59,130,246,0.78))',
            backdropFilter: 'blur(18px)',
          }}
        >
          <div className="flex items-start gap-6">
            <div className="w-24 h-24 rounded-full bg-gradient-to-r from-red-600 to-red-700 flex items-center justify-center flex-shrink-0 overflow-hidden">
              <img
                src={member.profileImage || '/kvi.png'}
                alt={member.name}
                className="w-full h-full object-cover"
              />
            </div>
            <div className="flex-1">
              <div className="mb-2 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex items-center gap-3 flex-wrap">
                  <h2 className="text-2xl font-bold text-white">{member.name}</h2>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium border ${getRoleBadge(memberType)}`}>
                    {memberType === 'admin' ? 'Administrator' : (memberType === 'oic' ? 'OIC' : 'Member')}
                  </span>
                </div>
                {isAdmin && (
                  <button
                    onClick={openUpdateModal}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-yellow-400 px-6 py-3 text-sm font-semibold text-slate-900 transition-all duration-200 hover:-translate-y-0.5 hover:bg-yellow-300"
                    style={{ boxShadow: '0 8px 24px rgba(250,204,21,0.35)' }}
                  >
                    Update
                  </button>
                )}
              </div>
              
                <div className="space-y-3 mt-4">
                  <div className="flex items-center gap-3 text-slate-100">
                    <Mail size={18} className="text-slate-200" />
                    <span>{member.email || 'N/A'}</span>
                  </div>
                <div className="flex items-center gap-3 text-slate-100">
                  <Calendar size={18} className="text-slate-200" />
                  <span>Joined {joinedDateLabel}</span>
                </div>
                <div className="flex flex-wrap gap-2 pt-1">
                  {member.role !== 'admin' && (member.committeeRole || member.committee_role) !== 'OIC' ? (
                    <span className="px-3 py-1 rounded-full border border-yellow-300/40 bg-yellow-300/12 text-xs font-bold text-yellow-200">
                      Committee: {member.committee || 'N/A'}
                    </span>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="rounded-xl border border-white/15 bg-white/5 p-5 shadow-[0_12px_30px_rgba(8,47,73,0.18)] backdrop-blur-md">
            <p className="mb-1 text-sm text-slate-200">ID Number</p>
            <p className="text-lg font-semibold text-white">{member.idNumber || 'N/A'}</p>
          </div>
          {memberType !== 'admin' ? (
            <div className="rounded-xl border border-white/15 bg-white/5 p-5 shadow-[0_12px_30px_rgba(8,47,73,0.18)] backdrop-blur-md">
              <p className="mb-1 text-sm text-slate-200">Role</p>
              <p className="text-lg font-semibold text-white">
                {memberType === 'oic' ? 'OIC' : 'Member'}
              </p>
            </div>
          ) : null}
          <div className="rounded-xl border border-white/15 bg-white/5 p-5 shadow-[0_12px_30px_rgba(8,47,73,0.18)] backdrop-blur-md">
            <p className="mb-1 text-sm text-slate-200">Status</p>
            <p className={`text-lg font-semibold flex items-center gap-2 ${
              member.status === 'inactive' ? 'text-slate-200' : 'text-green-300'
            }`}>
              <span className={`w-2 h-2 rounded-full ${
                member.status === 'inactive' ? 'bg-gray-500' : 'bg-green-500'
              }`}></span>
              {member.status === 'inactive' ? 'Inactive' : 'Active'}
            </p>
          </div>
          <div className="rounded-xl border border-white/15 bg-white/5 p-5 shadow-[0_12px_30px_rgba(8,47,73,0.18)] backdrop-blur-md">
            <p className="mb-1 text-sm text-slate-200">Member Since</p>
            <p className="text-lg font-semibold text-white">
              {joinedDateLabel}
            </p>
          </div>
          <div className="rounded-xl border border-white/15 bg-white/5 p-5 shadow-[0_12px_30px_rgba(8,47,73,0.18)] backdrop-blur-md">
            <p className="mb-1 text-sm text-slate-200">Address</p>
            <p className="text-lg font-semibold text-white">{member.address || 'N/A'}</p>
          </div>
          <div className="rounded-xl border border-white/15 bg-white/5 p-5 shadow-[0_12px_30px_rgba(8,47,73,0.18)] backdrop-blur-md">
            <p className="mb-1 text-sm text-slate-200">Contact Number</p>
            <p className="text-lg font-semibold text-white">{member.contactNumber || 'N/A'}</p>
          </div>
          <div className="rounded-xl border border-white/15 bg-white/5 p-5 shadow-[0_12px_30px_rgba(8,47,73,0.18)] backdrop-blur-md lg:col-span-2">
            <p className="mb-2 text-sm font-bold text-white">In Case of Emergency</p>
            <div className="space-y-1 text-sm font-semibold text-white">
              <p>
                <span className="font-bold text-white">Number:</span> {member.emergencyContactNumber || 'N/A'}
              </p>
              <p>
                <span className="font-bold text-white">Name:</span> {member.emergencyContactName || 'N/A'}
              </p>
              <p>
                <span className="font-bold text-white">Relationship:</span> {member.emergencyContactRelationship || 'N/A'}
              </p>
            </div>
          </div>
          <div className="rounded-xl border border-white/15 bg-white/5 p-5 shadow-[0_12px_30px_rgba(8,47,73,0.18)] backdrop-blur-md">
            <p className="mb-1 text-sm text-slate-200">Blood Type</p>
            <p className="text-lg font-semibold text-white">{member.bloodType || 'N/A'}</p>
          </div>
          <div className="rounded-xl border border-white/15 bg-white/5 p-5 shadow-[0_12px_30px_rgba(8,47,73,0.18)] backdrop-blur-md">
            <p className="mb-1 text-sm text-slate-200">Insurance</p>
            <p className="text-lg font-semibold text-white">
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
            <div
              className="max-h-[calc(100vh-2rem)] w-full max-w-md overflow-y-auto rounded-xl border border-white/20 p-6 shadow-2xl animate-fade-in"
              style={{
                background: 'linear-gradient(145deg, rgba(14,116,144,0.88), rgba(30,64,175,0.84) 52%, rgba(59,130,246,0.78))',
                boxShadow: '0 24px 70px rgba(8,47,73,0.34), inset 0 1px 0 rgba(255,255,255,0.14)',
                backdropFilter: 'blur(20px)',
              }}
            >
            <h3 className="mb-4 text-lg font-semibold text-white">Update Member</h3>
            <form onSubmit={handleUpdateMember} className="space-y-4">
              <div>
                <label htmlFor="update-member-id-number" className="mb-1 block text-sm font-medium text-white/85">ID Number</label>
                <input
                  id="update-member-id-number"
                  name="idNumber"
                  type="text"
                  required
                  value={editForm.idNumber}
                  onChange={(e) => setEditForm({ ...editForm, idNumber: e.target.value })}
                  className="w-full rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-red-500"
                  autoComplete="off"
                />
              </div>
              <div>
                <label htmlFor="update-member-name" className="mb-1 block text-sm font-medium text-white/85">Name</label>
                <input
                  id="update-member-name"
                  name="name"
                  type="text"
                  required
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="w-full rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                  autoComplete="name"
                />
              </div>
              <div>
                <label htmlFor="update-member-email" className="mb-1 block text-sm font-medium text-white/85">Email</label>
                <input
                  id="update-member-email"
                  name="email"
                  type="email"
                  required
                  value={editForm.email}
                  onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                  className="w-full rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                  autoComplete="email"
                />
              </div>
              <div>
                <label htmlFor="update-member-address" className="mb-1 block text-sm font-medium text-white/85">Address</label>
                <input
                  id="update-member-address"
                  name="address"
                  type="text"
                  value={editForm.address}
                  onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                  className="w-full rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                  autoComplete="street-address"
                />
              </div>
              <div>
                <label htmlFor="update-member-contact-number" className="mb-1 block text-sm font-medium text-white/85">Contact Number</label>
                <input
                  id="update-member-contact-number"
                  name="contactNumber"
                  type="text"
                  value={editForm.contactNumber}
                  onChange={(e) => setEditForm({ ...editForm, contactNumber: e.target.value })}
                  className="w-full rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                  autoComplete="tel"
                />
              </div>
              <div className="border-t border-white/15 pt-2">
                <p className="text-sm font-medium text-white">In Case of Emergency</p>
                <p className="text-xs text-white/65">Emergency contact details for this member.</p>
              </div>
              <div>
                <label htmlFor="update-member-emergency-number" className="mb-1 block text-sm font-medium text-white/85">Emergency Number</label>
                <input
                  id="update-member-emergency-number"
                  name="emergencyContactNumber"
                  type="tel"
                  value={editForm.emergencyContactNumber}
                  onChange={(e) => setEditForm({ ...editForm, emergencyContactNumber: e.target.value })}
                  className="w-full rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                  autoComplete="tel"
                />
              </div>
              <div>
                <label htmlFor="update-member-emergency-name" className="mb-1 block text-sm font-medium text-white/85">Emergency Contact Name</label>
                <input
                  id="update-member-emergency-name"
                  name="emergencyContactName"
                  type="text"
                  value={editForm.emergencyContactName}
                  onChange={(e) => setEditForm({ ...editForm, emergencyContactName: e.target.value })}
                  className="w-full rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                  autoComplete="name"
                />
              </div>
              <div>
                <label htmlFor="update-member-emergency-relationship" className="mb-1 block text-sm font-medium text-white/85">Relationship</label>
                <input
                  id="update-member-emergency-relationship"
                  name="emergencyContactRelationship"
                  type="text"
                  value={editForm.emergencyContactRelationship}
                  onChange={(e) => setEditForm({ ...editForm, emergencyContactRelationship: e.target.value })}
                  className="w-full rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                  autoComplete="off"
                />
              </div>
              <div>
                <label htmlFor="update-member-type" className="mb-1 block text-sm font-medium text-white/85">Type</label>
                <select
                  id="update-member-type"
                  name="type"
                  value={editForm.type}
                  onChange={(e) => {
                    const next = e.target.value
                    setEditForm(prev => {
                      if (next === 'admin') {
                        return { ...prev, type: 'admin', committeeRole: 'Member', committee: '' }
                      }
                      if (next === 'oic') {
                        return { ...prev, type: 'oic', committeeRole: 'OIC', committee: '' }
                      }
                      return {
                        ...prev,
                        type: 'member',
                        committeeRole: 'Member',
                        committee: prev.committee || (Array.isArray(committees) ? committees[0] : '') || '',
                      }
                    })
                  }}
                  disabled={!isAdmin || (isSelf && member?.role === 'admin')}
                  className="w-full rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-60"
                >
                  <option value="member">Member</option>
                  <option value="oic">OIC</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              {editForm.type === 'member' ? (
                <div>
                  <label htmlFor="update-member-committee" className="mb-1 block text-sm font-medium text-white/85">Committee</label>
                  <select
                    id="update-member-committee"
                    name="committee"
                    value={editForm.committee}
                    onChange={(e) => setEditForm({ ...editForm, committee: e.target.value })}
                    className="w-full rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                  >
                    <option value="">Select committee</option>
                    {(Array.isArray(committees) ? committees : []).map(name => (
                      <option key={name} value={name}>
                        {name}
                      </option>
                    ))}
                  </select>
                </div>
              ) : null}
              <div>
                <label htmlFor="update-member-blood-type" className="mb-1 block text-sm font-medium text-white/85">Blood Type</label>
                <select
                  id="update-member-blood-type"
                  name="bloodType"
                  value={editForm.bloodType}
                  onChange={(e) => setEditForm({ ...editForm, bloodType: e.target.value })}
                  className="w-full rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-red-500"
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
                  <label htmlFor="update-member-insurance-status" className="mb-1 block text-sm font-medium text-white/85">
                    Insurance Status
                  </label>
                  <div className="relative">
                    <Shield size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/60" />
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
                      className="w-full rounded-lg border border-white/20 bg-white/10 py-2 pl-10 pr-3 text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                    >
                      <option value="N/A">Not Insured</option>
                      <option value="Insured">Insured</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label htmlFor="update-member-insurance-year" className="mb-1 block text-sm font-medium text-white/85">
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
                    className="w-full rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-60"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="update-member-status" className="mb-1 block text-sm font-medium text-white/85">Status</label>
                  <select
                    id="update-member-status"
                    name="status"
                    value={editForm.status}
                    onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                    className="w-full rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="update-member-since" className="mb-1 block text-sm font-medium text-white/85">Member Since</label>
                  <input
                    id="update-member-since"
                    name="memberSince"
                    type="date"
                    value={editForm.memberSince}
                    onChange={(e) => setEditForm({ ...editForm, memberSince: e.target.value })}
                    className="w-full rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="update-member-new-password" className="mb-1 block text-sm font-medium text-white/85">
                  New Password (optional)
                </label>
                <div className="relative">
                  <input
                    id="update-member-new-password"
                    name="newPassword"
                    type={showNewPassword ? 'text' : 'password'}
                    value={editForm.newPassword}
                    onChange={(e) => setEditForm({ ...editForm, newPassword: e.target.value })}
                    className="w-full rounded-lg border border-white/20 bg-white/10 px-3 py-2 pr-10 text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-red-500"
                    autoComplete="new-password"
                    placeholder="Leave blank to keep current password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(prev => !prev)}
                    className="absolute inset-y-0 right-0 flex items-center px-3 text-white/60 hover:text-white"
                    aria-label={showNewPassword ? 'Hide password' : 'Show password'}
                  >
                    {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <div>
                <label htmlFor="update-member-image" className="mb-1 block text-sm font-medium text-white/85">
                  Profile Image (optional)
                </label>
                <div className="flex items-center gap-3 rounded-lg border border-white/20 bg-white/10 px-3 py-2">
                  <label
                    htmlFor="update-member-image"
                    className="inline-flex cursor-pointer items-center justify-center rounded-md border border-white/15 bg-white/10 px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-white/15"
                  >
                    Choose File
                  </label>
                  <span className="min-w-0 truncate text-sm text-white/85">
                    {newProfileImageFile?.name || 'No file chosen'}
                  </span>
                </div>
                <input
                  id="update-member-image"
                  name="profileImage"
                  type="file"
                  accept="image/*"
                  onChange={(e) => setNewProfileImageFile(e.target.files?.[0] || null)}
                  className="sr-only"
                />
              </div>

              <div className="flex flex-wrap justify-between gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowUpdateModal(false)}
                  className="rounded-lg border border-white/15 bg-white/10 px-4 py-2 text-white transition-colors hover:bg-white/15"
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
                    className="rounded-lg bg-red-600 px-4 py-2 text-white transition-colors hover:bg-red-700"
                  >
                    Delete Member
                  </button>
                  <button
                    type="submit"
                    className="rounded-lg bg-red-600 px-4 py-2 text-white transition-colors hover:bg-red-700"
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
