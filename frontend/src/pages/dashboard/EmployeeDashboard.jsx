import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { logoutUser } from '../../redux/authSlice'
import InputField from '../../components/reusable/InputField'
import Navbar from '../../components/mutual/Navbar'
import EmailModal from '../../components/reusable/EmailModal'
import EmailList from '../../components/reusable/EmailList'
import AlertMessage from '../../components/reusable/AlertMessage'
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
      
      console.log('Initiating manual email refresh...')
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
        console.log('Manual refresh response:', data)
        setSuccess(`${data.message}. Emails will be updated in the background.`)
        
        // Refresh emails list after a short delay to allow Celery tasks to complete
        setTimeout(() => {
          fetchEmails()
        }, 3000)
        
      } else {
        const errorData = await response.json()
        console.error('Manual refresh failed:', response.status, errorData)
        setError(errorData.message || 'Failed to refresh emails')
      }
    } catch (error) {
      console.error('Failed to initiate manual refresh:', error)
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = async () => {
    await dispatch(logoutUser())
    navigate('/login')
  }

  const handleNavigateToAISettings = () => {
    navigate('/ai-settings')
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

  const handleEmailClick = async (email) => {
    try {
      setSelectedEmail(email)
      setLoading(true)
      setEmailContent('')
      
      console.log('Fetching email content for email ID:', email.id)
      console.log('API URL:', `${ENV.API_BASE_URL}/api/email-content/${email.id}/`)
      
      // Fetch full email content
      const response = await fetch(`${ENV.API_BASE_URL}/api/email-content/${email.id}/`, {
        headers: {
          'Authorization': `Token ${localStorage.getItem('authToken')}`
        }
      })
      
      console.log('Email content response status:', response.status)
      
      if (response.ok) {
        const data = await response.json()
        console.log('Email content data:', data)
        setEmailContent(data.content || data.body_html || data.body_plain || 'No content available')
        
        // Mark email as read if it wasn't already
        if (!email.is_read) {
          await markEmailAsRead(email.id)
        }
        
        setShowEmailModal(true)
      } else {
        // Get error details
        const errorData = await response.json().catch(() => ({ message: 'Unknown error' }))
        console.error('Email content fetch failed:', response.status, errorData)
        
        // Fallback - still open modal with basic info
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
      
      // Mark as read anyway
      if (!email.is_read) {
        await markEmailAsRead(email.id)
      }
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

  const closeEmailModal = () => {
    setShowEmailModal(false)
    setSelectedEmail(null)
    setEmailContent('')
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

  const handleSendReply = async (replyData) => {
    try {
      if (!selectedEmail) {
        throw new Error('No email selected for reply')
      }

      console.log('Sending reply to email:', selectedEmail.id, replyData)
      
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
        console.log('Reply sent successfully:', data)
        
        setSuccess(data.message || 'Reply sent successfully!')
        
        // Refresh emails to show the new reply
        setTimeout(() => {
          fetchEmails()
        }, 1000)
      } else {
        const errorData = await response.json()
        console.error('Reply failed:', response.status, errorData)
        throw new Error(errorData.message || 'Failed to send reply')
      }
    } catch (error) {
      console.error('Failed to send reply:', error)
      setError(`Error sending reply: ${error.message}`)
      throw error // Re-throw to let the modal handle the error state
    }
  }


  // Custom actions for navbar
  const customActions = (
    <button
      onClick={handleNavigateToAISettings}
      className="group relative inline-flex items-center px-4 py-2.5 bg-white/30 backdrop-blur-sm border border-white/40 rounded-xl text-sm font-semibold text-gray-800 
                 hover:bg-white/40 hover:border-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:ring-offset-2 
                 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105 hover:-translate-y-0.5"
    >
      <div className="absolute inset-0 bg-gradient-to-r from-blue-100/50 to-indigo-100/50 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
      <div className="relative flex items-center">
        <div className="relative w-5 h-5 mr-2">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-400 to-indigo-500 rounded-md blur-[2px] opacity-40 group-hover:opacity-60 transition-opacity duration-300"></div>
          <svg className="relative w-5 h-5 text-blue-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </div>
        <span className="bg-gradient-to-r from-blue-800 to-indigo-800 bg-clip-text text-transparent">AI Settings</span>
      </div>
    </button>
  )

  return (
    <div className="min-h-screen bg-white">
      
      <Navbar 
        title="Employee Dashboard"
        userRole="employee"
        onLogout={handleLogout}
        customActions={customActions}
      />

      <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
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
                        Email Accounts
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
                        Connect your Gmail account to start using AI-powered email automation
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
      
      {/* Alert Messages */}
      <AlertMessage 
        type="error"
        message={error}
        isVisible={!!error}
        onClose={() => setError('')}
      />
      
      <AlertMessage 
        type="success"
        message={success}
        isVisible={!!success}
        onClose={() => setSuccess('')}
      />
    </div>
  )
}

export default EmployeeDashboard
