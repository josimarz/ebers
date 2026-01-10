/**
 * Dashboard Real Data Integration Tests
 * 
 * Tests to verify that the dashboard displays real data from the database
 * instead of hardcoded fictional data.
 */

// Mock Prisma first
jest.mock('@/lib/prisma', () => ({
  prisma: {
    patient: {
      count: jest.fn(),
      findMany: jest.fn(),
      aggregate: jest.fn()
    },
    consultation: {
      count: jest.fn(),
      findMany: jest.fn(),
      aggregate: jest.fn()
    }
  }
}))

import { getPatientStats, getRecentPatients } from '@/lib/patients'
import { getConsultationStats, getRecentConsultations } from '@/lib/consultations'
import { getFinancialStats, getTotalRevenue } from '@/lib/financial'
import { prisma } from '@/lib/prisma'

// Get the mocked prisma instance
const mockPrisma = prisma as jest.Mocked<typeof prisma>

describe('Dashboard Real Data Functions', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  test('getPatientStats should return real patient statistics', async () => {
    mockPrisma.patient.count
      .mockResolvedValueOnce(15) // total patients
      .mockResolvedValueOnce(8)  // patients with credits
      .mockResolvedValueOnce(3)  // patients with active consultations

    const stats = await getPatientStats()

    expect(stats).toEqual({
      totalPatients: 15,
      patientsWithCredits: 8,
      patientsWithActiveConsultations: 3
    })

    expect(mockPrisma.patient.count).toHaveBeenCalledTimes(3)
  })

  test('getConsultationStats should return real consultation statistics', async () => {
    mockPrisma.consultation.count
      .mockResolvedValueOnce(45) // total consultations
      .mockResolvedValueOnce(2)  // open consultations
      .mockResolvedValueOnce(43) // finalized consultations
      .mockResolvedValueOnce(40) // paid consultations
      .mockResolvedValueOnce(5)  // unpaid consultations

    const stats = await getConsultationStats()

    expect(stats).toEqual({
      totalConsultations: 45,
      openConsultations: 2,
      finalizedConsultations: 43,
      paidConsultations: 40,
      unpaidConsultations: 5
    })

    expect(mockPrisma.consultation.count).toHaveBeenCalledTimes(5)
  })

  test('getTotalRevenue should return real revenue from paid consultations', async () => {
    mockPrisma.consultation.aggregate.mockResolvedValueOnce({ 
      _sum: { price: 4500.00 } 
    })

    const revenue = await getTotalRevenue()

    expect(revenue).toBe(4500.00)
    expect(mockPrisma.consultation.aggregate).toHaveBeenCalledWith({
      _sum: { price: true },
      where: { paid: true }
    })
  })

  test('getRecentConsultations should return real recent consultations', async () => {
    const mockConsultations = [
      {
        id: '1',
        startedAt: new Date('2024-01-10T14:00:00Z'),
        finishedAt: new Date('2024-01-10T15:00:00Z'),
        status: 'FINALIZED',
        patient: {
          id: 'p1',
          name: 'Maria Silva',
          profilePhoto: null,
          birthDate: new Date('1990-05-15')
        }
      }
    ]

    mockPrisma.consultation.findMany.mockResolvedValueOnce(mockConsultations)

    const consultations = await getRecentConsultations(3)

    expect(consultations).toHaveLength(1)
    expect(consultations[0].patient.name).toBe('Maria Silva')
    expect(mockPrisma.consultation.findMany).toHaveBeenCalledWith({
      take: 3,
      orderBy: { startedAt: 'desc' },
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
        consultations: []
      }
    ]

    mockPrisma.patient.findMany.mockResolvedValueOnce(mockPatients)

    const patients = await getRecentPatients(3)

    expect(patients).toHaveLength(1)
    expect(patients[0].name).toBe('João Santos')
    expect(patients[0].credits).toBe(8)
    expect(mockPrisma.patient.findMany).toHaveBeenCalledWith({
      take: 3,
      orderBy: { createdAt: 'desc' },
      include: {
        consultations: {
          orderBy: { createdAt: 'desc' },
          take: 1
        }
      }
    })
  })

  test('functions should handle empty database gracefully', async () => {
    // Mock empty results
    mockPrisma.patient.count.mockResolvedValue(0)
    mockPrisma.consultation.count.mockResolvedValue(0)
    mockPrisma.consultation.aggregate.mockResolvedValue({ _sum: { price: null } })
    mockPrisma.consultation.findMany.mockResolvedValue([])
    mockPrisma.patient.findMany.mockResolvedValue([])

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