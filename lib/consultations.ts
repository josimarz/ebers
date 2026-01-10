import { prisma } from './prisma'
import { ConsultationInput, ConsultationUpdateInput, validateConsultation } from './validations'
import { Decimal } from '@prisma/client/runtime/library'

// Types for consultation operations
export type ConsultationWithPatient = {
  id: string
  patientId: string
  startedAt: Date
  finishedAt: Date | null
  paidAt: Date | null
  status: string
  content: string
  notes: string
  price: Decimal
  paid: boolean
  createdAt: Date
  updatedAt: Date
  patient: {
    id: string
    name: string
    profilePhoto: string | null
    birthDate: Date
    age: number
  }
}

export type ConsultationListOptions = {
  page?: number
  limit?: number
  sortBy?: 'startedAt' | 'status' | 'paid'
  sortOrder?: 'asc' | 'desc'
  patientId?: string
  status?: 'OPEN' | 'FINALIZED'
  paid?: boolean
}

export type ConsultationListResult = {
  consultations: ConsultationWithPatient[]
  totalCount: number
  totalPages: number
  currentPage: number
  hasNextPage: boolean
  hasPreviousPage: boolean
}

/**
 * Calculates age from birth date
 */
function calculateAge(birthDate: Date): number {
  const today = new Date()
  const birth = new Date(birthDate)
  let age = today.getFullYear() - birth.getFullYear()
  const monthDiff = today.getMonth() - birth.getMonth()
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--
  }
  
  return age
}

/**
 * Adds age calculation to consultation patient data
 */
function addAgeToConsultationPatient(consultation: any): ConsultationWithPatient {
  return {
    ...consultation,
    patient: {
      ...consultation.patient,
      age: calculateAge(consultation.patient.birthDate)
    }
  }
}

/**
 * Creates a new consultation
 * Requirements: 5.1, 5.2
 */
export async function createConsultation(data: { patientId: string; price?: number }): Promise<ConsultationWithPatient> {
  try {
    // Get patient to check credits and pricing
    const patient = await prisma.patient.findUnique({
      where: { id: data.patientId }
    })

    if (!patient) {
      throw new Error('Paciente não encontrado')
    }

    // Check if patient has unfinalized consultations (Requirement 6.5)
    const unfinalizedConsultation = await prisma.consultation.findFirst({
      where: {
        patientId: data.patientId,
        status: 'OPEN'
      }
    })

    if (unfinalizedConsultation) {
      throw new Error('Paciente possui consulta não finalizada. Finalize a consulta atual antes de criar uma nova.')
    }

    // Use patient's consultation price or provided price
    const consultationPrice = data.price || patient.consultationPrice
    if (!consultationPrice || consultationPrice === null || Number(consultationPrice) <= 0 || !Number.isFinite(Number(consultationPrice))) {
      throw new Error('Preço da consulta deve ser definido no cadastro do paciente antes de criar uma consulta')
    }

    // Check if patient has credits for automatic payment (Requirement 5.2)
    const hasCredits = patient.credits > 0
    const now = new Date()

    // Create consultation and update patient credits in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create the consultation
      const consultation = await tx.consultation.create({
        data: {
          patientId: data.patientId,
          startedAt: now,
          finishedAt: null,
          paidAt: hasCredits ? now : null,
          status: 'OPEN',
          content: '',
          notes: '',
          price: consultationPrice,
          paid: hasCredits
        },
        include: {
          patient: {
            select: {
              id: true,
              name: true,
              profilePhoto: true,
              birthDate: true
            }
          }
        }
      })

      // If patient has credits, deduct one credit
      if (hasCredits) {
        await tx.patient.update({
          where: { id: data.patientId },
          data: {
            credits: {
              decrement: 1
            }
          }
        })
      }

      return consultation
    })

    return addAgeToConsultationPatient(result)
  } catch (error: unknown) {
    if (error instanceof Error) {
      // Handle specific Prisma errors
      if (error.message.includes('P2002')) {
        throw new Error('Já existe uma consulta com essas informações')
      }
      if (error.message.includes('P2003')) {
        throw new Error('Paciente não encontrado ou dados inválidos')
      }
      if (error.message.includes('P2025')) {
        throw new Error('Paciente não encontrado')
      }
      
      // Re-throw our custom validation errors
      if (error.message.includes('Paciente não encontrado') || 
          error.message.includes('consulta não finalizada') ||
          error.message.includes('Preço da consulta deve ser definido')) {
        throw error
      }
      
      throw new Error(`Erro ao criar consulta: ${error.message}`)
    }
    throw new Error('Erro desconhecido ao criar consulta')
  }
}

