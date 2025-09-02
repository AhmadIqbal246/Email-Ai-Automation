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
  brandIcon = null,
  // Admin navigation props
  showAdminNav = false,
  activeSection = "dashboard",
  onNavigate = null
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
            
            {/* Center - Admin navigation or Custom actions */}
            {showAdminNav && userRole === 'admin' ? (
              <div className="hidden md:flex items-center space-x-2 bg-white/10 backdrop-blur-sm border border-white/30 rounded-xl p-1 shadow-lg">
                <button
                  onClick={() => onNavigate && onNavigate('dashboard')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 transform hover:scale-105 ${
                    activeSection === 'dashboard'
                      ? 'bg-blue-500/20 text-blue-700 border border-blue-300/30'
                      : 'bg-white/10 text-gray-600 hover:bg-white/20 hover:text-gray-800'
                  }`}
                >
                  <div className="flex items-center space-x-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5a2 2 0 012-2h4a2 2 0 012 2v6H8V5z" />
                    </svg>
                    <span>Dashboard</span>
                  </div>
                </button>
                
                <button
                  onClick={() => onNavigate && onNavigate('employees')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 transform hover:scale-105 ${
                    activeSection === 'employees'
                      ? 'bg-green-500/20 text-green-700 border border-green-300/30'
                      : 'bg-white/10 text-gray-600 hover:bg-white/20 hover:text-gray-800'
                  }`}
                >
                  <div className="flex items-center space-x-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                    <span>Employees</span>
                  </div>
                </button>
                
                <button
                  onClick={() => onNavigate && onNavigate('invite')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 transform hover:scale-105 ${
                    activeSection === 'invite'
                      ? 'bg-purple-500/20 text-purple-700 border border-purple-300/30'
                      : 'bg-white/10 text-gray-600 hover:bg-white/20 hover:text-gray-800'
                  }`}
                >
                  <div className="flex items-center space-x-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                    </svg>
                    <span>Invite</span>
                  </div>
                </button>
                
                {/* Divider */}
                <div className="w-px h-6 bg-white/20 mx-1"></div>
                
                {/* AI Settings Button */}
                <button
                  onClick={() => window.location.href = '/admin/ai-settings'}
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
              </div>
            ) : customActions && (
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
