'use client'

import { useEffect } from 'react'
import { ErrorMessage } from '@/components/ui/ErrorMessage'

interface ErrorPageProps {
  error: Error & { digest?: string }
  reset: () => void
}

/**
 * Global error page for the application
 * Catches and displays unhandled errors in the app
 */
export default function Error({ error, reset }: ErrorPageProps) {
  useEffect(() => {
    // Log the error to console and external service
    console.error('Application error:', error)
    
    // In production, send to error monitoring service
    if (process.env.NODE_ENV === 'production') {
      // Example: Send to error monitoring service
      // errorReportingService.captureException(error)
    }
  }, [error])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full">
        <ErrorMessage
          title="Erro na Aplicação"
          message="Ocorreu um erro inesperado na aplicação. Por favor, tente recarregar a página."
          onRetry={reset}
          onDismiss={() => window.location.href = '/'}
        />
        
        {process.env.NODE_ENV === 'development' && (
          <div className="mt-4 p-4 bg-gray-100 rounded-lg">
            <h4 className="font-medium text-gray-800 mb-2">Detalhes do Erro (Desenvolvimento):</h4>
            <pre className="text-xs text-gray-600 overflow-auto">
              {error.message}
              {error.stack && (
                <>
                  {'\n\n'}
                  {error.stack}
                </>
              )}
            </pre>
          </div>
        )}
      </div>
    </div>
  )
}