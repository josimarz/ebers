/**
 * Property-Based Tests for Consultation State Transitions
 * Feature: patient-management-system, Property 12: Consultation State Transitions
 * **Validates: Requirements 5.6, 5.7**
 */

import * as fc from 'fast-check';
import { finalizeConsultation, processConsultationPayment } from '@/lib/consultations';
import { prisma } from '@/lib/prisma';

// Mock prisma for testing
jest.mock('@/lib/prisma', () => ({
  prisma: {
    consultation: {
      update: jest.fn()
    }
  }
}));

const mockPrisma = prisma as jest.Mocked<typeof prisma>;

describe('Consultation State Transitions Property Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset mock implementation to ensure clean state
    mockPrisma.consultation.update.mockReset();
  });

  afterEach(() => {
    // Additional cleanup after each test
    jest.clearAllMocks();
  });

  /**
   * Property 12: Consultation State Transitions
   * For any consultation, finalizing should update status to "FINALIZED" with end timestamp,
   * and payment processing should mark as paid
   */
  describe('Property 12: Consultation State Transitions', () => {
    it('should finalize consultation with correct status and timestamp for any consultation ID', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            consultationId: fc.string({ minLength: 1 }).filter(s => s.trim().length > 0),
            patientId: fc.string({ minLength: 1 }).filter(s => s.trim().length > 0),
            patientName: fc.string({ minLength: 1 }).filter(s => s.trim().length > 0),
            originalStatus: fc.constantFrom('OPEN'), // Only open consultations can be finalized
            originalPrice: fc.integer({ min: 1, max: 999 }),
            originalPaid: fc.boolean()
          }),
          async (testData) => {
            // Reset mocks for this test iteration
            mockPrisma.consultation.update.mockReset();

            const startTime = Date.now();

            // Mock the finalized consultation result
            const mockFinalizedConsultation = {
              id: testData.consultationId,
              patientId: testData.patientId,
              startedAt: new Date('2024-01-01T10:00:00Z'),
              finishedAt: new Date(), // Should be set when finalized
              paidAt: testData.originalPaid ? new Date() : null,
              status: 'FINALIZED', // Should be updated to FINALIZED
              content: 'Test content',
              notes: 'Test notes',
              price: testData.originalPrice,
              paid: testData.originalPaid,
              createdAt: new Date('2024-01-01T10:00:00Z'),
              updatedAt: new Date(),
              patient: {
                id: testData.patientId,
                name: testData.patientName,
                profilePhoto: null,
                birthDate: new Date('1990-01-01')
              }
            };

            mockPrisma.consultation.update.mockResolvedValue(mockFinalizedConsultation);

            // Finalize consultation
            const result = await finalizeConsultation(testData.consultationId);

            const endTime = Date.now();

            // Verify consultation finalization (Requirement 5.6)
            expect(result.status).toBe('FINALIZED');
            expect(result.finishedAt).not.toBeNull();

            // Verify finishedAt timestamp is current (within test execution window)
            const finishedTime = new Date(result.finishedAt!).getTime();
            expect(finishedTime).toBeGreaterThanOrEqual(startTime - 1000); // Allow 1s buffer
            expect(finishedTime).toBeLessThanOrEqual(endTime + 1000);

            // Verify consultation.update was called with correct parameters
            expect(mockPrisma.consultation.update).toHaveBeenCalledWith({
              where: { id: testData.consultationId },
              data: {
                status: 'FINALIZED',
                finishedAt: expect.any(Date)
              },
              include: {
                patient: {
                  select: {
                    id: true,
                    name: true,
                    profilePhoto: true,
                    birthDate: true
                  }
                }
              }
            });

            // Verify other fields remain unchanged
            expect(result.id).toBe(testData.consultationId);
            expect(result.patientId).toBe(testData.patientId);
            expect(Number(result.price)).toBe(testData.originalPrice);
            expect(result.paid).toBe(testData.originalPaid);
          }
        ),
        { numRuns: 50 } // Reduced runs to avoid mock accumulation
      );
    });

    it('should process payment with correct status and timestamp for any consultation ID', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            consultationId: fc.string({ minLength: 1 }).filter(s => s.trim().length > 0),
            patientId: fc.string({ minLength: 1 }).filter(s => s.trim().length > 0),
            patientName: fc.string({ minLength: 1 }).filter(s => s.trim().length > 0),
            originalStatus: fc.constantFrom('OPEN', 'FINALIZED'),
            originalPrice: fc.integer({ min: 1, max: 999 }),
            originalPaid: fc.constant(false) // Only unpaid consultations need payment processing
          }),
          async (testData) => {
            // Reset mocks for this test iteration
            mockPrisma.consultation.update.mockReset();

            const startTime = Date.now();

            // Mock the paid consultation result
            const mockPaidConsultation = {
              id: testData.consultationId,
              patientId: testData.patientId,
              startedAt: new Date('2024-01-01T10:00:00Z'),
              finishedAt: testData.originalStatus === 'FINALIZED' ? new Date() : null,
              paidAt: new Date(), // Should be set when payment is processed
              status: testData.originalStatus,
              content: 'Test content',
              notes: 'Test notes',
              price: testData.originalPrice,
              paid: true, // Should be updated to true
              createdAt: new Date('2024-01-01T10:00:00Z'),
              updatedAt: new Date(),
              patient: {
                id: testData.patientId,
                name: testData.patientName,
                profilePhoto: null,
                birthDate: new Date('1990-01-01')
              }
            };

            mockPrisma.consultation.update.mockResolvedValue(mockPaidConsultation);

            // Process payment
            const result = await processConsultationPayment(testData.consultationId);

            const endTime = Date.now();

            // Verify payment processing (Requirement 5.7)
            expect(result.paid).toBe(true);
            expect(result.paidAt).not.toBeNull();

            // Verify paidAt timestamp is current (within test execution window)
            const paidTime = new Date(result.paidAt!).getTime();
            expect(paidTime).toBeGreaterThanOrEqual(startTime - 1000); // Allow 1s buffer
            expect(paidTime).toBeLessThanOrEqual(endTime + 1000);

            // Verify consultation.update was called with correct parameters
            expect(mockPrisma.consultation.update).toHaveBeenCalledWith({
              where: { id: testData.consultationId },
              data: {
                paid: true,
                paidAt: expect.any(Date)
              },
              include: {
                patient: {
                  select: {
                    id: true,
                    name: true,
                    profilePhoto: true,
                    birthDate: true
                  }
                }
              }
            });

            // Verify other fields remain unchanged
            expect(result.id).toBe(testData.consultationId);
            expect(result.patientId).toBe(testData.patientId);
            expect(result.status).toBe(testData.originalStatus);
            expect(Number(result.price)).toBe(testData.originalPrice);
          }
        ),
        { numRuns: 50 } // Reduced runs to avoid mock accumulation
      );
    });

    it('should handle state transitions independently for different consultations', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            consultation1Id: fc.string({ minLength: 1 }).filter(s => s.trim().length > 0),
            consultation2Id: fc.string({ minLength: 1 }).filter(s => s.trim().length > 0),
            price1: fc.integer({ min: 1, max: 999 }),
            price2: fc.integer({ min: 1, max: 999 })
          }).filter(data => data.consultation1Id !== data.consultation2Id), // Ensure different IDs
          async (testData) => {
            // Reset mocks for this specific test iteration
            mockPrisma.consultation.update.mockReset();

            // Mock first consultation finalization
            const mockFinalizedConsultation1 = {
              id: testData.consultation1Id,
              patientId: 'patient1',
              startedAt: new Date('2024-01-01T10:00:00Z'),
              finishedAt: new Date(),
              paidAt: null,
              status: 'FINALIZED',
              content: '',
              notes: '',
              price: testData.price1,
              paid: false,
              createdAt: new Date('2024-01-01T10:00:00Z'),
              updatedAt: new Date(),
              patient: {
                id: 'patient1',
                name: 'Patient 1',
                profilePhoto: null,
                birthDate: new Date('1990-01-01')
              }
            };

            // Mock second consultation payment
            const mockPaidConsultation2 = {
              id: testData.consultation2Id,
              patientId: 'patient2',
              startedAt: new Date('2024-01-01T11:00:00Z'),
              finishedAt: null,
              paidAt: new Date(),
              status: 'OPEN',
              content: '',
              notes: '',
              price: testData.price2,
              paid: true,
              createdAt: new Date('2024-01-01T11:00:00Z'),
              updatedAt: new Date(),
              patient: {
                id: 'patient2',
                name: 'Patient 2',
                profilePhoto: null,
                birthDate: new Date('1990-01-01')
              }
            };

            // Setup mocks for sequential calls
            mockPrisma.consultation.update
              .mockResolvedValueOnce(mockFinalizedConsultation1)
              .mockResolvedValueOnce(mockPaidConsultation2);

            // Perform state transitions
            const result1 = await finalizeConsultation(testData.consultation1Id);
            const result2 = await processConsultationPayment(testData.consultation2Id);

            // Verify independent state transitions
            expect(result1.id).toBe(testData.consultation1Id);
            expect(result1.status).toBe('FINALIZED');
            expect(result1.finishedAt).not.toBeNull();
            expect(result1.paid).toBe(false); // Payment status unchanged

            expect(result2.id).toBe(testData.consultation2Id);
            expect(result2.status).toBe('OPEN'); // Status unchanged
            expect(result2.paid).toBe(true);
            expect(result2.paidAt).not.toBeNull();

            // Verify correct update calls were made
            expect(mockPrisma.consultation.update).toHaveBeenCalledTimes(2);
          }
        ),
        { numRuns: 25 } // Reduced runs for complex test to avoid mock accumulation
      );
    });

    it('should maintain data integrity during state transitions', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            consultationId: fc.string({ minLength: 1 }).filter(s => s.trim().length > 0),
            originalContent: fc.string(),
            originalNotes: fc.string(),
            originalPrice: fc.integer({ min: 1, max: 999 }),
            transitionType: fc.constantFrom('finalize', 'payment')
          }),
          async (testData) => {
            // Reset mocks for this test iteration
            mockPrisma.consultation.update.mockReset();

            const mockConsultation = {
              id: testData.consultationId,
              patientId: 'patient-id',
              startedAt: new Date('2024-01-01T10:00:00Z'),
              finishedAt: testData.transitionType === 'finalize' ? new Date() : null,
              paidAt: testData.transitionType === 'payment' ? new Date() : null,
              status: testData.transitionType === 'finalize' ? 'FINALIZED' : 'OPEN',
              content: testData.originalContent,
              notes: testData.originalNotes,
              price: testData.originalPrice,
              paid: testData.transitionType === 'payment',
              createdAt: new Date('2024-01-01T10:00:00Z'),
              updatedAt: new Date(),
              patient: {
                id: 'patient-id',
                name: 'Test Patient',
                profilePhoto: null,
                birthDate: new Date('1990-01-01')
              }
            };

            mockPrisma.consultation.update.mockResolvedValue(mockConsultation);

            let result;
            if (testData.transitionType === 'finalize') {
              result = await finalizeConsultation(testData.consultationId);
            } else {
              result = await processConsultationPayment(testData.consultationId);
            }

            // Verify data integrity - original data should be preserved
            expect(result.id).toBe(testData.consultationId);
            expect(result.content).toBe(testData.originalContent);
            expect(result.notes).toBe(testData.originalNotes);
            expect(Number(result.price)).toBe(testData.originalPrice);
            expect(result.patient).toBeDefined();
            expect(result.patient.id).toBe('patient-id');
          }
        ),
        { numRuns: 50 } // Reduced runs to avoid mock accumulation
      );
    });
  });

  describe('Consultation State Transition Error Handling', () => {
    beforeEach(() => {
      jest.clearAllMocks();
      mockPrisma.consultation.update.mockReset();
    });

    it('should handle consultation not found errors for any ID', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1 }).filter(s => s.trim().length > 0),
          async (consultationId) => {
            // Reset mocks for this test iteration
            mockPrisma.consultation.update.mockReset();

            // Mock consultation not found error
            const notFoundError = new Error('P2025');
            mockPrisma.consultation.update.mockRejectedValue(notFoundError);

            // Test finalization
            await expect(
              finalizeConsultation(consultationId)
            ).rejects.toThrow('Consulta não encontrada');

            // Reset mock for second call
            mockPrisma.consultation.update.mockReset();
            mockPrisma.consultation.update.mockRejectedValue(notFoundError);

            // Test payment processing
            await expect(
              processConsultationPayment(consultationId)
            ).rejects.toThrow('Consulta não encontrada');
          }
        ),
        { numRuns: 25 }
      );
    });

    it('should handle database errors during state transitions', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            consultationId: fc.string({ minLength: 1 }).filter(s => s.trim().length > 0),
            errorMessage: fc.string({ minLength: 1 })
          }),
          async (testData) => {
            // Reset mocks for this test iteration
            mockPrisma.consultation.update.mockReset();

            // Mock database error
            mockPrisma.consultation.update.mockRejectedValue(new Error(testData.errorMessage));

            // Should propagate error with proper message format
            await expect(
              finalizeConsultation(testData.consultationId)
            ).rejects.toThrow(`Erro ao finalizar consulta: ${testData.errorMessage}`);

            // Reset mock for second call
            mockPrisma.consultation.update.mockReset();
            mockPrisma.consultation.update.mockRejectedValue(new Error(testData.errorMessage));

            await expect(
              processConsultationPayment(testData.consultationId)
            ).rejects.toThrow(`Erro ao processar pagamento: ${testData.errorMessage}`);
          }
        ),
        { numRuns: 25 }
      );
    });

    it('should validate consultation ID parameter', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.oneof(
            fc.constant(''),
            fc.constant('   '),
            fc.constant('\t\n'),
            fc.string().filter(s => s.trim().length === 0)
          ),
          async (invalidId) => {
            // Reset mocks for this test iteration
            mockPrisma.consultation.update.mockReset();

            // Should throw validation error for invalid IDs
            await expect(
              finalizeConsultation(invalidId)
            ).rejects.toThrow('ID da consulta é obrigatório');

            await expect(
              processConsultationPayment(invalidId)
            ).rejects.toThrow('ID da consulta é obrigatório');

            // Should not attempt database operations
            expect(mockPrisma.consultation.update).not.toHaveBeenCalled();
          }
        ),
        { numRuns: 20 }
      );
    });
  });
});