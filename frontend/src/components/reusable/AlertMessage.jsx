import { useState, useEffect } from 'react'

const AlertMessage = ({ 
  type = 'info', 
  message, 
  isVisible = false, 
  onClose,
  autoClose = true,
  autoCloseDelay = 3000,
  className = ''
}) => {
  const [isShowing, setIsShowing] = useState(false)
  const [isAnimatingOut, setIsAnimatingOut] = useState(false)

  useEffect(() => {
    if (isVisible && message) {
      setIsShowing(true)
      setIsAnimatingOut(false)
      
      // Auto-close functionality
      if (autoClose) {
        const timer = setTimeout(() => {
          handleClose()
        }, autoCloseDelay)
        
        return () => clearTimeout(timer)
      }
    }
  }, [isVisible, message, autoClose, autoCloseDelay])

  const handleClose = () => {
    setIsAnimatingOut(true)
    setTimeout(() => {
      setIsShowing(false)
      setIsAnimatingOut(false)
      if (onClose) {
        onClose()
      }
    }, 300) // Match animation duration
  }

  const getAlertConfig = () => {
    switch (type) {
      case 'success':
        return {
          bgGradient: 'from-emerald-50/50 to-green-50/50',
          borderColor: 'border-green-200/50',
          iconBg: 'from-emerald-500 to-green-600',
          iconBlur: 'from-emerald-400 to-green-500',
          titleGradient: 'from-emerald-700 to-green-800',
          textColor: 'text-green-700',
          closeHover: 'from-emerald-100/50 to-green-100/50',
          closeIcon: 'text-green-600',
          pulseColor: 'bg-emerald-500',
          icon: (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          )
        }
      case 'error':
        return {
          bgGradient: 'from-red-50/50 to-rose-50/50',
          borderColor: 'border-red-200/50',
          iconBg: 'from-red-500 to-rose-600',
          iconBlur: 'from-red-400 to-rose-500',
          titleGradient: 'from-red-700 to-rose-800',
          textColor: 'text-red-700',
          closeHover: 'from-red-100/50 to-rose-100/50',
          closeIcon: 'text-red-600',
          pulseColor: 'bg-red-500',
          icon: (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          )
        }
      case 'warning':
        return {
          bgGradient: 'from-amber-50/50 to-yellow-50/50',
          borderColor: 'border-amber-200/50',
          iconBg: 'from-amber-500 to-yellow-600',
          iconBlur: 'from-amber-400 to-yellow-500',
          titleGradient: 'from-amber-700 to-yellow-800',
          textColor: 'text-amber-700',
          closeHover: 'from-amber-100/50 to-yellow-100/50',
          closeIcon: 'text-amber-600',
          pulseColor: 'bg-amber-500',
          icon: (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          )
        }
      case 'info':
      default:
        return {
          bgGradient: 'from-blue-50/50 to-indigo-50/50',
          borderColor: 'border-blue-200/50',
          iconBg: 'from-blue-500 to-indigo-600',
          iconBlur: 'from-blue-400 to-indigo-500',
          titleGradient: 'from-blue-700 to-indigo-800',
          textColor: 'text-blue-700',
          closeHover: 'from-blue-100/50 to-indigo-100/50',
          closeIcon: 'text-blue-600',
          pulseColor: 'bg-blue-500',
          icon: (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          )
        }
    }
  }

  const config = getAlertConfig()

  if (!isShowing || !message) {
    return null
  }

  return (
    <div 
      className={`fixed top-6 right-6 z-50 max-w-md w-full transition-all duration-500 transform ${
        isAnimatingOut 
          ? 'translate-x-full opacity-0 scale-95' 
          : 'translate-x-0 opacity-100 scale-100'
      } ${className}`}
      style={{
        animation: isAnimatingOut 
          ? 'slideOutRight 0.3s ease-in-out forwards' 
          : 'slideInRight 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards'
      }}
    >
      {/* Luxury Alert Container */}
      <div className="relative overflow-hidden">
        {/* Glassmorphism Background */}
        <div className={`relative p-6 bg-white/90 backdrop-blur-xl rounded-3xl shadow-2xl border ${config.borderColor} hover:shadow-3xl transition-all duration-500`}>
          {/* Animated Background Gradient */}
          <div className={`absolute inset-0 bg-gradient-to-r ${config.bgGradient} rounded-3xl`}></div>
          
          {/* Shimmer Effect */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -skew-x-12 animate-shimmer"></div>
          
          {/* Content */}
          <div className="relative flex items-start space-x-4">
            {/* Premium Icon */}
            <div className="relative flex-shrink-0">
              <div className={`absolute inset-0 bg-gradient-to-r ${config.iconBlur} rounded-2xl blur-lg opacity-40 animate-pulse`}></div>
              <div className={`relative w-12 h-12 bg-gradient-to-br ${config.iconBg} rounded-2xl flex items-center justify-center shadow-xl transform transition-all duration-300`}>
                <svg className="w-6 h-6 text-white drop-shadow-lg" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  {config.icon}
                </svg>
              </div>
            </div>
            
            {/* Message Content */}
            <div className="flex-1 min-w-0 pt-1">
              <div className="flex items-center space-x-2 mb-2">
                <span className={`text-lg font-bold bg-gradient-to-r ${config.titleGradient} bg-clip-text text-transparent capitalize`}>
                  {type}
                </span>
                <div className={`w-2 h-2 ${config.pulseColor} rounded-full animate-pulse`}></div>
              </div>
              <p className={`${config.textColor} font-medium leading-relaxed text-sm`}>
                {message}
              </p>
            </div>
            
            {/* Close Button */}
            <button 
              onClick={handleClose}
              className="group relative p-2.5 bg-white/60 backdrop-blur-sm hover:bg-white/80 rounded-xl transition-all duration-300 transform hover:scale-110 hover:-translate-y-0.5 shadow-lg hover:shadow-xl border border-white/50 flex-shrink-0"
            >
              <div className={`absolute inset-0 bg-gradient-to-r ${config.closeHover} rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300`}></div>
              <svg className={`relative w-4 h-4 ${config.closeIcon}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          {/* Progress Bar for Auto-close */}
          {autoClose && (
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/20 rounded-b-3xl overflow-hidden">
              <div 
                className={`h-full bg-gradient-to-r ${config.iconBg} rounded-b-3xl transition-all ease-linear`}
                style={{
                  animation: `shrinkWidth ${autoCloseDelay}ms linear forwards`
                }}
              ></div>
            </div>
          )}
        </div>
      </div>
      
      {/* Custom Styles */}
      <style jsx>{`
        @keyframes slideInRight {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        
        @keyframes slideOutRight {
          from {
            transform: translateX(0);
            opacity: 1;
          }
          to {
            transform: translateX(100%);
            opacity: 0;
          }
        }
        
        @keyframes shimmer {
          0% {
            transform: translateX(-100%) skewX(-12deg);
          }
          100% {
            transform: translateX(200%) skewX(-12deg);
          }
        }
        
        @keyframes shrinkWidth {
          from {
            width: 100%;
          }
          to {
            width: 0%;
          }
        }
        
        .animate-shimmer {
          animation: shimmer 2s infinite;
        }
      `}</style>
    </div>
  )
}

export default AlertMessage
