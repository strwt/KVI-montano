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
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'
import dayjs from 'dayjs'
import { supabase } from '../lib/supabaseClient'

const ROLE_OPTIONS = [
  { value: 'member', label: 'Member' },
  { value: 'admin', label: 'Admin' },
]
const COMMITTEE_OPTIONS = ['Environmental', 'Relief Operations', 'Fire Response', 'Medical']
const BLOOD_TYPE_OPTIONS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']

const normalizeCategoryKey = value =>
  String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_')

const OPERATION_KEY_ALIASES = {
  relief_operations: 'relief_operation',
  fire_responses: 'fire_response',
  water_distributions: 'water_distribution',
  blood_lettings: 'blood_letting',
}

const canonicalizeCategoryKey = key => OPERATION_KEY_ALIASES[key] || key

const titleCaseFromKey = key =>
  String(key || '')
    .trim()
    .replace(/_/g, ' ')
    .replace(/\w\S*/g, word => word.charAt(0).toUpperCase() + word.slice(1))

const splitCategoryAndType = (value = '') => {
  const raw = String(value || '').trim()
  if (!raw) return { category: '', type: '' }
  const parts = raw.split(' - ')
  if (parts.length === 1) return { category: parts[0], type: 'General' }
  const category = parts.shift()?.trim() || ''
  const type = parts.join(' - ').trim() || 'General'
  return { category, type }
}

