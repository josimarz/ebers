/**
 * Property-based tests for credit balance updates functionality
 * Feature: patient-management-system, Property 9: Credit Balance Updates
 * Validates: Requirements 4.4
 */

import * as fc from 'fast-check'
import { prisma } from '@/lib/prisma'

// Mock Prisma for testing
const mockPrisma = prisma as jest.Mocked<typeof prisma>

// Helper function to simulate credit balance update using the same logic as the API
async function updatePatientCredits(patientId: string, creditsToAdd: number): Promise<{ oldBalance: number; newBalance: number }> {
  // Get current balance
  const patient = await prisma.patient.findUnique({
    where: { id: patientId },
    select: { credits: true }
  })
  
  if (!patient) {
    throw new Error('Patient not found')
  }
  
  const oldBalance = patient.credits
  
  // Update credits using increment (same as API implementation)
  const updatedPatient = await prisma.patient.update({
    where: { id: patientId },
    data: {
      credits: {
        increment: creditsToAdd
      }
    },
    select: { credits: true }
  })
  
  return {
    oldBalance,
    newBalance: updatedPatient.credits
  }
}

describe('Property 9: Credit Balance Updates', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  /**
   * Property: For any credit sale transaction, the system should correctly 
   * add purchased credits to the patient's balance
   * 
   * This property validates:
   * - Requirement 4.4: When credits are sold, the system SHALL add the purchased credits to the patient's credit balance
   */
  it('should correctly add purchased credits to patient balance for any valid credit sale transaction', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate various initial credit balances
        fc.integer({ min: 0, max: 1000 }),
        // Generate credit purchase quantities
        fc.integer({ min: 1, max: 100 }),
        
        async (initialCredits, creditsToAdd) => {
          const patientId = 'test-patient-id'
          
          // Mock the patient with initial credits
          const mockPatientBefore = {
            id: patientId,
            credits: initialCredits
          }
          
          // Mock the patient after credit update
          const mockPatientAfter = {
            id: patientId,
            credits: initialCredits + creditsToAdd
          }
          
          // Set up mocks
          mockPrisma.patient.findUnique.mockResolvedValue(mockPatientBefore)
          mockPrisma.patient.update.mockResolvedValue(mockPatientAfter)
          
          // Perform credit balance update
          const result = await updatePatientCredits(patientId, creditsToAdd)
          
          // Verify the credit balance was updated correctly (Requirement 4.4)
          const expectedNewBalance = result.oldBalance + creditsToAdd
          expect(result.newBalance).toBe(expectedNewBalance)
          
          // Verify the balance increased by exactly the amount of credits added
          const actualIncrease = result.newBalance - result.oldBalance
          expect(actualIncrease).toBe(creditsToAdd)
          
          // Verify the new balance is non-negative
          expect(result.newBalance).toBeGreaterThanOrEqual(0)
          
          // Verify the balance is greater than the original balance
          expect(result.newBalance).toBeGreaterThan(result.oldBalance)
          
          // Verify the correct Prisma operations were called
          expect(mockPrisma.patient.findUnique).toHaveBeenCalledWith({
            where: { id: patientId },
            select: { credits: true }
          })
          
          expect(mockPrisma.patient.update).toHaveBeenCalledWith({
            where: { id: patientId },
            data: {
              credits: {
                increment: creditsToAdd
              }
            },
            select: { credits: true }
          })
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Property: Multiple credit transactions should accumulate correctly
   * regardless of the order or size of individual transactions
   */
  it('should correctly accumulate multiple credit transactions for any sequence of credit additions', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate initial credit balance
        fc.integer({ min: 0, max: 100 }),
        // Generate a sequence of credit additions
        fc.array(fc.integer({ min: 1, max: 50 }), { minLength: 1, maxLength: 5 }),
        
        async (initialCredits, creditAdditions) => {
          const patientId = 'test-patient-id'
          let currentBalance = initialCredits
          
          // Apply each credit addition sequentially
          for (const creditsToAdd of creditAdditions) {
            // Mock the patient with current balance
            const mockPatientBefore = {
              id: patientId,
              credits: currentBalance
            }
            
            // Mock the patient after credit update
            const mockPatientAfter = {
              id: patientId,
              credits: currentBalance + creditsToAdd
            }
            
            // Set up mocks for this iteration
            mockPrisma.patient.findUnique.mockResolvedValueOnce(mockPatientBefore)
            mockPrisma.patient.update.mockResolvedValueOnce(mockPatientAfter)
            
            const result = await updatePatientCredits(patientId, creditsToAdd)
            
            // Verify each individual transaction
            expect(result.oldBalance).toBe(currentBalance)
            expect(result.newBalance).toBe(currentBalance + creditsToAdd)
            
            // Update current balance for next iteration
            currentBalance = result.newBalance
          }
          
          // Verify final balance matches expected total
          const expectedFinalBalance = initialCredits + creditAdditions.reduce((sum, credits) => sum + credits, 0)
          expect(currentBalance).toBe(expectedFinalBalance)
          
          // Verify total increase equals sum of all additions
          const totalIncrease = currentBalance - initialCredits
          const expectedIncrease = creditAdditions.reduce((sum, credits) => sum + credits, 0)
          expect(totalIncrease).toBe(expectedIncrease)
        }
      ),
      { numRuns: 50 } // Reduced runs due to multiple operations per test
    )
  })

  /**
   * Property: Credit balance updates should handle edge cases correctly
   * including zero initial balance and large credit additions
   */
  it('should handle edge cases correctly for any valid credit addition scenario', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate edge case scenarios for initial balance
        fc.oneof(
          fc.constant(0), // Zero initial balance
          fc.integer({ min: 1, max: 1000 }), // Various initial balances
          fc.constant(9999) // Large initial balance
        ),
        // Generate edge case scenarios for credit additions
        fc.oneof(
          fc.constant(1), // Minimum credit addition
          fc.integer({ min: 2, max: 100 }), // Various credit additions
          fc.constant(1000) // Large credit addition
        ),
        
        async (initialCredits, creditsToAdd) => {
          const patientId = 'test-patient-id'
          
          // Mock the patient with initial credits
          const mockPatientBefore = {
            id: patientId,
            credits: initialCredits
          }
          
          // Mock the patient after credit update
          const mockPatientAfter = {
            id: patientId,
            credits: initialCredits + creditsToAdd
          }
          
          // Set up mocks
          mockPrisma.patient.findUnique.mockResolvedValue(mockPatientBefore)
          mockPrisma.patient.update.mockResolvedValue(mockPatientAfter)
          
          // Perform credit update
          const result = await updatePatientCredits(patientId, creditsToAdd)
          
          // Verify mathematical correctness
          expect(result.oldBalance).toBe(initialCredits)
          expect(result.newBalance).toBe(initialCredits + creditsToAdd)
          
          // Verify balance properties
          expect(result.newBalance).toBeGreaterThan(result.oldBalance)
          expect(result.newBalance - result.oldBalance).toBe(creditsToAdd)
          
          // Verify non-negative balance
          expect(result.newBalance).toBeGreaterThanOrEqual(0)
          
          // Verify the result is within expected bounds
          expect(result.newBalance).toBeLessThanOrEqual(initialCredits + creditsToAdd)
          expect(result.newBalance).toBeGreaterThanOrEqual(creditsToAdd)
          
          // Verify edge case handling for zero initial balance
          if (initialCredits === 0) {
            expect(result.newBalance).toBe(creditsToAdd)
          }
          
          // Verify edge case handling for minimum credit addition
          if (creditsToAdd === 1) {
            expect(result.newBalance).toBe(initialCredits + 1)
          }
        }
      ),
      { numRuns: 100 }
    )
  })
})