import { eq, and, desc, asc, count, like } from 'drizzle-orm'
import { getDbAsync, patients, consultations, saveDatabase, type Consultation, type Patient } from './db'

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
  price: number
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

function generateId(): string {
  const timestamp = Date.now().toString(36)
  const randomPart = Math.random().toString(36).substring(2, 15)
  return `c${timestamp}${randomPart}`
}

function transformConsultation(consultation: Consultation, patient: Patient): ConsultationWithPatient {
  return {
    id: consultation.id,
    patientId: consultation.patientId,
    startedAt: consultation.startedAt,
    finishedAt: consultation.finishedAt,
    paidAt: consultation.paidAt,
    status: consultation.status,
    content: consultation.content,
    notes: consultation.notes,
    price: consultation.price,
    paid: consultation.paid,
    createdAt: consultation.createdAt,
    updatedAt: consultation.updatedAt,
    patient: {
      id: patient.id,
      name: patient.name,
      profilePhoto: patient.profilePhoto,
      birthDate: patient.birthDate,
      age: calculateAge(patient.birthDate)
    }
  }
}

export async function createConsultation(data: { patientId: string; price?: number }): Promise<ConsultationWithPatient> {
  try {
    const db = await getDbAsync()

    const patient = db.select().from(patients).where(eq(patients.id, data.patientId)).get()

    if (!patient) {
      throw new Error('Paciente não encontrado')
    }

    const unfinalizedConsultation = db
      .select()
      .from(consultations)
      .where(and(
        eq(consultations.patientId, data.patientId),
        eq(consultations.status, 'OPEN')
      ))
      .get()

    if (unfinalizedConsultation) {
      throw new Error('Paciente possui consulta não finalizada. Finalize a consulta atual antes de criar uma nova.')
    }

    const consultationPrice = data.price ?? patient.consultationPrice
    if (!consultationPrice || consultationPrice <= 0 || !Number.isFinite(consultationPrice)) {
      throw new Error('Preço da consulta deve ser definido no cadastro do paciente antes de criar uma consulta')
    }

    const hasCredits = patient.credits > 0
    const now = new Date()
    const id = generateId()

    const newConsultation = {
      id,
      patientId: data.patientId,
      startedAt: now,
      finishedAt: null,
      paidAt: hasCredits ? now : null,
      status: 'OPEN',
      content: '',
      notes: '',
      price: consultationPrice,
      paid: hasCredits,
      createdAt: now,
      updatedAt: now,
    }

    db.insert(consultations).values(newConsultation).run()

    if (hasCredits) {
      db.update(patients)
        .set({ credits: patient.credits - 1, updatedAt: now })
        .where(eq(patients.id, data.patientId))
        .run()
    }

    saveDatabase()

    return transformConsultation(newConsultation as Consultation, patient)
  } catch (error: unknown) {
    if (error instanceof Error) {
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

export async function updateConsultation(id: string, data: Record<string, unknown>): Promise<ConsultationWithPatient> {
  if (!id || typeof id !== 'string' || id.trim().length === 0) {
    throw new Error('ID da consulta é obrigatório')
  }

  try {
    const db = await getDbAsync()

    const existingConsultation = db.select().from(consultations).where(eq(consultations.id, id)).get()

    if (!existingConsultation) {
      throw new Error('Consulta não encontrada')
    }

    const updateData: Record<string, unknown> = { updatedAt: new Date() }
    Object.entries(data).forEach(([key, value]) => {
      if (value !== undefined && key !== 'id') {
        updateData[key] = value
      }
    })

    if (updateData.status === 'FINALIZED' && !updateData.finishedAt) {
      updateData.finishedAt = new Date()
    }

    if (updateData.paid === true && !updateData.paidAt) {
      updateData.paidAt = new Date()
    }

    db.update(consultations).set(updateData).where(eq(consultations.id, id)).run()
    saveDatabase()

    const updatedConsultation = db.select().from(consultations).where(eq(consultations.id, id)).get()
    const patient = db.select().from(patients).where(eq(patients.id, updatedConsultation!.patientId)).get()

    return transformConsultation(updatedConsultation!, patient!)
  } catch (error: unknown) {
    if (error instanceof Error) {
      if (error.message.includes('Consulta não encontrada')) {
        throw error
      }
      throw new Error(`Erro ao atualizar consulta: ${error.message}`)
    }
    throw new Error('Erro desconhecido ao atualizar consulta')
  }
}

export async function getConsultation(id: string): Promise<ConsultationWithPatient | null> {
  if (!id || typeof id !== 'string' || id.trim().length === 0) {
    throw new Error('ID da consulta é obrigatório')
  }

  try {
    const db = await getDbAsync()

    const consultation = db.select().from(consultations).where(eq(consultations.id, id)).get()

    if (!consultation) {
      return null
    }

    const patient = db.select().from(patients).where(eq(patients.id, consultation.patientId)).get()

    return transformConsultation(consultation, patient!)
  } catch (error: unknown) {
    if (error instanceof Error) {
      throw new Error(`Erro ao buscar consulta: ${error.message}`)
    }
    throw new Error('Erro desconhecido ao buscar consulta')
  }
}

export async function listConsultations(options: ConsultationListOptions = {}): Promise<ConsultationListResult> {
  const {
    page = 1,
    limit = 10,
    sortBy = 'startedAt',
    sortOrder = 'desc',
    patientId,
    status,
    paid
  } = options

  if (page < 1) {
    throw new Error('Página deve ser maior que 0')
  }
  if (limit < 1 || limit > 100) {
    throw new Error('Limite deve estar entre 1 e 100')
  }

  try {
    const db = await getDbAsync()

    const conditions = []
    if (patientId) {
      conditions.push(eq(consultations.patientId, patientId))
    }
    if (status) {
      conditions.push(eq(consultations.status, status))
    }
    if (paid !== undefined) {
      conditions.push(eq(consultations.paid, paid))
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined

    const countResult = db
      .select({ count: count() })
      .from(consultations)
      .where(whereClause)
      .get()
    
    const totalCount = countResult?.count ?? 0
    const totalPages = Math.ceil(totalCount / limit)
    const offset = (page - 1) * limit

    let orderByClause
    if (sortBy === 'startedAt') {
      orderByClause = sortOrder === 'asc' ? asc(consultations.startedAt) : desc(consultations.startedAt)
    } else if (sortBy === 'status') {
      orderByClause = sortOrder === 'asc' ? asc(consultations.status) : desc(consultations.status)
    } else {
      orderByClause = sortOrder === 'asc' ? asc(consultations.paid) : desc(consultations.paid)
    }

    const consultationList = db
      .select()
      .from(consultations)
      .where(whereClause)
      .orderBy(orderByClause)
      .limit(limit)
      .offset(offset)
      .all()

    const consultationsWithPatient = consultationList.map(consultation => {
      const patient = db.select().from(patients).where(eq(patients.id, consultation.patientId)).get()
      return transformConsultation(consultation, patient!)
    })

    return {
      consultations: consultationsWithPatient,
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

export async function getActiveConsultation(patientId: string): Promise<ConsultationWithPatient | null> {
  if (!patientId || typeof patientId !== 'string' || patientId.trim().length === 0) {
    throw new Error('ID do paciente é obrigatório')
  }

  try {
    const db = await getDbAsync()

    const consultation = db
      .select()
      .from(consultations)
      .where(and(
        eq(consultations.patientId, patientId),
        eq(consultations.status, 'OPEN')
      ))
      .orderBy(desc(consultations.startedAt))
      .get()

    if (!consultation) {
      return null
    }

    const patient = db.select().from(patients).where(eq(patients.id, patientId)).get()

    return transformConsultation(consultation, patient!)
  } catch (error: unknown) {
    if (error instanceof Error) {
      throw new Error(`Erro ao buscar consulta ativa: ${error.message}`)
    }
    throw new Error('Erro desconhecido ao buscar consulta ativa')
  }
}

export async function finalizeConsultation(id: string): Promise<ConsultationWithPatient> {
  if (!id || typeof id !== 'string' || id.trim().length === 0) {
    throw new Error('ID da consulta é obrigatório')
  }

  try {
    const db = await getDbAsync()
    
    // Check if consultation exists first
    const existing = db.select().from(consultations).where(eq(consultations.id, id)).get()
    if (!existing) {
      throw new Error('Consulta não encontrada')
    }
    
    const now = new Date()

    db.update(consultations)
      .set({ status: 'FINALIZED', finishedAt: now, updatedAt: now })
      .where(eq(consultations.id, id))
      .run()

    saveDatabase()

    const consultation = db.select().from(consultations).where(eq(consultations.id, id)).get()
    const patient = db.select().from(patients).where(eq(patients.id, consultation!.patientId)).get()

    return transformConsultation(consultation!, patient!)
  } catch (error: unknown) {
    if (error instanceof Error) {
      if (error.message.includes('Consulta não encontrada')) {
        throw error
      }
      throw new Error(`Erro ao finalizar consulta: ${error.message}`)
    }
    throw new Error('Erro desconhecido ao finalizar consulta')
  }
}

export async function processConsultationPayment(id: string): Promise<ConsultationWithPatient> {
  if (!id || typeof id !== 'string' || id.trim().length === 0) {
    throw new Error('ID da consulta é obrigatório')
  }

  try {
    const db = await getDbAsync()
    
    // Check if consultation exists first
    const existing = db.select().from(consultations).where(eq(consultations.id, id)).get()
    if (!existing) {
      throw new Error('Consulta não encontrada')
    }
    
    const now = new Date()

    db.update(consultations)
      .set({ paid: true, paidAt: now, updatedAt: now })
      .where(eq(consultations.id, id))
      .run()

    saveDatabase()

    const consultation = db.select().from(consultations).where(eq(consultations.id, id)).get()
    const patient = db.select().from(patients).where(eq(patients.id, consultation!.patientId)).get()

    return transformConsultation(consultation!, patient!)
  } catch (error: unknown) {
    if (error instanceof Error) {
      if (error.message.includes('Consulta não encontrada')) {
        throw error
      }
      throw new Error(`Erro ao processar pagamento: ${error.message}`)
    }
    throw new Error('Erro desconhecido ao processar pagamento')
  }
}

export async function getRecentConsultations(limit: number = 3): Promise<ConsultationWithPatient[]> {
  try {
    const db = await getDbAsync()

    const consultationList = db
      .select()
      .from(consultations)
      .orderBy(desc(consultations.startedAt))
      .limit(limit)
      .all()

    return consultationList.map(consultation => {
      const patient = db.select().from(patients).where(eq(patients.id, consultation.patientId)).get()
      return transformConsultation(consultation, patient!)
    })
  } catch (error) {
    console.error('Error fetching recent consultations:', error)
    throw new Error('Erro ao buscar consultas recentes')
  }
}

export async function getConsultationStats(): Promise<{
  totalConsultations: number
  openConsultations: number
  finalizedConsultations: number
  paidConsultations: number
  unpaidConsultations: number
}> {
  try {
    const db = await getDbAsync()

    const totalResult = db.select({ count: count() }).from(consultations).get()
    const openResult = db.select({ count: count() }).from(consultations).where(eq(consultations.status, 'OPEN')).get()
    const finalizedResult = db.select({ count: count() }).from(consultations).where(eq(consultations.status, 'FINALIZED')).get()
    const paidResult = db.select({ count: count() }).from(consultations).where(eq(consultations.paid, true)).get()
    const unpaidResult = db.select({ count: count() }).from(consultations).where(eq(consultations.paid, false)).get()

    return {
      totalConsultations: totalResult?.count ?? 0,
      openConsultations: openResult?.count ?? 0,
      finalizedConsultations: finalizedResult?.count ?? 0,
      paidConsultations: paidResult?.count ?? 0,
      unpaidConsultations: unpaidResult?.count ?? 0
    }
  } catch (error: unknown) {
    if (error instanceof Error) {
      throw new Error(`Erro ao obter estatísticas: ${error.message}`)
    }
    throw new Error('Erro desconhecido ao obter estatísticas')
  }
}

export async function getPatientConsultations(
  patientId: string,
  options: Omit<ConsultationListOptions, 'patientId'> = {}
): Promise<ConsultationListResult> {
  return listConsultations({ ...options, patientId })
}

export async function searchPatientsForConsultations(query: string, limit: number = 10): Promise<{ id: string; name: string }[]> {
  if (!query || query.trim().length < 2) {
    return []
  }

  try {
    const db = await getDbAsync()

    const patientsWithConsultations = db
      .selectDistinct({ patientId: consultations.patientId })
      .from(consultations)
      .all()
      .map(c => c.patientId)

    if (patientsWithConsultations.length === 0) {
      return []
    }

    const result = db
      .select({ id: patients.id, name: patients.name })
      .from(patients)
      .where(like(patients.name, `%${query.trim()}%`))
      .orderBy(asc(patients.name))
      .limit(limit)
      .all()
      .filter(p => patientsWithConsultations.includes(p.id))

    return result
  } catch (error: unknown) {
    if (error instanceof Error) {
      throw new Error(`Erro ao buscar pacientes: ${error.message}`)
    }
    throw new Error('Erro desconhecido ao buscar pacientes')
  }
}

export async function deleteConsultation(id: string): Promise<void> {
  if (!id || typeof id !== 'string' || id.trim().length === 0) {
    throw new Error('ID da consulta é obrigatório')
  }

  try {
    const db = await getDbAsync()

    const consultation = db.select().from(consultations).where(eq(consultations.id, id)).get()

    if (!consultation) {
      throw new Error('Consulta não encontrada')
    }

    if (consultation.paid) {
      throw new Error('Não é possível excluir consulta paga')
    }

    if (consultation.status === 'FINALIZED') {
      throw new Error('Não é possível excluir consulta finalizada')
    }

    db.delete(consultations).where(eq(consultations.id, id)).run()
    saveDatabase()
  } catch (error: unknown) {
    if (error instanceof Error) {
      throw new Error(`Erro ao excluir consulta: ${error.message}`)
    }
    throw new Error('Erro desconhecido ao excluir consulta')
  }
}
