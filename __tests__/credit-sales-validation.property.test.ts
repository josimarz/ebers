/**
 * Property-based tests for credit sales validation functionality
 * Feature: patient-management-system, Property 8: Credit Sales Validation
 * Validates: Requirements 4.1, 4.3, 4.5
 */

import * as fc from 'fast-check'
import { validateCreditSales, calculateCreditSalesTotal, canSellCredits } from '@/lib/validations'

describe('Property 8: Credit Sales Validation', () => {
  /**
   * Property: For any patient with established consultation pricing, 
   * the system should allow credit sales and correctly calculate total cost,
   * while preventing sales for patients without pricing
   * 
   * This property validates:
   * - Requirement 4.1: System provides "Sell Credits" button for patients with established pricing
   * - Requirement 4.3: System calculates total cost correctly (quantity × price)
   * - Requirement 4.5: System prevents credit sales when consultation pricing is not established
   */
  it('should validate credit sales eligibility and calculations for any patient pricing scenario', () => {
    return fc.assert(
      fc.property(
        // Generate patients with various pricing scenarios
        fc.record({
          id: fc.string({ minLength: 1 }),
          name: fc.string({ minLength: 1 }),
          consultationPrice: fc.oneof(
            fc.constant(null), // No pricing established
            fc.constant(undefined), // No pricing established
            fc.constant(0), // Invalid pricing
            fc.float({ min: Math.fround(0.01), max: Math.fround(1000) }) // Valid pricing
          )
        }),
        // Generate credit sale quantities
        fc.integer({ min: 1, max: 100 }),
        
        (patient, quantity) => {
          const hasValidPrice = patient.consultationPrice != null && patient.consultationPrice > 0
          
          // Test credit sales eligibility (Requirements 4.1, 4.5)
          const canSell = canSellCredits(patient)
          expect(canSell).toBe(hasValidPrice)
          
          if (hasValidPrice && patient.consultationPrice) {
            // Test credit sales validation for valid scenarios (Requirement 4.1)
            const creditSalesData = {
              patientId: patient.id,
              quantity: quantity,
              unitPrice: patient.consultationPrice
            }
            
            const validationResult = validateCreditSales(creditSalesData)
            expect(validationResult.success).toBe(true)
            
            if (validationResult.success) {
              expect(validationResult.data.quantity).toBe(quantity)
              expect(validationResult.data.unitPrice).toBe(patient.consultationPrice)
            }
            
            // Test total cost calculation (Requirement 4.3)
            const expectedTotal = quantity * patient.consultationPrice
            const calculatedTotal = calculateCreditSalesTotal(quantity, patient.consultationPrice)
            expect(calculatedTotal).toBe(expectedTotal)
            
            // Verify calculation precision for decimal prices
            expect(calculatedTotal).toBeCloseTo(expectedTotal, 2)
          } else {
            // For patients without valid pricing, credit sales should not be allowed (Requirement 4.5)
            expect(canSell).toBe(false)
          }
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Property: Credit sales validation should reject invalid input data
   * regardless of the specific invalid values provided
   */
  it('should reject invalid credit sales data for any invalid input combination', () => {
    return fc.assert(
      fc.property(
        // Generate invalid credit sales data
        fc.record({
          patientId: fc.oneof(
            fc.constant(''), // Empty string
            fc.constant(null), // Null
            fc.constant(undefined) // Undefined
          ),
          quantity: fc.oneof(
            fc.integer({ max: 0 }), // Zero or negative
            fc.constant(null),
            fc.constant(undefined)
          ),
          unitPrice: fc.oneof(
            fc.float({ max: Math.fround(0) }), // Zero or negative
            fc.constant(null),
            fc.constant(undefined)
          )
        }),
        
        (invalidData) => {
          const result = validateCreditSales(invalidData)
          expect(result.success).toBe(false)
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Property: Total cost calculation should be mathematically correct
   * for any valid positive quantity and unit price combination
   */
  it('should calculate mathematically correct totals for any valid quantity and price', () => {
    return fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 1000 }), // Valid quantities
        fc.float({ min: Math.fround(0.01), max: Math.fround(10000), noNaN: true }), // Valid prices, no NaN
        
        (quantity, unitPrice) => {
          // Skip if unitPrice is not a finite number
          if (!Number.isFinite(unitPrice)) {
            return true // Skip this test case
          }
          
          const calculatedTotal = calculateCreditSalesTotal(quantity, unitPrice)
          const expectedTotal = quantity * unitPrice
          
          // Verify mathematical correctness
          expect(calculatedTotal).toBeCloseTo(expectedTotal, 2)
          
          // Verify result is positive
          expect(calculatedTotal).toBeGreaterThan(0)
          
          // Verify result scales correctly with quantity
          if (quantity > 1) {
            const singleItemTotal = calculateCreditSalesTotal(1, unitPrice)
            expect(calculatedTotal).toBeCloseTo(singleItemTotal * quantity, 2)
          }
        }
      ),
      { numRuns: 100 }
    )
  })
})