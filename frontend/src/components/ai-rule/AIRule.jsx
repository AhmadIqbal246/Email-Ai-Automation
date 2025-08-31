import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDispatch } from 'react-redux'
import { logoutUser } from '../../redux/authSlice'
import InputField from '../reusable/InputField'
import Navbar from '../mutual/Navbar'
import ENV from '../../../config'

const AIRule = () => {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const [emailAccounts, setEmailAccounts] = useState([])
  const [aiRules, setAiRules] = useState([])
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

  useEffect(() => {
    fetchEmailAccounts()
    fetchAiRules()
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

  const handleLogout = async () => {
    await dispatch(logoutUser())
    navigate('/login')
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

  const handleBackToDashboard = () => {
    navigate('/dashboard')
  }

  // Custom action for navbar
  const customActions = (
    <button
      onClick={handleBackToDashboard}
      className="inline-flex items-center px-4 py-2 bg-white/20 backdrop-blur-sm border border-white/30 rounded-lg text-sm font-medium text-gray-700 
                 hover:bg-white/30 hover:border-white/40 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 
                 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105"
    >
      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
      </svg>
      Back to Dashboard
    </button>
  )

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar 
        title="AI Rule Management"
        userRole="employee"
        onLogout={handleLogout}
        customActions={customActions}
        showLogoutButton={true}
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-8">
          
          {/* Page Header */}
          <div className="text-center">
            <div className="w-16 h-16 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
            <h2 className="text-3xl font-bold text-gray-900 mb-2">AI Rule Management</h2>
            <p className="text-lg text-gray-600">Create and manage intelligent email automation rules</p>
          </div>

          {/* Create New AI Rule */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
            <div className="p-6 border-b border-gray-100">
              <div className="flex items-center">
                <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center mr-3">
                  <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
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
                      <span className="text-yellow-700 text-sm">
                        Please connect an email account first to create AI rules. 
                        <button 
                          onClick={handleBackToDashboard}
                          className="ml-1 underline hover:text-yellow-800 font-medium"
                        >
                          Go to Dashboard
                        </button>
                      </span>
                    </div>
                  </div>
                )}
              </form>
            </div>
          </div>

          {/* Current AI Rules */}
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
                <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2">
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
        </div>
      </main>
    </div>
  )
}

export default AIRule
