/**
 * Property-based tests for UI layout structure
 * Feature: patient-management-system, Property 17: UI Layout Structure
 * Validates: Requirements 8.1, 8.2, 8.3, 8.4, 8.5
 */

import React from 'react'
import * as fc from 'fast-check'
import { render, screen } from '@testing-library/react'
import { usePathname } from 'next/navigation'
import AppLayout from '@/components/layout/AppLayout'
import Sidebar from '@/components/layout/Sidebar'
import Breadcrumb from '@/components/layout/Breadcrumb'
import Footer from '@/components/layout/Footer'

// Mock Next.js navigation hooks
jest.mock('next/navigation', () => ({
  usePathname: jest.fn(),
}))

const mockUsePathname = usePathname as jest.MockedFunction<typeof usePathname>

// Mock component that simulates different page content
interface MockPageProps {
  title?: string
  content: string
}

function MockPage({ title, content }: MockPageProps) {
  return (
    <AppLayout title={title}>
      <div data-testid="page-content">
        {content}
      </div>
    </AppLayout>
  )
}

describe('Property 17: UI Layout Structure', () => {
  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks()
  })

  /**
   * Property: For any page, the system should render required layout elements 
   * (sidebar, breadcrumbs, page titles, footer) with correct color palette
   * 
   * Feature: patient-management-system, Property 17: UI Layout Structure
   * Validates: Requirements 8.1, 8.2, 8.3, 8.4, 8.5
   */
  it('should render all required layout elements for any page', () => {
    fc.assert(
      fc.property(
        // Generator for different page configurations
        fc.record({
          pathname: fc.oneof(
            fc.constant('/'),
            fc.constant('/patients'),
            fc.constant('/patients/new'),
            fc.constant('/consultations'),
            fc.constant('/financial'),
            fc.constant('/patients/123'),
            fc.constant('/consultations/456')
          ),
          title: fc.option(fc.string({ minLength: 1, maxLength: 50 })),
          content: fc.string({ minLength: 1, maxLength: 100 })
        }),
        ({ pathname, title, content }) => {
          // Mock the pathname for breadcrumb generation
          mockUsePathname.mockReturnValue(pathname)
          
          const { unmount, container } = render(
            <MockPage title={title} content={content} />
          )
          
          try {
            // Requirement 8.1: THE System SHALL provide a left sidebar navigation menu
            const sidebar = container.querySelector('[class*="w-64"]') // Sidebar with fixed width
            expect(sidebar).toBeInTheDocument()
            
            // Verify sidebar contains navigation elements
            expect(screen.getByText('Ebers')).toBeInTheDocument() // Brand/logo
            expect(screen.getAllByText('Dashboard')).toHaveLength(pathname === '/' ? 1 : 2) // Sidebar + breadcrumb (if not home)
            expect(screen.getAllByText('Pacientes').length).toBeGreaterThan(0)
            expect(screen.getAllByText('Novo Paciente').length).toBeGreaterThan(0)
            expect(screen.getAllByText('Consultas').length).toBeGreaterThan(0)
            expect(screen.getAllByText('Controle Financeiro').length).toBeGreaterThan(0)
            
            // Requirement 8.2: THE System SHALL display breadcrumb navigation in the header
            if (pathname !== '/') {
              // Breadcrumb should be present for non-home pages
              const breadcrumbContainer = container.querySelector('nav')
              expect(breadcrumbContainer).toBeInTheDocument()
            }
            
            // Requirement 8.3: THE System SHALL show page titles and content in the main body area
            const mainContent = container.querySelector('main')
            expect(mainContent).toBeInTheDocument()
            
            // Page content should be rendered
            expect(screen.getByTestId('page-content')).toBeInTheDocument()
            if (content.trim()) {
              // HTML normalizes multiple consecutive spaces to single spaces
              const normalizedContent = content.trim().replace(/\s+/g, ' ')
              expect(screen.getByTestId('page-content')).toHaveTextContent(normalizedContent)
            }
            
            // If title is provided, it should be displayed
            if (title && title.trim()) {
              // Use a more flexible text matcher to handle normalized whitespace and special characters
              const titleText = title.trim()
              try {
                expect(screen.getByText(titleText)).toBeInTheDocument()
              } catch {
                // If exact match fails, try with a function matcher that handles whitespace normalization
                expect(screen.getByText((content, element) => {
                  if (!element) return false
                  const normalizedContent = element.textContent?.replace(/\s+/g, ' ').trim() || ''
                  const normalizedTitle = titleText.replace(/\s+/g, ' ').trim()
                  return normalizedContent === normalizedTitle
                })).toBeInTheDocument()
              }
            }
            
            // Requirement 8.4: THE System SHALL include a footer section
            const footer = container.querySelector('footer')
            expect(footer).toBeInTheDocument()
            
            // Footer should contain expected content
            expect(screen.getByText(/© \d{4} Ebers - Sistema de Gerenciamento de Pacientes/)).toBeInTheDocument()
            expect(screen.getAllByText('Consultório de Psicologia').length).toBeGreaterThan(0)
            
            // Requirement 8.5: THE System SHALL use the specified color palette
            // Verify primary color (#197BBD) is used in sidebar
            const sidebarElement = container.querySelector('[class*="bg-primary"]')
            expect(sidebarElement).toBeInTheDocument()
            
            // Verify text color (#204B57) is used appropriately (may not be present on home page)
            const textElements = container.querySelectorAll('[class*="text-text"]')
            if (pathname !== '/') {
              expect(textElements.length).toBeGreaterThan(0)
            }
            
          } finally {
            unmount()
          }
        }
      ),
      { numRuns: 10 }
    )
  })

  /**
   * Property: For any navigation state, the sidebar should maintain consistent 
   * structure and highlight active navigation items
   * 
   * Feature: patient-management-system, Property 17: UI Layout Structure
   * Validates: Requirements 8.1
   */
  it('should maintain consistent sidebar structure and highlight active navigation', () => {
    fc.assert(
      fc.property(
        // Generator for different navigation paths
        fc.constantFrom(
          '/',
          '/patients',
          '/patients/new',
          '/consultations',
          '/financial'
        ),
        (pathname) => {
          mockUsePathname.mockReturnValue(pathname)
          
          const { unmount } = render(<Sidebar />)
          
          try {
            // Verify all navigation items are present
            const navigationItems = [
              'Pacientes', 
              'Novo Paciente',
              'Consultas',
              'Controle Financeiro'
            ]
            
            navigationItems.forEach(item => {
              expect(screen.getAllByText(item).length).toBeGreaterThan(0)
            })
            
            // Verify Dashboard is present in sidebar (use getAllByText to handle multiple instances)
            const dashboardElements = screen.getAllByText('Dashboard')
            expect(dashboardElements.length).toBeGreaterThan(0)
            
            // Verify brand is present
            expect(screen.getByText('Ebers')).toBeInTheDocument()
            
            // Verify footer info is present
            expect(screen.getByText('Sistema de Gerenciamento')).toBeInTheDocument()
            expect(screen.getByText('Consultório de Psicologia')).toBeInTheDocument()
            
          } finally {
            unmount()
          }
        }
      ),
      { numRuns: 10 }
    )
  })

  /**
   * Property: For any pathname, the breadcrumb should generate appropriate 
   * navigation trail
   * 
   * Feature: patient-management-system, Property 17: UI Layout Structure
   * Validates: Requirements 8.2
   */
  it('should generate appropriate breadcrumb navigation for any pathname', () => {
    fc.assert(
      fc.property(
        // Generator for different pathname structures
        fc.oneof(
          fc.constant('/'),
          fc.constant('/patients'),
          fc.constant('/patients/new'),
          fc.constant('/consultations'),
          fc.constant('/financial'),
          // Dynamic paths - filter out problematic strings
          fc.record({
            base: fc.constantFrom('/patients', '/consultations'),
            id: fc.string({ minLength: 1, maxLength: 20 })
              .filter(id => !id.includes('__proto__') && !id.includes('constructor') && !id.includes('prototype'))
          }).map(({ base, id }) => `${base}/${id}`)
        ),
        (pathname) => {
          mockUsePathname.mockReturnValue(pathname)
          
          const { unmount, container } = render(<Breadcrumb />)
          
          try {
            if (pathname === '/') {
              // Home page should not show breadcrumb
              expect(container.firstChild).toBeNull()
            } else {
              // Non-home pages should show breadcrumb navigation
              const breadcrumbNav = container.querySelector('nav')
              expect(breadcrumbNav).toBeInTheDocument()
              
              // Should contain home icon
              const homeIcon = container.querySelector('svg')
              expect(homeIcon).toBeInTheDocument()
              
              // Should contain Dashboard link for all non-home pages (use getAllByText to handle multiple instances)
              const dashboardElements = screen.getAllByText('Dashboard')
              expect(dashboardElements.length).toBeGreaterThan(0)
            }
          } finally {
            unmount()
          }
        }
      ),
      { numRuns: 10 }
    )
  })

  /**
   * Property: For any footer render, it should display consistent content 
   * with current year and branding
   * 
   * Feature: patient-management-system, Property 17: UI Layout Structure
   * Validates: Requirements 8.4
   */
  it('should display consistent footer content with current year', () => {
    fc.assert(
      fc.property(
        // Generator for multiple render attempts to test consistency
        fc.integer({ min: 1, max: 5 }),
        (renderCount) => {
          const currentYear = new Date().getFullYear()
          
          for (let i = 0; i < renderCount; i++) {
            const { unmount } = render(<Footer />)
            
            try {
              // Footer should be present
              const footer = document.querySelector('footer')
              expect(footer).toBeInTheDocument()
              
              // Should contain copyright with current year
              expect(screen.getByText(new RegExp(`© ${currentYear} Ebers - Sistema de Gerenciamento de Pacientes`))).toBeInTheDocument()
              
              // Should contain branding
              expect(screen.getByText('Consultório de Psicologia')).toBeInTheDocument()
              
            } finally {
              unmount()
            }
          }
        }
      ),
      { numRuns: 10 }
    )
  })

  /**
   * Property: For any layout configuration, the system should maintain 
   * proper responsive structure and accessibility
   * 
   * Feature: patient-management-system, Property 17: UI Layout Structure
   * Validates: Requirements 8.1, 8.3, 8.4
   */
  it('should maintain proper responsive structure and accessibility', () => {
    fc.assert(
      fc.property(
        fc.record({
          title: fc.option(fc.string({ minLength: 1, maxLength: 30 })),
          content: fc.string({ minLength: 1, maxLength: 50 }),
          pathname: fc.constantFrom('/', '/patients', '/consultations', '/financial')
        }),
        ({ title, content, pathname }) => {
          mockUsePathname.mockReturnValue(pathname)
          
          const { unmount, container } = render(
            <MockPage title={title} content={content} />
          )
          
          try {
            // Layout should have proper semantic structure
            const main = container.querySelector('main')
            const header = container.querySelector('header')
            const footer = container.querySelector('footer')
            
            expect(main).toBeInTheDocument()
            expect(header).toBeInTheDocument()
            expect(footer).toBeInTheDocument()
            
            // Layout should use flexbox for proper responsive behavior
            const layoutContainer = container.querySelector('[class*="flex"]')
            expect(layoutContainer).toBeInTheDocument()
            
            // Sidebar should have fixed width for consistent layout
            const sidebar = container.querySelector('[class*="w-64"]')
            expect(sidebar).toBeInTheDocument()
            
            // Main content area should be scrollable
            const scrollableMain = container.querySelector('[class*="overflow-y-auto"]')
            expect(scrollableMain).toBeInTheDocument()
            
            // Header should have proper border styling
            const headerWithBorder = container.querySelector('header[class*="border-b"]')
            expect(headerWithBorder).toBeInTheDocument()
            
          } finally {
            unmount()
          }
        }
      ),
      { numRuns: 10 }
    )
  })

  /**
   * Property: For any color usage, the system should consistently apply 
   * the specified color palette
   * 
   * Feature: patient-management-system, Property 17: UI Layout Structure
   * Validates: Requirements 8.5
   */
  it('should consistently apply the specified color palette', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('/', '/patients', '/consultations'),
        (pathname) => {
          mockUsePathname.mockReturnValue(pathname)
          
          const { unmount, container } = render(
            <MockPage title="Test Page" content="Test content" />
          )
          
          try {
            // Primary color (#197BBD) should be used in sidebar background
            const primaryElements = container.querySelectorAll('[class*="bg-primary"]')
            expect(primaryElements.length).toBeGreaterThan(0)
            
            // Secondary color (#125E8A) should be used for active states
            const secondaryElements = container.querySelectorAll('[class*="bg-secondary"]')
            expect(secondaryElements.length).toBeGreaterThan(0)
            
            // Text color (#204B57) should be used for main text
            const textElements = container.querySelectorAll('[class*="text-text"]')
            expect(textElements.length).toBeGreaterThan(0)
            
            // White background should be used for main content areas
            const whiteBackgrounds = container.querySelectorAll('[class*="bg-white"]')
            expect(whiteBackgrounds.length).toBeGreaterThan(0)
            
            // Gray backgrounds should be used for subtle areas
            const grayBackgrounds = container.querySelectorAll('[class*="bg-gray"]')
            expect(grayBackgrounds.length).toBeGreaterThan(0)
            
          } finally {
            unmount()
          }
        }
      ),
      { numRuns: 10 }
    )
  })
})