import { useEffect, useMemo, useState } from 'react'
import {
  Users,
  Search,
  Mail,
  Calendar,
  Filter,
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  XCircle,
  BadgeCheck,
  Hash,
  Phone,
  MapPin,
  Droplets,
  Shield,
  Eye,
  EyeOff,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'
import dayjs from 'dayjs'

/* eslint-disable react-hooks/set-state-in-effect */

const ROLE_OPTIONS = [
  { value: 'member', label: 'Member' },
  { value: 'admin', label: 'Admin' },
]
const BLOOD_TYPE_OPTIONS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']

function Members() {
  const {
    user,
    getAllMembers,
    getAdmins,
    createMember,
    committees,
    eventCategories,
    addCommittee,
    editCommittee,
    deleteCommittee,
    addEventCategory,
    editEventCategory,
    deleteEventCategory,
    getRecruitments,
    rejectRecruitment,
  } = useAuth()
  const navigate = useNavigate()
  const [searchQuery, setSearchQuery] = useState('')
  const [roleFilter, setRoleFilter] = useState('member')
  const [committeeFilter, setCommitteeFilter] = useState('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [committeeName, setCommitteeName] = useState('')
  const [committeeActionBusy, setCommitteeActionBusy] = useState(false)
  const [showEditCommitteeModal, setShowEditCommitteeModal] = useState(false)
  const [committeeToEdit, setCommitteeToEdit] = useState('')
  const [editedCommitteeName, setEditedCommitteeName] = useState('')
  const [showDeleteCommitteeModal, setShowDeleteCommitteeModal] = useState(false)
  const [committeeToDelete, setCommitteeToDelete] = useState('')
  const [fallbackCommittee, setFallbackCommittee] = useState('')
  const [committeeError, setCommitteeError] = useState('')
  const [eventCategoryName, setEventCategoryName] = useState('')
  const [eventCategoryActionBusy, setEventCategoryActionBusy] = useState(false)
  const [eventCategoryError, setEventCategoryError] = useState('')
  const [showEditEventCategoryModal, setShowEditEventCategoryModal] = useState(false)
  const [eventCategoryToEdit, setEventCategoryToEdit] = useState('')
  const [editedEventCategoryName, setEditedEventCategoryName] = useState('')
  const [showDeleteEventCategoryModal, setShowDeleteEventCategoryModal] = useState(false)
  const [eventCategoryToDelete, setEventCategoryToDelete] = useState('')
  const [fallbackEventCategory, setFallbackEventCategory] = useState('')
  const [formError, setFormError] = useState('')
  const [recruitmentActionError, setRecruitmentActionError] = useState('')
  const [expandedRecruitmentId, setExpandedRecruitmentId] = useState(null)
  const [pendingApprovalRecruitmentId, setPendingApprovalRecruitmentId] = useState(null)
	  const [newMember, setNewMember] = useState({
	    name: '',
	    idNumber: '',
	    password: '',
	    address: '',
	    contactNumber: '',
    bloodType: '',
    memberSince: dayjs().format('YYYY-MM-DD'),
    role: ROLE_OPTIONS[0].value,
    committee: committees[0] || '',
  })
  const [showTempPassword, setShowTempPassword] = useState(false)
  const membersPerPage = 9

  const members = getAllMembers()
  const admins = getAdmins()
  const isAdmin = user?.role === 'admin'
  const recruitments = getRecruitments()

  const pendingRecruitments = useMemo(
    () => recruitments.filter(item => item.status === 'pending'),
    [recruitments]
  )
  const processedRecruitments = useMemo(
    () => recruitments.filter(item => item.status !== 'pending'),
    [recruitments]
  )

  const committeeOptions = useMemo(() => {
    const list = Array.isArray(committees) ? committees : []
    const normalized = list.map(name => String(name || '').trim()).filter(Boolean)
    const unique = [...new Set(normalized)]
    unique.sort((a, b) => a.localeCompare(b))
    return unique
  }, [committees])

  const titleCaseFromKey = (key) =>
    String(key || '')
      .trim()
      .replace(/_/g, ' ')
      .replace(/\w\S*/g, word => word.charAt(0).toUpperCase() + word.slice(1))

  const eventCategoryOptions = useMemo(() => {
    const list = Array.isArray(eventCategories) ? eventCategories : []
    const normalized = list.map(name => String(name || '').trim()).filter(Boolean)
    const unique = [...new Set(normalized)]
    unique.sort((a, b) => (titleCaseFromKey(a) || a).localeCompare(titleCaseFromKey(b) || b))
    return unique
  }, [eventCategories])

  useEffect(() => {
    if (committeeOptions.length === 0) return
    setNewMember(prev => {
      const currentCommittee = String(prev?.committee || '').trim()
      if (currentCommittee && committeeOptions.includes(currentCommittee)) return prev
      return { ...prev, committee: committeeOptions[0] }
    })
  }, [committeeOptions])

  useEffect(() => {
    if (committeeFilter === 'all') return
    if (committeeOptions.includes(committeeFilter)) return
    setCommitteeFilter('all')
  }, [committeeFilter, committeeOptions])

  const visibleUsers = roleFilter === 'admin' ? admins : members

  const filteredMembers = visibleUsers.filter(member => {
    const matchesSearch =
      member.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (member.email || member.idNumber || '').toLowerCase().includes(searchQuery.toLowerCase())
    const matchesCommittee = committeeFilter === 'all' || member.committee === committeeFilter
    return matchesSearch && matchesCommittee
  })

  const indexOfLastMember = currentPage * membersPerPage
  const indexOfFirstMember = indexOfLastMember - membersPerPage
  const currentMembers = filteredMembers.slice(indexOfFirstMember, indexOfLastMember)
  const totalPages = Math.ceil(filteredMembers.length / membersPerPage)

  const getRoleBadge = role => {
    return role === 'admin'
      ? 'bg-red-100 text-red-700 border-red-200'
      : 'bg-blue-100 text-blue-700 border-blue-200'
  }

  const handleViewMember = memberId => {
    navigate(`/members/${memberId}`)
  }

  const userCountByCommittee = (() => {
    const map = {}
    const allUsers = [...admins, ...members]
    allUsers.forEach(member => {
      const committee = String(member?.committee || '').trim()
      if (!committee) return
      map[committee] = (map[committee] || 0) + 1
    })
    return map
  })()

  const handleCommitteeAdd = async (e) => {
    e.preventDefault()
    if (!isAdmin) return
    setCommitteeError('')

    const name = committeeName.trim()
    if (!name) {
      setCommitteeError('Committee name is required.')
      return
    }

    const exists = committeeOptions.some(item => item.toLowerCase() === name.toLowerCase())
    if (exists) {
      setCommitteeError('Committee already exists.')
      return
    }

    setCommitteeActionBusy(true)
    const result = await addCommittee(name)
    setCommitteeActionBusy(false)

    if (!result.success) {
      setCommitteeError(result.message)
      return
    }

    setCommitteeName('')
  }

  const openEditCommittee = (name) => {
    if (!isAdmin) return
    setCommitteeError('')
    setCommitteeToEdit(name)
    setEditedCommitteeName(name)
    setShowEditCommitteeModal(true)
  }

  const handleCommitteeRename = async (e) => {
    e.preventDefault()
    if (!isAdmin) return
    setCommitteeError('')

    const source = committeeToEdit.trim()
    const target = editedCommitteeName.trim()

    if (!source) {
      setCommitteeError('Select a committee to edit.')
      return
    }

    if (!target) {
      setCommitteeError('New committee name is required.')
      return
    }

    const exists = committeeOptions.some(item => item.toLowerCase() === target.toLowerCase() && item !== source)
    if (exists) {
      setCommitteeError('Committee name already exists.')
      return
    }

    setCommitteeActionBusy(true)
    const result = await editCommittee(source, target)
    setCommitteeActionBusy(false)

    if (!result.success) {
      setCommitteeError(result.message)
      return
    }

    setShowEditCommitteeModal(false)

    setCommitteeFilter(prev => (prev === source ? target : prev))
    setNewMember(prev => (prev.committee === source ? { ...prev, committee: target } : prev))
  }

  const openDeleteCommittee = (name) => {
    if (!isAdmin) return
    setCommitteeError('')
    setCommitteeToDelete(name)
    const fallback = committeeOptions.find(item => item !== name) || ''
    setFallbackCommittee(fallback)
    setShowDeleteCommitteeModal(true)
  }

  const handleCommitteeDelete = async () => {
    if (!isAdmin) return
    setCommitteeError('')

    const committee = committeeToDelete.trim()
    if (!committee) {
      setCommitteeError('Select a committee to delete.')
      return
    }

    const affectedCount = userCountByCommittee[committee] || 0
    const fallback = fallbackCommittee.trim()

    if (affectedCount > 0) {
      if (!fallback) {
        setCommitteeError('Select a committee to reassign members to before deleting.')
        return
      }
      if (fallback === committee) {
        setCommitteeError('Fallback committee must be different.')
        return
      }
    }

    if (!fallback && committeeOptions.length <= 1) {
      setCommitteeError('Add another committee before deleting the last one.')
      return
    }

    setCommitteeActionBusy(true)
    const result = await deleteCommittee(committee, fallback || null)
    setCommitteeActionBusy(false)

    if (!result.success) {
      setCommitteeError(result.message)
      return
    }

    setShowDeleteCommitteeModal(false)

    setCommitteeFilter(prev => (prev === committee ? 'all' : prev))
    setNewMember(prev => {
      if (prev.committee !== committee) return prev
      const nextCommittee = fallback || committeeOptions.find(item => item !== committee) || ''
      return { ...prev, committee: nextCommittee }
    })
  }

  const handleEventCategoryAdd = async (e) => {
    e.preventDefault()
    if (!isAdmin) return
    setEventCategoryError('')

    const name = eventCategoryName.trim()
    if (!name) {
      setEventCategoryError('Category name is required.')
      return
    }

    const exists = eventCategoryOptions.some(item => item.toLowerCase() === name.toLowerCase())
    if (exists) {
      setEventCategoryError('Category already exists.')
      return
    }

    setEventCategoryActionBusy(true)
    const result = await addEventCategory(name)
    setEventCategoryActionBusy(false)

    if (!result.success) {
      setEventCategoryError(result.message || 'Unable to add category.')
      return
    }

    setEventCategoryName('')
  }

  const openEditEventCategory = (name) => {
    if (!isAdmin) return
    setEventCategoryError('')
    setEventCategoryToEdit(name)
    setEditedEventCategoryName(name)
    setShowEditEventCategoryModal(true)
  }

  const handleEventCategoryRename = async (e) => {
    e.preventDefault()
    if (!isAdmin) return
    setEventCategoryError('')

    const source = eventCategoryToEdit.trim()
    const target = editedEventCategoryName.trim()

    if (!source) {
      setEventCategoryError('Select a category to edit.')
      return
    }

    if (!target) {
      setEventCategoryError('New category name is required.')
      return
    }

    const exists = eventCategoryOptions.some(item => item.toLowerCase() === target.toLowerCase() && item !== source)
    if (exists) {
      setEventCategoryError('Category name already exists.')
      return
    }

    setEventCategoryActionBusy(true)
    const result = await editEventCategory(source, target)
    setEventCategoryActionBusy(false)

    if (!result.success) {
      setEventCategoryError(result.message || 'Unable to update category.')
      return
    }

    setShowEditEventCategoryModal(false)
  }

  const openDeleteEventCategory = (name) => {
    if (!isAdmin) return
    setEventCategoryError('')
    setEventCategoryToDelete(name)
    const fallback = eventCategoryOptions.find(item => item !== name) || ''
    setFallbackEventCategory(fallback)
    setShowDeleteEventCategoryModal(true)
  }

  const handleEventCategoryDelete = async () => {
    if (!isAdmin) return
    setEventCategoryError('')

    const category = eventCategoryToDelete.trim()
    if (!category) {
      setEventCategoryError('Select a category to delete.')
      return
    }

    const fallback = fallbackEventCategory.trim()
    if (fallback && fallback === category) {
      setEventCategoryError('Fallback category must be different.')
      return
    }

    setEventCategoryActionBusy(true)
    const result = await deleteEventCategory(category, fallback || null)
    setEventCategoryActionBusy(false)

    if (!result.success) {
      setEventCategoryError(result.message || 'Unable to delete category.')
      return
    }

    setShowDeleteEventCategoryModal(false)
  }

	  const handleCreateMember = async (e) => {
	    e.preventDefault()
	    setFormError('')
	    const result = await createMember({
	      ...newMember,
	      recruitmentId: pendingApprovalRecruitmentId || undefined,
	    })
    if (!result.success) {
      setFormError(result.message)
      return
    }
	    setNewMember({
	      name: '',
	      idNumber: '',
	      password: '',
	      address: '',
	      contactNumber: '',
      bloodType: '',
      memberSince: dayjs().format('YYYY-MM-DD'),
      role: ROLE_OPTIONS[0].value,
      committee: committeeOptions[0] || '',
    })
    setPendingApprovalRecruitmentId(null)
    setRecruitmentActionError('')
  }

  const getStatusBadgeClass = status => {
    if (status === 'approved') return 'bg-green-100 text-green-700 border-green-200'
    if (status === 'rejected') return 'bg-red-100 text-red-700 border-red-200'
    return 'bg-amber-100 text-amber-700 border-amber-200'
  }

	  const handleApproveRecruitment = (recruitment) => {
	    setRecruitmentActionError('')
	    setPendingApprovalRecruitmentId(recruitment.id)
	    setNewMember({
	      name: recruitment.fullName,
	      idNumber: recruitment.idNumber || '',
	      password: '',
	      address: recruitment.address || '',
	      contactNumber: recruitment.contactNumber || '',
      bloodType: recruitment.bloodType || '',
      memberSince: dayjs().format('YYYY-MM-DD'),
      role: ROLE_OPTIONS[0].value,
      committee: committeeOptions[0] || '',
    })
    const createMemberSection = document.getElementById('create-member-form')
    if (createMemberSection) {
      createMemberSection.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }

	  const handleRejectRecruitment = async (recruitmentId) => {
	    setRecruitmentActionError('')
	    const result = await rejectRecruitment(recruitmentId)
	    if (!result.success) {
	      setRecruitmentActionError(result.message)
	      return
	    }
    if (pendingApprovalRecruitmentId === recruitmentId) {
      setPendingApprovalRecruitmentId(null)
    }
  }

  const deletingCommitteeAssignedCount = committeeToDelete ? (userCountByCommittee[committeeToDelete] || 0) : 0

  return (
    <div className="animate-fade-in text-gray-900 dark:text-zinc-100">
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 dark:text-zinc-100">Management</h2>
          <p className="text-sm text-gray-500 dark:text-zinc-400">Manage users by role and committee</p>
        </div>
      </div>

      {isAdmin && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-6">
          <div className="bg-white dark:bg-zinc-900 border border-red-600 rounded-2xl shadow-md p-5">
            <div className="flex items-center justify-between gap-3 mb-3">
              <h3 className="font-semibold text-gray-800 dark:text-zinc-100">Committee Management</h3>
              <button
                type="button"
                onClick={() => {
                  const el = document.getElementById('event-category-management')
                  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
                }}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 transition-colors dark:bg-zinc-900 dark:text-zinc-300 dark:border-zinc-700 dark:hover:bg-zinc-800"
              >
                Categories
              </button>
            </div>
            {committeeError && <p className="text-sm text-red-600 mb-3">{committeeError}</p>}

            <form onSubmit={handleCommitteeAdd} className="flex flex-col sm:flex-row gap-2 mb-4">
              <input
                type="text"
                value={committeeName}
                onChange={e => setCommitteeName(e.target.value)}
                placeholder="New committee name"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                disabled={committeeActionBusy}
              />
              <button
                type="submit"
                className="px-4 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                disabled={committeeActionBusy}
              >
                Add
              </button>
            </form>

            <div className="space-y-2 max-h-[420px] overflow-auto pr-1">
              {committeeOptions.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-zinc-400">No committees available.</p>
              ) : (
                committeeOptions.map(name => (
                  <div
                    key={name}
                    className="flex items-start justify-between gap-3 rounded-xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 px-3 py-2"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-800 dark:text-zinc-100 truncate">{name}</p>
                      <p className="text-xs text-gray-500 dark:text-zinc-400 mt-0.5">
                        {userCountByCommittee[name] || 0} assigned
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <button
                        type="button"
                        onClick={() => openEditCommittee(name)}
                        className="px-3 py-1.5 rounded-lg text-sm bg-blue-600 text-white hover:bg-blue-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                        disabled={committeeActionBusy}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => openDeleteCommittee(name)}
                        className="px-3 py-1.5 rounded-lg text-sm bg-red-600 text-white hover:bg-red-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                        disabled={committeeActionBusy}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

          </div>

          <div className="bg-white border border-red-600 rounded-2xl shadow-md p-5">
            <h3 className="font-semibold text-gray-800 mb-3">Create Member</h3>
            {pendingApprovalRecruitmentId && (
              <div className="mb-3 p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-sm">
                Recruitment approval in progress. Complete member creation to mark this application as approved.
              </div>
            )}
            {formError && <p className="text-sm text-red-600 mb-2">{formError}</p>}
            <form id="create-member-form" onSubmit={handleCreateMember} className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Full Name</label>
                <input
                  type="text"
                  placeholder="Full name"
                  value={newMember.name}
                  onChange={e => setNewMember({ ...newMember, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                  required
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">ID Number</label>
                <input
                  type="text"
                  placeholder="ID Number"
                  value={newMember.idNumber}
                  onChange={e => setNewMember({ ...newMember, idNumber: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                  required
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Temporary Password</label>
                <div className="relative">
                  <input
                    type={showTempPassword ? 'text' : 'password'}
                    placeholder="Temporary password"
                    value={newMember.password}
                    onChange={e => setNewMember({ ...newMember, password: e.target.value })}
                    className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowTempPassword(prev => !prev)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-red-600"
                    aria-label={showTempPassword ? 'Hide password' : 'Show password'}
                    title={showTempPassword ? 'Hide password' : 'Show password'}
                  >
                    {showTempPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Address</label>
                <input
                  type="text"
                  placeholder="Address"
                  value={newMember.address}
                  onChange={e => setNewMember({ ...newMember, address: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Contact Number</label>
                <input
                  type="text"
                  placeholder="Contact Number"
                  value={newMember.contactNumber}
                  onChange={e => setNewMember({ ...newMember, contactNumber: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Blood Type</label>
                <select
                  value={newMember.bloodType}
                  onChange={e => setNewMember({ ...newMember, bloodType: e.target.value })}
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
              <div>
                <label className="block text-xs text-gray-500 mb-1">Member Since</label>
                <input
                  type="date"
                  value={newMember.memberSince}
                  onChange={e => setNewMember({ ...newMember, memberSince: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Type</label>
                <select
                  value={newMember.role}
                  onChange={e => setNewMember({ ...newMember, role: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                  required
                >
                  {ROLE_OPTIONS.map(roleOption => (
                    <option key={roleOption.value} value={roleOption.value}>
                      {roleOption.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Committee</label>
                <select
                  value={newMember.committee}
                  onChange={e => setNewMember({ ...newMember, committee: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                  required
                >
                  {committeeOptions.map(committee => (
                    <option key={committee} value={committee}>
                      {committee}
                    </option>
                  ))}
                </select>
              </div>
              <button
                type="submit"
                className="md:col-span-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                {pendingApprovalRecruitmentId ? 'Approve & Create Account' : 'Create Member'}
              </button>
            </form>
          </div>
        </div>
      )}

      {isAdmin && (
        <div
          id="event-category-management"
          className="bg-white dark:bg-zinc-900 border border-red-600 rounded-2xl shadow-md p-5 mb-6"
        >
          <h3 className="font-semibold text-gray-800 dark:text-zinc-100 mb-3">Event Category Management</h3>
          {eventCategoryError && <p className="text-sm text-red-600 mb-3">{eventCategoryError}</p>}

          <form onSubmit={handleEventCategoryAdd} className="flex flex-col sm:flex-row gap-2 mb-4">
            <input
              type="text"
              value={eventCategoryName}
              onChange={e => setEventCategoryName(e.target.value)}
              placeholder="New event category (e.g. Water Distribution)"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
              disabled={eventCategoryActionBusy}
            />
            <button
              type="submit"
              className="px-4 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              disabled={eventCategoryActionBusy}
            >
              Add
            </button>
          </form>

          <div className="space-y-2 max-h-[420px] overflow-auto pr-1">
            {eventCategoryOptions.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-zinc-400">No categories available.</p>
            ) : (
              eventCategoryOptions.map(name => (
                <div
                  key={name}
                  className="flex items-start justify-between gap-3 rounded-xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 px-3 py-2"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-800 dark:text-zinc-100 truncate">{titleCaseFromKey(name)}</p>
                    <p className="text-xs text-gray-500 dark:text-zinc-400 mt-0.5 break-all">
                      Key: <span className="font-mono">{name}</span>
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <button
                      type="button"
                      onClick={() => openEditEventCategory(name)}
                      className="px-3 py-1.5 rounded-lg text-sm bg-blue-600 text-white hover:bg-blue-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                      disabled={eventCategoryActionBusy}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => openDeleteEventCategory(name)}
                      className="px-3 py-1.5 rounded-lg text-sm bg-red-600 text-white hover:bg-red-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                      disabled={eventCategoryActionBusy}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {isAdmin && showEditCommitteeModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="w-full max-w-xl bg-white dark:bg-zinc-900 rounded-xl shadow-2xl p-5 space-y-4 animate-fade-in-up">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-gray-800 dark:text-zinc-100">Edit Committee</h3>
              <button
                type="button"
                onClick={() => {
                  if (committeeActionBusy) return
                  setShowEditCommitteeModal(false)
                  setCommitteeToEdit('')
                  setEditedCommitteeName('')
                  setCommitteeError('')
                }}
                className="px-3 py-1.5 bg-gray-100 dark:bg-zinc-800 text-gray-700 dark:text-zinc-100 rounded-lg hover:bg-gray-200 dark:hover:bg-zinc-700 transition-colors text-sm disabled:opacity-60 disabled:cursor-not-allowed"
                disabled={committeeActionBusy}
              >
                Close
              </button>
            </div>

            <form onSubmit={handleCommitteeRename} className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <input
                type="text"
                value={editedCommitteeName}
                onChange={e => setEditedCommitteeName(e.target.value)}
                placeholder="New committee name"
                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                required
              />
              <button
                type="submit"
                className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                disabled={committeeActionBusy}
              >
                Save
              </button>
            </form>
          </div>
        </div>
      )}

      {isAdmin && showDeleteCommitteeModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="w-full max-w-xl bg-white dark:bg-zinc-900 rounded-xl shadow-2xl p-5 space-y-4 animate-fade-in-up">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-gray-800 dark:text-zinc-100">Delete Committee</h3>
              <button
                type="button"
                onClick={() => {
                  if (committeeActionBusy) return
                  setShowDeleteCommitteeModal(false)
                  setCommitteeToDelete('')
                  setFallbackCommittee('')
                  setCommitteeError('')
                }}
                className="px-3 py-1.5 bg-gray-100 dark:bg-zinc-800 text-gray-700 dark:text-zinc-100 rounded-lg hover:bg-gray-200 dark:hover:bg-zinc-700 transition-colors text-sm disabled:opacity-60 disabled:cursor-not-allowed"
                disabled={committeeActionBusy}
              >
                Close
              </button>
            </div>

            {committeeError && <p className="text-sm text-red-600">{committeeError}</p>}

            <div className="rounded-lg border border-red-200 bg-red-50 dark:bg-red-950/30 p-4 space-y-3">
              <p className="text-sm text-red-700 dark:text-red-200">
                You are about to delete <span className="font-semibold">{committeeToDelete}</span>.
              </p>
              <p className="text-xs text-red-700 dark:text-red-200">
                Assigned users: <span className="font-semibold tabular-nums">{deletingCommitteeAssignedCount}</span>
              </p>

              {deletingCommitteeAssignedCount > 0 && (
                <div>
                  <label className="block text-xs text-gray-700 dark:text-zinc-200 mb-1">Reassign users to</label>
                  <select
                    value={fallbackCommittee}
                    onChange={e => setFallbackCommittee(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                  >
                    <option value="">Select a committee</option>
                    {committeeOptions
                      .filter(name => name !== committeeToDelete)
                      .map(name => (
                        <option key={name} value={name}>
                          {name}
                        </option>
                      ))}
                  </select>
                </div>
              )}

              <div className="flex flex-wrap items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    if (committeeActionBusy) return
                    setShowDeleteCommitteeModal(false)
                    setCommitteeToDelete('')
                    setFallbackCommittee('')
                    setCommitteeError('')
                  }}
                  className="px-4 py-2 rounded-lg bg-gray-100 dark:bg-zinc-800 text-gray-700 dark:text-zinc-100 hover:bg-gray-200 dark:hover:bg-zinc-700 transition-colors text-sm disabled:opacity-60 disabled:cursor-not-allowed"
                  disabled={committeeActionBusy}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleCommitteeDelete}
                  className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 transition-colors text-sm disabled:opacity-60 disabled:cursor-not-allowed"
                  disabled={committeeActionBusy}
                >
                  Confirm Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {isAdmin && showEditEventCategoryModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="w-full max-w-xl bg-white dark:bg-zinc-900 rounded-xl shadow-2xl p-5 space-y-4 animate-fade-in-up">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-gray-800 dark:text-zinc-100">Edit Event Category</h3>
              <button
                type="button"
                onClick={() => {
                  if (eventCategoryActionBusy) return
                  setShowEditEventCategoryModal(false)
                  setEventCategoryToEdit('')
                  setEditedEventCategoryName('')
                  setEventCategoryError('')
                }}
                className="px-3 py-1.5 bg-gray-100 dark:bg-zinc-800 text-gray-700 dark:text-zinc-100 rounded-lg hover:bg-gray-200 dark:hover:bg-zinc-700 transition-colors text-sm disabled:opacity-60 disabled:cursor-not-allowed"
                disabled={eventCategoryActionBusy}
              >
                Close
              </button>
            </div>

            {eventCategoryError && <p className="text-sm text-red-600">{eventCategoryError}</p>}

            <form onSubmit={handleEventCategoryRename} className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <input
                type="text"
                value={editedEventCategoryName}
                onChange={e => setEditedEventCategoryName(e.target.value)}
                placeholder="New category name"
                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                required
              />
              <button
                type="submit"
                className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                disabled={eventCategoryActionBusy}
              >
                Save
              </button>
            </form>
          </div>
        </div>
      )}

      {isAdmin && showDeleteEventCategoryModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="w-full max-w-xl bg-white dark:bg-zinc-900 rounded-xl shadow-2xl p-5 space-y-4 animate-fade-in-up">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-gray-800 dark:text-zinc-100">Delete Event Category</h3>
              <button
                type="button"
                onClick={() => {
                  if (eventCategoryActionBusy) return
                  setShowDeleteEventCategoryModal(false)
                  setEventCategoryToDelete('')
                  setFallbackEventCategory('')
                  setEventCategoryError('')
                }}
                className="px-3 py-1.5 bg-gray-100 dark:bg-zinc-800 text-gray-700 dark:text-zinc-100 rounded-lg hover:bg-gray-200 dark:hover:bg-zinc-700 transition-colors text-sm disabled:opacity-60 disabled:cursor-not-allowed"
                disabled={eventCategoryActionBusy}
              >
                Close
              </button>
            </div>

            {eventCategoryError && <p className="text-sm text-red-600">{eventCategoryError}</p>}

            <div className="rounded-lg border border-red-200 bg-red-50 dark:bg-red-950/30 p-4 space-y-3">
              <p className="text-sm text-red-700 dark:text-red-200">
                You are about to delete <span className="font-semibold">{titleCaseFromKey(eventCategoryToDelete)}</span>.
              </p>
              <p className="text-xs text-red-700 dark:text-red-200">
                If this category is used by existing events, you must choose a fallback category to reassign them.
              </p>

              <div>
                <label className="block text-xs text-gray-700 dark:text-zinc-200 mb-1">Fallback category (optional)</label>
                <select
                  value={fallbackEventCategory}
                  onChange={e => setFallbackEventCategory(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                >
                  <option value="">No fallback</option>
                  {eventCategoryOptions
                    .filter(name => name !== eventCategoryToDelete)
                    .map(name => (
                      <option key={name} value={name}>
                        {titleCaseFromKey(name)}
                      </option>
                    ))}
                </select>
              </div>

              <div className="flex flex-wrap items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    if (eventCategoryActionBusy) return
                    setShowDeleteEventCategoryModal(false)
                    setEventCategoryToDelete('')
                    setFallbackEventCategory('')
                    setEventCategoryError('')
                  }}
                  className="px-4 py-2 rounded-lg bg-gray-100 dark:bg-zinc-800 text-gray-700 dark:text-zinc-100 hover:bg-gray-200 dark:hover:bg-zinc-700 transition-colors text-sm disabled:opacity-60 disabled:cursor-not-allowed"
                  disabled={eventCategoryActionBusy}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleEventCategoryDelete}
                  className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 transition-colors text-sm disabled:opacity-60 disabled:cursor-not-allowed"
                  disabled={eventCategoryActionBusy}
                >
                  Confirm Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {isAdmin && (
        <div className="bg-white rounded-2xl shadow-md p-5 mb-6 animate-fade-in-up border border-red-600">
          <div className="flex items-center justify-between gap-3 mb-4">
            <div>
              <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                <BadgeCheck size={18} className="text-red-600" />
                Recruitment Inbox
              </h3>
              <p className="text-sm text-gray-500">Review pending applications and approve or reject.</p>
            </div>
            <span className="px-3 py-1 text-xs rounded-full bg-amber-100 text-amber-700 border border-amber-200">
              Pending: {pendingRecruitments.length}
            </span>
          </div>

          {recruitmentActionError && (
            <p className="text-sm text-red-600 mb-3">{recruitmentActionError}</p>
          )}

          <div className="space-y-3">
            {pendingRecruitments.length === 0 && (
              <div className="rounded-xl border border-dashed border-gray-300 p-5 text-center text-gray-500 text-sm">
                No pending recruitment applications.
              </div>
            )}

            {pendingRecruitments.map(entry => {
              const isExpanded = expandedRecruitmentId === entry.id
              return (
                <div key={entry.id} className="rounded-xl border border-gray-200 bg-gray-50 overflow-hidden transition-all duration-300">
                  <button
                    type="button"
                    onClick={() => setExpandedRecruitmentId(prev => (prev === entry.id ? null : entry.id))}
                    className="w-full text-left p-4"
                  >
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-semibold text-gray-800 truncate">{entry.fullName}</p>
                        <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500 mt-1">
                          <span>{entry.email}</span>
                          <span className="text-gray-300">|</span>
                          <span>{entry.idNumber || 'N/A'}</span>
                          <span className="text-gray-300">|</span>
                          <span>{dayjs(entry.submittedAt).format('MMM D, YYYY h:mm A')}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-1 text-xs rounded-full border font-medium ${getStatusBadgeClass(entry.status)}`}>
                          {entry.status.toUpperCase()}
                        </span>
                        {isExpanded ? <ChevronUp size={16} className="text-gray-500" /> : <ChevronDown size={16} className="text-gray-500" />}
                      </div>
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="px-4 pb-4 border-t border-gray-200 animate-fade-in-up">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 py-3">
                        <div className="rounded-lg bg-white border border-gray-200 p-3">
                          <p className="text-xs text-gray-500 mb-1">Full Name</p>
                          <p className="text-sm font-medium text-gray-800">{entry.fullName}</p>
                        </div>
                        <div className="rounded-lg bg-white border border-gray-200 p-3">
                          <p className="text-xs text-gray-500 mb-1 flex items-center gap-1"><Mail size={12} /> Email</p>
                          <p className="text-sm font-medium text-gray-800 break-all">{entry.email}</p>
                        </div>
                        <div className="rounded-lg bg-white border border-gray-200 p-3">
                          <p className="text-xs text-gray-500 mb-1 flex items-center gap-1"><Hash size={12} /> ID Number</p>
                          <p className="text-sm font-medium text-gray-800">{entry.idNumber || 'N/A'}</p>
                        </div>
                        <div className="rounded-lg bg-white border border-gray-200 p-3">
                          <p className="text-xs text-gray-500 mb-1 flex items-center gap-1"><Phone size={12} /> Contact Number</p>
                          <p className="text-sm font-medium text-gray-800">{entry.contactNumber || 'N/A'}</p>
                        </div>
                        <div className="rounded-lg bg-white border border-gray-200 p-3">
                          <p className="text-xs text-gray-500 mb-1 flex items-center gap-1"><MapPin size={12} /> Address</p>
                          <p className="text-sm font-medium text-gray-800 break-words">{entry.address || 'N/A'}</p>
                        </div>
                        <div className="rounded-lg bg-white border border-gray-200 p-3">
                          <p className="text-xs text-gray-500 mb-1 flex items-center gap-1"><Droplets size={12} /> Blood Type</p>
                          <p className="text-sm font-medium text-gray-800">{entry.bloodType || 'N/A'}</p>
                        </div>
                        <div className="rounded-lg bg-white border border-gray-200 p-3">
                          <p className="text-xs text-gray-500 mb-1 flex items-center gap-1"><Shield size={12} /> Insurance</p>
                          <p className="text-sm font-medium text-gray-800">{entry.insuranceStatus || 'N/A'}</p>
                        </div>
                        <div className="rounded-lg bg-white border border-gray-200 p-3">
                          <p className="text-xs text-gray-500 mb-1 flex items-center gap-1"><Calendar size={12} /> Insurance Year</p>
                          <p className="text-sm font-medium text-gray-800">{entry.insuranceYear || 'N/A'}</p>
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleApproveRecruitment(entry)}
                          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700 transition-colors text-sm"
                        >
                          <CheckCircle2 size={16} />
                          Approve & Create Account
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRejectRecruitment(entry.id)}
                          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 transition-colors text-sm"
                        >
                          <XCircle size={16} />
                          Reject Application
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {processedRecruitments.length > 0 && (
            <div className="mt-6 pt-5 border-t border-gray-200">
              <h4 className="text-sm font-semibold text-gray-700 mb-3">Processed Applications</h4>
              <div className="space-y-2">
                {processedRecruitments.map(entry => (
                  <div key={entry.id} className="rounded-lg border border-gray-200 p-3 bg-white">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-sm font-medium text-gray-800">{entry.fullName}</p>
                      <span className={`px-2 py-1 text-xs rounded-full border font-medium ${getStatusBadgeClass(entry.status)}`}>
                        {entry.status.toUpperCase()}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      {entry.email} | {entry.idNumber || 'N/A'} | {entry.contactNumber || 'N/A'} | {entry.bloodType || 'N/A'} | Submitted {dayjs(entry.submittedAt).format('MMM D, YYYY')}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <div className="bg-white rounded-2xl border border-red-600 shadow-md p-4 mb-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Search by name, email, or ID..."
              value={searchQuery}
              onChange={e => {
                setCurrentPage(1)
                setSearchQuery(e.target.value)
              }}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
            />
          </div>
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <select
              value={roleFilter}
              onChange={e => {
                setCurrentPage(1)
                setRoleFilter(e.target.value)
              }}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
            >
              {ROLE_OPTIONS.map(roleOption => (
                <option key={roleOption.value} value={roleOption.value}>
                  {roleOption.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <select
              value={committeeFilter}
              onChange={e => {
                setCurrentPage(1)
                setCommitteeFilter(e.target.value)
              }}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
            >
              <option value="all">All Committees</option>
              {committeeOptions.map(committee => (
                <option key={committee} value={committee}>
                  {committee}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {currentMembers.length === 0 ? (
          <div className="col-span-full bg-white rounded-xl border border-red-600 shadow-md p-12 text-center">
            <Users size={48} className="mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500">No members found for the selected filters</p>
          </div>
        ) : (
          currentMembers.map((member, index) => (
            <div
              key={member.id}
              className="bg-white rounded-xl border border-red-600 shadow-md p-6 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 animate-fade-in relative"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <div className={isAdmin ? 'cursor-pointer' : ''} onClick={() => isAdmin && handleViewMember(member.id)}>
                <div className="flex items-center gap-4 mb-4">
                  {member.profileImage && member.profileImage !== '/image-removebg-preview.png' ? (
                    <img 
                      src={member.profileImage} 
                      alt={`${member.name}'s profile`} 
                      className="w-16 h-16 rounded-full object-cover border-4 border-white shadow-lg" 
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-full bg-gradient-to-r from-red-600 to-red-700 flex items-center justify-center">
                      <span className="text-white font-bold text-xl">{member.name.charAt(0).toUpperCase()}</span>
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-800 text-lg truncate">{member.name}</h3>
                    <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium border ${getRoleBadge(member.role)}`}>
                      {member.role === 'admin' ? 'Administrator' : 'Member'}
                    </span>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center gap-3 text-sm text-gray-600">
                    <Mail size={16} className="text-gray-400" />
                    <span className="truncate">{member.email || 'N/A'}</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-gray-600">
                    <Calendar size={16} className="text-gray-400" />
	                    <span>
	                      Joined{' '}
	                      {member.memberSince && dayjs(member.memberSince).isValid()
	                        ? dayjs(member.memberSince).format('MMM D, YYYY')
	                        : 'N/A'}
	                    </span>
                  </div>
                  <div className="text-sm text-gray-600">
                    <span>Contact: {member.contactNumber || 'N/A'}</span>
                  </div>
                  <div className="text-sm text-gray-600">
                    <span>Blood Type: {member.bloodType || 'N/A'}</span>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <span className="px-2 py-1 rounded bg-red-50 text-red-700 text-xs border border-red-200">
                    Committee: {member.committee || 'N/A'}
                  </span>
                  <span className="px-2 py-1 rounded bg-blue-50 text-blue-700 text-xs border border-blue-200">
                    Role: {member.role === 'admin' ? 'Admin' : 'Member'}
                  </span>
                </div>

                {isAdmin && (
                  <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-center text-sm text-gray-500">
                    <span className="flex items-center gap-1">
                      <ArrowLeft size={14} className="rotate-45" />
                      Click to view details
                    </span>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {totalPages > 1 && (
        <div className="mt-8 flex justify-center items-center gap-4">
          <button
            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
            disabled={currentPage === 1}
            className="px-4 py-2 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
          >
            Previous
          </button>
          <span className="text-sm text-gray-600">
            Page {currentPage} of {totalPages}
          </span>
          <button
            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
            disabled={currentPage === totalPages}
            className="px-4 py-2 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
          >
            Next
          </button>
        </div>
      )}

    </div>
  )
}

export default Members
