import { NextRequest, NextResponse } from 'next/server'
import { finalizeConsultation } from '@/lib/consultations'

/**
 * POST /api/consultations/[id]/finalize - Finalize consultation
 * Requirements: 5.6
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const consultation = await finalizeConsultation(id)

    return NextResponse.json(consultation)
  } catch (error) {
    console.error('Error finalizing consultation:', error)
    
    if (error instanceof Error) {
      if (error.message.includes('não encontrada')) {
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