/**
 * Property-Based Tests for Credit-Based Payment Processing
 * Feature: patient-management-system, Property 11: Credit-Based Payment Processing
 * **Validates: Requirements 5.2**
 */

import * as fc from 'fast-check';
import { createConsultation } from '@/lib/consultations';
import { prisma } from '@/lib/prisma';

// Mock prisma for testing
jest.mock('@/lib/prisma', () => ({
  prisma: {
    patient: {
      findUnique: jest.fn(),
      update: jest.fn()
    },
    consultation: {
      findFirst: jest.fn(),
      create: jest.fn()
    },
    $transaction: jest.fn()
  }
}));

const mockPrisma = prisma as jest.Mocked<typeof prisma>;

describe('Credit-Based Payment Processing Property Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup default mock implementations
    mockPrisma.$transaction.mockImplementation(async (callback) => {
      return await callback(mockPrisma);
    });
  });

  /**
   * Property 11: Credit-Based Payment Processing
   * For any consultation creation, if the patient has available credits, the system should 
   * mark as paid and deduct one credit; otherwise, mark as unpaid
   */
  describe('Property 11: Credit-Based Payment Processing', () => {
    it('should automatically mark consultation as paid and deduct credit when patient has credits', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            patientId: fc.string({ minLength: 1 }).filter(s => s.trim().length > 0),
            patientName: fc.string({ minLength: 1 }).filter(s => s.trim().length > 0),
            consultationPrice: fc.integer({ min: 1, max: 999 }), // Use integer to avoid NaN issues
            initialCredits: fc.integer({ min: 1, max: 100 }) // Patient has credits
          }),
          async (testData) => {
            // Reset mocks for each property iteration
            jest.clearAllMocks();
            
            // Setup default mock implementations
            mockPrisma.$transaction.mockImplementation(async (callback) => {
              return await callback(mockPrisma);
            });

            // Mock patient with credits
            const mockPatient = {
              id: testData.patientId,
              name: testData.patientName,
              consultationPrice: testData.consultationPrice,
              credits: testData.initialCredits,
              birthDate: new Date('1990-01-01')
            };

            // Mock no existing unfinalized consultations
            mockPrisma.consultation.findFirst.mockResolvedValue(null);
            
            // Mock patient lookup
            mockPrisma.patient.findUnique.mockResolvedValue(mockPatient);

            // Mock consultation creation with paid status
            const mockCreatedConsultation = {
              id: 'consultation-id',
              patientId: testData.patientId,
              startedAt: new Date(),
              finishedAt: null,
              paidAt: new Date(), // Should be set when patient has credits
              status: 'OPEN',
              content: '',
              notes: '',
              price: testData.consultationPrice,
              paid: true, // Should be true when patient has credits
              createdAt: new Date(),
              updatedAt: new Date(),
              patient: {
                id: testData.patientId,
                name: testData.patientName,
                profilePhoto: null,
                birthDate: new Date('1990-01-01')
              }
            };

            mockPrisma.consultation.create.mockResolvedValue(mockCreatedConsultation);

            // Mock patient credit update
            mockPrisma.patient.update.mockResolvedValue({
              ...mockPatient,
              credits: testData.initialCredits - 1
            });

            // Create consultation
            const result = await createConsultation({
              patientId: testData.patientId
            });

            // Verify consultation is marked as paid (Requirement 5.2)
            expect(result.paid).toBe(true);
            expect(result.paidAt).not.toBeNull();

            // Verify patient credit was decremented
            expect(mockPrisma.patient.update).toHaveBeenCalledWith({
              where: { id: testData.patientId },
              data: {
                credits: {
                  decrement: 1
                }
              }
            });

            // Verify consultation was created with paid status
            expect(mockPrisma.consultation.create).toHaveBeenCalledWith(
              expect.objectContaining({
                data: expect.objectContaining({
                  paid: true,
                  paidAt: expect.any(Date)
                })
              })
            );
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should mark consultation as unpaid when patient has no credits', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            patientId: fc.string({ minLength: 1 }).filter(s => s.trim().length > 0),
            patientName: fc.string({ minLength: 1 }).filter(s => s.trim().length > 0),
            consultationPrice: fc.integer({ min: 1, max: 999 }),
            initialCredits: fc.constant(0) // Patient has no credits
          }),
          async (testData) => {
            // Reset mocks for each property iteration
            jest.clearAllMocks();
            
            // Setup default mock implementations
            mockPrisma.$transaction.mockImplementation(async (callback) => {
              return await callback(mockPrisma);
            });

            // Mock patient without credits
            const mockPatient = {
              id: testData.patientId,
              name: testData.patientName,
              consultationPrice: testData.consultationPrice,
              credits: testData.initialCredits, // 0 credits
              birthDate: new Date('1990-01-01')
            };

            // Mock no existing unfinalized consultations
            mockPrisma.consultation.findFirst.mockResolvedValue(null);
            
            // Mock patient lookup
            mockPrisma.patient.findUnique.mockResolvedValue(mockPatient);

            // Mock consultation creation with unpaid status
            const mockCreatedConsultation = {
              id: 'consultation-id',
              patientId: testData.patientId,
              startedAt: new Date(),
              finishedAt: null,
              paidAt: null, // Should be null when patient has no credits
              status: 'OPEN',
              content: '',
              notes: '',
              price: testData.consultationPrice,
              paid: false, // Should be false when patient has no credits
              createdAt: new Date(),
              updatedAt: new Date(),
              patient: {
                id: testData.patientId,
                name: testData.patientName,
                profilePhoto: null,
                birthDate: new Date('1990-01-01')
              }
            };

            mockPrisma.consultation.create.mockResolvedValue(mockCreatedConsultation);

            // Create consultation
            const result = await createConsultation({
              patientId: testData.patientId
            });

            // Verify consultation is marked as unpaid (Requirement 5.2)
            expect(result.paid).toBe(false);
            expect(result.paidAt).toBeNull();

            // Verify patient credit was NOT decremented (no credits to deduct)
            expect(mockPrisma.patient.update).not.toHaveBeenCalled();

            // Verify consultation was created with unpaid status
            expect(mockPrisma.consultation.create).toHaveBeenCalledWith(
              expect.objectContaining({
                data: expect.objectContaining({
                  paid: false,
                  paidAt: null
                })
              })
            );
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle credit deduction correctly for any positive credit amount', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            patientId: fc.string({ minLength: 1 }).filter(s => s.trim().length > 0),
            consultationPrice: fc.integer({ min: 1, max: 999 }),
            initialCredits: fc.integer({ min: 1, max: 1000 }) // Any positive amount
          }),
          async (testData) => {
            // Reset mocks for each property iteration
            jest.clearAllMocks();
            
            // Setup default mock implementations
            mockPrisma.$transaction.mockImplementation(async (callback) => {
              return await callback(mockPrisma);
            });

            const mockPatient = {
              id: testData.patientId,
              name: 'Test Patient',
              consultationPrice: testData.consultationPrice,
              credits: testData.initialCredits,
              birthDate: new Date('1990-01-01')
            };

            mockPrisma.consultation.findFirst.mockResolvedValue(null);
            mockPrisma.patient.findUnique.mockResolvedValue(mockPatient);

            const mockCreatedConsultation = {
              id: 'consultation-id',
              patientId: testData.patientId,
              startedAt: new Date(),
              finishedAt: null,
              paidAt: new Date(),
              status: 'OPEN',
              content: '',
              notes: '',
              price: testData.consultationPrice,
              paid: true,
              createdAt: new Date(),
              updatedAt: new Date(),
              patient: {
                id: testData.patientId,
                name: 'Test Patient',
                profilePhoto: null,
                birthDate: new Date('1990-01-01')
              }
            };

            mockPrisma.consultation.create.mockResolvedValue(mockCreatedConsultation);

            await createConsultation({
              patientId: testData.patientId
            });

            // Verify exactly one credit was decremented, regardless of initial amount
            expect(mockPrisma.patient.update).toHaveBeenCalledTimes(1);
            expect(mockPrisma.patient.update).toHaveBeenCalledWith({
              where: { id: testData.patientId },
              data: {
                credits: {
                  decrement: 1 // Always decrement by exactly 1
                }
              }
            });
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle credit-based payment consistently across different consultation prices', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            patientId: fc.string({ minLength: 1 }).filter(s => s.trim().length > 0),
            consultationPrice: fc.integer({ min: 1, max: 999 }),
            credits: fc.integer({ min: 1, max: 100 })
          }),
          async (testData) => {
            // Reset mocks for each property iteration
            jest.clearAllMocks();
            
            // Setup default mock implementations
            mockPrisma.$transaction.mockImplementation(async (callback) => {
              return await callback(mockPrisma);
            });

            const mockPatient = {
              id: testData.patientId,
              name: 'Test Patient',
              consultationPrice: testData.consultationPrice,
              credits: testData.credits,
              birthDate: new Date('1990-01-01')
            };

            mockPrisma.consultation.findFirst.mockResolvedValue(null);
            mockPrisma.patient.findUnique.mockResolvedValue(mockPatient);

            const mockCreatedConsultation = {
              id: 'consultation-id',
              patientId: testData.patientId,
              startedAt: new Date(),
              finishedAt: null,
              paidAt: new Date(),
              status: 'OPEN',
              content: '',
              notes: '',
              price: testData.consultationPrice,
              paid: true,
              createdAt: new Date(),
              updatedAt: new Date(),
              patient: {
                id: testData.patientId,
                name: 'Test Patient',
                profilePhoto: null,
                birthDate: new Date('1990-01-01')
              }
            };

            mockPrisma.consultation.create.mockResolvedValue(mockCreatedConsultation);

            const result = await createConsultation({
              patientId: testData.patientId
            });

            // Credit-based payment should work regardless of consultation price
            // (credits are not tied to price value, just availability)
            expect(result.paid).toBe(true);
            expect(result.paidAt).not.toBeNull();
            
            // Credit deduction should happen regardless of price
            expect(mockPrisma.patient.update).toHaveBeenCalledWith({
              where: { id: testData.patientId },
              data: {
                credits: {
                  decrement: 1
                }
              }
            });
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle boundary case of exactly one credit', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            patientId: fc.string({ minLength: 1 }).filter(s => s.trim().length > 0),
            consultationPrice: fc.integer({ min: 1, max: 999 })
          }),
          async (testData) => {
            // Reset mocks for each property iteration
            jest.clearAllMocks();
            
            // Setup default mock implementations
            mockPrisma.$transaction.mockImplementation(async (callback) => {
              return await callback(mockPrisma);
            });

            // Patient has exactly 1 credit
            const mockPatient = {
              id: testData.patientId,
              name: 'Test Patient',
              consultationPrice: testData.consultationPrice,
              credits: 1, // Exactly one credit
              birthDate: new Date('1990-01-01')
            };

            mockPrisma.consultation.findFirst.mockResolvedValue(null);
            mockPrisma.patient.findUnique.mockResolvedValue(mockPatient);

            const mockCreatedConsultation = {
              id: 'consultation-id',
              patientId: testData.patientId,
              startedAt: new Date(),
              finishedAt: null,
              paidAt: new Date(),
              status: 'OPEN',
              content: '',
              notes: '',
              price: testData.consultationPrice,
              paid: true,
              createdAt: new Date(),
              updatedAt: new Date(),
              patient: {
                id: testData.patientId,
                name: 'Test Patient',
                profilePhoto: null,
                birthDate: new Date('1990-01-01')
              }
            };

            mockPrisma.consultation.create.mockResolvedValue(mockCreatedConsultation);

            const result = await createConsultation({
              patientId: testData.patientId
            });

            // Should still work with exactly 1 credit
            expect(result.paid).toBe(true);
            expect(result.paidAt).not.toBeNull();
            
            // Should decrement the single credit
            expect(mockPrisma.patient.update).toHaveBeenCalledWith({
              where: { id: testData.patientId },
              data: {
                credits: {
                  decrement: 1
                }
              }
            });
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Credit-Based Payment Edge Cases', () => {
    it('should handle transaction rollback when credit deduction fails', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            patientId: fc.string({ minLength: 1 }).filter(s => s.trim().length > 0),
            consultationPrice: fc.integer({ min: 1, max: 999 }),
            credits: fc.integer({ min: 1, max: 100 })
          }),
          async (testData) => {
            // Reset mocks for each property iteration
            jest.clearAllMocks();

            const mockPatient = {
              id: testData.patientId,
              name: 'Test Patient',
              consultationPrice: testData.consultationPrice,
              credits: testData.credits,
              birthDate: new Date('1990-01-01')
            };

            mockPrisma.consultation.findFirst.mockResolvedValue(null);
            mockPrisma.patient.findUnique.mockResolvedValue(mockPatient);

            // Mock transaction failure
            mockPrisma.$transaction.mockRejectedValue(new Error('Transaction failed'));

            // Should propagate transaction error
            await expect(
              createConsultation({
                patientId: testData.patientId
              })
            ).rejects.toThrow('Erro ao criar consulta: Transaction failed');
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should maintain data consistency in credit-based payment logic', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            patientId: fc.string({ minLength: 1 }).filter(s => s.trim().length > 0),
            consultationPrice: fc.integer({ min: 1, max: 999 }),
            hasCredits: fc.boolean()
          }),
          async (testData) => {
            // Reset mocks for each property iteration
            jest.clearAllMocks();
            
            // Setup default mock implementations
            mockPrisma.$transaction.mockImplementation(async (callback) => {
              return await callback(mockPrisma);
            });

            const mockPatient = {
              id: testData.patientId,
              name: 'Test Patient',
              consultationPrice: testData.consultationPrice,
              credits: testData.hasCredits ? 5 : 0,
              birthDate: new Date('1990-01-01')
            };

            mockPrisma.consultation.findFirst.mockResolvedValue(null);
            mockPrisma.patient.findUnique.mockResolvedValue(mockPatient);

            const mockCreatedConsultation = {
              id: 'consultation-id',
              patientId: testData.patientId,
              startedAt: new Date(),
              finishedAt: null,
              paidAt: testData.hasCredits ? new Date() : null,
              status: 'OPEN',
              content: '',
              notes: '',
              price: testData.consultationPrice,
              paid: testData.hasCredits,
              createdAt: new Date(),
              updatedAt: new Date(),
              patient: {
                id: testData.patientId,
                name: 'Test Patient',
                profilePhoto: null,
                birthDate: new Date('1990-01-01')
              }
            };

            mockPrisma.consultation.create.mockResolvedValue(mockCreatedConsultation);

            const result = await createConsultation({
              patientId: testData.patientId
            });

            // Payment status should be consistent with credit availability
            expect(result.paid).toBe(testData.hasCredits);
            
            if (testData.hasCredits) {
              expect(result.paidAt).not.toBeNull();
              expect(mockPrisma.patient.update).toHaveBeenCalledTimes(1);
            } else {
              expect(result.paidAt).toBeNull();
              expect(mockPrisma.patient.update).not.toHaveBeenCalled();
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});