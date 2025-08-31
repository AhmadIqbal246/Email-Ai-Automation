import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { logoutUser } from '../../redux/authSlice'
import InputField from '../../components/reusable/InputField'
import Navbar from '../../components/mutual/Navbar'
import ENV from '../../../config'

const EmployeeDashboard = () => {
  const dispatch = useDispatch()
  const { user } = useSelector((state) => state.auth)
  const [emailAccounts, setEmailAccounts] = useState([])
  const [emails, setEmails] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [oauthData, setOauthData] = useState(null)
  const [showOauthModal, setShowOauthModal] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    fetchEmailAccounts()
    fetchEmails()
  }, [])

  const fetchEmailAccounts = async () => {
    try {
      console.log('Fetching email accounts...')
      const token = localStorage.getItem('authToken')
      console.log('Email accounts - Token exists:', !!token)
      console.log('API URL:', ENV.API_BASE_URL)
      
      const response = await fetch(`${ENV.API_BASE_URL}/api/email-accounts/`, {
        headers: {
          'Authorization': `Token ${token}`
        }
      })
      
      console.log('Email accounts - Response status:', response.status)
      
      if (response.ok) {
        const data = await response.json()
        console.log('Email accounts - Data:', data)
        setEmailAccounts(data.email_accounts)
      } else {
        console.log('Email accounts - Failed with status:', response.status)
        const errorData = await response.json()
        console.log('Email accounts - Error data:', errorData)
      }
    } catch (error) {
      console.error('Failed to fetch email accounts:', error)
    }
  }


  const fetchEmails = async () => {
    try {
      console.log('Fetching emails...')
      const token = localStorage.getItem('authToken')
      console.log('Emails - Token exists:', !!token)
      
      const response = await fetch(`${ENV.API_BASE_URL}/api/get-emails/`, {
        headers: {
          'Authorization': `Token ${token}`
        }
      })
      
      console.log('Emails - Response status:', response.status)
      
      if (response.ok) {
        const data = await response.json()
        console.log('Emails - Data:', data)
        setEmails(data.emails || [])
      } else {
        console.log('Emails - Failed with status:', response.status)
        const errorData = await response.json()
        console.log('Emails - Error data:', errorData)
      }
    } catch (error) {
      console.error('Failed to fetch emails:', error)
    }
  }

  const handleLogout = async () => {
    await dispatch(logoutUser())
    navigate('/login')
  }

  const handleNavigateToAIRules = () => {
    navigate('/ai-rules')
  }

  const handleConnectEmail = async () => {
    try {
      setLoading(true)
      setError('')
      
      // Initiate OAuth flow
      const response = await fetch(`${ENV.API_BASE_URL}/api/connect-email/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Token ${localStorage.getItem('authToken')}`
        },
        body: JSON.stringify({
          action: 'oauth_init'
        })
      })

      if (response.ok) {
        const data = await response.json()
        // Open OAuth URL in a new window/tab
        const oauthWindow = window.open(data.auth_url, 'gmail_oauth', 'width=500,height=600')
        
        // Listen for OAuth callback
        const checkOAuthResult = setInterval(() => {
          try {
            if (oauthWindow.closed) {
              clearInterval(checkOAuthResult)
              // Check if we have OAuth data in localStorage
              const oauthResult = localStorage.getItem('gmail_oauth_result')
              if (oauthResult) {
                const parsedResult = JSON.parse(oauthResult)
                setOauthData(parsedResult)
                setShowOauthModal(true)
                localStorage.removeItem('gmail_oauth_result')
              }
            }
          } catch (error) {
            clearInterval(checkOAuthResult)
          }
        }, 1000)
      } else {
        const errorData = await response.json()
        setError(errorData.message || 'Failed to initiate email connection')
      }
    } catch (error) {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }


  const handleConnectGmailAccount = async () => {
    if (!oauthData) return
    
    try {
      setLoading(true)
      setError('')
      
      // Connect Gmail account using the OAuth tokens
      const response = await fetch(`${ENV.API_BASE_URL}/api/connect-email/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Token ${localStorage.getItem('authToken')}`
        },
        body: JSON.stringify({
          action: 'connect_with_tokens',
          access_token: oauthData.access_token,
          refresh_token: oauthData.refresh_token,
          gmail_email: oauthData.gmail_email
        })
      })

      if (response.ok) {
        const data = await response.json()
        setSuccess(data.message)
        setShowOauthModal(false)
        setOauthData(null)
        // Refresh email accounts
        fetchEmailAccounts()
        
        // Automatically fetch emails after connecting
        setTimeout(() => {
          handleFetchEmails(data.email_account_id);
        }, 1000);
        
        // Refresh emails list
        setTimeout(() => {
          fetchEmails();
        }, 2000);
      } else {
        const errorData = await response.json()
        setError(errorData.message || 'Failed to connect Gmail account')
      }
    } catch (error) {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleFetchEmails = async (emailAccountId) => {
    try {
      setLoading(true)
      setError('')
      
      const response = await fetch(`${ENV.API_BASE_URL}/api/fetch-emails/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Token ${localStorage.getItem('authToken')}`
        },
        body: JSON.stringify({
          email_account_id: emailAccountId
        })
      })

      if (response.ok) {
        const data = await response.json()
        setSuccess(`Emails fetched successfully! ${data.message}`)
        // Refresh emails list
        setTimeout(() => {
          fetchEmails();
        }, 1000);
      } else {
        const errorData = await response.json()
        setError(errorData.message || 'Failed to fetch emails')
      }
    } catch (error) {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }


  // Custom action for navbar
  const customActions = (
    <button
      onClick={handleNavigateToAIRules}
      className="inline-flex items-center px-4 py-2 bg-white/20 backdrop-blur-sm border border-white/30 rounded-lg text-sm font-medium text-gray-700 
                 hover:bg-white/30 hover:border-white/40 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 
                 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105"
    >
      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
      </svg>
      Set AI Rules
    </button>
  )

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar 
        title="Employee Dashboard"
        userRole="employee"
        onLogout={handleLogout}
        customActions={customActions}
        showLogoutButton={true}
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Left Column - Email Accounts */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
              <div className="p-6 border-b border-gray-100">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center mr-3">
                      <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900">Email Accounts</h3>
                  </div>
                  <span className="text-sm text-gray-500">{emailAccounts.length} connected</span>
                </div>
              </div>
              
              <div className="p-6">
            {emailAccounts.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <h4 className="text-lg font-medium text-gray-900 mb-2">No email accounts connected</h4>
                    <p className="text-gray-500 mb-4">Connect your Gmail account to start using AI automation</p>
                    <button 
                      onClick={handleConnectEmail} 
                      className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg font-semibold 
                               hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 
                               transition-all duration-200 ease-in-out transform hover:scale-[1.02] shadow-lg hover:shadow-xl"
                    >
                      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                      </svg>
                  Connect Gmail Account
                </button>
              </div>
            ) : (
                  <div className="space-y-4">
                {emailAccounts.map((account) => (
                      <div key={account.id} className="border border-gray-200 rounded-xl p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center">
                            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                              <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                              </svg>
                            </div>
                            <div className="ml-3">
                              <h4 className="text-sm font-semibold text-gray-900">{account.email}</h4>
                              <p className="text-xs text-gray-600">{account.provider} Account</p>
                            </div>
                    </div>
                          <div className="flex items-center space-x-2">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              account.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                            }`}>
                              <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${
                                account.is_active ? 'bg-green-400' : 'bg-red-400'
                              }`}></span>
                              {account.is_active ? 'Connected' : 'Disconnected'}
                            </span>
                            {account.is_active && (
                              <button
                                onClick={() => handleFetchEmails(account.id)}
                                disabled={loading}
                                className="inline-flex items-center px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200 disabled:opacity-50"
                                title="Fetch emails"
                              >
                                <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                </svg>
                                Fetch
                              </button>
                            )}
                          </div>
                    </div>
                  </div>
                ))}
                    <button 
                      onClick={handleConnectEmail} 
                      className="w-full mt-4 inline-flex items-center justify-center px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white 
                               hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-200"
                    >
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                  Connect Another Account
                </button>
              </div>
            )}
              </div>
            </div>
          </div>
          
          {/* Right Column - Emails */}
          <div className="lg:col-span-2 space-y-6">
            {/* Fetched Emails Section */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
              <div className="p-6 border-b border-gray-100">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center mr-3">
                      <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900">Fetched Emails</h3>
                  </div>
                  <button
                    onClick={() => fetchEmails()}
                    disabled={loading}
                    className="inline-flex items-center px-3 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 disabled:opacity-50"
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    {loading ? 'Fetching...' : 'Fetch All Emails'}
                  </button>
                </div>
              </div>
              
              <div className="p-6">
                {emails.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <h4 className="text-lg font-medium text-gray-900 mb-2">No emails fetched yet</h4>
                    <p className="text-gray-500">Connect your Gmail account and fetch emails to see them here</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {emails.map((email) => (
                      <div key={email.id} className="border border-gray-200 rounded-xl p-4 hover:shadow-md transition-shadow">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h4 className="text-sm font-semibold text-gray-900 mb-1">{email.subject}</h4>
                            <p className="text-xs text-gray-600 mb-2">From: {email.sender}</p>
                            <p className="text-xs text-gray-500 mb-2">Received: {new Date(email.received_at).toLocaleString()}</p>
                            {email.has_attachments && (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                📎 Has attachments
                              </span>
                            )}
                          </div>
                          <div className="flex items-center space-x-2 ml-4">
                            {!email.is_read && (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                                New
                              </span>
                            )}
                            {email.is_starred && (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                                ⭐ Starred
                              </span>
                            )}
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
      </main>

      {/* OAuth Modal */}
      {showOauthModal && oauthData && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3 text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100">
                <svg className="h-6 w-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mt-4">Gmail Authorization Successful!</h3>
              <div className="mt-2 px-7 py-3">
                <p className="text-sm text-gray-500">
                  Your Gmail account <strong>{oauthData.gmail_email}</strong> has been authorized successfully.
                </p>
                <p className="text-sm text-gray-500 mt-2">
                  Click "Connect Account" to complete the setup and start fetching emails.
                </p>
              </div>
              <div className="items-center px-4 py-3">
                <button
                  onClick={handleConnectGmailAccount}
                  disabled={loading}
                  className="px-4 py-2 bg-blue-600 text-white text-base font-medium rounded-md w-full shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                >
                  {loading ? 'Connecting...' : 'Connect Account'}
                </button>
                <button
                  onClick={() => {
                    setShowOauthModal(false)
                    setOauthData(null)
                  }}
                  className="mt-2 px-4 py-2 bg-gray-300 text-gray-700 text-base font-medium rounded-md w-full shadow-sm hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default EmployeeDashboard
