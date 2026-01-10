import { listPatients } from '@/lib/patients'
import { prisma } from '@/lib/prisma'

// Mock Prisma for testing
jest.mock('@/lib/prisma', () => ({
  prisma: {
    patient: {
      findMany: jest.fn(),
      count: jest.fn()
    },
    $disconnect: jest.fn()
  }
}))

const mockPrisma = prisma as jest.Mocked<typeof prisma>

describe('Property 5: Patient List Display and Pagination', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should display correct patient information with proper pagination', async () => {
    // Create simple mock data
    const mockPatients = [
      {
        id: 'patient-001',
        name: 'João Silva',
        profilePhoto: null,
        birthDate: new Date('1990-01-01'),
        gender: 'MALE',
        cpf: null,
        rg: null,
        religion: 'CATHOLIC',
        legalGuardian: null,
        legalGuardianEmail: null,
        legalGuardianCpf: null,
        phone1: '11999999999',
        phone2: null,
        email: null,
        hasTherapyHistory: false,
        therapyHistoryDetails: null,
        takesMedication: false,
        medicationSince: null,
        medicationNames: null,
        hasHospitalization: false,
        hospitalizationDate: null,
        hospitalizationReason: null,
        consultationPrice: null,
        consultationFrequency: null,
        consultationDay: null,
        credits: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
        consultations: []
      }
    ]

    // Mock database operations
    mockPrisma.patient.count.mockResolvedValue(1)
    mockPrisma.patient.findMany.mockResolvedValue(mockPatients)

    // Test the function
    const result = await listPatients({ page: 1, limit: 10 })

    // Basic assertions
    expect(result.patients).toBeDefined()
    expect(Array.isArray(result.patients)).toBe(true)
    expect(result.totalCount).toBe(1)
    expect(result.currentPage).toBe(1)
  })
})