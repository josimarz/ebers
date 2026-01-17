import '@testing-library/jest-dom'

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter() {
    return {
      push: jest.fn(),
      replace: jest.fn(),
      prefetch: jest.fn(),
      back: jest.fn(),
      forward: jest.fn(),
      refresh: jest.fn(),
    }
  },
  useSearchParams() {
    return new URLSearchParams()
  },
  usePathname() {
    return ''
  },
}))

// Mock sql.js
jest.mock('sql.js', () => {
  return jest.fn().mockResolvedValue({
    Database: jest.fn().mockImplementation(() => ({
      run: jest.fn(),
      exec: jest.fn(),
      export: jest.fn().mockReturnValue(new Uint8Array()),
      close: jest.fn(),
    })),
  })
})

// Create chainable mock for Drizzle queries
const createChainableMock = () => {
  const mock = {
    select: jest.fn().mockReturnThis(),
    from: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    offset: jest.fn().mockReturnThis(),
    get: jest.fn().mockReturnValue(null),
    all: jest.fn().mockReturnValue([]),
    insert: jest.fn().mockReturnThis(),
    values: jest.fn().mockReturnThis(),
    run: jest.fn().mockReturnValue({ changes: 1 }),
    update: jest.fn().mockReturnThis(),
    set: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    selectDistinct: jest.fn().mockReturnThis(),
  }
  return mock
}

// Export mock db for tests to configure
export const mockDb = createChainableMock()

// Mock lib/db
jest.mock('@/lib/db', () => ({
  getDbAsync: jest.fn().mockResolvedValue(mockDb),
  getDb: jest.fn(() => mockDb),
  getSqlite: jest.fn(),
  closeDb: jest.fn(),
  saveDatabase: jest.fn(),
  initializeDb: jest.fn().mockResolvedValue(undefined),
  patients: {
    id: { name: 'id' },
    name: { name: 'name' },
    profilePhoto: { name: 'profilePhoto' },
    birthDate: { name: 'birthDate' },
    gender: { name: 'gender' },
    cpf: { name: 'cpf' },
    rg: { name: 'rg' },
    religion: { name: 'religion' },
    legalGuardian: { name: 'legalGuardian' },
    legalGuardianEmail: { name: 'legalGuardianEmail' },
    legalGuardianCpf: { name: 'legalGuardianCpf' },
    phone1: { name: 'phone1' },
    phone2: { name: 'phone2' },
    email: { name: 'email' },
    hasTherapyHistory: { name: 'hasTherapyHistory' },
    therapyHistoryDetails: { name: 'therapyHistoryDetails' },
    takesMedication: { name: 'takesMedication' },
    medicationSince: { name: 'medicationSince' },
    medicationNames: { name: 'medicationNames' },
    hasHospitalization: { name: 'hasHospitalization' },
    hospitalizationDate: { name: 'hospitalizationDate' },
    hospitalizationReason: { name: 'hospitalizationReason' },
    consultationPrice: { name: 'consultationPrice' },
    consultationFrequency: { name: 'consultationFrequency' },
    consultationDay: { name: 'consultationDay' },
    credits: { name: 'credits' },
    createdAt: { name: 'createdAt' },
    updatedAt: { name: 'updatedAt' },
  },
  consultations: {
    id: { name: 'id' },
    patientId: { name: 'patientId' },
    startedAt: { name: 'startedAt' },
    finishedAt: { name: 'finishedAt' },
    paidAt: { name: 'paidAt' },
    status: { name: 'status' },
    content: { name: 'content' },
    notes: { name: 'notes' },
    price: { name: 'price' },
    paid: { name: 'paid' },
    createdAt: { name: 'createdAt' },
    updatedAt: { name: 'updatedAt' },
  },
}))

// Mock @/lib/prisma for backward compatibility with existing tests
jest.mock('@/lib/prisma', () => {
  const mockPrisma = {
    patient: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
      aggregate: jest.fn(),
    },
    consultation: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
      aggregate: jest.fn(),
    },
    $transaction: jest.fn((callback) => callback(mockPrisma)),
    $disconnect: jest.fn(),
  }
  return { prisma: mockPrisma }
})

// Mock @prisma/client for backward compatibility (virtual module)
jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn().mockImplementation(() => ({
    patient: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
      aggregate: jest.fn(),
    },
    consultation: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
      aggregate: jest.fn(),
    },
    $disconnect: jest.fn(),
  })),
}), { virtual: true })

// Mock @prisma/client/runtime/library for Decimal (virtual module)
jest.mock('@prisma/client/runtime/library', () => ({
  Decimal: class Decimal {
    constructor(value) {
      this.value = value
    }
    toString() {
      return String(this.value)
    }
    toNumber() {
      return Number(this.value)
    }
  },
}), { virtual: true })
