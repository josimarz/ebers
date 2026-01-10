import { NextRequest, NextResponse } from 'next/server'
import { searchPatients } from '@/lib/patients'

/**
 * GET /api/patients/search - Search patients by name for autocomplete
 * Requirements: 3.4
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    
    const query = searchParams.get('q') || searchParams.get('query') || ''
    const limit = parseInt(searchParams.get('limit') || '10')

    // Validate parameters
    if (!query || query.trim().length < 2) {
      return NextResponse.json([])
    }

    if (limit < 1 || limit > 50) {
      return NextResponse.json(
        { error: 'Limite deve estar entre 1 e 50' },
        { status: 400 }
      )
    }

    const patients = await searchPatients(query, limit)

    return NextResponse.json(patients)
  } catch (error) {
    console.error('Error searching patients:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}