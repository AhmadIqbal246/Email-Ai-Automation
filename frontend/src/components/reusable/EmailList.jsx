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
              <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden mb-8">
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

// Compact EmailListItem component matching the design from the image
const EmailListItem = ({ email, onClick, index }) => {
  const formatTime = (dateString) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now - date
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    const diffMins = Math.floor(diffMs / (1000 * 60))
    
    if (diffDays > 0) {
      const month = date.toLocaleDateString('en-US', { month: 'short' })
      const day = date.getDate()
      return `${month} ${day}`
    }
    if (diffHours > 0) return `${diffHours}h ago`
    if (diffMins > 0) return `${diffMins}m ago`
    return 'Just now'
  }

  const getSenderName = (sender) => {
    const match = sender.match(/^(.+?)\s*<.*>$/)
    return match ? match[1].trim().replace(/^\"|\"$/g, '') : sender.split('@')[0]
  }

  return (
    <div 
      onClick={onClick}
      className="group flex items-center py-3 px-4 cursor-pointer hover:bg-gray-50 transition-colors duration-200 border-b border-gray-100 last:border-b-0"
    >
      {/* Sender Name */}
      <div className="w-44 flex-shrink-0">
        <div className={`text-sm truncate ${
          !email.is_read 
            ? 'font-bold text-gray-900' 
            : 'font-normal text-gray-700'
        }`}>
          {getSenderName(email.sender)}
        </div>
      </div>
      
      {/* Subject */}
      <div className="flex-1 mx-4">
        <div className={`text-sm truncate ${
          !email.is_read 
            ? 'font-bold text-gray-900' 
            : 'font-normal text-gray-600'
        }`}>
          {email.subject || 'No Subject'}
        </div>
      </div>
      
      {/* Timestamp */}
      <div className="w-20 flex-shrink-0 text-right">
        <div className={`text-xs ${
          !email.is_read 
            ? 'font-semibold text-gray-800' 
            : 'font-normal text-gray-500'
        }`}>
          {formatTime(email.received_at)}
        </div>
      </div>
    </div>
  )
}

export default EmailList
