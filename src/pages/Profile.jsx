import { useState } from 'react'
import { User, Mail, Hash, Shield, MapPin, Phone, Droplets, Edit2, ChevronRight } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'

function Profile() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [showEditOptions, setShowEditOptions] = useState(false)

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="flex justify-between items-start mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Profile</h2>
          <p className="text-sm text-gray-500">Manage your account settings</p>
        </div>
      </div>

      {/* Profile Card */}
      <div className="bg-white rounded-2xl shadow-xl overflow-visible mb-6 relative z-20">
        {/* Cover */}
        <div className="h-32 bg-gradient-to-r from-gray-900 to-black relative rounded-t-2xl">
          <div className="absolute -bottom-12 left-6">
            <div className="w-24 h-24 bg-white rounded-2xl shadow-lg flex items-center justify-center overflow-hidden">
              <img
                src={user?.profileImage || '/image-removebg-preview.png'}
                alt={user?.name || 'User'}
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        </div>

        {/* Profile Info */}
        <div className="pt-16 pb-6 px-6">
          <div className="flex justify-between items-start mb-3 relative">
            <div>
              <h3 className="text-2xl font-bold text-gray-800">{user?.name}</h3>
              <p className="text-gray-600">{user?.email}</p>
            </div>
            <div className="flex gap-2 items-start">
              <button
                onClick={() => setShowEditOptions(prev => !prev)}
                aria-label="Profile actions"
                className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                <Edit2 size={16} />
                <span className="text-sm font-medium">Edit</span>
              </button>
            </div>

            <div
              aria-hidden={!showEditOptions}
              className={`absolute right-0 top-12 z-30 w-56 rounded-xl border border-gray-200 bg-white shadow-lg p-2 transition-all duration-200 ${
                showEditOptions ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-1 pointer-events-none'
              }`}
            >
              <button
                onClick={() => {
                  setShowEditOptions(false)
                  navigate('/account/edit')
                }}
                className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm text-gray-700 hover:bg-gray-100 transition-colors"
              >
                <span>Account Info</span>
                <ChevronRight size={16} />
              </button>
              <button
                onClick={() => {
                  setShowEditOptions(false)
                  navigate('/change-password')
                }}
                className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm text-gray-700 hover:bg-gray-100 transition-colors"
              >
                <span>Change Password</span>
                <ChevronRight size={16} />
              </button>
            </div>
          </div>

          {/* Role Badge */}
          <div className="flex items-center gap-2">
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${
              user?.role === 'admin' 
                ? 'bg-red-100 text-red-700' 
                : 'bg-gray-100 text-gray-700'
            }`}>
              {user?.role === 'admin' ? (
                <span className="flex items-center gap-1">
                  <Shield size={14} />
                  Administrator
                </span>
              ) : (
                'Member'
              )}
            </span>
          </div>
        </div>
      </div>

      {/* Account Info */}
      <div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <User size={20} className="text-red-600" />
          Account Information
        </h3>

        <div className="space-y-4">
          <div className="flex items-center justify-between py-3 border-b border-gray-100">
            <span className="text-gray-600 flex items-center gap-2"><User size={16} /> Full Name</span>
            <span className="text-gray-800 font-medium">{user?.name || 'N/A'}</span>
          </div>
          <div className="flex items-center justify-between py-3 border-b border-gray-100">
            <span className="text-gray-600 flex items-center gap-2"><Mail size={16} /> Email</span>
            <span className="text-gray-800 font-medium">{user?.email || 'N/A'}</span>
          </div>
          <div className="flex items-center justify-between py-3 border-b border-gray-100">
            <span className="text-gray-600 flex items-center gap-2"><Hash size={16} /> ID Number</span>
            <span className="text-gray-800 font-medium">{user?.idNumber || 'N/A'}</span>
          </div>
          <div className="flex items-center justify-between py-3 border-b border-gray-100">
            <span className="text-gray-600 flex items-center gap-2"><MapPin size={16} /> Address</span>
            <span className="text-gray-800 font-medium text-right">{user?.address || 'Not set'}</span>
          </div>
          <div className="flex items-center justify-between py-3 border-b border-gray-100">
            <span className="text-gray-600 flex items-center gap-2"><Phone size={16} /> Contact Number</span>
            <span className="text-gray-800 font-medium">{user?.contactNumber || 'Not set'}</span>
          </div>
          <div className="flex items-center justify-between py-3 border-b border-gray-100">
            <span className="text-gray-600 flex items-center gap-2"><Droplets size={16} /> Blood Type</span>
            <span className="text-gray-800 font-medium">{user?.bloodType || 'Not set'}</span>
          </div>
          <div className="flex items-center justify-between py-3 border-b border-gray-100">
            <span className="text-gray-600">Role</span>
            <span className="text-gray-800 font-medium capitalize">{user?.role}</span>
          </div>
          <div className="flex items-center justify-between py-3">
            <span className="text-gray-600">Account Status</span>
            <span className="text-green-600 font-medium flex items-center gap-1">
              <span className="w-2 h-2 bg-green-500 rounded-full"></span>
              {user?.accountStatus || 'Active'}
            </span>
          </div>
        </div>
      </div>

      
    
    </div>
  )
}

export default Profile
