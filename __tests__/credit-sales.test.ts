/**
 * Credit Sales Functionality Tests
 * Requirements: 4.1, 4.2, 4.3, 4.4, 4.5
 */

import { validateCreditSales, calculateCreditSalesTotal, canSellCredits } from '@/lib/validations'

describe('Credit Sales Functionality', () => {
  describe('Credit Sales Validation', () => {
    it('should validate valid credit sales data', () => {
      const validData = {
        patientId: 'patient-123',
        quantity: 5,
        unitPrice: 150.00
      }

      const result = validateCreditSales(validData)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.quantity).toBe(5)
        expect(result.data.unitPrice).toBe(150.00)
      }
    })

    it('should reject invalid quantity', () => {
      const invalidData = {
        patientId: 'patient-123',
        quantity: 0, // Invalid: must be at least 1
        unitPrice: 150.00
      }

      const result = validateCreditSales(invalidData)
      expect(result.success).toBe(false)
    })

    it('should reject invalid unit price', () => {
      const invalidData = {
        patientId: 'patient-123',
        quantity: 5,
        unitPrice: -10 // Invalid: must be positive
      }

      const result = validateCreditSales(invalidData)
      expect(result.success).toBe(false)
    })

    it('should reject missing patient ID', () => {
      const invalidData = {
        patientId: '', // Invalid: required
        quantity: 5,
        unitPrice: 150.00
      }

      const result = validateCreditSales(invalidData)
      expect(result.success).toBe(false)
    })
  })

  describe('Credit Sales Calculation', () => {
    it('should calculate total cost correctly', () => {
      // Requirement 4.3: Calculate total cost
      const quantity = 5
      const unitPrice = 150.00
      const expectedTotal = 750.00

      const total = calculateCreditSalesTotal(quantity, unitPrice)
      expect(total).toBe(expectedTotal)
    })

    it('should handle decimal prices correctly', () => {
      const quantity = 3
      const unitPrice = 125.50
      const expectedTotal = 376.50

      const total = calculateCreditSalesTotal(quantity, unitPrice)
      expect(total).toBe(expectedTotal)
    })

    it('should throw error for invalid inputs', () => {
      expect(() => calculateCreditSalesTotal(0, 150)).toThrow()
      expect(() => calculateCreditSalesTotal(5, -10)).toThrow()
    })
  })

  describe('Credit Sales Eligibility', () => {
    it('should allow credit sales when consultation price is established', () => {
      // Requirement 4.5: Only allow credit sales when consultation price is established
      const patientWithPrice = {
        consultationPrice: 150.00
      }

      expect(canSellCredits(patientWithPrice)).toBe(true)
    })

    it('should prevent credit sales when consultation price is not established', () => {
      const patientWithoutPrice = {
        consultationPrice: null
      }

      expect(canSellCredits(patientWithoutPrice)).toBe(false)
    })

    it('should prevent credit sales when consultation price is zero', () => {
      const patientWithZeroPrice = {
        consultationPrice: 0
      }

      expect(canSellCredits(patientWithZeroPrice)).toBe(false)
    })

    it('should prevent credit sales when consultation price is undefined', () => {
      const patientWithUndefinedPrice = {}

      expect(canSellCredits(patientWithUndefinedPrice)).toBe(false)
    })
  })
})