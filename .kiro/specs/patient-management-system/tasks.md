# Implementation Plan: Patient Management System (Ebers)

## Overview

This implementation plan breaks down the Ebers patient management system into discrete, manageable coding tasks. Each task builds incrementally on previous work, ensuring a functional system at each checkpoint. The plan follows TDD principles with comprehensive testing integrated throughout the development process.

## Tasks

- [x] 1. Project Setup and Core Infrastructure
  - Initialize Next.js 16.1.1 project with TypeScript and App Router
  - Configure Tailwind CSS 4.1 and install shadcn/ui components
  - Set up Prisma ORM with SQLite database
  - Configure testing environment with Jest, React Testing Library, and fast-check
  - Create basic project structure and configuration files
  - _Requirements: 9.1, 9.2_

- [x] 2. Database Schema and Models
  - [x] 2.1 Create Prisma schema with Patient and Consultation models
    - Define all enums (Gender, Religion, ConsultationFrequency, etc.)
    - Implement Patient model with all required and optional fields
    - Implement Consultation model with relationships
    - _Requirements: 1.1, 1.2, 5.1_

  - [x] 2.2 Write property test for patient data validation
    - **Property 1: Patient Data Validation**
    - **Validates: Requirements 1.1, 1.2, 1.4, 1.5**

  - [x] 2.3 Write property test for conditional guardian email validation
    - **Property 2: Conditional Guardian Email Validation**
    - **Validates: Requirements 1.3**

  - [x] 2.4 Generate Prisma client and run initial migration
    - Generate TypeScript types from schema
    - Create and apply database migration
    - _Requirements: 9.1, 9.2_

- [x] 3. Core Validation and Utilities
  - [x] 3.1 Create Zod validation schemas
    - Implement PatientSchema with all validation rules
    - Implement ConsultationSchema for consultation data
    - Create utility functions for data validation
    - _Requirements: 1.3, 1.4, 1.5_

  - [x] 3.2 Implement device detection middleware
    - Create middleware to detect iPad devices
    - Implement redirection logic for iPad users
    - _Requirements: 2.1, 2.3_

  - [x] 3.3 Write property test for device-based UI rendering
    - **Property 3: Device-Based UI Rendering**
    - **Validates: Requirements 2.1, 2.2, 2.4**

  - [x] 3.4 Write property test for iPad navigation restriction
    - **Property 4: iPad Navigation Restriction**
    - **Validates: Requirements 2.3**

- [x] 4. Database Operations Layer
  - [x] 4.1 Create patient CRUD operations
    - Implement createPatient, updatePatient, getPatient functions
    - Add patient listing with pagination and sorting
    - Implement patient search and filtering
    - _Requirements: 1.1, 1.2, 3.2, 3.3, 3.4_

  - [x] 4.2 Write property test for data persistence round-trip
    - **Property 18: Data Persistence Round-Trip**
    - **Validates: Requirements 9.3, 9.5**

  - [x] 4.3 Write property test for database referential integrity
    - **Property 19: Database Referential Integrity**
    - **Validates: Requirements 9.4**

  - [x] 4.4 Create consultation CRUD operations
    - Implement createConsultation, updateConsultation, getConsultation functions
    - Add consultation listing with filtering and sorting
    - Implement consultation state management
    - _Requirements: 5.1, 5.6, 5.7, 6.1, 6.3_

- [x] 5. Checkpoint - Core Data Layer Complete
  - Ensure all tests pass, ask the user if questions arise.

- [x] 6. Layout and Navigation Components
  - [x] 6.1 Create root layout with sidebar navigation
    - Implement responsive sidebar with navigation menu
    - Add breadcrumb navigation component
    - Create footer component
    - Apply color palette and styling
    - _Requirements: 8.1, 8.2, 8.4, 8.5_

  - [x] 6.2 Write property test for UI layout structure
    - **Property 17: UI Layout Structure**
    - **Validates: Requirements 8.1, 8.2, 8.3, 8.4, 8.5**

  - [x] 6.3 Create reusable UI components
    - Implement patient photo component with fallback
    - Create data table component with sorting and pagination
    - Build modal component for credit sales
    - _Requirements: 3.1, 4.2_

- [x] 7. Patient Registration and Management
  - [x] 7.1 Create patient registration form
    - Build responsive form with all patient fields
    - Implement conditional field rendering for iPad
    - Add photo upload functionality
    - Integrate real-time validation
    - _Requirements: 1.1, 1.2, 2.2, 2.4, 2.5_

  - [x] 7.2 Write unit tests for patient form validation
    - Test required field validation
    - Test conditional guardian email validation
    - Test device-specific field visibility
    - _Requirements: 1.3, 2.2, 2.4_

  - [x] 7.3 Create patient listing page
    - Implement patient table with all required columns
    - Add pagination, sorting, and filtering
    - Implement action buttons with conditional logic
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6_

  - [x] 7.4 Write property test for patient list functionality
    - **Property 5: Patient List Display and Pagination**
    - **Validates: Requirements 3.1, 3.2, 3.3**
    - **Status: PASSED** ✅

  - [x] 7.5 Write property test for patient filtering
    - **Property 6: Patient Filtering**
    - **Validates: Requirements 3.4**
    - **Status: PASSED** ✅

  - [x] 7.6 Write property test for consultation button state
    - **Property 7: Consultation Button State**
    - **Validates: Requirements 3.5, 3.6**
    - **Status: PASSED** ✅

