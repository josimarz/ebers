import { NextRequest, NextResponse } from 'next/server'
import { getPatientStats, getRecentPatients } from '@/lib/patients'
import { getConsultationStats, getRecentConsultations } from '@/lib/consultations'
import { getFinancialStats, getTotalRevenue } from '@/lib/financial'

/**
 * GET /api/dashboard - Get dashboard data
 */
export async function GET(request: NextRequest) {
  try {
    // Fetch all dashboard data in parallel
    const [
      patientStats,
      consultationStats,
      financialStats,
      totalRevenue,
      recentConsultations,
      recentPatients
    ] = await Promise.all([
      getPatientStats(),
      getConsultationStats(),
      getFinancialStats(),
      getTotalRevenue(),
      getRecentConsultations(3),
      getRecentPatients(3)
    ])

    return NextResponse.json({
      stats: {
        patients: patientStats,
        consultations: consultationStats,
        financial: financialStats,
        totalRevenue
      },
      recentConsultations,
      recentPatients
    })
  } catch (error) {
    console.error('Error fetching dashboard data:', error)
    return NextResponse.json(
      { error: 'Erro ao carregar dados do dashboard' },
      { status: 500 }
    )
  }
}