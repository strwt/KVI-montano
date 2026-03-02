import { useEffect, useMemo, useState } from 'react'
import {
  Users,
  Search,
  Mail,
  Calendar,
  Trash2,
  Filter,
  ArrowLeft,
  Plus,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  XCircle,
  BadgeCheck,
  Hash,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'
import dayjs from 'dayjs'

const MEMBER_CATEGORY_OPTIONS = ['Field Volunteer', 'Coordinator', 'Responder', 'General Member']

function Members() {
  const {
    user,
    getAllMembers,
    deleteMembers,
    createMember,
    committees,
    addCommittee,
    deleteCommittee,
    getRecruitments,
    rejectRecruitment,
  } = useAuth()
  const navigate = useNavigate()
  const [searchQuery, setSearchQuery] = useState('')
  const [committeeFilter, setCommitteeFilter] = useState('all')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [selectedMembers, setSelectedMembers] = useState([])
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [committeeName, setCommitteeName] = useState('')
  const [committeeError, setCommitteeError] = useState('')
  const [formError, setFormError] = useState('')
  const [recruitmentActionError, setRecruitmentActionError] = useState('')
  const [expandedRecruitmentId, setExpandedRecruitmentId] = useState(null)
  const [pendingApprovalRecruitmentId, setPendingApprovalRecruitmentId] = useState(null)
  const [newMember, setNewMember] = useState({
    name: '',
    email: '',
    idNumber: '',
    password: '',
    committee: committees[0] || '',
    category: MEMBER_CATEGORY_OPTIONS[0],
  })
  const membersPerPage = 9

  const allMembers = getAllMembers()
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

  const memberCategories = useMemo(() => {
    const fromMembers = allMembers
      .map(member => member.category)
      .filter(Boolean)
    return Array.from(new Set([...MEMBER_CATEGORY_OPTIONS, ...fromMembers]))
  }, [allMembers])

  useEffect(() => {
    if (!newMember.committee && committees[0]) {
      setNewMember(prev => ({ ...prev, committee: committees[0] }))
    }
    if (newMember.committee && !committees.includes(newMember.committee)) {
      setNewMember(prev => ({ ...prev, committee: committees[0] || '' }))
    }
  }, [committees, newMember.committee])

  const filteredMembers = allMembers.filter(member => {
    const matchesSearch =
      member.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (member.email || member.idNumber || '').toLowerCase().includes(searchQuery.toLowerCase())
    const matchesCommittee = committeeFilter === 'all' || member.committee === committeeFilter
    const matchesCategory = categoryFilter === 'all' || member.category === categoryFilter
    return matchesSearch && matchesCommittee && matchesCategory
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

  const isMemberSelected = (memberId) => {
    return selectedMembers.some(id => String(id) === String(memberId))
  }

  const handleSelectMember = memberId => {
    if (selectedMembers.includes(memberId)) {
      setSelectedMembers(selectedMembers.filter(id => id !== memberId))
    } else {
      setSelectedMembers(prev => [...prev, memberId])
    }
  }

  const handleBulkDelete = () => {
    deleteMembers(selectedMembers)
    setSelectedMembers([])
    setShowDeleteConfirm(false)
  }

  const handleViewMember = memberId => {
    navigate(`/members/${memberId}`)
  }

  const handleCommitteeAdd = e => {
    e.preventDefault()
    setCommitteeError('')
    const result = addCommittee(committeeName)
    if (!result.success) {
      setCommitteeError(result.message)
      return
    }
    setCommitteeName('')
  }

  const handleCommitteeDelete = committee => {
    const result = deleteCommittee(committee)
    if (!result.success) {
      setCommitteeError(result.message)
      return
    }
    if (committeeFilter === committee) {
      setCommitteeFilter('all')
    }
  }

  const handleCreateMember = e => {
    e.preventDefault()
    setFormError('')
    const result = createMember({
      ...newMember,
      recruitmentId: pendingApprovalRecruitmentId || undefined,
    })
    if (!result.success) {
      setFormError(result.message)
      return
    }
    setNewMember({
      name: '',
      email: '',
      idNumber: '',
      password: '',
      committee: committees[0] || '',
      category: MEMBER_CATEGORY_OPTIONS[0],
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
      email: recruitment.email,
      idNumber: recruitment.idNumber,
      password: '',
      committee: committees[0] || '',
      category: MEMBER_CATEGORY_OPTIONS[0],
    })
    const createMemberSection = document.getElementById('create-member-form')
    if (createMemberSection) {
      createMemberSection.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }

  const handleRejectRecruitment = (recruitmentId) => {
    setRecruitmentActionError('')
    const result = rejectRecruitment(recruitmentId)
    if (!result.success) {
      setRecruitmentActionError(result.message)
      return
    }
    if (pendingApprovalRecruitmentId === recruitmentId) {
      setPendingApprovalRecruitmentId(null)
    }
  }

  return (
    <div className="animate-fade-in">
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Members</h2>
          <p className="text-sm text-gray-500">Manage members by committee and category</p>
        </div>
        {isAdmin && (
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setShowAddUser(true)}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              <Plus size={18} />
              Add User
            </button>
          </div>
        )}
      </div>

      {isAdmin && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-6">
          <div className="bg-white rounded-xl shadow-md p-5">
            <h3 className="font-semibold text-gray-800 mb-3">Committee Management</h3>
            <form onSubmit={handleCommitteeAdd} className="flex gap-2 mb-3">
              <input
                type="text"
                value={committeeName}
                onChange={e => setCommitteeName(e.target.value)}
                placeholder="New committee name"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                required
              />
              <button
                type="submit"
                className="px-3 py-2 bg-gray-900 text-white rounded-lg hover:bg-black transition-colors flex items-center gap-1"
              >
                <Plus size={14} />
                Add
              </button>
            </form>
            {committeeError && <p className="text-sm text-red-600 mb-2">{committeeError}</p>}
            <div className="flex flex-wrap gap-2">
              {committees.map(committee => (
                <span
                  key={committee}
                  className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm bg-red-50 text-red-700 border border-red-200"
                >
                  {committee}
                  <button
                    type="button"
                    onClick={() => handleCommitteeDelete(committee)}
                    className="text-red-600 hover:text-red-800"
                    aria-label={`Delete ${committee}`}
                  >
                    <Trash2 size={12} />
                  </button>
                </span>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-md p-5">
            <h3 className="font-semibold text-gray-800 mb-3">Create Member</h3>
            {pendingApprovalRecruitmentId && (
              <div className="mb-3 p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-sm">
                Recruitment approval in progress. Complete member creation to mark this application as approved.
              </div>
            )}
            {formError && <p className="text-sm text-red-600 mb-2">{formError}</p>}
            <form id="create-member-form" onSubmit={handleCreateMember} className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <input
                type="text"
                placeholder="Full name"
                value={newMember.name}
                onChange={e => setNewMember({ ...newMember, name: e.target.value })}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                required
              />
              <input
                type="email"
                placeholder="Email"
                value={newMember.email}
                onChange={e => setNewMember({ ...newMember, email: e.target.value })}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                required
              />
              <input
                type="text"
                placeholder="ID Number"
                value={newMember.idNumber}
                onChange={e => setNewMember({ ...newMember, idNumber: e.target.value })}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                required
              />
              <input
                type="password"
                placeholder="Temporary password"
                value={newMember.password}
                onChange={e => setNewMember({ ...newMember, password: e.target.value })}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                required
              />
              <select
                value={newMember.committee}
                onChange={e => setNewMember({ ...newMember, committee: e.target.value })}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                required
              >
                <option value="" disabled>
                  Select committee
                </option>
                {committees.map(committee => (
                  <option key={committee} value={committee}>
                    {committee}
                  </option>
                ))}
              </select>
              <select
                value={newMember.category}
                onChange={e => setNewMember({ ...newMember, category: e.target.value })}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                required
              >
                {memberCategories.map(category => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
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
        <div className="bg-white rounded-2xl shadow-md p-5 mb-6 animate-fade-in-up">
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
                          <span>{entry.idNumber}</span>
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
                          <p className="text-sm font-medium text-gray-800">{entry.idNumber}</p>
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
                      {entry.email} | {entry.idNumber} | Submitted {dayjs(entry.submittedAt).format('MMM D, YYYY')}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <div className="bg-white rounded-xl shadow-md p-4 mb-4">
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
              value={committeeFilter}
              onChange={e => {
                setCurrentPage(1)
                setCommitteeFilter(e.target.value)
              }}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
            >
              <option value="all">All Committees</option>
              {committees.map(committee => (
                <option key={committee} value={committee}>
                  {committee}
                </option>
              ))}
            </select>
          </div>
          <div>
            <select
              value={categoryFilter}
              onChange={e => {
                setCurrentPage(1)
                setCategoryFilter(e.target.value)
              }}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
            >
              <option value="all">All Categories</option>
              {memberCategories.map(category => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {isAdmin && currentMembers.length > 0 && (
        <div className="flex items-center gap-2 mb-4">
          <input
            type="checkbox"
            checked={selectedMembers.length === currentMembers.length && currentMembers.length > 0}
            onChange={handleSelectAll}
            className="w-5 h-5 text-red-600 rounded focus:ring-red-500"
          />
          <span className="text-sm text-gray-600">Select All</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {currentMembers.length === 0 ? (
          <div className="col-span-full bg-white rounded-xl shadow-md p-12 text-center">
            <Users size={48} className="mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500">No members found for the selected filters</p>
          </div>
        ) : (
          currentMembers.map((member, index) => (
            <div
              key={member.id}
              className={`bg-white rounded-xl shadow-md p-6 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 animate-fade-in relative ${
                isAdmin && isMemberSelected(member.id) ? 'ring-2 ring-red-500' : ''
              }`}
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              {isAdmin && (
                <div className="absolute top-4 right-4">
                  <input
                    type="checkbox"
                    checked={isMemberSelected(member.id)}
                    onClick={(e) => e.stopPropagation()}
                    onChange={(e) => {
                      e.stopPropagation()
                      handleSelectMember(member.id)
                    }}
                    className="w-5 h-5 text-red-600 rounded focus:ring-red-500 cursor-pointer"
                  />
                </div>
              )}

              <div className={isAdmin ? 'cursor-pointer' : ''} onClick={() => isAdmin && handleViewMember(member.id)}>
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-r from-red-600 to-red-700 flex items-center justify-center">
                    <span className="text-white font-bold text-xl">{member.name.charAt(0).toUpperCase()}</span>
                  </div>
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
                    <span className="truncate">{member.email || member.idNumber}</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-gray-600">
                    <Calendar size={16} className="text-gray-400" />
                    <span>Joined {new Date().toLocaleDateString()}</span>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <span className="px-2 py-1 rounded bg-red-50 text-red-700 text-xs border border-red-200">
                    Committee: {member.committee || 'Unassigned'}
                  </span>
                  <span className="px-2 py-1 rounded bg-blue-50 text-blue-700 text-xs border border-blue-200">
                    Category: {member.category || 'General Member'}
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

                {isAdmin && isMemberSelected(member.id) && (
                  <div className="mt-3 pt-3 border-t border-red-100">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        setShowDeleteConfirm(true)
                      }}
                      className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                    >
                      <Trash2 size={16} />
                      Delete Selected ({selectedMembers.length})
                    </button>
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
              Are you sure you want to delete {selectedMembers.length} member{selectedMembers.length > 1 ? 's' : ''}?
              This will permanently remove them from the system.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleBulkDelete}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add User Modal */}
      {showAddUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 max-w-md w-full mx-4 animate-fade-in">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                <Plus size={24} className="text-red-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-800">Add New User</h3>
                <p className="text-sm text-gray-500">Create a new user account</p>
              </div>
            </div>
            <form onSubmit={handleAddUser} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">ID</label>
                <input
                  type="text"
                  required
                  value={newUserForm.id}
                  onChange={(e) => setNewUserForm({ ...newUserForm, id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                  placeholder="Enter ID"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <input
                  type="text"
                  required
                  value={newUserForm.name}
                  onChange={(e) => setNewUserForm({ ...newUserForm, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                  placeholder="Enter full name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  required
                  value={newUserForm.email}
                  onChange={(e) => setNewUserForm({ ...newUserForm, email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                  placeholder="Enter email"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                <input
                  type="text"
                  value={newUserForm.address}
                  onChange={(e) => setNewUserForm({ ...newUserForm, address: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                  placeholder="Enter address"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select
                  value={newUserForm.status}
                  onChange={(e) => setNewUserForm({ ...newUserForm, status: e.target.value })}
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
                  required
                  value={newUserForm.memberSince}
                  onChange={(e) => setNewUserForm({ ...newUserForm, memberSince: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>
              <div className="flex gap-3 justify-end pt-4">
                <button
                  type="button"
                  onClick={() => setShowAddUser(false)}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                  Add User
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default Members
