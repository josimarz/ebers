import { NextRequest, NextResponse } from 'next/server'
import { 
  getConsultation, 
  updateConsultation, 
  deleteConsultation,
  finalizeConsultation,
  processConsultationPayment
} from '@/lib/consultations'
import { formatValidationErrors } from '@/lib/validations'

/**
 * GET /api/consultations/[id] - Get consultation by ID
 * Requirements: 6.1, 6.3
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const consultation = await getConsultation(id)

    if (!consultation) {
      return NextResponse.json(
        { error: 'Consulta não encontrada' },
        { status: 404 }
      )
    }

    return NextResponse.json(consultation)
  } catch (error) {
    console.error('Error getting consultation:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/consultations/[id] - Update consultation
 * Requirements: 5.6, 5.7
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()

    // Remove id from body to prevent conflicts
    const { id: bodyId, ...updateData } = body

    const consultation = await updateConsultation(id, updateData)

    return NextResponse.json(consultation)
  } catch (error) {
    console.error('Error updating consultation:', error)
    
    if (error instanceof Error) {
      if (error.message.includes('não encontrada')) {
        return NextResponse.json(
          { error: error.message },
          { status: 404 }
        )
      }
      
      if (error.message.includes('Dados inválidos')) {
        return NextResponse.json(
          { error: error.message },
          { status: 400 }
        )
      }
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/consultations/[id] - Delete consultation
 * Note: Only allows deletion of unpaid and unfinalized consultations
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    await deleteConsultation(id)

    return NextResponse.json({ message: 'Consulta excluída com sucesso' })
  } catch (error) {
    console.error('Error deleting consultation:', error)
    
    if (error instanceof Error) {
      if (error.message.includes('não encontrada')) {
        return NextResponse.json(
          { error: error.message },
          { status: 404 }
        )
      }
      
      if (error.message.includes('não é possível excluir')) {
        return NextResponse.json(
          { error: error.message },
          { status: 400 }
        )
      }
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}