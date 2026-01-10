import { prisma } from './prisma'
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
function addAgeToPatient(patient: any): PatientWithAge {
  return {
    ...patient,
    age: calculateAge(patient.birthDate),
    // Convert Prisma Decimal to number for consultationPrice, keep undefined as undefined
    consultationPrice: patient.consultationPrice ? Number(patient.consultationPrice) : patient.consultationPrice
  }
}

/**
 * Creates a new patient
 * Requirements: 1.1, 1.2
 */
export async function createPatient(data: PatientInput): Promise<PatientWithAge> {
  // Validate input data (for backward compatibility with tests)
  const validation = validatePatient(data)
  if (!validation.success) {
    throw new Error(`Dados inválidos: ${validation.error.issues.map(i => i.message).join(', ')}`)
  }

  try {
    const patient = await prisma.patient.create({
      data: {
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
        credits: validation.data.credits
      }
    })

    return addAgeToPatient(patient)
  } catch (error: unknown) {
    // Re-throw Prisma errors as-is to preserve error codes
    if (error && typeof error === 'object' && 'code' in error) {
      throw error
    }
    
    if (error instanceof Error) {
      throw new Error(`Erro ao criar paciente: ${error.message}`)
    }
    throw new Error('Erro desconhecido ao criar paciente')
  }
}

/**
 * Updates an existing patient
 * Requirements: 1.1, 1.2
 */
export async function updatePatient(id: string, data: Partial<PatientUpdateInput>): Promise<PatientWithAge> {
  if (!id) {
    throw new Error('ID do paciente é obrigatório')
  }

  try {
    // Check if patient exists
    const existingPatient = await prisma.patient.findUnique({
      where: { id }
    })

    if (!existingPatient) {
      throw new Error('Paciente não encontrado')
    }

    // Prepare update data (remove undefined values)
    const updateData: any = {}
    Object.entries(data).forEach(([key, value]) => {
      if (value !== undefined && key !== 'id') {
        updateData[key] = value
      }
    })

    const patient = await prisma.patient.update({
      where: { id },
      data: updateData
    })

    return addAgeToPatient(patient)
  } catch (error: unknown) {
    if (error instanceof Error) {
      if (error.message.includes('P2025')) {
        throw new Error('Paciente não encontrado')
      }
      throw new Error(`Erro ao atualizar paciente: ${error.message}`)
    }
    throw new Error('Erro desconhecido ao atualizar paciente')
  }
}

/**
 * Gets a patient by ID
 * Requirements: 1.1, 1.2
 */
export async function getPatient(id: string): Promise<PatientWithAge | null> {
  if (!id) {
    throw new Error('ID do paciente é obrigatório')
  }

  try {
    const patient = await prisma.patient.findUnique({
      where: { id },
      include: {
        consultations: {
          orderBy: { createdAt: 'desc' },
          take: 1 // Get latest consultation for status checking
        }
      }
    })

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
 * Requirements: 3.2, 3.3, 3.4
 */
export async function listPatients(options: PatientListOptions = {}): Promise<PatientListResult> {
  const {
    page = 1,
    limit = 10,
    sortBy = 'name',
    sortOrder = 'asc',
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
    const where: any = search && search.trim().length > 0
      ? {
          name: {
            contains: search.trim()
          }
        }
      : {}

    // Build order by clause
    let orderBy: any
    if (sortBy === 'age') {
      // For age sorting, we need to sort by birthDate in reverse order
      orderBy = {
        birthDate: sortOrder === 'asc' ? 'desc' : 'asc'
      }
    } else {
      orderBy = {
        [sortBy]: sortOrder
      }
    }

    // Get total count for pagination
    const totalCount = await prisma.patient.count({ where })

    // Calculate pagination values
    const totalPages = Math.ceil(totalCount / limit)
    const skip = (page - 1) * limit

    // Get patients with pagination and active consultation status in a single query
    const patients = await prisma.patient.findMany({
      where,
      orderBy,
      skip,
      take: limit,
      include: {
        _count: {
          select: {
            consultations: {
              where: {
                status: 'OPEN'
              }
            }
          }
        }
      }
    })

    // Add age and active consultation status to each patient
    const patientsWithAge = patients.map(patient => {
      const patientWithAge = addAgeToPatient(patient)
      return {
        ...patientWithAge,
        hasActiveConsultation: patient._count?.consultations > 0
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
 * Deletes a patient (soft delete by setting a deleted flag or hard delete)
 * Note: This function is not in the requirements but may be useful for data management
 */
export async function deletePatient(id: string): Promise<void> {
  if (!id) {
    throw new Error('ID do paciente é obrigatório')
  }

  try {
    // Check if patient has consultations
    const consultationCount = await prisma.consultation.count({
      where: { patientId: id }
    })

    if (consultationCount > 0) {
      throw new Error('Não é possível excluir paciente com consultas registradas')
    }

    await prisma.patient.delete({
      where: { id }
    })
  } catch (error: unknown) {
    if (error instanceof Error) {
      if (error.message.includes('P2025')) {
        throw new Error('Paciente não encontrado')
      }
      throw new Error(`Erro ao excluir paciente: ${error.message}`)
    }
    throw new Error('Erro desconhecido ao excluir paciente')
  }
}

/**
 * Searches patients by name (for autocomplete functionality)
 * Requirements: 3.4
 */
export async function searchPatients(query: string, limit: number = 10): Promise<{ id: string; name: string }[]> {
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

/**
 * Gets patient statistics for dashboard
 */
export async function getPatientStats(): Promise<{
  totalPatients: number
  patientsWithCredits: number
  patientsWithActiveConsultations: number
}> {
  try {
    const [totalPatients, patientsWithCredits, patientsWithActiveConsultations] = await Promise.all([
      prisma.patient.count(),
      prisma.patient.count({
        where: {
          credits: {
            gt: 0
          }
        }
      }),
      prisma.patient.count({
        where: {
          consultations: {
            some: {
              status: 'OPEN'
            }
          }
        }
      })
    ])

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