/**
 * Updates an existing consultation
 * Requirements: 5.6, 5.7
 */
export async function updateConsultation(id: string, data: Partial<ConsultationUpdateInput>): Promise<ConsultationWithPatient> {
  if (!id || typeof id !== 'string' || id.trim().length === 0) {
    throw new Error('ID da consulta é obrigatório')
  }

  try {
    // Check if consultation exists
    const existingConsultation = await prisma.consultation.findUnique({
      where: { id }
    })

    if (!existingConsultation) {
      throw new Error('Consulta não encontrada')
    }

    // Prepare update data (remove undefined values)
    const updateData: any = {}
    Object.entries(data).forEach(([key, value]) => {
      if (value !== undefined && key !== 'id') {
        updateData[key] = value
      }
    })

    // Handle finalization logic (Requirement 5.6)
    if (updateData.status === 'FINALIZED' && !updateData.finishedAt) {
      updateData.finishedAt = new Date()
    }

    // Handle payment logic (Requirement 5.7)
    if (updateData.paid === true && !updateData.paidAt) {
      updateData.paidAt = new Date()
    }

    const consultation = await prisma.consultation.update({
      where: { id },
      data: updateData,
      include: {
        patient: {
          select: {
            id: true,
            name: true,
            profilePhoto: true,
            birthDate: true
          }
        }
      }
    })

    return addAgeToConsultationPatient(consultation)
  } catch (error: unknown) {
    if (error instanceof Error) {
      if (error.message.includes('P2025')) {
        throw new Error('Consulta não encontrada')
      }
      throw new Error(`Erro ao atualizar consulta: ${error.message}`)
    }
    throw new Error('Erro desconhecido ao atualizar consulta')
  }
}

/**
 * Gets a consultation by ID
 * Requirements: 6.1, 6.3
 */
export async function getConsultation(id: string): Promise<ConsultationWithPatient | null> {
  if (!id || typeof id !== 'string' || id.trim().length === 0) {
    throw new Error('ID da consulta é obrigatório')
  }

  try {
    const consultation = await prisma.consultation.findUnique({
      where: { id },
      include: {
        patient: {
          select: {
            id: true,
            name: true,
            profilePhoto: true,
            birthDate: true
          }
        }
      }
    })

    if (!consultation) {
      return null
    }

    return addAgeToConsultationPatient(consultation)
  } catch (error: unknown) {
    if (error instanceof Error) {
      throw new Error(`Erro ao buscar consulta: ${error.message}`)
    }
    throw new Error('Erro desconhecido ao buscar consulta')
  }
}

/**
 * Lists consultations with pagination, sorting, and filtering
 * Requirements: 6.1, 6.2, 6.3
 */
