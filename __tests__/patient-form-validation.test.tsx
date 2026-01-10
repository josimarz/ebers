import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PatientRegistrationForm from '@/components/forms/PatientRegistrationForm';
import { Gender, Religion } from '@/lib/validations';
import { ToastProvider } from '@/lib/toast-context';

// Mock next/navigation
const mockPush = jest.fn();
const mockBack = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    back: mockBack,
  }),
}));

// Mock fetch to prevent network calls during tests
global.fetch = jest.fn();

// Mock window.alert
global.alert = jest.fn();

// Helper function to render with ToastProvider
const renderWithToast = (component: React.ReactElement) => {
  const result = render(
    <ToastProvider>
      {component}
    </ToastProvider>
  );
  
  // Return enhanced result with rerenderWithToast
  return {
    ...result,
    rerenderWithToast: (newComponent: React.ReactElement) => {
      return result.rerender(
        <ToastProvider>
          {newComponent}
        </ToastProvider>
      );
    }
  };
};

describe('Patient Form Validation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Required Field Validation', () => {
    it('shows validation errors for empty required fields', async () => {
      const user = userEvent.setup();
      renderWithToast(<PatientRegistrationForm />);

      // Try to submit form without filling required fields
      const submitButton = screen.getByRole('button', { name: /salvar paciente/i });
      
      // Submit the form directly (button click doesn't work in test environment)
      const form = submitButton.closest('form');
      if (form) {
        fireEvent.submit(form);
      }

      // Check for required field validation errors
      await waitFor(() => {
        expect(screen.getByText('Nome é obrigatório')).toBeInTheDocument();
        expect(screen.getByText('Telefone é obrigatório')).toBeInTheDocument();
      });
    });

    it('validates name field is required', async () => {
      const user = userEvent.setup();
      renderWithToast(<PatientRegistrationForm />);

      const nameInput = screen.getByLabelText(/nome completo/i);
      const submitButton = screen.getByRole('button', { name: /salvar paciente/i });

      // Leave name empty and try to submit
      const form = submitButton.closest('form');
      if (form) {
        fireEvent.submit(form);
      }

      await waitFor(() => {
        expect(screen.getByText('Nome é obrigatório')).toBeInTheDocument();
      });

      // Fill name and check error disappears
      await user.type(nameInput, 'João Silva');
      if (form) {
        fireEvent.submit(form);
      }

      await waitFor(() => {
        // Name error should be gone, but other required fields may still show errors
        const nameField = nameInput.closest('div');
        expect(nameField?.querySelector('.text-red-600')).not.toBeInTheDocument();
      });
    });

    it('validates birth date field is required', async () => {
      const user = userEvent.setup();
      renderWithToast(<PatientRegistrationForm />);

      const birthDateInput = screen.getByLabelText(/data de nascimento/i);
      const submitButton = screen.getByRole('button', { name: /salvar paciente/i });

      // Try to submit without birth date
      const form = submitButton.closest('form');
      if (form) {
        fireEvent.submit(form);
      }

      await waitFor(() => {
        // Birth date shows "Data inválida" error message
        expect(screen.getByText('Data inválida')).toBeInTheDocument();
      });

      // Fill birth date
      await user.type(birthDateInput, '1990-01-01');
      if (form) {
        fireEvent.submit(form);
      }

      await waitFor(() => {
        const birthDateField = birthDateInput.closest('div');
        expect(birthDateField?.querySelector('.text-red-600')).not.toBeInTheDocument();
      });
    });

    it('validates gender field is required', async () => {
      const user = userEvent.setup();
      renderWithToast(<PatientRegistrationForm />);

      const genderSelect = screen.getByLabelText(/gênero/i);
      const submitButton = screen.getByRole('button', { name: /salvar paciente/i });

      // Try to submit without selecting gender
      const form = submitButton.closest('form');
      if (form) {
        fireEvent.submit(form);
      }

      await waitFor(() => {
        // Gender shows specific validation error
        expect(screen.getByText('Gênero é obrigatório')).toBeInTheDocument();
      });

      // Select gender
      await user.selectOptions(genderSelect, Gender.MALE);
      if (form) {
        fireEvent.submit(form);
      }

      await waitFor(() => {
        const genderField = genderSelect.closest('div');
        expect(genderField?.querySelector('.text-red-600')).not.toBeInTheDocument();
      });
    });

    it('validates religion field is required', async () => {
      const user = userEvent.setup();
      renderWithToast(<PatientRegistrationForm />);

      const religionSelect = screen.getByLabelText(/religião/i);
      const submitButton = screen.getByRole('button', { name: /salvar paciente/i });

      // Try to submit without selecting religion
      const form = submitButton.closest('form');
      if (form) {
        fireEvent.submit(form);
      }

      await waitFor(() => {
        // Religion shows specific validation error
        expect(screen.getByText('Religião é obrigatória')).toBeInTheDocument();
      });

      // Select religion
      await user.selectOptions(religionSelect, Religion.CATHOLIC);
      if (form) {
        fireEvent.submit(form);
      }

      await waitFor(() => {
        const religionField = religionSelect.closest('div');
        expect(religionField?.querySelector('.text-red-600')).not.toBeInTheDocument();
      });
    });

    it('validates phone1 field is required', async () => {
      const user = userEvent.setup();
      renderWithToast(<PatientRegistrationForm />);

      const phoneInput = screen.getByLabelText(/telefone principal/i);
      const submitButton = screen.getByRole('button', { name: /salvar paciente/i });

      // Try to submit without phone
      const form = submitButton.closest('form');
      if (form) {
        fireEvent.submit(form);
      }

      await waitFor(() => {
        expect(screen.getByText('Telefone é obrigatório')).toBeInTheDocument();
      });

      // Fill phone
      await user.type(phoneInput, '(11) 99999-9999');
      if (form) {
        fireEvent.submit(form);
      }

      await waitFor(() => {
        const phoneField = phoneInput.closest('div');
        expect(phoneField?.querySelector('.text-red-600')).not.toBeInTheDocument();
      });
    });

    it('validates boolean fields are required (checkboxes)', async () => {
      const user = userEvent.setup();
      renderWithToast(<PatientRegistrationForm />);

      // Boolean fields should have default values and not show validation errors
      const therapyCheckbox = screen.getByLabelText(/já fez terapia antes/i);
      const medicationCheckbox = screen.getByLabelText(/toma algum medicamento/i);
      const hospitalizationCheckbox = screen.getByLabelText(/já foi hospitalizado/i);

      // These should be unchecked by default but not cause validation errors
      expect(therapyCheckbox).not.toBeChecked();
      expect(medicationCheckbox).not.toBeChecked();
      expect(hospitalizationCheckbox).not.toBeChecked();

      // Submit form and verify no validation errors for boolean fields
      const submitButton = screen.getByRole('button', { name: /salvar paciente/i });
      const form = submitButton.closest('form');
      if (form) {
        fireEvent.submit(form);
      }

      // Boolean fields should not show validation errors
      const therapyField = therapyCheckbox.closest('div');
      const medicationField = medicationCheckbox.closest('div');
      const hospitalizationField = hospitalizationCheckbox.closest('div');

      expect(therapyField?.querySelector('.text-red-600')).not.toBeInTheDocument();
      expect(medicationField?.querySelector('.text-red-600')).not.toBeInTheDocument();
      expect(hospitalizationField?.querySelector('.text-red-600')).not.toBeInTheDocument();
    });
  });

  describe('Conditional Guardian Email Validation', () => {
    it('does not require guardian email when no guardian is specified', async () => {
      const user = userEvent.setup();
      
      // Use custom onSubmit to prevent fetch calls
      const mockOnSubmit = jest.fn();
      renderWithToast(<PatientRegistrationForm onSubmit={mockOnSubmit} />);

      const guardianInput = screen.getByLabelText(/nome do responsável/i);
      const guardianEmailInput = screen.getByLabelText(/email do responsável/i);
      const submitButton = screen.getByRole('button', { name: /salvar paciente/i });

      // Leave both guardian fields empty
      expect(guardianInput).toHaveValue('');
      expect(guardianEmailInput).toHaveValue('');

      // Fill other required fields to isolate guardian validation
      await user.type(screen.getByLabelText(/nome completo/i), 'João Silva');
      await user.type(screen.getByLabelText(/data de nascimento/i), '1990-01-01');
      await user.selectOptions(screen.getByLabelText(/gênero/i), Gender.MALE);
      await user.selectOptions(screen.getByLabelText(/religião/i), Religion.CATHOLIC);
      await user.type(screen.getByLabelText(/telefone principal/i), '(11) 99999-9999');

      const form = submitButton.closest('form');
      if (form) {
        fireEvent.submit(form);
      }

      // Should not show guardian email validation error
      await waitFor(() => {
        const guardianEmailField = guardianEmailInput.closest('div');
        expect(guardianEmailField?.querySelector('.text-red-600')).not.toBeInTheDocument();
      });
    });

    it('requires guardian email when guardian is specified', async () => {
      const user = userEvent.setup();
      renderWithToast(<PatientRegistrationForm />);

      const guardianInput = screen.getByLabelText(/nome do responsável/i);
      const guardianEmailInput = screen.getByLabelText(/email do responsável/i);
      const submitButton = screen.getByRole('button', { name: /salvar paciente/i });

      // Fill guardian name but leave email empty
      await user.type(guardianInput, 'Maria Silva');

      // Fill other required fields
      await user.type(screen.getByLabelText(/nome completo/i), 'João Silva');
      await user.type(screen.getByLabelText(/data de nascimento/i), '1990-01-01');
      await user.selectOptions(screen.getByLabelText(/gênero/i), Gender.MALE);
      await user.selectOptions(screen.getByLabelText(/religião/i), Religion.CATHOLIC);
      await user.type(screen.getByLabelText(/telefone principal/i), '(11) 99999-9999');

      const form = submitButton.closest('form');
      if (form) {
        fireEvent.submit(form);
      }

      // Should show guardian email validation error
      await waitFor(() => {
        expect(screen.getByText(/Email do responsável é obrigatório/)).toBeInTheDocument();
      });
    });

    it('accepts valid guardian email when guardian is specified', async () => {
      const user = userEvent.setup();
      
      // Use custom onSubmit to prevent fetch calls
      const mockOnSubmit = jest.fn();
      renderWithToast(<PatientRegistrationForm onSubmit={mockOnSubmit} />);

      const guardianInput = screen.getByLabelText(/nome do responsável/i);
      const guardianEmailInput = screen.getByLabelText(/email do responsável/i);
      const submitButton = screen.getByRole('button', { name: /salvar paciente/i });

      // Fill guardian name and valid email
      await user.type(guardianInput, 'Maria Silva');
      await user.type(guardianEmailInput, 'maria@example.com');

      // Fill other required fields
      await user.type(screen.getByLabelText(/nome completo/i), 'João Silva');
      await user.type(screen.getByLabelText(/data de nascimento/i), '1990-01-01');
      await user.selectOptions(screen.getByLabelText(/gênero/i), Gender.MALE);
      await user.selectOptions(screen.getByLabelText(/religião/i), Religion.CATHOLIC);
      await user.type(screen.getByLabelText(/telefone principal/i), '(11) 99999-9999');

      const form = submitButton.closest('form');
      if (form) {
        fireEvent.submit(form);
      }

      // Should not show guardian email validation error
      await waitFor(() => {
        const guardianEmailField = guardianEmailInput.closest('div');
        expect(guardianEmailField?.querySelector('.text-red-600')).not.toBeInTheDocument();
      });
    });

    it('shows asterisk indicator when guardian is filled', async () => {
      const user = userEvent.setup();
      renderWithToast(<PatientRegistrationForm />);

      const guardianInput = screen.getByLabelText(/nome do responsável/i);
      
      // Initially, email field should not have asterisk
      expect(screen.getByText(/email do responsável/i)).toBeInTheDocument();
      expect(screen.queryByText(/email do responsável \*/i)).not.toBeInTheDocument();

      // Fill guardian name
      await user.type(guardianInput, 'Maria Silva');

      // Now email field should show asterisk indicating it's required
      await waitFor(() => {
        expect(screen.getByText(/email do responsável \*/i)).toBeInTheDocument();
      });
    });
  });

  describe('Device-Specific Field Visibility', () => {
    it('hides consultation fields on iPad', () => {
      renderWithToast(<PatientRegistrationForm isIpad={true} />);

      // These fields should not be visible on iPad
      expect(screen.queryByLabelText(/valor da consulta/i)).not.toBeInTheDocument();
      expect(screen.queryByLabelText(/periodicidade/i)).not.toBeInTheDocument();
      expect(screen.queryByLabelText(/dia da semana/i)).not.toBeInTheDocument();

      // Should not show "Configurações de Consulta" section
      expect(screen.queryByText(/configurações de consulta/i)).not.toBeInTheDocument();
    });

    it('shows consultation fields on desktop', () => {
      renderWithToast(<PatientRegistrationForm isIpad={false} />);

      // These fields should be visible on desktop
      expect(screen.getByLabelText(/valor da consulta/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/periodicidade/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/dia da semana/i)).toBeInTheDocument();

      // Should show "Configurações de Consulta" section
      expect(screen.getByText(/configurações de consulta/i)).toBeInTheDocument();
    });

    it('shows cancel button on desktop but not on iPad', () => {
      // Test desktop version
      const { rerenderWithToast } = renderWithToast(<PatientRegistrationForm isIpad={false} />);
      expect(screen.getByRole('button', { name: /cancelar/i })).toBeInTheDocument();

      // Test iPad version
      rerenderWithToast(<PatientRegistrationForm isIpad={true} />);
      expect(screen.queryByRole('button', { name: /cancelar/i })).not.toBeInTheDocument();
    });

    it('shows different title text for iPad vs desktop', () => {
      // Test desktop version
      const { rerenderWithToast } = renderWithToast(<PatientRegistrationForm isIpad={false} />);
      expect(screen.getByText('Cadastro de Novo Paciente')).toBeInTheDocument();

      // Test iPad version
      rerenderWithToast(<PatientRegistrationForm isIpad={true} />);
      expect(screen.getByText('Cadastro de Paciente')).toBeInTheDocument();
      expect(screen.getByText('Preencha os dados abaixo para se cadastrar no sistema.')).toBeInTheDocument();
    });

    it('applies different styling classes for iPad', () => {
      const { container } = renderWithToast(<PatientRegistrationForm isIpad={true} />);
      
      // Should have iPad-specific styling
      const formContainer = container.querySelector('.max-w-4xl');
      expect(formContainer).toBeInTheDocument();
    });

    it('shows all basic fields on both iPad and desktop', () => {
      // Test iPad version
      const { rerenderWithToast } = renderWithToast(<PatientRegistrationForm isIpad={true} />);
      
      // Basic fields should be visible on iPad
      expect(screen.getByLabelText(/nome completo/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/data de nascimento/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/gênero/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/religião/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/telefone principal/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/já fez terapia antes/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/toma algum medicamento/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/já foi hospitalizado/i)).toBeInTheDocument();

      // Test desktop version
      rerenderWithToast(<PatientRegistrationForm isIpad={false} />);
      
      // Same basic fields should be visible on desktop
      expect(screen.getByLabelText(/nome completo/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/data de nascimento/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/gênero/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/religião/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/telefone principal/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/já fez terapia antes/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/toma algum medicamento/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/já foi hospitalizado/i)).toBeInTheDocument();
    });
  });
});