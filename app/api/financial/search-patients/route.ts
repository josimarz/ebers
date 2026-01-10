import { NextRequest, NextResponse } from 'next/server'
import { searchPatientsForFinancial } from '@/lib/financial'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const query = searchParams.get('q') || ''
    const limit = parseInt(searchParams.get('limit') || '10')

    if (!query || query.trim().length < 2) {
      return NextResponse.json([])
    }

    const patients = await searchPatientsForFinancial(query, limit)
    return NextResponse.json(patients)
  } catch (error) {
    console.error('Error searching patients for financial:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}