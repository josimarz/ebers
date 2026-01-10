import { NextRequest, NextResponse } from 'next/server'
import { createPatient, listPatients } from '@/lib/patients'
import { validatePatient, validatePatientIpad, formatValidationErrors } from '@/lib/validations'
import { handleApiError, ValidationError, ErrorLogger } from '@/lib/error-handling'
import { sanitizeSearchQuery } from '@/lib/sanitization'

/**
 * GET /api/patients - List patients with pagination, sorting, and filtering
 * Requirements: 3.2, 3.3, 3.4
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    
    // Parse query parameters
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const sortBy = (searchParams.get('sortBy') || 'name') as 'name' | 'age'
    const sortOrder = (searchParams.get('sortOrder') || 'asc') as 'asc' | 'desc'
    const rawSearch = searchParams.get('search')
    const search = rawSearch ? sanitizeSearchQuery(rawSearch) : undefined

    // Validate parameters
    if (page < 1) {
      throw new Error('Página deve ser maior que 0')
    }

    if (limit < 1 || limit > 100) {
      throw new Error('Limite deve estar entre 1 e 100')
    }

    if (!['name', 'age'].includes(sortBy)) {
      throw new Error('Campo de ordenação deve ser "name" ou "age"')
    }

    if (!['asc', 'desc'].includes(sortOrder)) {
      throw new Error('Ordem deve ser "asc" ou "desc"')
    }

    const result = await listPatients({
      page,
      limit,
      sortBy,
      sortOrder,
      search
    })

    // Add caching headers for better performance
    const response = NextResponse.json(result)
    response.headers.set('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300')
    
    return response
  } catch (error) {
    const errorInfo = handleApiError(error)
    ErrorLogger.log(error instanceof Error ? error : new Error(String(error)), {
      endpoint: 'GET /api/patients',
      query: Object.fromEntries(new URL(request.url).searchParams)
    })
    
    return NextResponse.json(
      { error: errorInfo.message, details: errorInfo.details },
      { status: errorInfo.statusCode }
    )
  }
}

/**
 * POST /api/patients - Create a new patient
 * Requirements: 1.1, 1.2, 2.2 (iPad conditional validation)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Check if request is from iPad (based on user agent or explicit parameter)
    const userAgent = request.headers.get('user-agent') || ''
    const isIpad = /iPad/.test(userAgent) || body.isIpad === true

    let validatedData

    if (isIpad) {
      // Use iPad-specific validation (excludes restricted fields)
      const validation = validatePatientIpad(body)
      if (!validation.success) {
        throw new ValidationError('Dados inválidos', {
          validationErrors: formatValidationErrors(validation.error)
        })
      }
      
      // Add default values for iPad-restricted fields
      validatedData = {
        ...validation.data,
        credits: 0, // Default credits for iPad registration
        consultationPrice: undefined,
        consultationFrequency: undefined,
        consultationDay: undefined
      }
    } else {
      // Use full validation for desktop
      const validation = validatePatient(body)
      if (!validation.success) {
        throw new ValidationError('Dados inválidos', {
          validationErrors: formatValidationErrors(validation.error)
        })
      }
      validatedData = validation.data
    }

    const patient = await createPatient(validatedData)

    return NextResponse.json(patient, { status: 201 })
  } catch (error) {
    const errorInfo = handleApiError(error)
    ErrorLogger.log(error instanceof Error ? error : new Error(String(error)), {
      endpoint: 'POST /api/patients',
      isIpad: /iPad/.test(request.headers.get('user-agent') || '')
    })
    
    return NextResponse.json(
      { error: errorInfo.message, details: errorInfo.details },
      { status: errorInfo.statusCode }
    )
  }
}