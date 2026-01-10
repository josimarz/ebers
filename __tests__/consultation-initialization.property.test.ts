/**
 * Property-Based Tests for Consultation Initialization
 * Feature: patient-management-system, Property 10: Consultation Initialization
 * **Validates: Requirements 5.1**
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

describe('Consultation Initialization Property Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup default mock implementations
    mockPrisma.$transaction.mockImplementation(async (callback) => {
      return await callback(mockPrisma);
    });
  });

  /**
   * Property 10: Consultation Initialization
   * For any new consultation creation, the system should initialize with correct default values
   * (current timestamp, "OPEN" status, patient's price, empty content)
   */
  describe('Property 10: Consultation Initialization', () => {
    it('should initialize consultation with correct default values for any valid patient', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            patientId: fc.string({ minLength: 1 }),
            patientName: fc.string({ minLength: 1 }),
            consultationPrice: fc.float({ min: Math.fround(0.01), max: Math.fround(999.99) }).filter(n => Number.isFinite(n)),
            credits: fc.integer({ min: 0, max: 100 }),
            birthDate: fc.date({ min: new Date('1900-01-01'), max: new Date('2020-01-01') })
          }),
          async (testData) => {
            const startTime = Date.now();
            
            // Mock patient data
            const mockPatient = {
              id: testData.patientId,
              name: testData.patientName,
              consultationPrice: testData.consultationPrice,
              credits: testData.credits,
              birthDate: testData.birthDate
            };

            // Mock no existing unfinalized consultations
            mockPrisma.consultation.findFirst.mockResolvedValue(null);
            
            // Mock patient lookup
            mockPrisma.patient.findUnique.mockResolvedValue(mockPatient);

            // Mock consultation creation
            const mockCreatedConsultation = {
              id: 'consultation-id',
              patientId: testData.patientId,
              startedAt: new Date(),
              finishedAt: null,
              paidAt: testData.credits > 0 ? new Date() : null,
              status: 'OPEN',
              content: '',
              notes: '',
              price: testData.consultationPrice,
              paid: testData.credits > 0,
              createdAt: new Date(),
              updatedAt: new Date(),
              patient: {
                id: testData.patientId,
                name: testData.patientName,
                profilePhoto: null,
                birthDate: testData.birthDate
              }
            };

            mockPrisma.consultation.create.mockResolvedValue(mockCreatedConsultation);

            // Mock patient credit update if needed
            if (testData.credits > 0) {
              mockPrisma.patient.update.mockResolvedValue({
                ...mockPatient,
                credits: testData.credits - 1
              });
            }

            // Create consultation
            const result = await createConsultation({
              patientId: testData.patientId
            });

            const endTime = Date.now();

            // Verify consultation initialization (Requirement 5.1)
            expect(result).toBeDefined();
            expect(result.patientId).toBe(testData.patientId);
            expect(result.status).toBe('OPEN');
            expect(result.content).toBe('');
            expect(result.notes).toBe('');
            expect(Number(result.price)).toBe(testData.consultationPrice);

            // Verify timestamp is current (within test execution window)
            const consultationTime = new Date(result.startedAt).getTime();
            expect(consultationTime).toBeGreaterThanOrEqual(startTime - 1000); // Allow 1s buffer
            expect(consultationTime).toBeLessThanOrEqual(endTime + 1000);

            // Verify finishedAt is null for new consultations
            expect(result.finishedAt).toBeNull();

            // Verify credit-based payment logic (Requirement 5.2)
            if (testData.credits > 0) {
              expect(result.paid).toBe(true);
              expect(result.paidAt).not.toBeNull();
            } else {
              expect(result.paid).toBe(false);
              expect(result.paidAt).toBeNull();
            }

            // Verify patient data is included
            expect(result.patient).toBeDefined();
            expect(result.patient.id).toBe(testData.patientId);
            expect(result.patient.name).toBe(testData.patientName);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should use patient consultation price when no price is provided', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            patientId: fc.string({ minLength: 1 }),
            consultationPrice: fc.float({ min: Math.fround(0.01), max: Math.fround(999.99) }).filter(n => Number.isFinite(n)),
            credits: fc.integer({ min: 0, max: 10 })
          }),
          async (testData) => {
            // Mock patient with consultation price
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
              paidAt: testData.credits > 0 ? new Date() : null,
              status: 'OPEN',
              content: '',
              notes: '',
              price: testData.consultationPrice,
              paid: testData.credits > 0,
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

            // Create consultation without specifying price
            const result = await createConsultation({
              patientId: testData.patientId
            });

            // Should use patient's consultation price
            expect(Number(result.price)).toBe(testData.consultationPrice);

            // Verify consultation.create was called with patient's price
            expect(mockPrisma.consultation.create).toHaveBeenCalledWith(
              expect.objectContaining({
                data: expect.objectContaining({
                  price: testData.consultationPrice
                })
              })
            );
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should use provided price when explicitly specified', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            patientId: fc.string({ minLength: 1 }),
            patientPrice: fc.float({ min: Math.fround(0.01), max: Math.fround(999.99) }).filter(n => Number.isFinite(n)),
            providedPrice: fc.float({ min: Math.fround(0.01), max: Math.fround(999.99) }).filter(n => Number.isFinite(n)),
            credits: fc.integer({ min: 0, max: 10 })
          }),
          async (testData) => {
            // Mock patient with different consultation price
            const mockPatient = {
              id: testData.patientId,
              name: 'Test Patient',
              consultationPrice: testData.patientPrice,
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
              paidAt: testData.credits > 0 ? new Date() : null,
              status: 'OPEN',
              content: '',
              notes: '',
              price: testData.providedPrice,
              paid: testData.credits > 0,
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

            // Create consultation with explicit price
            const result = await createConsultation({
              patientId: testData.patientId,
              price: testData.providedPrice
            });

            // Should use provided price, not patient's price
            expect(Number(result.price)).toBe(testData.providedPrice);

            // Verify consultation.create was called with provided price
            expect(mockPrisma.consultation.create).toHaveBeenCalledWith(
              expect.objectContaining({
                data: expect.objectContaining({
                  price: testData.providedPrice
                })
              })
            );
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should prevent creation when patient has unfinalized consultations', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            patientId: fc.string({ minLength: 1 }),
            consultationPrice: fc.float({ min: Math.fround(0.01), max: Math.fround(999.99) }).filter(n => Number.isFinite(n))
          }),
          async (testData) => {
            // Mock patient
            const mockPatient = {
              id: testData.patientId,
              name: 'Test Patient',
              consultationPrice: testData.consultationPrice,
              credits: 0,
              birthDate: new Date('1990-01-01')
            };

            // Mock existing unfinalized consultation
            const mockUnfinalizedConsultation = {
              id: 'existing-consultation',
              patientId: testData.patientId,
              status: 'OPEN'
            };

            mockPrisma.patient.findUnique.mockResolvedValue(mockPatient);
            mockPrisma.consultation.findFirst.mockResolvedValue(mockUnfinalizedConsultation);

            // Should throw error when trying to create consultation
            await expect(
              createConsultation({
                patientId: testData.patientId
              })
            ).rejects.toThrow('Paciente possui consulta não finalizada');

            // Should not attempt to create new consultation
            expect(mockPrisma.consultation.create).not.toHaveBeenCalled();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle credit deduction correctly for patients with credits', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            patientId: fc.string({ minLength: 1 }),
            initialCredits: fc.integer({ min: 1, max: 100 }),
            consultationPrice: fc.float({ min: Math.fround(0.01), max: Math.fround(999.99) }).filter(n => Number.isFinite(n))
          }),
          async (testData) => {
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

            // Verify patient credit was decremented
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

  describe('Consultation Initialization Error Handling', () => {
    it('should handle patient not found error', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1 }),
          async (patientId) => {
            // Mock patient not found
            mockPrisma.patient.findUnique.mockResolvedValue(null);

            await expect(
              createConsultation({ patientId })
            ).rejects.toThrow('Paciente não encontrado');

            // Should not attempt to create consultation
            expect(mockPrisma.consultation.create).not.toHaveBeenCalled();
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should handle missing consultation price error', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1 }),
          async (patientId) => {
            // Mock patient without consultation price
            const mockPatient = {
              id: patientId,
              name: 'Test Patient',
              consultationPrice: null, // No price set
              credits: 0,
              birthDate: new Date('1990-01-01')
            };

            mockPrisma.consultation.findFirst.mockResolvedValue(null);
            mockPrisma.patient.findUnique.mockResolvedValue(mockPatient);

            await expect(
              createConsultation({ patientId })
            ).rejects.toThrow('Preço da consulta deve ser definido');

            // Should not attempt to create consultation
            expect(mockPrisma.consultation.create).not.toHaveBeenCalled();
          }
        ),
        { numRuns: 50 }
      );
    });
  });
});