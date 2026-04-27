import { useEffect, useMemo, useState } from 'react'
import { Users } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

function CommitteeManagement() {
  const {
    user,
    committees,
    addCommittee,
    editCommittee,
    deleteCommittee,
    getAllMembers,
    getAdmins,
    ensureAdminDataLoaded,
  } = useAuth()

  const isAdmin = user?.role === 'admin'

  const [committeeName, setCommitteeName] = useState('')
  const [committeeActionBusy, setCommitteeActionBusy] = useState(false)
  const [committeeError, setCommitteeError] = useState('')

  const [showEditCommitteeModal, setShowEditCommitteeModal] = useState(false)
  const [committeeToEdit, setCommitteeToEdit] = useState('')
  const [editedCommitteeName, setEditedCommitteeName] = useState('')

  const [showDeleteCommitteeModal, setShowDeleteCommitteeModal] = useState(false)
  const [committeeToDelete, setCommitteeToDelete] = useState('')
  const [fallbackCommittee, setFallbackCommittee] = useState('')

  useEffect(() => {
    if (!isAdmin) return
    void ensureAdminDataLoaded()
  }, [ensureAdminDataLoaded, isAdmin, user?.id])

  const committeeOptions = useMemo(() => {
    const list = Array.isArray(committees) ? committees : []
    return list.filter(Boolean)
  }, [committees])

  const members = useMemo(() => {
    const allMembers = getAllMembers()
    return Array.isArray(allMembers) ? allMembers : []
  }, [getAllMembers])

  const admins = useMemo(() => {
    const allAdmins = getAdmins()
    return Array.isArray(allAdmins) ? allAdmins : []
  }, [getAdmins])

  const userCountByCommittee = useMemo(() => {
    const map = {}
    const allUsers = [...admins, ...members]
    allUsers.forEach(member => {
      const committee = String(member?.committee || '').trim()
      if (!committee) return
      map[committee] = (map[committee] || 0) + 1
    })
    return map
  }, [admins, members])

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
  }

  const deletingCommitteeAssignedCount = committeeToDelete ? (userCountByCommittee[committeeToDelete] || 0) : 0

  return (
    <div className="animate-fade-in text-white">
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-bold text-white">Committee Management</h2>
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/5 p-5 shadow-[0_10px_20px_rgba(0,0,0,0.25)] backdrop-blur-md">
        <div className="flex items-center gap-2 mb-3">
          <Users size={18} className="text-yellow-300" />
          <h3 className="font-semibold text-white">Committees</h3>
        </div>

        {committeeError && <p className="text-sm text-red-600 mb-3">{committeeError}</p>}

        <form onSubmit={handleCommitteeAdd} className="flex flex-col sm:flex-row gap-2 mb-4">
          <input
            id="committee-new-name"
            name="committeeName"
            type="text"
            value={committeeName}
            onChange={e => setCommitteeName(e.target.value)}
            placeholder="New committee name"
            className="w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-white shadow-sm backdrop-blur-md focus:border-yellow-300 focus:outline-none focus:ring-2 focus:ring-yellow-400/40"
            disabled={committeeActionBusy}
            autoComplete="off"
          />
          <button
            type="submit"
            className="px-4 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            disabled={committeeActionBusy}
          >
            Add
          </button>
        </form>

        <div className="space-y-2 max-h-[520px] overflow-auto pr-1">
          {committeeOptions.length === 0 ? (
            <p className="text-sm text-white/70">No committees available.</p>
          ) : (
            committeeOptions.map(name => (
              <div
                key={name}
                className="flex items-start justify-between gap-3 rounded-xl border border-white/10 bg-white/5 px-3 py-2"
              >
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-white truncate">{name}</p>
                  <p className="mt-0.5 text-xs text-white/70">
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

      {isAdmin && showEditCommitteeModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="w-full max-w-xl rounded-2xl border border-white/10 bg-[#041221]/95 p-5 text-white shadow-2xl backdrop-blur-xl space-y-4 animate-fade-in-up">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-white">Edit Committee</h3>
              <button
                type="button"
                onClick={() => {
                  if (committeeActionBusy) return
                  setShowEditCommitteeModal(false)
                  setCommitteeToEdit('')
                  setEditedCommitteeName('')
                  setCommitteeError('')
                }}
                className="rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 text-sm font-semibold text-white shadow-sm backdrop-blur-md transition-colors hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
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
                className="rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-white shadow-sm backdrop-blur-md focus:border-yellow-300 focus:outline-none focus:ring-2 focus:ring-yellow-400/40"
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
          <div className="w-full max-w-xl rounded-2xl border border-white/10 bg-[#041221]/95 p-5 text-white shadow-2xl backdrop-blur-xl space-y-4 animate-fade-in-up">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-white">Delete Committee</h3>
              <button
                type="button"
                onClick={() => {
                  if (committeeActionBusy) return
                  setShowDeleteCommitteeModal(false)
                  setCommitteeToDelete('')
                  setFallbackCommittee('')
                  setCommitteeError('')
                }}
                className="rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 text-sm font-semibold text-white shadow-sm backdrop-blur-md transition-colors hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={committeeActionBusy}
              >
                Close
              </button>
            </div>

            <div className="space-y-2 text-sm text-white/80">
              <p>
                You are about to delete <span className="font-semibold">{committeeToDelete}</span>.
              </p>
              {deletingCommitteeAssignedCount > 0 ? (
                <p className="text-amber-200">
                  {deletingCommitteeAssignedCount} user(s) are assigned. Choose a fallback committee to reassign them.
                </p>
              ) : (
                <p className="text-white/70">
                  No users are assigned to this committee.
                </p>
              )}
            </div>

            {deletingCommitteeAssignedCount > 0 && (
              <div className="space-y-1">
                <label className="block text-xs text-white/70">Reassign to</label>
                <select
                  value={fallbackCommittee}
                  onChange={e => setFallbackCommittee(e.target.value)}
                  className="h-10 w-full rounded-lg border border-white/15 bg-white/5 px-3 text-white shadow-sm backdrop-blur-md focus:border-yellow-300 focus:outline-none focus:ring-2 focus:ring-yellow-400/40"
                  disabled={committeeActionBusy}
                >
                  <option value="">Select committee</option>
                  {committeeOptions
                    .filter(item => item !== committeeToDelete)
                    .map(name => (
                      <option key={name} value={name}>{name}</option>
                    ))}
                </select>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowDeleteCommitteeModal(false)}
                className="rounded-lg border border-white/15 bg-white/5 px-4 py-2 text-sm font-semibold text-white shadow-sm backdrop-blur-md transition-colors hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={committeeActionBusy}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCommitteeDelete}
                className="rounded-lg border border-red-300/30 bg-red-500/20 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-500/30 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={committeeActionBusy}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default CommitteeManagement
