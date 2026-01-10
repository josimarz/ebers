import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ToastProvider } from '@/lib/toast-context';
import { useRouter } from 'next/navigation';
import PatientsPage from '@/app/patients/page';

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}));

// Mock fetch
global.fetch = jest.fn();

// Helper function to render with ToastProvider
const renderWithToast = (component) => {
  return render(
    <ToastProvider>
      {component}
    </ToastProvider>
  );
};

const mockRouter = {
  push: jest.fn(),
};

const mockPatientResponse = {
  patients: [
    {
      id: '1',
      name: 'João Silva',
      profilePhoto: null,
      age: 30,
      phone1: '(11) 99999-9999',
      consultationFrequency: 'WEEKLY',
      consultationDay: 'MONDAY',
      credits: 5,
      hasActiveConsultation: false,
    },
  ],
  totalCount: 1,
  totalPages: 1,
  currentPage: 1,
  hasNextPage: false,
  hasPreviousPage: false,
};

describe('Patient Search Focus', () => {
  beforeEach(() => {
    (useRouter as jest.Mock).mockReturnValue(mockRouter);
    (fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => mockPatientResponse,
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should maintain focus on search input while typing', async () => {
    renderWithToast(<PatientsPage />);

    // Wait for initial load
    await waitFor(() => {
      expect(screen.getByText('João Silva')).toBeInTheDocument();
    });

    // Get the search input
    const searchInput = screen.getByPlaceholderText('Digite o nome do paciente...');
    
    // Focus the input
    searchInput.focus();
    expect(document.activeElement).toBe(searchInput);

    // Type multiple characters to simulate real typing
    fireEvent.change(searchInput, { target: { value: 'J' } });
    expect(document.activeElement).toBe(searchInput);
    
    fireEvent.change(searchInput, { target: { value: 'Jo' } });
    expect(document.activeElement).toBe(searchInput);
    
    fireEvent.change(searchInput, { target: { value: 'João' } });
    expect(document.activeElement).toBe(searchInput);

    // Wait for debounce and API call
    await waitFor(() => {
      const calls = (fetch as jest.Mock).mock.calls;
      const searchCall = calls.find(call => call[0].includes('search='));
      expect(searchCall).toBeTruthy();
    }, { timeout: 500 });

    // Focus should still be maintained after API call completes
    expect(document.activeElement).toBe(searchInput);
  });

  it('should maintain stable input ID across re-renders', async () => {
    const { rerender } = renderWithToast(<PatientsPage />);

    // Wait for initial load
    await waitFor(() => {
      expect(screen.getByText('João Silva')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText('Digite o nome do paciente...');
    const initialId = searchInput.id;

    // Force re-render by changing search term
    fireEvent.change(searchInput, { target: { value: 'test' } });
    
    // Wait for state update
    await waitFor(() => {
      expect(searchInput.value).toBe('test');
    });

    // ID should remain the same
    expect(searchInput.id).toBe(initialId);
  });

  it('should debounce search requests', async () => {
    renderWithToast(<PatientsPage />);

    // Wait for initial load
    await waitFor(() => {
      expect(screen.getByText('João Silva')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText('Digite o nome do paciente...');
    
    // Type multiple characters quickly
    fireEvent.change(searchInput, { target: { value: 'J' } });
    fireEvent.change(searchInput, { target: { value: 'Jo' } });
    fireEvent.change(searchInput, { target: { value: 'João' } });

    // Wait for debounce period
    await waitFor(() => {
      // Should only make one additional API call after the debounce period
      const searchCalls = (fetch as jest.Mock).mock.calls.filter(call => 
        call[0].includes('search=')
      );
      expect(searchCalls).toHaveLength(1);
    }, { timeout: 500 });
  });

  it('should reset to first page when searching', async () => {
    renderWithToast(<PatientsPage />);

    // Wait for initial load
    await waitFor(() => {
      expect(screen.getByText('João Silva')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText('Digite o nome do paciente...');
    
    // Type in search
    fireEvent.change(searchInput, { target: { value: 'João' } });

    // Wait for API call
    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('page=1')
      );
    }, { timeout: 500 });
  });
});