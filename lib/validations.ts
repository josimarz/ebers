import { z } from 'zod'
import { sanitizeText, sanitizeName, sanitizeEmail, sanitizePhone, sanitizeDocument, sanitizeUrl } from '@/lib/sanitization'

// TypeScript enums for type safety
export enum Gender {
  MALE = 'MALE',
  FEMALE = 'FEMALE',
  NON_BINARY = 'NON_BINARY'
}

export enum Religion {
  ATHEIST = 'ATHEIST',
  BUDDHISM = 'BUDDHISM',
  CANDOMBLE = 'CANDOMBLE',
  CATHOLIC = 'CATHOLIC',
  SPIRITIST = 'SPIRITIST',
  SPIRITUALIST = 'SPIRITUALIST',
  EVANGELICAL = 'EVANGELICAL',
  HINDUISM = 'HINDUISM',
  ISLAM = 'ISLAM',
  JUDAISM = 'JUDAISM',
  MORMON = 'MORMON',
  NO_RELIGION = 'NO_RELIGION',
  JEHOVAH_WITNESS = 'JEHOVAH_WITNESS',
  UMBANDA = 'UMBANDA'
}

export enum ConsultationFrequency {
  WEEKLY = 'WEEKLY',
  BIWEEKLY = 'BIWEEKLY',
  MONTHLY = 'MONTHLY',
  SPORADIC = 'SPORADIC'
}

export enum DayOfWeek {
  MONDAY = 'MONDAY',
  TUESDAY = 'TUESDAY',
  WEDNESDAY = 'WEDNESDAY',
  THURSDAY = 'THURSDAY',
  FRIDAY = 'FRIDAY',
  SATURDAY = 'SATURDAY',
  SUNDAY = 'SUNDAY'
}

export enum ConsultationStatus {
  OPEN = 'OPEN',
  FINALIZED = 'FINALIZED'
}

// Zod enums for validation
export const GenderEnum = z.enum(['MALE', 'FEMALE', 'NON_BINARY'], {
  errorMap: () => ({ message: 'Gênero é obrigatório' })
})
export const ReligionEnum = z.enum([
  'ATHEIST',
  'BUDDHISM', 
  'CANDOMBLE',
  'CATHOLIC',
  'SPIRITIST',
  'SPIRITUALIST',
  'EVANGELICAL',
  'HINDUISM',
  'ISLAM',
  'JUDAISM',
  'MORMON',
  'NO_RELIGION',
  'JEHOVAH_WITNESS',
  'UMBANDA'
], {
  errorMap: () => ({ message: 'Religião é obrigatória' })
})
export const ConsultationFrequencyEnum = z.enum(['WEEKLY', 'BIWEEKLY', 'MONTHLY', 'SPORADIC'])
export const DayOfWeekEnum = z.enum(['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'])
export const ConsultationStatusEnum = z.enum(['OPEN', 'FINALIZED'])

// Enhanced validation schemas with sanitization
const SanitizedString = z.string().transform(sanitizeText)
const SanitizedName = z.string().transform(sanitizeName)
const SanitizedEmail = z.string().transform(sanitizeEmail).pipe(z.string().email('Email inválido'))
const SanitizedPhone = z.string().transform(sanitizePhone)
const SanitizedDocument = z.string().transform(sanitizeDocument)
const SanitizedUrl = z.string().transform(sanitizeUrl).pipe(z.string().url('URL inválida'))

// Utility validation schemas
const NonEmptyString = z.string().min(1, 'Campo obrigatório').transform(sanitizeText)
const OptionalEmail = z.preprocess(
  (val) => {
    if (val === null || val === undefined || val === '') return undefined
    return val
  },
  z.string().transform(sanitizeEmail).pipe(z.string().email('Email inválido')).optional()
)
const PositiveNumber = z.number().positive('Valor deve ser positivo')
const NonNegativeInteger = z.number().int().min(0, 'Valor não pode ser negativo')

