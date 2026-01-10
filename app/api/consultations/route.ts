import { NextRequest, NextResponse } from 'next/server'
import { createConsultation, listConsultations } from '@/lib/consultations'
import { validateConsultation, formatValidationErrors } from '@/lib/validations'
import { handleApiError, ValidationError, NotFoundError, BusinessRuleError, ErrorLogger } from '@/lib/error-handling'

/**
 * GET /api/consultations - List consultations with pagination, sorting, and filtering
 * Requirements: 6.1, 6.2, 6.3
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    
    // Parse query parameters
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const sortBy = (searchParams.get('sortBy') || 'startedAt') as 'startedAt' | 'status' | 'paid'
    const sortOrder = (searchParams.get('sortOrder') || 'desc') as 'asc' | 'desc'
    const patientId = searchParams.get('patientId') || undefined
    const status = searchParams.get('status') as 'OPEN' | 'FINALIZED' | undefined
    const paid = searchParams.get('paid') ? searchParams.get('paid') === 'true' : undefined

    // Validate parameters
    if (page < 1) {
      throw new Error('Página deve ser maior que 0')
    }

    if (limit < 1 || limit > 100) {
      throw new Error('Limite deve estar entre 1 e 100')
    }

    if (!['startedAt', 'status', 'paid'].includes(sortBy)) {
      throw new Error('Campo de ordenação deve ser "startedAt", "status" ou "paid"')
    }

    if (!['asc', 'desc'].includes(sortOrder)) {
      throw new Error('Ordem deve ser "asc" ou "desc"')
    }

    if (status && !['OPEN', 'FINALIZED'].includes(status)) {
      throw new Error('Status deve ser "OPEN" ou "FINALIZED"')
    }

    const result = await listConsultations({
      page,
      limit,
      sortBy,
      sortOrder,
      patientId,
      status,
      paid
    })

    // Add caching headers for better performance
    const response = NextResponse.json(result)
    response.headers.set('Cache-Control', 'public, s-maxage=30, stale-while-revalidate=180')
    
    return response
  } catch (error) {
    const errorInfo = handleApiError(error)
    ErrorLogger.log(error instanceof Error ? error : new Error(String(error)), {
      endpoint: 'GET /api/consultations',
      query: Object.fromEntries(new URL(request.url).searchParams)
    })
    
    return NextResponse.json(
      { error: errorInfo.message, details: errorInfo.details },
      { status: errorInfo.statusCode }
    )
  }
}

/**
 * POST /api/consultations - Create a new consultation
 * Requirements: 5.1, 5.2
 */
export async function POST(request: NextRequest) {
  let body: any = null
  
  try {
    body = await request.json()

    // Validate required fields
    if (!body.patientId) {
      throw new Error('ID do paciente é obrigatório')
    }

    // Price is optional - will use patient's consultation price if not provided
    const consultationData = {
      patientId: body.patientId,
      ...(body.price && { price: body.price })
    }

    const consultation = await createConsultation(consultationData)

    return NextResponse.json(consultation, { status: 201 })
  } catch (error) {
    const errorInfo = handleApiError(error)
    ErrorLogger.log(error instanceof Error ? error : new Error(String(error)), {
      endpoint: 'POST /api/consultations',
      patientId: body?.patientId
    })
    
    return NextResponse.json(
      { error: errorInfo.message, details: errorInfo.details },
      { status: errorInfo.statusCode }
    )
  }
}