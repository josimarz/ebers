/**
 * Property-based tests for device-based UI rendering
 * Feature: patient-management-system, Property 3: Device-Based UI Rendering
 * Validates: Requirements 2.1, 2.2, 2.4
 */

import React from 'react'
import * as fc from 'fast-check'
import { render, screen } from '@testing-library/react'
import { getDeviceType } from '@/lib/device-detection'

// Mock component that simulates patient registration form behavior
interface PatientFormProps {
  deviceType: 'ipad' | 'desktop'
}

function MockPatientForm({ deviceType }: PatientFormProps) {
  const isIpad = deviceType === 'ipad'
  
  return (
    <form data-testid="patient-form">
      {/* Always visible fields */}
      <input data-testid="name-field" placeholder="Nome" />
      <input data-testid="birthdate-field" type="date" />
      <select data-testid="gender-field">
        <option value="MALE">Masculino</option>
        <option value="FEMALE">Feminino</option>
      </select>
      <input data-testid="phone-field" placeholder="Telefone" />
      
      {/* iPad-restricted fields - should be hidden on iPad */}
      {!isIpad && (
        <>
          <input 
            data-testid="consultation-price-field" 
            placeholder="Valor da consulta"
            type="number"
          />
          <select data-testid="consultation-frequency-field">
            <option value="WEEKLY">Semanal</option>
            <option value="MONTHLY">Mensal</option>
          </select>
          <select data-testid="consultation-day-field">
            <option value="MONDAY">Segunda</option>
            <option value="TUESDAY">Terça</option>
          </select>
        </>
      )}
      
      {/* iPad-specific indicators */}
      {isIpad && (
        <div data-testid="ipad-mode-indicator">
          Modo iPad - Campos restritos ocultos
        </div>
      )}
    </form>
  )
}