// Patient validation schema - comprehensive validation for all patient data
export const PatientSchema = z.object({
  // Required fields (Requirements 1.1)
  name: z.string().min(1, 'Nome é obrigatório').max(255, 'Nome muito longo').transform(sanitizeName).refine(val => val.length > 0, 'Nome é obrigatório'),
  birthDate: z.union([
    z.string().min(1, 'Data de nascimento é obrigatória').refine((str) => {
      if (!str) return false;
      const date = new Date(str);
      return !isNaN(date.getTime());
    }, 'Data inválida').transform((str) => {
      return new Date(str);
    }),
    z.date()
  ]).pipe(z.date({
    required_error: 'Data de nascimento é obrigatória',
    invalid_type_error: 'Data inválida'
  })).refine((date) => {
    const now = new Date()
    const minDate = new Date(now.getFullYear() - 120, 0, 1) // 120 years ago
    const maxDate = new Date() // Today
    return date >= minDate && date <= maxDate
  }, {
    message: 'Data inválida'
  }),
  gender: GenderEnum,
  religion: ReligionEnum,
  phone1: z.string().min(1, 'Telefone é obrigatório').max(20, 'Telefone muito longo').transform(sanitizePhone).refine(val => val.length > 0, 'Telefone é obrigatório'),
  hasTherapyHistory: z.boolean(),
  takesMedication: z.boolean(),
  hasHospitalization: z.boolean(),

  // Required document field
  cpf: z.string().min(1, 'CPF é obrigatório').max(14, 'CPF muito longo').transform(sanitizeDocument).refine(val => val.length > 0, 'CPF é obrigatório'),

  // Optional fields (Requirements 1.2)
  profilePhoto: z.string().transform(sanitizeUrl).refine(
    (val) => !val || val.startsWith('data:image/') || val.startsWith('http://') || val.startsWith('https://'),
    'URL da foto inválida'
  ).optional(),
  rg: z.string().max(20, 'RG muito longo').transform(sanitizeDocument).optional(),
  legalGuardian: z.string().max(255, 'Nome do responsável muito longo').transform(sanitizeName).optional(),
  legalGuardianEmail: OptionalEmail,
  legalGuardianCpf: z.string().max(14, 'CPF do responsável muito longo').transform(sanitizeDocument).optional(),
  phone2: z.string().max(20, 'Telefone muito longo').transform(sanitizePhone).optional(),
  email: OptionalEmail,
  therapyHistoryDetails: z.string().max(1000, 'Detalhes muito longos').transform(sanitizeText).optional(),
  therapyReason: z.string().max(1000, 'Motivo muito longo').transform(sanitizeText).optional(),
  medicationSince: z.string().max(100, 'Texto muito longo').transform(sanitizeText).optional(),
  medicationNames: z.string().max(500, 'Lista de medicamentos muito longa').transform(sanitizeText).optional(),
  hospitalizationDate: z.string().max(100, 'Data muito longa').transform(sanitizeText).optional(),
  hospitalizationReason: z.string().max(500, 'Razão muito longa').transform(sanitizeText).optional(),
  
  // Consultation pricing validation (Requirements 1.4) - Must be positive
  consultationPrice: z.number().positive('Valor deve ser maior que zero').max(99999.99, 'Valor muito alto').optional(),
  consultationFrequency: ConsultationFrequencyEnum.optional(),
  consultationDay: DayOfWeekEnum.optional(),
  
  // Credits validation (Requirements 1.5)
  credits: NonNegativeInteger.default(0)
}).refine((data) => {
  // Conditional guardian email validation (Requirements 1.3)
  if (data.legalGuardian && data.legalGuardian.trim() !== '') {
    if (!data.legalGuardianEmail || data.legalGuardianEmail.trim() === '') {
      return false
    }
  }
  return true
}, {
  message: 'Email do responsável é obrigatório quando responsável é informado',
  path: ['legalGuardianEmail']
})

