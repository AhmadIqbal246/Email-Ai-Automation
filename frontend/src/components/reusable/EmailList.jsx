import { useState } from 'react'

const EmailList = ({ 
  emails, 
  loading, 
  onEmailClick, 
  onMarkAllAsRead,
  onRefresh 
}) => {
  const [markingAllAsRead, setMarkingAllAsRead] = useState(false)

  const handleMarkAllAsRead = async () => {
    try {
      setMarkingAllAsRead(true)
      await onMarkAllAsRead()
    } finally {
      setMarkingAllAsRead(false)
    }
  }

  const unreadCount = emails.filter(email => !email.is_read).length

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
      <div className="p-6 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center mr-3">
              <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Fetched Emails</h3>
              {unreadCount > 0 && (
                <p className="text-sm text-blue-600 font-medium">
                  {unreadCount} unread email{unreadCount !== 1 ? 's' : ''}
                </p>
              )}
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            {/* Mark All as Read Button */}
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllAsRead}
                disabled={markingAllAsRead || loading}
                className="inline-flex items-center px-3 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors duration-200"
              >
                {markingAllAsRead ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Marking...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Mark All as Read
                  </>
                )}
              </button>
            )}
            
            {/* Refresh Button */}
            <button
              onClick={onRefresh}
              disabled={loading}
              className="inline-flex items-center px-3 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors duration-200"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              {loading ? 'Fetching...' : 'Refresh'}
            </button>
          </div>
        </div>
      </div>
      
      <div className="p-6">
        {emails.length === 0 ? (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <h4 className="text-lg font-medium text-gray-900 mb-2">No emails fetched yet</h4>
            <p className="text-gray-500">Connect your Gmail account and fetch emails to see them here</p>
          </div>
        ) : (
          <div className="space-y-4">
            {emails.map((email) => (
              <EmailListItem
                key={email.id}
                email={email}
                onClick={() => onEmailClick(email)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// Separate component for individual email items to keep code organized
const EmailListItem = ({ email, onClick }) => {
  return (
    <div 
      onClick={onClick}
      className={`border rounded-xl p-4 transition-all duration-200 cursor-pointer ${
        !email.is_read 
          ? 'border-blue-300 bg-blue-50/50 hover:bg-blue-100/50 shadow-md hover:shadow-lg' 
          : 'border-gray-200 bg-white hover:bg-gray-50 hover:shadow-md'
      }`}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center space-x-2 mb-1">
            {/* Read/Unread indicator */}
            <div className={`w-2 h-2 rounded-full ${
              !email.is_read ? 'bg-blue-500' : 'bg-gray-300'
            }`}></div>
            <h4 className={`text-sm mb-1 ${
              !email.is_read 
                ? 'font-bold text-gray-900' 
                : 'font-medium text-gray-700'
            }`}>
              {email.subject || 'No Subject'}
            </h4>
          </div>
          <p className={`text-xs mb-2 ${
            !email.is_read ? 'text-gray-700 font-medium' : 'text-gray-600'
          }`}>
            From: {email.sender}
          </p>
          <p className="text-xs text-gray-500 mb-2">
            Received: {new Date(email.received_at).toLocaleString()}
          </p>
          <div className="flex items-center space-x-2">
            {email.has_attachments && (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                📎 Has attachments
              </span>
            )}
            {email.is_starred && (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                ⭐ Starred
              </span>
            )}
          </div>
        </div>
        <div className="flex flex-col items-end space-y-2">
          {!email.is_read && (
            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-blue-500 text-white shadow-sm">
              UNREAD
            </span>
          )}
          {email.is_read && (
            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
              READ
            </span>
          )}
          <button 
            onClick={(e) => {
              e.stopPropagation()
              onClick()
            }}
            className="inline-flex items-center px-3 py-1.5 bg-green-100 text-green-700 rounded-lg text-xs font-medium hover:bg-green-200 transition-colors duration-200"
          >
            <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
            Open
          </button>
        </div>
      </div>
    </div>
  )
}

export default EmailList
