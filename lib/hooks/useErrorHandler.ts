'use client'

import { useState, useCallback } from 'react'
import { handleClientError } from '@/lib/error-handling'

interface ErrorState {
  message: string
  details?: string[]
  isVisible: boolean
}

/**
 * Custom hook for handling errors in React components
 * Provides consistent error state management and user-friendly error messages
 */
export function useErrorHandler() {
  const [error, setError] = useState<ErrorState | null>(null)

  const handleError = useCallback((error: unknown) => {
    const errorInfo = handleClientError(error)
    setError({
      message: errorInfo.message,
      details: errorInfo.details,
      isVisible: true
    })
  }, [])

  const clearError = useCallback(() => {
    setError(null)
  }, [])

  const hideError = useCallback(() => {
    setError(prev => prev ? { ...prev, isVisible: false } : null)
  }, [])

  return {
    error,
    hasError: error !== null,
    isErrorVisible: error?.isVisible ?? false,
    handleError,
    clearError,
    hideError
  }
}

/**
 * Hook for handling async operations with error handling
 */
export function useAsyncOperation<T extends any[], R>(
  operation: (...args: T) => Promise<R>
) {
  const [isLoading, setIsLoading] = useState(false)
  const { error, handleError, clearError } = useErrorHandler()

  const execute = useCallback(async (...args: T): Promise<R | null> => {
    try {
      setIsLoading(true)
      clearError()
      const result = await operation(...args)
      return result
    } catch (error) {
      handleError(error)
      return null
    } finally {
      setIsLoading(false)
    }
  }, [operation, handleError, clearError])

  return {
    execute,
    isLoading,
    error,
    hasError: error !== null,
    clearError
  }
}

/**
 * Hook for handling form submissions with error handling
 */
export function useFormSubmission<T>(
  onSubmit: (data: T) => Promise<void>
) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { error, handleError, clearError } = useErrorHandler()

  const handleSubmit = useCallback(async (data: T) => {
    try {
      setIsSubmitting(true)
      clearError()
      await onSubmit(data)
    } catch (error) {
      handleError(error)
      throw error // Re-throw so form can handle it if needed
    } finally {
      setIsSubmitting(false)
    }
  }, [onSubmit, handleError, clearError])

  return {
    handleSubmit,
    isSubmitting,
    error,
    hasError: error !== null,
    clearError
  }
}