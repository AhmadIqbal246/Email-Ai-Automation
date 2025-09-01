import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { logoutUser } from '../../redux/authSlice'
import Navbar from '../../components/mutual/Navbar'
import EmailModal from '../../components/reusable/EmailModal'
import EmailList from '../../components/reusable/EmailList'
import CurrentEmployees from '../../components/admin/CurrentEmployees'
import InviteEmployee from '../../components/admin/InviteEmployee'
import PendingInvitations from '../../components/admin/PendingInvitations'
import ENV from '../../../config'

const AdminDashboard = () => {
  const dispatch = useDispatch()
  const { user } = useSelector((state) => state.auth)
  
  // Navigation state
  const [activeSection, setActiveSection] = useState('dashboard')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  
  // Email functionality state (for dashboard section)
  const [emailAccounts, setEmailAccounts] = useState([])
  const [emails, setEmails] = useState([])
  const [oauthData, setOauthData] = useState(null)
  const [showOauthModal, setShowOauthModal] = useState(false)
  const [selectedEmail, setSelectedEmail] = useState(null)
  const [showEmailModal, setShowEmailModal] = useState(false)
  const [emailContent, setEmailContent] = useState('')

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

  const handleManualRefresh = async () => {
    try {
      setLoading(true)
      setError('')
      
      console.log('Initiating manual email refresh (Admin)...')
      const token = localStorage.getItem('authToken')
      
      const response = await fetch(`${ENV.API_BASE_URL}/api/manual-email-refresh/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Token ${token}`
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        console.log('Admin manual refresh response:', data)
        setSuccess(`${data.message}. Emails will be updated in the background.`)
        
        // Refresh emails list after a short delay to allow Celery tasks to complete
        setTimeout(() => {
          fetchEmails()
        }, 3000)
        
      } else {
        const errorData = await response.json()
        console.error('Admin manual refresh failed:', response.status, errorData)
        setError(errorData.message || 'Failed to refresh emails')
      }
    } catch (error) {
      console.error('Failed to initiate manual refresh (Admin):', error)
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = async () => {
    await dispatch(logoutUser())
    navigate('/login')
  }

  const handleNavigate = (section) => {
    setActiveSection(section)
    setError('')
    setSuccess('')
  }

  // Email connection methods
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

      console.log('Connect Email Response:', response)

      if (response.ok) {
        const data = await response.json()
        console.log('OAuth Initialization Data:', data)
        
        // Open OAuth URL in a new window/tab
        const oauthWindow = window.open(data.auth_url, 'gmail_oauth', 'width=500,height=600')
        
        // Listen for OAuth callback
        const checkOAuthResult = setInterval(() => {
          try {
            if (oauthWindow.closed) {
              clearInterval(checkOAuthResult)
              // Check if we have OAuth data in localStorage
              const oauthResult = localStorage.getItem('gmail_oauth_result')
              console.log('OAuth Result from localStorage:', oauthResult)
              
              if (oauthResult) {
                const parsedResult = JSON.parse(oauthResult)
                setOauthData(parsedResult)
                setShowOauthModal(true)
                localStorage.removeItem('gmail_oauth_result')
              } else {
                setError('No OAuth result found. Please try again.')
              }
            }
          } catch (error) {
            console.error('Error checking OAuth result:', error)
            clearInterval(checkOAuthResult)
            setError('Error checking OAuth result. Please try again.')
          }
        }, 1000)
      } else {
        const errorData = await response.json()
        console.error('Connect Email Error:', errorData)
        setError(errorData.message || 'Failed to initiate email connection')
      }
    } catch (error) {
      console.error('Network error connecting email:', error)
      setError('Network error. Please check your connection and try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleConnectGmailAccount = async () => {
    if (!oauthData) {
      setError('No OAuth data available. Please start the connection process again.')
      return
    }
    
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

      console.log('Connect Gmail Account Response:', response)

      if (response.ok) {
        const data = await response.json()
        console.log('Connect Gmail Account Data:', data)
        
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
        console.error('Connect Gmail Account Error:', errorData)
        setError(errorData.message || 'Failed to connect Gmail account')
      }
    } catch (error) {
      console.error('Network error connecting Gmail account:', error)
      setError('Network error. Please check your connection and try again.')
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

  const markEmailAsRead = async (emailId) => {
    try {
      const response = await fetch(`${ENV.API_BASE_URL}/api/mark-email-read/${emailId}/`, {
        method: 'POST',
        headers: {
          'Authorization': `Token ${localStorage.getItem('authToken')}`
        }
      })
      
      if (response.ok) {
        // Update local state
        setEmails(prevEmails => 
          prevEmails.map(email => 
            email.id === emailId ? { ...email, is_read: true } : email
          )
        )
      }
    } catch (error) {
      console.error('Failed to mark email as read:', error)
    }
  }

  const handleDisconnectGmail = async (accountId) => {
    if (!window.confirm('Are you sure you want to disconnect this Gmail account? All associated emails will be removed.')) {
      return;
    }
    
    setLoading(true);
    setError('');
    setSuccess('');
    
    try {
      const response = await fetch(`${ENV.API_BASE_URL}/api/disconnect-email-account/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Token ${localStorage.getItem('authToken')}`
        },
        body: JSON.stringify({
          email_account_id: accountId
        })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Failed to disconnect Gmail account');
      }
      
      // Remove the account from state
      setEmailAccounts([]);
      
      // Clear emails from state
      setEmails([]);
      
      setSuccess(data.message || 'Gmail account disconnected successfully');
    } catch (error) {
      console.error('Error disconnecting Gmail account:', error);
      setError(error.message || 'Failed to disconnect Gmail account. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      console.log('Marking all emails as read...')
      
      const response = await fetch(`${ENV.API_BASE_URL}/api/mark-all-emails-read/`, {
        method: 'POST',
        headers: {
          'Authorization': `Token ${localStorage.getItem('authToken')}`
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        console.log('Mark all as read response:', data)
        
        // Update local state - mark all emails as read
        setEmails(prevEmails => 
          prevEmails.map(email => ({ ...email, is_read: true }))
        )
        
        setSuccess(data.message || 'All emails marked as read successfully!')
      } else {
        const errorData = await response.json()
        console.error('Mark all as read failed:', response.status, errorData)
        setError(errorData.message || 'Failed to mark all emails as read')
      }
    } catch (error) {
      console.error('Failed to mark all emails as read:', error)
      setError(`Error marking emails as read: ${error.message}`)
    }
  }

  // Email list and modal methods
  const handleEmailClick = async (email) => {
    try {
      setSelectedEmail(email)
      setLoading(true)
      setEmailContent('')
      
      // Fetch full email content
      const response = await fetch(`${ENV.API_BASE_URL}/api/email-content/${email.id}/`, {
        headers: {
          'Authorization': `Token ${localStorage.getItem('authToken')}`
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        setEmailContent(data.content || data.body_html || data.body_plain || 'No content available')
        
        // Mark email as read if it wasn't already
        if (!email.is_read) {
          await markEmailAsRead(email.id)
        }
        
        setShowEmailModal(true)
      } else {
        const errorData = await response.json().catch(() => ({ message: 'Unknown error' }))
        setEmailContent(`Email content could not be loaded. Error: ${errorData.message || response.statusText}`)
        setShowEmailModal(true)
        
        // Mark as read anyway
        if (!email.is_read) {
          await markEmailAsRead(email.id)
        }
      }
    } catch (error) {
      console.error('Failed to fetch email content:', error)
      setEmailContent(`Error loading email content: ${error.message}`)
      setShowEmailModal(true)
    } finally {
      setLoading(false)
    }
  }

  const closeEmailModal = () => {
    setShowEmailModal(false)
    setSelectedEmail(null)
    setEmailContent('')
  }

  const handleSendReply = async (replyData) => {
    try {
      if (!selectedEmail) {
        throw new Error('No email selected for reply')
      }

      console.log('Admin sending reply to email:', selectedEmail.id, replyData)
      
      const response = await fetch(`${ENV.API_BASE_URL}/api/reply-to-email/${selectedEmail.id}/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Token ${localStorage.getItem('authToken')}`
        },
        body: JSON.stringify(replyData)
      })
      
      if (response.ok) {
        const data = await response.json()
        console.log('Admin reply sent successfully:', data)
        
        setSuccess(data.message || 'Reply sent successfully!')
        
        // Refresh emails to show the new reply
        setTimeout(() => {
          fetchEmails()
        }, 1000)
      } else {
        const errorData = await response.json()
        console.error('Admin reply failed:', response.status, errorData)
        throw new Error(errorData.message || 'Failed to send reply')
      }
    } catch (error) {
      console.error('Failed to send reply (Admin):', error)
      setError(`Error sending reply: ${error.message}`)
      throw error // Re-throw to let the modal handle the error state
    }
  }

  // Render different sections based on activeSection
  const renderSection = () => {
    switch(activeSection) {
      case 'employees':
        return <CurrentEmployees />
      case 'invite':
        return <InviteEmployee />
      case 'invitations':
        return <PendingInvitations />
      default:
        return (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Column - Email Accounts */}
            <div className="lg:col-span-1">
              <div className="relative overflow-hidden animate-fade-in-up">
                {/* Glassmorphism Container */}
                <div className="relative bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/30 hover:shadow-3xl transition-all duration-700 group overflow-hidden">
                  {/* Header */}
                  <div className="relative p-6 border-b border-white/30 backdrop-blur-sm">
                    <div className="flex items-center space-x-4">
                      {/* Icon */}
                      <div className="relative">
                        <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-2xl blur-lg opacity-30 animate-pulse"></div>
                        <div className="relative w-12 h-12 bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-500 rounded-2xl flex items-center justify-center shadow-xl transform hover:scale-110 transition-all duration-300">
                          <svg className="w-6 h-6 text-white drop-shadow-lg" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                          </svg>
                        </div>
                      </div>
                      
                      {/* Title */}
                      <div className="space-y-1">
                        <h3 className="text-xl font-bold bg-gradient-to-r from-gray-900 via-indigo-800 to-blue-800 bg-clip-text text-transparent leading-tight">
                          Admin Email Accounts
                        </h3>
                        <div className="flex items-center space-x-2 text-sm text-gray-600">
                          <div className="w-2 h-2 bg-gradient-to-r from-blue-400 to-indigo-500 rounded-full animate-pulse"></div>
                          <span className="font-medium">{emailAccounts.length} connected</span>
                        </div>
                      </div>
                    </div>
                  </div>
                
                  {/* Content Area */}
                  <div className="p-6">
                    {emailAccounts.length === 0 ? (
                      <div className="text-center py-12">
                        <div className="relative mb-8">
                          <div className="absolute inset-0 bg-gradient-to-r from-blue-200 to-indigo-200 rounded-full blur-2xl opacity-30 animate-pulse"></div>
                          <div className="relative w-32 h-32 bg-gradient-to-br from-blue-100 via-indigo-100 to-purple-100 rounded-3xl flex items-center justify-center mx-auto shadow-2xl">
                            <svg className="w-16 h-16 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                            </svg>
                          </div>
                        </div>
                        <h4 className="text-2xl font-bold bg-gradient-to-r from-gray-800 to-gray-900 bg-clip-text text-transparent mb-4">
                          No email accounts connected
                        </h4>
                        <p className="text-gray-600 text-lg max-w-md mx-auto leading-relaxed mb-8">
                          Connect your Gmail account to manage emails as an admin
                        </p>
                        
                        {/* Connect Button */}
                        <button 
                          onClick={handleConnectEmail}
                          disabled={loading}
                          className="group relative inline-flex items-center px-8 py-4 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white font-bold rounded-2xl shadow-2xl hover:shadow-3xl disabled:opacity-50 transition-all duration-300 transform hover:scale-105 hover:-translate-y-1 disabled:hover:scale-100 disabled:hover:translate-y-0 mx-auto"
                        >
                          <div className="absolute inset-0 bg-gradient-to-r from-blue-400 to-purple-400 rounded-2xl blur-lg opacity-30 group-hover:opacity-50 transition-opacity duration-300"></div>
                          <div className="relative flex items-center">
                            {loading ? (
                              <>
                                <div className="w-5 h-5 mr-3">
                                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                </div>
                                <span>Connecting...</span>
                              </>
                            ) : (
                              <>
                                <svg className="w-5 h-5 mr-3 drop-shadow" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                                </svg>
                                <span>Connect Gmail Account</span>
                              </>
                            )}
                          </div>
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {emailAccounts.map((account, index) => (
                          <div 
                            key={account.id}
                            style={{ animationDelay: `${index * 100}ms` }}
                            className="group relative overflow-hidden cursor-default transition-all duration-500 animate-fade-in-up hover:scale-[1.02] hover:-translate-y-1"
                          >
                            {/* Account Card */}
                            <div className="relative p-5 rounded-2xl backdrop-blur-sm transition-all duration-500 bg-gradient-to-br from-emerald-50/80 via-green-50/60 to-blue-50/40 border border-emerald-200/50 shadow-lg hover:shadow-xl">
                              
                              {/* Background Effects */}
                              <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                                <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-emerald-100/30 via-green-100/20 to-blue-100/30"></div>
                              </div>
                              
                              {/* Account Content */}
                              <div className="relative space-y-4">
                                {/* Account Header */}
                                <div className="flex items-start space-x-4">
                                  {/* Gmail Icon */}
                                  <div className="relative flex-shrink-0">
                                    <div className="absolute inset-0 bg-gradient-to-r from-emerald-400 to-green-500 rounded-2xl blur-md opacity-30 animate-pulse"></div>
                                    <div className="relative w-14 h-14 bg-gradient-to-br from-emerald-500 to-green-600 rounded-2xl flex items-center justify-center shadow-xl transform hover:scale-110 transition-all duration-300">
                                      <svg className="w-7 h-7 text-white drop-shadow-lg" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                      </svg>
                                    </div>
                                  </div>
                                  
                                  {/* Account Details */}
                                  <div className="flex-1 min-w-0">
                                    <div className="space-y-2">
                                      {/* Email with proper truncation */}
                                      <h4 className="text-lg font-bold bg-gradient-to-r from-gray-900 via-emerald-800 to-green-800 bg-clip-text text-transparent truncate">
                                        {account.email}
                                      </h4>
                                      
                                      {/* Provider info */}
                                      <div className="flex items-center space-x-2">
                                        <span className="text-sm font-medium text-gray-600">{account.provider} Account</span>
                                        <div className="flex items-center space-x-1 text-xs text-emerald-600">
                                          <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></div>
                                          <span className="font-medium">Connected</span>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                                
                                {/* Action Buttons - Fixed alignment and sizing */}
                                <div className="grid grid-cols-2 gap-3 pt-2">
                                  {/* Sync Emails Button */}
                                  <button
                                    onClick={() => handleFetchEmails(account.id)}
                                    disabled={loading}
                                    className="group/btn relative inline-flex items-center justify-center px-4 py-2.5 bg-white/90 backdrop-blur-sm text-blue-700 font-semibold rounded-xl shadow-lg hover:shadow-xl border border-white/60 transition-all duration-300 transform hover:scale-105 hover:-translate-y-0.5 disabled:opacity-50 disabled:hover:scale-100 disabled:hover:translate-y-0"
                                    title="Sync emails from Gmail"
                                  >
                                    <div className="absolute inset-0 bg-gradient-to-r from-blue-100/60 to-indigo-100/60 rounded-xl opacity-0 group-hover/btn:opacity-100 transition-opacity duration-300"></div>
                                    <div className="relative flex items-center">
                                      <svg className={`w-4 h-4 mr-2 transition-transform duration-300 ${
                                        loading ? 'animate-spin' : 'group-hover/btn:rotate-180'
                                      }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                      </svg>
                                      <span className="text-sm">{loading ? 'Syncing...' : 'Sync'}</span>
                                    </div>
                                  </button>
                                  
                                  {/* Disconnect Button */}
                                  <button
                                    onClick={() => handleDisconnectGmail(account.id)}
                                    disabled={loading}
                                    className="group/btn relative inline-flex items-center justify-center px-4 py-2.5 bg-white/90 backdrop-blur-sm text-red-700 font-semibold rounded-xl shadow-lg hover:shadow-xl border border-white/60 transition-all duration-300 transform hover:scale-105 hover:-translate-y-0.5 disabled:opacity-50 disabled:hover:scale-100 disabled:hover:translate-y-0"
                                    title="Disconnect Gmail account"
                                  >
                                    <div className="absolute inset-0 bg-gradient-to-r from-red-100/60 to-rose-100/60 rounded-xl opacity-0 group-hover/btn:opacity-100 transition-opacity duration-300"></div>
                                    <div className="relative flex items-center">
                                      <svg className="w-4 h-4 mr-2 transition-transform duration-300 group-hover/btn:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                                      </svg>
                                      <span className="text-sm">Disconnect</span>
                                    </div>
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
            
            {/* Right Column - Emails */}
            <div className="lg:col-span-2 space-y-6">
              <EmailList
                emails={emails}
                loading={loading}
                onEmailClick={handleEmailClick}
                onMarkAllAsRead={handleMarkAllAsRead}
                onRefresh={handleManualRefresh}
              />
            </div>
          </div>
        )
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar 
        title="Admin Dashboard"
        userRole="admin"
        onLogout={handleLogout}
        showLogoutButton={true}
        showAdminNav={true}
        activeSection={activeSection}
        onNavigate={handleNavigate}
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Error and Success Messages */}
        {error && (
          <div className="mb-8 relative overflow-hidden animate-fade-in-up">
            <div className="relative p-6 bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl border border-red-200/50">
              <div className="absolute inset-0 bg-gradient-to-r from-red-50/50 to-rose-50/50 rounded-3xl"></div>
              <div className="relative flex items-center">
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-r from-red-400 to-rose-500 rounded-2xl blur-lg opacity-30 animate-pulse"></div>
                  <div className="relative w-12 h-12 bg-gradient-to-br from-red-500 to-rose-600 rounded-2xl flex items-center justify-center shadow-xl">
                    <svg className="w-6 h-6 text-white drop-shadow-lg" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>
                <div className="ml-4 flex-1">
                  <div className="flex items-center space-x-2 mb-1">
                    <span className="text-lg font-bold bg-gradient-to-r from-red-700 to-rose-800 bg-clip-text text-transparent">Error</span>
                    <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                  </div>
                  <p className="text-red-700 font-medium leading-relaxed">{error}</p>
                </div>
                <button 
                  onClick={() => setError('')}
                  className="group relative p-2.5 bg-white/60 backdrop-blur-sm hover:bg-white/80 rounded-xl transition-all duration-300 transform hover:scale-110 hover:-translate-y-0.5 shadow-lg hover:shadow-xl border border-white/50"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-red-100/50 to-rose-100/50 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                  <svg className="relative w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        )}
        
        {success && (
          <div className="mb-8 relative overflow-hidden animate-fade-in-up">
            <div className="relative p-6 bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl border border-green-200/50">
              <div className="absolute inset-0 bg-gradient-to-r from-emerald-50/50 to-green-50/50 rounded-3xl"></div>
              <div className="relative flex items-center">
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-r from-emerald-400 to-green-500 rounded-2xl blur-lg opacity-30 animate-pulse"></div>
                  <div className="relative w-12 h-12 bg-gradient-to-br from-emerald-500 to-green-600 rounded-2xl flex items-center justify-center shadow-xl">
                    <svg className="w-6 h-6 text-white drop-shadow-lg" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>
                <div className="ml-4 flex-1">
                  <div className="flex items-center space-x-2 mb-1">
                    <span className="text-lg font-bold bg-gradient-to-r from-emerald-700 to-green-800 bg-clip-text text-transparent">Success</span>
                    <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                  </div>
                  <p className="text-green-700 font-medium leading-relaxed">{success}</p>
                </div>
                <button 
                  onClick={() => setSuccess('')}
                  className="group relative p-2.5 bg-white/60 backdrop-blur-sm hover:bg-white/80 rounded-xl transition-all duration-300 transform hover:scale-110 hover:-translate-y-0.5 shadow-lg hover:shadow-xl border border-white/50"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-emerald-100/50 to-green-100/50 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                  <svg className="relative w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        )}
        
        {/* Render Active Section */}
        {renderSection()}
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

      {/* Email Modal */}
      <EmailModal 
        isOpen={showEmailModal}
        onClose={closeEmailModal}
        email={selectedEmail}
        content={emailContent}
        loading={loading && showEmailModal}
        onSendReply={handleSendReply}
      />
    </div>
  )
}

export default AdminDashboard
