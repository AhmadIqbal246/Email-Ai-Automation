import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { loginUser, clearError } from '../../redux/authSlice'
import InputField from '../../components/reusable/InputField'
import ENV from '../../../config'

const Login = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  })
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const { user, isAuthenticated, loginLoading, error } = useSelector((state) => state.auth)

  // Clear error on component mount
  useEffect(() => {
    dispatch(clearError())
  }, [dispatch])

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated && user) {
      if (user.role === 'company_admin') {
          navigate('/admin')
        } else {
          navigate('/dashboard')
        }
    }
  }, [isAuthenticated, user, navigate])

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    const result = await dispatch(loginUser(formData))
    
    if (loginUser.fulfilled.match(result)) {
      // Navigation will be handled by useEffect above
      const userData = result.payload.user
      if (userData.role === 'company_admin') {
          navigate('/admin')
        } else {
          navigate('/dashboard')
        }
    }
  }

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center p-4">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-grid-pattern opacity-5"></div>
      
      <div className="relative w-full max-w-md">
        {/* Logo/Brand Section */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl mb-4">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">{ENV.APP_NAME}</h1>
          <p className="text-gray-600">Sign in to your account</p>
        </div>

        {/* Login Card */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
          <div className="px-8 py-8">
            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-center">
                  <svg className="w-5 h-5 text-red-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  <span className="text-red-700 text-sm font-medium">{error}</span>
                </div>
              </div>
            )}
            
            <form onSubmit={handleSubmit} className="space-y-6">
          <InputField
                label="Email Address"
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
                placeholder="Enter your email address"
            required
          />
          
          <InputField
            label="Password"
            type="password"
            name="password"
            value={formData.password}
            onChange={handleChange}
            placeholder="Enter your password"
            required
          />
          
          <button 
            type="submit" 
                disabled={loginLoading}
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-3 px-4 rounded-lg font-semibold 
                         hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 
                         transition-all duration-200 ease-in-out transform hover:scale-[1.02] active:scale-[0.98]
                         disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none
                         shadow-lg hover:shadow-xl"
              >
                {loginLoading ? (
                  <div className="flex items-center justify-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Signing in...
                  </div>
                ) : (
                  'Sign In'
                )}
          </button>
        </form>
        </div>
        
          {/* Footer Links */}
          <div className="px-8 py-6 bg-gray-50 border-t border-gray-100">
            <div className="text-center space-y-4">
              <p className="text-sm text-gray-600">Don't have an account?</p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Link 
                  to="/signup/company" 
                  className="inline-flex items-center justify-center px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 
                           hover:bg-gray-50 hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 
                           transition-all duration-200 ease-in-out"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1" />
                  </svg>
                  Create Company Account
                </Link>
                <span className="hidden sm:block text-gray-400">or</span>
                <Link 
                  to="#" 
                  className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-blue-600 
                           hover:text-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 
                           transition-all duration-200 ease-in-out"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  Have an invitation?
                </Link>
              </div>
            </div>
          </div>
        </div>
        
        {/* Trust Indicators */}
        <div className="mt-8 text-center">
          <p className="text-xs text-gray-500 mb-4">Trusted by teams worldwide</p>
          <div className="flex items-center justify-center space-x-8 opacity-60">
            <div className="w-8 h-8 bg-gray-300 rounded-full"></div>
            <div className="w-8 h-8 bg-gray-300 rounded-full"></div>
            <div className="w-8 h-8 bg-gray-300 rounded-full"></div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Login