// iPad-specific patient schema (excludes restricted fields for iPad registration)
export const PatientIpadSchema = z.object({
  // Required fields (Requirements 1.1)
  name: z.string().min(1, 'Nome é obrigatório').max(255, 'Nome muito longo').transform(sanitizeName),
  birthDate: z.union([
    z.string().min(1, 'Data de nascimento é obrigatória').transform((str) => {
      if (!str) throw new Error('Data de nascimento é obrigatória');
      const date = new Date(str);
      if (isNaN(date.getTime())) throw new Error('Data inválida');
      return date;
    }),
    z.date()
  ]).pipe(z.date({
    required_error: 'Data de nascimento é obrigatória',
    invalid_type_error: 'Data inválida'
  })),
  gender: GenderEnum,
  religion: ReligionEnum,
  phone1: z.string().min(1, 'Telefone é obrigatório').max(20, 'Telefone muito longo').transform(sanitizePhone),
  hasTherapyHistory: z.boolean(),
  takesMedication: z.boolean(),
  hasHospitalization: z.boolean(),

  // Required document field
  cpf: z.string().min(1, 'CPF é obrigatório').max(14, 'CPF muito longo').transform(sanitizeDocument).refine(val => val.length > 0, 'CPF é obrigatório'),

  // Optional fields (Requirements 1.2) - excluding iPad-restricted fields
  profilePhoto: z.string().transform(sanitizeUrl).refine(
    (val) => !val || val.startsWith('data:image/') || val.startsWith('http://') || val.startsWith('https://'),
    'URL da foto inválida'
  ).optional(),
  rg: z.string().max(20, 'RG muito longo').transform(sanitizeDocument).optional(),
  legalGuardian: z.string().max(255, 'Nome do responsável muito longo').transform(sanitizeName).optional(),
  legalGuardianEmail: OptionalEmail,
  legalGuardianCpf: z.string().max(14, 'CPF do responsável muito longo').transform(sanitizeDocument).optional(),
  phone2: z.string().max(20, 'Telefone muito longo').transform(sanitizePhone).optional(),
  email: OptionalEmail,
  therapyHistoryDetails: z.string().max(1000, 'Detalhes muito longos').transform(sanitizeText).optional(),
  therapyReason: z.string().max(1000, 'Motivo muito longo').transform(sanitizeText).optional(),
  medicationSince: z.string().max(100, 'Texto muito longo').transform(sanitizeText).optional(),
  medicationNames: z.string().max(500, 'Lista de medicamentos muito longa').transform(sanitizeText).optional(),
  hospitalizationDate: z.string().max(100, 'Data muito longa').transform(sanitizeText).optional(),
  hospitalizationReason: z.string().max(500, 'Razão muito longa').transform(sanitizeText).optional()
  // Note: consultationPrice, consultationFrequency, consultationDay, and credits are excluded for iPad
}).refine((data) => {
  // Conditional guardian email validation (Requirements 1.3)
  if (data.legalGuardian && data.legalGuardian.trim() !== '') {
    if (!data.legalGuardianEmail || data.legalGuardianEmail.trim() === '') {
      return false
    }
  }
  return true
}, {
  message: 'Email do responsável é obrigatório quando responsável é informado',
  path: ['legalGuardianEmail']
})

// Consultation validation schema - comprehensive validation for consultation data
export const ConsultationSchema = z.object({
  patientId: NonEmptyString,
  startedAt: z.date().default(() => new Date()),
  finishedAt: z.date().optional(),
  paidAt: z.date().optional(),
  status: ConsultationStatusEnum.default('OPEN'),
  content: z.string().max(10000, 'Conteúdo muito longo').default('').transform((content) => {
    // Rich text content will be sanitized by the sanitization layer
    return content
  }),
  notes: z.string().max(10000, 'Notas muito longas').default('').transform((notes) => {
    // Rich text notes will be sanitized by the sanitization layer
    return notes
  }),
  price: z.number().positive('Preço deve ser positivo').max(99999.99, 'Preço muito alto'),
  paid: z.boolean().default(false)
}).refine((data) => {
  // If consultation is finalized, it must have a finishedAt date
  if (data.status === 'FINALIZED' && !data.finishedAt) {
    return false
  }
  return true
}, {
  message: 'Data de finalização é obrigatória para consultas finalizadas',
  path: ['finishedAt']
}).refine((data) => {
  // If consultation is paid, it must have a paidAt date
  if (data.paid && !data.paidAt) {
    return false
  }
  return true
}, {
  message: 'Data de pagamento é obrigatória para consultas pagas',
  path: ['paidAt']
})

