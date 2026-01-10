import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ToastProvider, useToast } from '@/lib/toast-context';
import { ToastContainer } from '@/components/ui/Toast';

// Test component that uses toast
function TestComponent() {
  const { showToast } = useToast();

  return (
    <div>
      <button 
        onClick={() => showToast('Teste de sucesso!', 'success')}
        data-testid="success-button"
      >
        Success Toast
      </button>
      <button 
        onClick={() => showToast('Teste de erro!', 'error')}
        data-testid="error-button"
      >
        Error Toast
      </button>
      <button 
        onClick={() => showToast('Teste de aviso!', 'warning')}
        data-testid="warning-button"
      >
        Warning Toast
      </button>
    </div>
  );
}

function TestApp() {
  return (
    <ToastProvider>
      <TestComponent />
      <ToastContainer />
    </ToastProvider>
  );
}

describe('Toast System', () => {
  it('should display success toast when triggered', async () => {
    render(<TestApp />);
    
    const successButton = screen.getByTestId('success-button');
    fireEvent.click(successButton);
    
    await waitFor(() => {
      expect(screen.getByText('Teste de sucesso!')).toBeInTheDocument();
    });
  });

  it('should display error toast when triggered', async () => {
    render(<TestApp />);
    
    const errorButton = screen.getByTestId('error-button');
    fireEvent.click(errorButton);
    
    await waitFor(() => {
      expect(screen.getByText('Teste de erro!')).toBeInTheDocument();
    });
  });

  it('should display warning toast when triggered', async () => {
    render(<TestApp />);
    
    const warningButton = screen.getByTestId('warning-button');
    fireEvent.click(warningButton);
    
    await waitFor(() => {
      expect(screen.getByText('Teste de aviso!')).toBeInTheDocument();
    });
  });

  it('should allow closing toast manually', async () => {
    render(<TestApp />);
    
    const successButton = screen.getByTestId('success-button');
    fireEvent.click(successButton);
    
    await waitFor(() => {
      expect(screen.getByText('Teste de sucesso!')).toBeInTheDocument();
    });

    const closeButton = screen.getByLabelText('Fechar notificação');
    fireEvent.click(closeButton);
    
    await waitFor(() => {
      expect(screen.queryByText('Teste de sucesso!')).not.toBeInTheDocument();
    });
  });
});