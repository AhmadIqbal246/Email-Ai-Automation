import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDispatch } from 'react-redux'
import { logoutUser } from '../../redux/authSlice'
import InputField from '../reusable/InputField'
import Navbar from '../mutual/Navbar'
import ENV from '../../../config'

const AISettings = () => {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const [settings, setSettings] = useState({
    is_enabled: true,
    auto_reply_enabled: true,
    default_prompt: '',
    max_response_length: 500,
    response_tone: 'professional'
  })
  const [processingLogs, setProcessingLogs] = useState([])
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    fetchAISettings()
    fetchProcessingLogs()
    fetchStats()
  }, [])

  const fetchAISettings = async () => {
    try {
      const token = localStorage.getItem('authToken')
      const response = await fetch(`${ENV.API_BASE_URL}/api/ai/settings/`, {
        headers: {
          'Authorization': `Token ${token}`
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        setSettings(data)
      } else {
        console.log('Failed to fetch AI settings:', response.status)
      }
    } catch (error) {
      console.error('Failed to fetch AI settings:', error)
    }
  }

  const fetchProcessingLogs = async () => {
    try {
      const token = localStorage.getItem('authToken')
      const response = await fetch(`${ENV.API_BASE_URL}/api/ai/logs/?limit=10`, {
        headers: {
          'Authorization': `Token ${token}`
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        setProcessingLogs(data.logs)
      }
    } catch (error) {
      console.error('Failed to fetch processing logs:', error)
    }
  }

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem('authToken')
      const response = await fetch(`${ENV.API_BASE_URL}/api/ai/stats/`, {
        headers: {
          'Authorization': `Token ${token}`
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        setStats(data)
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error)
    }
  }

  const handleLogout = async () => {
    await dispatch(logoutUser())
    navigate('/login')
  }

  const handleUpdateSettings = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess('')

    try {
      const response = await fetch(`${ENV.API_BASE_URL}/api/ai/settings/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Token ${localStorage.getItem('authToken')}`
        },
        body: JSON.stringify(settings)
      })

      if (response.ok) {
        const data = await response.json()
        setSettings(data.settings)
        setSuccess('AI settings updated successfully')
      } else {
        const errorData = await response.json()
        setError(errorData.message || 'Failed to update AI settings')
      }
    } catch (error) {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleBulkProcess = async () => {
    setLoading(true)
    setError('')
    setSuccess('')

    try {
      const response = await fetch(`${ENV.API_BASE_URL}/api/ai/bulk-process/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Token ${localStorage.getItem('authToken')}`
        },
        body: JSON.stringify({
          processing_type: settings.auto_reply_enabled ? 'auto_reply' : 'analysis'
        })
      })

      if (response.ok) {
        const data = await response.json()
        setSuccess(`Bulk processing started with task ID: ${data.task_id}`)
        // Refresh logs after a delay
        setTimeout(() => {
          fetchProcessingLogs()
          fetchStats()
        }, 5000)
      } else {
        const errorData = await response.json()
        setError(errorData.message || 'Failed to start bulk processing')
      }
    } catch (error) {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleSettingChange = (e) => {
    const { name, value, type, checked } = e.target
    setSettings({
      ...settings,
      [name]: type === 'checkbox' ? checked : value
    })
  }

  const handleBackToDashboard = () => {
    navigate('/dashboard')
  }

  const customActions = (
    <button
      onClick={handleBackToDashboard}
      className="inline-flex items-center px-4 py-2 bg-white/20 backdrop-blur-sm border border-white/30 rounded-lg text-sm font-medium text-gray-700 
                 hover:bg-white/30 hover:border-white/40 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 
                 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105"
    >
      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
      </svg>
      Back to Dashboard
    </button>
  )

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800'
      case 'failed': return 'bg-red-100 text-red-800'
      case 'processing': return 'bg-yellow-100 text-yellow-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getSentimentColor = (sentiment) => {
    switch (sentiment) {
      case 'positive': return 'bg-green-100 text-green-800'
      case 'negative': return 'bg-red-100 text-red-800'
      case 'urgent': return 'bg-orange-100 text-orange-800'
      default: return 'bg-blue-100 text-blue-800'
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar 
        title="AI Email Processing"
        userRole="employee"
        onLogout={handleLogout}
        customActions={customActions}
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-8">
          
          {/* Page Header */}
          <div className="text-center">
            <div className="w-16 h-16 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
            <h2 className="text-3xl font-bold text-gray-900 mb-2">AI Email Processing</h2>
            <p className="text-lg text-gray-600">Configure automated AI analysis and reply generation</p>
          </div>

          {/* Statistics Cards */}
          {stats && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                <div className="flex items-center">
                  <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                    <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Processed Emails</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.total_processed}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                <div className="flex items-center">
                  <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                    <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                    </svg>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Replies Sent</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.replies_sent}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                <div className="flex items-center">
                  <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                    <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Avg Response Time</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.average_processing_time}s</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                <div className="flex items-center">
                  <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center">
                    <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Tokens Used</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.total_tokens_used}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* AI Settings */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
            <div className="p-6 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center mr-3">
                    <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900">AI Processing Settings</h3>
                </div>
                <button
                  onClick={handleBulkProcess}
                  disabled={loading || !settings.is_enabled}
                  className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  {loading ? 'Processing...' : 'Bulk Process Emails'}
                </button>
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
              
              <form onSubmit={handleUpdateSettings} className="space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <label htmlFor="is_enabled" className="text-sm font-medium text-gray-700">
                        Enable AI Processing
                      </label>
                      <input
                        type="checkbox"
                        id="is_enabled"
                        name="is_enabled"
                        checked={settings.is_enabled}
                        onChange={handleSettingChange}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <label htmlFor="auto_reply_enabled" className="text-sm font-medium text-gray-700">
                        Enable Automated Replies
                      </label>
                      <input
                        type="checkbox"
                        id="auto_reply_enabled"
                        name="auto_reply_enabled"
                        checked={settings.auto_reply_enabled}
                        onChange={handleSettingChange}
                        disabled={!settings.is_enabled}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded disabled:opacity-50"
                      />
                    </div>

                    <div className="space-y-2">
                      <label htmlFor="response_tone" className="block text-sm font-medium text-gray-700">
                        Response Tone
                      </label>
                      <select
                        id="response_tone"
                        name="response_tone"
                        value={settings.response_tone}
                        onChange={handleSettingChange}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                      >
                        <option value="professional">Professional</option>
                        <option value="friendly">Friendly</option>
                        <option value="formal">Formal</option>
                        <option value="casual">Casual</option>
                      </select>
                    </div>

                    <InputField
                      label="Max Response Length"
                      type="number"
                      name="max_response_length"
                      value={settings.max_response_length}
                      onChange={handleSettingChange}
                      placeholder="500"
                      min="100"
                      max="2000"
                      helpText="Maximum characters in AI-generated responses"
                    />
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="default_prompt" className="block text-sm font-medium text-gray-700">
                      Default AI Prompt
                    </label>
                    <textarea
                      id="default_prompt"
                      name="default_prompt"
                      value={settings.default_prompt}
                      onChange={handleSettingChange}
                      rows={8}
                      placeholder="Enter the default instructions for the AI assistant..."
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 resize-none"
                    />
                    <p className="text-xs text-gray-500">
                      This prompt guides how the AI analyzes and responds to emails
                    </p>
                  </div>
                </div>

                <button 
                  type="submit" 
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-3 px-4 rounded-lg font-semibold 
                           hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 
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
                      Updating Settings...
                    </div>
                  ) : (
                    'Update AI Settings'
                  )}
                </button>
              </form>
            </div>
          </div>

          {/* Recent Processing Logs */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
            <div className="p-6 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center mr-3">
                    <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900">Recent AI Processing</h3>
                </div>
                <span className="text-sm text-gray-500">{processingLogs.length} recent logs</span>
              </div>
            </div>
            
            <div className="p-6">
              {processingLogs.length === 0 ? (
                <div className="text-center py-16">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <h4 className="text-lg font-medium text-gray-900 mb-2">No processing logs yet</h4>
                  <p className="text-gray-500">Enable AI processing to see email analysis and reply logs here</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {processingLogs.map((log) => (
                    <div key={log.id} className="border border-gray-200 rounded-xl p-4 hover:shadow-md transition-shadow duration-300">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-900 truncate">{log.email_subject}</h4>
                          <p className="text-sm text-gray-600 mt-1">From: {log.email_sender}</p>
                        </div>
                        <div className="flex items-center space-x-2 ml-4">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(log.status)}`}>
                            {log.status}
                          </span>
                          {log.reply_sent && (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                              Reply Sent
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="grid md:grid-cols-3 gap-4">
                        {log.ai_summary && (
                          <div className="bg-gray-50 rounded-lg p-3">
                            <div className="flex items-center mb-2">
                              <svg className="w-4 h-4 text-gray-600 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                              </svg>
                              <span className="text-xs font-medium text-gray-700">Summary</span>
                            </div>
                            <p className="text-xs text-gray-600 line-clamp-2">{log.ai_summary}</p>
                          </div>
                        )}

                        {log.ai_sentiment && (
                          <div className="bg-gray-50 rounded-lg p-3">
                            <div className="flex items-center mb-2">
                              <svg className="w-4 h-4 text-gray-600 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                              </svg>
                              <span className="text-xs font-medium text-gray-700">Analysis</span>
                            </div>
                            <div className="space-y-1">
                              {log.ai_sentiment && (
                                <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getSentimentColor(log.ai_sentiment)}`}>
                                  {log.ai_sentiment}
                                </span>
                              )}
                              {log.ai_category && (
                                <p className="text-xs text-gray-600">{log.ai_category}</p>
                              )}
                            </div>
                          </div>
                        )}

                        {log.processing_duration && (
                          <div className="bg-gray-50 rounded-lg p-3">
                            <div className="flex items-center mb-2">
                              <svg className="w-4 h-4 text-gray-600 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              <span className="text-xs font-medium text-gray-700">Performance</span>
                            </div>
                            <div className="space-y-1">
                              <p className="text-xs text-gray-600">{log.processing_duration}s</p>
                              {log.tokens_used && (
                                <p className="text-xs text-gray-600">{log.tokens_used} tokens</p>
                              )}
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="mt-3 text-xs text-gray-500">
                        {new Date(log.created_at).toLocaleString()}
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

export default AISettings
