import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import InputField from '../../components/reusable/InputField'
import ENV from '../../../config'

const EmployeeSignup = () => {
  const [searchParams] = useSearchParams()
  const [invitationData, setInvitationData] = useState(null)
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    username: '',
    password: '',
    confirmPassword: '',
    phoneNumber: ''
  })
  
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [verifyingToken, setVerifyingToken] = useState(true)
  const navigate = useNavigate()
  
  const token = searchParams.get('token')

  useEffect(() => {
    // Verify invitation token when component loads
    const verifyInvitation = async () => {
      if (!token) {
        setError('Invalid invitation link')
        setVerifyingToken(false)
        return
      }

      try {
        const response = await fetch(`${ENV.API_BASE_URL}/api/auth/verify-invitation/`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ token })
        })

        if (response.ok) {
          const data = await response.json()
          setInvitationData(data.invitation)
        } else {
          const errorData = await response.json()
          setError(errorData.message || 'Invalid or expired invitation')
        }
      } catch (error) {
        setError('Failed to verify invitation')
      } finally {
        setVerifyingToken(false)
      }
    }

    verifyInvitation()
  }, [token])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    // Validation
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match')
      setLoading(false)
      return
    }

    try {
      const response = await fetch(`${ENV.API_BASE_URL}/api/auth/employee-signup/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          token
        })
      })

      if (response.ok) {
        const data = await response.json()
        localStorage.setItem('authToken', data.token)
        navigate('/dashboard')
      } else {
        const errorData = await response.json()
        setError(errorData.message || 'Registration failed')
      }
    } catch (error) {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }



  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  if (verifyingToken) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full">
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl mb-4">
              <svg className="animate-spin w-8 h-8 text-white" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Verifying Invitation</h2>
            <p className="text-gray-600">Please wait while we verify your invitation...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error && !invitationData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-pink-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full">
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 rounded-2xl mb-4">
              <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Invalid Invitation</h2>
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg mb-6">
              <p className="text-red-700 text-sm">{error}</p>
            </div>
            <Link 
              to="/login" 
              className="inline-flex items-center justify-center px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg font-semibold
                       hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 
                       transition-all duration-200 ease-in-out"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
              </svg>
              Go to Login
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-emerald-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-grid-pattern opacity-5"></div>
      
      <div className="relative w-full max-w-2xl">
        {/* Header with Company Info */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-green-600 to-emerald-600 rounded-2xl mb-4">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Join {invitationData?.company_name}</h1>
          <p className="text-xl text-gray-600 mb-4">
          You've been invited to join {invitationData?.company_name} as an {invitationData?.role}
        </p>
          <div className="inline-flex items-center px-4 py-2 bg-green-100 rounded-full">
            <svg className="w-4 h-4 text-green-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            <span className="text-green-800 text-sm font-medium">{invitationData?.email_address}</span>
          </div>
        </div>

        {/* Main Form Card */}
        <div className="bg-white rounded-3xl shadow-2xl border border-gray-100 overflow-hidden">
          {error && (
            <div className="mx-8 mt-8 p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center">
                <svg className="w-5 h-5 text-red-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                <span className="text-red-700 text-sm font-medium">{error}</span>
              </div>
            </div>
          )}
          
          <form onSubmit={handleSubmit} className="p-8 space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
            <InputField
                label="First Name"
              type="text"
              name="firstName"
              value={formData.firstName}
              onChange={handleChange}
              placeholder="First name"
              required
            />
            
            <InputField
                label="Last Name"
              type="text"
              name="lastName"
              value={formData.lastName}
              onChange={handleChange}
              placeholder="Last name"
              required
            />
          </div>
          
          <InputField
              label="Username"
            type="text"
            name="username"
            value={formData.username}
            onChange={handleChange}
            placeholder="Choose a username"
              helpText="This will be your unique identifier in the system"
            required
          />
          
          <InputField
            label="Phone Number"
            type="tel"
            name="phoneNumber"
            value={formData.phoneNumber}
            onChange={handleChange}
            placeholder="+1 (555) 123-4567"
              helpText="Optional - for account recovery and notifications"
          />
          
            <div className="grid md:grid-cols-2 gap-6">
            <InputField
                label="Password"
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="Create password"
                helpText="Min. 8 characters"
              required
            />
            
            <InputField
                label="Confirm Password"
              type="password"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              placeholder="Confirm password"
              required
            />
          </div>
          
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-6">
          <button 
            type="submit" 
            disabled={loading}
                className="w-full sm:w-auto bg-gradient-to-r from-green-600 to-emerald-600 text-white py-4 px-8 rounded-xl font-semibold text-lg
                         hover:from-green-700 hover:to-emerald-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 
                         transition-all duration-200 ease-in-out transform hover:scale-[1.02] active:scale-[0.98]
                         disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none
                         shadow-lg hover:shadow-xl"
              >
                {loading ? (
                  <div className="flex items-center justify-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Creating Account...
                  </div>
                ) : (
                  <div className="flex items-center justify-center">
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Complete Registration
                  </div>
                )}
          </button>
            </div>
        </form>
        
          {/* Footer */}
          <div className="px-8 py-6 bg-gray-50 border-t border-gray-100">
            <div className="text-center">
              <p className="text-sm text-gray-600 mb-3">Need help with your invitation?</p>
              <Link 
                to="/login" 
                className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-gray-600 
                         hover:text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 
                         transition-all duration-200 ease-in-out"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                </svg>
                Back to Login
              </Link>
            </div>
          </div>
        </div>
        
        {/* Welcome Features */}
        <div className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white/50 backdrop-blur-sm rounded-2xl p-6 border border-gray-100">
            <div className="flex items-center mb-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <h4 className="text-lg font-semibold text-gray-900">Smart Email Management</h4>
            </div>
            <p className="text-gray-600 text-sm">Automate your email responses and manage your inbox intelligently</p>
          </div>
          
          <div className="bg-white/50 backdrop-blur-sm rounded-2xl p-6 border border-gray-100">
            <div className="flex items-center mb-3">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center mr-3">
                <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </div>
              <h4 className="text-lg font-semibold text-gray-900">AI Rules</h4>
            </div>
            <p className="text-gray-600 text-sm">Create custom automation rules powered by artificial intelligence</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default EmployeeSignup

