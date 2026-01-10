import { NextRequest, NextResponse } from 'next/server'
import { getConsultationStats } from '@/lib/consultations'

/**
 * GET /api/consultations/stats - Get consultation statistics
 */
export async function GET(request: NextRequest) {
  try {
    const stats = await getConsultationStats()

    return NextResponse.json(stats)
  } catch (error) {
    console.error('Error getting consultation stats:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}