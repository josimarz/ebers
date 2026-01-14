import { eq, like, asc, count, sum, and } from 'drizzle-orm'
import { getDbAsync, patients, consultations } from './db'

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

export async function getFinancialOverview(options: FinancialListOptions = {}): Promise<FinancialListResult> {
  const {
    page = 1,
    limit = 10,
    sortBy = 'paymentDeficit',
    sortOrder = 'desc',
    search
  } = options

  if (page < 1) {
    throw new Error('Página deve ser maior que 0')
  }
  if (limit < 1 || limit > 100) {
    throw new Error('Limite deve estar entre 1 e 100')
  }

  try {
    const db = await getDbAsync()

    const whereClause = search
      ? like(patients.name, `%${search}%`)
      : undefined

    const patientList = db
      .select()
      .from(patients)
      .where(whereClause)
      .all()

    const patientsWithFinancialData: PatientFinancialData[] = patientList.map(patient => {
      const totalResult = db
        .select({ count: count() })
        .from(consultations)
        .where(eq(consultations.patientId, patient.id))
        .get()
      
      const paidResult = db
        .select({ count: count() })
        .from(consultations)
        .where(and(eq(consultations.patientId, patient.id), eq(consultations.paid, true)))
        .get()

      const totalConsultations = totalResult?.count ?? 0
      const paidConsultations = paidResult?.count ?? 0
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
        consultationPrice: patient.consultationPrice
      }
    })

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

export async function getPatientFinancialData(patientId: string): Promise<PatientFinancialData | null> {
  if (!patientId) {
    throw new Error('ID do paciente é obrigatório')
  }

  try {
    const db = await getDbAsync()

    const patient = db.select().from(patients).where(eq(patients.id, patientId)).get()

    if (!patient) {
      return null
    }

    const totalResult = db
      .select({ count: count() })
      .from(consultations)
      .where(eq(consultations.patientId, patientId))
      .get()
    
    const paidResult = db
      .select({ count: count() })
      .from(consultations)
      .where(and(eq(consultations.patientId, patientId), eq(consultations.paid, true)))
      .get()

    const totalConsultations = totalResult?.count ?? 0
    const paidConsultations = paidResult?.count ?? 0
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
      consultationPrice: patient.consultationPrice
    }
  } catch (error: unknown) {
    if (error instanceof Error) {
      throw new Error(`Erro ao obter dados financeiros do paciente: ${error.message}`)
    }
    throw new Error('Erro desconhecido ao obter dados financeiros do paciente')
  }
}

export async function getTotalRevenue(): Promise<number> {
  try {
    const db = await getDbAsync()

    const result = db
      .select({ total: sum(consultations.price) })
      .from(consultations)
      .where(eq(consultations.paid, true))
      .get()

    return Number(result?.total ?? 0)
  } catch (error) {
    console.error('Error calculating total revenue:', error)
    throw new Error('Erro ao calcular receita total')
  }
}

export async function getFinancialStats(): Promise<{
  totalPatients: number
  patientsWithPaymentIssues: number
  totalUnpaidConsultations: number
  totalCreditsInSystem: number
}> {
  try {
    const db = await getDbAsync()

    const totalPatientsResult = db.select({ count: count() }).from(patients).get()
    const totalPatients = totalPatientsResult?.count ?? 0

    const unpaidConsultationsResult = db
      .select({ count: count() })
      .from(consultations)
      .where(eq(consultations.paid, false))
      .get()
    const totalUnpaidConsultations = unpaidConsultationsResult?.count ?? 0

    const totalCreditsResult = db
      .select({ total: sum(patients.credits) })
      .from(patients)
      .get()
    const totalCreditsInSystem = Number(totalCreditsResult?.total ?? 0)

    const patientList = db.select().from(patients).all()
    let patientsWithPaymentIssues = 0

    for (const patient of patientList) {
      const totalResult = db
        .select({ count: count() })
        .from(consultations)
        .where(eq(consultations.patientId, patient.id))
        .get()
      
      const paidResult = db
        .select({ count: count() })
        .from(consultations)
        .where(and(eq(consultations.patientId, patient.id), eq(consultations.paid, true)))
        .get()

      const totalConsultations = totalResult?.count ?? 0
      const paidConsultations = paidResult?.count ?? 0

      if (totalConsultations > paidConsultations) {
        patientsWithPaymentIssues++
      }
    }

    return {
      totalPatients,
      patientsWithPaymentIssues,
      totalUnpaidConsultations,
      totalCreditsInSystem
    }
  } catch (error: unknown) {
    if (error instanceof Error) {
      throw new Error(`Erro ao obter estatísticas financeiras: ${error.message}`)
    }
    throw new Error('Erro desconhecido ao obter estatísticas financeiras')
  }
}

export async function searchPatientsForFinancial(query: string, limit: number = 10): Promise<{ id: string; name: string }[]> {
  if (!query || query.trim().length < 2) {
    return []
  }

  try {
    const db = await getDbAsync()

    const result = db
      .select({ id: patients.id, name: patients.name })
      .from(patients)
      .where(like(patients.name, `%${query.trim()}%`))
      .orderBy(asc(patients.name))
      .limit(limit)
      .all()

    return result
  } catch (error: unknown) {
    if (error instanceof Error) {
      throw new Error(`Erro ao buscar pacientes: ${error.message}`)
    }
    throw new Error('Erro desconhecido ao buscar pacientes')
  }
}
