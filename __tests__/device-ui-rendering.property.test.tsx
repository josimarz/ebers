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
  deviceType: 'mobile' | 'desktop'
}

function MockPatientForm({ deviceType }: PatientFormProps) {
  const isMobile = deviceType === 'mobile'
  
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
      
      {/* Mobile-restricted fields - should be hidden on mobile devices */}
      {!isMobile && (
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
      
      {/* Mobile-specific indicators */}
      {isMobile && (
        <div data-testid="mobile-mode-indicator">
          Modo dispositivo móvel - Campos restritos ocultos
        </div>
      )}
    </form>
  )
}

describe('Property 3: Device-Based UI Rendering', () => {
  /**
   * Property: For any device type (mobile vs desktop), the system should render
   * appropriate UI elements - hiding restricted fields on mobile while showing
   * all fields on desktop
   */
  it('should render appropriate UI elements based on device type', () => {
    fc.assert(
      fc.property(
        fc.oneof(
          // Mobile user agents
          fc.record({
            userAgent: fc.constantFrom(
              'Mozilla/5.0 (iPad; CPU OS 14_0 like Mac OS X) AppleWebKit/605.1.15',
              'Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15',
              'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)',
              'Mozilla/5.0 (Linux; Android 13; SM-T870) AppleWebKit/537.36'
            ),
            expectedDeviceType: fc.constant('mobile' as const)
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
          const detectedDeviceType = getDeviceType(userAgent)
          expect(detectedDeviceType).toBe(expectedDeviceType)
          
          const { unmount } = render(<MockPatientForm deviceType={detectedDeviceType} />)
          
          // Always visible fields should be present regardless of device
          expect(screen.getByTestId('patient-form')).toBeInTheDocument()
          expect(screen.getByTestId('name-field')).toBeInTheDocument()
          expect(screen.getByTestId('birthdate-field')).toBeInTheDocument()
          expect(screen.getByTestId('gender-field')).toBeInTheDocument()
          expect(screen.getByTestId('phone-field')).toBeInTheDocument()
          
          if (detectedDeviceType === 'mobile') {
            expect(screen.queryByTestId('consultation-price-field')).not.toBeInTheDocument()
            expect(screen.queryByTestId('consultation-frequency-field')).not.toBeInTheDocument()
            expect(screen.queryByTestId('consultation-day-field')).not.toBeInTheDocument()
            expect(screen.getByTestId('mobile-mode-indicator')).toBeInTheDocument()
          } else {
            expect(screen.getByTestId('consultation-price-field')).toBeInTheDocument()
            expect(screen.getByTestId('consultation-frequency-field')).toBeInTheDocument()
            expect(screen.getByTestId('consultation-day-field')).toBeInTheDocument()
            expect(screen.queryByTestId('mobile-mode-indicator')).not.toBeInTheDocument()
          }
          
          unmount()
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Property: For any mobile user agent string, the system should consistently
   * detect it as mobile device and render restricted UI
   */
  it('should consistently detect mobile devices and render restricted UI', () => {
    fc.assert(
      fc.property(
        fc.oneof(
          fc.constant('Mozilla/5.0 (iPad; CPU OS 14_0 like Mac OS X)'),
          fc.constant('Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X)'),
          fc.constant('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)'),
          fc.constant('Mozilla/5.0 (Linux; Android 13; SM-T870) AppleWebKit/537.36'),
          fc.constant('Mozilla/5.0 (Linux; Android 14; Pixel 8) Mobile Safari'),
          fc.constant('Custom Browser iPad Version 1.0'),
          fc.constant('Safari on iPad Device')
        ),
        (mobileUserAgent) => {
          const deviceType = getDeviceType(mobileUserAgent)
          expect(deviceType).toBe('mobile')
          
          const { unmount } = render(<MockPatientForm deviceType={deviceType} />)
          
          expect(screen.queryByTestId('consultation-price-field')).not.toBeInTheDocument()
          expect(screen.queryByTestId('consultation-frequency-field')).not.toBeInTheDocument()
          expect(screen.queryByTestId('consultation-day-field')).not.toBeInTheDocument()
          expect(screen.getByTestId('name-field')).toBeInTheDocument()
          expect(screen.getByTestId('phone-field')).toBeInTheDocument()
          
          unmount()
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Property: For any desktop user agent string, the system should detect it
   * as desktop device and render full UI
   */
  it('should detect desktop devices and render full UI', () => {
    fc.assert(
      fc.property(
        fc.oneof(
          fc.constant('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'),
          fc.constant('Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:91.0) Gecko/20100101'),
          fc.constant('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'),
          fc.constant('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15'),
          fc.constant('Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36'),
          fc.constant('Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:91.0) Gecko/20100101'),
          fc.constant(''),
          fc.constant('Custom Browser 1.0'),
          fc.constant('Unknown User Agent')
        ),
        (desktopUserAgent) => {
          const deviceType = getDeviceType(desktopUserAgent)
          expect(deviceType).toBe('desktop')
          
          const { unmount } = render(<MockPatientForm deviceType={deviceType} />)
          
          expect(screen.getByTestId('consultation-price-field')).toBeInTheDocument()
          expect(screen.getByTestId('consultation-frequency-field')).toBeInTheDocument()
          expect(screen.getByTestId('consultation-day-field')).toBeInTheDocument()
          expect(screen.getByTestId('name-field')).toBeInTheDocument()
          expect(screen.getByTestId('phone-field')).toBeInTheDocument()
          expect(screen.queryByTestId('mobile-mode-indicator')).not.toBeInTheDocument()
          
          unmount()
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Property: For any device type, the system should render responsive form
   * suitable for the device interaction
   */
  it('should render responsive form suitable for device interaction', () => {
    fc.assert(
      fc.property(
        fc.constantFrom<'mobile' | 'desktop'>('mobile', 'desktop'),
        (deviceType) => {
          const { unmount, container } = render(<MockPatientForm deviceType={deviceType} />)
          
          try {
            const form = container.querySelector('[data-testid="patient-form"]')
            expect(form).toBeInTheDocument()
            expect(form?.tagName.toLowerCase()).toBe('form')
            
            const requiredFields = [
              'name-field',
              'birthdate-field', 
              'gender-field',
              'phone-field'
            ]
            
            requiredFields.forEach(fieldTestId => {
              const field = container.querySelector(`[data-testid="${fieldTestId}"]`)
              expect(field).toBeInTheDocument()
              
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
   */
  it('should maintain consistent field visibility across multiple renders', () => {
    fc.assert(
      fc.property(
        fc.constantFrom<'mobile' | 'desktop'>('mobile', 'desktop'),
        (deviceType) => {
          const renders: Array<Record<string, boolean>> = []
          
          for (let i = 0; i < 3; i++) {
            const { unmount, container } = render(<MockPatientForm deviceType={deviceType} />)
            
            try {
              const fieldVisibility = {
                consultationPrice: !!container.querySelector('[data-testid="consultation-price-field"]'),
                consultationFrequency: !!container.querySelector('[data-testid="consultation-frequency-field"]'),
                consultationDay: !!container.querySelector('[data-testid="consultation-day-field"]'),
                mobileIndicator: !!container.querySelector('[data-testid="mobile-mode-indicator"]')
              }
              
              renders.push(fieldVisibility)
            } finally {
              unmount()
            }
          }
          
          const firstRender = renders[0]
          renders.forEach((r) => {
            expect(r).toEqual(firstRender)
          })
          
          if (deviceType === 'mobile') {
            expect(firstRender.consultationPrice).toBe(false)
            expect(firstRender.consultationFrequency).toBe(false)
            expect(firstRender.consultationDay).toBe(false)
            expect(firstRender.mobileIndicator).toBe(true)
          } else {
            expect(firstRender.consultationPrice).toBe(true)
            expect(firstRender.consultationFrequency).toBe(true)
            expect(firstRender.consultationDay).toBe(true)
            expect(firstRender.mobileIndicator).toBe(false)
          }
        }
      ),
      { numRuns: 100 }
    )
  })
})
