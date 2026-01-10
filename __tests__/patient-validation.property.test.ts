/**
 * Property-based tests for patient data validation
 * Feature: patient-management-system, Property 1: Patient Data Validation
 * Validates: Requirements 1.1, 1.2, 1.4, 1.5
 */

import * as fc from 'fast-check'
import { PatientSchema, Gender, Religion, ConsultationFrequency, DayOfWeek } from '@/lib/validations'

describe('Property 1: Patient Data Validation', () => {
  /**
   * Property: For any patient data input, the system should validate required fields 
   * (name, birth date, gender, religion) and reject invalid data while accepting 
   * valid data with optional fields
   * 
   * Feature: patient-management-system, Property 1: Patient Data Validation
   * Validates: Requirements 1.1, 1.2, 1.4, 1.5
   */
  it('should validate required fields and accept valid data with optional fields', () => {
    fc.assert(
      fc.property(
        // Simplified generator for valid patient data
        fc.record({
          name: fc.oneof(
            fc.constant('João Silva'),
            fc.constant('Maria Santos'),
            fc.constant('Pedro Oliveira'),
            fc.constant('Ana Costa')
          ),
          profilePhoto: fc.option(fc.constant('https://example.com/photo.jpg'), { nil: undefined }),
          birthDate: fc.date({ min: new Date('1950-01-01'), max: new Date('2010-01-01') }),
          gender: fc.constantFrom(...Object.values(Gender)),
          cpf: fc.option(fc.constant('12345678901'), { nil: undefined }),
          rg: fc.option(fc.constant('1234567'), { nil: undefined }),
          religion: fc.constantFrom(...Object.values(Religion)),
          phone1: fc.oneof(
            fc.constant('11999999999'),
            fc.constant('(11) 99999-9999'),
            fc.constant('11 99999-9999')
          ),
          phone2: fc.option(fc.constant('11888888888'), { nil: undefined }),
          email: fc.option(fc.oneof(
            fc.constant('joao@email.com'),
            fc.constant('maria@teste.com.br'),
            fc.constant('pedro@exemplo.org')
          ), { nil: undefined }),
          hasTherapyHistory: fc.boolean(),
          therapyHistoryDetails: fc.option(fc.constant('Detalhes da terapia anterior'), { nil: undefined }),
          takesMedication: fc.boolean(),
          medicationSince: fc.option(fc.constant('Janeiro 2020'), { nil: undefined }),
          medicationNames: fc.option(fc.constant('Medicamento A, Medicamento B'), { nil: undefined }),
          hasHospitalization: fc.boolean(),
          hospitalizationDate: fc.option(fc.constant('Dezembro 2019'), { nil: undefined }),
          hospitalizationReason: fc.option(fc.constant('Razão da hospitalização'), { nil: undefined }),
          consultationPrice: fc.option(fc.float({ min: 50, max: 500, noNaN: true }), { nil: undefined }),
          consultationFrequency: fc.option(fc.constantFrom(...Object.values(ConsultationFrequency)), { nil: undefined }),
          consultationDay: fc.option(fc.constantFrom(...Object.values(DayOfWeek)), { nil: undefined }),
          credits: fc.integer({ min: 0, max: 50 })
        }).chain(baseData => {
          // Handle legal guardian and email relationship
          return fc.oneof(
            // No legal guardian
            fc.constant({ ...baseData, legalGuardian: undefined, legalGuardianEmail: undefined }),
            // Legal guardian with email
            fc.constant({ 
              ...baseData, 
              legalGuardian: 'Responsável Legal', 
              legalGuardianEmail: 'responsavel@email.com' 
            })
          )
        }),
        (validPatientData) => {
          // Test that valid data passes validation
          const result = PatientSchema.safeParse(validPatientData)
          
          // Should accept valid data
          expect(result.success).toBe(true)
          
          if (result.success) {
            // Verify required fields are preserved
            expect(result.data.name).toBe(validPatientData.name)
            expect(result.data.birthDate).toEqual(validPatientData.birthDate)
            expect(result.data.gender).toBe(validPatientData.gender)
            expect(result.data.religion).toBe(validPatientData.religion)
            expect(result.data.phone1).toBe(validPatientData.phone1)
            expect(result.data.hasTherapyHistory).toBe(validPatientData.hasTherapyHistory)
            expect(result.data.takesMedication).toBe(validPatientData.takesMedication)
            expect(result.data.hasHospitalization).toBe(validPatientData.hasHospitalization)
            expect(result.data.credits).toBe(validPatientData.credits)
          }
        }
      ),
      { numRuns: 10 }
    )
  })

  /**
   * Property: For any patient data missing required fields, the system should reject the data
   * 
   * Feature: patient-management-system, Property 1: Patient Data Validation
   * Validates: Requirements 1.1, 1.2, 1.4, 1.5
   */
  it('should reject data missing required fields', () => {
    fc.assert(
      fc.property(
        // Generator for patient data with missing required fields
        fc.oneof(
          // Missing name
          fc.record({
            name: fc.constant(''),
            birthDate: fc.date({ min: new Date('1950-01-01'), max: new Date('2010-01-01') }),
            gender: fc.constantFrom(...Object.values(Gender)),
            religion: fc.constantFrom(...Object.values(Religion)),
            phone1: fc.constant('11999999999'),
            hasTherapyHistory: fc.boolean(),
            takesMedication: fc.boolean(),
            hasHospitalization: fc.boolean(),
            credits: fc.integer({ min: 0 })
          }),
          // Missing phone1
          fc.record({
            name: fc.constant('João Silva'),
            birthDate: fc.date({ min: new Date('1950-01-01'), max: new Date('2010-01-01') }),
            gender: fc.constantFrom(...Object.values(Gender)),
            religion: fc.constantFrom(...Object.values(Religion)),
            phone1: fc.constant(''),
            hasTherapyHistory: fc.boolean(),
            takesMedication: fc.boolean(),
            hasHospitalization: fc.boolean(),
            credits: fc.integer({ min: 0 })
          }),
          // Invalid gender
          fc.record({
            name: fc.constant('João Silva'),
            birthDate: fc.date({ min: new Date('1950-01-01'), max: new Date('2010-01-01') }),
            gender: fc.constant('INVALID_GENDER'),
            religion: fc.constantFrom(...Object.values(Religion)),
            phone1: fc.constant('11999999999'),
            hasTherapyHistory: fc.boolean(),
            takesMedication: fc.boolean(),
            hasHospitalization: fc.boolean(),
            credits: fc.integer({ min: 0 })
          }),
          // Invalid religion
          fc.record({
            name: fc.constant('João Silva'),
            birthDate: fc.date({ min: new Date('1950-01-01'), max: new Date('2010-01-01') }),
            gender: fc.constantFrom(...Object.values(Gender)),
            religion: fc.constant('INVALID_RELIGION'),
            phone1: fc.constant('11999999999'),
            hasTherapyHistory: fc.boolean(),
            takesMedication: fc.boolean(),
            hasHospitalization: fc.boolean(),
            credits: fc.integer({ min: 0 })
          })
        ),
        (invalidPatientData) => {
          // Test that invalid data is rejected
          const result = PatientSchema.safeParse(invalidPatientData)
          
          // Should reject invalid data
          expect(result.success).toBe(false)
        }
      ),
      { numRuns: 10 }
    )
  })

  /**
   * Property: For any patient data with negative credits, the system should reject the data
   * 
   * Feature: patient-management-system, Property 1: Patient Data Validation
   * Validates: Requirements 1.5
   */
  it('should reject data with negative credits', () => {
    fc.assert(
      fc.property(
        fc.record({
          name: fc.constant('João Silva'),
          birthDate: fc.date({ min: new Date('1950-01-01'), max: new Date('2010-01-01') }),
          gender: fc.constantFrom(...Object.values(Gender)),
          religion: fc.constantFrom(...Object.values(Religion)),
          phone1: fc.constant('11999999999'),
          hasTherapyHistory: fc.boolean(),
          takesMedication: fc.boolean(),
          hasHospitalization: fc.boolean(),
          credits: fc.integer({ min: -10, max: -1 }) // Negative credits
        }),
        (patientDataWithNegativeCredits) => {
          // Test that negative credits are rejected
          const result = PatientSchema.safeParse(patientDataWithNegativeCredits)
          
          // Should reject data with negative credits
          expect(result.success).toBe(false)
          
          if (!result.success) {
            // Should have error about credits
            const creditsError = result.error.issues.find(issue => 
              issue.path.includes('credits')
            )
            expect(creditsError).toBeDefined()
          }
        }
      ),
      { numRuns: 10 }
    )
  })

  /**
   * Property: For any patient data with negative consultation price, the system should reject the data
   * 
   * Feature: patient-management-system, Property 1: Patient Data Validation
   * Validates: Requirements 1.4
   */
  it('should reject data with negative consultation price', () => {
    fc.assert(
      fc.property(
        fc.record({
          name: fc.constant('João Silva'),
          birthDate: fc.date({ min: new Date('1950-01-01'), max: new Date('2010-01-01') }),
          gender: fc.constantFrom(...Object.values(Gender)),
          religion: fc.constantFrom(...Object.values(Religion)),
          phone1: fc.constant('11999999999'),
          hasTherapyHistory: fc.boolean(),
          takesMedication: fc.boolean(),
          hasHospitalization: fc.boolean(),
          credits: fc.integer({ min: 0 }),
          consultationPrice: fc.float({ min: -100, max: 0, noNaN: true }) // Non-positive price
        }),
        (patientDataWithNegativePrice) => {
          // Test that negative/zero consultation price is rejected
          const result = PatientSchema.safeParse(patientDataWithNegativePrice)
          
          // Should reject data with non-positive consultation price
          expect(result.success).toBe(false)
          
          if (!result.success) {
            // Should have error about consultation price
            const priceError = result.error.issues.find(issue => 
              issue.path.includes('consultationPrice')
            )
            expect(priceError).toBeDefined()
          }
        }
      ),
      { numRuns: 10 }
    )
  })

  /**
   * Property: For any patient data with invalid email formats, the system should reject the data
   * 
   * Feature: patient-management-system, Property 1: Patient Data Validation
   * Validates: Requirements 1.2
   */
  it('should reject data with invalid email formats', () => {
    fc.assert(
      fc.property(
        fc.oneof(
          // Invalid patient email
          fc.record({
            name: fc.constant('João Silva'),
            birthDate: fc.date({ min: new Date('1950-01-01'), max: new Date('2010-01-01') }),
            gender: fc.constantFrom(...Object.values(Gender)),
            religion: fc.constantFrom(...Object.values(Religion)),
            phone1: fc.constant('11999999999'),
            hasTherapyHistory: fc.boolean(),
            takesMedication: fc.boolean(),
            hasHospitalization: fc.boolean(),
            credits: fc.integer({ min: 0 }),
            email: fc.oneof(
              fc.constant('invalid-email'),
              fc.constant('no-at-symbol'),
              fc.constant('@invalid'),
              fc.constant('invalid@')
            )
          }),
          // Invalid legal guardian email
          fc.record({
            name: fc.constant('João Silva'),
            birthDate: fc.date({ min: new Date('1950-01-01'), max: new Date('2010-01-01') }),
            gender: fc.constantFrom(...Object.values(Gender)),
            religion: fc.constantFrom(...Object.values(Religion)),
            phone1: fc.constant('11999999999'),
            hasTherapyHistory: fc.boolean(),
            takesMedication: fc.boolean(),
            hasHospitalization: fc.boolean(),
            credits: fc.integer({ min: 0 }),
            legalGuardianEmail: fc.oneof(
              fc.constant('invalid-email'),
              fc.constant('no-at-symbol'),
              fc.constant('@invalid'),
              fc.constant('invalid@')
            )
          })
        ),
        (patientDataWithInvalidEmail) => {
          // Test that invalid email formats are rejected
          const result = PatientSchema.safeParse(patientDataWithInvalidEmail)
          
          // Should reject data with invalid email
          expect(result.success).toBe(false)
          
          if (!result.success) {
            // Should have error about email format
            const emailError = result.error.issues.find(issue => 
              issue.path.includes('email') || issue.message.includes('Email inválido')
            )
            expect(emailError).toBeDefined()
          }
        }
      ),
      { numRuns: 10 }
    )
  })
})

