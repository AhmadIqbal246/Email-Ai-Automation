import { BrowserRouter, Routes, Route, Navigate, Link } from 'react-router-dom'
import { useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { loadAuthFromStorage, setLoadingComplete } from './redux/authSlice'
import './App.css'

// Import pages
import Login from './pages/auth/Login'
import CompanySignup from './pages/auth/CompanySignup'
import EmployeeSignup from './pages/auth/EmployeeSignup'
import AdminDashboard from './pages/dashboard/AdminDashboard'
import EmployeeDashboard from './pages/dashboard/EmployeeDashboard'
import { AISettings } from './components/ai-rule'
import ProtectedRoute from './components/common/ProtectedRoute'

// Root redirect component
const RootRedirect = () => {
  const { user, isAuthenticated } = useSelector((state) => state.auth)
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }
  
  if (user?.role === 'company_admin') {
    return <Navigate to="/admin" replace />
  }
  
  return <Navigate to="/dashboard" replace />
}

// Navigation component (optional - you can use this for navigation links)
const Navigation = () => {
  const { isAuthenticated, user } = useSelector((state) => state.auth)
  
  if (!isAuthenticated) {
    return (
      <nav className="navigation">
        <Link to="/login">Login</Link>
        <Link to="/signup/company">Company Signup</Link>
      </nav>
    )
  }
  
  return (
    <nav className="navigation">
      {user?.role === 'company_admin' ? (
        <Link to="/admin">Admin Dashboard</Link>
      ) : (
        <Link to="/dashboard">Dashboard</Link>
      )}
      <button onClick={() => {/* Add logout logic */}}>Logout</button>
    </nav>
  )
}

function App() {
  const dispatch = useDispatch()
  const { isLoading, isAuthenticated } = useSelector((state) => state.auth)

  useEffect(() => {
    // Load auth state from localStorage on app start
    const token = localStorage.getItem('authToken')
    if (token) {
      // Load from storage first (offline-first approach)
      dispatch(loadAuthFromStorage())
    } else {
      // If no token, set loading to false immediately
      dispatch(setLoadingComplete())
    }
  }, [dispatch])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl mb-4">
            <svg className="animate-spin w-8 h-8 text-white" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Loading...</h2>
          <p className="text-gray-600">Please wait while we load your account</p>
        </div>
      </div>
    )
  }

  return (
    <BrowserRouter>
      <div className="App">
        {/* Optional: Include navigation component */}
        {/* <Navigation /> */}
        
        <Routes>
          {/* Root route - redirect based on auth status */}
          <Route path="/" element={<RootRedirect />} />
          
          {/* Authentication routes */}
          <Route path="/login" element={<Login />} />
          
          {/* Signup routes */}
          <Route path="/signup/company" element={<CompanySignup />} />
          <Route path="/signup/employee" element={<EmployeeSignup />} />
          <Route path="/signup/employee/:token" element={<EmployeeSignup />} />
          
          {/* Protected admin route */}
          <Route 
            path="/admin" 
            element={
              <ProtectedRoute requiredRole="company_admin">
                <AdminDashboard />
              </ProtectedRoute>
            } 
          />
          
          {/* Protected employee routes */}
          <Route 
            path="/dashboard" 
            element={
              <ProtectedRoute requiredRole="employee">
                <EmployeeDashboard />
              </ProtectedRoute>
            } 
          />
          
          <Route 
            path="/ai-settings" 
            element={
              <ProtectedRoute requiredRole="employee">
                <AISettings />
              </ProtectedRoute>
            } 
          />
          
          {/* Catch-all route for 404s */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </BrowserRouter>
  )
}

export default App
