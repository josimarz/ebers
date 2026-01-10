import { render, screen, fireEvent } from '@testing-library/react';
import { PatientPhoto, DataTable, Modal } from '@/components/ui';

describe('UI Components', () => {
  describe('PatientPhoto', () => {
    it('renders patient initials when no photo provided', () => {
      render(<PatientPhoto alt="João Silva" />);
      expect(screen.getByText('JS')).toBeInTheDocument();
      expect(screen.getByTestId('patient-photo-fallback')).toBeInTheDocument();
    });

    it('renders different sizes correctly', () => {
      render(<PatientPhoto alt="Test User" size="lg" />);
      const fallback = screen.getByTestId('patient-photo-fallback');
      expect(fallback).toHaveClass('w-16', 'h-16');
    });
  });

  describe('DataTable', () => {
    const mockData = [
      { id: 1, name: 'João', age: 30 },
      { id: 2, name: 'Maria', age: 25 },
      { id: 3, name: 'Pedro', age: 35 }
    ];

    const mockColumns = [
      { key: 'name', label: 'Nome', sortable: true },
      { key: 'age', label: 'Idade', sortable: true },
      { 
        key: 'actions', 
        label: 'Ações', 
        render: () => <button>Editar</button> 
      }
    ];

    it('renders table with data', () => {
      render(<DataTable data={mockData} columns={mockColumns} />);
      
      expect(screen.getByText('João')).toBeInTheDocument();
      expect(screen.getByText('Maria')).toBeInTheDocument();
      expect(screen.getByText('Pedro')).toBeInTheDocument();
    });

    it('handles sorting', () => {
      render(<DataTable data={mockData} columns={mockColumns} />);
      
      const nameHeader = screen.getByText('Nome');
      fireEvent.click(nameHeader);
      
      // Should show sort indicator
      expect(nameHeader.parentElement).toHaveTextContent('↑');
    });

    it('shows empty state when no data', () => {
      render(<DataTable data={[]} columns={mockColumns} />);
      expect(screen.getByText('Nenhum registro encontrado')).toBeInTheDocument();
    });
  });

  describe('Modal', () => {
    it('renders when open', () => {
      render(
        <Modal isOpen={true} onClose={() => {}} title="Test Modal">
          <p>Modal content</p>
        </Modal>
      );
      
      expect(screen.getByText('Test Modal')).toBeInTheDocument();
      expect(screen.getByText('Modal content')).toBeInTheDocument();
    });

    it('does not render when closed', () => {
      render(
        <Modal isOpen={false} onClose={() => {}} title="Test Modal">
          <p>Modal content</p>
        </Modal>
      );
      
      expect(screen.queryByText('Test Modal')).not.toBeInTheDocument();
    });

    it('calls onClose when close button clicked', () => {
      const onClose = jest.fn();
      render(
        <Modal isOpen={true} onClose={onClose} title="Test Modal">
          <p>Modal content</p>
        </Modal>
      );
      
      const closeButton = screen.getByLabelText('Fechar modal');
      fireEvent.click(closeButton);
      
      expect(onClose).toHaveBeenCalled();
    });
  });
});