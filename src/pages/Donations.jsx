import { useCallback, useEffect, useMemo, useState } from 'react'
import dayjs from 'dayjs'
import { RefreshCw, Trash2 } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import { isSupabaseEnabled } from '../lib/supabaseEvents'
import { useAuth } from '../context/AuthContext'

function Donations() {
  const { user, authResolved, loading: authLoading } = useAuth()
  const supabaseEnabled = isSupabaseEnabled()
  const isAdmin = user?.role === 'admin'

  const [donations, setDonations] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [deletingId, setDeletingId] = useState('')
  const [pendingDeleteId, setPendingDeleteId] = useState('')

  const canLoad = useMemo(() => Boolean(supabaseEnabled && isAdmin && authResolved && !authLoading), [
    supabaseEnabled,
    isAdmin,
    authResolved,
    authLoading,
  ])

  const loadDonations = useCallback(async () => {
    setError('')
    setLoading(true)
    try {
      const { data, error: queryError } = await supabase
        .from('donations')
        .select('id,donor_name,donor_email,reference_no,created_at')
        .order('created_at', { ascending: false })
        .limit(500)

      if (queryError) {
        setError(queryError.message || 'Unable to load donations.')
        setDonations([])
        return
      }
      setDonations(Array.isArray(data) ? data : [])
    } catch (error) {
      setError(error?.message ? String(error.message) : 'Unable to load donations.')
      setDonations([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!canLoad) {
      setLoading(false)
      return
    }
    void loadDonations()
  }, [canLoad, loadDonations])

  const handleRequestDelete = (id) => {
    const donationId = String(id || '').trim()
    if (!donationId) return
    if (deletingId) return
    setPendingDeleteId(donationId)
  }

  const closeDeleteConfirm = () => {
    if (deletingId) return
    setPendingDeleteId('')
  }

  const handleConfirmDelete = async () => {
    if (!pendingDeleteId) return
    if (deletingId) return

    const donationId = pendingDeleteId
    setDeletingId(donationId)
    setError('')
    try {
      const { error: deleteError } = await supabase.from('donations').delete().eq('id', donationId)
      if (deleteError) {
        setError(deleteError.message || 'Unable to delete donation record.')
        return
      }
      setDonations(prev => (Array.isArray(prev) ? prev.filter(row => String(row?.id) !== donationId) : []))
      setPendingDeleteId('')
    } catch (error) {
      setError(error?.message ? String(error.message) : 'Unable to delete donation record.')
    } finally {
      setDeletingId('')
    }
  }

  if (!authResolved || authLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-t-2 border-yellow-400"></div>
      </div>
    )
  }

  if (!isAdmin) {
    return (
      <div className="animate-fade-in py-6">
        <div className="mx-auto max-w-4xl rounded-2xl border border-white/10 bg-white/5 p-8 text-center shadow-[0_12px_30px_rgba(0,0,0,0.25)] backdrop-blur-md">
          <p className="text-sm font-semibold text-yellow-200">Admin access required</p>
          <p className="mt-2 text-white/70">Only admins can view donation records.</p>
        </div>
      </div>
    )
  }

  if (!supabaseEnabled) {
    return (
      <div className="animate-fade-in py-6">
        <div className="mx-auto max-w-4xl rounded-2xl border border-white/10 bg-white/5 p-8 text-center shadow-[0_12px_30px_rgba(0,0,0,0.25)] backdrop-blur-md">
          <p className="text-sm font-semibold text-yellow-200">Supabase is not configured</p>
          <p className="mt-2 text-white/70">Donation records require a configured Supabase project.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="animate-fade-in py-4">
      <div className="mx-auto w-full max-w-6xl">
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-2xl font-bold text-white">Donations</h2>
            <p className="text-sm text-white/70">Donation submissions from the landing page.</p>
          </div>
          <button
            type="button"
            onClick={loadDonations}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-sm font-semibold text-white shadow-sm backdrop-blur-md transition-colors hover:bg-white/10"
            disabled={loading}
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>

        {error ? (
          <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
        ) : null}

        <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/5 shadow-[0_10px_20px_rgba(0,0,0,0.25)] backdrop-blur-md">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-white/10 text-sm">
              <thead className="bg-white/5">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-white/150">Date</th>
                  <th className="px-4 py-3 text-left font-semibold text-white/150">Name</th>
                  <th className="px-4 py-3 text-left font-semibold text-white/150">Email</th>
                  <th className="px-4 py-3 text-left font-semibold text-white/150">Reference No.</th>
                  <th className="px-4 py-3 text-right font-semibold text-white/150">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/102">
                {loading ? (
                  <tr>
                    <td className="px-4 py-6 text-white/100" colSpan={5}>
                      Loading donations...
                    </td>
                  </tr>
                ) : donations.length === 0 ? (
                  <tr>
                    <td className="px-4 py-6 text-white/100" colSpan={5}>
                      No donation records yet.
                    </td>
                  </tr>
                ) : (
                  donations.map(row => (
                    <tr key={row.id} className="transition-colors hover:bg-white/5">
                      <td className="px-4 py-3 text-white/100">
                        {row.created_at ? dayjs(row.created_at).format('MMM D, YYYY h:mm A') : 'N/A'}
                      </td>
                      <td className="px-4 py-3 text-white/100">{row.donor_name || '-'}</td>
                      <td className="px-4 py-3 text-white/100">{row.donor_email || '-'}</td>
                      <td className="px-4 py-3 font-mono text-xs text-white/100">{row.reference_no || '-'}</td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => handleRequestDelete(row.id)}
                          disabled={Boolean(deletingId)}
                          className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white shadow-[0_10px_24px_rgba(220,38,38,0.28)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-red-500 disabled:opacity-60"
                          aria-label="Delete donation record"
                          title="Delete donation record"
                        >
                          <Trash2 size={14} />
                          {deletingId === row.id ? 'Deleting...' : 'Delete'}
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {pendingDeleteId ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4"
          role="dialog"
          aria-modal="true"
          onClick={closeDeleteConfirm}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-white/10 bg-[#041221]/95 p-5 text-white shadow-2xl backdrop-blur-xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold tracking-[0.2em] uppercase text-yellow-300">Confirm Delete</p>
                <h3 className="mt-1 text-lg font-bold text-white">Delete donation record?</h3>
              </div>
              <button
                type="button"
                onClick={closeDeleteConfirm}
                className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/15 text-white/70 transition-colors hover:bg-white/10 hover:text-white"
                aria-label="Close delete confirmation"
                disabled={Boolean(deletingId)}
              >
                <span className="text-lg leading-none">&times;</span>
              </button>
            </div>

            <p className="mt-3 text-sm text-white/70">
              This will permanently remove the donation record from the admin list.
            </p>

            <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={closeDeleteConfirm}
                disabled={Boolean(deletingId)}
                className="inline-flex items-center justify-center rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-sm font-semibold text-white shadow-sm backdrop-blur-md transition-colors hover:bg-white/10 disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={Boolean(deletingId)}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow-[0_12px_28px_rgba(220,38,38,0.3)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-red-500 disabled:opacity-60"
              >
                <Trash2 size={16} />
                {deletingId ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}

export default Donations