// Credit sales validation schema
export const CreditSalesSchema = z.object({
  patientId: NonEmptyString,
  quantity: z.number().int().min(1, 'Quantidade deve ser pelo menos 1').max(100, 'Quantidade muito alta'),
  unitPrice: PositiveNumber.max(99999.99, 'Preço unitário muito alto')
})

// Patient update schema (for partial updates)
export const PatientUpdateSchema = z.object({
  id: NonEmptyString,
  // All fields from PatientSchema but optional - accept null from database
  name: z.string().min(1, 'Nome é obrigatório').max(255, 'Nome muito longo').optional(),
  birthDate: z.union([z.date(), z.string().transform(str => new Date(str))]).optional(),
  gender: GenderEnum.optional(),
  religion: ReligionEnum.optional(),
  phone1: z.string().min(1, 'Telefone é obrigatório').max(20, 'Telefone muito longo').optional(),
  hasTherapyHistory: z.boolean().optional(),
  takesMedication: z.boolean().optional(),
  hasHospitalization: z.boolean().optional(),
  profilePhoto: z.string().nullable().optional(),
  cpf: z.string().max(14, 'CPF muito longo').nullable().optional(),
  rg: z.string().max(20, 'RG muito longo').nullable().optional(),
  legalGuardian: z.string().max(255, 'Nome do responsável muito longo').nullable().optional(),
  legalGuardianEmail: z.string().email('Email inválido').nullable().optional(),
  legalGuardianCpf: z.string().max(14, 'CPF do responsável muito longo').nullable().optional(),
  phone2: z.string().max(20, 'Telefone muito longo').nullable().optional(),
  email: z.string().email('Email inválido').nullable().optional(),
  therapyHistoryDetails: z.string().max(1000, 'Detalhes muito longos').nullable().optional(),
  medicationSince: z.string().max(100, 'Texto muito longo').nullable().optional(),
  medicationNames: z.string().max(500, 'Lista de medicamentos muito longa').nullable().optional(),
  hospitalizationDate: z.string().max(100, 'Data muito longa').nullable().optional(),
  hospitalizationReason: z.string().max(500, 'Razão muito longa').nullable().optional(),
  consultationPrice: z.number().positive('Valor deve ser positivo').max(99999.99, 'Valor muito alto').nullable().optional(),
  consultationFrequency: ConsultationFrequencyEnum.nullable().optional(),
  consultationDay: DayOfWeekEnum.nullable().optional(),
  credits: z.number().int().min(0, 'Valor não pode ser negativo').optional()
}).transform((data) => {
  // Convert null values to undefined for cleaner handling
  const cleaned: Record<string, unknown> = { id: data.id };
  for (const [key, value] of Object.entries(data)) {
    if (key !== 'id' && value !== null && value !== undefined && value !== '') {
      cleaned[key] = value;
    }
  }
  return cleaned;
})

// Consultation update schema (for partial updates)
export const ConsultationUpdateSchema = z.object({
  id: NonEmptyString,
  // All fields from ConsultationSchema but optional
  patientId: z.string().min(1, 'ID do paciente é obrigatório').optional(),
  startedAt: z.date().optional(),
  finishedAt: z.date().optional(),
  paidAt: z.date().optional(),
  status: ConsultationStatusEnum.optional(),
  content: z.string().max(10000, 'Conteúdo muito longo').optional(),
  notes: z.string().max(10000, 'Notas muito longas').optional(),
  price: z.number().positive('Preço deve ser positivo').max(99999.99, 'Preço muito alto').optional(),
  paid: z.boolean().optional()
})