export async function listConsultations(options: ConsultationListOptions = {}): Promise<ConsultationListResult> {
  const {
    page = 1,
    limit = 10,
    sortBy = 'startedAt',
    sortOrder = 'desc', // Most recent first by default (Requirement 6.3)
    patientId,
    status,
    paid
  } = options

  // Validate pagination parameters
  if (page < 1) {
    throw new Error('Página deve ser maior que 0')
  }
  if (limit < 1 || limit > 100) {
    throw new Error('Limite deve estar entre 1 e 100')
  }

  try {
    // Build where clause for filtering
    const where: any = {}
    
    if (patientId) {
      where.patientId = patientId
    }
    
    if (status) {
      where.status = status
    }
    
    if (paid !== undefined) {
      where.paid = paid
    }

    // Build order by clause
    const orderBy = {
      [sortBy]: sortOrder
    }

    // Get total count for pagination
    const totalCount = await prisma.consultation.count({ where })

    // Calculate pagination values
    const totalPages = Math.ceil(totalCount / limit)
    const skip = (page - 1) * limit

    // Get consultations with pagination
    const consultations = await prisma.consultation.findMany({
      where,
      orderBy,
      skip,
      take: limit,
      include: {
        patient: {
          select: {
            id: true,
            name: true,
            profilePhoto: true,
            birthDate: true
          }
        }
      }
    })

    // Add age to each consultation's patient data
    const consultationsWithAge = consultations.map(addAgeToConsultationPatient)

    return {
      consultations: consultationsWithAge,
      totalCount,
      totalPages,
      currentPage: page,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1
    }
  } catch (error: unknown) {
    if (error instanceof Error) {
      throw new Error(`Erro ao listar consultas: ${error.message}`)
    }
    throw new Error('Erro desconhecido ao listar consultas')
  }
}

/**
 * Gets the active (open) consultation for a patient
 * Requirements: 3.5, 3.6
 */
export async function getActiveConsultation(patientId: string): Promise<ConsultationWithPatient | null> {
  if (!patientId || typeof patientId !== 'string' || patientId.trim().length === 0) {
    throw new Error('ID do paciente é obrigatório')
  }

  try {
    const consultation = await prisma.consultation.findFirst({
      where: {
        patientId,
        status: 'OPEN'
      },
      include: {
        patient: {
          select: {
            id: true,
            name: true,
            profilePhoto: true,
            birthDate: true
          }
        }
      },
      orderBy: {
        startedAt: 'desc'
      }
    })

    if (!consultation) {
      return null
    }

    return addAgeToConsultationPatient(consultation)
  } catch (error: unknown) {
    if (error instanceof Error) {
      throw new Error(`Erro ao buscar consulta ativa: ${error.message}`)
    }
    throw new Error('Erro desconhecido ao buscar consulta ativa')
  }
}

/**
 * Finalizes a consultation (sets status to FINALIZED and finishedAt timestamp)
 * Requirements: 5.6
 */
export async function finalizeConsultation(id: string): Promise<ConsultationWithPatient> {
  if (!id || typeof id !== 'string' || id.trim().length === 0) {
    throw new Error('ID da consulta é obrigatório')
  }

  try {
    const consultation = await prisma.consultation.update({
      where: { id },
      data: {
        status: 'FINALIZED',
        finishedAt: new Date()
      },
      include: {
        patient: {
          select: {
            id: true,
            name: true,
            profilePhoto: true,
            birthDate: true
          }
        }
      }
    })

    return addAgeToConsultationPatient(consultation)
  } catch (error: unknown) {
    if (error instanceof Error) {
      if (error.message.includes('P2025')) {
        throw new Error('Consulta não encontrada')
      }
      throw new Error(`Erro ao finalizar consulta: ${error.message}`)
    }
    throw new Error('Erro desconhecido ao finalizar consulta')
  }
}

/**
 * Processes payment for a consultation (sets paid to true and paidAt timestamp)
 * Requirements: 5.7
 */
export async function processConsultationPayment(id: string): Promise<ConsultationWithPatient> {
  if (!id || typeof id !== 'string' || id.trim().length === 0) {
    throw new Error('ID da consulta é obrigatório')
  }

  try {
    const consultation = await prisma.consultation.update({
      where: { id },
      data: {
        paid: true,
        paidAt: new Date()
      },
      include: {
        patient: {
          select: {
            id: true,
            name: true,
            profilePhoto: true,
            birthDate: true
          }
        }
      }
    })

    return addAgeToConsultationPatient(consultation)
  } catch (error: unknown) {
    if (error instanceof Error) {
      if (error.message.includes('P2025')) {
        throw new Error('Consulta não encontrada')
      }
      throw new Error(`Erro ao processar pagamento: ${error.message}`)
    }
    throw new Error('Erro desconhecido ao processar pagamento')
  }
}

