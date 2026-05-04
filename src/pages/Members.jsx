import { useEffect, useMemo, useRef, useState } from 'react'
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
import { useConfirm } from '../context/useConfirm'
import { useNavigate } from 'react-router-dom'
import dayjs from 'dayjs'

const ROLE_OPTIONS = [
  { value: 'member', label: 'Member' },
  { value: 'oic', label: 'OIC' },
  { value: 'admin', label: 'Admin' },
]

const ROLE_FILTER_OPTIONS = [
  { value: 'all_users', label: 'All Users' },
  { value: 'member', label: 'Member' },
  { value: 'admin', label: 'Admin' },
]
const BLOOD_TYPE_OPTIONS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']

let jsPdfLoaderPromise = null
const loadJsPdf = () => {
  if (typeof window === 'undefined') return Promise.resolve(null)
  if (window.jspdf?.jsPDF) return Promise.resolve(window.jspdf.jsPDF)
  if (jsPdfLoaderPromise) return jsPdfLoaderPromise

  jsPdfLoaderPromise = new Promise((resolve, reject) => {
    const existing = document.getElementById('jspdf-cdn')
    if (existing && window.jspdf?.jsPDF) {
      resolve(window.jspdf.jsPDF)
      return
    }

    if (!existing) {
      const script = document.createElement('script')
      script.id = 'jspdf-cdn'
      script.src = 'https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.umd.min.js'
      script.async = true
      script.onload = () => resolve(window.jspdf?.jsPDF || null)
      script.onerror = () => reject(new Error('Failed to load PDF library'))
      document.body.appendChild(script)
      return
    }

    existing.addEventListener('load', () => resolve(window.jspdf?.jsPDF || null))
    existing.addEventListener('error', () => reject(new Error('Failed to load PDF library')))
  })

  return jsPdfLoaderPromise
}

