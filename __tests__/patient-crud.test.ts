/**
 * Tests for Patient CRUD Operations
 * Requirements: 1.1, 1.2, 3.2, 3.3, 3.4
 */

import { createPatient, updatePatient, getPatient, listPatients, searchPatients, deletePatient } from '@/lib/patients'
import { Gender, Religion } from '@/lib/validations'

// Get the mock db from jest.setup.js
const mockDb = jest.requireMock('@/lib/db').getDb()

describe('Patient CRUD Operations', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    // Reset chainable mock returns
    mockDb.select.mockReturnThis()
    mockDb.from.mockReturnThis()
    mockDb.where.mockReturnThis()
    mockDb.orderBy.mockReturnThis()
    mockDb.limit.mockReturnThis()
    mockDb.offset.mockReturnThis()
    mockDb.insert.mockReturnThis()
    mockDb.values.mockReturnThis()
    mockDb.update.mockReturnThis()
    mockDb.set.mockReturnThis()
    mockDb.delete.mockReturnThis()
    mockDb.selectDistinct.mockReturnThis()
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

      // Mock insert operation
      mockDb.run.mockReturnValue({ changes: 1 })

      const result = await createPatient(patientData)

      expect(mockDb.insert).toHaveBeenCalled()
      expect(mockDb.values).toHaveBeenCalled()
      expect(mockDb.run).toHaveBeenCalled()

      expect(result).toEqual(expect.objectContaining({
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
        updatedAt: new Date()
      }

      mockDb.get.mockReturnValue(mockPatient)

      const result = await getPatient('patient-123')

      expect(mockDb.select).toHaveBeenCalled()
      expect(mockDb.from).toHaveBeenCalled()
      expect(mockDb.where).toHaveBeenCalled()
      expect(mockDb.get).toHaveBeenCalled()

      expect(result).toEqual(expect.objectContaining({
        id: 'patient-123',
        name: 'João Silva',
        age: expect.any(Number)
      }))
    })

    it('should return null when patient not found', async () => {
      mockDb.get.mockReturnValue(null)

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
          updatedAt: new Date()
        }
      ]

      // Mock count query
      mockDb.get.mockReturnValueOnce({ count: 1 })
      // Mock patient list query
      mockDb.all.mockReturnValue(mockPatients)
      // Mock active consultation count for each patient
      mockDb.get.mockReturnValue({ count: 0 })

      const result = await listPatients({ page: 1, limit: 10 })

      expect(mockDb.select).toHaveBeenCalled()
      expect(mockDb.from).toHaveBeenCalled()

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
      mockDb.get.mockReturnValueOnce({ count: 0 })
      mockDb.all.mockReturnValue([])

      await listPatients({ search: 'João' })

      expect(mockDb.select).toHaveBeenCalled()
      expect(mockDb.where).toHaveBeenCalled()
    })

    it('should sort patients by age', async () => {
      mockDb.get.mockReturnValueOnce({ count: 0 })
      mockDb.all.mockReturnValue([])

      await listPatients({ sortBy: 'age', sortOrder: 'desc' })

      expect(mockDb.select).toHaveBeenCalled()
      expect(mockDb.orderBy).toHaveBeenCalled()
    })
  })

  describe('searchPatients', () => {
    it('should search patients by name', async () => {
      const mockResults = [
        { id: 'patient-1', name: 'João Silva' },
        { id: 'patient-2', name: 'João Santos' }
      ]

      mockDb.all.mockReturnValue(mockResults)

      const result = await searchPatients('João')

      expect(mockDb.select).toHaveBeenCalled()
      expect(mockDb.from).toHaveBeenCalled()
      expect(mockDb.where).toHaveBeenCalled()
      expect(mockDb.limit).toHaveBeenCalled()
      expect(mockDb.all).toHaveBeenCalled()

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
        updatedAt: new Date()
      }

      const updatedPatient = {
        ...existingPatient,
        name: 'João Santos'
      }

      // First call returns existing patient, second call returns updated patient
      mockDb.get.mockReturnValueOnce(existingPatient)
      mockDb.run.mockReturnValue({ changes: 1 })
      mockDb.get.mockReturnValueOnce(updatedPatient)

      const result = await updatePatient('patient-123', { name: 'João Santos' })

      expect(mockDb.update).toHaveBeenCalled()
      expect(mockDb.set).toHaveBeenCalled()
      expect(mockDb.where).toHaveBeenCalled()
      expect(mockDb.run).toHaveBeenCalled()

      expect(result).toEqual(expect.objectContaining({
        name: 'João Santos',
        age: expect.any(Number)
      }))
    })

    it('should throw error when patient not found', async () => {
      mockDb.get.mockReturnValue(null)

      await expect(updatePatient('nonexistent-id', { name: 'Test' })).rejects.toThrow('Paciente não encontrado')
    })
  })

  describe('deletePatient', () => {
    it('should delete patient without consultations', async () => {
      const existingPatient = {
        id: 'patient-123',
        name: 'João Silva'
      }

      // First get returns existing patient
      mockDb.get.mockReturnValueOnce(existingPatient)
      // Second get returns consultation count = 0
      mockDb.get.mockReturnValueOnce({ count: 0 })
      mockDb.run.mockReturnValue({ changes: 1 })

      await deletePatient('patient-123')

      expect(mockDb.delete).toHaveBeenCalled()
      expect(mockDb.where).toHaveBeenCalled()
      expect(mockDb.run).toHaveBeenCalled()
    })

    it('should throw error when patient has consultations', async () => {
      const existingPatient = {
        id: 'patient-123',
        name: 'João Silva'
      }

      // First get returns existing patient
      mockDb.get.mockReturnValueOnce(existingPatient)
      // Second get returns consultation count = 1
      mockDb.get.mockReturnValueOnce({ count: 1 })

      await expect(deletePatient('patient-123')).rejects.toThrow(
        'Não é possível excluir paciente com consultas registradas'
      )
    })

    it('should throw error when patient not found', async () => {
      mockDb.get.mockReturnValue(null)

      await expect(deletePatient('nonexistent-id')).rejects.toThrow('Paciente não encontrado')
    })
  })
})
