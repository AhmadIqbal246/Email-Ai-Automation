const InputField = ({
  label,
  type = 'text',
  name,
  value,
  onChange,
  placeholder = '',
  required = false,
  disabled = false,
  error = '',
  helpText = '',
  className = '',
  isTextarea = false,
  rows = 3,
  ...props
}) => {
  const baseInputClasses = `
    w-full px-4 py-3 border border-gray-300 rounded-lg 
    focus:ring-2 focus:ring-primary-500 focus:border-primary-500 
    transition-all duration-200 ease-in-out
    placeholder:text-gray-400
    disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed
    ${error ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : ''}
  `
  
  return (
    <div className={`space-y-2 ${className}`}>
      {label && (
        <label htmlFor={name} className="block text-sm font-medium text-gray-700">
          {label}
        </label>
      )}
      
      {isTextarea || type === 'textarea' ? (
        <textarea
          id={name}
          name={name}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          required={required}
          disabled={disabled}
          rows={rows}
          className={`${baseInputClasses} resize-vertical min-h-[80px]`}
          {...props}
        />
      ) : (
        <input
          type={type}
          id={name}
          name={name}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          required={required}
          disabled={disabled}
          className={baseInputClasses}
          {...props}
        />
      )}
      
      {error && (
        <p className="text-sm text-red-600 mt-1 flex items-center">
          <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          {error}
        </p>
      )}
      
      {helpText && !error && (
        <p className="text-sm text-gray-500 mt-1">{helpText}</p>
      )}
    </div>
  )
}

export default InputField
