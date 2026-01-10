/**
 * Tests for Patient CRUD Operations
 * Requirements: 1.1, 1.2, 3.2, 3.3, 3.4
 */

import { createPatient, updatePatient, getPatient, listPatients, searchPatients, deletePatient } from '@/lib/patients'
import { prisma } from '@/lib/prisma'
import { Gender, Religion } from '@/lib/validations'

// Mock Prisma for testing
jest.mock('@/lib/prisma', () => ({
  prisma: {
    patient: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      delete: jest.fn()
    },
    consultation: {
      count: jest.fn()
    }
  }
}))

const mockPrisma = prisma as jest.Mocked<typeof prisma>

describe('Patient CRUD Operations', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('createPatient', () => {
    it('should create a patient with valid data', async () => {
      const patientData = {
        name: 'João Silva',
        birthDate: new Date('1990-01-01'),
        gender: Gender.MALE,
        religion: Religion.CATHOLIC,
        phone1: '11999999999',
        hasTherapyHistory: false,
        takesMedication: false,
        hasHospitalization: false,
        credits: 0
      }

      const mockCreatedPatient = {
        id: 'patient-123',
        ...patientData,
        profilePhoto: null,
        cpf: null,
        rg: null,
        legalGuardian: null,
        legalGuardianEmail: null,
        legalGuardianCpf: null,
        phone2: null,
        email: null,
        therapyHistoryDetails: null,
        medicationSince: null,
        medicationNames: null,
        hospitalizationDate: null,
        hospitalizationReason: null,
        consultationPrice: null,
        consultationFrequency: null,
        consultationDay: null,
        createdAt: new Date(),
        updatedAt: new Date()
      }

      mockPrisma.patient.create.mockResolvedValue(mockCreatedPatient)

      const result = await createPatient(patientData)

      expect(mockPrisma.patient.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          name: patientData.name,
          birthDate: patientData.birthDate,
          gender: patientData.gender,
          religion: patientData.religion,
          phone1: patientData.phone1,
          credits: patientData.credits
        })
      })

      expect(result).toEqual(expect.objectContaining({
        id: 'patient-123',
        name: 'João Silva',
        age: expect.any(Number)
      }))
    })

    it('should throw error for invalid patient data', async () => {
      const invalidData = {
        name: '', // Invalid: empty name
        birthDate: new Date('1990-01-01'),
        gender: Gender.MALE,
        religion: Religion.CATHOLIC,
        phone1: '11999999999',
        hasTherapyHistory: false,
        takesMedication: false,
        hasHospitalization: false,
        credits: 0
      }

      await expect(createPatient(invalidData)).rejects.toThrow('Dados inválidos')
    })
  })

  describe('getPatient', () => {
    it('should return patient with age when found', async () => {
      const mockPatient = {
        id: 'patient-123',
        name: 'João Silva',
        birthDate: new Date('1990-01-01'),
        gender: Gender.MALE,
        religion: Religion.CATHOLIC,
        phone1: '11999999999',
        hasTherapyHistory: false,
        takesMedication: false,
        hasHospitalization: false,
        credits: 0,
        profilePhoto: null,
        cpf: null,
        rg: null,
        legalGuardian: null,
        legalGuardianEmail: null,
        legalGuardianCpf: null,
        phone2: null,
        email: null,
        therapyHistoryDetails: null,
        medicationSince: null,
        medicationNames: null,
        hospitalizationDate: null,
        hospitalizationReason: null,
        consultationPrice: null,
        consultationFrequency: null,
        consultationDay: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        consultations: []
      }

      mockPrisma.patient.findUnique.mockResolvedValue(mockPatient)

      const result = await getPatient('patient-123')

      expect(mockPrisma.patient.findUnique).toHaveBeenCalledWith({
        where: { id: 'patient-123' },
        include: {
          consultations: {
            orderBy: { createdAt: 'desc' },
            take: 1
          }
        }
      })

      expect(result).toEqual(expect.objectContaining({
        id: 'patient-123',
        name: 'João Silva',
        age: expect.any(Number)
      }))
    })

    it('should return null when patient not found', async () => {
      mockPrisma.patient.findUnique.mockResolvedValue(null)

      const result = await getPatient('nonexistent-id')

      expect(result).toBeNull()
    })

    it('should throw error for empty ID', async () => {
      await expect(getPatient('')).rejects.toThrow('ID do paciente é obrigatório')
    })
  })

  describe('listPatients', () => {
    it('should list patients with pagination', async () => {
      const mockPatients = [
        {
          id: 'patient-1',
          name: 'João Silva',
          birthDate: new Date('1990-01-01'),
          gender: Gender.MALE,
          religion: Religion.CATHOLIC,
          phone1: '11999999999',
          hasTherapyHistory: false,
          takesMedication: false,
          hasHospitalization: false,
          credits: 0,
          profilePhoto: null,
          cpf: null,
          rg: null,
          legalGuardian: null,
          legalGuardianEmail: null,
          legalGuardianCpf: null,
          phone2: null,
          email: null,
          therapyHistoryDetails: null,
          medicationSince: null,
          medicationNames: null,
          hospitalizationDate: null,
          hospitalizationReason: null,
          consultationPrice: null,
          consultationFrequency: null,
          consultationDay: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          consultations: []
        }
      ]

      mockPrisma.patient.count.mockResolvedValue(1)
      mockPrisma.patient.findMany.mockResolvedValue(mockPatients)

      const result = await listPatients({ page: 1, limit: 10 })

      expect(mockPrisma.patient.count).toHaveBeenCalled()
      expect(mockPrisma.patient.findMany).toHaveBeenCalledWith({
        where: {},
        orderBy: { name: 'asc' },
        skip: 0,
        take: 10,
        include: {
          _count: {
            select: {
              consultations: {
                where: { status: 'OPEN' }
              }
            }
          }
        }
      })

      expect(result).toEqual({
        patients: expect.arrayContaining([
          expect.objectContaining({
            id: 'patient-1',
            name: 'João Silva',
            age: expect.any(Number)
          })
        ]),
        totalCount: 1,
        totalPages: 1,
        currentPage: 1,
        hasNextPage: false,
        hasPreviousPage: false
      })
    })

    it('should filter patients by search term', async () => {
      mockPrisma.patient.count.mockResolvedValue(0)
      mockPrisma.patient.findMany.mockResolvedValue([])

      await listPatients({ search: 'João' })

      expect(mockPrisma.patient.findMany).toHaveBeenCalledWith({
        where: {
          name: {
            contains: 'João'
          }
        },
        orderBy: { name: 'asc' },
        skip: 0,
        take: 10,
        include: {
          _count: {
            select: {
              consultations: {
                where: { status: 'OPEN' }
              }
            }
          }
        }
      })
    })

    it('should sort patients by age', async () => {
      mockPrisma.patient.count.mockResolvedValue(0)
      mockPrisma.patient.findMany.mockResolvedValue([])

      await listPatients({ sortBy: 'age', sortOrder: 'desc' })

      expect(mockPrisma.patient.findMany).toHaveBeenCalledWith({
        where: {},
        orderBy: { birthDate: 'asc' }, // Age desc = birthDate asc
        skip: 0,
        take: 10,
        include: {
          _count: {
            select: {
              consultations: {
                where: { status: 'OPEN' }
              }
            }
          }
        }
      })
    })
  })

  describe('searchPatients', () => {
    it('should search patients by name', async () => {
      const mockResults = [
        { id: 'patient-1', name: 'João Silva' },
        { id: 'patient-2', name: 'João Santos' }
      ]

      mockPrisma.patient.findMany.mockResolvedValue(mockResults)

      const result = await searchPatients('João')

      expect(mockPrisma.patient.findMany).toHaveBeenCalledWith({
        where: {
          name: {
            contains: 'João'
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
      const result = await searchPatients('J')
      expect(result).toEqual([])
    })
  })

  describe('updatePatient', () => {
    it('should update patient successfully', async () => {
      const existingPatient = {
        id: 'patient-123',
        name: 'João Silva',
        birthDate: new Date('1990-01-01'),
        gender: Gender.MALE,
        religion: Religion.CATHOLIC,
        phone1: '11999999999',
        hasTherapyHistory: false,
        takesMedication: false,
        hasHospitalization: false,
        credits: 0
      }

      const updatedPatient = {
        ...existingPatient,
        name: 'João Santos'
      }

      mockPrisma.patient.findUnique.mockResolvedValue(existingPatient as any)
      mockPrisma.patient.update.mockResolvedValue(updatedPatient as any)

      const result = await updatePatient('patient-123', { name: 'João Santos' })

      expect(mockPrisma.patient.update).toHaveBeenCalledWith({
        where: { id: 'patient-123' },
        data: { name: 'João Santos' }
      })

      expect(result).toEqual(expect.objectContaining({
        name: 'João Santos',
        age: expect.any(Number)
      }))
    })
  })

  describe('deletePatient', () => {
    it('should delete patient without consultations', async () => {
      mockPrisma.consultation.count.mockResolvedValue(0)
      mockPrisma.patient.delete.mockResolvedValue({} as any)

      await deletePatient('patient-123')

      expect(mockPrisma.consultation.count).toHaveBeenCalledWith({
        where: { patientId: 'patient-123' }
      })
      expect(mockPrisma.patient.delete).toHaveBeenCalledWith({
        where: { id: 'patient-123' }
      })
    })

    it('should throw error when patient has consultations', async () => {
      mockPrisma.consultation.count.mockResolvedValue(1)

      await expect(deletePatient('patient-123')).rejects.toThrow(
        'Não é possível excluir paciente com consultas registradas'
      )
    })
  })
})