- [x] 8. Credit Management System
  - [x] 8.1 Implement credit sales functionality
    - Create credit sales modal component
    - Implement credit calculation logic
    - Add credit balance updates
    - _Requirements: 4.1, 4.2, 4.3, 4.4_

  - [x] 8.2 Write property test for credit sales validation
    - **Property 8: Credit Sales Validation**
    - **Validates: Requirements 4.1, 4.3, 4.5**

  - [x] 8.3 Write property test for credit balance updates
    - **Property 9: Credit Balance Updates**
    - **Validates: Requirements 4.4**

  - [x] 8.4 Integrate credit management with patient forms
    - Add credit sales button to patient edit form
    - Implement credit validation and business rules
    - _Requirements: 4.5_

- [x] 9. Consultation Management
  - [x] 9.1 Create consultation interface
    - Build consultation header with patient info and timer
    - Implement real-time session timer with color coding
    - Add finalize and payment action buttons
    - _Requirements: 5.3, 5.4_

  - [x] 9.2 Implement rich text editors
    - Integrate HTML editor for patient content
    - Add HTML editor for therapist notes
    - Configure formatting options (bold, italic, colors, headings)
    - _Requirements: 5.5, 10.1, 10.2, 10.3, 10.4_

  - [x] 9.3 Write property test for rich text editor functionality
    - **Property 20: Rich Text Editor Functionality**
    - **Validates: Requirements 10.1, 10.2, 10.3, 10.4, 10.5**

  - [x] 9.4 Implement consultation business logic
    - Create consultation initialization with defaults
    - Implement credit-based payment processing
    - Add consultation state transitions (finalize, payment)
    - _Requirements: 5.1, 5.2, 5.6, 5.7_

  - [x] 9.5 Write property test for consultation initialization
    - **Property 10: Consultation Initialization**
    - **Validates: Requirements 5.1**

  - [x] 9.6 Write property test for credit-based payment processing
    - **Property 11: Credit-Based Payment Processing**
    - **Validates: Requirements 5.2**

  - [x] 9.7 Write property test for consultation state transitions
    - **Property 12: Consultation State Transitions**
    - **Validates: Requirements 5.6, 5.7**

- [x] 10. Consultation History and Management
  - [x] 10.1 Create consultation history page
    - Build consultation listing table
    - Implement patient filtering with autocomplete
    - Add date sorting and navigation to consultation details
    - _Requirements: 6.1, 6.2, 6.3, 6.4_

  - [x] 10.2 Write property test for consultation history display
    - **Property 13: Consultation History Display and Filtering**
    - **Validates: Requirements 6.1, 6.2, 6.3**
    - **Status: PASSED** ✅

  - [x] 10.3 Implement consultation access control
    - Add validation to prevent multiple active consultations
    - Implement business rules for consultation creation
    - _Requirements: 6.5_

  - [x] 10.4 Write property test for consultation access control
    - **Property 14: Consultation Access Control**
    - **Validates: Requirements 6.5**

- [x] 11. Checkpoint - Core Functionality Complete
  - Ensure all tests pass, ask the user if questions arise.

- [x] 12. Financial Control System
  - [x] 12.1 Create financial overview page
    - Build financial dashboard with patient overview
    - Implement payment deficit calculations
    - Add patient highlighting for payment issues
    - _Requirements: 7.1, 7.2_

  - [x] 12.2 Write property test for financial overview calculations
    - **Property 15: Financial Overview Calculations**
    - **Validates: Requirements 7.1, 7.2**

  - [x] 12.3 Implement financial sorting and filtering
    - Add deficit-based sorting logic
    - Implement patient filtering with autocomplete
    - Add navigation buttons to patient details and consultations
    - _Requirements: 7.3, 7.4, 7.5_

  - [x] 12.4 Write property test for financial deficit sorting
    - **Property 16: Financial Deficit Sorting**
    - **Validates: Requirements 7.3**

- [x] 13. API Routes and Server Actions
  - [x] 13.1 Create patient API routes
    - Implement GET, POST, PUT, DELETE endpoints for patients
    - Add validation and error handling
    - Integrate with database operations
    - _Requirements: 1.1, 1.2, 9.3, 9.5_

  - [x] 13.2 Create consultation API routes
    - Implement consultation CRUD endpoints
    - Add consultation state management endpoints
    - Integrate credit processing logic
    - _Requirements: 5.1, 5.2, 5.6, 5.7_

  - [x] 13.3 Create credit management API routes
    - Implement credit sales endpoints
    - Add credit validation and business rules
    - _Requirements: 4.1, 4.3, 4.4, 4.5_

- [x] 14. Integration and Error Handling
  - [x] 14.1 Implement comprehensive error handling
    - Add client-side error boundaries
    - Implement server-side error handling
    - Create user-friendly error messages
    - Add logging and monitoring

  - [x] 14.2 Add data validation and sanitization
    - Implement input sanitization for rich text content
    - Add comprehensive data validation
    - Ensure security best practices

  - [x] 14.3 Write integration tests
    - Test complete user workflows
    - Test error scenarios and edge cases
    - Validate cross-component interactions

- [x] 15. Final Integration and Polish
  - [x] 15.1 Complete system integration
    - Wire all components together
    - Ensure proper navigation flow
    - Test device detection and responsive behavior
    - _Requirements: 2.1, 2.2, 2.3, 2.4_

  - [x] 15.2 Performance optimization and final testing
    - Optimize database queries and component rendering
    - Ensure proper caching and state management
    - Validate all business rules and constraints

- [x] 16. Final Checkpoint - System Complete
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- All tasks are required for comprehensive system development
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties
- Unit tests validate specific examples and edge cases
- The system follows TDD principles with tests written alongside implementation