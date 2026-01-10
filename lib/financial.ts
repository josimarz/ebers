import { prisma } from './prisma'

// Types for financial operations
export type PatientFinancialData = {
  id: string
  name: string
  profilePhoto: string | null
  birthDate: Date
  age: number
  totalConsultations: number
  paidConsultations: number
  availableCredits: number
  paymentDeficit: number
  hasPaymentIssues: boolean
  consultationPrice: number | null
}

export type FinancialListOptions = {
  page?: number
  limit?: number
  sortBy?: 'name' | 'paymentDeficit'
  sortOrder?: 'asc' | 'desc'
  search?: string
}

export type FinancialListResult = {
  patients: PatientFinancialData[]
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
 * Gets financial overview for all patients with payment deficit calculations
 * Requirements: 7.1, 7.2, 7.3
 */
export async function getFinancialOverview(options: FinancialListOptions = {}): Promise<FinancialListResult> {
  const {
    page = 1,
    limit = 10,
    sortBy = 'paymentDeficit',
    sortOrder = 'desc', // Worst patients first by default (Requirement 7.3)
    search
  } = options

  // Validate pagination parameters
  if (page < 1) {
    throw new Error('Página deve ser maior que 0')
  }
  if (limit < 1 || limit > 100) {
    throw new Error('Limite deve estar entre 1 e 100')
  }

  try {
    // Build where clause for search
    const where: any = search
      ? {
          name: {
            contains: search
          }
        }
      : {}

    // Get patients with their consultation data
    const patients = await prisma.patient.findMany({
      where,
      select: {
        id: true,
        name: true,
        profilePhoto: true,
        birthDate: true,
        credits: true,
        consultationPrice: true,
        consultations: {
          select: {
            id: true,
            paid: true
          }
        }
      }
    })

    // Calculate financial data for each patient
    const patientsWithFinancialData: PatientFinancialData[] = patients.map(patient => {
      const totalConsultations = patient.consultations.length
      const paidConsultations = patient.consultations.filter(c => c.paid).length
      const paymentDeficit = totalConsultations - paidConsultations
      const hasPaymentIssues = paymentDeficit > 0 // Requirement 7.2

      return {
        id: patient.id,
        name: patient.name,
        profilePhoto: patient.profilePhoto,
        birthDate: patient.birthDate,
        age: calculateAge(patient.birthDate),
        totalConsultations,
        paidConsultations,
        availableCredits: patient.credits,
        paymentDeficit,
        hasPaymentIssues,
        consultationPrice: patient.consultationPrice ? Number(patient.consultationPrice) : null
      }
    })

    // Sort patients based on criteria
    let sortedPatients = [...patientsWithFinancialData]
    if (sortBy === 'paymentDeficit') {
      sortedPatients.sort((a, b) => {
        const comparison = b.paymentDeficit - a.paymentDeficit
        return sortOrder === 'desc' ? comparison : -comparison
      })
    } else if (sortBy === 'name') {
      sortedPatients.sort((a, b) => {
        const comparison = a.name.localeCompare(b.name)
        return sortOrder === 'desc' ? -comparison : comparison
      })
    }

    // Apply pagination
    const totalCount = sortedPatients.length
    const totalPages = Math.ceil(totalCount / limit)
    const skip = (page - 1) * limit
    const paginatedPatients = sortedPatients.slice(skip, skip + limit)

    return {
      patients: paginatedPatients,
      totalCount,
      totalPages,
      currentPage: page,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1
    }
  } catch (error: unknown) {
    if (error instanceof Error) {
      throw new Error(`Erro ao obter visão financeira: ${error.message}`)
    }
    throw new Error('Erro desconhecido ao obter visão financeira')
  }
}

/**
 * Gets financial data for a specific patient
 * Requirements: 7.1, 7.2
 */
export async function getPatientFinancialData(patientId: string): Promise<PatientFinancialData | null> {
  if (!patientId) {
    throw new Error('ID do paciente é obrigatório')
  }

  try {
    const patient = await prisma.patient.findUnique({
      where: { id: patientId },
      select: {
        id: true,
        name: true,
        profilePhoto: true,
        birthDate: true,
        credits: true,
        consultationPrice: true,
        consultations: {
          select: {
            id: true,
            paid: true
          }
        }
      }
    })

    if (!patient) {
      return null
    }

    const totalConsultations = patient.consultations.length
    const paidConsultations = patient.consultations.filter(c => c.paid).length
    const paymentDeficit = totalConsultations - paidConsultations
    const hasPaymentIssues = paymentDeficit > 0

    return {
      id: patient.id,
      name: patient.name,
      profilePhoto: patient.profilePhoto,
      birthDate: patient.birthDate,
      age: calculateAge(patient.birthDate),
      totalConsultations,
      paidConsultations,
      availableCredits: patient.credits,
      paymentDeficit,
      hasPaymentIssues,
      consultationPrice: patient.consultationPrice ? Number(patient.consultationPrice) : null
    }
  } catch (error: unknown) {
    if (error instanceof Error) {
      throw new Error(`Erro ao obter dados financeiros do paciente: ${error.message}`)
    }
    throw new Error('Erro desconhecido ao obter dados financeiros do paciente')
  }
}

/**
 * Gets financial statistics for dashboard
 */
export async function getFinancialStats(): Promise<{
  totalPatients: number
  patientsWithPaymentIssues: number
  totalUnpaidConsultations: number
  totalCreditsInSystem: number
}> {
  try {
    const [patients, unpaidConsultations, totalCredits] = await Promise.all([
      prisma.patient.findMany({
        select: {
          credits: true,
          consultations: {
            select: {
              paid: true
            }
          }
        }
      }),
      prisma.consultation.count({
        where: { paid: false }
      }),
      prisma.patient.aggregate({
        _sum: {
          credits: true
        }
      })
    ])

    const totalPatients = patients.length
    const patientsWithPaymentIssues = patients.filter(patient => {
      const totalConsultations = patient.consultations.length
      const paidConsultations = patient.consultations.filter(c => c.paid).length
      return totalConsultations > paidConsultations
    }).length

    return {
      totalPatients,
      patientsWithPaymentIssues,
      totalUnpaidConsultations: unpaidConsultations,
      totalCreditsInSystem: totalCredits._sum.credits || 0
    }
  } catch (error: unknown) {
    if (error instanceof Error) {
      throw new Error(`Erro ao obter estatísticas financeiras: ${error.message}`)
    }
    throw new Error('Erro desconhecido ao obter estatísticas financeiras')
  }
}

/**
 * Searches patients for financial filtering (autocomplete functionality)
 * Requirements: 7.4
 */
export async function searchPatientsForFinancial(query: string, limit: number = 10): Promise<{ id: string; name: string }[]> {
  if (!query || query.trim().length < 2) {
    return []
  }

  try {
    const patients = await prisma.patient.findMany({
      where: {
        name: {
          contains: query.trim()
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