describe('Property 2: Conditional Guardian Email Validation', () => {
  /**
   * Property: For any patient with a legal guardian specified, the system should 
   * require and validate the guardian's email address
   * 
   * Feature: patient-management-system, Property 2: Conditional Guardian Email Validation
   * Validates: Requirements 1.3
   */
  it('should require guardian email when legal guardian is specified', () => {
    fc.assert(
      fc.property(
        // Generator for patient data with legal guardian but missing email
        fc.record({
          name: fc.constant('João Silva'),
          birthDate: fc.date({ min: new Date('1950-01-01'), max: new Date('2010-01-01') }),
          gender: fc.constantFrom(...Object.values(Gender)),
          religion: fc.constantFrom(...Object.values(Religion)),
          phone1: fc.constant('11999999999'),
          hasTherapyHistory: fc.boolean(),
          takesMedication: fc.boolean(),
          hasHospitalization: fc.boolean(),
          credits: fc.integer({ min: 0 }),
          legalGuardian: fc.oneof(
            fc.constant('Maria Silva'),
            fc.constant('João Santos'),
            fc.constant('Ana Costa'),
            fc.constant('Pedro Oliveira')
          ),
          legalGuardianEmail: fc.oneof(
            fc.constant(undefined),
            fc.constant('')
          )
        }),
        (patientDataWithGuardianButNoEmail) => {
          // Test that legal guardian without email is rejected
          const result = PatientSchema.safeParse(patientDataWithGuardianButNoEmail)
          
          // Should reject data when legal guardian is specified but email is missing/empty
          expect(result.success).toBe(false)
          
          if (!result.success) {
            // Should have specific error about guardian email being required
            const guardianEmailError = result.error.issues.find(issue => 
              issue.message.includes('Email do responsável é obrigatório')
            )
            expect(guardianEmailError).toBeDefined()
          }
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Property: For any patient with a legal guardian and valid email, the system should 
   * accept the data
   * 
   * Feature: patient-management-system, Property 2: Conditional Guardian Email Validation
   * Validates: Requirements 1.3
   */
  it('should accept data when legal guardian has valid email', () => {
    fc.assert(
      fc.property(
        // Generator for patient data with legal guardian and valid email
        fc.record({
          name: fc.constant('João Silva'),
          birthDate: fc.date({ min: new Date('1950-01-01'), max: new Date('2010-01-01') }),
          gender: fc.constantFrom(...Object.values(Gender)),
          religion: fc.constantFrom(...Object.values(Religion)),
          phone1: fc.constant('11999999999'),
          hasTherapyHistory: fc.boolean(),
          takesMedication: fc.boolean(),
          hasHospitalization: fc.boolean(),
          credits: fc.integer({ min: 0 }),
          legalGuardian: fc.oneof(
            fc.constant('Maria Silva'),
            fc.constant('João Santos'),
            fc.constant('Ana Costa'),
            fc.constant('Pedro Oliveira')
          ),
          legalGuardianEmail: fc.oneof(
            fc.constant('maria@email.com'),
            fc.constant('joao@teste.com.br'),
            fc.constant('ana.costa@exemplo.org'),
            fc.constant('pedro.oliveira@gmail.com')
          )
        }),
        (patientDataWithGuardianAndEmail) => {
          // Test that legal guardian with valid email is accepted
          const result = PatientSchema.safeParse(patientDataWithGuardianAndEmail)
          
          // Should accept data when legal guardian has valid email
          expect(result.success).toBe(true)
          
          if (result.success) {
            // Verify the guardian and email are preserved
            expect(result.data.legalGuardian).toBe(patientDataWithGuardianAndEmail.legalGuardian)
            expect(result.data.legalGuardianEmail).toBe(patientDataWithGuardianAndEmail.legalGuardianEmail)
          }
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Property: For any patient without a legal guardian, the system should 
   * accept the data regardless of guardian email presence
   * 
   * Feature: patient-management-system, Property 2: Conditional Guardian Email Validation
   * Validates: Requirements 1.3
   */
  it('should accept data when no legal guardian is specified regardless of email', () => {
    fc.assert(
      fc.property(
        // Generator for patient data without legal guardian
        fc.record({
          name: fc.constant('João Silva'),
          birthDate: fc.date({ min: new Date('1950-01-01'), max: new Date('2010-01-01') }),
          gender: fc.constantFrom(...Object.values(Gender)),
          religion: fc.constantFrom(...Object.values(Religion)),
          phone1: fc.constant('11999999999'),
          hasTherapyHistory: fc.boolean(),
          takesMedication: fc.boolean(),
          hasHospitalization: fc.boolean(),
          credits: fc.integer({ min: 0 }),
          legalGuardian: fc.oneof(
            fc.constant(undefined),
            fc.constant('')
          ),
          legalGuardianEmail: fc.oneof(
            fc.constant(undefined),
            fc.constant(''),
            fc.constant('valid@email.com')
          )
        }),
        (patientDataWithoutGuardian) => {
          // Test that no legal guardian means email validation is not enforced
          const result = PatientSchema.safeParse(patientDataWithoutGuardian)
          
          // Should accept data when no legal guardian is specified
          // (email validation may still fail for invalid emails, but guardian requirement should not)
          if (!result.success) {
            // If it fails, it should NOT be due to guardian email requirement
            const guardianEmailError = result.error.issues.find(issue => 
              issue.message.includes('Email do responsável é obrigatório')
            )
            expect(guardianEmailError).toBeUndefined()
          } else {
            // If it succeeds, verify no guardian is set
            expect(
              !patientDataWithoutGuardian.legalGuardian || 
              patientDataWithoutGuardian.legalGuardian.trim() === ''
            ).toBe(true)
          }
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Property: For any patient with legal guardian and invalid email format, 
   * the system should reject due to email format validation
   * 
   * Feature: patient-management-system, Property 2: Conditional Guardian Email Validation
   * Validates: Requirements 1.3
   */
  it('should reject data when legal guardian has invalid email format', () => {
    fc.assert(
      fc.property(
        // Generator for patient data with legal guardian and invalid email format
        fc.record({
          name: fc.constant('João Silva'),
          birthDate: fc.date({ min: new Date('1950-01-01'), max: new Date('2010-01-01') }),
          gender: fc.constantFrom(...Object.values(Gender)),
          religion: fc.constantFrom(...Object.values(Religion)),
          phone1: fc.constant('11999999999'),
          hasTherapyHistory: fc.boolean(),
          takesMedication: fc.boolean(),
          hasHospitalization: fc.boolean(),
          credits: fc.integer({ min: 0 }),
          legalGuardian: fc.oneof(
            fc.constant('Maria Silva'),
            fc.constant('João Santos'),
            fc.constant('Ana Costa')
          ),
          legalGuardianEmail: fc.oneof(
            fc.constant('invalid-email'),
            fc.constant('no-at-symbol'),
            fc.constant('@invalid'),
            fc.constant('invalid@'),
            fc.constant('invalid@.'),
            fc.constant('.invalid@domain')
          )
        }),
        (patientDataWithInvalidGuardianEmail) => {
          // Test that legal guardian with invalid email format is rejected
          const result = PatientSchema.safeParse(patientDataWithInvalidGuardianEmail)
          
          // Should reject data when legal guardian email format is invalid
          expect(result.success).toBe(false)
          
          if (!result.success) {
            // Should have error about email format
            const emailFormatError = result.error.issues.find(issue => 
              issue.path.includes('legalGuardianEmail') && 
              issue.message.includes('Email inválido')
            )
            expect(emailFormatError).toBeDefined()
          }
        }
      ),
      { numRuns: 100 }
    )
  })
})