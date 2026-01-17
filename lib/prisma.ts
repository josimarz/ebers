/**
 * @deprecated This file is kept for backward compatibility with tests.
 * Use lib/db instead for new code.
 */

import { getDb, patients, consultations } from './db'
import { eq, and, like, count, sum, desc, asc } from 'drizzle-orm'

// Mock prisma object for backward compatibility with tests
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const prisma: any = {
  patient: {
    create: async ({ data }: { data: Record<string, unknown> }) => {
      const db = getDb()
      const id = generateId()
      const now = new Date()
      const newPatient = { ...data, id, createdAt: now, updatedAt: now }
      db.insert(patients).values(newPatient as never).run()
      return db.select().from(patients).where(eq(patients.id, id)).get()
    },
    findMany: async (options?: { where?: Record<string, unknown>; orderBy?: Record<string, string>; take?: number; skip?: number }) => {
      const db = getDb()
      let query = db.select().from(patients)
      if (options?.take) {
        query = query.limit(options.take) as typeof query
      }
      return query.all()
    },
    findUnique: async ({ where }: { where: { id: string } }) => {
      const db = getDb()
      return db.select().from(patients).where(eq(patients.id, where.id)).get()
    },
    update: async ({ where, data }: { where: { id: string }; data: Record<string, unknown> }) => {
      const db = getDb()
      db.update(patients).set({ ...data, updatedAt: new Date() } as never).where(eq(patients.id, where.id)).run()
      return db.select().from(patients).where(eq(patients.id, where.id)).get()
    },
    delete: async ({ where }: { where: { id: string } }) => {
      const db = getDb()
      const patient = db.select().from(patients).where(eq(patients.id, where.id)).get()
      db.delete(patients).where(eq(patients.id, where.id)).run()
      return patient
    },
    count: async (options?: { where?: Record<string, unknown> }) => {
      const db = getDb()
      const result = db.select({ count: count() }).from(patients).get()
      return result?.count ?? 0
    },
    aggregate: async (options?: { _sum?: Record<string, boolean>; where?: Record<string, unknown> }) => {
      const db = getDb()
      if (options?._sum?.credits) {
        const result = db.select({ total: sum(patients.credits) }).from(patients).get()
        return { _sum: { credits: Number(result?.total ?? 0) } }
      }
      return { _sum: {} }
    },
  },
  consultation: {
    create: async ({ data, include }: { data: Record<string, unknown>; include?: Record<string, unknown> }) => {
      const db = getDb()
      const id = generateId()
      const now = new Date()
      const newConsultation = { ...data, id, createdAt: now, updatedAt: now }
      db.insert(consultations).values(newConsultation as never).run()
      const consultation = db.select().from(consultations).where(eq(consultations.id, id)).get()
      if (include?.patient && consultation) {
        const patient = db.select().from(patients).where(eq(patients.id, consultation.patientId)).get()
        return { ...consultation, patient }
      }
      return consultation
    },
    findMany: async (options?: { where?: Record<string, unknown>; orderBy?: Record<string, string>; take?: number; skip?: number; include?: Record<string, unknown> }) => {
      const db = getDb()
      let query = db.select().from(consultations)
      if (options?.take) {
        query = query.limit(options.take) as typeof query
      }
      const results = query.all()
      if (options?.include?.patient) {
        return results.map(c => {
          const patient = db.select().from(patients).where(eq(patients.id, c.patientId)).get()
          return { ...c, patient }
        })
      }
      return results
    },
    findUnique: async ({ where, include }: { where: { id: string }; include?: Record<string, unknown> }) => {
      const db = getDb()
      const consultation = db.select().from(consultations).where(eq(consultations.id, where.id)).get()
      if (include?.patient && consultation) {
        const patient = db.select().from(patients).where(eq(patients.id, consultation.patientId)).get()
        return { ...consultation, patient }
      }
      return consultation
    },
    findFirst: async ({ where, include, orderBy }: { where?: Record<string, unknown>; include?: Record<string, unknown>; orderBy?: Record<string, string> }) => {
      const db = getDb()
      let query = db.select().from(consultations)
      const consultation = query.get()
      if (include?.patient && consultation) {
        const patient = db.select().from(patients).where(eq(patients.id, consultation.patientId)).get()
        return { ...consultation, patient }
      }
      return consultation
    },
    update: async ({ where, data, include }: { where: { id: string }; data: Record<string, unknown>; include?: Record<string, unknown> }) => {
      const db = getDb()
      db.update(consultations).set({ ...data, updatedAt: new Date() } as never).where(eq(consultations.id, where.id)).run()
      const consultation = db.select().from(consultations).where(eq(consultations.id, where.id)).get()
      if (include?.patient && consultation) {
        const patient = db.select().from(patients).where(eq(patients.id, consultation.patientId)).get()
        return { ...consultation, patient }
      }
      return consultation
    },
    delete: async ({ where }: { where: { id: string } }) => {
      const db = getDb()
      const consultation = db.select().from(consultations).where(eq(consultations.id, where.id)).get()
      db.delete(consultations).where(eq(consultations.id, where.id)).run()
      return consultation
    },
    count: async (options?: { where?: Record<string, unknown> }) => {
      const db = getDb()
      const result = db.select({ count: count() }).from(consultations).get()
      return result?.count ?? 0
    },
    aggregate: async (options?: { _sum?: Record<string, boolean>; where?: Record<string, unknown> }) => {
      const db = getDb()
      if (options?._sum?.price) {
        const result = db.select({ total: sum(consultations.price) }).from(consultations).get()
        return { _sum: { price: Number(result?.total ?? 0) } }
      }
      return { _sum: {} }
    },
  },
  $transaction: async <T>(callback: (tx: typeof prisma) => Promise<T>): Promise<T> => {
    return callback(prisma)
  },
  $disconnect: async () => {
    // No-op for compatibility
  },
}

function generateId(): string {
  const timestamp = Date.now().toString(36)
  const randomPart = Math.random().toString(36).substring(2, 15)
  return `c${timestamp}${randomPart}`
}
