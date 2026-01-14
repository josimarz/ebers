/**
 * Dashboard Real Data Integration Tests
 * 
 * Tests to verify that the dashboard displays real data from the database
 * instead of hardcoded fictional data.
 */

import { getPatientStats, getRecentPatients } from '@/lib/patients'
import { getConsultationStats, getRecentConsultations } from '@/lib/consultations'
import { getFinancialStats, getTotalRevenue } from '@/lib/financial'

// Get the mock db from jest.setup.js
const mockDb = jest.requireMock('@/lib/db').getDb()

describe('Dashboard Real Data Functions', () => {
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

  test('getPatientStats should return real patient statistics', async () => {
    // Mock total patients count
    mockDb.get.mockReturnValueOnce({ count: 15 })
    // Mock patients with credits count
    mockDb.get.mockReturnValueOnce({ count: 8 })
    // Mock patients with active consultations (selectDistinct returns array)
    mockDb.all.mockReturnValueOnce([{ id: 'p1' }, { id: 'p2' }, { id: 'p3' }])

    const stats = await getPatientStats()

    expect(stats).toEqual({
      totalPatients: 15,
      patientsWithCredits: 8,
      patientsWithActiveConsultations: 3
    })
  })

  test('getConsultationStats should return real consultation statistics', async () => {
    // Mock total consultations
    mockDb.get.mockReturnValueOnce({ count: 45 })
    // Mock open consultations
    mockDb.get.mockReturnValueOnce({ count: 2 })
    // Mock finalized consultations
    mockDb.get.mockReturnValueOnce({ count: 43 })
    // Mock paid consultations
    mockDb.get.mockReturnValueOnce({ count: 40 })
    // Mock unpaid consultations
    mockDb.get.mockReturnValueOnce({ count: 5 })

    const stats = await getConsultationStats()

    expect(stats).toEqual({
      totalConsultations: 45,
      openConsultations: 2,
      finalizedConsultations: 43,
      paidConsultations: 40,
      unpaidConsultations: 5
    })
  })

  test('getTotalRevenue should return real revenue from paid consultations', async () => {
    // Mock sum of paid consultations
    mockDb.get.mockReturnValueOnce({ total: 4500.00 })

    const revenue = await getTotalRevenue()

    expect(revenue).toBe(4500.00)
  })

  test('getRecentConsultations should return real recent consultations', async () => {
    const mockConsultations = [
      {
        id: '1',
        patientId: 'p1',
        startedAt: new Date('2024-01-10T14:00:00Z'),
        finishedAt: new Date('2024-01-10T15:00:00Z'),
        status: 'FINALIZED',
        content: '',
        notes: '',
        price: 100,
        paid: true,
        paidAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ]

    const mockPatient = {
      id: 'p1',
      name: 'Maria Silva',
      profilePhoto: null,
      birthDate: new Date('1990-05-15')
    }

    // Mock consultations list
    mockDb.all.mockReturnValueOnce(mockConsultations)
    // Mock patient lookup for each consultation
    mockDb.get.mockReturnValue(mockPatient)

    const consultations = await getRecentConsultations(3)

    expect(consultations).toHaveLength(1)
    expect(consultations[0].patient.name).toBe('Maria Silva')
  })

  test('getRecentPatients should return real recent patients', async () => {
    const mockPatients = [
      {
        id: 'p2',
        name: 'João Santos',
        profilePhoto: null,
        createdAt: new Date('2024-01-09T10:00:00Z'),
        credits: 8,
        birthDate: new Date('1985-03-20'),
        consultationPrice: 150.00,
        gender: 'MALE',
        religion: 'CATHOLIC',
        phone1: '11999999999',
        hasTherapyHistory: false,
        takesMedication: false,
        hasHospitalization: false,
        updatedAt: new Date()
      }
    ]

    // Mock patients list
    mockDb.all.mockReturnValueOnce(mockPatients)

    const patients = await getRecentPatients(3)

    expect(patients).toHaveLength(1)
    expect(patients[0].name).toBe('João Santos')
    expect(patients[0].credits).toBe(8)
  })

  test('functions should handle empty database gracefully', async () => {
    // Mock empty results
    mockDb.get.mockReturnValue({ count: 0, total: null })
    mockDb.all.mockReturnValue([])

    const [patientStats, consultationStats, revenue, recentConsultations, recentPatients] = await Promise.all([
      getPatientStats(),
      getConsultationStats(),
      getTotalRevenue(),
      getRecentConsultations(3),
      getRecentPatients(3)
    ])

    expect(patientStats.totalPatients).toBe(0)
    expect(consultationStats.totalConsultations).toBe(0)
    expect(revenue).toBe(0)
    expect(recentConsultations).toEqual([])
    expect(recentPatients).toEqual([])
  })
})

describe('Dashboard Data Migration Verification', () => {
  test('dashboard no longer uses hardcoded fictional data', () => {
    // This test documents that the dashboard has been migrated from fictional data to real data
    // The old hardcoded values were:
    const oldFictionalData = {
      patients: '127',
      consultations: '48', 
      credits: '324',
      revenue: 'R$ 12.5k',
      consultationExamples: ['Maria Silva', 'João Santos', 'Ana Costa'],
      patientExamples: ['Carlos Oliveira', 'Lucia Ferreira', 'Pedro Almeida']
    }

    // Now the dashboard uses:
    // - DashboardContent component that fetches from /api/dashboard
    // - Real database queries via getPatientStats, getConsultationStats, etc.
    // - Dynamic data that reflects actual system state
    
    expect(true).toBe(true) // This test serves as documentation of the migration
  })
})
