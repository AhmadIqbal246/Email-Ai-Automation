import { useState } from 'react'

const EmailReplyModal = ({ 
  isOpen, 
  onClose, 
  originalEmail, 
  onSendReply,
  loading = false 
}) => {
  const [replyText, setReplyText] = useState('')
  const [replyType, setReplyType] = useState('reply') // 'reply' or 'reply_all'
  const [sending, setSending] = useState(false)

  if (!isOpen || !originalEmail) return null

  const handleSendReply = async (e) => {
    e.preventDefault()
    
    if (!replyText.trim()) {
      alert('Please enter a reply message')
      return
    }

    try {
      setSending(true)
      await onSendReply({
        reply_text: replyText,
        reply_type: replyType
      })
      
      // Reset form and close modal on success
      setReplyText('')
      setReplyType('reply')
      onClose()
    } catch (error) {
      console.error('Failed to send reply:', error)
      alert('Failed to send reply. Please try again.')
    } finally {
      setSending(false)
    }
  }

  const handleClose = () => {
    if (!sending) {
      setReplyText('')
      setReplyType('reply')
      onClose()
    }
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    })
  }

  const getSenderName = (sender) => {
    const match = sender.match(/^(.+?)\s*<.*>$/)
    return match ? match[1].trim().replace(/^"|"$/g, '') : sender.split('@')[0]
  }

  const getReplyRecipients = () => {
    if (replyType === 'reply') {
      return [originalEmail.sender]
    } else {
      const recipients = new Set([originalEmail.sender])
      
      // Add original recipients
      if (originalEmail.recipients) {
        const recipientList = Array.isArray(originalEmail.recipients) 
          ? originalEmail.recipients 
          : [originalEmail.recipients]
        recipientList.forEach(email => recipients.add(email))
      }
      
      // Add CC recipients
      if (originalEmail.cc) {
        const ccList = Array.isArray(originalEmail.cc) 
          ? originalEmail.cc 
          : [originalEmail.cc]
        ccList.forEach(email => recipients.add(email))
      }
      
      return Array.from(recipients)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center p-4">
      <div className="relative bg-white rounded-3xl shadow-2xl border border-gray-200 w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* Animated Background Gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 opacity-60"></div>
        
        {/* Header */}
        <div className="relative p-6 border-b border-gray-200 bg-white/80 backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-500 rounded-2xl flex items-center justify-center shadow-lg">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                </svg>
              </div>
              <div>
                <h3 className="text-xl font-bold bg-gradient-to-r from-gray-900 via-indigo-800 to-purple-800 bg-clip-text text-transparent">
                  Reply to Email
                </h3>
                <p className="text-sm text-gray-600">
                  {replyType === 'reply' ? 'Reply to sender' : 'Reply to all recipients'}
                </p>
              </div>
            </div>
            <button
              onClick={handleClose}
              disabled={sending}
              className="text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-300 rounded-full p-2 transition-colors duration-200"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <form onSubmit={handleSendReply} className="relative flex-1 overflow-auto max-h-[calc(90vh-12rem)]">
          <div className="p-6 space-y-6">
            {/* Reply Type Selection */}
            <div className="space-y-3">
              <label className="text-sm font-semibold text-gray-700">Reply Type</label>
              <div className="flex space-x-4">
                <label className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="radio"
                    value="reply"
                    checked={replyType === 'reply'}
                    onChange={(e) => setReplyType(e.target.value)}
                    className="w-4 h-4 text-indigo-600 border-gray-300 focus:ring-indigo-500"
                  />
                  <span className="text-sm font-medium text-gray-700">Reply to sender only</span>
                </label>
                <label className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="radio"
                    value="reply_all"
                    checked={replyType === 'reply_all'}
                    onChange={(e) => setReplyType(e.target.value)}
                    className="w-4 h-4 text-indigo-600 border-gray-300 focus:ring-indigo-500"
                  />
                  <span className="text-sm font-medium text-gray-700">Reply to all</span>
                </label>
              </div>
            </div>

            {/* Recipients Preview */}
            <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-4 border border-white/50 shadow-lg">
              <div className="space-y-2">
                <div className="flex items-start">
                  <span className="text-sm font-medium text-gray-700 w-16">To:</span>
                  <div className="flex-1">
                    {getReplyRecipients().map((email, index) => (
                      <span key={index} className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 mr-2 mb-1">
                        {getSenderName(email)}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="flex items-start">
                  <span className="text-sm font-medium text-gray-700 w-16">Subject:</span>
                  <span className="text-sm text-gray-900">
                    {originalEmail.subject?.startsWith('Re:') ? originalEmail.subject : `Re: ${originalEmail.subject}`}
                  </span>
                </div>
              </div>
            </div>

            {/* Reply Text Area */}
            <div className="space-y-3">
              <label className="text-sm font-semibold text-gray-700">Your Reply</label>
              <textarea
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder="Type your reply here..."
                rows={8}
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-2xl shadow-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-300 resize-none bg-white/80 backdrop-blur-sm"
              />
            </div>

            {/* Original Email Context */}
            <div className="bg-gray-50/80 backdrop-blur-sm rounded-2xl p-4 border border-gray-200/50 shadow-lg">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-semibold text-gray-700">Original Message</h4>
                <span className="text-xs text-gray-500">{formatDate(originalEmail.received_at)}</span>
              </div>
              
              <div className="space-y-2 text-sm">
                <div className="flex items-start">
                  <span className="font-medium text-gray-600 w-16">From:</span>
                  <span className="text-gray-800">{getSenderName(originalEmail.sender)}</span>
                </div>
                <div className="flex items-start">
                  <span className="font-medium text-gray-600 w-16">Subject:</span>
                  <span className="text-gray-800">{originalEmail.subject}</span>
                </div>
              </div>
              
              {/* Original Email Preview */}
              <div className="mt-4 p-3 bg-white/60 rounded-xl border border-gray-200/50 max-h-40 overflow-y-auto">
                <div 
                  className="text-sm text-gray-700 line-clamp-6"
                  dangerouslySetInnerHTML={{ 
                    __html: originalEmail.body_html?.slice(0, 300) + '...' || 
                            originalEmail.body_plain?.slice(0, 300) + '...' || 
                            'No content preview available'
                  }}
                />
              </div>
            </div>
          </div>
        </form>

        {/* Footer */}
        <div className="relative p-6 border-t border-gray-200 bg-white/80 backdrop-blur-sm">
          <div className="flex justify-end items-center space-x-4">
            <button
              type="button"
              onClick={handleClose}
              disabled={sending}
              className="px-6 py-3 bg-gray-200 text-gray-700 font-semibold rounded-2xl hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500 transition-all duration-300 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSendReply}
              disabled={sending || !replyText.trim()}
              className="group relative inline-flex items-center px-8 py-3 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white font-semibold rounded-2xl shadow-xl hover:shadow-2xl disabled:opacity-50 transition-all duration-300 transform hover:scale-105 hover:-translate-y-0.5 disabled:hover:scale-100 disabled:hover:translate-y-0"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-blue-400 to-purple-400 rounded-2xl blur-lg opacity-30 group-hover:opacity-50 transition-opacity duration-300"></div>
              <div className="relative flex items-center">
                {sending ? (
                  <>
                    <div className="w-5 h-5 mr-3">
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    </div>
                    <span>Sending...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                    </svg>
                    <span>Send Reply</span>
                  </>
                )}
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default EmailReplyModal