// Type exports
export type PatientInput = z.infer<typeof PatientSchema>
export type PatientIpadInput = z.infer<typeof PatientIpadSchema>
export type ConsultationInput = z.infer<typeof ConsultationSchema>
export type CreditSalesInput = z.infer<typeof CreditSalesSchema>
export type PatientUpdateInput = z.infer<typeof PatientUpdateSchema>
export type ConsultationUpdateInput = z.infer<typeof ConsultationUpdateSchema>

// Utility functions for data validation

/**
 * Validates patient data and returns validation result
 */
export function validatePatient(data: unknown): { success: true; data: PatientInput } | { success: false; error: z.ZodError } {
  const result = PatientSchema.safeParse(data)
  if (result.success) {
    return { success: true, data: result.data }
  }
  return { success: false, error: result.error }
}

/**
 * Validates patient data for iPad registration (excludes restricted fields)
 */
export function validatePatientIpad(data: unknown): { success: true; data: PatientIpadInput } | { success: false; error: z.ZodError } {
  const result = PatientIpadSchema.safeParse(data)
  if (result.success) {
    return { success: true, data: result.data }
  }
  return { success: false, error: result.error }
}

/**
 * Validates consultation data and returns validation result
 */
export function validateConsultation(data: unknown): { success: true; data: ConsultationInput } | { success: false; error: z.ZodError } {
  const result = ConsultationSchema.safeParse(data)
  if (result.success) {
    return { success: true, data: result.data }
  }
  return { success: false, error: result.error }
}

/**
 * Validates credit sales data and returns validation result
 */
export function validateCreditSales(data: unknown): { success: true; data: CreditSalesInput } | { success: false; error: z.ZodError } {
  const result = CreditSalesSchema.safeParse(data)
  if (result.success) {
    return { success: true, data: result.data }
  }
  return { success: false, error: result.error }
}

/**
 * Formats validation errors into user-friendly messages
 */
export function formatValidationErrors(error: z.ZodError): Record<string, string> {
  const errors: Record<string, string> = {}
  
  error.issues.forEach((issue) => {
    const path = issue.path.join('.')
    let message = issue.message
    
    // Translate common Zod error messages to Portuguese
    if (message.includes('Invalid enum value') || message === 'Required') {
      if (path === 'gender') {
        message = 'Gênero é obrigatório'
      } else if (path === 'religion') {
        message = 'Religião é obrigatória'
      } else if (path === 'name') {
        message = 'Nome é obrigatório'
      } else if (path === 'phone1') {
        message = 'Telefone é obrigatório'
      } else if (path === 'birthDate') {
        message = 'Data inválida'
      } else {
        message = 'Campo obrigatório'
      }
    } else if (path === 'birthDate' && (message.includes('Invalid date') || message === 'Data de nascimento inválida' || message.includes('Invalid input'))) {
      message = 'Data inválida'
    } else if ((path === 'email' || path === 'legalGuardianEmail') && (message.includes('Invalid') || message.includes('email'))) {
      message = 'Email inválido'
    } else if (message.includes('Required') || message === 'Campo obrigatório') {
      message = 'Campo obrigatório'
    } else if (message.includes('String must contain at least')) {
      if (path === 'name') {
        message = 'Nome é obrigatório'
      } else if (path === 'phone1') {
        message = 'Telefone é obrigatório'
      } else {
        message = 'Campo obrigatório'
      }
    }
    
    errors[path] = message
  })
  
  return errors
}

/**
 * Checks if a patient has valid consultation pricing for credit sales
 */
export function canSellCredits(patient: { consultationPrice?: number | null }): boolean {
  return patient.consultationPrice != null && patient.consultationPrice > 0
}

/**
 * Calculates total cost for credit sales
 */
export function calculateCreditSalesTotal(quantity: number, unitPrice: number): number {
  if (quantity <= 0 || unitPrice <= 0) {
    throw new Error('Quantidade e preço unitário devem ser positivos')
  }
  return quantity * unitPrice
}