import React from 'react'

interface ErrorMessageProps {
  title?: string
  message: string
  details?: string[]
  onRetry?: () => void
  onDismiss?: () => void
  variant?: 'error' | 'warning' | 'info'
  className?: string
}

/**
 * Reusable error message component for displaying user-friendly error messages
 */
export function ErrorMessage({
  title = 'Erro',
  message,
  details,
  onRetry,
  onDismiss,
  variant = 'error',
  className = ''
}: ErrorMessageProps) {
  const variantStyles = {
    error: {
      container: 'bg-red-50 border-red-200 text-red-800',
      icon: 'text-red-600',
      button: 'bg-red-600 hover:bg-red-700 text-white'
    },
    warning: {
      container: 'bg-yellow-50 border-yellow-200 text-yellow-800',
      icon: 'text-yellow-600',
      button: 'bg-yellow-600 hover:bg-yellow-700 text-white'
    },
    info: {
      container: 'bg-blue-50 border-blue-200 text-blue-800',
      icon: 'text-blue-600',
      button: 'bg-blue-600 hover:bg-blue-700 text-white'
    }
  }

  const styles = variantStyles[variant]

  const getIcon = () => {
    switch (variant) {
      case 'error':
        return (
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
          />
        )
      case 'warning':
        return (
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
          />
        )
      case 'info':
        return (
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        )
    }
  }

  return (
    <div className={`border rounded-lg p-4 ${styles.container} ${className}`}>
      <div className="flex items-start">
        <div className={`flex-shrink-0 ${styles.icon}`}>
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            {getIcon()}
          </svg>
        </div>
        
        <div className="ml-3 flex-1">
          <h3 className="text-sm font-medium">{title}</h3>
          <p className="mt-1 text-sm">{message}</p>
          
          {details && details.length > 0 && (
            <div className="mt-2">
              <ul className="text-sm list-disc list-inside space-y-1">
                {details.map((detail, index) => (
                  <li key={index}>{detail}</li>
                ))}
              </ul>
            </div>
          )}
          
          {(onRetry || onDismiss) && (
            <div className="mt-4 flex space-x-2">
              {onRetry && (
                <button
                  onClick={onRetry}
                  className={`px-3 py-1 text-sm rounded-md transition-colors ${styles.button}`}
                >
                  Tentar Novamente
                </button>
              )}
              {onDismiss && (
                <button
                  onClick={onDismiss}
                  className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                >
                  Dispensar
                </button>
              )}
            </div>
          )}
        </div>
        
        {onDismiss && (
          <div className="ml-auto pl-3">
            <button
              onClick={onDismiss}
              className={`inline-flex rounded-md p-1.5 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 ${styles.icon}`}
            >
              <span className="sr-only">Fechar</span>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

/**
 * Specialized error message for form validation errors
 */
export function ValidationErrorMessage({
  errors,
  onDismiss
}: {
  errors: string[]
  onDismiss?: () => void
}) {
  if (errors.length === 0) return null

  return (
    <ErrorMessage
      title="Erro de Validação"
      message="Por favor, corrija os seguintes erros:"
      details={errors}
      variant="error"
      onDismiss={onDismiss}
    />
  )
}

/**
 * Specialized error message for API errors
 */
export function ApiErrorMessage({
  error,
  onRetry,
  onDismiss
}: {
  error: Error | string
  onRetry?: () => void
  onDismiss?: () => void
}) {
  const message = typeof error === 'string' ? error : error.message
  
  return (
    <ErrorMessage
      title="Erro de Conexão"
      message={message || 'Ocorreu um erro ao processar sua solicitação.'}
      variant="error"
      onRetry={onRetry}
      onDismiss={onDismiss}
    />
  )
}