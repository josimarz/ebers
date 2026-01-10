/**
 * Tests for Consultation CRUD Operations
 * Requirements: 5.1, 5.6, 5.7, 6.1, 6.3
 */

import {
  createConsultation,
  updateConsultation,
  getConsultation,
  listConsultations,
  getActiveConsultation,
  finalizeConsultation,
  processConsultationPayment,
  getPatientConsultations,
  searchPatientsForConsultations,
  deleteConsultation
} from '@/lib/consultations'
import { prisma } from '@/lib/prisma'
import { Decimal } from '@prisma/client/runtime/library'

// Mock Prisma for testing
jest.mock('@/lib/prisma', () => ({
  prisma: {
    patient: {
      findUnique: jest.fn(),
      update: jest.fn(),
      findMany: jest.fn()
    },
    consultation: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      delete: jest.fn()
    },
    $transaction: jest.fn()
  }
}))

const mockPrisma = prisma as jest.Mocked<typeof prisma>

describe('Consultation CRUD Operations', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('createConsultation', () => {
    it('should create consultation with patient credits (auto-paid)', async () => {
      const consultationData = {
        patientId: 'patient-123',
        price: 100
      }

      const mockPatient = {
        id: 'patient-123',
        name: 'João Silva',
        credits: 5,
        consultationPrice: new Decimal(100)
      }

      const mockCreatedConsultation = {
        id: 'consultation-123',
        patientId: 'patient-123',
        startedAt: new Date(),
        finishedAt: null,
        paidAt: new Date(),
        status: 'OPEN',
        content: '',
        notes: '',
        price: new Decimal(100),
        paid: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        patient: {
          id: 'patient-123',
          name: 'João Silva',
          profilePhoto: null,
          birthDate: new Date('1990-01-01')
        }
      }

      mockPrisma.patient.findUnique.mockResolvedValue(mockPatient as any)
      mockPrisma.consultation.findFirst.mockResolvedValue(null) // No unfinalized consultations
      mockPrisma.$transaction.mockImplementation(async (callback) => {
        return callback({
          consultation: {
            create: jest.fn().mockResolvedValue(mockCreatedConsultation)
          },
          patient: {
            update: jest.fn().mockResolvedValue({})
          }
        })
      })

      const result = await createConsultation(consultationData)

      expect(mockPrisma.patient.findUnique).toHaveBeenCalledWith({
        where: { id: 'patient-123' }
      })

      expect(result).toEqual(expect.objectContaining({
        id: 'consultation-123',
        patientId: 'patient-123',
        status: 'OPEN',
        paid: true,
        patient: expect.objectContaining({
          name: 'João Silva',
          age: expect.any(Number)
        })
      }))
    })

    it('should create consultation without credits (unpaid)', async () => {
      const consultationData = {
        patientId: 'patient-123',
        price: 100
      }

      const mockPatient = {
        id: 'patient-123',
        name: 'João Silva',
        credits: 0, // No credits
        consultationPrice: new Decimal(100)
      }

      const mockCreatedConsultation = {
        id: 'consultation-123',
        patientId: 'patient-123',
        startedAt: new Date(),
        finishedAt: null,
        paidAt: null,
        status: 'OPEN',
        content: '',
        notes: '',
        price: new Decimal(100),
        paid: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        patient: {
          id: 'patient-123',
          name: 'João Silva',
          profilePhoto: null,
          birthDate: new Date('1990-01-01')
        }
      }

      mockPrisma.patient.findUnique.mockResolvedValue(mockPatient as any)
      mockPrisma.consultation.findFirst.mockResolvedValue(null)
      mockPrisma.$transaction.mockImplementation(async (callback) => {
        return callback({
          consultation: {
            create: jest.fn().mockResolvedValue(mockCreatedConsultation)
          },
          patient: {
            update: jest.fn()
          }
        })
      })

      const result = await createConsultation(consultationData)

      expect(result).toEqual(expect.objectContaining({
        paid: false,
        paidAt: null
      }))
    })

    it('should throw error when patient not found', async () => {
      mockPrisma.patient.findUnique.mockResolvedValue(null)

      await expect(createConsultation({
        patientId: 'nonexistent',
        price: new Decimal(100)
      })).rejects.toThrow('Paciente não encontrado')
    })

    it('should throw error when patient has unfinalized consultation', async () => {
      const mockPatient = {
        id: 'patient-123',
        credits: 0,
        consultationPrice: new Decimal(100)
      }

      const mockUnfinalizedConsultation = {
        id: 'consultation-456',
        status: 'OPEN'
      }

      mockPrisma.patient.findUnique.mockResolvedValue(mockPatient as any)
      mockPrisma.consultation.findFirst.mockResolvedValue(mockUnfinalizedConsultation as any)

      await expect(createConsultation({
        patientId: 'patient-123',
        price: 100
      })).rejects.toThrow('Paciente possui consulta não finalizada')
    })

    it('should throw error when consultation price not defined', async () => {
      const mockPatient = {
        id: 'patient-123',
        credits: 0,
        consultationPrice: null // No price defined
      }

      mockPrisma.patient.findUnique.mockResolvedValue(mockPatient as any)
      mockPrisma.consultation.findFirst.mockResolvedValue(null)

      await expect(createConsultation({
        patientId: 'patient-123'
      })).rejects.toThrow('Preço da consulta deve ser definido')
    })
  })

  describe('getConsultation', () => {
    it('should return consultation with patient data when found', async () => {
      const mockConsultation = {
        id: 'consultation-123',
        patientId: 'patient-123',
        startedAt: new Date(),
        finishedAt: null,
        paidAt: null,
        status: 'OPEN',
        content: 'Patient content',
        notes: 'Therapist notes',
        price: new Decimal(100),
        paid: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        patient: {
          id: 'patient-123',
          name: 'João Silva',
          profilePhoto: null,
          birthDate: new Date('1990-01-01')
        }
      }

      mockPrisma.consultation.findUnique.mockResolvedValue(mockConsultation as any)

      const result = await getConsultation('consultation-123')

      expect(mockPrisma.consultation.findUnique).toHaveBeenCalledWith({
        where: { id: 'consultation-123' },
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
      })

      expect(result).toEqual(expect.objectContaining({
        id: 'consultation-123',
        content: 'Patient content',
        notes: 'Therapist notes',
        patient: expect.objectContaining({
          name: 'João Silva',
          age: expect.any(Number)
        })
      }))
    })

    it('should return null when consultation not found', async () => {
      mockPrisma.consultation.findUnique.mockResolvedValue(null)

      const result = await getConsultation('nonexistent-id')

      expect(result).toBeNull()
    })

    it('should throw error for empty ID', async () => {
      await expect(getConsultation('')).rejects.toThrow('ID da consulta é obrigatório')
    })
  })

  describe('listConsultations', () => {
    it('should list consultations with pagination and default sorting', async () => {
      const mockConsultations = [
        {
          id: 'consultation-1',
          patientId: 'patient-123',
          startedAt: new Date(),
          finishedAt: null,
          paidAt: null,
          status: 'OPEN',
          content: '',
          notes: '',
          price: new Decimal(100),
          paid: false,
          createdAt: new Date(),
          updatedAt: new Date(),
          patient: {
            id: 'patient-123',
            name: 'João Silva',
            profilePhoto: null,
            birthDate: new Date('1990-01-01')
          }
        }
      ]

      mockPrisma.consultation.count.mockResolvedValue(1)
      mockPrisma.consultation.findMany.mockResolvedValue(mockConsultations as any)

      const result = await listConsultations({ page: 1, limit: 10 })

      expect(mockPrisma.consultation.count).toHaveBeenCalledWith({ where: {} })
      expect(mockPrisma.consultation.findMany).toHaveBeenCalledWith({
        where: {},
        orderBy: { startedAt: 'desc' }, // Default: most recent first
        skip: 0,
        take: 10,
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
      })

      expect(result).toEqual({
        consultations: expect.arrayContaining([
          expect.objectContaining({
            id: 'consultation-1',
            patient: expect.objectContaining({
              name: 'João Silva',
              age: expect.any(Number)
            })
          })
        ]),
        totalCount: 1,
        totalPages: 1,
        currentPage: 1,
        hasNextPage: false,
        hasPreviousPage: false
      })
    })

    it('should filter consultations by patient ID', async () => {
      mockPrisma.consultation.count.mockResolvedValue(0)
      mockPrisma.consultation.findMany.mockResolvedValue([])

      await listConsultations({ patientId: 'patient-123' })

      expect(mockPrisma.consultation.findMany).toHaveBeenCalledWith({
        where: { patientId: 'patient-123' },
        orderBy: { startedAt: 'desc' },
        skip: 0,
        take: 10,
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
      })
    })

    it('should filter consultations by status and payment', async () => {
      mockPrisma.consultation.count.mockResolvedValue(0)
      mockPrisma.consultation.findMany.mockResolvedValue([])

      await listConsultations({ status: 'FINALIZED', paid: true })

      expect(mockPrisma.consultation.findMany).toHaveBeenCalledWith({
        where: { status: 'FINALIZED', paid: true },
        orderBy: { startedAt: 'desc' },
        skip: 0,
        take: 10,
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
      })
    })
  })

  describe('getActiveConsultation', () => {
    it('should return active consultation for patient', async () => {
      const mockActiveConsultation = {
        id: 'consultation-123',
        patientId: 'patient-123',
        status: 'OPEN',
        startedAt: new Date(),
        patient: {
          id: 'patient-123',
          name: 'João Silva',
          profilePhoto: null,
          birthDate: new Date('1990-01-01')
        }
      }

      mockPrisma.consultation.findFirst.mockResolvedValue(mockActiveConsultation as any)

      const result = await getActiveConsultation('patient-123')

      expect(mockPrisma.consultation.findFirst).toHaveBeenCalledWith({
        where: {
          patientId: 'patient-123',
          status: 'OPEN'
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
        },
        orderBy: {
          startedAt: 'desc'
        }
      })

      expect(result).toEqual(expect.objectContaining({
        id: 'consultation-123',
        status: 'OPEN',
        patient: expect.objectContaining({
          name: 'João Silva',
          age: expect.any(Number)
        })
      }))
    })

    it('should return null when no active consultation found', async () => {
      mockPrisma.consultation.findFirst.mockResolvedValue(null)

      const result = await getActiveConsultation('patient-123')

      expect(result).toBeNull()
    })
  })

  describe('finalizeConsultation', () => {
    it('should finalize consultation successfully', async () => {
      const mockFinalizedConsultation = {
        id: 'consultation-123',
        status: 'FINALIZED',
        finishedAt: new Date(),
        patient: {
          id: 'patient-123',
          name: 'João Silva',
          profilePhoto: null,
          birthDate: new Date('1990-01-01')
        }
      }

      mockPrisma.consultation.update.mockResolvedValue(mockFinalizedConsultation as any)

      const result = await finalizeConsultation('consultation-123')

      expect(mockPrisma.consultation.update).toHaveBeenCalledWith({
        where: { id: 'consultation-123' },
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
      })

      expect(result).toEqual(expect.objectContaining({
        status: 'FINALIZED',
        finishedAt: expect.any(Date)
      }))
    })
  })

  describe('processConsultationPayment', () => {
    it('should process payment successfully', async () => {
      const mockPaidConsultation = {
        id: 'consultation-123',
        paid: true,
        paidAt: new Date(),
        patient: {
          id: 'patient-123',
          name: 'João Silva',
          profilePhoto: null,
          birthDate: new Date('1990-01-01')
        }
      }

      mockPrisma.consultation.update.mockResolvedValue(mockPaidConsultation as any)

      const result = await processConsultationPayment('consultation-123')

      expect(mockPrisma.consultation.update).toHaveBeenCalledWith({
        where: { id: 'consultation-123' },
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
      })

      expect(result).toEqual(expect.objectContaining({
        paid: true,
        paidAt: expect.any(Date)
      }))
    })
  })

  describe('updateConsultation', () => {
    it('should update consultation with finalization logic', async () => {
      const existingConsultation = {
        id: 'consultation-123',
        status: 'OPEN',
        finishedAt: null
      }

      const updatedConsultation = {
        id: 'consultation-123',
        status: 'FINALIZED',
        finishedAt: new Date(),
        patient: {
          id: 'patient-123',
          name: 'João Silva',
          profilePhoto: null,
          birthDate: new Date('1990-01-01')
        }
      }

      mockPrisma.consultation.findUnique.mockResolvedValue(existingConsultation as any)
      mockPrisma.consultation.update.mockResolvedValue(updatedConsultation as any)

      const result = await updateConsultation('consultation-123', { status: 'FINALIZED' })

      expect(mockPrisma.consultation.update).toHaveBeenCalledWith({
        where: { id: 'consultation-123' },
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
      })

      expect(result).toEqual(expect.objectContaining({
        status: 'FINALIZED',
        finishedAt: expect.any(Date)
      }))
    })

    it('should update consultation with payment logic', async () => {
      const existingConsultation = {
        id: 'consultation-123',
        paid: false,
        paidAt: null
      }

      const updatedConsultation = {
        id: 'consultation-123',
        paid: true,
        paidAt: new Date(),
        patient: {
          id: 'patient-123',
          name: 'João Silva',
          profilePhoto: null,
          birthDate: new Date('1990-01-01')
        }
      }

      mockPrisma.consultation.findUnique.mockResolvedValue(existingConsultation as any)
      mockPrisma.consultation.update.mockResolvedValue(updatedConsultation as any)

      const result = await updateConsultation('consultation-123', { paid: true })

      expect(mockPrisma.consultation.update).toHaveBeenCalledWith({
        where: { id: 'consultation-123' },
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
      })

      expect(result).toEqual(expect.objectContaining({
        paid: true,
        paidAt: expect.any(Date)
      }))
    })
  })

  describe('searchPatientsForConsultations', () => {
    it('should search patients who have consultations', async () => {
      const mockResults = [
        { id: 'patient-1', name: 'João Silva' },
        { id: 'patient-2', name: 'João Santos' }
      ]

      mockPrisma.patient.findMany.mockResolvedValue(mockResults as any)

      const result = await searchPatientsForConsultations('João')

      expect(mockPrisma.patient.findMany).toHaveBeenCalledWith({
        where: {
          name: {
            contains: 'João'
          },
          consultations: {
            some: {}
          }
        },
        select: {
          id: true,
          name: true
        },
        orderBy: {
          name: 'asc'
        },
        take: 10
      })

      expect(result).toEqual(mockResults)
    })

    it('should return empty array for short queries', async () => {
      const result = await searchPatientsForConsultations('J')
      expect(result).toEqual([])
    })
  })

  describe('deleteConsultation', () => {
    it('should delete unpaid and unfinalized consultation', async () => {
      const mockConsultation = {
        id: 'consultation-123',
        paid: false,
        status: 'OPEN'
      }

      mockPrisma.consultation.findUnique.mockResolvedValue(mockConsultation as any)
      mockPrisma.consultation.delete.mockResolvedValue({} as any)

      await deleteConsultation('consultation-123')

      expect(mockPrisma.consultation.delete).toHaveBeenCalledWith({
        where: { id: 'consultation-123' }
      })
    })

    it('should throw error when trying to delete paid consultation', async () => {
      const mockConsultation = {
        id: 'consultation-123',
        paid: true,
        status: 'OPEN'
      }

      mockPrisma.consultation.findUnique.mockResolvedValue(mockConsultation as any)

      await expect(deleteConsultation('consultation-123')).rejects.toThrow(
        'Não é possível excluir consulta paga'
      )
    })

    it('should throw error when trying to delete finalized consultation', async () => {
      const mockConsultation = {
        id: 'consultation-123',
        paid: false,
        status: 'FINALIZED'
      }

      mockPrisma.consultation.findUnique.mockResolvedValue(mockConsultation as any)

      await expect(deleteConsultation('consultation-123')).rejects.toThrow(
        'Não é possível excluir consulta finalizada'
      )
    })
  })
})