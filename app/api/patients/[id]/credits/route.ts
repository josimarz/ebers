import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { validateCreditSales, calculateCreditSalesTotal } from '@/lib/validations'

/**
 * POST /api/patients/[id]/credits - Sell credits to a patient
 * Requirements: 4.1, 4.2, 4.3, 4.4
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
    
    // Validate credit sales data
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

    // Get patient and verify consultation price
    const patient = await prisma.patient.findUnique({
      where: { id: patientId },
      select: {
        id: true,
        name: true,
        consultationPrice: true,
        credits: true
      }
    })

    if (!patient) {
      return NextResponse.json(
        { error: 'Paciente não encontrado' },
        { status: 404 }
      )
    }

    // Verify patient has consultation price established (Requirement 4.5)
    if (!patient.consultationPrice || Number(patient.consultationPrice) <= 0) {
      return NextResponse.json(
        { error: 'Não é possível vender créditos. Valor da consulta não foi estabelecido.' },
        { status: 400 }
      )
    }

    // Verify unit price matches patient's consultation price
    if (Math.abs(Number(patient.consultationPrice) - unitPrice) > 0.01) {
      return NextResponse.json(
        { error: 'Preço unitário deve corresponder ao valor da consulta do paciente' },
        { status: 400 }
      )
    }

    // Calculate total cost (Requirement 4.3)
    const totalCost = calculateCreditSalesTotal(quantity, unitPrice)

    // Update patient credits (Requirement 4.4)
    const updatedPatient = await prisma.patient.update({
      where: { id: patientId },
      data: {
        credits: {
          increment: quantity
        }
      },
      select: {
        id: true,
        name: true,
        credits: true,
        consultationPrice: true
      }
    })

    return NextResponse.json({
      success: true,
      message: `${quantity} crédito${quantity > 1 ? 's' : ''} vendido${quantity > 1 ? 's' : ''} com sucesso`,
      data: {
        patientId: updatedPatient.id,
        patientName: updatedPatient.name,
        creditsSold: quantity,
        unitPrice,
        totalCost,
        newCreditBalance: updatedPatient.credits
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