function Members() {
  const {
    user,
    getAllMembers,
    createMember,
    committees,
    addCommittee,
    editCommittee,
    deleteCommittee,
    utilitiesByCommittee,
    getRecruitments,
    rejectRecruitment,
  } = useAuth()
  const navigate = useNavigate()
  const [searchQuery, setSearchQuery] = useState('')
  const [committeeFilter, setCommitteeFilter] = useState('all')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [committeeName, setCommitteeName] = useState('')
  const [showAddOperationModal, setShowAddOperationModal] = useState(false)
  const [showAddOperationTypeInline, setShowAddOperationTypeInline] = useState(false)
  const [showEditOperationForm, setShowEditOperationForm] = useState(false)
  const [showDeleteOperationForm, setShowDeleteOperationForm] = useState(false)
  const [showOperationManagementPanel, setShowOperationManagementPanel] = useState(false)
  const [selectedOperationCategory, setSelectedOperationCategory] = useState('')
  const [selectedOperationType, setSelectedOperationType] = useState('')
  const [deleteOperationCategory, setDeleteOperationCategory] = useState('')
  const [deleteOperationType, setDeleteOperationType] = useState('')
  const [editedOperationCategory, setEditedOperationCategory] = useState('')
  const [editedOperationType, setEditedOperationType] = useState('')
  const [addTypeOperationCategory, setAddTypeOperationCategory] = useState('')
  const [newOperationTypeName, setNewOperationTypeName] = useState('')
  const [addModalCategory, setAddModalCategory] = useState('')
  const [addModalType, setAddModalType] = useState('')
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
    address: '',
    contactNumber: '',
    bloodType: '',
    memberSince: dayjs().format('YYYY-MM-DD'),
    role: ROLE_OPTIONS[0].value,
    committee: splitCategoryAndType(committees[0] || COMMITTEE_OPTIONS[0]).category || COMMITTEE_OPTIONS[0],
    category: splitCategoryAndType(committees[0] || COMMITTEE_OPTIONS[0]).category || COMMITTEE_OPTIONS[0],
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

  const memberCommittees = useMemo(() => {
    if (Array.isArray(committees) && committees.length > 0) return committees
    return COMMITTEE_OPTIONS
  }, [committees])

  const memberOperations = useMemo(() => {
    const operations = Array.from(
      new Set(
        memberCommittees
          .map(entry => splitCategoryAndType(entry).category)
          .filter(Boolean)
      )
    )
    return operations.length > 0 ? operations : COMMITTEE_OPTIONS
  }, [memberCommittees])

  const categoryLabelByKey = useMemo(() => {
    const map = {}
    memberCommittees.forEach(entry => {
      const { category } = splitCategoryAndType(entry)
      const key = canonicalizeCategoryKey(normalizeCategoryKey(category))
      if (!key) return
      if (!map[key]) map[key] = category.trim()
    })
    return map
  }, [memberCommittees])

  useEffect(() => {
    if (!newMember.committee) {
      setNewMember(prev => ({ ...prev, committee: memberOperations[0], category: memberOperations[0] }))
    }
    if (newMember.committee && !memberOperations.includes(newMember.committee)) {
      setNewMember(prev => ({ ...prev, committee: memberOperations[0], category: memberOperations[0] }))
    }
  }, [memberOperations, newMember.committee])

  const operationTypesByCategory = useMemo(() => {
    return memberCommittees.reduce((acc, entry) => {
      const { category, type } = splitCategoryAndType(entry)
      const key = canonicalizeCategoryKey(normalizeCategoryKey(category))
      if (!key) return acc
      if (!acc[key]) acc[key] = []
      if (type && !acc[key].includes(type)) acc[key].push(type)
      return acc
    }, {})
  }, [memberCommittees])

  const operationCategories = useMemo(
    () => Object.keys(categoryLabelByKey).sort((a, b) => (categoryLabelByKey[a] || a).localeCompare(categoryLabelByKey[b] || b)),
    [categoryLabelByKey]
  )

  const selectedCategoryTypes = useMemo(
    () => operationTypesByCategory[selectedOperationCategory] || [],
    [operationTypesByCategory, selectedOperationCategory]
  )
  const deleteCategoryTypes = useMemo(
    () => operationTypesByCategory[deleteOperationCategory] || [],
    [operationTypesByCategory, deleteOperationCategory]
  )
  const operationEntryByCategoryType = useMemo(() => {
    return memberCommittees.reduce((acc, entry) => {
      const { category, type } = splitCategoryAndType(entry)
      const key = canonicalizeCategoryKey(normalizeCategoryKey(category))
      if (!key || !type) return acc
      acc[`${key}|||${type}`] = entry
      return acc
    }, {})
  }, [memberCommittees])

  useEffect(() => {
    if (selectedOperationCategory && !operationCategories.includes(selectedOperationCategory)) {
      setSelectedOperationCategory('')
      setSelectedOperationType('')
      setEditedOperationCategory('')
      setEditedOperationType('')
    }
  }, [operationCategories, selectedOperationCategory])

  useEffect(() => {
    if (selectedOperationType && !selectedCategoryTypes.includes(selectedOperationType)) {
      setSelectedOperationType('')
      setEditedOperationType('')
    }
  }, [selectedCategoryTypes, selectedOperationType])

  useEffect(() => {
    if (deleteOperationType && !deleteCategoryTypes.includes(deleteOperationType)) {
      setDeleteOperationType('')
    }
  }, [deleteCategoryTypes, deleteOperationType])

	  useEffect(() => {
	    if (selectedOperationCategory && !editedOperationCategory) {
	      setEditedOperationCategory(categoryLabelByKey[selectedOperationCategory] || titleCaseFromKey(selectedOperationCategory))
	    }
	  }, [selectedOperationCategory, editedOperationCategory, categoryLabelByKey])

  const filteredMembers = allMembers.filter(member => {
    const matchesSearch =
      member.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (member.email || member.idNumber || '').toLowerCase().includes(searchQuery.toLowerCase())
    const matchesCommittee = committeeFilter === 'all' || member.role === committeeFilter
    const matchesCategory = categoryFilter === 'all' || member.committee === categoryFilter
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

  const handleViewMember = memberId => {
    navigate(`/members/${memberId}`)
  }

  const handleCommitteeAdd = async (e) => {
	    e.preventDefault()
	    setCommitteeError('')
	    const normalizedCategory = committeeName.trim()
		    if (!normalizedCategory) {
		      setCommitteeError('Category name is required.')
		      return
		    }
	    const normalizedLower = normalizedCategory.toLowerCase()
	    const operationExists = operationCategories.some(categoryKey => {
	      const label = categoryLabelByKey[categoryKey] || titleCaseFromKey(categoryKey)
	      return label.toLowerCase() === normalizedLower
	    })
	    if (operationExists) {
	      setCommitteeError('Category name already exists.')
	      return
	    }
	    const result = await addCommittee(`${normalizedCategory} - General`)
	    if (!result.success) {
	      setCommitteeError(result.message)
	      return
	    }
    setSelectedOperationCategory(canonicalizeCategoryKey(normalizeCategoryKey(normalizedCategory)))
    setSelectedOperationType('General')
    setCommitteeName('')
    setAddModalCategory(canonicalizeCategoryKey(normalizeCategoryKey(normalizedCategory)))
    setAddModalType('General')
    setShowAddOperationModal(false)
    setShowAddOperationTypeInline(false)
  }

	  const handleAddOperationType = async (e) => {
	    e.preventDefault()
	    setCommitteeError('')
	    const operationName = (categoryLabelByKey[addTypeOperationCategory] || '').trim()
	    const typeName = newOperationTypeName.trim()
    if (!operationName || !typeName) {
      setCommitteeError('Category name and new type are required.')
      return
    }
    const existingTypes = operationTypesByCategory[addTypeOperationCategory] || []
    const hasDuplicateType = existingTypes.some(type => type.toLowerCase() === typeName.toLowerCase())
    if (hasDuplicateType) {
      setCommitteeError('Type already exists under this category.')
      return
    }
	    const result = await addCommittee(`${operationName} - ${typeName}`)
	    if (!result.success) {
	      setCommitteeError(result.message)
	      return
	    }
    setSelectedOperationCategory(addTypeOperationCategory)
    setSelectedOperationType(typeName)
    setAddModalCategory(addTypeOperationCategory)
    setAddModalType(typeName)
    setAddTypeOperationCategory('')
    setNewOperationTypeName('')
    setShowAddOperationTypeInline(false)
  }

	  const handleCommitteeRename = async (e) => {
	    e.preventDefault()
	    setCommitteeError('')
    if (!selectedOperationCategory) {
      setCommitteeError('Select category name to update.')
      return
    }
    const nextCategory = editedOperationCategory.trim()
    if (!nextCategory) {
      setCommitteeError('New category name is required.')
      return
    }

    const nextKey = canonicalizeCategoryKey(normalizeCategoryKey(nextCategory))
    if (!nextKey) {
      setCommitteeError('New category name is required.')
      return
    }

    if (
      selectedOperationCategory !== nextKey &&
      operationCategories.includes(nextKey)
    ) {
      setCommitteeError('Category name already exists.')
      return
    }

    const entriesToRename = memberCommittees.filter(entry => {
      const { category } = splitCategoryAndType(entry)
      const key = canonicalizeCategoryKey(normalizeCategoryKey(category))
      return key === selectedOperationCategory
    })

	    // Update saved category entries (if any).
	    for (const source of entriesToRename) {
	      const { type } = splitCategoryAndType(source)
	      const target = `${nextCategory} - ${type || 'General'}`
	      const result = await editCommittee(source, target)
	      if (!result.success) {
	        setCommitteeError(result.message)
	        return
	      }
	    }

    // If this category only existed in events (no saved entries), persist it as a managed category.
    if (entriesToRename.length === 0) {
      const result = await addCommittee(`${nextCategory} - General`)
      if (!result.success) {
	        setCommitteeError(result.message)
	        return
	      }
	    }

    setSelectedOperationCategory(nextKey)
    setEditedOperationCategory(nextCategory)
  }

	  const handleDeleteOperation = async () => {
	    setCommitteeError('')
	    if (!deleteOperationCategory) {
	      setCommitteeError('Select category name first.')
      return
    }

    const entriesForOperation = memberCommittees.filter(entry => {
      const { category } = splitCategoryAndType(entry)
      const key = canonicalizeCategoryKey(normalizeCategoryKey(category))
      return key === deleteOperationCategory
    })

	    // Delete saved category entries (if any).
	    if (entriesForOperation.length > 0) {
	      if (memberCommittees.length - entriesForOperation.length < 1) {
	        setCommitteeError('At least one category entry must remain.')
	        return
	      }
	      const fallbackCommittee = memberCommittees.find(entry => !entriesForOperation.includes(entry)) || ''
		      for (const entry of entriesForOperation) {
		        const result = await deleteCommittee(entry, fallbackCommittee)
		        if (!result.success) {
		          setCommitteeError(result.message)
		          return
		        }
        if (categoryFilter === entry) {
          setCategoryFilter('all')
        }
      }
    }

    // If this category key only existed in events (no saved entries), clear it.
    if (entriesForOperation.length === 0 && deleteOperationCategory) {
      await supabase.from('events').update({ category: 'notes' }).eq('category', deleteOperationCategory)
    }

    if (selectedOperationCategory === deleteOperationCategory) {
      setSelectedOperationCategory('')
      setSelectedOperationType('')
      setEditedOperationCategory('')
      setEditedOperationType('')
    }
    setDeleteOperationCategory('')
    setDeleteOperationType('')
  }

  const selectedOperationKey = selectedOperationCategory && selectedOperationType
    ? (operationEntryByCategoryType[`${selectedOperationCategory}|||${selectedOperationType}`] || `${categoryLabelByKey[selectedOperationCategory] || titleCaseFromKey(selectedOperationCategory)} - ${selectedOperationType}`)
    : ''
  const selectedOperationUtilities = selectedOperationKey ? (utilitiesByCommittee[selectedOperationKey] || []) : []
  const operationNameExists = operationCategories.some(
    categoryKey => (categoryLabelByKey[categoryKey] || '').toLowerCase() === committeeName.trim().toLowerCase()
  )

	  const handleCreateMember = async (e) => {
	    e.preventDefault()
	    setFormError('')
	    const result = await createMember({
	      ...newMember,
	      category: newMember.committee,
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
      address: '',
      contactNumber: '',
      bloodType: '',
      memberSince: dayjs().format('YYYY-MM-DD'),
      role: ROLE_OPTIONS[0].value,
      committee: memberOperations[0] || COMMITTEE_OPTIONS[0],
      category: memberOperations[0] || COMMITTEE_OPTIONS[0],
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
      idNumber: recruitment.idNumber || '',
      password: '',
      address: recruitment.address || '',
      contactNumber: recruitment.contactNumber || '',
      bloodType: recruitment.bloodType || '',
      memberSince: dayjs().format('YYYY-MM-DD'),
      role: ROLE_OPTIONS[0].value,
      committee: memberOperations[0] || COMMITTEE_OPTIONS[0],
      category: memberOperations[0] || COMMITTEE_OPTIONS[0],
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
            <h3 className="font-semibold text-gray-800 dark:text-zinc-100 mb-3">Category Management</h3>
            <button
              type="button"
              onClick={() => setShowOperationManagementPanel(prev => !prev)}
              className="w-full px-3 py-2 mb-3 bg-gray-100 dark:bg-zinc-800 text-gray-700 dark:text-zinc-100 rounded-lg hover:bg-gray-200 dark:hover:bg-zinc-700 transition-colors text-sm"
            >
              {showOperationManagementPanel ? 'Hide Category Actions' : 'Show Category Actions'}
            </button>
            {showOperationManagementPanel && (
              <div className="space-y-4 mb-3">
                <div className="max-w-3xl mx-auto space-y-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddOperationModal(true)
                      setShowEditOperationForm(false)
                      setShowDeleteOperationForm(false)
                      setCommitteeError('')
                    }}
                    className="w-full py-3 rounded-full text-lg font-medium bg-green-500 text-white hover:bg-green-600 transition-colors"
                  >
                    Add
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowEditOperationForm(true)
                      setShowDeleteOperationForm(false)
                      setCommitteeError('')
                    }}
                    className="w-full py-3 rounded-full text-lg font-medium bg-blue-600 text-white hover:bg-blue-700 transition-colors"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowDeleteOperationForm(true)
                      setShowEditOperationForm(false)
                      setCommitteeError('')
                    }}
                    className="w-full py-3 rounded-full text-lg font-medium bg-red-600 text-white hover:bg-red-700 transition-colors"
                  >
                    Delete
                  </button>
                </div>

              {selectedOperationUtilities.length > 0 && (
                <div className="rounded-lg border border-gray-200 p-3 bg-white">
                  <p className="text-xs text-gray-500 mb-2">Saved Utilities for Selected Category</p>
                  <div className="space-y-1">
                    {selectedOperationUtilities.map(item => (
                      <p key={item} className="text-sm text-gray-700">{item}</p>
                    ))}
                  </div>
                </div>
              )}
              </div>
            )}
            {showOperationManagementPanel && committeeError && <p className="text-sm text-red-600 mb-2">{committeeError}</p>}

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
              <input
                type="text"
                placeholder="Full name"
                value={newMember.name}
                onChange={e => setNewMember({ ...newMember, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                required
              />
              <input
                type="email"
                placeholder="Email"
                value={newMember.email}
                onChange={e => setNewMember({ ...newMember, email: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                required
              />
              <input
                type="text"
                placeholder="ID Number"
                value={newMember.idNumber}
                onChange={e => setNewMember({ ...newMember, idNumber: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                required
              />
              <input
                type="password"
                placeholder="Temporary password"
                value={newMember.password}
                onChange={e => setNewMember({ ...newMember, password: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                required
              />
              <input
                type="text"
                placeholder="Address"
                value={newMember.address}
                onChange={e => setNewMember({ ...newMember, address: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
              />
              <input
                type="text"
                placeholder="Contact Number"
                value={newMember.contactNumber}
                onChange={e => setNewMember({ ...newMember, contactNumber: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
              />
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
                <label className="block text-xs text-gray-500 mb-1">Category</label>
                <select
                  value={newMember.committee}
                  onChange={e => setNewMember({ ...newMember, committee: e.target.value, category: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                  required
                >
                  {memberOperations.map(operation => (
                    <option key={operation} value={operation}>
                      {operation}
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

      {isAdmin && showAddOperationModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="w-full max-w-2xl bg-white rounded-xl shadow-2xl p-5 space-y-4 animate-fade-in-up">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-gray-800">Add Category</h3>
              <button
                type="button"
                onClick={() => {
                  setShowAddOperationModal(false)
                }}
                className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm"
              >
                Close
              </button>
            </div>

            <form onSubmit={handleCommitteeAdd} className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm text-gray-600 mb-1">Category name</label>
                <input
                  type="text"
                  value={committeeName}
                  onChange={e => setCommitteeName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                  required
                />
                {operationNameExists && (
                  <p className="text-xs text-amber-600 mt-1">
                    Category name already exists. Add a new type only.
                  </p>
                )}
              </div>
              <button
                type="submit"
                className="md:col-span-2 px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                Add
              </button>

	              <div className="md:col-span-2 rounded-lg border border-gray-200 bg-gray-50 p-3 space-y-2">
	                <p className="text-sm text-gray-600">Saved Category names</p>
	                <div className="grid grid-cols-1 gap-2">
		                  <select
		                    value={addModalCategory}
		                    onChange={e => {
		                      const value = e.target.value
		                      setAddModalCategory(value)
		                    }}
		                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
		                  >
		                    <option value="">Select category name</option>
	                    {operationCategories.map(categoryKey => (
	                      <option key={categoryKey} value={categoryKey}>
	                        {categoryLabelByKey[categoryKey] || titleCaseFromKey(categoryKey)}
		                      </option>
		                    ))}
		                  </select>
		                </div>
		              </div>
	            </form>

          </div>
        </div>
      )}

      {isAdmin && showEditOperationForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="w-full max-w-xl bg-white rounded-xl shadow-2xl p-5 space-y-4 animate-fade-in-up">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-gray-800">Edit Category</h3>
              <button
                type="button"
                onClick={() => setShowEditOperationForm(false)}
                className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm"
              >
                Close
              </button>
            </div>
            {committeeError && <p className="text-sm text-red-600">{committeeError}</p>}
            <form onSubmit={handleCommitteeRename} className="grid grid-cols-1 md:grid-cols-2 gap-2">
	              <select
	                value={selectedOperationCategory}
	                onChange={e => {
	                  const value = e.target.value
	                  setSelectedOperationCategory(value)
	                  setEditedOperationCategory(categoryLabelByKey[value] || titleCaseFromKey(value))
	                }}
	                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
	                required
	              >
		                <option value="">Select category name</option>
	                {operationCategories.map(categoryKey => (
	                  <option key={categoryKey} value={categoryKey}>
	                    {categoryLabelByKey[categoryKey] || titleCaseFromKey(categoryKey)}
	                  </option>
	                ))}
	              </select>
              <input
                type="text"
                value={editedOperationCategory}
                onChange={e => setEditedOperationCategory(e.target.value)}
	                placeholder="New category name"
                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                required
              />
              <button
                type="submit"
                className="md:col-span-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Save Update
              </button>
            </form>
          </div>
        </div>
      )}

      {isAdmin && showDeleteOperationForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="w-full max-w-xl bg-white rounded-xl shadow-2xl p-5 space-y-4 animate-fade-in-up">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-gray-800">Delete Category</h3>
              <button
                type="button"
                onClick={() => setShowDeleteOperationForm(false)}
                className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm"
              >
                Close
              </button>
            </div>
            {committeeError && <p className="text-sm text-red-600">{committeeError}</p>}
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 space-y-3">
              <div className="grid grid-cols-1 gap-2">
	                <select
	                  value={deleteOperationCategory}
	                  onChange={e => {
	                    const value = e.target.value
	                    setDeleteOperationCategory(value)
	                  }}
	                  className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
	                >
		                  <option value="">Select category name</option>
	                  {operationCategories.map(categoryKey => (
	                    <option key={categoryKey} value={categoryKey}>
	                      {categoryLabelByKey[categoryKey] || titleCaseFromKey(categoryKey)}
	                    </option>
	                  ))}
	                </select>
              </div>

              {deleteOperationCategory && (
                <p className="text-sm text-red-700">
                  Warning: all entries under this Category will be deleted.
                </p>
              )}

              <button
                type="button"
                onClick={handleDeleteOperation}
                disabled={!deleteOperationCategory}
                className="px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Confirm Delete
              </button>
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
              value={committeeFilter}
              onChange={e => {
                setCurrentPage(1)
                setCommitteeFilter(e.target.value)
              }}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
            >
              <option value="all">All Roles</option>
              {ROLE_OPTIONS.map(roleOption => (
                <option key={roleOption.value} value={roleOption.value}>
                  {roleOption.label}
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
              <option value="all">All Committees</option>
              {memberCommittees.map(committee => (
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
                    <span className="truncate">{member.email || 'N/A'}</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-gray-600">
                    <Calendar size={16} className="text-gray-400" />
                    <span>Joined {new Date(member.memberSince || Date.now()).toLocaleDateString()}</span>
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
                    Category: {member.committee || memberOperations[0]}
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
