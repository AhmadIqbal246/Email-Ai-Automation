import { Navigate } from 'react-router-dom'
import { useSelector } from 'react-redux'

const ProtectedRoute = ({ children, requiredRole }) => {
  const { user, isAuthenticated, isLoading } = useSelector((state) => state.auth)
  
  // If still loading, show loading screen
  if (isLoading) {
    return (
      <div className="loading-screen">
        <h2>Loading...</h2>
      </div>
    )
  }
  
  // If no user is logged in, redirect to login
  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />
  }
  
  // If user doesn't have the required role, redirect appropriately
  if (requiredRole && user.role !== requiredRole) {
    if (user.role === 'company_admin') {
      return <Navigate to="/admin" replace />
    } else {
      return <Navigate to="/dashboard" replace />
    }
  }
  
  // If user is authorized, render the children components
  return children
}

export default ProtectedRoute