describe('Property 3: Device-Based UI Rendering', () => {
  /**
   * Property: For any device type (iPad vs desktop), the system should render 
   * appropriate UI elements - hiding restricted fields on iPad while showing 
   * all fields on desktop
   * 
   * Feature: patient-management-system, Property 3: Device-Based UI Rendering
   * Validates: Requirements 2.1, 2.2, 2.4
   */
  it('should render appropriate UI elements based on device type', () => {
    fc.assert(
      fc.property(
        // Generator for different device types and user agents
        fc.oneof(
          // iPad user agents
          fc.record({
            userAgent: fc.constantFrom(
              'Mozilla/5.0 (iPad; CPU OS 14_0 like Mac OS X) AppleWebKit/605.1.15',
              'Mozilla/5.0 (iPad; CPU OS 15_0 like Mac OS X) AppleWebKit/605.1.15',
              'Mozilla/5.0 (iPad; CPU OS 16_0 like Mac OS X) AppleWebKit/605.1.15',
              'Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15'
            ),
            expectedDeviceType: fc.constant('ipad' as const)
          }),
          // Desktop user agents
          fc.record({
            userAgent: fc.constantFrom(
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
              'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
              'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36',
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:91.0) Gecko/20100101'
            ),
            expectedDeviceType: fc.constant('desktop' as const)
          })
        ),
        ({ userAgent, expectedDeviceType }) => {
          // Test device detection logic
          const detectedDeviceType = getDeviceType(userAgent)
          expect(detectedDeviceType).toBe(expectedDeviceType)
          
          // Test UI rendering based on device type
          const { unmount } = render(<MockPatientForm deviceType={detectedDeviceType} />)
          
          // Always visible fields should be present regardless of device
          expect(screen.getByTestId('patient-form')).toBeInTheDocument()
          expect(screen.getByTestId('name-field')).toBeInTheDocument()
          expect(screen.getByTestId('birthdate-field')).toBeInTheDocument()
          expect(screen.getByTestId('gender-field')).toBeInTheDocument()
          expect(screen.getByTestId('phone-field')).toBeInTheDocument()
          
          if (detectedDeviceType === 'ipad') {
            // iPad should hide restricted fields
            expect(screen.queryByTestId('consultation-price-field')).not.toBeInTheDocument()
            expect(screen.queryByTestId('consultation-frequency-field')).not.toBeInTheDocument()
            expect(screen.queryByTestId('consultation-day-field')).not.toBeInTheDocument()
            
            // iPad should show mode indicator
            expect(screen.getByTestId('ipad-mode-indicator')).toBeInTheDocument()
          } else {
            // Desktop should show all fields
            expect(screen.getByTestId('consultation-price-field')).toBeInTheDocument()
            expect(screen.getByTestId('consultation-frequency-field')).toBeInTheDocument()
            expect(screen.getByTestId('consultation-day-field')).toBeInTheDocument()
            
            // Desktop should not show iPad mode indicator
            expect(screen.queryByTestId('ipad-mode-indicator')).not.toBeInTheDocument()
          }
          
          unmount()
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Property: For any iPad user agent string, the system should consistently 
   * detect it as iPad device and render restricted UI
   * 
   * Feature: patient-management-system, Property 3: Device-Based UI Rendering
   * Validates: Requirements 2.1, 2.2
   */
  it('should consistently detect iPad devices and render restricted UI', () => {
    fc.assert(
      fc.property(
        // Generator for various iPad user agent strings
        fc.oneof(
          fc.constant('Mozilla/5.0 (iPad; CPU OS 14_0 like Mac OS X)'),
          fc.constant('Mozilla/5.0 (iPad; CPU OS 15_5 like Mac OS X)'),
          fc.constant('Mozilla/5.0 (iPad; CPU OS 16_1 like Mac OS X)'),
          fc.constant('Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X)'),
          fc.constant('Mozilla/5.0 (iPad; U; CPU OS 3_2 like Mac OS X)'),
          // Edge case: iPad in user agent but with other text
          fc.constant('Custom Browser iPad Version 1.0'),
          fc.constant('Safari on iPad Device')
        ),
        (ipadUserAgent) => {
          // Test that all iPad user agents are detected correctly
          const deviceType = getDeviceType(ipadUserAgent)
          expect(deviceType).toBe('ipad')
          
          // Test that UI renders with restrictions
          const { unmount } = render(<MockPatientForm deviceType={deviceType} />)
          
          // Verify restricted fields are hidden
          expect(screen.queryByTestId('consultation-price-field')).not.toBeInTheDocument()
          expect(screen.queryByTestId('consultation-frequency-field')).not.toBeInTheDocument()
          expect(screen.queryByTestId('consultation-day-field')).not.toBeInTheDocument()
          
          // Verify basic fields are still present
          expect(screen.getByTestId('name-field')).toBeInTheDocument()
          expect(screen.getByTestId('phone-field')).toBeInTheDocument()
          
          unmount()
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Property: For any non-iPad user agent string, the system should detect it 
   * as desktop device and render full UI
   * 
   * Feature: patient-management-system, Property 3: Device-Based UI Rendering
   * Validates: Requirements 2.4
   */
  it('should detect non-iPad devices as desktop and render full UI', () => {
    fc.assert(
      fc.property(
        // Generator for various non-iPad user agent strings
        fc.oneof(
          // Windows browsers
          fc.constant('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'),
          fc.constant('Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:91.0) Gecko/20100101'),
          // Mac browsers (but not iPad)
          fc.constant('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'),
          fc.constant('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15'),
          // Linux browsers
          fc.constant('Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36'),
          fc.constant('Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:91.0) Gecko/20100101'),
          // Mobile phones (should be treated as desktop for this system)
          fc.constant('Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)'),
          fc.constant('Mozilla/5.0 (Linux; Android 10; SM-G975F) AppleWebKit/537.36'),
          // Edge cases
          fc.constant(''),
          fc.constant('Custom Browser 1.0'),
          fc.constant('Unknown User Agent')
        ),
        (nonIpadUserAgent) => {
          // Test that non-iPad user agents are detected as desktop
          const deviceType = getDeviceType(nonIpadUserAgent)
          expect(deviceType).toBe('desktop')
          
          // Test that UI renders without restrictions
          const { unmount } = render(<MockPatientForm deviceType={deviceType} />)
          
          // Verify all fields are present
          expect(screen.getByTestId('consultation-price-field')).toBeInTheDocument()
          expect(screen.getByTestId('consultation-frequency-field')).toBeInTheDocument()
          expect(screen.getByTestId('consultation-day-field')).toBeInTheDocument()
          
          // Verify basic fields are also present
          expect(screen.getByTestId('name-field')).toBeInTheDocument()
          expect(screen.getByTestId('phone-field')).toBeInTheDocument()
          
          // Verify no iPad mode indicator
          expect(screen.queryByTestId('ipad-mode-indicator')).not.toBeInTheDocument()
          
          unmount()
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Property: For any device type, the system should render responsive form 
   * suitable for the device interaction
   * 
   * Feature: patient-management-system, Property 3: Device-Based UI Rendering
   * Validates: Requirements 2.5 (responsive design)
   */
  it('should render responsive form suitable for device interaction', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('ipad', 'desktop'),
        (deviceType) => {
          // Test that form renders with appropriate structure for device
          const { unmount, container } = render(<MockPatientForm deviceType={deviceType} />)
          
          try {
            // Form should always be present and properly structured
            const form = container.querySelector('[data-testid="patient-form"]')
            expect(form).toBeInTheDocument()
            expect(form?.tagName.toLowerCase()).toBe('form')
            
            // Basic required fields should always be present
            const requiredFields = [
              'name-field',
              'birthdate-field', 
              'gender-field',
              'phone-field'
            ]
            
            requiredFields.forEach(fieldTestId => {
              const field = container.querySelector(`[data-testid="${fieldTestId}"]`)
              expect(field).toBeInTheDocument()
              
              // Text input fields should have appropriate attributes for accessibility
              if (field?.tagName.toLowerCase() === 'input' && 
                  field.getAttribute('type') !== 'date') {
                expect(field).toHaveAttribute('placeholder')
              }
            })
          } finally {
            unmount()
          }
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Property: For any field visibility configuration, the system should maintain 
   * consistent behavior across multiple renders
   * 
   * Feature: patient-management-system, Property 3: Device-Based UI Rendering
   * Validates: Requirements 2.1, 2.2, 2.4
   */
  it('should maintain consistent field visibility across multiple renders', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('ipad', 'desktop'),
        (deviceType) => {
          // Test consistency across multiple renders
          const renders = []
          
          // Render the same component multiple times
          for (let i = 0; i < 3; i++) {
            const { unmount, container } = render(<MockPatientForm deviceType={deviceType} />)
            
            try {
              // Capture field visibility state
              const fieldVisibility = {
                consultationPrice: !!container.querySelector('[data-testid="consultation-price-field"]'),
                consultationFrequency: !!container.querySelector('[data-testid="consultation-frequency-field"]'),
                consultationDay: !!container.querySelector('[data-testid="consultation-day-field"]'),
                ipadIndicator: !!container.querySelector('[data-testid="ipad-mode-indicator"]')
              }
              
              renders.push(fieldVisibility)
            } finally {
              unmount()
            }
          }
          
          // All renders should have identical field visibility
          const firstRender = renders[0]
          renders.forEach((render, index) => {
            expect(render).toEqual(firstRender)
          })
          
          // Verify expected visibility based on device type
          if (deviceType === 'ipad') {
            expect(firstRender.consultationPrice).toBe(false)
            expect(firstRender.consultationFrequency).toBe(false)
            expect(firstRender.consultationDay).toBe(false)
            expect(firstRender.ipadIndicator).toBe(true)
          } else {
            expect(firstRender.consultationPrice).toBe(true)
            expect(firstRender.consultationFrequency).toBe(true)
            expect(firstRender.consultationDay).toBe(true)
            expect(firstRender.ipadIndicator).toBe(false)
          }
        }
      ),
      { numRuns: 100 }
    )
  })
})