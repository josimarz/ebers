import { NextRequest, NextResponse } from 'next/server'
import { getPatientConsultations } from '@/lib/consultations'

/**
 * GET /api/patients/[id]/consultations - Get consultations for a specific patient
 * Requirements: 6.1, 6.2
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { searchParams } = new URL(request.url)
    
    // Parse query parameters
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const sortBy = (searchParams.get('sortBy') || 'startedAt') as 'startedAt' | 'status' | 'paid'
    const sortOrder = (searchParams.get('sortOrder') || 'desc') as 'asc' | 'desc'
    const status = searchParams.get('status') as 'OPEN' | 'FINALIZED' | undefined
    const paid = searchParams.get('paid') ? searchParams.get('paid') === 'true' : undefined

    // Validate parameters
    if (page < 1) {
      return NextResponse.json(
        { error: 'Página deve ser maior que 0' },
        { status: 400 }
      )
    }

    if (limit < 1 || limit > 100) {
      return NextResponse.json(
        { error: 'Limite deve estar entre 1 e 100' },
        { status: 400 }
      )
    }

    if (!['startedAt', 'status', 'paid'].includes(sortBy)) {
      return NextResponse.json(
        { error: 'Campo de ordenação deve ser "startedAt", "status" ou "paid"' },
        { status: 400 }
      )
    }

    if (!['asc', 'desc'].includes(sortOrder)) {
      return NextResponse.json(
        { error: 'Ordem deve ser "asc" ou "desc"' },
        { status: 400 }
      )
    }

    if (status && !['OPEN', 'FINALIZED'].includes(status)) {
      return NextResponse.json(
        { error: 'Status deve ser "OPEN" ou "FINALIZED"' },
        { status: 400 }
      )
    }

    const result = await getPatientConsultations(id, {
      page,
      limit,
      sortBy,
      sortOrder,
      status,
      paid
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error('Error getting patient consultations:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}