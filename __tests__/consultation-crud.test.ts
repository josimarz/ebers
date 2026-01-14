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

// Get the mock db from jest.setup.js
const mockDb = jest.requireMock('@/lib/db').getDb()

describe('Consultation CRUD Operations', () => {
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
        consultationPrice: 100,
        birthDate: new Date('1990-01-01'),
        profilePhoto: null
      }

      // Mock patient lookup
      mockDb.get.mockReturnValueOnce(mockPatient)
      // Mock no unfinalized consultations
      mockDb.get.mockReturnValueOnce(null)
      // Mock insert
      mockDb.run.mockReturnValue({ changes: 1 })

      const result = await createConsultation(consultationData)

      expect(mockDb.select).toHaveBeenCalled()
      expect(mockDb.insert).toHaveBeenCalled()
      expect(mockDb.values).toHaveBeenCalled()
      expect(mockDb.run).toHaveBeenCalled()

      expect(result).toEqual(expect.objectContaining({
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
        consultationPrice: 100,
        birthDate: new Date('1990-01-01'),
        profilePhoto: null
      }

      // Mock patient lookup
      mockDb.get.mockReturnValueOnce(mockPatient)
      // Mock no unfinalized consultations
      mockDb.get.mockReturnValueOnce(null)
      // Mock insert
      mockDb.run.mockReturnValue({ changes: 1 })

      const result = await createConsultation(consultationData)

      expect(result).toEqual(expect.objectContaining({
        paid: false,
        paidAt: null
      }))
    })

    it('should throw error when patient not found', async () => {
      mockDb.get.mockReturnValue(null)

      await expect(createConsultation({
        patientId: 'nonexistent',
        price: 100
      })).rejects.toThrow('Paciente não encontrado')
    })

    it('should throw error when patient has unfinalized consultation', async () => {
      const mockPatient = {
        id: 'patient-123',
        credits: 0,
        consultationPrice: 100
      }

      const mockUnfinalizedConsultation = {
        id: 'consultation-456',
        status: 'OPEN'
      }

      // Mock patient lookup
      mockDb.get.mockReturnValueOnce(mockPatient)
      // Mock unfinalized consultation found
      mockDb.get.mockReturnValueOnce(mockUnfinalizedConsultation)

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

      // Mock patient lookup
      mockDb.get.mockReturnValueOnce(mockPatient)
      // Mock no unfinalized consultations
      mockDb.get.mockReturnValueOnce(null)

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
        price: 100,
        paid: false,
        createdAt: new Date(),
        updatedAt: new Date()
      }

      const mockPatient = {
        id: 'patient-123',
        name: 'João Silva',
        profilePhoto: null,
        birthDate: new Date('1990-01-01')
      }

      // Mock consultation lookup
      mockDb.get.mockReturnValueOnce(mockConsultation)
      // Mock patient lookup
      mockDb.get.mockReturnValueOnce(mockPatient)

      const result = await getConsultation('consultation-123')

      expect(mockDb.select).toHaveBeenCalled()
      expect(mockDb.from).toHaveBeenCalled()
      expect(mockDb.where).toHaveBeenCalled()
      expect(mockDb.get).toHaveBeenCalled()

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
      mockDb.get.mockReturnValue(null)

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
          price: 100,
          paid: false,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ]

      const mockPatient = {
        id: 'patient-123',
        name: 'João Silva',
        profilePhoto: null,
        birthDate: new Date('1990-01-01')
      }

      // Mock count
      mockDb.get.mockReturnValueOnce({ count: 1 })
      // Mock consultations list
      mockDb.all.mockReturnValue(mockConsultations)
      // Mock patient lookup for each consultation
      mockDb.get.mockReturnValue(mockPatient)

      const result = await listConsultations({ page: 1, limit: 10 })

      expect(mockDb.select).toHaveBeenCalled()
      expect(mockDb.from).toHaveBeenCalled()

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
      mockDb.get.mockReturnValueOnce({ count: 0 })
      mockDb.all.mockReturnValue([])

      await listConsultations({ patientId: 'patient-123' })

      expect(mockDb.select).toHaveBeenCalled()
      expect(mockDb.where).toHaveBeenCalled()
    })
  })

  describe('getActiveConsultation', () => {
    it('should return active consultation for patient', async () => {
      const mockActiveConsultation = {
        id: 'consultation-123',
        patientId: 'patient-123',
        status: 'OPEN',
        startedAt: new Date()
      }

      const mockPatient = {
        id: 'patient-123',
        name: 'João Silva',
        profilePhoto: null,
        birthDate: new Date('1990-01-01')
      }

      // Mock consultation lookup
      mockDb.get.mockReturnValueOnce(mockActiveConsultation)
      // Mock patient lookup
      mockDb.get.mockReturnValueOnce(mockPatient)

      const result = await getActiveConsultation('patient-123')

      expect(mockDb.select).toHaveBeenCalled()
      expect(mockDb.where).toHaveBeenCalled()

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
      mockDb.get.mockReturnValue(null)

      const result = await getActiveConsultation('patient-123')

      expect(result).toBeNull()
    })
  })

  describe('finalizeConsultation', () => {
    it('should finalize consultation successfully', async () => {
      const existingConsultation = {
        id: 'consultation-123',
        patientId: 'patient-123',
        status: 'OPEN',
        finishedAt: null
      }

      const mockPatient = {
        id: 'patient-123',
        name: 'João Silva',
        profilePhoto: null,
        birthDate: new Date('1990-01-01')
      }

      // Mock existing consultation lookup
      mockDb.get.mockReturnValueOnce(existingConsultation)
      // Mock update
      mockDb.run.mockReturnValue({ changes: 1 })
      // Mock updated consultation lookup
      mockDb.get.mockReturnValueOnce({ ...existingConsultation, status: 'FINALIZED', finishedAt: new Date() })
      // Mock patient lookup
      mockDb.get.mockReturnValueOnce(mockPatient)

      const result = await finalizeConsultation('consultation-123')

      expect(mockDb.update).toHaveBeenCalled()
      expect(mockDb.set).toHaveBeenCalled()
      expect(mockDb.run).toHaveBeenCalled()

      expect(result).toEqual(expect.objectContaining({
        status: 'FINALIZED',
        finishedAt: expect.any(Date)
      }))
    })
  })

  describe('processConsultationPayment', () => {
    it('should process payment successfully', async () => {
      const existingConsultation = {
        id: 'consultation-123',
        patientId: 'patient-123',
        paid: false,
        paidAt: null
      }

      const mockPatient = {
        id: 'patient-123',
        name: 'João Silva',
        profilePhoto: null,
        birthDate: new Date('1990-01-01')
      }

      // Mock existing consultation lookup
      mockDb.get.mockReturnValueOnce(existingConsultation)
      // Mock update
      mockDb.run.mockReturnValue({ changes: 1 })
      // Mock updated consultation lookup
      mockDb.get.mockReturnValueOnce({ ...existingConsultation, paid: true, paidAt: new Date() })
      // Mock patient lookup
      mockDb.get.mockReturnValueOnce(mockPatient)

      const result = await processConsultationPayment('consultation-123')

      expect(mockDb.update).toHaveBeenCalled()
      expect(mockDb.set).toHaveBeenCalled()
      expect(mockDb.run).toHaveBeenCalled()

      expect(result).toEqual(expect.objectContaining({
        paid: true,
        paidAt: expect.any(Date)
      }))
    })
  })

  describe('updateConsultation', () => {
    it('should update consultation content and notes', async () => {
      const existingConsultation = {
        id: 'consultation-123',
        patientId: 'patient-123',
        status: 'OPEN',
        content: '',
        notes: ''
      }

      const mockPatient = {
        id: 'patient-123',
        name: 'João Silva',
        profilePhoto: null,
        birthDate: new Date('1990-01-01')
      }

      // Mock existing consultation lookup
      mockDb.get.mockReturnValueOnce(existingConsultation)
      // Mock update
      mockDb.run.mockReturnValue({ changes: 1 })
      // Mock updated consultation lookup
      mockDb.get.mockReturnValueOnce({ ...existingConsultation, content: 'New content', notes: 'New notes' })
      // Mock patient lookup
      mockDb.get.mockReturnValueOnce(mockPatient)

      const result = await updateConsultation('consultation-123', { content: 'New content', notes: 'New notes' })

      expect(mockDb.update).toHaveBeenCalled()
      expect(mockDb.set).toHaveBeenCalled()
      expect(mockDb.run).toHaveBeenCalled()

      expect(result).toEqual(expect.objectContaining({
        content: 'New content',
        notes: 'New notes'
      }))
    })
  })

  describe('searchPatientsForConsultations', () => {
    it('should search patients who have consultations', async () => {
      const mockResults = [
        { id: 'patient-1', name: 'João Silva' },
        { id: 'patient-2', name: 'João Santos' }
      ]

      // Mock selectDistinct for patients with consultations
      mockDb.all.mockReturnValueOnce([{ patientId: 'patient-1' }, { patientId: 'patient-2' }])
      // Mock patient search results
      mockDb.all.mockReturnValueOnce(mockResults)

      const result = await searchPatientsForConsultations('João')

      expect(mockDb.selectDistinct).toHaveBeenCalled()
      expect(mockDb.select).toHaveBeenCalled()
      expect(mockDb.from).toHaveBeenCalled()
      expect(mockDb.where).toHaveBeenCalled()
      expect(mockDb.all).toHaveBeenCalled()

      expect(result).toEqual(mockResults)
    })

    it('should return empty array for short queries', async () => {
      const result = await searchPatientsForConsultations('J')
      expect(result).toEqual([])
    })

    it('should return empty array when no patients have consultations', async () => {
      // Mock selectDistinct returns empty (no patients with consultations)
      mockDb.all.mockReturnValueOnce([])

      const result = await searchPatientsForConsultations('João')
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

      // Mock consultation lookup
      mockDb.get.mockReturnValue(mockConsultation)
      // Mock delete
      mockDb.run.mockReturnValue({ changes: 1 })

      await deleteConsultation('consultation-123')

      expect(mockDb.delete).toHaveBeenCalled()
      expect(mockDb.where).toHaveBeenCalled()
      expect(mockDb.run).toHaveBeenCalled()
    })

    it('should throw error when trying to delete paid consultation', async () => {
      const mockConsultation = {
        id: 'consultation-123',
        paid: true,
        status: 'OPEN'
      }

      mockDb.get.mockReturnValue(mockConsultation)

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

      mockDb.get.mockReturnValue(mockConsultation)

      await expect(deleteConsultation('consultation-123')).rejects.toThrow(
        'Não é possível excluir consulta finalizada'
      )
    })

    it('should throw error when consultation not found', async () => {
      mockDb.get.mockReturnValue(null)

      await expect(deleteConsultation('nonexistent-id')).rejects.toThrow(
        'Consulta não encontrada'
      )
    })
  })
})
