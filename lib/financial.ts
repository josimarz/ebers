import { eq, like, asc, count, sum, and, sql } from 'drizzle-orm'
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

    const countResult = db
      .select({ count: count() })
      .from(patients)
      .where(whereClause)
      .get()

    const totalCount = countResult?.count ?? 0
    const totalPages = Math.ceil(totalCount / limit)

    // Single query with subquery instead of N+1
    const searchCondition = search ? `AND "Patient"."name" LIKE '%${search.replace(/'/g, "''")}%'` : ''

    const rawResults = db.all(sql`
      SELECT
        "Patient"."id",
        "Patient"."name",
        "Patient"."profilePhoto",
        "Patient"."birthDate",
        "Patient"."credits",
        "Patient"."consultationPrice",
        COALESCE(c_stats.total_consultations, 0) as total_consultations,
        COALESCE(c_stats.paid_consultations, 0) as paid_consultations,
        COALESCE(c_stats.total_consultations, 0) - COALESCE(c_stats.paid_consultations, 0) as payment_deficit
      FROM "Patient"
      LEFT JOIN (
        SELECT
          "patientId",
          COUNT(*) as total_consultations,
          SUM(CASE WHEN "paid" = 1 THEN 1 ELSE 0 END) as paid_consultations
        FROM "Consultation"
        GROUP BY "patientId"
      ) c_stats ON c_stats."patientId" = "Patient"."id"
      WHERE 1=1 ${sql.raw(searchCondition)}
      ORDER BY ${sql.raw(
        sortBy === 'name'
          ? `"Patient"."name" ${sortOrder === 'asc' ? 'ASC' : 'DESC'}`
          : `payment_deficit ${sortOrder === 'desc' ? 'DESC' : 'ASC'}`
      )}
      LIMIT ${limit}
      OFFSET ${(page - 1) * limit}
    `) as Array<{
      id: string
      name: string
      profilePhoto: string | null
      birthDate: number
      credits: number
      consultationPrice: number | null
      total_consultations: number
      paid_consultations: number
      payment_deficit: number
    }>

    const patientsData: PatientFinancialData[] = rawResults.map(row => {
      const birthDate = new Date(row.birthDate * 1000)
      return {
        id: row.id,
        name: row.name,
        profilePhoto: row.profilePhoto,
        birthDate,
        age: calculateAge(birthDate),
        totalConsultations: row.total_consultations,
        paidConsultations: row.paid_consultations,
        availableCredits: row.credits,
        paymentDeficit: row.payment_deficit,
        hasPaymentIssues: row.payment_deficit > 0,
        consultationPrice: row.consultationPrice
      }
    })

    return {
      patients: patientsData,
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

    // Single query to count patients with payment issues instead of N+1
    const paymentIssuesResult = db.all(sql`
      SELECT COUNT(*) as count FROM (
        SELECT p."id"
        FROM "Patient" p
        INNER JOIN "Consultation" c ON c."patientId" = p."id"
        GROUP BY p."id"
        HAVING COUNT(*) > SUM(CASE WHEN c."paid" = 1 THEN 1 ELSE 0 END)
      )
    `) as Array<{ count: number }>

    const patientsWithPaymentIssues = paymentIssuesResult[0]?.count ?? 0

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
