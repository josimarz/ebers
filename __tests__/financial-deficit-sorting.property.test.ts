/**
 * Property-based tests for financial deficit sorting
 * Feature: patient-management-system, Property 16: Financial Deficit Sorting
 * Validates: Requirements 7.3
 */

import fc from 'fast-check'
import { getFinancialOverview } from '@/lib/financial'
import { prisma } from '@/lib/prisma'

// Mock Prisma for testing
jest.mock('@/lib/prisma', () => ({
  prisma: {
    patient: {
      findMany: jest.fn(),
      count: jest.fn(),
      aggregate: jest.fn()
    },
    consultation: {
      count: jest.fn()
    },
    $disconnect: jest.fn()
  }
}))

const mockPrisma = prisma as jest.Mocked<typeof prisma>

// Test setup
beforeEach(() => {
  jest.clearAllMocks()
})

// Generators for test data
const patientWithFinancialDataGenerator = fc.record({
  id: fc.string({ minLength: 10, maxLength: 20 }),
  name: fc.string({ minLength: 1, maxLength: 100 }),
  birthDate: fc.date({ min: new Date('1920-01-01'), max: new Date('2020-01-01') }),
  profilePhoto: fc.option(fc.string(), { nil: null }),
  credits: fc.integer({ min: 0, max: 100 }),
  consultations: fc.array(
    fc.record({
      id: fc.string({ minLength: 10, maxLength: 20 }),
      paid: fc.boolean()
    }),
    { minLength: 0, maxLength: 20 }
  )
})

