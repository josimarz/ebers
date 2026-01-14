import { NextRequest, NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { getDbAsync, patients, saveDatabase } from '@/lib/db'
import { validateCreditSales, calculateCreditSalesTotal } from '@/lib/validations'

/**
 * POST /api/patients/[id]/credits - Sell credits to a patient
 */
export async function POST(
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

    const body = await request.json()
    
    const validation = validateCreditSales({
      patientId,
      quantity: body.quantity,
      unitPrice: body.unitPrice
    })

    if (!validation.success) {
      return NextResponse.json(
        { 
          error: 'Dados inválidos',
          details: validation.error.issues.reduce((acc, issue) => {
            acc[issue.path.join('.')] = issue.message
            return acc
          }, {} as Record<string, string>)
        },
        { status: 400 }
      )
    }

    const { quantity, unitPrice } = validation.data

    const db = await getDbAsync()

    const patient = db
      .select({
        id: patients.id,
        name: patients.name,
        consultationPrice: patients.consultationPrice,
        credits: patients.credits
      })
      .from(patients)
      .where(eq(patients.id, patientId))
      .get()

    if (!patient) {
      return NextResponse.json(
        { error: 'Paciente não encontrado' },
        { status: 404 }
      )
    }

    if (!patient.consultationPrice || patient.consultationPrice <= 0) {
      return NextResponse.json(
        { error: 'Não é possível vender créditos. Valor da consulta não foi estabelecido.' },
        { status: 400 }
      )
    }

    if (Math.abs(patient.consultationPrice - unitPrice) > 0.01) {
      return NextResponse.json(
        { error: 'Preço unitário deve corresponder ao valor da consulta do paciente' },
        { status: 400 }
      )
    }

    const totalCost = calculateCreditSalesTotal(quantity, unitPrice)

    db.update(patients)
      .set({ 
        credits: patient.credits + quantity,
        updatedAt: new Date()
      })
      .where(eq(patients.id, patientId))
      .run()

    saveDatabase()

    const updatedPatient = db
      .select({
        id: patients.id,
        name: patients.name,
        credits: patients.credits,
        consultationPrice: patients.consultationPrice
      })
      .from(patients)
      .where(eq(patients.id, patientId))
      .get()

    return NextResponse.json({
      success: true,
      message: `${quantity} crédito${quantity > 1 ? 's' : ''} vendido${quantity > 1 ? 's' : ''} com sucesso`,
      data: {
        patientId: updatedPatient!.id,
        patientName: updatedPatient!.name,
        creditsSold: quantity,
        unitPrice,
        totalCost,
        newCreditBalance: updatedPatient!.credits
      }
    })

  } catch (error) {
    console.error('Error selling credits:', error)
    
    if (error instanceof Error) {
      return NextResponse.json(
        { error: `Erro ao vender créditos: ${error.message}` },
        { status: 500 }
      )
    }
    
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
