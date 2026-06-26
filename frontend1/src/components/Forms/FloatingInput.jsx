import React, { useState } from 'react';

const FloatingInput = ({ 
  label, 
  value, 
  onChange, 
  error, 
  type = 'text', 
  name, 
  required = false, 
  options = [], 
  ...props 
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const hasValue = value && value.toString().length > 0;
  const isActive = isFocused || hasValue;

  // Toggle password visibility
  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  // Determine input type for password field
  const getInputType = () => {
    if (type === 'password') {
      return showPassword ? 'text' : 'password';
    }
    return type;
  };

  return (
    <div className="relative mb-3">
      {/* --- SELECT --- */}
      {type === 'select' ? (
        <div className="relative">
          <select
            id={name}
            name={name}
            value={value}
            onChange={onChange}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            className={`block w-full px-2.5 pt-4 pb-1.5 pr-8 text-sm text-gray-900
              bg-white rounded border appearance-none cursor-pointer
              ${error ? 'border-red-500' : isFocused ? 'border-blue-500' : 'border-gray-300'}
              focus:outline-none focus:border-blue-500 transition-colors duration-200`}
          >
            <option value="" disabled hidden></option>
            {/* Add current value as option if not in options list */}
            {value && !options.some(opt => opt.value === value) && (
              <option key={value} value={value}>
                {value}
              </option>
            )}
            {options.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          
          {/* Custom dropdown arrow */}
          <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
            <svg 
              className={`w-3.5 h-3.5 text-gray-400 transition-transform duration-200 ${isFocused ? 'rotate-180' : ''}`} 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
          
          <label
            htmlFor={name}
            className={`absolute left-2.5 transition-all duration-200 pointer-events-none bg-white px-1
              ${isActive 
                ? 'top-0 text-xs text-blue-600 font-medium transform -translate-y-1/2' 
                : 'top-2.5 text-sm text-gray-500'
              }`}
          >
            {label} {required && <span className="text-red-500">*</span>}
          </label>
        </div>
      ) 

      /* --- TEXTAREA --- */
      : type === 'textarea' ? (
        <div className="relative">
          <textarea
            id={name}
            name={name}
            value={value}
            onChange={onChange}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            rows={2}
            className={`block w-full px-2.5 pt-4 pb-1.5 text-sm text-gray-900 
              bg-white rounded border resize-none
              ${error ? 'border-red-500' : isFocused ? 'border-blue-500' : 'border-gray-300'} 
              focus:outline-none focus:border-blue-500 transition-colors duration-200`}
            {...props}
          />
          <label
            htmlFor={name}
            className={`absolute left-2.5 transition-all duration-200 pointer-events-none bg-white px-1
              ${isActive 
                ? 'top-0 text-xs text-blue-600 font-medium transform -translate-y-1/2' 
                : 'top-3 text-sm text-gray-500'
              }`}
          >
            {label} {required && <span className="text-red-500">*</span>}
          </label>
        </div>
      ) 

      /* --- INPUT (DEFAULT) --- */
      : (
        <div className="relative">
          <input
            id={name}
            type={getInputType()}
            name={name}
            value={value}
            onChange={onChange}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            className={`block w-full px-2.5 text-sm text-gray-900 
              bg-white rounded border
              ${type === 'date' ? 'pt-4 pb-1.5 pr-8' : 
                type === 'password' ? 'pt-4 pb-1.5 pr-10' : 
                isActive ? 'pt-4 pb-1.5' : 'py-2.5'}
              ${error ? 'border-red-500' : isFocused ? 'border-blue-500' : 'border-gray-300'} 
              focus:outline-none focus:border-blue-500 transition-all duration-200
              ${type === 'date' ? '[&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:right-2 [&::-webkit-calendar-picker-indicator]:w-4 [&::-webkit-calendar-picker-indicator]:h-4 [&::-webkit-calendar-picker-indicator]:cursor-pointer' : ''}`}
            {...props}
          />
          <label
            htmlFor={name}
            className={`absolute left-2.5 transition-all duration-200 pointer-events-none bg-white px-1
              ${isActive || type === 'date' || type === 'password'
                ? 'top-0 text-xs text-blue-600 font-medium transform -translate-y-1/2' 
                : 'top-2.5 text-sm text-gray-500'
              }`}
          >
            {label} {required && <span className="text-red-500">*</span>}
          </label>
          
          {/* Calendar icon for date inputs */}
          {type === 'date' && (
            <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
          )}

          {/* Password toggle button */}
          {type === 'password' && (
            <button
              type="button"
              onClick={togglePasswordVisibility}
              className="absolute inset-y-0 right-0 flex items-center px-3 text-gray-400 hover:text-gray-600 focus:outline-none transition-colors duration-200"
            >
              {showPassword ? (
                // Eye open icon (visible)
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                    d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              ) : (
                // Eye closed icon (hidden)
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                    d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                </svg>
              )}
            </button>
          )}
        </div>
      )}

      {/* --- ERROR MESSAGE --- */}
      {error && (
        <div className="mt-1 flex items-start">
          <svg className="w-3.5 h-3.5 mt-0.5 mr-1 text-red-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path 
              fillRule="evenodd" 
              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 
                 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 
                 0 00-1-1z" 
              clipRule="evenodd" 
            />
          </svg>
          <p className="text-xs text-red-600">{error}</p>
        </div>
      )}
    </div>
  );
};

export default FloatingInput;