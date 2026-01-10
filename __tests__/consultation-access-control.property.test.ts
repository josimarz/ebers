/**
 * Property-Based Tests for Consultation Access Control
 * Feature: patient-management-system, Property 14: Consultation Access Control
 * **Validates: Requirements 6.5**
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

describe('Consultation Access Control Property Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup default mock implementations
    mockPrisma.$transaction.mockImplementation(async (callback) => {
      return await callback(mockPrisma);
    });
  });

  /**
   * Property 14: Consultation Access Control
   * For any patient with unfinalized consultations, the system should prevent creation of new consultations
   */
  describe('Property 14: Consultation Access Control', () => {
    it('should prevent new consultation creation for any patient with unfinalized consultations', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            patientId: fc.string({ minLength: 1 }).filter(s => s.trim().length > 0),
            patientName: fc.string({ minLength: 1 }).filter(s => s.trim().length > 0),
            consultationPrice: fc.float({ min: Math.fround(0.01), max: Math.fround(999.99) }).filter(n => Number.isFinite(n)),
            credits: fc.integer({ min: 0, max: 100 }),
            birthDate: fc.date({ min: new Date('1900-01-01'), max: new Date('2020-01-01') }),
            existingConsultationId: fc.string({ minLength: 1 }).filter(s => s.trim().length > 0),
            existingConsultationStartTime: fc.date({ min: new Date('2024-01-01'), max: new Date() })
          }),
          async (testData) => {
            // Mock patient data
            const mockPatient = {
              id: testData.patientId,
              name: testData.patientName,
              consultationPrice: testData.consultationPrice,
              credits: testData.credits,
              birthDate: testData.birthDate
            };

            // Mock existing unfinalized consultation (OPEN status)
            const mockUnfinalizedConsultation = {
              id: testData.existingConsultationId,
              patientId: testData.patientId,
              startedAt: testData.existingConsultationStartTime,
              finishedAt: null,
              paidAt: testData.credits > 0 ? new Date() : null,
              status: 'OPEN', // Unfinalized consultation
              content: 'Existing consultation content',
              notes: 'Existing consultation notes',
              price: testData.consultationPrice,
              paid: testData.credits > 0,
              createdAt: testData.existingConsultationStartTime,
              updatedAt: testData.existingConsultationStartTime
            };

            // Setup mocks
            mockPrisma.patient.findUnique.mockResolvedValue(mockPatient);
            mockPrisma.consultation.findFirst.mockResolvedValue(mockUnfinalizedConsultation);

            // Attempt to create new consultation should fail (Requirement 6.5)
            await expect(
              createConsultation({
                patientId: testData.patientId
              })
            ).rejects.toThrow('Paciente possui consulta não finalizada. Finalize a consulta atual antes de criar uma nova.');

            // Verify that the system checked for existing unfinalized consultations
            expect(mockPrisma.consultation.findFirst).toHaveBeenCalledWith({
              where: {
                patientId: testData.patientId,
                status: 'OPEN'
              }
            });

            // Verify that no new consultation was created
            expect(mockPrisma.consultation.create).not.toHaveBeenCalled();

            // Verify that no patient credits were modified
            expect(mockPrisma.patient.update).not.toHaveBeenCalled();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should allow new consultation creation for any patient without unfinalized consultations', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            patientId: fc.string({ minLength: 1 }).filter(s => s.trim().length > 0),
            patientName: fc.string({ minLength: 1 }).filter(s => s.trim().length > 0),
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
            mockPrisma.patient.findUnique.mockResolvedValue(mockPatient);

            // Mock successful consultation creation
            const mockCreatedConsultation = {
              id: 'new-consultation-id',
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

            // Create consultation should succeed
            const result = await createConsultation({
              patientId: testData.patientId
            });

            const endTime = Date.now();

            // Verify consultation was created successfully
            expect(result).toBeDefined();
            expect(result.patientId).toBe(testData.patientId);
            expect(result.status).toBe('OPEN');

            // Verify that the system checked for existing unfinalized consultations
            expect(mockPrisma.consultation.findFirst).toHaveBeenCalledWith({
              where: {
                patientId: testData.patientId,
                status: 'OPEN'
              }
            });

            // Verify that new consultation was created
            expect(mockPrisma.consultation.create).toHaveBeenCalledWith(
              expect.objectContaining({
                data: expect.objectContaining({
                  patientId: testData.patientId,
                  status: 'OPEN',
                  content: '',
                  notes: '',
                  price: testData.consultationPrice,
                  paid: testData.credits > 0
                })
              })
            );

            // Verify timestamp is current (within test execution window)
            const consultationTime = new Date(result.startedAt).getTime();
            expect(consultationTime).toBeGreaterThanOrEqual(startTime - 1000); // Allow 1s buffer
            expect(consultationTime).toBeLessThanOrEqual(endTime + 1000);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should allow new consultation creation after existing consultation is finalized', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            patientId: fc.string({ minLength: 1 }).filter(s => s.trim().length > 0),
            patientName: fc.string({ minLength: 1 }).filter(s => s.trim().length > 0),
            consultationPrice: fc.float({ min: Math.fround(0.01), max: Math.fround(999.99) }).filter(n => Number.isFinite(n)),
            credits: fc.integer({ min: 0, max: 100 }),
            birthDate: fc.date({ min: new Date('1900-01-01'), max: new Date('2020-01-01') }),
            finalizedConsultationId: fc.string({ minLength: 1 }).filter(s => s.trim().length > 0),
            finalizedConsultationStartTime: fc.date({ min: new Date('2024-01-01'), max: new Date() }),
            finalizedConsultationEndTime: fc.date({ min: new Date('2024-01-01'), max: new Date() })
          }),
          async (testData) => {
            // Mock patient data
            const mockPatient = {
              id: testData.patientId,
              name: testData.patientName,
              consultationPrice: testData.consultationPrice,
              credits: testData.credits,
              birthDate: testData.birthDate
            };

            // Mock no unfinalized consultations (only finalized ones exist)
            // The findFirst query looks for status: 'OPEN', so finalized consultations won't be returned
            mockPrisma.consultation.findFirst.mockResolvedValue(null);
            mockPrisma.patient.findUnique.mockResolvedValue(mockPatient);

            // Mock successful consultation creation
            const mockCreatedConsultation = {
              id: 'new-consultation-id',
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

            // Create consultation should succeed even if patient has finalized consultations
            const result = await createConsultation({
              patientId: testData.patientId
            });

            // Verify consultation was created successfully
            expect(result).toBeDefined();
            expect(result.patientId).toBe(testData.patientId);
            expect(result.status).toBe('OPEN');

            // Verify that the system checked specifically for OPEN (unfinalized) consultations
            expect(mockPrisma.consultation.findFirst).toHaveBeenCalledWith({
              where: {
                patientId: testData.patientId,
                status: 'OPEN'
              }
            });

            // Verify that new consultation was created
            expect(mockPrisma.consultation.create).toHaveBeenCalled();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should enforce access control consistently across multiple patients', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            patient1Id: fc.string({ minLength: 1 }).filter(s => s.trim().length > 0),
            patient2Id: fc.string({ minLength: 1 }).filter(s => s.trim().length > 0),
            patient1HasUnfinalized: fc.boolean(),
            patient2HasUnfinalized: fc.boolean(),
            consultationPrice: fc.float({ min: Math.fround(0.01), max: Math.fround(999.99) }).filter(n => Number.isFinite(n))
          }).filter(data => data.patient1Id !== data.patient2Id), // Ensure different patient IDs
          async (testData) => {
            // Mock patients
            const mockPatient1 = {
              id: testData.patient1Id,
              name: 'Patient 1',
              consultationPrice: testData.consultationPrice,
              credits: 0,
              birthDate: new Date('1990-01-01')
            };

            const mockPatient2 = {
              id: testData.patient2Id,
              name: 'Patient 2',
              consultationPrice: testData.consultationPrice,
              credits: 0,
              birthDate: new Date('1990-01-01')
            };

            // Setup mocks for patient lookups
            mockPrisma.patient.findUnique
              .mockImplementation(async ({ where }) => {
                if (where.id === testData.patient1Id) return mockPatient1;
                if (where.id === testData.patient2Id) return mockPatient2;
                return null;
              });

            // Setup mocks for consultation checks
            mockPrisma.consultation.findFirst
              .mockImplementation(async ({ where }) => {
                if (where.patientId === testData.patient1Id && where.status === 'OPEN') {
                  return testData.patient1HasUnfinalized ? { id: 'unfinalized-1', patientId: testData.patient1Id, status: 'OPEN' } : null;
                }
                if (where.patientId === testData.patient2Id && where.status === 'OPEN') {
                  return testData.patient2HasUnfinalized ? { id: 'unfinalized-2', patientId: testData.patient2Id, status: 'OPEN' } : null;
                }
                return null;
              });

            // Mock successful consultation creation
            const mockCreatedConsultation = {
              id: 'new-consultation',
              patientId: '',
              startedAt: new Date(),
              finishedAt: null,
              paidAt: null,
              status: 'OPEN',
              content: '',
              notes: '',
              price: testData.consultationPrice,
              paid: false,
              createdAt: new Date(),
              updatedAt: new Date(),
              patient: {
                id: '',
                name: '',
                profilePhoto: null,
                birthDate: new Date('1990-01-01')
              }
            };

            mockPrisma.consultation.create.mockResolvedValue(mockCreatedConsultation);

            // Test patient 1
            if (testData.patient1HasUnfinalized) {
              await expect(
                createConsultation({ patientId: testData.patient1Id })
              ).rejects.toThrow('Paciente possui consulta não finalizada');
            } else {
              const result1 = await createConsultation({ patientId: testData.patient1Id });
              expect(result1).toBeDefined();
            }

            // Reset mocks for second test
            mockPrisma.consultation.create.mockReset();
            mockPrisma.consultation.create.mockResolvedValue({
              ...mockCreatedConsultation,
              patientId: testData.patient2Id,
              patient: { ...mockCreatedConsultation.patient, id: testData.patient2Id, name: 'Patient 2' }
            });

            // Test patient 2
            if (testData.patient2HasUnfinalized) {
              await expect(
                createConsultation({ patientId: testData.patient2Id })
              ).rejects.toThrow('Paciente possui consulta não finalizada');
            } else {
              const result2 = await createConsultation({ patientId: testData.patient2Id });
              expect(result2).toBeDefined();
            }

            // Verify that access control was checked for both patients
            expect(mockPrisma.consultation.findFirst).toHaveBeenCalledWith({
              where: { patientId: testData.patient1Id, status: 'OPEN' }
            });
            expect(mockPrisma.consultation.findFirst).toHaveBeenCalledWith({
              where: { patientId: testData.patient2Id, status: 'OPEN' }
            });
          }
        ),
        { numRuns: 50 } // Reduced runs for complex multi-patient test
      );
    });

    it('should validate access control with different consultation statuses', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            patientId: fc.string({ minLength: 1 }).filter(s => s.trim().length > 0),
            existingConsultationStatus: fc.constantFrom('OPEN', 'FINALIZED'),
            consultationPrice: fc.float({ min: Math.fround(0.01), max: Math.fround(999.99) }).filter(n => Number.isFinite(n))
          }),
          async (testData) => {
            // Reset all mocks for this test iteration
            jest.clearAllMocks();
            mockPrisma.patient.findUnique.mockReset();
            mockPrisma.consultation.findFirst.mockReset();
            mockPrisma.consultation.create.mockReset();

            // Mock patient
            const mockPatient = {
              id: testData.patientId,
              name: 'Test Patient',
              consultationPrice: testData.consultationPrice,
              credits: 0,
              birthDate: new Date('1990-01-01')
            };

            mockPrisma.patient.findUnique.mockResolvedValue(mockPatient);

            // Mock existing consultation with specific status
            if (testData.existingConsultationStatus === 'OPEN') {
              // Mock unfinalized consultation found
              mockPrisma.consultation.findFirst.mockResolvedValue({
                id: 'existing-consultation',
                patientId: testData.patientId,
                status: 'OPEN'
              });

              // Should prevent creation
              await expect(
                createConsultation({ patientId: testData.patientId })
              ).rejects.toThrow('Paciente possui consulta não finalizada');

              expect(mockPrisma.consultation.create).not.toHaveBeenCalled();
            } else {
              // Mock no unfinalized consultations (FINALIZED consultations don't block new ones)
              mockPrisma.consultation.findFirst.mockResolvedValue(null);

              // Mock successful creation
              const mockCreatedConsultation = {
                id: 'new-consultation',
                patientId: testData.patientId,
                startedAt: new Date(),
                finishedAt: null,
                paidAt: null,
                status: 'OPEN',
                content: '',
                notes: '',
                price: testData.consultationPrice,
                paid: false,
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

              // Should allow creation
              const result = await createConsultation({ patientId: testData.patientId });
              expect(result).toBeDefined();
              expect(result.status).toBe('OPEN');
            }

            // Verify that the system specifically checked for OPEN status consultations
            expect(mockPrisma.consultation.findFirst).toHaveBeenCalledWith({
              where: {
                patientId: testData.patientId,
                status: 'OPEN'
              }
            });
          }
        ),
        { numRuns: 50 } // Reduced runs to avoid mock accumulation
      );
    });
  });

  describe('Consultation Access Control Error Handling', () => {
    beforeEach(() => {
      jest.clearAllMocks();
      mockPrisma.$transaction.mockImplementation(async (callback) => {
        return await callback(mockPrisma);
      });
    });

    it('should handle database errors during access control checks', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            patientId: fc.string({ minLength: 1 }).filter(s => s.trim().length > 0),
            errorMessage: fc.string({ minLength: 1 })
          }),
          async (testData) => {
            // Mock patient lookup success
            mockPrisma.patient.findUnique.mockResolvedValue({
              id: testData.patientId,
              name: 'Test Patient',
              consultationPrice: 100,
              credits: 0,
              birthDate: new Date('1990-01-01')
            });

            // Mock database error during consultation check
            mockPrisma.consultation.findFirst.mockRejectedValue(new Error(testData.errorMessage));

            // Should propagate error with proper message format
            await expect(
              createConsultation({ patientId: testData.patientId })
            ).rejects.toThrow(`Erro ao criar consulta: ${testData.errorMessage}`);

            // Should not attempt to create consultation
            expect(mockPrisma.consultation.create).not.toHaveBeenCalled();
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should validate patient ID parameter and handle empty IDs gracefully', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.oneof(
            fc.constant(''),
            fc.constant('   '),
            fc.constant('\t\n'),
            fc.string().filter(s => s.trim().length === 0)
          ),
          async (invalidPatientId) => {
            // Mock patient not found for empty/invalid IDs
            mockPrisma.patient.findUnique.mockResolvedValue(null);

            // Should throw patient not found error for invalid patient IDs
            await expect(
              createConsultation({ patientId: invalidPatientId })
            ).rejects.toThrow('Paciente não encontrado');

            // The implementation does call patient.findUnique first, which is expected
            expect(mockPrisma.patient.findUnique).toHaveBeenCalledWith({
              where: { id: invalidPatientId }
            });

            // Should not attempt to check consultations or create new ones
            expect(mockPrisma.consultation.findFirst).not.toHaveBeenCalled();
            expect(mockPrisma.consultation.create).not.toHaveBeenCalled();
          }
        ),
        { numRuns: 20 }
      );
    });
  });
});