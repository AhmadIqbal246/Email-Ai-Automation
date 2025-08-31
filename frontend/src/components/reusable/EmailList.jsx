import { useState, useMemo } from 'react'

const EmailList = ({ 
  emails, 
  loading, 
  onEmailClick, 
  onMarkAllAsRead,
  onRefresh 
}) => {
  const [markingAllAsRead, setMarkingAllAsRead] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [emailsPerPage, setEmailsPerPage] = useState(10)

  const handleMarkAllAsRead = async () => {
    try {
      setMarkingAllAsRead(true)
      await onMarkAllAsRead()
    } finally {
      setMarkingAllAsRead(false)
    }
  }

  // Pagination calculations
  const unreadCount = emails.filter(email => !email.is_read).length
  const readCount = emails.length - unreadCount
  const totalPages = Math.ceil(emails.length / emailsPerPage)
  const startIndex = (currentPage - 1) * emailsPerPage
  const endIndex = startIndex + emailsPerPage
  const currentEmails = emails.slice(startIndex, endIndex)
  const currentPageUnreadCount = currentEmails.filter(email => !email.is_read).length

  // Page navigation functions
  const goToPage = (page) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)))
  }

  const goToPreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1)
    }
  }

  const goToNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1)
    }
  }

  const changeEmailsPerPage = (newPerPage) => {
    setEmailsPerPage(newPerPage)
    setCurrentPage(1) // Reset to first page when changing items per page
  }

  // Get page range for pagination display
  const getPageRange = () => {
    const delta = 2
    const range = []
    const rangeWithDots = []
    let l

    for (let i = Math.max(2, currentPage - delta); i <= Math.min(totalPages - 1, currentPage + delta); i++) {
      range.push(i)
    }

    if (currentPage - delta > 2) {
      rangeWithDots.push(1, '...')
    } else {
      rangeWithDots.push(1)
    }

    rangeWithDots.push(...range)

    if (currentPage + delta < totalPages - 1) {
      rangeWithDots.push('...', totalPages)
    } else {
      if (totalPages > 1) {
        rangeWithDots.push(totalPages)
      }
    }

    return rangeWithDots
  }

  return (
    <div className="relative overflow-hidden">
      {/* Animated Background Gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 animate-gradient-shift opacity-60"></div>
      
      {/* Glassmorphism Container */}
      <div className="relative bg-white/70 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/20 hover:shadow-3xl transition-all duration-700 group overflow-hidden">
        {/* Premium Header with Gradient Accent */}
        <div className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-indigo-600/10 via-purple-600/10 to-pink-600/10 animate-pulse"></div>
          <div className="relative p-8 border-b border-white/30 backdrop-blur-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                {/* Premium Icon with Animation */}
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-2xl blur-lg opacity-30 animate-pulse"></div>
                  <div className="relative w-14 h-14 bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 rounded-2xl flex items-center justify-center shadow-xl transform hover:scale-110 transition-all duration-300">
                    <svg className="w-7 h-7 text-white drop-shadow-lg" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                </div>
                
                {/* Enhanced Title Section */}
                <div className="space-y-1">
                  <h3 className="text-2xl font-bold bg-gradient-to-r from-gray-900 via-indigo-800 to-purple-800 bg-clip-text text-transparent leading-tight">
                    Email Inbox
                  </h3>
                  <div className="flex items-center space-x-4 text-sm">
                    {unreadCount > 0 && (
                      <div className="flex items-center space-x-2">
                        <div className="w-2 h-2 bg-gradient-to-r from-blue-400 to-indigo-500 rounded-full animate-pulse shadow-lg"></div>
                        <span className="font-semibold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                          {unreadCount} unread
                        </span>
                      </div>
                    )}
                    <div className="flex items-center space-x-2 text-gray-600">
                      <div className="w-2 h-2 bg-gray-300 rounded-full"></div>
                      <span className="font-medium">{readCount} read</span>
                    </div>
                    <div className="text-gray-500 font-medium">{emails.length} total</div>
                  </div>
                </div>
              </div>
              
              {/* Premium Action Buttons */}
              <div className="flex items-center space-x-3">
                {/* Mark All as Read Button */}
                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllAsRead}
                    disabled={markingAllAsRead || loading}
                    className="group relative inline-flex items-center px-6 py-3 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white font-semibold rounded-2xl shadow-xl hover:shadow-2xl disabled:opacity-50 transition-all duration-300 transform hover:scale-105 hover:-translate-y-0.5 disabled:hover:scale-100 disabled:hover:translate-y-0"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-400 to-purple-400 rounded-2xl blur-lg opacity-30 group-hover:opacity-50 transition-opacity duration-300"></div>
                    <div className="relative flex items-center">
                      {markingAllAsRead ? (
                        <>
                          <div className="w-5 h-5 mr-3">
                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                          </div>
                          <span>Marking...</span>
                        </>
                      ) : (
                        <>
                          <svg className="w-5 h-5 mr-3 drop-shadow" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span>Mark All Read</span>
                        </>
                      )}
                    </div>
                  </button>
                )}
                
                {/* Refresh Button */}
                <button
                  onClick={onRefresh}
                  disabled={loading}
                  className="group relative inline-flex items-center px-6 py-3 bg-white/80 backdrop-blur-sm text-gray-700 font-semibold rounded-2xl shadow-xl hover:shadow-2xl border border-white/50 disabled:opacity-50 transition-all duration-300 transform hover:scale-105 hover:-translate-y-0.5 disabled:hover:scale-100 disabled:hover:translate-y-0 hover:bg-white/90"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-gray-100/50 to-blue-100/50 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                  <div className="relative flex items-center">
                    <svg className={`w-5 h-5 mr-3 transition-transform duration-300 ${loading ? 'animate-spin' : 'group-hover:rotate-180'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    <span>{loading ? 'Syncing...' : 'Refresh'}</span>
                  </div>
                </button>
              </div>
            </div>
          </div>
        </div>
        
        {/* Content Area */}
        <div className="p-8">
          {emails.length === 0 ? (
            <div className="text-center py-16">
              <div className="relative mb-8">
                <div className="absolute inset-0 bg-gradient-to-r from-indigo-200 to-purple-200 rounded-full blur-2xl opacity-30 animate-pulse"></div>
                <div className="relative w-24 h-24 bg-gradient-to-br from-indigo-100 via-purple-100 to-pink-100 rounded-3xl flex items-center justify-center mx-auto shadow-2xl">
                  <svg className="w-12 h-12 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
              </div>
              <h4 className="text-2xl font-bold bg-gradient-to-r from-gray-700 to-gray-900 bg-clip-text text-transparent mb-3">Your inbox is empty</h4>
              <p className="text-gray-500 text-lg max-w-md mx-auto leading-relaxed">Connect your Gmail account and sync your emails to get started with AI-powered automation</p>
            </div>
          ) : (
            <>
              {/* Pagination Info Bar */}
              <div className="flex items-center justify-between mb-6 p-4 bg-white/50 backdrop-blur-sm rounded-2xl border border-white/30 shadow-lg">
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2 text-sm">
                    <svg className="w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                    <span className="font-semibold text-gray-700">
                      Showing {startIndex + 1}-{Math.min(endIndex, emails.length)} of {emails.length} emails
                    </span>
                  </div>
                  
                  {currentPageUnreadCount > 0 && (
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-gradient-to-r from-orange-400 to-red-500 rounded-full animate-pulse"></div>
                      <span className="text-sm font-medium text-orange-700">
                        {currentPageUnreadCount} unread on this page
                      </span>
                    </div>
                  )}
                </div>
                
                {/* Items per page selector */}
                <div className="flex items-center space-x-3">
                  <span className="text-sm font-medium text-gray-600">Show:</span>
                  <div className="relative">
                    <select
                      value={emailsPerPage}
                      onChange={(e) => changeEmailsPerPage(parseInt(e.target.value))}
                      className="appearance-none bg-white/80 backdrop-blur-sm border border-white/50 rounded-xl px-4 py-2 text-sm font-medium text-gray-700 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-300 cursor-pointer"
                    >
                      <option value={5}>5</option>
                      <option value={10}>10</option>
                      <option value={20}>20</option>
                      <option value={50}>50</option>
                    </select>
                    <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
                      <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>
                  <span className="text-sm text-gray-500">emails</span>
                </div>
              </div>
              
              {/* Email List */}
              <div className="space-y-4 mb-8">
                {currentEmails.map((email, index) => (
                  <EmailListItem
                    key={email.id}
                    email={email}
                    index={index}
                    onClick={() => onEmailClick(email)}
                  />
                ))}
              </div>
              
              {/* Ultra-Luxury Pagination Controls */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center space-x-2">
                  {/* Previous Button */}
                  <button
                    onClick={goToPreviousPage}
                    disabled={currentPage === 1}
                    className="group relative inline-flex items-center px-4 py-2.5 bg-white/80 backdrop-blur-sm text-gray-700 font-semibold rounded-xl shadow-lg hover:shadow-xl border border-white/50 disabled:opacity-50 transition-all duration-300 transform hover:scale-105 hover:-translate-y-0.5 disabled:hover:scale-100 disabled:hover:translate-y-0 hover:bg-white/90"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-gray-100/50 to-blue-100/50 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                    <div className="relative flex items-center">
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
                      </svg>
                      <span>Previous</span>
                    </div>
                  </button>
                  
                  {/* Page Numbers */}
                  <div className="flex items-center space-x-1">
                    {getPageRange().map((page, index) => (
                      page === '...' ? (
                        <span key={`dots-${index}`} className="px-3 py-2 text-gray-400 font-medium">
                          ⋯
                        </span>
                      ) : (
                        <button
                          key={page}
                          onClick={() => goToPage(page)}
                          className={`group relative inline-flex items-center justify-center w-10 h-10 font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-110 hover:-translate-y-0.5 ${
                            currentPage === page
                              ? 'bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 text-white border-none'
                              : 'bg-white/80 backdrop-blur-sm text-gray-700 border border-white/50 hover:bg-white/90'
                          }`}
                        >
                          {currentPage === page && (
                            <div className="absolute inset-0 bg-gradient-to-r from-indigo-400 to-purple-400 rounded-xl blur-lg opacity-30 group-hover:opacity-50 transition-opacity duration-300"></div>
                          )}
                          {currentPage !== page && (
                            <div className="absolute inset-0 bg-gradient-to-r from-gray-100/50 to-blue-100/50 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                          )}
                          <span className="relative">{page}</span>
                        </button>
                      )
                    ))}
                  </div>
                  
                  {/* Next Button */}
                  <button
                    onClick={goToNextPage}
                    disabled={currentPage === totalPages}
                    className="group relative inline-flex items-center px-4 py-2.5 bg-white/80 backdrop-blur-sm text-gray-700 font-semibold rounded-xl shadow-lg hover:shadow-xl border border-white/50 disabled:opacity-50 transition-all duration-300 transform hover:scale-105 hover:-translate-y-0.5 disabled:hover:scale-100 disabled:hover:translate-y-0 hover:bg-white/90"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-gray-100/50 to-blue-100/50 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                    <div className="relative flex items-center">
                      <span>Next</span>
                      <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// Ultra-luxury EmailListItem component with staggered animations
const EmailListItem = ({ email, onClick, index }) => {
  const formatTime = (dateString) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now - date
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    const diffMins = Math.floor(diffMs / (1000 * 60))
    
    if (diffDays > 0) return `${diffDays}d ago`
    if (diffHours > 0) return `${diffHours}h ago`
    if (diffMins > 0) return `${diffMins}m ago`
    return 'Just now'
  }

  const getSenderName = (sender) => {
    const match = sender.match(/^(.+?)\s*<.*>$/)
    return match ? match[1].trim().replace(/^"|"$/g, '') : sender.split('@')[0]
  }

  return (
    <div 
      onClick={onClick}
      style={{ animationDelay: `${index * 50}ms` }}
      className={`group relative overflow-hidden cursor-pointer transition-all duration-500 transform hover:scale-[1.02] hover:-translate-y-1 animate-fade-in-up ${
        !email.is_read 
          ? 'hover:shadow-2xl' 
          : 'hover:shadow-xl'
      }`}
    >
      {/* Premium Card Background */}
      <div className={`relative p-6 rounded-3xl backdrop-blur-sm transition-all duration-500 ${
        !email.is_read 
          ? 'bg-gradient-to-br from-blue-50/80 via-indigo-50/60 to-purple-50/40 border border-blue-200/50 shadow-lg'
          : 'bg-white/60 border border-gray-200/50 shadow-md hover:bg-white/80'
      }`}>
        
        {/* Animated Background Effects */}
        <div className="absolute inset-0 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500">
          <div className={`absolute inset-0 rounded-3xl ${
            !email.is_read 
              ? 'bg-gradient-to-br from-blue-100/30 via-indigo-100/20 to-purple-100/30'
              : 'bg-gradient-to-br from-gray-100/20 via-white/10 to-blue-50/20'
          }`}></div>
        </div>
        
        {/* Unread Indicator Line */}
        {!email.is_read && (
          <div className="absolute left-0 top-6 bottom-6 w-1 bg-gradient-to-b from-blue-500 via-indigo-500 to-purple-500 rounded-full shadow-lg animate-pulse"></div>
        )}
        
        {/* Content */}
        <div className="relative flex items-start justify-between space-x-6">
          <div className="flex-1 space-y-3">
            {/* Header Row */}
            <div className="flex items-center space-x-3">
              {/* Status Indicator */}
              <div className={`relative w-3 h-3 rounded-full shadow-lg ${
                !email.is_read 
                  ? 'bg-gradient-to-r from-blue-400 to-indigo-500 animate-pulse' 
                  : 'bg-gray-300'
              }`}>
                {!email.is_read && (
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-400 to-indigo-500 rounded-full animate-ping"></div>
                )}
              </div>
              
              {/* Subject */}
              <h4 className={`text-lg leading-tight transition-colors duration-300 ${
                !email.is_read 
                  ? 'font-bold bg-gradient-to-r from-gray-900 via-indigo-800 to-purple-800 bg-clip-text text-transparent' 
                  : 'font-semibold text-gray-700 group-hover:text-gray-900'
              }`}>
                {email.subject || 'No Subject'}
              </h4>
            </div>
            
            {/* Sender and Time */}
            <div className="flex items-center space-x-4">
              <div className={`text-sm font-medium transition-colors duration-300 ${
                !email.is_read ? 'text-indigo-700' : 'text-gray-600 group-hover:text-gray-800'
              }`}>
                {getSenderName(email.sender)}
              </div>
              <div className="flex items-center space-x-2 text-sm text-gray-500">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>{formatTime(email.received_at)}</span>
              </div>
            </div>
            
            {/* Tags */}
            <div className="flex items-center flex-wrap gap-2">
              {email.has_attachments && (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-gradient-to-r from-emerald-100 to-teal-100 text-emerald-700 shadow-sm border border-emerald-200/50">
                  <svg className="w-3 h-3 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                  </svg>
                  Attachment
                </span>
              )}
              {email.is_starred && (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-gradient-to-r from-amber-100 to-yellow-100 text-amber-700 shadow-sm border border-amber-200/50">
                  <svg className="w-3 h-3 mr-1.5" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                  Starred
                </span>
              )}
            </div>
          </div>
          
          {/* Right Side Actions */}
          <div className="flex flex-col items-end space-y-3">
            {/* Status Badge */}
            {!email.is_read ? (
              <span className="inline-flex items-center px-4 py-2 rounded-full text-xs font-bold bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-lg transform hover:scale-105 transition-transform duration-200">
                <div className="w-2 h-2 bg-white rounded-full mr-2 animate-pulse"></div>
                UNREAD
              </span>
            ) : (
              <span className="inline-flex items-center px-4 py-2 rounded-full text-xs font-medium bg-gray-100/80 text-gray-600 backdrop-blur-sm">
                <div className="w-2 h-2 bg-gray-400 rounded-full mr-2"></div>
                READ
              </span>
            )}
            
            {/* Open Button */}
            <button 
              onClick={(e) => {
                e.stopPropagation()
                onClick()
              }}
              className="group/btn relative inline-flex items-center px-5 py-2.5 bg-white/80 backdrop-blur-sm text-gray-700 font-semibold rounded-xl shadow-lg hover:shadow-xl border border-white/50 transition-all duration-300 transform hover:scale-105 hover:-translate-y-0.5 hover:bg-white/90"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-indigo-100/50 to-purple-100/50 rounded-xl opacity-0 group-hover/btn:opacity-100 transition-opacity duration-300"></div>
              <div className="relative flex items-center">
                <svg className="w-4 h-4 mr-2 transition-transform duration-200 group-hover/btn:scale-110" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
                <span>Open</span>
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default EmailList
