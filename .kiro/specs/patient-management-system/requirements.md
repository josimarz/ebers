# Requirements Document

## Introduction

Ebers is a patient management system designed for psychology practices. The system enables therapists to manage patients, conduct consultations, track payments through a credit system, and maintain financial records. The system runs locally on the therapist's machine and creates a local network connection for iPad access during patient self-registration.

## Glossary

- **System**: The Ebers patient management application
- **Therapist**: The psychology professional using the system
- **Patient**: Individual receiving psychological services
- **Consultation**: A therapy session between therapist and patient
- **Credit**: Prepaid consultation units that patients can purchase
- **Self_Registration**: Patient registration process conducted on iPad
- **Local_Network**: Network connection between therapist's computer and iPad

## Requirements

### Requirement 1: Patient Registration and Management

**User Story:** As a therapist, I want to register and manage patient information, so that I can maintain comprehensive patient records and provide personalized care.

#### Acceptance Criteria

1. THE System SHALL store patient name, birth date, gender, and religion as required fields
2. THE System SHALL store optional patient data including profile photo, CPF, RG, legal guardian information, contact details, therapy history, medication information, hospitalization history, consultation pricing, and consultation frequency
3. WHEN a patient has a legal guardian specified, THE System SHALL require the guardian's email address
4. THE System SHALL validate that consultation pricing is a positive decimal value
5. THE System SHALL track patient credits as a non-negative integer value

### Requirement 2: iPad Self-Registration

**User Story:** As a patient, I want to register myself using an iPad, so that I can provide my information directly without therapist assistance.

#### Acceptance Criteria

1. WHEN the System is accessed from an iPad device, THE System SHALL redirect to the patient registration form
2. WHILE accessing from iPad, THE System SHALL hide consultation pricing, frequency, schedule, and credit fields
3. WHILE accessing from iPad, THE System SHALL prevent navigation away from the registration form
4. THE System SHALL allow therapist access to all fields when accessed from computer devices
5. THE System SHALL create a responsive registration form suitable for iPad interaction

### Requirement 3: Patient Listing and Search

**User Story:** As a therapist, I want to view and search through patient records, so that I can quickly find and access patient information.

#### Acceptance Criteria

1. THE System SHALL display patient list with profile photo, name, age, phone, frequency, consultation day, credits, and action buttons
2. THE System SHALL paginate patient listings with 10 patients per page
3. THE System SHALL allow sorting patients by name and age
4. THE System SHALL provide name-based patient filtering functionality
5. WHEN a patient has no active consultation, THE System SHALL display "New Consultation" button
6. WHEN a patient has an active consultation, THE System SHALL display "Consultation" button

### Requirement 4: Credit Management

**User Story:** As a therapist, I want to sell consultation credits to patients, so that they can prepay for services and I can track their remaining sessions.

#### Acceptance Criteria

1. WHEN editing a patient with established consultation pricing, THE System SHALL provide a "Sell Credits" button
2. WHEN selling credits, THE System SHALL open a modal requiring credit quantity input
3. THE System SHALL calculate and display total cost by multiplying credit quantity by consultation price
4. WHEN credits are sold, THE System SHALL add the purchased credits to the patient's credit balance
5. THE System SHALL prevent credit sales when consultation pricing is not established

### Requirement 5: Consultation Management

**User Story:** As a therapist, I want to conduct and track consultations, so that I can provide structured therapy sessions and maintain session records.

#### Acceptance Criteria

1. WHEN creating a new consultation, THE System SHALL initialize with current timestamp, "Open" status, patient's consultation price, and empty content fields
2. IF patient has available credits, THE System SHALL mark consultation as paid and deduct one credit
3. THE System SHALL display consultation header with patient photo, name, age, session timer, and action buttons
4. THE System SHALL provide real-time session timer with color coding: green (>15min), yellow (5-15min), red (≤5min)
5. THE System SHALL provide rich text editors for patient content and therapist notes with formatting options
6. WHEN consultation is finalized, THE System SHALL update status to "Finalized" and record end timestamp
7. WHEN payment is processed, THE System SHALL mark consultation as paid

### Requirement 6: Consultation History

**User Story:** As a therapist, I want to view consultation history, so that I can track patient progress and session details over time.

#### Acceptance Criteria

1. THE System SHALL display consultation list with patient photo, date, start time, end time, status, and payment status
2. THE System SHALL allow filtering consultations by patient using autocomplete dropdown
3. THE System SHALL sort consultations by date with most recent first by default
4. WHEN a consultation row is clicked, THE System SHALL navigate to the consultation details page
5. THE System SHALL prevent creating new consultations when patient has unfinalized consultations

### Requirement 7: Financial Control

**User Story:** As a therapist, I want to monitor patient financial status, so that I can track payments and identify outstanding balances.

#### Acceptance Criteria

1. THE System SHALL display financial overview with patient photo, name, total consultations, paid consultations, and available credits
2. WHEN paid consultations are fewer than total consultations, THE System SHALL highlight the patient row in red
3. THE System SHALL sort patients by payment deficit (total consultations minus paid consultations) in descending order
4. THE System SHALL provide patient filtering with autocomplete functionality
5. THE System SHALL provide buttons to access patient consultations and patient profile from financial view

### Requirement 8: System Layout and Navigation

**User Story:** As a therapist, I want an intuitive system layout, so that I can efficiently navigate between different system functions.

#### Acceptance Criteria

1. THE System SHALL provide a left sidebar navigation menu
2. THE System SHALL display breadcrumb navigation in the header
3. THE System SHALL show page titles and content in the main body area
4. THE System SHALL include a footer section
5. THE System SHALL use the specified color palette: primary (#197BBD), secondary (#125E8A), text (#204B57), success (#16a085), warning (#f39c12), danger (#c0392b)

### Requirement 9: Data Persistence

**User Story:** As a therapist, I want all system data to be stored locally, so that I can maintain patient confidentiality and system independence.

#### Acceptance Criteria

1. THE System SHALL use SQLite database for local data storage
2. THE System SHALL use Prisma ORM for database operations
3. THE System SHALL persist all patient, consultation, and financial data locally
4. THE System SHALL maintain data integrity across all operations
5. THE System SHALL ensure data is immediately saved when created or modified

### Requirement 10: Rich Text Editing

**User Story:** As a therapist, I want to format consultation notes, so that I can create structured and readable session documentation.

#### Acceptance Criteria

1. THE System SHALL provide HTML editors for consultation content and notes fields
2. THE System SHALL support text formatting: bold, italic, underline, strikethrough
3. THE System SHALL provide basic color options for text formatting
4. THE System SHALL support font size adjustment and heading levels (h1, h2, h3)
5. THE System SHALL save formatted content and preserve formatting when displaying