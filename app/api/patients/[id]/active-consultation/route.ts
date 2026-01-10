import { NextRequest, NextResponse } from 'next/server'
import { getActiveConsultation } from '@/lib/consultations'

/**
 * GET /api/patients/[id]/active-consultation - Get active consultation for a patient
 * Requirements: 3.5, 3.6
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: patientId } = await params

    if (!patientId) {
      return NextResponse.json(
        { error: 'ID do paciente é obrigatório' },
        { status: 400 }
      )
    }

    const activeConsultation = await getActiveConsultation(patientId)

    if (!activeConsultation) {
      return NextResponse.json(
        { error: 'Nenhuma consulta ativa encontrada' },
        { status: 404 }
      )
    }

    return NextResponse.json(activeConsultation)
  } catch (error) {
    console.error('Error getting active consultation:', error)
    
    if (error instanceof Error) {
      if (error.message.includes('não encontrado')) {
        return NextResponse.json(
          { error: error.message },
          { status: 404 }
        )
      }
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}