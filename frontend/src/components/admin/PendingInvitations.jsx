import { useState, useEffect } from 'react'
import ENV from '../../../config'

const PendingInvitations = () => {
  const [invitations, setInvitations] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [resendingId, setResendingId] = useState(null)

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
        setError('Failed to fetch invitations')
      }
    } catch (error) {
      console.error('Failed to fetch invitations:', error)
      setError('Network error while fetching invitations')
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
      // You can implement this API endpoint if needed
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

  const clearMessages = () => {
    setError('')
    setSuccess('')
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Pending Invitations</h1>
          <p className="mt-2 text-gray-600">Track and manage employee invitation status</p>
        </div>

        {/* Success/Error Messages */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <svg className="w-5 h-5 text-red-500 mr-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                <span className="text-red-700">{error}</span>
              </div>
              <button
                onClick={clearMessages}
                className="text-red-400 hover:text-red-600 focus:outline-none"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        )}

        {success && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <svg className="w-5 h-5 text-green-500 mr-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span className="text-green-700">{success}</span>
              </div>
              <button
                onClick={clearMessages}
                className="text-green-400 hover:text-green-600 focus:outline-none"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-yellow-100 rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-2xl font-bold text-gray-900">{getInvitationsByStatus('pending').length}</p>
                <p className="text-sm text-gray-600">Pending</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-2xl font-bold text-gray-900">{getInvitationsByStatus('accepted').length}</p>
                <p className="text-sm text-gray-600">Accepted</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-2xl font-bold text-gray-900">{getInvitationsByStatus('expired').length}</p>
                <p className="text-sm text-gray-600">Expired</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-2xl font-bold text-gray-900">{invitations.length}</p>
                <p className="text-sm text-gray-600">Total</p>
              </div>
            </div>
          </div>
        </div>

        {/* Invitations List */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
          <div className="p-6 border-b border-gray-100">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">All Invitations</h3>
              <button
                onClick={fetchInvitations}
                disabled={loading}
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 transition-colors duration-200"
              >
                {loading ? (
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                ) : (
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                )}
                Refresh
              </button>
            </div>
          </div>

          <div className="p-6">
            {invitations.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                </div>
                <h4 className="text-lg font-medium text-gray-900 mb-2">No invitations found</h4>
                <p className="text-gray-500">Start by sending your first employee invitation</p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Pending Invitations */}
                {getInvitationsByStatus('pending').length > 0 && (
                  <div>
                    <h4 className="text-md font-semibold text-gray-900 mb-4 flex items-center">
                      <span className="w-3 h-3 bg-yellow-500 rounded-full mr-2 animate-pulse"></span>
                      Pending Invitations ({getInvitationsByStatus('pending').length})
                    </h4>
                    <div className="grid gap-4">
                      {getInvitationsByStatus('pending').map((invitation) => (
                        <div key={invitation.id} className="border border-yellow-200 bg-yellow-50 rounded-xl p-4 hover:shadow-md transition-shadow duration-200">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center">
                              <div className="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center">
                                <svg className="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                </svg>
                              </div>
                              <div className="ml-4">
                                <h4 className="text-sm font-semibold text-gray-900">{invitation.employee_email}</h4>
                                <p className="text-xs text-gray-600">
                                  Sent: {new Date(invitation.created_at).toLocaleDateString()}
                                </p>
                                <p className="text-xs text-gray-500">
                                  Expires: {new Date(new Date(invitation.created_at).getTime() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString()}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center space-x-2">
                              <button 
                                onClick={() => resendInvitation(invitation.id)}
                                disabled={resendingId === invitation.id}
                                className="inline-flex items-center px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg text-xs font-medium 
                                         hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 
                                         transition-all duration-200 disabled:opacity-50"
                              >
                                {resendingId === invitation.id ? (
                                  <svg className="animate-spin w-3 h-3 mr-1" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                  </svg>
                                ) : (
                                  <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                  </svg>
                                )}
                                {resendingId === invitation.id ? 'Sending...' : 'Resend'}
                              </button>
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(invitation.status)}`}>
                                {invitation.status}
                              </span>
                              <button
                                onClick={() => deleteInvitation(invitation.id)}
                                className="inline-flex items-center px-2 py-1.5 bg-red-50 text-red-600 rounded-lg text-xs font-medium hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-all duration-200"
                              >
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Accepted Invitations */}
                {getInvitationsByStatus('accepted').length > 0 && (
                  <div>
                    <h4 className="text-md font-semibold text-gray-900 mb-4 flex items-center">
                      <span className="w-3 h-3 bg-green-500 rounded-full mr-2"></span>
                      Accepted Invitations ({getInvitationsByStatus('accepted').length})
                    </h4>
                    <div className="grid gap-4">
                      {getInvitationsByStatus('accepted').map((invitation) => (
                        <div key={invitation.id} className="border border-green-200 bg-green-50 rounded-xl p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center">
                              <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                                <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                              </div>
                              <div className="ml-4">
                                <h4 className="text-sm font-semibold text-gray-900">{invitation.employee_email}</h4>
                                <p className="text-xs text-gray-600">
                                  Accepted: {new Date(invitation.updated_at || invitation.created_at).toLocaleDateString()}
                                </p>
                              </div>
                            </div>
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(invitation.status)}`}>
                              {invitation.status}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Expired Invitations */}
                {getInvitationsByStatus('expired').length > 0 && (
                  <div>
                    <h4 className="text-md font-semibold text-gray-900 mb-4 flex items-center">
                      <span className="w-3 h-3 bg-red-500 rounded-full mr-2"></span>
                      Expired Invitations ({getInvitationsByStatus('expired').length})
                    </h4>
                    <div className="grid gap-4">
                      {getInvitationsByStatus('expired').map((invitation) => (
                        <div key={invitation.id} className="border border-red-200 bg-red-50 rounded-xl p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center">
                              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                                <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                              </div>
                              <div className="ml-4">
                                <h4 className="text-sm font-semibold text-gray-900">{invitation.employee_email}</h4>
                                <p className="text-xs text-gray-600">
                                  Expired: {new Date(invitation.updated_at || invitation.created_at).toLocaleDateString()}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center space-x-2">
                              <button 
                                onClick={() => resendInvitation(invitation.id)}
                                disabled={resendingId === invitation.id}
                                className="inline-flex items-center px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg text-xs font-medium hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-200 disabled:opacity-50"
                              >
                                <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                </svg>
                                Resend
                              </button>
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(invitation.status)}`}>
                                {invitation.status}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* If no pending invitations */}
                {getInvitationsByStatus('pending').length === 0 && invitations.length > 0 && (
                  <div className="text-center py-8">
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <h4 className="text-lg font-medium text-gray-900 mb-2">No pending invitations</h4>
                    <p className="text-gray-500">All invitations have been processed</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default PendingInvitations
