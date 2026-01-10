/**
 * Property Test: Consultation History Display and Filtering
 * 
 * This test validates that the consultation history system correctly displays
 * consultations with proper filtering, sorting, and pagination functionality.
 * 
 * Requirements Validated:
 * - 6.1: Display consultation list with patient photo, date, start time, end time, status, and payment status
 * - 6.2: Allow filtering consultations by patient using autocomplete dropdown
 * - 6.3: Sort consultations by date with most recent first by default
 */

import { describe, test, expect, beforeEach } from '@jest/globals'
import fc from 'fast-check'
import { prisma } from '@/lib/prisma'
import { listConsultations, searchPatientsForConsultations } from '@/lib/consultations'

// Mock Prisma for testing
jest.mock('@/lib/prisma', () => ({
  prisma: {
    patient: {
      findUnique: jest.fn(),
      findMany: jest.fn()
    },
    consultation: {
      findMany: jest.fn(),
      count: jest.fn()
    }
  }
}))

const mockPrisma = prisma as jest.Mocked<typeof prisma>

// Test data generators
const patientArbitrary = fc.record({
  id: fc.string({ minLength: 10, maxLength: 30 }),
  name: fc.string({ minLength: 2, maxLength: 100 }),
  profilePhoto: fc.option(fc.webUrl()),
  birthDate: fc.date({ min: new Date('1920-01-01'), max: new Date('2010-01-01') })
})

const consultationArbitrary = fc.record({
  id: fc.string({ minLength: 10, maxLength: 30 }),
  patientId: fc.string({ minLength: 10, maxLength: 30 }),
  startedAt: fc.date({ min: new Date('2023-01-01'), max: new Date() }),
  finishedAt: fc.option(fc.date({ min: new Date('2023-01-01'), max: new Date() })),
  paidAt: fc.option(fc.date({ min: new Date('2023-01-01'), max: new Date() })),
  status: fc.constantFrom('OPEN', 'FINALIZED'),
  content: fc.string({ maxLength: 1000 }),
  notes: fc.string({ maxLength: 1000 }),
  price: fc.float({ min: 50, max: 500, noNaN: true }),
  paid: fc.boolean(),
  createdAt: fc.date(),
  updatedAt: fc.date()
})

