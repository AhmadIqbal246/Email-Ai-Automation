import { useState } from 'react'
import { useSelector } from 'react-redux'

const Navbar = ({ 
  title = "Dashboard", 
  userRole = "user", 
  onLogout,
  backgroundColor = "from-blue-600 to-indigo-600",
  accentColor = "blue",
  showUserMenu = true,
  showLogoutButton = false,
  customActions = null,
  brandIcon = null
}) => {
  const { user } = useSelector((state) => state.auth)
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false)

  // Define color schemes based on user role
  const colorSchemes = {
    admin: {
      gradient: "from-blue-600 to-indigo-600",
      accent: "blue",
      icon: (
        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      )
    },
    employee: {
      gradient: "from-green-600 to-emerald-600",
      accent: "green",
      icon: (
        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      )
    },
    default: {
      gradient: backgroundColor,
      accent: accentColor,
      icon: brandIcon || (
        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      )
    }
  }

  const currentScheme = colorSchemes[userRole] || colorSchemes.default

  return (
    <>
      {/* Glassmorphism Navbar */}
      <header className="fixed top-0 left-0 right-0 z-50">
        {/* Glassmorphism background */}
        <div className="absolute inset-0 bg-white/70 backdrop-blur-lg border-b border-white/20 shadow-lg"></div>
        
        {/* Gradient overlay for glassmorphism effect */}
        <div className={`absolute inset-0 bg-gradient-to-r ${currentScheme.gradient} opacity-5`}></div>
        
        {/* Content */}
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Left side - Brand and title */}
            <div className="flex items-center space-x-4">
              <div className="flex-shrink-0">
                <div className={`w-10 h-10 bg-gradient-to-r ${currentScheme.gradient} rounded-xl flex items-center justify-center shadow-lg transform hover:scale-105 transition-transform duration-200`}>
                  {currentScheme.icon}
                </div>
              </div>
              <div className="hidden sm:block">
                <h1 className="text-xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                  {title}
                </h1>
              </div>
            </div>
            
            {/* Center - Custom actions (if provided) */}
            {customActions && (
              <div className="hidden md:flex items-center space-x-4">
                {customActions}
              </div>
            )}
            
            {/* Right side - User info and actions */}
            <div className="flex items-center space-x-4">
              {/* User info */}
              {showUserMenu && (
                <div className="hidden sm:block text-right">
                  <p className="text-sm font-medium text-gray-900">
                    Welcome, {user?.first_name || user?.email}
                  </p>
                  <p className="text-xs text-gray-600">
                    {user?.company?.name || 'Dashboard'}
                  </p>
                </div>
              )}
              
              {/* Prominent logout button */}
              {showLogoutButton && onLogout && (
                <button 
                  onClick={onLogout}
                  className={`inline-flex items-center px-4 py-2 bg-red-500/20 backdrop-blur-sm border border-red-300/30 rounded-lg text-sm font-medium text-red-600 
                           hover:bg-red-500/30 hover:border-red-300/40 hover:text-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 
                           transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105`}
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  Logout
                </button>
              )}
              
              {/* User avatar */}
              {showUserMenu && (
                <div className="relative">
                  <button
                    onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                    className={`w-10 h-10 bg-gradient-to-r ${currentScheme.gradient} rounded-full flex items-center justify-center shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200`}
                  >
                    <span className="text-white text-sm font-bold">
                      {(user?.first_name?.[0] || user?.email?.[0] || 'U').toUpperCase()}
                    </span>
                  </button>
                  
                  {/* Dropdown menu */}
                  {isUserMenuOpen && (
                    <div className="absolute right-0 mt-2 w-48 bg-white/90 backdrop-blur-lg rounded-xl shadow-xl border border-white/20 py-2 z-50">
                      <div className="px-4 py-2 border-b border-gray-200/50">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {user?.first_name ? `${user.first_name} ${user.last_name || ''}` : user?.email}
                        </p>
                        <p className="text-xs text-gray-600 truncate">{user?.email}</p>
                      </div>
                      
                      <button
                        onClick={() => {
                          setIsUserMenuOpen(false)
                          onLogout && onLogout()
                        }}
                        className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-red-50/80 hover:text-red-600 transition-colors duration-200 flex items-center"
                      >
                        <svg className="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                        </svg>
                        Logout
                      </button>
                    </div>
                  )}
                </div>
              )}
              
              {/* Traditional logout button (fallback) */}
              {!showUserMenu && !showLogoutButton && onLogout && (
                <button 
                  onClick={onLogout}
                  className={`inline-flex items-center px-4 py-2 bg-white/20 backdrop-blur-sm border border-white/30 rounded-lg text-sm font-medium text-gray-700 
                           hover:bg-white/30 hover:border-white/40 focus:outline-none focus:ring-2 focus:ring-${currentScheme.accent}-500 focus:ring-offset-2 
                           transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105`}
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  Logout
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Click outside to close user menu */}
      {isUserMenuOpen && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => setIsUserMenuOpen(false)}
        ></div>
      )}
      
      {/* Spacer to account for fixed navbar */}
      <div className="h-16"></div>
    </>
  )
}

export default Navbar
