import { useState } from 'react'

const EmailModal = ({ 
  isOpen, 
  onClose, 
  email, 
  content, 
  loading 
}) => {
  const [showFullHeaders, setShowFullHeaders] = useState(false)

  if (!isOpen) return null

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    })
  }

  const toggleHeaders = () => {
    setShowFullHeaders(!showFullHeaders)
  }

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-4 mx-auto p-0 border w-full max-w-4xl min-h-[calc(100vh-2rem)] shadow-lg rounded-lg bg-white">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gray-50 rounded-t-lg">
          <div className="flex items-center">
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center mr-3">
              <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Email Details</h3>
              <p className="text-sm text-gray-500">
                {email && formatDate(email.received_at)}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-300 rounded-full p-2"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto max-h-[calc(100vh-8rem)]">
          {email && (
            <>
              {/* Email Headers */}
              <div className="p-6 border-b border-gray-200">
                <div className="space-y-3">
                  <div>
                    <h1 className="text-xl font-bold text-gray-900 mb-2">
                      {email.subject || 'No Subject'}
                    </h1>
                    <div className="flex items-center space-x-4">
                      {!email.is_read && (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-blue-500 text-white">
                          UNREAD
                        </span>
                      )}
                      {email.is_starred && (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                          ⭐ Starred
                        </span>
                      )}
                      {email.has_attachments && (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          📎 Attachments
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-start">
                      <span className="text-sm font-medium text-gray-700 w-16">From:</span>
                      <span className="text-sm text-gray-900">{email.sender}</span>
                    </div>
                    
                    {email.recipients && email.recipients.length > 0 && (
                      <div className="flex items-start">
                        <span className="text-sm font-medium text-gray-700 w-16">To:</span>
                        <span className="text-sm text-gray-900">
                          {Array.isArray(email.recipients) ? email.recipients.join(', ') : email.recipients}
                        </span>
                      </div>
                    )}
                    
                    <div className="flex items-start">
                      <span className="text-sm font-medium text-gray-700 w-16">Date:</span>
                      <span className="text-sm text-gray-900">{formatDate(email.received_at)}</span>
                    </div>

                    {/* Optional: Show more headers */}
                    {email.message_id && showFullHeaders && (
                      <>
                        <div className="flex items-start">
                          <span className="text-sm font-medium text-gray-700 w-16">ID:</span>
                          <span className="text-sm text-gray-900 font-mono">{email.message_id}</span>
                        </div>
                        {email.thread_id && (
                          <div className="flex items-start">
                            <span className="text-sm font-medium text-gray-700 w-16">Thread:</span>
                            <span className="text-sm text-gray-900 font-mono">{email.thread_id}</span>
                          </div>
                        )}
                      </>
                    )}
                    
                    {email.message_id && (
                      <button
                        onClick={toggleHeaders}
                        className="text-xs text-blue-600 hover:text-blue-800 underline"
                      >
                        {showFullHeaders ? 'Hide' : 'Show'} technical details
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Email Content */}
              <div className="p-6">
                <h4 className="text-sm font-semibold text-gray-900 mb-3">Message Content</h4>
                {loading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    <span className="ml-3 text-gray-600">Loading email content...</span>
                  </div>
                ) : (
                  <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                    {content ? (
                      <div 
                        className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed"
                        dangerouslySetInnerHTML={{ __html: content }}
                      />
                    ) : (
                      <div className="text-center py-8 text-gray-500">
                        <p>No content available for this email.</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end items-center p-6 border-t border-gray-200 bg-gray-50 rounded-b-lg">
          <div className="flex space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500 transition-colors duration-200"
            >
              Close
            </button>
            {email && (
              <button
                onClick={() => {
                  // Optional: Add reply functionality in the future
                  console.log('Reply to email:', email.id)
                }}
                className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors duration-200"
                disabled
              >
                Reply (Coming Soon)
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default EmailModal
