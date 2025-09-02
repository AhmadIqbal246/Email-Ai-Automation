import { useState, useEffect } from 'react'
import ENV from '../../../config'

const HubSpotIntegration = () => {
  const [hubspotAccount, setHubspotAccount] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [syncStats, setSyncStats] = useState(null)

  useEffect(() => {
    fetchHubSpotStatus()
    fetchSyncStats()
  }, [])

  const fetchHubSpotStatus = async () => {
    try {
      const token = localStorage.getItem('authToken')
      const response = await fetch(`${ENV.API_BASE_URL}/api/hubspot/status/`, {
        headers: {
          'Authorization': `Token ${token}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        setHubspotAccount(data)
      } else if (response.status === 404) {
        // No HubSpot account connected
        setHubspotAccount(null)
      } else {
        const errorData = await response.json()
        console.error('Failed to fetch HubSpot status:', errorData)
      }
    } catch (error) {
      console.error('Failed to fetch HubSpot status:', error)
    }
  }

  const fetchSyncStats = async () => {
    try {
      const token = localStorage.getItem('authToken')
      const response = await fetch(`${ENV.API_BASE_URL}/api/hubspot/statistics/`, {
        headers: {
          'Authorization': `Token ${token}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        setSyncStats(data)
      }
    } catch (error) {
      console.error('Failed to fetch sync statistics:', error)
    }
  }

  const handleConnectHubSpot = async () => {
    try {
      setLoading(true)
      setError('')
      
      const token = localStorage.getItem('authToken')
      const response = await fetch(`${ENV.API_BASE_URL}/api/hubspot/oauth/init/`, {
        method: 'POST',
        headers: {
          'Authorization': `Token ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (response.ok) {
        const data = await response.json()
        // Redirect to HubSpot OAuth
        window.location.href = data.authorization_url
      } else {
        const errorData = await response.json()
        setError(errorData.error || 'Failed to initialize HubSpot connection')
      }
    } catch (error) {
      console.error('Failed to connect to HubSpot:', error)
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleDisconnectHubSpot = async () => {
    if (!window.confirm('Are you sure you want to disconnect your HubSpot account?')) {
      return
    }

    try {
      setLoading(true)
      setError('')
      
      const token = localStorage.getItem('authToken')
      const response = await fetch(`${ENV.API_BASE_URL}/api/hubspot/disconnect/`, {
        method: 'POST',
        headers: {
          'Authorization': `Token ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (response.ok) {
        setHubspotAccount(null)
        setSyncStats(null)
        setSuccess('HubSpot account disconnected successfully')
      } else {
        const errorData = await response.json()
        setError(errorData.error || 'Failed to disconnect HubSpot account')
      }
    } catch (error) {
      console.error('Failed to disconnect HubSpot:', error)
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateSettings = async (settings) => {
    try {
      setLoading(true)
      setError('')
      
      const token = localStorage.getItem('authToken')
      const response = await fetch(`${ENV.API_BASE_URL}/api/hubspot/settings/`, {
        method: 'POST',
        headers: {
          'Authorization': `Token ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(settings)
      })

      if (response.ok) {
        const data = await response.json()
        setHubspotAccount(data)
        setSuccess('Settings updated successfully')
      } else {
        const errorData = await response.json()
        setError(errorData.error || 'Failed to update settings')
      }
    } catch (error) {
      console.error('Failed to update settings:', error)
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  // Check URL parameters for OAuth callback status
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    const hubspotConnected = urlParams.get('hubspot_connected')
    const hubspotError = urlParams.get('hubspot_error')
    
    if (hubspotConnected === 'true') {
      setSuccess('HubSpot account connected successfully!')
      fetchHubSpotStatus()
      fetchSyncStats()
      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname)
    } else if (hubspotError) {
      setError(`HubSpot connection failed: ${hubspotError}`)
      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname)
    }
  }, [])

  return (
    <div className="relative overflow-hidden animate-fade-in-up">
      {/* Glassmorphism Container */}
      <div className="relative bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/30 hover:shadow-3xl transition-all duration-700 group overflow-hidden">
        {/* Header */}
        <div className="relative p-6 border-b border-white/30 backdrop-blur-sm">
          <div className="flex items-center space-x-4">
            {/* HubSpot Icon */}
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-orange-500 to-red-600 rounded-2xl blur-lg opacity-30 animate-pulse"></div>
              <div className="relative w-12 h-12 bg-gradient-to-br from-orange-500 via-red-500 to-pink-500 rounded-2xl flex items-center justify-center shadow-xl transform hover:scale-110 transition-all duration-300">
                <svg className="w-6 h-6 text-white drop-shadow-lg" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm0 18c-4.411 0-8-3.589-8-8s3.589-8 8-8 8 3.589 8 8-3.589 8-8 8zm-1-13v6l5.25 3.15L17 15l-4-2.4V7H9z"/>
                </svg>
              </div>
            </div>
            
            {/* Title */}
            <div className="space-y-1">
              <h3 className="text-xl font-bold bg-gradient-to-r from-gray-900 via-orange-800 to-red-800 bg-clip-text text-transparent leading-tight">
                HubSpot Integration
              </h3>
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <div className={`w-2 h-2 rounded-full animate-pulse ${
                  hubspotAccount?.is_connected ? 'bg-gradient-to-r from-green-400 to-emerald-500' : 'bg-gradient-to-r from-gray-400 to-gray-500'
                }`}></div>
                <span className="font-medium">
                  {hubspotAccount?.is_connected ? 'Connected' : 'Not connected'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div className="p-6">
          {!hubspotAccount?.is_connected ? (
            <div className="text-center py-12">
              <div className="relative mb-8">
                <div className="absolute inset-0 bg-gradient-to-r from-orange-200 to-red-200 rounded-full blur-2xl opacity-30 animate-pulse"></div>
                <div className="relative w-32 h-32 bg-gradient-to-br from-orange-100 via-red-100 to-pink-100 rounded-3xl flex items-center justify-center mx-auto shadow-2xl">
                  <svg className="w-16 h-16 text-orange-600" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm0 18c-4.411 0-8-3.589-8-8s3.589-8 8-8 8 3.589 8 8-3.589 8-8 8zm-1-13v6l5.25 3.15L17 15l-4-2.4V7H9z"/>
                  </svg>
                </div>
              </div>
              <h4 className="text-2xl font-bold bg-gradient-to-r from-gray-800 to-gray-900 bg-clip-text text-transparent mb-4">
                Connect to HubSpot
              </h4>
              <p className="text-gray-600 text-lg max-w-md mx-auto leading-relaxed mb-8">
                Connect your HubSpot account to automatically sync email senders as contacts in your CRM
              </p>
              
              {/* Connect Button */}
              <button 
                onClick={handleConnectHubSpot}
                disabled={loading}
                className="group relative inline-flex items-center px-8 py-4 bg-gradient-to-r from-orange-600 via-red-600 to-pink-600 text-white font-bold rounded-2xl shadow-2xl hover:shadow-3xl disabled:opacity-50 transition-all duration-300 transform hover:scale-105 hover:-translate-y-1 disabled:hover:scale-100 disabled:hover:translate-y-0 mx-auto"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-orange-400 to-pink-400 rounded-2xl blur-lg opacity-30 group-hover:opacity-50 transition-opacity duration-300"></div>
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
                      <span>Connect HubSpot Account</span>
                    </>
                  )}
                </div>
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Connected Account Info */}
              <div className="group relative overflow-hidden cursor-default transition-all duration-500 hover:scale-[1.02] hover:-translate-y-1">
                <div className="relative p-5 rounded-2xl backdrop-blur-sm transition-all duration-500 bg-gradient-to-br from-green-50/80 via-emerald-50/60 to-blue-50/40 border border-green-200/50 shadow-lg hover:shadow-xl">
                  <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                    <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-green-100/30 via-emerald-100/20 to-blue-100/30"></div>
                  </div>
                  
                  <div className="relative space-y-4">
                    {/* Account Header */}
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-4">
                        {/* HubSpot Icon */}
                        <div className="relative flex-shrink-0">
                          <div className="absolute inset-0 bg-gradient-to-r from-green-400 to-emerald-500 rounded-2xl blur-md opacity-30 animate-pulse"></div>
                          <div className="relative w-14 h-14 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl flex items-center justify-center shadow-xl transform hover:scale-110 transition-all duration-300">
                            <svg className="w-7 h-7 text-white drop-shadow-lg" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm0 18c-4.411 0-8-3.589-8-8s3.589-8 8-8 8 3.589 8 8-3.589 8-8 8zm-1-13v6l5.25 3.15L17 15l-4-2.4V7H9z"/>
                            </svg>
                          </div>
                        </div>
                        
                        {/* Account Details */}
                        <div className="flex-1 min-w-0">
                          <div className="space-y-2">
                            <h4 className="text-lg font-bold bg-gradient-to-r from-gray-900 via-green-800 to-emerald-800 bg-clip-text text-transparent">
                              HubSpot Connected
                            </h4>
                            {hubspotAccount.portal_id && (
                              <p className="text-sm text-gray-600">
                                Portal ID: {hubspotAccount.portal_id}
                              </p>
                            )}
                            <div className="flex items-center space-x-2">
                              <div className="flex items-center space-x-1 text-xs text-green-600">
                                <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
                                <span className="font-medium">Active</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      {/* Disconnect Button */}
                      <button
                        onClick={handleDisconnectHubSpot}
                        disabled={loading}
                        className="group/btn relative inline-flex items-center justify-center px-3 py-2 bg-white/90 backdrop-blur-sm text-red-700 font-semibold rounded-xl shadow-lg hover:shadow-xl border border-white/60 transition-all duration-300 transform hover:scale-105 hover:-translate-y-0.5 disabled:opacity-50"
                        title="Disconnect HubSpot account"
                      >
                        <div className="absolute inset-0 bg-gradient-to-r from-red-100/60 to-rose-100/60 rounded-xl opacity-0 group-hover/btn:opacity-100 transition-opacity duration-300"></div>
                        <div className="relative flex items-center">
                          <svg className="w-4 h-4 transition-transform duration-300 group-hover/btn:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </div>
                      </button>
                    </div>

                    {/* Sync Statistics */}
                    {syncStats && (
                      <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/40">
                        <div className="text-center">
                          <div className="text-2xl font-bold text-green-600">{syncStats.synced_contacts}</div>
                          <div className="text-sm text-gray-600">Synced Contacts</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-orange-600">{syncStats.pending_contacts}</div>
                          <div className="text-sm text-gray-600">Pending Sync</div>
                        </div>
                      </div>
                    )}

                    {/* Settings Toggle */}
                    <div className="flex items-center justify-between pt-4 border-t border-white/40">
                      <span className="text-sm font-medium text-gray-700">Auto-sync contacts</span>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={hubspotAccount.auto_sync_contacts}
                          onChange={(e) => handleUpdateSettings({ auto_sync_contacts: e.target.checked })}
                          disabled={loading}
                          className="sr-only peer"
                        />
                        <div className="relative w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-xl">
          <div className="flex items-center">
            <svg className="w-5 h-5 text-red-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <span className="text-red-700 text-sm">{error}</span>
            <button
              onClick={() => setError('')}
              className="ml-auto text-red-400 hover:text-red-600"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Success Message */}
      {success && (
        <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-xl">
          <div className="flex items-center">
            <svg className="w-5 h-5 text-green-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-green-700 text-sm">{success}</span>
            <button
              onClick={() => setSuccess('')}
              className="ml-auto text-green-400 hover:text-green-600"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default HubSpotIntegration