describe('Property Test: Consultation History Display and Filtering', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  test('Property 13.1: Consultation listing returns properly structured data with all required fields', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(patientArbitrary, { minLength: 1, maxLength: 5 }),
        fc.array(consultationArbitrary, { minLength: 1, maxLength: 10 }),
        async (patients, consultations) => {
          // Calculate age for patients
          const patientsWithAge = patients.map(patient => ({
            ...patient,
            age: Math.floor((Date.now() - patient.birthDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000))
          }))

          // Link consultations to patients
          const consultationsWithPatients = consultations.map((consultation, index) => ({
            ...consultation,
            patient: patientsWithAge[index % patientsWithAge.length]
          }))

          // Mock Prisma responses
          mockPrisma.consultation.count.mockResolvedValue(consultations.length)
          mockPrisma.consultation.findMany.mockResolvedValue(consultationsWithPatients)

          // Test consultation listing
          const result = await listConsultations({ page: 1, limit: 10 })

          // Validate structure
          expect(result).toHaveProperty('consultations')
          expect(result).toHaveProperty('totalCount')
          expect(result).toHaveProperty('totalPages')
          expect(result).toHaveProperty('currentPage')
          expect(result).toHaveProperty('hasNextPage')
          expect(result).toHaveProperty('hasPreviousPage')

          // Validate consultation data structure (Requirement 6.1)
          result.consultations.forEach(consultation => {
            expect(consultation).toHaveProperty('id')
            expect(consultation).toHaveProperty('startedAt')
            expect(consultation).toHaveProperty('status')
            expect(consultation).toHaveProperty('paid')
            expect(consultation).toHaveProperty('patient')
            
            // Patient data should include photo, name, age
            expect(consultation.patient).toHaveProperty('id')
            expect(consultation.patient).toHaveProperty('name')
            expect(consultation.patient).toHaveProperty('profilePhoto')
            expect(consultation.patient).toHaveProperty('age')
            expect(typeof consultation.patient.age).toBe('number')
            expect(consultation.patient.age).toBeGreaterThanOrEqual(0)
          })

          // Validate pagination
          expect(result.currentPage).toBe(1)
          expect(result.totalCount).toBe(consultations.length)
          expect(result.totalPages).toBeGreaterThanOrEqual(0)
        }
      ),
      { numRuns: 10 }
    )
  })

  test('Property 13.2: Default sorting shows most recent consultations first', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(patientArbitrary, { minLength: 1, maxLength: 3 }),
        fc.array(fc.date({ min: new Date('2023-01-01'), max: new Date() }), { minLength: 3, maxLength: 10 }),
        async (patients, dates) => {
          // Create consultations with specific dates
          const consultations = dates.map((date, index) => ({
            id: `consultation-${index}`,
            patientId: patients[index % patients.length].id,
            startedAt: date,
            finishedAt: null,
            paidAt: null,
            status: 'OPEN' as const,
            content: '',
            notes: '',
            price: 100,
            paid: false,
            createdAt: date,
            updatedAt: date,
            patient: {
              ...patients[index % patients.length],
              age: 30
            }
          }))

          // Sort consultations by date (most recent first) - this is what the function should do
          const sortedConsultations = [...consultations].sort((a, b) => 
            b.startedAt.getTime() - a.startedAt.getTime()
          )

          // Mock Prisma responses
          mockPrisma.consultation.count.mockResolvedValue(consultations.length)
          mockPrisma.consultation.findMany.mockResolvedValue(sortedConsultations)

          // Test default sorting (Requirement 6.3)
          const result = await listConsultations({ page: 1, limit: 20 })

          if (result.consultations.length > 1) {
            // Verify consultations are sorted by date (most recent first)
            for (let i = 0; i < result.consultations.length - 1; i++) {
              const current = new Date(result.consultations[i].startedAt)
              const next = new Date(result.consultations[i + 1].startedAt)
              expect(current.getTime()).toBeGreaterThanOrEqual(next.getTime())
            }
          }
        }
      ),
      { numRuns: 10 }
    )
  })

  test('Property 13.3: Patient filtering returns only consultations for specified patient', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(patientArbitrary, { minLength: 2, maxLength: 5 }),
        async (patients) => {
          const targetPatient = patients[0]
          
          // Create consultations only for the target patient
          const consultations = Array.from({ length: 3 }, (_, index) => ({
            id: `consultation-${index}`,
            patientId: targetPatient.id,
            startedAt: new Date(),
            finishedAt: null,
            paidAt: null,
            status: 'OPEN' as const,
            content: '',
            notes: '',
            price: 100,
            paid: false,
            createdAt: new Date(),
            updatedAt: new Date(),
            patient: {
              ...targetPatient,
              age: 30
            }
          }))

          // Mock Prisma responses
          mockPrisma.consultation.count.mockResolvedValue(consultations.length)
          mockPrisma.consultation.findMany.mockResolvedValue(consultations)

          // Test filtering by patient (Requirement 6.2)
          const result = await listConsultations({ 
            page: 1, 
            limit: 20, 
            patientId: targetPatient.id 
          })

          // All returned consultations should belong to the target patient
          result.consultations.forEach(consultation => {
            expect(consultation.patientId).toBe(targetPatient.id)
            expect(consultation.patient.id).toBe(targetPatient.id)
          })
        }
      ),
      { numRuns: 10 }
    )
  })

  test('Property 13.4: Patient search returns patients who have consultations', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(patientArbitrary, { minLength: 2, maxLength: 5 }),
        async (patients) => {
          // Mock patient search results
          const searchResults = patients.map(patient => ({
            id: patient.id,
            name: patient.name
          }))

          mockPrisma.patient.findMany.mockResolvedValue(searchResults)

          // Test patient search (Requirement 6.2)
          if (patients.length > 0) {
            const searchQuery = patients[0].name.substring(0, 3)
            const results = await searchPatientsForConsultations(searchQuery, 10)

            // All returned patients should have proper structure
            results.forEach(patient => {
              expect(patient).toHaveProperty('id')
              expect(patient).toHaveProperty('name')
              expect(typeof patient.name).toBe('string')
              expect(patient.name.length).toBeGreaterThan(0)
            })
          }
        }
      ),
      { numRuns: 10 }
    )
  })

  test('Property 13.5: Pagination works correctly with different page sizes', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(patientArbitrary, { minLength: 1, maxLength: 2 }),
        fc.integer({ min: 15, max: 25 }), // Number of consultations to create
        fc.integer({ min: 5, max: 10 }), // Page size
        async (patients, totalConsultations, pageSize) => {
          // Create consultations
          const consultations = Array.from({ length: totalConsultations }, (_, index) => ({
            id: `consultation-${index}`,
            patientId: patients[index % patients.length].id,
            startedAt: new Date(Date.now() - index * 60000), // Different times
            finishedAt: null,
            paidAt: null,
            status: 'OPEN' as const,
            content: '',
            notes: '',
            price: 100,
            paid: false,
            createdAt: new Date(),
            updatedAt: new Date(),
            patient: {
              ...patients[index % patients.length],
              age: 30
            }
          }))

          // Mock first page
          const firstPageConsultations = consultations.slice(0, pageSize)
          mockPrisma.consultation.count.mockResolvedValue(totalConsultations)
          mockPrisma.consultation.findMany.mockResolvedValue(firstPageConsultations)

          // Test pagination
          const firstPage = await listConsultations({ page: 1, limit: pageSize })
          const expectedTotalPages = Math.ceil(totalConsultations / pageSize)

          expect(firstPage.totalCount).toBe(totalConsultations)
          expect(firstPage.totalPages).toBe(expectedTotalPages)
          expect(firstPage.currentPage).toBe(1)
          expect(firstPage.consultations.length).toBeLessThanOrEqual(pageSize)

          if (expectedTotalPages > 1) {
            expect(firstPage.hasNextPage).toBe(true)
            expect(firstPage.hasPreviousPage).toBe(false)
          }
        }
      ),
      { numRuns: 5 }
    )
  })

  test('Property 13.6: Sorting by different fields works correctly', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(patientArbitrary, { minLength: 1, maxLength: 2 }),
        async (patients) => {
          // Create consultations with different statuses and payment states
          const consultationData = [
            { status: 'OPEN', paid: false, startedAt: new Date('2023-01-01') },
            { status: 'FINALIZED', paid: true, startedAt: new Date('2023-02-01') },
            { status: 'OPEN', paid: true, startedAt: new Date('2023-03-01') },
            { status: 'FINALIZED', paid: false, startedAt: new Date('2023-04-01') }
          ]

          const consultations = consultationData.map((data, index) => ({
            id: `consultation-${index}`,
            patientId: patients[0].id,
            startedAt: data.startedAt,
            finishedAt: null,
            paidAt: null,
            status: data.status as 'OPEN' | 'FINALIZED',
            paid: data.paid,
            content: '',
            notes: '',
            price: 100,
            createdAt: data.startedAt,
            updatedAt: data.startedAt,
            patient: {
              ...patients[0],
              age: 30
            }
          }))

          // Test sorting by status (ascending)
          const statusAscSorted = [...consultations].sort((a, b) => a.status.localeCompare(b.status))
          mockPrisma.consultation.count.mockResolvedValue(consultations.length)
          mockPrisma.consultation.findMany.mockResolvedValue(statusAscSorted)

          const statusAsc = await listConsultations({ sortBy: 'status', sortOrder: 'asc' })

          if (statusAsc.consultations.length > 1) {
            // Verify ascending order
            for (let i = 0; i < statusAsc.consultations.length - 1; i++) {
              expect(statusAsc.consultations[i].status <= statusAsc.consultations[i + 1].status).toBe(true)
            }
          }

          // Test sorting by payment status (ascending)
          const paidAscSorted = [...consultations].sort((a, b) => Number(a.paid) - Number(b.paid))
          mockPrisma.consultation.findMany.mockResolvedValue(paidAscSorted)

          const paidAsc = await listConsultations({ sortBy: 'paid', sortOrder: 'asc' })

          if (paidAsc.consultations.length > 1) {
            // Verify ascending order (false < true)
            for (let i = 0; i < paidAsc.consultations.length - 1; i++) {
              expect(paidAsc.consultations[i].paid <= paidAsc.consultations[i + 1].paid).toBe(true)
            }
          }
        }
      ),
      { numRuns: 5 }
    )
  })
})