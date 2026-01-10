/**
 * Error handling utilities for the Ebers application
 * Provides consistent error handling, logging, and user-friendly error messages
 */

export interface AppError extends Error {
  code?: string
  statusCode?: number
  details?: Record<string, any>
  userMessage?: string
}

/**
 * Custom error classes for different types of errors
 */
export class ValidationError extends Error implements AppError {
  code = 'VALIDATION_ERROR'
  statusCode = 400
  details: Record<string, any>
  userMessage: string

  constructor(message: string, details: Record<string, any> = {}) {
    super(message)
    this.name = 'ValidationError'
    this.details = details
    this.userMessage = 'Os dados fornecidos são inválidos. Por favor, verifique e tente novamente.'
  }
}

export class NotFoundError extends Error implements AppError {
  code = 'NOT_FOUND'
  statusCode = 404
  userMessage: string

  constructor(resource: string) {
    super(`${resource} não encontrado`)
    this.name = 'NotFoundError'
    this.userMessage = `${resource} não foi encontrado.`
  }
}

export class DatabaseError extends Error implements AppError {
  code = 'DATABASE_ERROR'
  statusCode = 500
  userMessage: string

  constructor(message: string, originalError?: Error) {
    super(message)
    this.name = 'DatabaseError'
    this.userMessage = 'Erro interno do sistema. Por favor, tente novamente.'
    
    if (originalError) {
      this.stack = originalError.stack
    }
  }
}

export class BusinessRuleError extends Error implements AppError {
  code = 'BUSINESS_RULE_ERROR'
  statusCode = 400
  userMessage: string

  constructor(message: string) {
    super(message)
    this.name = 'BusinessRuleError'
    this.userMessage = message
  }
}

/**
 * Error logger utility
 */
export class ErrorLogger {
  static log(error: Error | AppError, context?: Record<string, any>) {
    const timestamp = new Date().toISOString()
    const errorInfo = {
      timestamp,
      name: error.name,
      message: error.message,
      stack: error.stack,
      context,
      ...(this.isAppError(error) && {
        code: error.code,
        statusCode: error.statusCode,
        details: error.details,
        userMessage: error.userMessage
      })
    }

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('Error logged:', errorInfo)
    }

    // In production, you might want to send to external logging service
    if (process.env.NODE_ENV === 'production') {
      // Example: Send to logging service
      // loggingService.error(errorInfo)
    }

    return errorInfo
  }

  private static isAppError(error: Error): error is AppError {
    return 'code' in error && 'statusCode' in error
  }
}

/**
 * Error handler for API routes
 */
export function handleApiError(error: unknown): {
  message: string
  statusCode: number
  details?: any
} {
  // Log the error
  ErrorLogger.log(error instanceof Error ? error : new Error(String(error)))

  if (error instanceof ValidationError) {
    return {
      message: error.userMessage,
      statusCode: error.statusCode,
      details: error.details
    }
  }

  if (error instanceof NotFoundError) {
    return {
      message: error.userMessage,
      statusCode: error.statusCode
    }
  }

  if (error instanceof BusinessRuleError) {
    return {
      message: error.userMessage,
      statusCode: error.statusCode
    }
  }

  if (error instanceof DatabaseError) {
    return {
      message: error.userMessage,
      statusCode: error.statusCode
    }
  }

  // Handle Prisma errors
  if (error && typeof error === 'object' && 'code' in error) {
    const prismaError = error as any
    
    switch (prismaError.code) {
      case 'P2002':
        return {
          message: 'Já existe um registro com essas informações.',
          statusCode: 409
        }
      case 'P2003':
        return {
          message: 'Não é possível realizar esta operação devido a dependências.',
          statusCode: 400
        }
      case 'P2025':
        return {
          message: 'Registro não encontrado.',
          statusCode: 404
        }
      default:
        return {
          message: 'Erro interno do sistema. Por favor, tente novamente.',
          statusCode: 500
        }
    }
  }

  // Handle specific error messages from business logic
  if (error instanceof Error) {
    const message = error.message.toLowerCase()
    
    if (message.includes('página deve ser maior que 0')) {
      return {
        message: 'Página deve ser maior que 0',
        statusCode: 400
      }
    }
    
    if (message.includes('status deve ser')) {
      return {
        message: error.message,
        statusCode: 400
      }
    }
    
    if (message.includes('id do paciente é obrigatório')) {
      return {
        message: 'ID do paciente é obrigatório',
        statusCode: 400
      }
    }
    
    if (message.includes('não encontrado')) {
      return {
        message: error.message,
        statusCode: 404
      }
    }
    
    if (message.includes('não finalizada')) {
      return {
        message: error.message,
        statusCode: 400
      }
    }
    
    if (message.includes('deve ser definido')) {
      return {
        message: error.message,
        statusCode: 400
      }
    }
    
    // For validation errors that contain specific field information
    if (message.includes('dados inválidos')) {
      return {
        message: 'Dados inválidos',
        statusCode: 400
      }
    }

    // Return the original error message for other cases
    return {
      message: error.message,
      statusCode: 500
    }
  }

  // Handle non-Error objects
  if (error === null) {
    return {
      message: 'Erro interno do servidor',
      statusCode: 500
    }
  }

  if (error === undefined) {
    return {
      message: 'Erro interno do servidor',
      statusCode: 500
    }
  }

  // Generic error for unknown types
  return {
    message: 'Erro interno do servidor',
    statusCode: 500
  }
}

/**
 * Async error wrapper for API routes
 */
export function withErrorHandling<T extends any[], R>(
  handler: (...args: T) => Promise<R>
) {
  return async (...args: T): Promise<R> => {
    try {
      return await handler(...args)
    } catch (error) {
      const errorInfo = handleApiError(error)
      throw new Error(errorInfo.message)
    }
  }
}

/**
 * Client-side error handler
 */
export function handleClientError(error: unknown): {
  message: string
  details?: string[]
} {
  if (error instanceof Error) {
    return {
      message: error.message
    }
  }

  if (typeof error === 'string') {
    return {
      message: error
    }
  }

  if (error && typeof error === 'object' && 'message' in error) {
    const apiError = error as any
    return {
      message: apiError.message || 'Erro desconhecido',
      details: apiError.details
    }
  }

  return {
    message: 'Erro desconhecido'
  }
}

/**
 * Retry utility for failed operations
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  delay: number = 1000
): Promise<T> {
  let lastError: Error

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation()
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))
      
      if (attempt === maxRetries) {
        break
      }

      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, delay * attempt))
    }
  }

  throw lastError!
}

/**
 * Safe async operation wrapper
 */
export async function safeAsync<T>(
  operation: () => Promise<T>
): Promise<{ data?: T; error?: Error }> {
  try {
    const data = await operation()
    return { data }
  } catch (error) {
    return { error: error instanceof Error ? error : new Error(String(error)) }
  }
}