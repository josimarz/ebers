# UI Components

This directory contains reusable UI components for the Ebers patient management system.

## Components

### PatientPhoto

A component that displays patient profile photos with automatic fallback to initials.

```tsx
import { PatientPhoto } from '@/components/ui';

// With photo
<PatientPhoto 
  src="/photos/patient-123.jpg" 
  alt="João Silva" 
  size="md" 
/>

// Without photo (shows initials)
<PatientPhoto 
  alt="Maria Santos" 
  size="lg" 
/>
```

**Props:**
- `src?: string | null` - Photo URL (optional)
- `alt: string` - Alt text (used for initials if no photo)
- `size?: 'sm' | 'md' | 'lg' | 'xl'` - Size variant (default: 'md')
- `className?: string` - Additional CSS classes

### DataTable

A flexible data table component with sorting and pagination.

```tsx
import { DataTable, Column } from '@/components/ui';

const columns: Column<Patient>[] = [
  { key: 'name', label: 'Nome', sortable: true },
  { key: 'age', label: 'Idade', sortable: true },
  { 
    key: 'actions', 
    label: 'Ações', 
    render: (_, patient) => (
      <button onClick={() => editPatient(patient.id)}>
        Editar
      </button>
    )
  }
];

<DataTable 
  data={patients} 
  columns={columns}
  itemsPerPage={10}
  onRowClick={(patient) => viewPatient(patient.id)}
/>
```

**Props:**
- `data: T[]` - Array of data items
- `columns: Column<T>[]` - Column definitions
- `itemsPerPage?: number` - Items per page (default: 10)
- `className?: string` - Additional CSS classes
- `onRowClick?: (item: T) => void` - Row click handler

### Modal

A modal dialog component with backdrop and keyboard support.

```tsx
import { Modal } from '@/components/ui';

<Modal 
  isOpen={isModalOpen}
  onClose={() => setIsModalOpen(false)}
  title="Editar Paciente"
  size="lg"
>
  <form>
    {/* Modal content */}
  </form>
</Modal>
```

**Props:**
- `isOpen: boolean` - Whether modal is open
- `onClose: () => void` - Close handler
- `title?: string` - Modal title (optional)
- `children: React.ReactNode` - Modal content
- `size?: 'sm' | 'md' | 'lg' | 'xl'` - Size variant (default: 'md')
- `className?: string` - Additional CSS classes

### CreditSalesModal

A specialized modal for selling credits to patients.

```tsx
import { CreditSalesModal } from '@/components/ui';

<CreditSalesModal
  isOpen={isCreditModalOpen}
  onClose={() => setIsCreditModalOpen(false)}
  patientName="João Silva"
  consultationPrice={150.00}
  onConfirm={(quantity) => sellCredits(patientId, quantity)}
/>
```

**Props:**
- `isOpen: boolean` - Whether modal is open
- `onClose: () => void` - Close handler
- `patientName: string` - Patient name for display
- `consultationPrice: number` - Price per consultation
- `onConfirm: (quantity: number) => void` - Confirm handler

## Features

- **Responsive Design**: All components work on desktop and mobile
- **Accessibility**: Proper ARIA labels and keyboard navigation
- **TypeScript**: Full type safety with TypeScript
- **Tailwind CSS**: Styled with Tailwind CSS utilities
- **Portuguese Interface**: All text in Brazilian Portuguese
- **Error Handling**: Graceful fallbacks for missing data

## Usage Notes

- Import components from `@/components/ui` for clean imports
- All components follow the design system color palette
- Components are designed to work together seamlessly
- Test coverage included for all components