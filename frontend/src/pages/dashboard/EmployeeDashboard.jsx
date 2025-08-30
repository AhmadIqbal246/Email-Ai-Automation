import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { logoutUser } from '../../redux/authSlice'
import InputField from '../../components/reusable/InputField'
import ENV from '../../../config'

const EmployeeDashboard = () => {
  const dispatch = useDispatch()
  const { user } = useSelector((state) => state.auth)
  const [emailAccounts, setEmailAccounts] = useState([])
  const [aiRules, setAiRules] = useState([])
  const [emails, setEmails] = useState([])
  const [newRule, setNewRule] = useState({
    name: '',
    description: '',
    trigger_keywords: '',
    action_type: 'auto_reply',
    action_content: ''
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [oauthData, setOauthData] = useState(null)
  const [showOauthModal, setShowOauthModal] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    fetchEmailAccounts()
    fetchAiRules()
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

  const fetchAiRules = async () => {
    try {
      console.log('Fetching AI rules...')
      const token = localStorage.getItem('authToken')
      console.log('AI rules - Token exists:', !!token)
      
      const response = await fetch(`${ENV.API_BASE_URL}/api/ai-rules/`, {
        headers: {
          'Authorization': `Token ${token}`
        }
      })
      
      console.log('AI rules - Response status:', response.status)
      
      if (response.ok) {
        const data = await response.json()
        console.log('AI rules - Data:', data)
        setAiRules(data.rules)
      } else {
        console.log('AI rules - Failed with status:', response.status)
        const errorData = await response.json()
        console.log('AI rules - Error data:', errorData)
      }
    } catch (error) {
      console.error('Failed to fetch AI rules:', error)
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

  const handleCreateRule = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess('')

    try {
      const response = await fetch(`${ENV.API_BASE_URL}/api/ai-rules/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Token ${localStorage.getItem('authToken')}`
        },
        body: JSON.stringify({
          ...newRule,
          trigger_keywords: newRule.trigger_keywords.split(',').map(k => k.trim())
        })
      })

      if (response.ok) {
        setSuccess('AI rule created successfully')
        setNewRule({
          name: '',
          description: '',
          trigger_keywords: '',
          action_type: 'auto_reply',
          action_content: ''
        })
        fetchAiRules()
      } else {
        const errorData = await response.json()
        setError(errorData.message || 'Failed to create AI rule')
      }
    } catch (error) {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleRuleChange = (e) => {
    setNewRule({
      ...newRule,
      [e.target.name]: e.target.value
    })
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

  const deleteRule = async (ruleId) => {
    try {
      const response = await fetch(`${ENV.API_BASE_URL}/api/ai-rules/${ruleId}/`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Token ${localStorage.getItem('authToken')}`
        }
      })

      if (response.ok) {
        setSuccess('Rule deleted successfully')
        fetchAiRules()
      } else {
        setError('Failed to delete rule')
      }
    } catch (error) {
      setError('Network error. Please try again.')
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-gradient-to-r from-green-600 to-emerald-600 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
              </div>
              <div className="ml-4">
                <h1 className="text-xl font-semibold text-gray-900">Employee Dashboard</h1>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900">Welcome, {user?.first_name || user?.email}</p>
                <p className="text-xs text-gray-500">{user?.company?.name}</p>
              </div>
              <div className="w-8 h-8 bg-gradient-to-r from-green-600 to-emerald-600 rounded-full flex items-center justify-center">
                <span className="text-white text-sm font-medium">{(user?.first_name?.[0] || user?.email?.[0] || 'E').toUpperCase()}</span>
              </div>
              <button 
                onClick={handleLogout}
                className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white 
                         hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-all duration-200"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              Logout
            </button>
            </div>
          </div>
        </div>
      </header>

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
          
          {/* Right Column - AI Rules and Emails */}
          <div className="lg:col-span-2 space-y-6">
            {/* Create New AI Rule */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
              <div className="p-6 border-b border-gray-100">
                <div className="flex items-center">
                  <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center mr-3">
                    <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900">Create New AI Rule</h3>
                </div>
              </div>
              
              <div className="p-6">
                {error && (
                  <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <div className="flex items-center">
                      <svg className="w-4 h-4 text-red-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                      <span className="text-red-700 text-sm">{error}</span>
                    </div>
                  </div>
                )}
                
                {success && (
                  <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center">
                      <svg className="w-4 h-4 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      <span className="text-green-700 text-sm">{success}</span>
                    </div>
                  </div>
                )}
                
                <form onSubmit={handleCreateRule} className="space-y-6">
                  <div className="grid md:grid-cols-2 gap-6">
              <InputField
                label="Rule Name"
                type="text"
                name="name"
                value={newRule.name}
                onChange={handleRuleChange}
                      placeholder="Auto Reply for Meetings"
                required
              />
                    
                    <div className="space-y-2">
                      <label htmlFor="action_type" className="block text-sm font-medium text-gray-700">
                        Action Type
                      </label>
                      <select
                        id="action_type"
                        name="action_type"
                        value={newRule.action_type}
                        onChange={handleRuleChange}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-200"
                        required
                      >
                        <option value="auto_reply">Auto Reply</option>
                        <option value="forward">Forward Email</option>
                        <option value="label">Add Label</option>
                        <option value="schedule_follow_up">Schedule Follow-up</option>
                      </select>
                    </div>
                  </div>
              
              <InputField
                label="Description"
                name="description"
                value={newRule.description}
                onChange={handleRuleChange}
                    placeholder="Describe what this rule does"
                isTextarea={true}
                rows={2}
              />
              
              <InputField
                label="Trigger Keywords"
                type="text"
                name="trigger_keywords"
                value={newRule.trigger_keywords}
                onChange={handleRuleChange}
                    placeholder="meeting, schedule, appointment"
                    helpText="Comma-separated keywords that will trigger this rule"
                required
              />
              
              <InputField
                label="Action Content"
                name="action_content"
                value={newRule.action_content}
                onChange={handleRuleChange}
                placeholder={
                  newRule.action_type === 'auto_reply' 
                    ? "Thank you for your email. I will respond within 24 hours."
                    : newRule.action_type === 'forward'
                    ? "manager@company.com"
                    : "Enter action details"
                }
                helpText={
                  newRule.action_type === 'auto_reply' 
                    ? "The message that will be sent as an auto-reply"
                    : newRule.action_type === 'forward'
                    ? "Email address to forward to"
                    : "Details for the selected action"
                }
                isTextarea={newRule.action_type === 'auto_reply'}
                rows={3}
                required
              />
              
              <button 
                type="submit" 
                disabled={loading || emailAccounts.length === 0}
                    className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 text-white py-3 px-4 rounded-lg font-semibold 
                             hover:from-purple-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 
                             transition-all duration-200 ease-in-out transform hover:scale-[1.02] active:scale-[0.98]
                             disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none
                             shadow-lg hover:shadow-xl"
                  >
                    {loading ? (
                      <div className="flex items-center justify-center">
                        <svg className="animate-spin -ml-1 mr-3 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Creating Rule...
                      </div>
                    ) : (
                      <div className="flex items-center justify-center">
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        </svg>
                        Create AI Rule
                      </div>
                    )}
              </button>
              
              {emailAccounts.length === 0 && (
                    <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <div className="flex items-center">
                        <svg className="w-4 h-4 text-yellow-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.478 0l5.58 9.92c.75 1.334-.213 2.98-1.739 2.98H4.42c-1.526 0-2.49-1.646-1.739-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                        <span className="text-yellow-700 text-sm">Please connect an email account first to create AI rules.</span>
                      </div>
                    </div>
              )}
            </form>
              </div>
            </div>
          </div>
          
          {/* Right Column - Current AI Rules */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
              <div className="p-6 border-b border-gray-100">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center mr-3">
                      <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 7a2 2 0 012-2h10a2 2 0 012 2v2M7 7V5a2 2 0 012-2h6a2 2 0 012 2v2" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900">Your AI Rules</h3>
                  </div>
                  <span className="text-sm text-gray-500">{aiRules.length} rules</span>
                </div>
              </div>
              
              <div className="p-6">
            {aiRules.length === 0 ? (
                  <div className="text-center py-16">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 7a2 2 0 012-2h10a2 2 0 012 2v2M7 7V5a2 2 0 012-2h6a2 2 0 012 2v2" />
                      </svg>
                    </div>
                    <h4 className="text-lg font-medium text-gray-900 mb-2">No AI rules yet</h4>
                    <p className="text-gray-500">Create your first automation rule to get started</p>
                  </div>
                ) : (
                  <div className="grid gap-6">
                {aiRules.map((rule) => (
                      <div key={rule.id} className="border border-gray-200 rounded-2xl p-6 hover:shadow-lg transition-shadow duration-300">
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex items-center">
                            <div className="w-10 h-10 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-xl flex items-center justify-center">
                              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                              </svg>
                            </div>
                            <div className="ml-4">
                              <h4 className="text-lg font-semibold text-gray-900">{rule.name}</h4>
                              <p className="text-sm text-gray-600 mt-1">{rule.description}</p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              rule.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                            }`}>
                              <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${
                                rule.is_active ? 'bg-green-400' : 'bg-gray-400'
                              }`}></span>
                              {rule.is_active ? 'Active' : 'Inactive'}
                            </span>
                      <button 
                        onClick={() => deleteRule(rule.id)}
                              className="inline-flex items-center p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-all duration-200"
                              title="Delete rule"
                      >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                      </button>
                    </div>
                        </div>
                        
                        <div className="grid md:grid-cols-2 gap-4">
                          <div className="bg-blue-50 rounded-lg p-4">
                            <div className="flex items-center mb-2">
                              <svg className="w-4 h-4 text-blue-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
                              </svg>
                              <span className="text-sm font-medium text-blue-900">Triggers</span>
                            </div>
                            <div className="flex flex-wrap gap-1">
                              {(Array.isArray(rule.trigger_keywords) 
                                ? rule.trigger_keywords 
                                : rule.trigger_keywords?.split(',') || []
                              ).map((keyword, index) => (
                                <span key={index} className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-blue-100 text-blue-800">
                                  {keyword.trim()}
                        </span>
                              ))}
                            </div>
                      </div>
                          
                          <div className="bg-green-50 rounded-lg p-4">
                            <div className="flex items-center mb-2">
                              <svg className="w-4 h-4 text-green-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                              </svg>
                              <span className="text-sm font-medium text-green-900">Action</span>
                      </div>
                            <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-green-100 text-green-800">
                              {rule.action_type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        </span>
                            {rule.action_content && (
                              <p className="text-xs text-green-700 mt-2 line-clamp-2">{rule.action_content}</p>
                            )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
              </div>
            </div>

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
