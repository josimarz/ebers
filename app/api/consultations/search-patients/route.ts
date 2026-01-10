import { NextRequest, NextResponse } from 'next/server'
import { searchPatientsForConsultations } from '@/lib/consultations'

/**
 * GET /api/consultations/search-patients - Search patients for consultation filtering
 * Requirements: 6.2
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const query = searchParams.get('q') || ''
    const limit = parseInt(searchParams.get('limit') || '10')

    if (limit < 1 || limit > 50) {
      return NextResponse.json(
        { error: 'Limite deve estar entre 1 e 50' },
        { status: 400 }
      )
    }

    const patients = await searchPatientsForConsultations(query, limit)

    return NextResponse.json({ patients })
  } catch (error) {
    console.error('Error searching patients for consultations:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}