/**
 * Property-based tests for financial overview calculations
 * Feature: patient-management-system, Property 15: Financial Overview Calculations
 * Validates: Requirements 7.1, 7.2
 */

import fc from 'fast-check'
import { getFinancialOverview, getPatientFinancialData } from '@/lib/financial'
import { prisma } from '@/lib/prisma'

// Mock Prisma for testing
jest.mock('@/lib/prisma', () => ({
  prisma: {
    patient: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
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
const patientGenerator = fc.record({
  id: fc.string({ minLength: 10, maxLength: 20 }),
  name: fc.string({ minLength: 1, maxLength: 100 }),
  birthDate: fc.date({ min: new Date('1920-01-01'), max: new Date('2020-01-01') }),
  profilePhoto: fc.option(fc.string(), { nil: null }),
  credits: fc.integer({ min: 0, max: 100 })
})

const consultationGenerator = fc.record({
  id: fc.string({ minLength: 10, maxLength: 20 }),
  paid: fc.boolean()
})

describe('Financial Overview Calculations Property Tests', () => {
  /**
   * Property 15: Financial Overview Calculations
   * For any patient with consultations, the system should correctly calculate 
   * total consultations, paid consultations, available credits, and payment deficit
   * Validates: Requirements 7.1, 7.2
   */
  test('financial calculations are correct for any patient data', async () => {
    await fc.assert(
      fc.asyncProperty(
        patientGenerator,
        fc.array(consultationGenerator, { minLength: 0, maxLength: 10 }),
        async (patientData, consultationsData) => {
          // Mock patient with consultations
          const mockPatientWithConsultations = {
            ...patientData,
            consultations: consultationsData
          }

          // Mock database response
          mockPrisma.patient.findUnique.mockResolvedValue(mockPatientWithConsultations)

          // Get financial data
          const financialData = await getPatientFinancialData(patientData.id)

          // Verify calculations
          expect(financialData).not.toBeNull()
          if (financialData) {
            // Total consultations should match created consultations
            expect(financialData.totalConsultations).toBe(consultationsData.length)

            // Paid consultations should match count of paid consultations
            const expectedPaidConsultations = consultationsData.filter(c => c.paid).length
            expect(financialData.paidConsultations).toBe(expectedPaidConsultations)

            // Available credits should match patient credits
            expect(financialData.availableCredits).toBe(patientData.credits)

            // Payment deficit should be total - paid
            const expectedDeficit = consultationsData.length - expectedPaidConsultations
            expect(financialData.paymentDeficit).toBe(expectedDeficit)

            // Has payment issues should be true when deficit > 0 (Requirement 7.2)
            expect(financialData.hasPaymentIssues).toBe(expectedDeficit > 0)

            // Age calculation should be reasonable
            expect(financialData.age).toBeGreaterThanOrEqual(0)
            expect(financialData.age).toBeLessThan(150)

            // Patient data should match
            expect(financialData.id).toBe(patientData.id)
            expect(financialData.name).toBe(patientData.name)
            expect(financialData.birthDate).toEqual(patientData.birthDate)
            expect(financialData.profilePhoto).toBe(patientData.profilePhoto)
          }
        }
      ),
      { numRuns: 100 }
    )
  }, 30000)

  /**
   * Property: Financial overview list maintains calculation consistency
   * For any set of patients, the financial overview should maintain consistent calculations
   * across individual patient data and list data
   */
  test('financial overview list maintains calculation consistency', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.record({
            patient: patientGenerator,
            consultations: fc.array(consultationGenerator, { minLength: 0, maxLength: 5 })
          }),
          { minLength: 1, maxLength: 5 }
        ),
        async (patientsWithConsultations) => {
          // Mock patients with their consultations
          const mockPatients = patientsWithConsultations.map(({ patient, consultations }) => ({
            ...patient,
            consultations: consultations.map(c => ({ id: c.id, paid: c.paid }))
          }))

          // Mock database responses
          mockPrisma.patient.findMany.mockResolvedValue(mockPatients)
          
          // Mock individual patient lookups
          patientsWithConsultations.forEach(({ patient, consultations }) => {
            mockPrisma.patient.findUnique.mockResolvedValueOnce({
              ...patient,
              consultations: consultations.map(c => ({ id: c.id, paid: c.paid }))
            })
          })

          // Get financial overview
          const overview = await getFinancialOverview({ page: 1, limit: 100 })

          // Verify each patient in the overview matches individual calculations
          for (const { patient, consultations } of patientsWithConsultations) {
            const patientInOverview = overview.patients.find(p => p.id === patient.id)
            expect(patientInOverview).toBeDefined()

            if (patientInOverview) {
              const individualData = await getPatientFinancialData(patient.id)
              expect(individualData).not.toBeNull()

              if (individualData) {
                // All calculations should match between overview and individual data
                expect(patientInOverview.totalConsultations).toBe(individualData.totalConsultations)
                expect(patientInOverview.paidConsultations).toBe(individualData.paidConsultations)
                expect(patientInOverview.availableCredits).toBe(individualData.availableCredits)
                expect(patientInOverview.paymentDeficit).toBe(individualData.paymentDeficit)
                expect(patientInOverview.hasPaymentIssues).toBe(individualData.hasPaymentIssues)
                expect(patientInOverview.age).toBe(individualData.age)
              }
            }
          }
        }
      ),
      { numRuns: 50 }
    )
  }, 30000)

  /**
   * Property: Payment deficit calculation is always non-negative
   * For any patient, payment deficit should never be negative
   */
  test('payment deficit is always non-negative', async () => {
    await fc.assert(
      fc.asyncProperty(
        patientGenerator,
        fc.array(consultationGenerator, { minLength: 0, maxLength: 10 }),
        async (patientData, consultationsData) => {
          // Mock patient with consultations
          const mockPatientWithConsultations = {
            ...patientData,
            consultations: consultationsData
          }

          // Mock database response
          mockPrisma.patient.findUnique.mockResolvedValue(mockPatientWithConsultations)

          // Get financial data
          const financialData = await getPatientFinancialData(patientData.id)

          expect(financialData).not.toBeNull()
          if (financialData) {
            // Payment deficit should never be negative
            expect(financialData.paymentDeficit).toBeGreaterThanOrEqual(0)
            
            // Payment deficit should equal total - paid
            expect(financialData.paymentDeficit).toBe(
              financialData.totalConsultations - financialData.paidConsultations
            )
          }
        }
      ),
      { numRuns: 100 }
    )
  }, 30000)

  /**
   * Property: Financial sorting by payment deficit works correctly
   * For any set of patients, sorting by payment deficit should order them correctly
   * Validates: Requirements 7.3
   */
  test('financial sorting by payment deficit works correctly', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.record({
            patient: patientGenerator,
            consultations: fc.array(consultationGenerator, { minLength: 0, maxLength: 10 })
          }),
          { minLength: 2, maxLength: 10 }
        ),
        async (patientsWithConsultations) => {
          // Mock patients with their consultations
          const mockPatients = patientsWithConsultations.map(({ patient, consultations }) => ({
            ...patient,
            consultations: consultations.map(c => ({ id: c.id, paid: c.paid }))
          }))

          // Mock database responses
          mockPrisma.patient.findMany.mockResolvedValue(mockPatients)

          // Get financial overview sorted by payment deficit (descending - worst first)
          const overview = await getFinancialOverview({ 
            page: 1, 
            limit: 100, 
            sortBy: 'paymentDeficit', 
            sortOrder: 'desc' 
          })

          // Verify sorting is correct
          for (let i = 0; i < overview.patients.length - 1; i++) {
            const currentPatient = overview.patients[i]
            const nextPatient = overview.patients[i + 1]
            
            // Current patient should have >= payment deficit than next patient (descending order)
            expect(currentPatient.paymentDeficit).toBeGreaterThanOrEqual(nextPatient.paymentDeficit)
          }

          // Get financial overview sorted by payment deficit (ascending - best first)
          mockPrisma.patient.findMany.mockResolvedValue(mockPatients)
          const overviewAsc = await getFinancialOverview({ 
            page: 1, 
            limit: 100, 
            sortBy: 'paymentDeficit', 
            sortOrder: 'asc' 
          })

          // Verify ascending sorting is correct
          for (let i = 0; i < overviewAsc.patients.length - 1; i++) {
            const currentPatient = overviewAsc.patients[i]
            const nextPatient = overviewAsc.patients[i + 1]
            
            // Current patient should have <= payment deficit than next patient (ascending order)
            expect(currentPatient.paymentDeficit).toBeLessThanOrEqual(nextPatient.paymentDeficit)
          }
        }
      ),
      { numRuns: 50 }
    )
  }, 30000)

  /**
   * Property: Financial calculations are consistent with zero consultations
   * For any patient with no consultations, calculations should be correct
   */
  test('financial calculations are correct for patients with no consultations', async () => {
    await fc.assert(
      fc.asyncProperty(
        patientGenerator,
        async (patientData) => {
          // Mock patient with no consultations
          const mockPatientWithNoConsultations = {
            ...patientData,
            consultations: []
          }

          // Mock database response
          mockPrisma.patient.findUnique.mockResolvedValue(mockPatientWithNoConsultations)

          // Get financial data
          const financialData = await getPatientFinancialData(patientData.id)

          expect(financialData).not.toBeNull()
          if (financialData) {
            // Should have zero consultations
            expect(financialData.totalConsultations).toBe(0)
            expect(financialData.paidConsultations).toBe(0)
            
            // Payment deficit should be zero (no consultations to pay for)
            expect(financialData.paymentDeficit).toBe(0)
            
            // Should not have payment issues (no unpaid consultations)
            expect(financialData.hasPaymentIssues).toBe(false)
            
            // Credits should match patient data
            expect(financialData.availableCredits).toBe(patientData.credits)
          }
        }
      ),
      { numRuns: 100 }
    )
  }, 30000)
})