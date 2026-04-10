import { useCallback, useEffect, useMemo, useState } from 'react'
import dayjs from 'dayjs'
import { HandHeart, Trash2 } from 'lucide-react'
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

  const handleDelete = async (id) => {
    const donationId = String(id || '').trim()
    if (!donationId) return
    if (deletingId) return

    const confirmed = window.confirm('Delete this donation record?')
    if (!confirmed) return

    setDeletingId(donationId)
    setError('')
    try {
      const { error: deleteError } = await supabase.from('donations').delete().eq('id', donationId)
      if (deleteError) {
        setError(deleteError.message || 'Unable to delete donation record.')
        return
      }
      setDonations(prev => (Array.isArray(prev) ? prev.filter(row => String(row?.id) !== donationId) : []))
    } catch (error) {
      setError(error?.message ? String(error.message) : 'Unable to delete donation record.')
    } finally {
      setDeletingId('')
    }
  }

  if (!authResolved || authLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-red-600"></div>
      </div>
    )
  }

  if (!isAdmin) {
    return (
      <div className="animate-fade-in py-6">
        <div className="mx-auto max-w-4xl rounded-2xl border border-red-200 bg-white p-8 text-center shadow-sm">
          <p className="text-sm font-semibold text-red-700">Admin access required</p>
          <p className="mt-2 text-gray-600">Only admins can view donation records.</p>
        </div>
      </div>
    )
  }

  if (!supabaseEnabled) {
    return (
      <div className="animate-fade-in py-6">
        <div className="mx-auto max-w-4xl rounded-2xl border border-red-200 bg-white p-8 text-center shadow-sm">
          <p className="text-sm font-semibold text-red-700">Supabase is not configured</p>
          <p className="mt-2 text-gray-600">Donation records require a configured Supabase project.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="animate-fade-in py-4">
      <div className="mx-auto w-full max-w-6xl">
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Donations</h2>
            <p className="text-sm text-gray-500">Donation submissions from the landing page.</p>
          </div>
          <button
            type="button"
            onClick={loadDonations}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-red-200 bg-white px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-50"
            disabled={loading}
          >
            <HandHeart size={16} />
            Refresh
          </button>
        </div>

        {error ? (
          <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
        ) : null}

        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">Date</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">Name</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">Email</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">Reference No.</th>
                  <th className="px-4 py-3 text-right font-semibold text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  <tr>
                    <td className="px-4 py-6 text-gray-500" colSpan={5}>
                      Loading donations...
                    </td>
                  </tr>
                ) : donations.length === 0 ? (
                  <tr>
                    <td className="px-4 py-6 text-gray-500" colSpan={5}>
                      No donation records yet.
                    </td>
                  </tr>
                ) : (
                  donations.map(row => (
                    <tr key={row.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-gray-700">
                        {row.created_at ? dayjs(row.created_at).format('MMM D, YYYY h:mm A') : 'N/A'}
                      </td>
                      <td className="px-4 py-3 text-gray-700">{row.donor_name || '-'}</td>
                      <td className="px-4 py-3 text-gray-700">{row.donor_email || '-'}</td>
                      <td className="px-4 py-3 font-mono text-xs text-gray-700">{row.reference_no || '-'}</td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => handleDelete(row.id)}
                          disabled={Boolean(deletingId)}
                          className="inline-flex items-center gap-2 rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:opacity-60"
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
    </div>
  )
}

export default Donations
