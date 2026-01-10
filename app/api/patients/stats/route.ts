import { NextRequest, NextResponse } from 'next/server'
import { getPatientStats } from '@/lib/patients'

/**
 * GET /api/patients/stats - Get patient statistics for dashboard
 */
export async function GET(request: NextRequest) {
  try {
    const stats = await getPatientStats()
    return NextResponse.json(stats)
  } catch (error) {
    console.error('Error getting patient stats:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}