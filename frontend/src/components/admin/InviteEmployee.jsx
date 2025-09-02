import { useState, useEffect } from 'react'
import InputField from '../reusable/InputField'
import ENV from '../../../config'

const InviteEmployee = () => {
  const [newInvitation, setNewInvitation] = useState({
    email: ''
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [invitations, setInvitations] = useState([])
  const [resendingId, setResendingId] = useState(null)
  const [fetchingInvitations, setFetchingInvitations] = useState(false)

  useEffect(() => {
    fetchInvitations()
  }, [])

  const fetchInvitations = async () => {
    try {
      setLoading(true)
      const response = await fetch(`${ENV.API_BASE_URL}/api/accounts/invitations/`, {
        headers: {
          'Authorization': `Token ${localStorage.getItem('authToken')}`
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        setInvitations(data.invitations)
      } else {
        console.error('Failed to fetch invitations')
      }
    } catch (error) {
      console.error('Failed to fetch invitations:', error)
    } finally {
      setLoading(false)
    }
  }

  const resendInvitation = async (invitationId) => {
    try {
      setResendingId(invitationId)
      setError('')
      setSuccess('')
      
      const response = await fetch(`${ENV.API_BASE_URL}/api/accounts/resend-invitation/${invitationId}/`, {
        method: 'POST',
        headers: {
          'Authorization': `Token ${localStorage.getItem('authToken')}`
        }
      })

      if (response.ok) {
        setSuccess('Invitation resent successfully')
        fetchInvitations()
      } else {
        const errorData = await response.json()
        setError(errorData.message || 'Failed to resend invitation')
      }
    } catch (error) {
      setError('Network error. Please try again.')
    } finally {
      setResendingId(null)
    }
  }

  const deleteInvitation = async (invitationId) => {
    try {
      setLoading(true)
      // Placeholder for delete invitation functionality
      console.log('Deleting invitation:', invitationId)
      setSuccess('Delete invitation feature coming soon')
      
      setTimeout(() => {
        setSuccess('')
      }, 3000)
    } catch (error) {
      setError('Failed to delete invitation')
    } finally {
      setLoading(false)
    }
  }

  const getInvitationsByStatus = (status) => {
    return invitations.filter(inv => inv.status === status)
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800'
      case 'accepted':
        return 'bg-green-100 text-green-800'
      case 'expired':
        return 'bg-red-100 text-red-800'
      case 'cancelled':
        return 'bg-gray-100 text-gray-800'
      default:
        return 'bg-blue-100 text-blue-800'
    }
  }

  const handleInviteEmployee = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess('')

    try {
      const response = await fetch(`${ENV.API_BASE_URL}/api/accounts/send-invitation/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Token ${localStorage.getItem('authToken')}`
        },
        body: JSON.stringify({
          email_address: newInvitation.email
        })
      })

      if (response.ok) {
        const data = await response.json()
        setSuccess(`Invitation sent successfully to ${newInvitation.email}`)
        
        setNewInvitation({ email: '' })
        // Refresh invitations list to show the new invitation
        fetchInvitations()
      } else {
        const errorData = await response.json()
        setError(errorData.message || 'Failed to send invitation')
      }
    } catch (error) {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (e) => {
    setNewInvitation({
      ...newInvitation,
      [e.target.name]: e.target.value
    })
  }

  const clearMessages = () => {
    setError('')
    setSuccess('')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50/30 py-6 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header Section */}
        <div className="mb-8 text-center lg:text-left">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-6">
            <div>
              <h1 className="text-4xl lg:text-5xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 bg-clip-text text-transparent mb-2">
                Employee Invitations
              </h1>
              <p className="text-lg text-gray-600 max-w-2xl">
                Manage employee invitations with real-time tracking and seamless onboarding
              </p>
            </div>
            <div className="mt-4 lg:mt-0">
              <div className="flex items-center justify-center lg:justify-end space-x-2 text-sm text-gray-500">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                <span>Live Updates</span>
              </div>
            </div>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Total Invitations Card */}
          <div className="group relative overflow-hidden bg-white/80 backdrop-blur-xl rounded-3xl p-6 shadow-lg border border-white/40 hover:shadow-2xl transition-all duration-500 transform hover:-translate-y-2">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-indigo-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            <div className="relative">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl shadow-lg">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <span className="text-2xl font-bold text-blue-600">{invitations.length}</span>
              </div>
              <h3 className="text-sm font-semibold text-gray-600 mb-1">Total Invitations</h3>
              <p className="text-xs text-gray-500">All time invitations sent</p>
            </div>
          </div>

          {/* Pending Invitations Card */}
          <div className="group relative overflow-hidden bg-white/80 backdrop-blur-xl rounded-3xl p-6 shadow-lg border border-white/40 hover:shadow-2xl transition-all duration-500 transform hover:-translate-y-2">
            <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/5 to-orange-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            <div className="relative">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-gradient-to-br from-yellow-500 to-orange-500 rounded-2xl shadow-lg">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <span className="text-2xl font-bold text-yellow-600">{getInvitationsByStatus('pending').length}</span>
              </div>
              <h3 className="text-sm font-semibold text-gray-600 mb-1">Pending</h3>
              <p className="text-xs text-gray-500">Awaiting response</p>
            </div>
          </div>

          {/* Accepted Invitations Card */}
          <div className="group relative overflow-hidden bg-white/80 backdrop-blur-xl rounded-3xl p-6 shadow-lg border border-white/40 hover:shadow-2xl transition-all duration-500 transform hover:-translate-y-2">
            <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 to-emerald-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            <div className="relative">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl shadow-lg">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <span className="text-2xl font-bold text-green-600">{getInvitationsByStatus('accepted').length}</span>
              </div>
              <h3 className="text-sm font-semibold text-gray-600 mb-1">Accepted</h3>
              <p className="text-xs text-gray-500">Successfully onboarded</p>
            </div>
          </div>

          {/* Expired Invitations Card */}
          <div className="group relative overflow-hidden bg-white/80 backdrop-blur-xl rounded-3xl p-6 shadow-lg border border-white/40 hover:shadow-2xl transition-all duration-500 transform hover:-translate-y-2">
            <div className="absolute inset-0 bg-gradient-to-br from-red-500/5 to-pink-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            <div className="relative">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-gradient-to-br from-red-500 to-pink-600 rounded-2xl shadow-lg">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <span className="text-2xl font-bold text-red-600">{getInvitationsByStatus('expired').length}</span>
              </div>
              <h3 className="text-sm font-semibold text-gray-600 mb-1">Expired</h3>
              <p className="text-xs text-gray-500">Need to resend</p>
            </div>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 xl:grid-cols-5 gap-8">
          {/* Left Column - Invitation Form */}
          <div className="xl:col-span-2">
            <div className="sticky top-6">
              <div className="bg-white/90 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/50 p-8 hover:shadow-3xl transition-all duration-500">
                <div className="text-center mb-8">
                  <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-3xl shadow-2xl mb-6">
                    <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                    </svg>
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">Send New Invitation</h2>
                  <p className="text-gray-600">Invite talented individuals to join your team</p>
                </div>

                {/* Success/Error Messages */}
                {error && (
                  <div className="mb-6 p-4 bg-red-50/80 border border-red-200/60 rounded-2xl backdrop-blur-sm">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 w-8 h-8 bg-red-100 rounded-full flex items-center justify-center mr-3">
                          <svg className="w-4 h-4 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                          </svg>
                        </div>
                        <span className="text-red-800 font-medium">{error}</span>
                      </div>
                      <button
                        onClick={clearMessages}
                        className="text-red-400 hover:text-red-600 transition-colors p-1 rounded-full hover:bg-red-100"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  </div>
                )}

                {success && (
                  <div className="mb-6 p-4 bg-green-50/80 border border-green-200/60 rounded-2xl backdrop-blur-sm">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 w-8 h-8 bg-green-100 rounded-full flex items-center justify-center mr-3">
                          <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                        </div>
                        <span className="text-green-800 font-medium">{success}</span>
                      </div>
                      <button
                        onClick={clearMessages}
                        className="text-green-400 hover:text-green-600 transition-colors p-1 rounded-full hover:bg-green-100"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  </div>
                )}

                {/* Invitation Form */}
                <form onSubmit={handleInviteEmployee} className="space-y-6">
                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-gray-700">
                      Employee Email Address
                    </label>
                    <div className="relative">
                      <input
                        type="email"
                        name="email"
                        value={newInvitation.email}
                        onChange={handleChange}
                        placeholder="employee@company.com"
                        required
                        className="w-full px-4 py-4 bg-gray-50/50 border border-gray-200 rounded-2xl focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-300 text-gray-900 placeholder-gray-500 font-medium"
                      />
                      <div className="absolute inset-y-0 right-0 flex items-center pr-4">
                        <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                        </svg>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200/60 rounded-2xl p-6">
                    <div className="flex items-start">
                      <div className="flex-shrink-0 w-10 h-10 bg-blue-500/10 rounded-xl flex items-center justify-center mr-4">
                        <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold text-blue-900 mb-2">Invitation Process</h4>
                        <ul className="space-y-2 text-sm text-blue-700">
                          <li className="flex items-center">
                            <div className="w-1.5 h-1.5 bg-blue-500 rounded-full mr-3"></div>
                            Secure email invitation sent instantly
                          </li>
                          <li className="flex items-center">
                            <div className="w-1.5 h-1.5 bg-blue-500 rounded-full mr-3"></div>
                            Employee receives account setup link
                          </li>
                          <li className="flex items-center">
                            <div className="w-1.5 h-1.5 bg-blue-500 rounded-full mr-3"></div>
                            Real-time status tracking available
                          </li>
                        </ul>
                      </div>
                    </div>
                  </div>

                  <button 
                    type="submit" 
                    disabled={loading || !newInvitation.email}
                    className="group relative w-full overflow-hidden bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white py-4 px-8 rounded-2xl font-bold text-lg shadow-2xl hover:shadow-3xl transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-400 to-purple-400 opacity-0 group-hover:opacity-20 transition-opacity duration-300"></div>
                    {loading ? (
                      <div className="relative flex items-center justify-center">
                        <svg className="animate-spin -ml-1 mr-3 h-6 w-6 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Sending Invitation...
                      </div>
                    ) : (
                      <div className="relative flex items-center justify-center">
                        <svg className="w-6 h-6 mr-3 group-hover:rotate-12 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                        </svg>
                        Send Invitation
                      </div>
                    )}
                  </button>
                </form>
              </div>
            </div>
          </div>

          {/* Right Column - Pending Invitations Management */}
          <div className="xl:col-span-3">
            <div className="bg-white/90 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/50 overflow-hidden hover:shadow-3xl transition-all duration-500">
              {/* Header */}
              <div className="bg-gradient-to-r from-slate-50 to-blue-50/50 px-8 py-6 border-b border-gray-200/60">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-1">Invitation Management</h2>
                    <p className="text-gray-600">Monitor and manage all employee invitations</p>
                  </div>
                  <div className="mt-4 sm:mt-0 flex items-center space-x-4">
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 bg-yellow-400 rounded-full animate-pulse"></div>
                      <span className="text-sm font-medium text-gray-600">
                        {getInvitationsByStatus('pending').length} Pending
                      </span>
                    </div>
                    <button
                      onClick={fetchInvitations}
                      disabled={fetchingInvitations}
                      className="inline-flex items-center px-4 py-2 bg-white/80 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-white hover:shadow-md transition-all duration-200"
                    >
                      <svg className={`w-4 h-4 mr-2 ${fetchingInvitations ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      Refresh
                    </button>
                  </div>
                </div>
              </div>

              {/* Content */}
              <div className="p-8">
                {loading && !invitations.length ? (
                  <div className="flex flex-col items-center justify-center py-16">
                    <div className="relative">
                      <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-200 border-t-blue-600"></div>
                      <div className="absolute inset-0 rounded-full bg-blue-50 opacity-20"></div>
                    </div>
                    <p className="mt-4 text-gray-600 font-medium">Loading invitations...</p>
                  </div>
                ) : invitations.length === 0 ? (
                  <div className="text-center py-16">
                    <div className="inline-flex items-center justify-center w-24 h-24 bg-gray-100 rounded-3xl mb-6">
                      <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                      </svg>
                    </div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">No invitations yet</h3>
                    <p className="text-gray-500 max-w-md mx-auto mb-6">
                      Start building your team by sending your first employee invitation using the form on the left.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {invitations.map((invitation, index) => (
                      <div 
                        key={invitation.id} 
                        className="group relative bg-gray-50/50 hover:bg-white border border-gray-200/60 hover:border-gray-300/80 rounded-2xl p-6 transition-all duration-300 hover:shadow-lg"
                        style={{ animationDelay: `${index * 50}ms` }}
                      >
                        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
                          {/* Left Section - User Info */}
                          <div className="flex items-start space-x-4 flex-1">
                            <div className={`flex-shrink-0 w-12 h-12 rounded-2xl flex items-center justify-center ${
                              invitation.status === 'pending' ? 'bg-yellow-100' :
                              invitation.status === 'accepted' ? 'bg-green-100' :
                              invitation.status === 'expired' ? 'bg-red-100' : 'bg-gray-100'
                            }`}>
                              <svg className={`w-6 h-6 ${
                                invitation.status === 'pending' ? 'text-yellow-600' :
                                invitation.status === 'accepted' ? 'text-green-600' :
                                invitation.status === 'expired' ? 'text-red-600' : 'text-gray-600'
                              }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                              </svg>
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className="text-lg font-semibold text-gray-900 mb-1 truncate">
                                {invitation.email}
                              </h4>
                              <div className="flex flex-wrap items-center gap-2 text-sm text-gray-600">
                                <span className="flex items-center">
                                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3a2 2 0 012-2h4a2 2 0 012 2v4m-6 0V5a2 2 0 012-2h4a2 2 0 012 2v2m-6 0h8m0 0V9a2 2 0 01-2 2H8a2 2 0 01-2-2V7m0 0h8" />
                                  </svg>
                                  {invitation.sent_at ? new Date(invitation.sent_at).toLocaleDateString('en-US', { 
                                    year: 'numeric', 
                                    month: 'short', 
                                    day: 'numeric'
                                  }) : 'Date unavailable'}
                                </span>
                                <span className="text-gray-400">•</span>
                                <span className="flex items-center">
                                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                  </svg>
                                  {invitation.sent_at ? new Date(invitation.sent_at).toLocaleTimeString('en-US', {
                                    hour: '2-digit',
                                    minute: '2-digit',
                                    hour12: true
                                  }) : 'Time unavailable'}
                                </span>
                                {invitation.expires_at && (
                                  <>
                                    <span className="text-gray-400">•</span>
                                    <span className="flex items-center text-orange-600">
                                      <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                      </svg>
                                      Expires {new Date(invitation.expires_at).toLocaleDateString('en-US', { 
                                        month: 'short', 
                                        day: 'numeric'
                                      })}
                                    </span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Right Section - Status & Actions */}
                          <div className="flex items-center justify-between lg:justify-end space-x-4">
                            <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold ${
                              getStatusColor(invitation.status)
                            }`}>
                              <div className={`w-1.5 h-1.5 rounded-full mr-2 ${
                                invitation.status === 'pending' ? 'bg-yellow-600 animate-pulse' :
                                invitation.status === 'accepted' ? 'bg-green-600' :
                                invitation.status === 'expired' ? 'bg-red-600' : 'bg-gray-600'
                              }`}></div>
                              {invitation.status.charAt(0).toUpperCase() + invitation.status.slice(1)}
                            </span>
                            
                            <div className="flex items-center space-x-2">
                              <button
                                onClick={() => resendInvitation(invitation.id)}
                                disabled={resendingId === invitation.id}
                                className="inline-flex items-center px-4 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 text-sm font-medium rounded-xl border border-blue-200 hover:border-blue-300 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                {resendingId === invitation.id ? (
                                  <>
                                    <svg className="animate-spin -ml-0.5 mr-2 h-4 w-4 text-blue-700" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    Sending
                                  </>
                                ) : (
                                  <>
                                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                    </svg>
                                    Resend
                                  </>
                                )}
                              </button>
                              
                              <button
                                onClick={() => deleteInvitation(invitation.id)}
                                className="inline-flex items-center px-4 py-2 bg-red-50 hover:bg-red-100 text-red-700 text-sm font-medium rounded-xl border border-red-200 hover:border-red-300 transition-all duration-200"
                              >
                                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                                Delete
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default InviteEmployee
