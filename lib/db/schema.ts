import { sqliteTable, text, integer, real, index } from 'drizzle-orm/sqlite-core'
import { relations } from 'drizzle-orm'

// Patient table
export const patients = sqliteTable('Patient', {
  id: text('id').primaryKey().$defaultFn(() => generateCuid()),
  name: text('name').notNull(),
  profilePhoto: text('profilePhoto'),
  birthDate: integer('birthDate', { mode: 'timestamp' }).notNull(),
  gender: text('gender').notNull(),
  cpf: text('cpf'),
  rg: text('rg'),
  religion: text('religion').notNull(),
  legalGuardian: text('legalGuardian'),
  legalGuardianEmail: text('legalGuardianEmail'),
  legalGuardianCpf: text('legalGuardianCpf'),
  phone1: text('phone1').notNull(),
  phone2: text('phone2'),
  email: text('email'),
  hasTherapyHistory: integer('hasTherapyHistory', { mode: 'boolean' }).notNull(),
  therapyHistoryDetails: text('therapyHistoryDetails'),
  therapyReason: text('therapyReason'),
  takesMedication: integer('takesMedication', { mode: 'boolean' }).notNull(),
  medicationSince: text('medicationSince'),
  medicationNames: text('medicationNames'),
  hasHospitalization: integer('hasHospitalization', { mode: 'boolean' }).notNull(),
  hospitalizationDate: text('hospitalizationDate'),
  hospitalizationReason: text('hospitalizationReason'),
  consultationPrice: real('consultationPrice'),
  consultationFrequency: text('consultationFrequency'),
  consultationDay: text('consultationDay'),
  credits: integer('credits').notNull().default(0),
  createdAt: integer('createdAt', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer('updatedAt', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
}, (table) => [
  index('Patient_name_idx').on(table.name),
  index('Patient_birthDate_idx').on(table.birthDate),
  index('Patient_credits_idx').on(table.credits),
  index('Patient_createdAt_idx').on(table.createdAt),
  index('Patient_name_createdAt_idx').on(table.name, table.createdAt),
])

// Consultation table
export const consultations = sqliteTable('Consultation', {
  id: text('id').primaryKey().$defaultFn(() => generateCuid()),
  patientId: text('patientId').notNull().references(() => patients.id),
  startedAt: integer('startedAt', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  finishedAt: integer('finishedAt', { mode: 'timestamp' }),
  paidAt: integer('paidAt', { mode: 'timestamp' }),
  status: text('status').notNull().default('OPEN'),
  content: text('content').notNull().default(''),
  notes: text('notes').notNull().default(''),
  price: real('price').notNull(),
  paid: integer('paid', { mode: 'boolean' }).notNull().default(false),
  createdAt: integer('createdAt', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer('updatedAt', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
}, (table) => [
  index('Consultation_patientId_idx').on(table.patientId),
  index('Consultation_status_idx').on(table.status),
  index('Consultation_paid_idx').on(table.paid),
  index('Consultation_startedAt_idx').on(table.startedAt),
  index('Consultation_createdAt_idx').on(table.createdAt),
  index('Consultation_patientId_status_idx').on(table.patientId, table.status),
  index('Consultation_status_startedAt_idx').on(table.status, table.startedAt),
])

// Relations
export const patientsRelations = relations(patients, ({ many }) => ({
  consultations: many(consultations),
}))

export const consultationsRelations = relations(consultations, ({ one }) => ({
  patient: one(patients, {
    fields: [consultations.patientId],
    references: [patients.id],
  }),
}))

// CUID generator (simple implementation)
function generateCuid(): string {
  const timestamp = Date.now().toString(36)
  const randomPart = Math.random().toString(36).substring(2, 15)
  return `c${timestamp}${randomPart}`
}

// Type exports
export type Patient = typeof patients.$inferSelect
export type NewPatient = typeof patients.$inferInsert
export type Consultation = typeof consultations.$inferSelect
export type NewConsultation = typeof consultations.$inferInsert
