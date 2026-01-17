import { eq, like, desc, asc, and, gt, count } from 'drizzle-orm'
import { getDbAsync, patients, consultations, saveDatabase, type Patient } from './db'
import { PatientInput, PatientUpdateInput, validatePatient } from './validations'

// Types for patient operations
export type PatientWithAge = {
  id: string
  name: string
  profilePhoto: string | null
  birthDate: Date
  gender: string
  cpf: string | null
  rg: string | null
  religion: string
  legalGuardian: string | null
  legalGuardianEmail: string | null
  legalGuardianCpf: string | null
  phone1: string
  phone2: string | null
  email: string | null
  hasTherapyHistory: boolean
  therapyHistoryDetails: string | null
  takesMedication: boolean
  medicationSince: string | null
  medicationNames: string | null
  hasHospitalization: boolean
  hospitalizationDate: string | null
  hospitalizationReason: string | null
  consultationPrice: number | null
  consultationFrequency: string | null
  consultationDay: string | null
  credits: number
  createdAt: Date
  updatedAt: Date
  age: number
  hasActiveConsultation?: boolean
}

export type PatientListOptions = {
  page?: number
  limit?: number
  sortBy?: 'name' | 'age'
  sortOrder?: 'asc' | 'desc'
  search?: string
}

export type PatientListResult = {
  patients: PatientWithAge[]
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
 * Adds age calculation to patient data
 */
function addAgeToPatient(patient: Patient): PatientWithAge {
  return {
    ...patient,
    age: calculateAge(patient.birthDate),
  }
}

/**
 * Generates a CUID-like ID
 */
function generateId(): string {
  const timestamp = Date.now().toString(36)
  const randomPart = Math.random().toString(36).substring(2, 15)
  return `c${timestamp}${randomPart}`
}

/**
 * Creates a new patient
 */
export async function createPatient(data: PatientInput): Promise<PatientWithAge> {
  const validation = validatePatient(data)
  if (!validation.success) {
    throw new Error(`Dados inválidos: ${validation.error.issues.map(i => i.message).join(', ')}`)
  }

  try {
    const db = await getDbAsync()
    const now = new Date()
    const id = generateId()

    const newPatient = {
      id,
      name: validation.data.name,
      profilePhoto: validation.data.profilePhoto || null,
      birthDate: validation.data.birthDate,
      gender: validation.data.gender,
      cpf: validation.data.cpf || null,
      rg: validation.data.rg || null,
      religion: validation.data.religion,
      legalGuardian: validation.data.legalGuardian || null,
      legalGuardianEmail: validation.data.legalGuardianEmail || null,
      legalGuardianCpf: validation.data.legalGuardianCpf || null,
      phone1: validation.data.phone1,
      phone2: validation.data.phone2 || null,
      email: validation.data.email || null,
      hasTherapyHistory: validation.data.hasTherapyHistory,
      therapyHistoryDetails: validation.data.therapyHistoryDetails || null,
      takesMedication: validation.data.takesMedication,
      medicationSince: validation.data.medicationSince || null,
      medicationNames: validation.data.medicationNames || null,
      hasHospitalization: validation.data.hasHospitalization,
      hospitalizationDate: validation.data.hospitalizationDate || null,
      hospitalizationReason: validation.data.hospitalizationReason || null,
      consultationPrice: validation.data.consultationPrice || null,
      consultationFrequency: validation.data.consultationFrequency || null,
      consultationDay: validation.data.consultationDay || null,
      credits: validation.data.credits ?? 0,
      createdAt: now,
      updatedAt: now,
    }

    db.insert(patients).values(newPatient).run()
    saveDatabase()

    return addAgeToPatient(newPatient)
  } catch (error: unknown) {
    if (error instanceof Error) {
      throw new Error(`Erro ao criar paciente: ${error.message}`)
    }
    throw new Error('Erro desconhecido ao criar paciente')
  }
}

/**
 * Updates an existing patient
 */
export async function updatePatient(id: string, data: Partial<PatientUpdateInput>): Promise<PatientWithAge> {
  if (!id) {
    throw new Error('ID do paciente é obrigatório')
  }

  try {
    const db = await getDbAsync()

    const existingPatient = db.select().from(patients).where(eq(patients.id, id)).get()

    if (!existingPatient) {
      throw new Error('Paciente não encontrado')
    }

    const updateData: Record<string, unknown> = { updatedAt: new Date() }
    Object.entries(data).forEach(([key, value]) => {
      if (value !== undefined && key !== 'id') {
        updateData[key] = value
      }
    })

    db.update(patients).set(updateData).where(eq(patients.id, id)).run()
    saveDatabase()

    const updatedPatient = db.select().from(patients).where(eq(patients.id, id)).get()

    return addAgeToPatient(updatedPatient!)
  } catch (error: unknown) {
    if (error instanceof Error) {
      if (error.message.includes('Paciente não encontrado')) {
        throw error
      }
      throw new Error(`Erro ao atualizar paciente: ${error.message}`)
    }
    throw new Error('Erro desconhecido ao atualizar paciente')
  }
}

/**
 * Gets a patient by ID
 */
export async function getPatient(id: string): Promise<PatientWithAge | null> {
  if (!id) {
    throw new Error('ID do paciente é obrigatório')
  }

  try {
    const db = await getDbAsync()
    const patient = db.select().from(patients).where(eq(patients.id, id)).get()

    if (!patient) {
      return null
    }

    return addAgeToPatient(patient)
  } catch (error: unknown) {
    if (error instanceof Error) {
      throw new Error(`Erro ao buscar paciente: ${error.message}`)
    }
    throw new Error('Erro desconhecido ao buscar paciente')
  }
}

/**
 * Lists patients with pagination, sorting, and filtering
 */
export async function listPatients(options: PatientListOptions = {}): Promise<PatientListResult> {
  const {
    page = 1,
    limit = 10,
    sortBy = 'name',
    sortOrder = 'asc',
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

    const whereClause = search && search.trim().length > 0
      ? like(patients.name, `%${search.trim()}%`)
      : undefined

    const countResult = db
      .select({ count: count() })
      .from(patients)
      .where(whereClause)
      .get()
    
    const totalCount = countResult?.count ?? 0
    const totalPages = Math.ceil(totalCount / limit)
    const offset = (page - 1) * limit

    let orderByClause
    if (sortBy === 'age') {
      orderByClause = sortOrder === 'asc' ? desc(patients.birthDate) : asc(patients.birthDate)
    } else {
      orderByClause = sortOrder === 'asc' ? asc(patients.name) : desc(patients.name)
    }

    const patientList = db
      .select()
      .from(patients)
      .where(whereClause)
      .orderBy(orderByClause)
      .limit(limit)
      .offset(offset)
      .all()

    const patientsWithAge = patientList.map(patient => {
      const activeConsultationCount = db
        .select({ count: count() })
        .from(consultations)
        .where(and(
          eq(consultations.patientId, patient.id),
          eq(consultations.status, 'OPEN')
        ))
        .get()

      return {
        ...addAgeToPatient(patient),
        hasActiveConsultation: (activeConsultationCount?.count ?? 0) > 0
      }
    })

    return {
      patients: patientsWithAge,
      totalCount,
      totalPages,
      currentPage: page,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1
    }
  } catch (error: unknown) {
    if (error instanceof Error) {
      throw new Error(`Erro ao listar pacientes: ${error.message}`)
    }
    throw new Error('Erro desconhecido ao listar pacientes')
  }
}

/**
 * Deletes a patient
 */
export async function deletePatient(id: string): Promise<void> {
  if (!id) {
    throw new Error('ID do paciente é obrigatório')
  }

  try {
    const db = await getDbAsync()

    // Check if patient exists first
    const existing = db.select().from(patients).where(eq(patients.id, id)).get()
    if (!existing) {
      throw new Error('Paciente não encontrado')
    }

    const consultationCount = db
      .select({ count: count() })
      .from(consultations)
      .where(eq(consultations.patientId, id))
      .get()

    if ((consultationCount?.count ?? 0) > 0) {
      throw new Error('Não é possível excluir paciente com consultas registradas')
    }

    db.delete(patients).where(eq(patients.id, id)).run()
    saveDatabase()
  } catch (error: unknown) {
    if (error instanceof Error) {
      throw new Error(`Erro ao excluir paciente: ${error.message}`)
    }
    throw new Error('Erro desconhecido ao excluir paciente')
  }
}

/**
 * Searches patients by name
 */
export async function searchPatients(query: string, limit: number = 10): Promise<{ id: string; name: string }[]> {
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

/**
 * Gets recent patients for dashboard
 */
export async function getRecentPatients(limit: number = 3): Promise<PatientWithAge[]> {
  try {
    const db = await getDbAsync()

    const patientList = db
      .select()
      .from(patients)
      .orderBy(desc(patients.createdAt))
      .limit(limit)
      .all()

    return patientList.map(addAgeToPatient)
  } catch (error) {
    console.error('Error fetching recent patients:', error)
    throw new Error('Erro ao buscar pacientes recentes')
  }
}

/**
 * Gets patient statistics for dashboard
 */
export async function getPatientStats(): Promise<{
  totalPatients: number
  patientsWithCredits: number
  patientsWithActiveConsultations: number
}> {
  try {
    const db = await getDbAsync()

    const totalPatientsResult = db.select({ count: count() }).from(patients).get()
    const totalPatients = totalPatientsResult?.count ?? 0

    const patientsWithCreditsResult = db
      .select({ count: count() })
      .from(patients)
      .where(gt(patients.credits, 0))
      .get()
    const patientsWithCredits = patientsWithCreditsResult?.count ?? 0

    const patientsWithActiveResult = db
      .selectDistinct({ id: consultations.patientId })
      .from(consultations)
      .where(eq(consultations.status, 'OPEN'))
      .all()
    const patientsWithActiveConsultations = patientsWithActiveResult.length

    return {
      totalPatients,
      patientsWithCredits,
      patientsWithActiveConsultations
    }
  } catch (error: unknown) {
    if (error instanceof Error) {
      throw new Error(`Erro ao obter estatísticas: ${error.message}`)
    }
    throw new Error('Erro desconhecido ao obter estatísticas')
  }
}