describe('Financial Deficit Sorting Property Tests', () => {
  /**
   * Property 16: Financial Deficit Sorting
   * For any patient dataset, the system should sort patients by payment deficit 
   * (total minus paid consultations) in descending order
   * Validates: Requirements 7.3
   */
  test('patients are sorted by payment deficit in descending order (worst first)', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(patientWithFinancialDataGenerator, { minLength: 2, maxLength: 10 }),
        async (patientsData) => {
          // Mock database response
          mockPrisma.patient.findMany.mockResolvedValue(patientsData)

          // Get financial overview sorted by payment deficit (descending - default)
          const overview = await getFinancialOverview({ 
            page: 1, 
            limit: 100, 
            sortBy: 'paymentDeficit', 
            sortOrder: 'desc' 
          })

          // Verify sorting is correct - each patient should have >= deficit than the next
          for (let i = 0; i < overview.patients.length - 1; i++) {
            const currentPatient = overview.patients[i]
            const nextPatient = overview.patients[i + 1]
            
            // Current patient should have >= payment deficit than next patient (descending order)
            expect(currentPatient.paymentDeficit).toBeGreaterThanOrEqual(nextPatient.paymentDeficit)
            
            // Verify deficit calculation is correct
            expect(currentPatient.paymentDeficit).toBe(
              currentPatient.totalConsultations - currentPatient.paidConsultations
            )
            expect(nextPatient.paymentDeficit).toBe(
              nextPatient.totalConsultations - nextPatient.paidConsultations
            )
          }

          // Verify that patients with higher deficits appear first
          const sortedDeficits = overview.patients.map(p => p.paymentDeficit)
          const expectedSortedDeficits = [...sortedDeficits].sort((a, b) => b - a) // Descending
          expect(sortedDeficits).toEqual(expectedSortedDeficits)
        }
      ),
      { numRuns: 100 }
    )
  }, 30000)

  /**
   * Property: Patients are sorted by payment deficit in ascending order when requested
   * For any patient dataset, when sorting ascending, patients with lower deficits should come first
   */
  test('patients are sorted by payment deficit in ascending order (best first)', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(patientWithFinancialDataGenerator, { minLength: 2, maxLength: 10 }),
        async (patientsData) => {
          // Mock database response
          mockPrisma.patient.findMany.mockResolvedValue(patientsData)

          // Get financial overview sorted by payment deficit (ascending)
          const overview = await getFinancialOverview({ 
            page: 1, 
            limit: 100, 
            sortBy: 'paymentDeficit', 
            sortOrder: 'asc' 
          })

          // Verify sorting is correct - each patient should have <= deficit than the next
          for (let i = 0; i < overview.patients.length - 1; i++) {
            const currentPatient = overview.patients[i]
            const nextPatient = overview.patients[i + 1]
            
            // Current patient should have <= payment deficit than next patient (ascending order)
            expect(currentPatient.paymentDeficit).toBeLessThanOrEqual(nextPatient.paymentDeficit)
            
            // Verify deficit calculation is correct
            expect(currentPatient.paymentDeficit).toBe(
              currentPatient.totalConsultations - currentPatient.paidConsultations
            )
            expect(nextPatient.paymentDeficit).toBe(
              nextPatient.totalConsultations - nextPatient.paidConsultations
            )
          }

          // Verify that patients with lower deficits appear first
          const sortedDeficits = overview.patients.map(p => p.paymentDeficit)
          const expectedSortedDeficits = [...sortedDeficits].sort((a, b) => a - b) // Ascending
          expect(sortedDeficits).toEqual(expectedSortedDeficits)
        }
      ),
      { numRuns: 100 }
    )
  }, 30000)

  /**
   * Property: Sorting by name should maintain alphabetical order
   * For any patient dataset, when sorting by name, patients should be in alphabetical order
   */
  test('patients are sorted by name in correct alphabetical order', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(patientWithFinancialDataGenerator, { minLength: 2, maxLength: 10 }),
        async (patientsData) => {
          // Mock database response
          mockPrisma.patient.findMany.mockResolvedValue(patientsData)

          // Get financial overview sorted by name (ascending)
          const overviewAsc = await getFinancialOverview({ 
            page: 1, 
            limit: 100, 
            sortBy: 'name', 
            sortOrder: 'asc' 
          })

          // Verify ascending name sorting
          for (let i = 0; i < overviewAsc.patients.length - 1; i++) {
            const currentPatient = overviewAsc.patients[i]
            const nextPatient = overviewAsc.patients[i + 1]
            
            // Current patient name should be <= next patient name (alphabetical order)
            expect(currentPatient.name.localeCompare(nextPatient.name)).toBeLessThanOrEqual(0)
          }

          // Mock database response again for descending test
          mockPrisma.patient.findMany.mockResolvedValue(patientsData)

          // Get financial overview sorted by name (descending)
          const overviewDesc = await getFinancialOverview({ 
            page: 1, 
            limit: 100, 
            sortBy: 'name', 
            sortOrder: 'desc' 
          })

          // Verify descending name sorting
          for (let i = 0; i < overviewDesc.patients.length - 1; i++) {
            const currentPatient = overviewDesc.patients[i]
            const nextPatient = overviewDesc.patients[i + 1]
            
            // Current patient name should be >= next patient name (reverse alphabetical order)
            expect(currentPatient.name.localeCompare(nextPatient.name)).toBeGreaterThanOrEqual(0)
          }
        }
      ),
      { numRuns: 100 }
    )
  }, 30000)

  /**
   * Property: Patients with same deficit should maintain stable sort order
   * For any patients with identical payment deficits, their relative order should be consistent
   */
  test('patients with same deficit maintain stable sort order', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 0, max: 10 }), // Same deficit for all patients
        fc.array(
          fc.record({
            id: fc.string({ minLength: 10, maxLength: 20 }),
            name: fc.string({ minLength: 1, maxLength: 100 }),
            birthDate: fc.date({ min: new Date('1920-01-01'), max: new Date('2020-01-01') }),
            profilePhoto: fc.option(fc.string(), { nil: null }),
            credits: fc.integer({ min: 0, max: 100 })
          }),
          { minLength: 3, maxLength: 8 }
        ),
        async (commonDeficit, patientsBaseData) => {
          // Create patients with the same payment deficit
          const patientsData = patientsBaseData.map(patient => ({
            ...patient,
            consultations: Array.from({ length: commonDeficit + 5 }, (_, i) => ({
              id: `consultation-${i}`,
              paid: i < 5 // First 5 are paid, rest are unpaid (creating the same deficit)
            }))
          }))

          // Mock database response
          mockPrisma.patient.findMany.mockResolvedValue(patientsData)

          // Get financial overview sorted by payment deficit
          const overview1 = await getFinancialOverview({ 
            page: 1, 
            limit: 100, 
            sortBy: 'paymentDeficit', 
            sortOrder: 'desc' 
          })

          // Mock database response again
          mockPrisma.patient.findMany.mockResolvedValue(patientsData)

          // Get financial overview again with same sorting
          const overview2 = await getFinancialOverview({ 
            page: 1, 
            limit: 100, 
            sortBy: 'paymentDeficit', 
            sortOrder: 'desc' 
          })

          // All patients should have the same deficit
          overview1.patients.forEach(patient => {
            expect(patient.paymentDeficit).toBe(commonDeficit)
          })

          overview2.patients.forEach(patient => {
            expect(patient.paymentDeficit).toBe(commonDeficit)
          })

          // The order should be consistent between calls (stable sort)
          expect(overview1.patients.map(p => p.id)).toEqual(overview2.patients.map(p => p.id))
        }
      ),
      { numRuns: 50 }
    )
  }, 30000)

  /**
   * Property: Sorting preserves all patient data integrity
   * For any patient dataset and sort order, all patient data should be preserved correctly
   */
  test('sorting preserves all patient data integrity', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(patientWithFinancialDataGenerator, { minLength: 1, maxLength: 10 }),
        fc.constantFrom('paymentDeficit', 'name'),
        fc.constantFrom('asc', 'desc'),
        async (patientsData, sortBy, sortOrder) => {
          // Mock database response
          mockPrisma.patient.findMany.mockResolvedValue(patientsData)

          // Get financial overview with specified sorting
          const overview = await getFinancialOverview({ 
            page: 1, 
            limit: 100, 
            sortBy: sortBy as 'paymentDeficit' | 'name', 
            sortOrder: sortOrder as 'asc' | 'desc'
          })

          // Verify all original patients are present
          expect(overview.patients).toHaveLength(patientsData.length)

          // Verify each patient's data integrity
          patientsData.forEach(originalPatient => {
            const foundPatient = overview.patients.find(p => p.id === originalPatient.id)
            expect(foundPatient).toBeDefined()

            if (foundPatient) {
              // Verify core data is preserved
              expect(foundPatient.name).toBe(originalPatient.name)
              expect(foundPatient.birthDate).toEqual(originalPatient.birthDate)
              expect(foundPatient.profilePhoto).toBe(originalPatient.profilePhoto)
              expect(foundPatient.availableCredits).toBe(originalPatient.credits)

              // Verify calculated fields are correct
              const expectedTotalConsultations = originalPatient.consultations.length
              const expectedPaidConsultations = originalPatient.consultations.filter(c => c.paid).length
              const expectedDeficit = expectedTotalConsultations - expectedPaidConsultations

              expect(foundPatient.totalConsultations).toBe(expectedTotalConsultations)
              expect(foundPatient.paidConsultations).toBe(expectedPaidConsultations)
              expect(foundPatient.paymentDeficit).toBe(expectedDeficit)
              expect(foundPatient.hasPaymentIssues).toBe(expectedDeficit > 0)

              // Verify age calculation
              expect(foundPatient.age).toBeGreaterThanOrEqual(0)
              expect(foundPatient.age).toBeLessThan(150)
            }
          })
        }
      ),
      { numRuns: 100 }
    )
  }, 30000)

  /**
   * Property: Empty dataset sorting works correctly
   * For empty patient datasets, sorting should return empty results without errors
   */
  test('empty dataset sorting works correctly', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom('paymentDeficit', 'name'),
        fc.constantFrom('asc', 'desc'),
        async (sortBy, sortOrder) => {
          // Mock empty database response
          mockPrisma.patient.findMany.mockResolvedValue([])

          // Get financial overview with specified sorting
          const overview = await getFinancialOverview({ 
            page: 1, 
            limit: 100, 
            sortBy: sortBy as 'paymentDeficit' | 'name', 
            sortOrder: sortOrder as 'asc' | 'desc'
          })

          // Should return empty results without errors
          expect(overview.patients).toHaveLength(0)
          expect(overview.totalCount).toBe(0)
          expect(overview.totalPages).toBe(0)
          expect(overview.currentPage).toBe(1)
          expect(overview.hasNextPage).toBe(false)
          expect(overview.hasPreviousPage).toBe(false)
        }
      ),
      { numRuns: 20 }
    )
  }, 30000)
})