function Members() {
  const {
    user,
    getAllMembers,
    getAdmins,
    createMember,
    uploadMemberProfileImage,
    committees,
    deleteMembers,
    getRecruitments,
    rejectRecruitment,
    ensureAdminDataLoaded,
  } = useAuth()
  const navigate = useNavigate()
  const confirm = useConfirm()
  const [searchQuery, setSearchQuery] = useState('')
  const [roleFilter, setRoleFilter] = useState('all_users')
  const [committeeFilter, setCommitteeFilter] = useState('all')
  const [insuranceFilter, setInsuranceFilter] = useState('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [formError, setFormError] = useState('')
  const [recruitmentActionError, setRecruitmentActionError] = useState('')
  const [selectedMemberIds, setSelectedMemberIds] = useState(() => new Set())
  const [bulkDeleteBusy, setBulkDeleteBusy] = useState(false)
  const [bulkDeleteError, setBulkDeleteError] = useState('')
  const [exportingPdf, setExportingPdf] = useState(false)
  const selectAllRef = useRef(null)
  const [newMemberImagePreviewUrl, setNewMemberImagePreviewUrl] = useState('')
  const [newMemberImageFile, setNewMemberImageFile] = useState(null)

  useEffect(() => {
    if (user?.role !== 'admin') return
    void ensureAdminDataLoaded()
  }, [ensureAdminDataLoaded, user?.role, user?.id])
  const [expandedRecruitmentId, setExpandedRecruitmentId] = useState(null)
  const [pendingApprovalRecruitmentId, setPendingApprovalRecruitmentId] = useState(null)
	  const [newMember, setNewMember] = useState({
	    name: '',
	    idNumber: '',
	    password: '',
	    address: '',
	    contactNumber: '',
      emergencyContactNumber: '',
      emergencyContactName: '',
      emergencyContactRelationship: '',
    bloodType: '',
    insuranceStatus: 'N/A',
    insuranceYear: '',
    memberSince: dayjs().format('YYYY-MM-DD'),
    status: 'active',
    role: ROLE_OPTIONS[0].value,
    committee: committees[0] || '',
    committeeRole: 'Member',
  })
  const [showTempPassword, setShowTempPassword] = useState(false)
  const membersPerPage = 9

  const normalizeMemberName = (value) =>
    String(value || '')
      .trim()
      .toLowerCase()
      .replace(/\s+/g, ' ')

  const members = useMemo(() => {
    const allMembers = getAllMembers()
    return Array.isArray(allMembers) ? allMembers : []
  }, [getAllMembers])

  const admins = useMemo(() => {
    const allAdmins = getAdmins()
    return Array.isArray(allAdmins) ? allAdmins : []
  }, [getAdmins])
  const isAdmin = user?.role === 'admin'
  const recruitments = getRecruitments()

  const pendingRecruitments = useMemo(
    () => recruitments.filter(item => item.status === 'pending'),
    [recruitments]
  )

  const committeeOptions = useMemo(() => {
    const list = Array.isArray(committees) ? committees : []
    const normalized = list.map(name => String(name || '').trim()).filter(Boolean)
    const unique = [...new Set(normalized)]
    unique.sort((a, b) => a.localeCompare(b))
    return unique
  }, [committees])

  useEffect(() => {
    if (committeeOptions.length === 0) return
    setNewMember(prev => {
      if (prev?.role === 'admin' || prev?.role === 'oic' || prev?.committeeRole === 'OIC') return prev
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

  useEffect(() => {
    if (roleFilter === 'member' || roleFilter === 'all_users') return
    if (committeeFilter === 'all') return
    setCommitteeFilter('all')
  }, [committeeFilter, roleFilter])

  const visibleUsers = useMemo(() => {
    if (roleFilter === 'admin') return admins
    if (roleFilter === 'member') return members

    const combined = [...members, ...admins]
    const seen = new Set()
    return combined.filter(member => {
      const id = String(member?.id || '').trim() || String(member?.email || '').trim()
      if (!id) return true
      if (seen.has(id)) return false
      seen.add(id)
      return true
    })
  }, [admins, members, roleFilter])

  const filteredMembers = visibleUsers.filter(member => {
    const memberCommitteeRole = member?.committeeRole || member?.committee_role || 'Member'
    const memberType = memberCommitteeRole === 'OIC' ? 'oic' : (member.role === 'admin' ? 'admin' : 'member')
    if (roleFilter === 'member' && memberType === 'admin') return false
    const matchesSearch =
      member.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (member.email || member.idNumber || '').toLowerCase().includes(searchQuery.toLowerCase())
    const matchesCommittee =
      roleFilter === 'admin' ||
      roleFilter === 'all_users' ||
      committeeFilter === 'all' ||
      member.committee === committeeFilter
    const normalizedInsurance = String(member?.insuranceStatus || '').trim().toLowerCase()
    const isInsured = normalizedInsurance === 'insured'
    const matchesInsurance =
      insuranceFilter === 'all' ||
      (insuranceFilter === 'insured' && isInsured) ||
      (insuranceFilter === 'not_insured' && !isInsured)
    return matchesSearch && matchesCommittee && matchesInsurance
  })

  const indexOfLastMember = currentPage * membersPerPage
  const indexOfFirstMember = indexOfLastMember - membersPerPage
  const currentMembers = filteredMembers.slice(indexOfFirstMember, indexOfLastMember)
  const totalPages = Math.ceil(filteredMembers.length / membersPerPage)
  const currentMemberIds = currentMembers.map(member => String(member?.id || '').trim()).filter(Boolean)
  const selectedCount = selectedMemberIds.size
  const hasSelectedOnPage = currentMemberIds.some(id => selectedMemberIds.has(id))
  const allSelectedOnPage = currentMemberIds.length > 0 && currentMemberIds.every(id => selectedMemberIds.has(id))

  const getRoleBadge = role => {
    if (role === 'admin') return 'bg-yellow-100 text-yellow-800 border-yellow-200'
    if (role === 'oic') return 'bg-amber-100 text-amber-700 border-amber-200'
    return 'bg-blue-100 text-blue-700 border-blue-200'
  }

  const handleViewMember = memberId => {
    navigate(`/members/${memberId}`)
  }

  const toggleMemberSelection = (memberId) => {
    const id = String(memberId || '').trim()
    if (!id) return
    setSelectedMemberIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const handleSelectAllOnPage = () => {
    if (currentMemberIds.length === 0) return
    setSelectedMemberIds(prev => {
      const next = new Set(prev)
      if (allSelectedOnPage) {
        currentMemberIds.forEach(id => next.delete(id))
      } else {
        currentMemberIds.forEach(id => next.add(id))
      }
      return next
    })
  }

  const handleExportMembersPdf = async () => {
    if (!isAdmin || exportingPdf) return
    setExportingPdf(true)

    try {
      const JsPDF = await loadJsPdf()
      if (!JsPDF) throw new Error('PDF generator unavailable')

      const doc = new JsPDF({ unit: 'pt', format: 'a4' })
      const pageWidth = doc.internal.pageSize.getWidth()
      const margin = 36
      const tableWidth = pageWidth - margin * 2
      let y = 42

      doc.setFontSize(18)
      doc.text('User Management', margin, y)
      y += 18
      doc.setFontSize(10)
      doc.text(`Generated: ${dayjs().format('YYYY-MM-DD HH:mm:ss')}`, margin, y)
      y += 14
      doc.text(`Role: ${roleFilter === 'all_users' ? 'All Users' : (roleFilter === 'member' ? 'Members' : 'Admins')}`, margin, y)
      y += 14
      doc.text(`Committee: ${roleFilter === 'admin' ? 'N/A' : (committeeFilter === 'all' ? 'All' : committeeFilter)}`, margin, y)
      y += 14
      doc.text(`Insurance: ${insuranceFilter === 'all' ? 'All' : (insuranceFilter === 'insured' ? 'Insured' : 'Not Insured')}`, margin, y)
      y += 14
      doc.text(`Search: ${searchQuery.trim() || 'All'}`, margin, y)
      y += 18

      const columns = [
        { label: 'Name', width: 104, value: member => member.name || 'N/A' },
        {
          label: 'Type',
          width: 52,
          value: member => {
            const memberCommitteeRole = member?.committeeRole || member?.committee_role || 'Member'
            return memberCommitteeRole === 'OIC' ? 'OIC' : (member.role === 'admin' ? 'Admin' : 'Member')
          },
        },
        { label: 'ID', width: 74, value: member => member.idNumber || 'N/A' },
        { label: 'Email', width: 118, value: member => member.email || 'N/A' },
        { label: 'Committee', width: 76, value: member => member.committee || 'N/A' },
        { label: 'Contact', width: 82, value: member => member.contactNumber || 'N/A' },
        { label: 'Blood', width: 54, value: member => member.bloodType || 'N/A' },
        { label: 'Status', width: 64, value: member => member.insuranceStatus || 'N/A' },
      ]

      const scale = tableWidth / columns.reduce((sum, col) => sum + col.width, 0)
      const scaledColumns = columns.map(col => ({ ...col, width: col.width * scale }))

      const renderHeader = () => {
        doc.setFillColor(245, 245, 245)
        doc.rect(margin, y, tableWidth, 18, 'F')
        let x = margin + 4
        scaledColumns.forEach(col => {
          doc.text(col.label, x, y + 12)
          x += col.width
        })
        y += 22
      }

      doc.setFontSize(8)
      renderHeader()

      filteredMembers.forEach(member => {
        const rowValues = scaledColumns.map(col => doc.splitTextToSize(String(col.value(member) || ''), col.width - 8))
        const rowHeight = Math.max(...rowValues.map(parts => parts.length * 10)) + 6

        if (y + rowHeight > 800) {
          doc.addPage()
          y = 42
          renderHeader()
        }

        doc.rect(margin, y, tableWidth, rowHeight)
        let x = margin + 4
        rowValues.forEach((parts, idx) => {
          parts.forEach((line, lineIndex) => {
            doc.text(line, x, y + 11 + lineIndex * 10)
          })
          x += scaledColumns[idx].width
        })
        y += rowHeight
      })

      doc.save(`users_${dayjs().format('YYYYMMDD_HHmmss')}.pdf`)
    } catch (error) {
      alert(error?.message || 'Failed to generate PDF.')
    } finally {
      setExportingPdf(false)
    }
  }



  const handleBulkDelete = async () => {
    if (!isAdmin || selectedMemberIds.size === 0) return
    setBulkDeleteError('')
    setBulkDeleteBusy(true)
    const result = await deleteMembers([...selectedMemberIds])
    setBulkDeleteBusy(false)
    if (!result.success) {
      setBulkDeleteError(result.message || 'Unable to delete members.')
      return
    }
    setSelectedMemberIds(new Set())
  }

  useEffect(() => {
    const ids = [...admins, ...members].map(member => String(member?.id || '').trim()).filter(Boolean)
    const allUserIdSet = new Set(ids)
    setSelectedMemberIds(prev => {
      const next = new Set([...prev].filter(id => allUserIdSet.has(id)))
      return next.size === prev.size ? prev : next
    })
  }, [admins, members])

  useEffect(() => {
    if (!selectAllRef.current) return
    selectAllRef.current.indeterminate = hasSelectedOnPage && !allSelectedOnPage
  }, [hasSelectedOnPage, allSelectedOnPage])

 	  const handleCreateMember = async (e) => {
    e.preventDefault()
    setFormError('')

    const normalizedName = String(newMember.name || '').trim().replace(/\s+/g, ' ')
    if (!normalizedName) {
      setFormError('Full name is required.')
      return
    }

    const alreadyExists = [...admins, ...members].some(member =>
      normalizeMemberName(member?.name) === normalizeMemberName(normalizedName)
    )
    if (alreadyExists) {
      setFormError('Member already exists.')
      return
    }

    const result = await createMember({
 	      ...newMember,
        name: normalizedName,
 	      recruitmentId: pendingApprovalRecruitmentId || undefined,
 	    })
    if (!result.success) {
      setFormError(result.message)
      return
    }

    if (newMemberImageFile && result.userId) {
      const uploadResult = await uploadMemberProfileImage(result.userId, newMemberImageFile)
      if (!uploadResult.success) {
        setFormError(uploadResult.message || 'Member created but image upload failed.')
      }
    }

	    setNewMember({
	      name: '',
	      idNumber: '',
	      password: '',
	      address: '',
	      contactNumber: '',
        emergencyContactNumber: '',
        emergencyContactName: '',
        emergencyContactRelationship: '',
      bloodType: '',
      insuranceStatus: 'N/A',
      insuranceYear: '',
      memberSince: dayjs().format('YYYY-MM-DD'),
      status: 'active',
      role: ROLE_OPTIONS[0].value,
      committee: committeeOptions[0] || '',
      committeeRole: 'Member',
    })
    setNewMemberImageFile(null)
    setPendingApprovalRecruitmentId(null)
    setRecruitmentActionError('')
  }

  const getStatusBadgeClass = status => {
    if (status === 'approved') return 'bg-[#ffffff] text-green-700 border-green-200'
    if (status === 'rejected') return 'bg-[#ffffff] text-red-700 border-red-200'
    return 'bg-[#ffffff] text-amber-700 border-amber-200'
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
        emergencyContactNumber: recruitment.emergencyContactNumber || '',
        emergencyContactName: recruitment.emergencyContactName || '',
        emergencyContactRelationship: recruitment.emergencyContactRelationship || '',
      bloodType: recruitment.bloodType || '',
      insuranceStatus: recruitment.insuranceStatus || 'N/A',
      insuranceYear: recruitment.insuranceYear || '',
      memberSince: dayjs().format('YYYY-MM-DD'),
      status: 'active',
      role: ROLE_OPTIONS[0].value,
      committee: committeeOptions[0] || '',
      committeeRole: 'Member',
    })
    setNewMemberImageFile(null)
    const createMemberSection = document.getElementById('create-member-form')
    if (createMemberSection) {
      createMemberSection.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }

	  const handleRejectRecruitment = async (recruitmentId) => {
	    setRecruitmentActionError('')
      const ok = await confirm({
        title: 'Reject application?',
        description: 'Rejecting will mark this recruitment as rejected.',
        confirmText: 'Reject',
        cancelText: 'Cancel',
        danger: true,
      })
      if (!ok) return
	    const result = await rejectRecruitment(recruitmentId)
	    if (!result.success) {
	      setRecruitmentActionError(result.message)
	      return
	    }
    if (pendingApprovalRecruitmentId === recruitmentId) {
      setPendingApprovalRecruitmentId(null)
    }
  }

  useEffect(() => {
    if (!newMemberImageFile) {
      setNewMemberImagePreviewUrl('')
      return undefined
    }

    const nextUrl = URL.createObjectURL(newMemberImageFile)
    setNewMemberImagePreviewUrl(nextUrl)

    return () => {
      try {
        URL.revokeObjectURL(nextUrl)
      } catch {
        // ignore
      }
    }
  }, [newMemberImageFile])

  return (
    <div className="animate-fade-in text-gray-900 dark:text-zinc-100">
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 dark:text-zinc-100">User Management</h2>
        </div>
      </div>

      {isAdmin && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-6">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-5 shadow-[0_10px_20px_rgba(0,0,0,0.25)] backdrop-blur-md xl:col-span-2">
            <h3 className="mb-3 font-semibold text-white">Create Member</h3>
            {pendingApprovalRecruitmentId && (
              <div className="mb-3 p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-sm">
                Recruitment approval in progress. Complete member creation to mark this application as approved.
              </div>
            )}
            {formError && <p className="text-sm text-red-600 mb-2">{formError}</p>}
            <form id="create-member-form" onSubmit={handleCreateMember} className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label htmlFor="create-member-name" className="block text-xs text-gray-500 mb-1">Full Name</label>
                <input
                  id="create-member-name"
                  name="name"
                  type="text"
                  placeholder="Full name"
                  value={newMember.name}
                  onChange={e => setNewMember({ ...newMember, name: e.target.value })}
                  className="w-full h-10 rounded-lg border border-white/15 bg-white/5 px-3 text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-yellow-300/35"
                  required
                  autoComplete="name"
                />
              </div>
              <div className="flex flex-col items-center md:row-span-2">
                <div
                  className="flex h-[150px] w-[150px] items-center justify-center overflow-hidden rounded-2xl border border-slate-200 !bg-white shadow-[0_14px_32px_rgba(15,23,42,0.12)]"
                  style={{ colorScheme: 'light', backgroundColor: '#ffffff' }}
                >
                  {newMemberImagePreviewUrl ? (
                    <img
                      src={newMemberImagePreviewUrl}
                      alt="Selected profile preview"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div
                      className="flex h-full w-full items-center justify-center !bg-white text-xs text-slate-400"
                      style={{ backgroundColor: '#ffffff' }}
                    >
                      No preview
                    </div>
                  )}
                </div>
              </div>
              <div>
                <label htmlFor="create-member-image" className="block text-xs text-gray-500 mb-1">Profile Image (optional)</label>
                <div
                  className="flex min-h-[56px] items-center gap-3 rounded-xl border border-slate-200 !bg-white px-3 py-2 text-slate-700 shadow-[0_12px_30px_rgba(15,23,42,0.08)]"
                  style={{ colorScheme: 'light', backgroundColor: '#ffffff' }}
                >
                  <label
                    htmlFor="create-member-image"
                    className="inline-flex cursor-pointer items-center justify-center rounded-xl bg-yellow-400 px-4 py-2 text-sm font-semibold text-slate-900 shadow-[0_8px_24px_rgba(250,204,21,0.35)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-yellow-300"
                  >
                    Choose File
                  </label>
                  <span className="min-w-0 truncate text-sm text-slate-600">
                    {newMemberImageFile?.name || 'No file chosen'}
                  </span>
                </div>
                <input
                  id="create-member-image"
                  name="profileImage"
                  type="file"
                  accept="image/*"
                  onChange={(e) => setNewMemberImageFile(e.target.files?.[0] || null)}
                  className="sr-only"
                />
              </div>
              <div>
                <label htmlFor="create-member-id-number" className="block text-xs text-gray-500 mb-1">ID Number</label>
                <input
                  id="create-member-id-number"
                  name="idNumber"
                  type="text"
                  placeholder="ID Number"
                  value={newMember.idNumber}
                  onChange={e => setNewMember({ ...newMember, idNumber: e.target.value })}
                  className="w-full h-10 rounded-lg border border-white/15 bg-white/5 px-3 text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-yellow-300/35"
                  required
                  autoComplete="off"
                />
              </div>
              <div>
                <label htmlFor="create-member-password" className="block text-xs text-gray-500 mb-1">Temporary Password</label>
                <div className="relative">
                  <input
                    id="create-member-password"
                    name="password"
                    type={showTempPassword ? 'text' : 'password'}
                    placeholder="Temporary password"
                    value={newMember.password}
                    onChange={e => setNewMember({ ...newMember, password: e.target.value })}
                    className="w-full h-10 rounded-lg border border-white/15 bg-white/5 px-3 pr-10 text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-yellow-300/35"
                    required
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowTempPassword(prev => !prev)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-yellow-300"
                    aria-label={showTempPassword ? 'Hide password' : 'Show password'}
                    title={showTempPassword ? 'Hide password' : 'Show password'}
                  >
                    {showTempPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
              <div>
                <label htmlFor="create-member-address" className="block text-xs text-gray-500 mb-1">Address</label>
                <input
                  id="create-member-address"
                  name="address"
                  type="text"
                  placeholder="Address"
                  value={newMember.address}
                  onChange={e => setNewMember({ ...newMember, address: e.target.value })}
                  className="w-full h-10 rounded-lg border border-white/15 bg-white/5 px-3 text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-yellow-300/35"
                  autoComplete="street-address"
                />
              </div>
                <div>
                  <label htmlFor="create-member-contact-number" className="block text-xs text-gray-500 mb-1">Contact Number</label>
                 <input
                   id="create-member-contact-number"
                   name="contactNumber"
                   type="text"
                   placeholder="Contact Number"
                   value={newMember.contactNumber}
                   onChange={e => setNewMember({ ...newMember, contactNumber: e.target.value })}
                   className="w-full h-10 rounded-lg border border-white/15 bg-white/5 px-3 text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-yellow-300/35"
                   autoComplete="tel"
                 />
                </div>
                 <div className="md:col-span-2 pt-2">
                  <p className="text-sm font-medium text-gray-800">In Case of Emergency</p>
                  <p className="text-xs text-gray-500">Emergency contact details for this member.</p>
                </div>
                <div>
                  <label htmlFor="create-member-emergency-number" className="block text-xs text-gray-500 mb-1">Emergency Number</label>
                  <input
                    id="create-member-emergency-number"
                    name="emergencyContactNumber"
                     type="tel"
                     placeholder="Emergency Contact Number"
                     value={newMember.emergencyContactNumber}
                     onChange={e => setNewMember({ ...newMember, emergencyContactNumber: e.target.value })}
                     className="w-full h-10 rounded-lg border border-white/15 bg-white/5 px-3 text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-yellow-300/35"
                     autoComplete="tel"
                   />
                 </div>
                 <div>
                  <label htmlFor="create-member-emergency-name" className="block text-xs text-gray-500 mb-1">Emergency Contact Name</label>
                  <input
                    id="create-member-emergency-name"
                    name="emergencyContactName"
                     type="text"
                     placeholder="Emergency Contact Name"
                     value={newMember.emergencyContactName}
                     onChange={e => setNewMember({ ...newMember, emergencyContactName: e.target.value })}
                     className="w-full h-10 rounded-lg border border-white/15 bg-white/5 px-3 text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-yellow-300/35"
                     autoComplete="name"
                   />
                 </div>
                 <div>
                  <label htmlFor="create-member-emergency-relationship" className="block text-xs text-gray-500 mb-1">Relationship</label>
                  <input
                    id="create-member-emergency-relationship"
                    name="emergencyContactRelationship"
                     type="text"
                     placeholder="Relationship"
                     value={newMember.emergencyContactRelationship}
                     onChange={e => setNewMember({ ...newMember, emergencyContactRelationship: e.target.value })}
                     className="w-full h-10 rounded-lg border border-white/15 bg-white/5 px-3 text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-yellow-300/35"
                     autoComplete="off"
                   />
                 </div>
                 <div>
                   <label htmlFor="create-member-blood-type" className="block text-xs text-gray-500 mb-1">Blood Type</label>
                   <select
                     id="create-member-blood-type"
                   name="bloodType"
                   value={newMember.bloodType}
                   onChange={e => setNewMember({ ...newMember, bloodType: e.target.value })}
                  className="w-full h-10 rounded-lg border border-white/15 bg-white/5 px-3 text-white focus:outline-none focus:ring-2 focus:ring-yellow-300/35"
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
                <label htmlFor="create-member-status" className="block text-xs text-gray-500 mb-1">Status</label>
                <select
                  id="create-member-status"
                  name="status"
                  value={newMember.status}
                  onChange={e => setNewMember({ ...newMember, status: e.target.value })}
                  className="w-full h-10 rounded-lg border border-white/15 bg-white/5 px-3 text-white focus:outline-none focus:ring-2 focus:ring-yellow-300/35"
                  required
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
              <div>
                <label htmlFor="create-member-role" className="block text-xs text-gray-500 mb-1">Type</label>
                <select
                  id="create-member-role"
                  name="role"
                  value={newMember.role}
                  onChange={e => {
                    const nextRole = e.target.value
                    setNewMember(prev => {
                      if (nextRole === 'admin') {
                        return {
                          ...prev,
                          role: 'admin',
                          committeeRole: 'Member',
                          committee: '',
                        }
                      }
                      if (nextRole === 'oic') {
                        return {
                          ...prev,
                          role: 'oic',
                          committeeRole: 'OIC',
                          committee: '',
                        }
                      }
                      return {
                        ...prev,
                        role: 'member',
                        committeeRole: 'Member',
                        committee: prev.committee || committeeOptions[0] || '',
                      }
                    })
                  }}
                  className="w-full h-10 rounded-lg border border-white/15 bg-white/5 px-3 text-white focus:outline-none focus:ring-2 focus:ring-yellow-300/35"
                  required
                >
                  {ROLE_OPTIONS.map(roleOption => (
                    <option key={roleOption.value} value={roleOption.value}>
                      {roleOption.label}
                    </option>
                  ))}
                </select>
              </div>

              {newMember.role === 'member' ? (
                <div>
                  <label htmlFor="create-member-committee" className="block text-xs text-gray-500 mb-1">Committee</label>
                  <select
                    id="create-member-committee"
                    name="committee"
                    value={newMember.committee}
                    onChange={e => setNewMember({ ...newMember, committee: e.target.value })}
                    className="w-full h-10 rounded-lg border border-white/15 bg-white/5 px-3 text-white focus:outline-none focus:ring-2 focus:ring-yellow-300/35"
                    required
                  >
                    {committeeOptions.map(committee => (
                      <option key={committee} value={committee}>
                        {committee}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div />
              )}
              <div>
                <label htmlFor="create-member-member-since" className="block text-xs text-gray-500 mb-1">Member Since</label>
                <input
                  id="create-member-member-since"
                  name="memberSince"
                  type="date"
                  value={newMember.memberSince}
                  onChange={e => setNewMember({ ...newMember, memberSince: e.target.value })}
                  className="w-full h-10 rounded-lg border border-white/15 bg-white/5 px-3 text-white focus:outline-none focus:ring-2 focus:ring-yellow-300/35"
                  autoComplete="off"
                />
              </div>
              <button
                type="submit"
                className="md:col-span-2 inline-flex items-center justify-center gap-2 rounded-xl border border-yellow-300/30 bg-yellow-400 px-4 py-2 text-sm font-semibold text-slate-900 transition-all duration-200 hover:scale-[1.01] hover:bg-yellow-300"
              >
                {pendingApprovalRecruitmentId ? 'Approve & Create Account' : 'Create Member'}
              </button>
            </form>
          </div>

        </div>
      )}

      {isAdmin && (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-5 shadow-[0_10px_20px_rgba(0,0,0,0.25)] backdrop-blur-md mb-6 animate-fade-in-up">
          <div className="flex items-center justify-between gap-3 mb-4">
            <div>
              <h3 className="flex items-center gap-2 font-semibold text-white">
                <BadgeCheck size={18} className="text-yellow-300" />
                Recruitment Inbox
              </h3>
              <p className="text-sm text-white/70">Review pending applications and approve or reject.</p>
            </div>
            <span className="rounded-full border border-amber-300/20 bg-amber-400/10 px-3 py-1 text-xs font-semibold text-amber-200">
              Pending: {pendingRecruitments.length}
            </span>
          </div>

          {recruitmentActionError && (
            <p className="text-sm text-red-600 mb-3">{recruitmentActionError}</p>
          )}

          <div className="space-y-3">
            {pendingRecruitments.length === 0 && (
              <div className="rounded-xl border border-dashed border-white/15 bg-white/5 p-5 text-center text-sm text-white/70 backdrop-blur-md">
                No pending recruitment applications.
              </div>
            )}

            {pendingRecruitments.map(entry => {
              const isExpanded = expandedRecruitmentId === entry.id
              return (
                <div key={entry.id} className="rounded-xl border border-white-200 bg-white-200 overflow-hidden transition-all duration-300">
                  <button
                    type="button"
                    onClick={() => setExpandedRecruitmentId(prev => (prev === entry.id ? null : entry.id))}
                    className="w-full text-left p-4"
                  >
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-semibold text-[white] truncate">{entry.fullName}</p>
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
                        <div className="rounded-lg bg-[white] border border-gray-200 p-3">
                          <p className="text-xs text-[black] mb-1">Full Name</p>
                          <p className="text-sm font-medium text-[black]">{entry.fullName}</p>
                        </div>
                        <div className="rounded-lg bg-[white] border border-gray-200 p-3">
                          <p className="text-xs text-[black] mb-1 flex items-center gap-1"><Mail size={12} /> Email</p>
                          <p className="text-sm font-medium text-[black] break-all">{entry.email}</p>
                        </div>
                        <div className="rounded-lg bg-[white] border border-gray-200 p-3">
                          <p className="text-xs text-[black] mb-1 flex items-center gap-1">ID Number</p>
                          <p className="text-sm font-medium text-[black]">{entry.idNumber || 'N/A'}</p>
                        </div>
                        <div className="rounded-lg bg-[white] border border-gray-200 p-3">
                          <p className="text-xs text-[black] mb-1 flex items-center gap-1"><Phone size={12} /> Contact Number</p>
                          <p className="text-sm font-medium text-[black]">{entry.contactNumber || 'N/A'}</p>
                        </div>
                        <div className="rounded-lg bg-[white] border border-gray-200 p-3">
                          <p className="text-xs text-[black] mb-1 flex items-center gap-1"><MapPin size={12} /> Address</p>
                          <p className="text-sm font-medium text-[black] break-words">{entry.address || 'N/A'}</p>
                        </div>
                        <div className="rounded-lg bg-[white] border border-gray-200 p-3">
                          <p className="text-xs text-[black] mb-1 flex items-center gap-1"><Droplets size={12} /> Blood Type</p>
                          <p className="text-sm font-medium text-[black]">{entry.bloodType || 'N/A'}</p>
                        </div>
                        <div className="rounded-lg bg-[white] border border-gray-200 p-3">
                          <p className="text-xs text-[black] mb-1 flex items-center gap-1"><Shield size={12} /> Insurance</p>
                          <p className="text-sm font-medium text-[black]">{entry.insuranceStatus || 'N/A'}</p>
                        </div>
                        <div className="rounded-lg bg-[white] border border-gray-200 p-3">
                          <p className="text-xs text-[black] mb-1 flex items-center gap-1"><Calendar size={12} /> Insurance Year</p>
                          <p className="text-sm font-medium text-[black]">{entry.insuranceYear || 'N/A'}</p>
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
        </div>
      )}

      <div className="mb-4 rounded-2xl border border-white/10 bg-white/5 p-4 shadow-[0_10px_20px_rgba(0,0,0,0.25)] backdrop-blur-md">
        <div className="space-y-3">
          <div className="relative w-full">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 z-10 -translate-y-1/2 text-slate-700"
              size={18}
              strokeWidth={2.25}
            />
            <input
              type="text"
              placeholder="Search by name, email, or ID..."
              value={searchQuery}
              onChange={e => {
                setCurrentPage(1)
                setSearchQuery(e.target.value)
              }}
              className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-10 pr-4 text-slate-900 shadow-sm placeholder:text-slate-400 focus:border-yellow-300 focus:outline-none focus:ring-2 focus:ring-yellow-400/40"
            />
          </div>
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
            <div className="relative flex-1">
            <Filter
              className="pointer-events-none absolute left-3 top-1/2 z-10 -translate-y-1/2 text-slate-700"
              size={18}
              strokeWidth={2.25}
            />
            <select
              value={roleFilter}
              onChange={e => {
                setCurrentPage(1)
                setRoleFilter(e.target.value)
                setCommitteeFilter('all')
              }}
              className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-10 pr-4 text-slate-900 shadow-sm focus:border-yellow-300 focus:outline-none focus:ring-2 focus:ring-yellow-400/40"
            >
                {ROLE_FILTER_OPTIONS.map(roleOption => (
                  <option key={roleOption.value} value={roleOption.value}>
                    {roleOption.label}
                  </option>
                ))}
              </select>
            </div>
            {roleFilter !== 'admin' ? (
              <div className="flex-1">
                <select
                  value={committeeFilter}
                  onChange={e => {
                    setCurrentPage(1)
                    setCommitteeFilter(e.target.value)
                  }}
                  className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2 text-slate-900 shadow-sm focus:border-yellow-300 focus:outline-none focus:ring-2 focus:ring-yellow-400/40"
                >
                  <option value="all">All Committees</option>
                  {committeeOptions.map(committee => (
                    <option key={committee} value={committee}>
                      {committee}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}
            <div className="relative flex-1">
              <Shield
                className="pointer-events-none absolute left-3 top-1/2 z-10 -translate-y-1/2 text-slate-700"
                size={18}
                strokeWidth={2.25}
              />
              <select
                value={insuranceFilter}
                onChange={e => {
                  setCurrentPage(1)
                  setInsuranceFilter(e.target.value)
                }}
                className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-10 pr-4 text-slate-900 shadow-sm focus:border-yellow-300 focus:outline-none focus:ring-2 focus:ring-yellow-400/40"
              >
                <option value="all">All Insurance</option>
                <option value="insured">Insured</option>
                <option value="not_insured">Not Insured</option>
              </select>
            </div>
            <div className="flex-1">
              <button
                type="button"
                onClick={handleExportMembersPdf}
                disabled={exportingPdf || filteredMembers.length === 0}
                className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-yellow-300/30 bg-yellow-400 px-4 py-2 text-sm font-semibold text-slate-900 transition-all duration-200 hover:scale-[1.01] hover:bg-yellow-300 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {exportingPdf ? 'Exporting PDF...' : 'Export PDF'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {isAdmin && (
        <div className="mb-4 rounded-2xl border border-white/10 bg-white/5 p-4 shadow-[0_10px_20px_rgba(0,0,0,0.25)] backdrop-blur-md">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <label className="inline-flex items-center gap-2 text-sm text-white/80">
              <input
                ref={selectAllRef}
                type="checkbox"
                checked={allSelectedOnPage}
                onChange={handleSelectAllOnPage}
                className="h-4 w-4 rounded border-white/30 bg-white/5 text-yellow-400 focus:ring-yellow-400/40"
              />
              Select all on this page
            </label>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-white/70">Selected: {selectedCount}</span>
              <button
                type="button"
                onClick={async () => {
                  if (selectedCount === 0 || bulkDeleteBusy) return
                  setBulkDeleteError('')
                  const ok = await confirm({
                    title: 'Delete selected members?',
                    description: `You are about to delete ${selectedCount} member${selectedCount === 1 ? '' : 's'}. This action cannot be undone.`,
                    confirmText: 'Delete',
                    cancelText: 'Cancel',
                    danger: true,
                  })
                  if (!ok) return
                  await handleBulkDelete()
                }}
                disabled={selectedCount === 0 || bulkDeleteBusy}
                className="rounded-lg bg-red-600 px-3 py-2 text-sm font-semibold text-white shadow-[0_10px_24px_rgba(220,38,38,0.28)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Delete selected
              </button>
            </div>
            {bulkDeleteError ? <p className="mt-2 text-xs text-red-200">{bulkDeleteError}</p> : null}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {currentMembers.length === 0 ? (
          <div className="col-span-full rounded-2xl border border-white/10 bg-white/5 p-12 text-center shadow-[0_10px_20px_rgba(0,0,0,0.25)] backdrop-blur-md">
            <Users size={48} className="mx-auto mb-4 text-white/40" />
            <p className="text-white/70">No members found for the selected filters</p>
          </div>
        ) : (
          currentMembers.map((member, index) => (
            <div
              key={member.id}
              className="relative animate-fade-in rounded-2xl border border-white/10 bg-white/5 p-6 shadow-[0_10px_20px_rgba(0,0,0,0.25)] backdrop-blur-md transition-all duration-300 hover:scale-[1.01]"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              {isAdmin && (
                <div className="absolute top-4 right-4">
                  <label className="inline-flex items-center gap-2 text-xs text-white/70">
                    <input
                      type="checkbox"
                      checked={selectedMemberIds.has(String(member?.id || '').trim())}
                      onChange={() => toggleMemberSelection(member.id)}
                      onClick={(event) => event.stopPropagation()}
                      className="h-4 w-4 rounded border-white/30 bg-white/5 text-yellow-400 focus:ring-yellow-400/40"
                      aria-label={`Select ${member.name}`}
                    />
                  </label>
                </div>
              )}
              <div className={isAdmin ? 'cursor-pointer' : ''} onClick={() => isAdmin && handleViewMember(member.id)}>
                <div className="flex items-center gap-4 mb-4">
                  {member.profileImage && member.profileImage !== '/kvi.png' ? (
                    <img 
                      src={member.profileImage} 
                      alt={`${member.name}'s profile`} 
                      className="w-16 h-16 rounded-full object-cover border-4 border-white shadow-lg" 
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-full bg-gradient-to-r from-yellow-400 to-yellow-500 flex items-center justify-center">
                      <span className="text-white font-bold text-xl">{member.name.charAt(0).toUpperCase()}</span>
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <h3 className="truncate text-lg font-semibold text-white">{member.name}</h3>
                    {(() => {
                      const memberCommitteeRole = member?.committeeRole || member?.committee_role || 'Member'
                      const memberType = memberCommitteeRole === 'OIC' ? 'oic' : (member.role === 'admin' ? 'admin' : 'member')
                      const label = memberType === 'admin' ? 'Administrator' : (memberType === 'oic' ? 'OIC' : 'Member')
                      return (
                        <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium border ${getRoleBadge(memberType)}`}>
                          {label}
                        </span>
                      )
                    })()}
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center gap-3 text-sm text-[white]">
                    <Mail size={16} className="text-[white]" />
                    <span className="truncate">{member.email || 'N/A'}</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-[white]">
                    <Calendar size={16} className="text-[white]" />
	                    <span>
	                      Joined{' '}
	                      {member.memberSince && dayjs(member.memberSince).isValid()
	                        ? dayjs(member.memberSince).format('MMM D, YYYY')
	                        : 'N/A'}
	                    </span>
                  </div>
                  <div className="text-sm text-[white]">
                    <span>Contact: {member.contactNumber || 'N/A'}</span>
                  </div>
                  <div className="text-sm text-[white]">
                    <span>
                      Insurance:{' '}
                      {member.insuranceStatus === 'Insured'
                        ? `Insured${member.insuranceYear ? ` (${member.insuranceYear})` : ''}`
                        : member.insuranceStatus || 'N/A'}
                    </span>
                  </div>
                  <div className="text-sm text-[white]">
                    <span>Blood Type: {member.bloodType || 'N/A'}</span>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  {member.role !== 'admin' && (member.committeeRole || member.committee_role) !== 'OIC' ? (
                    <span className="rounded-full border border-yellow-300/40 bg-yellow-300/12 px-3 py-1 text-xs font-bold text-yellow-200">
                      Committee: {member.committee || 'N/A'}
                    </span>
                  ) : null}
                  {(() => {
                    const memberCommitteeRole = member?.committeeRole || member?.committee_role || 'Member'
                    const memberType = memberCommitteeRole === 'OIC' ? 'oic' : (member.role === 'admin' ? 'admin' : 'member')
                    const label = memberType === 'admin' ? 'Admin' : (memberType === 'oic' ? 'OIC' : 'Member')
                    const tone = memberType === 'admin'
                      ? 'bg-red-50 text-red-700 border-red-200'
                      : memberType === 'oic'
                        ? 'bg-amber-50 text-amber-700 border-amber-200'
                        : 'bg-blue-50 text-blue-700 border-blue-200'
                    if (memberType === 'member' || memberType === 'admin') return null
                    return (
                      <span className={`px-2 py-1 rounded text-xs border ${tone}`}>
                        Role: {label}
                      </span>
                    )
                  })()}
                </div>

                {isAdmin && (
                  <div className="mt-4 flex items-center justify-center border-t border-[white] pt-4 text-sm text-[white]">
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
            className="px-4 py-2 rounded-lg bg-gray-100 text-[white] hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
          >
            Previous
          </button>
          <span className="text-sm text-[white]">
            Page {currentPage} of {totalPages}
          </span>
          <button
            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
            disabled={currentPage === totalPages}
            className="px-4 py-2 rounded-lg bg-gray-100 text-[white] hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
          >
            Next
          </button>
        </div>
      )}

    </div>
  )
}

export default Members




