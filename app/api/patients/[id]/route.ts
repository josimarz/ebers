import { NextRequest, NextResponse } from 'next/server'
import { getPatient, updatePatient, deletePatient } from '@/lib/patients'
import { PatientUpdateSchema, formatValidationErrors } from '@/lib/validations'

/**
 * GET /api/patients/[id] - Get a specific patient by ID
 * Requirements: 1.1, 1.2
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    if (!id) {
      return NextResponse.json(
        { error: 'ID do paciente é obrigatório' },
        { status: 400 }
      )
    }

    const patient = await getPatient(id)

    if (!patient) {
      return NextResponse.json(
        { error: 'Paciente não encontrado' },
        { status: 404 }
      )
    }

    return NextResponse.json(patient)
  } catch (error) {
    console.error('Error getting patient:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/patients/[id] - Update a specific patient
 * Requirements: 1.1, 1.2
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()

    if (!id) {
      return NextResponse.json(
        { error: 'ID do paciente é obrigatório' },
        { status: 400 }
      )
    }

    // Validate input data using PatientUpdateSchema
    const validation = PatientUpdateSchema.safeParse({ id, ...body })
    if (!validation.success) {
      return NextResponse.json(
        { 
          error: 'Dados inválidos',
          details: formatValidationErrors(validation.error)
        },
        { status: 400 }
      )
    }

    const patient = await updatePatient(id, validation.data)

    return NextResponse.json(patient)
  } catch (error) {
    console.error('Error updating patient:', error)
    
    if (error instanceof Error) {
      if (error.message.includes('não encontrado')) {
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
 * DELETE /api/patients/[id] - Delete a specific patient
 * Note: This endpoint is not in the requirements but may be useful for data management
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    if (!id) {
      return NextResponse.json(
        { error: 'ID do paciente é obrigatório' },
        { status: 400 }
      )
    }

    await deletePatient(id)

    return NextResponse.json({ message: 'Paciente excluído com sucesso' })
  } catch (error) {
    console.error('Error deleting patient:', error)
    
    if (error instanceof Error) {
      if (error.message.includes('não encontrado')) {
        return NextResponse.json(
          { error: error.message },
          { status: 404 }
        )
      }
      if (error.message.includes('consultas registradas')) {
        return NextResponse.json(
          { error: error.message },
          { status: 409 } // Conflict
        )
      }
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}