/**
 * Gets recent consultations for dashboard
 */
export async function getRecentConsultations(limit: number = 3): Promise<ConsultationWithPatient[]> {
  try {
    const consultations = await prisma.consultation.findMany({
      take: limit,
      orderBy: { startedAt: 'desc' },
      include: {
        patient: {
          select: {
            id: true,
            name: true,
            profilePhoto: true,
            birthDate: true
          }
        }
      }
    })

    return consultations.map(addAgeToConsultationPatient)
  } catch (error) {
    console.error('Error fetching recent consultations:', error)
    throw new Error('Erro ao buscar consultas recentes')
  }
}

/**
 * Gets consultation statistics for dashboard
 */
export async function getConsultationStats(): Promise<{
  totalConsultations: number
  openConsultations: number
  finalizedConsultations: number
  paidConsultations: number
  unpaidConsultations: number
}> {
  try {
    const [
      totalConsultations,
      openConsultations,
      finalizedConsultations,
      paidConsultations,
      unpaidConsultations
    ] = await Promise.all([
      prisma.consultation.count(),
      prisma.consultation.count({
        where: { status: 'OPEN' }
      }),
      prisma.consultation.count({
        where: { status: 'FINALIZED' }
      }),
      prisma.consultation.count({
        where: { paid: true }
      }),
      prisma.consultation.count({
        where: { paid: false }
      })
    ])

    return {
      totalConsultations,
      openConsultations,
      finalizedConsultations,
      paidConsultations,
      unpaidConsultations
    }
  } catch (error: unknown) {
    if (error instanceof Error) {
      throw new Error(`Erro ao obter estatísticas: ${error.message}`)
    }
    throw new Error('Erro desconhecido ao obter estatísticas')
  }
}

/**
 * Gets consultations for a specific patient
 * Requirements: 6.1, 6.2
 */
export async function getPatientConsultations(
  patientId: string,
  options: Omit<ConsultationListOptions, 'patientId'> = {}
): Promise<ConsultationListResult> {
  return listConsultations({
    ...options,
    patientId
  })
}

/**
 * Searches patients for consultation filtering (autocomplete functionality)
 * Requirements: 6.2
 */
export async function searchPatientsForConsultations(query: string, limit: number = 10): Promise<{ id: string; name: string }[]> {
  if (!query || query.trim().length < 2) {
    return []
  }

  try {
    const patients = await prisma.patient.findMany({
      where: {
        name: {
          contains: query.trim()
        },
        consultations: {
          some: {} // Only patients who have consultations
        }
      },
      select: {
        id: true,
        name: true
      },
      orderBy: {
        name: 'asc'
      },
      take: limit
    })

    return patients
  } catch (error: unknown) {
    if (error instanceof Error) {
      throw new Error(`Erro ao buscar pacientes: ${error.message}`)
    }
    throw new Error('Erro desconhecido ao buscar pacientes')
  }
}

/**
 * Deletes a consultation (only if it's not paid and not finalized)
 * Note: This function is not in the requirements but may be useful for data management
 */
export async function deleteConsultation(id: string): Promise<void> {
  if (!id || typeof id !== 'string' || id.trim().length === 0) {
    throw new Error('ID da consulta é obrigatório')
  }

  try {
    // Check consultation status before deletion
    const consultation = await prisma.consultation.findUnique({
      where: { id }
    })

    if (!consultation) {
      throw new Error('Consulta não encontrada')
    }

    if (consultation.paid) {
      throw new Error('Não é possível excluir consulta paga')
    }

    if (consultation.status === 'FINALIZED') {
      throw new Error('Não é possível excluir consulta finalizada')
    }

    await prisma.consultation.delete({
      where: { id }
    })
  } catch (error: unknown) {
    if (error instanceof Error) {
      if (error.message.includes('P2025')) {
        throw new Error('Consulta não encontrada')
      }
      throw new Error(`Erro ao excluir consulta: ${error.message}`)
    }
    throw new Error('Erro desconhecido ao excluir consulta')
  }
}