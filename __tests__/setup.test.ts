/**
 * Basic setup test to verify the project configuration
 */

import { PatientSchema, ConsultationSchema } from '@/lib/validations'
import { calculateAge, formatCurrency } from '@/lib/utils'
import { isIpadDevice } from '@/lib/device-detection'

describe('Project Setup', () => {
  describe('Validation Schemas', () => {
    it('should validate patient data correctly', () => {
      const validPatient = {
        name: 'João Silva',
        birthDate: '1990-01-01',
        gender: 'MALE',
        religion: 'CATHOLIC',
        phone1: '11999999999',
        hasTherapyHistory: false,
        takesMedication: false,
        hasHospitalization: false,
        credits: 0
      }

      const result = PatientSchema.safeParse(validPatient)
      expect(result.success).toBe(true)
    })

    it('should validate consultation data correctly', () => {
      const validConsultation = {
        patientId: 'patient-123',
        price: 150.00
      }

      const result = ConsultationSchema.safeParse(validConsultation)
      expect(result.success).toBe(true)
    })
  })

  describe('Utility Functions', () => {
    it('should calculate age correctly', () => {
      const birthDate = new Date('1990-01-01')
      const age = calculateAge(birthDate)
      expect(age).toBeGreaterThan(30)
    })

    it('should format currency correctly', () => {
      const formatted = formatCurrency(150.50)
      expect(formatted).toContain('R$')
      expect(formatted).toContain('150,50')
    })
  })

  describe('Device Detection', () => {
    it('should detect iPad devices', () => {
      const ipadUserAgent = 'Mozilla/5.0 (iPad; CPU OS 14_0 like Mac OS X)'
      expect(isIpadDevice(ipadUserAgent)).toBe(true)
    })

    it('should not detect desktop as iPad', () => {
      const desktopUserAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
      expect(isIpadDevice(desktopUserAgent)).toBe(false)
    })
  })
})