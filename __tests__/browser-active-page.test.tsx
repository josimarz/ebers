import { render, screen, fireEvent } from '@testing-library/react';

// Mocks
const mockPush = jest.fn();
const mockParams = { id: 'consultation-123' };

jest.mock('next/navigation', () => ({
  useParams: () => mockParams,
  useRouter: () => ({ push: mockPush }),
}));

import BrowserActivePage from '../app/consultations/[id]/browser-active/page';

describe('BrowserActivePage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the waiting screen with correct message', () => {
    render(<BrowserActivePage />);

    expect(
      screen.getByText('Consulta em andamento no navegador')
    ).toBeInTheDocument();

    expect(
      screen.getByText(/A consulta foi aberta no navegador/)
    ).toBeInTheDocument();
  });

  it('renders the return button', () => {
    render(<BrowserActivePage />);

    const button = screen.getByRole('button', {
      name: /voltar para a consulta/i,
    });
    expect(button).toBeInTheDocument();
  });

  it('navigates back to consultation page when return button is clicked', () => {
    render(<BrowserActivePage />);

    const button = screen.getByRole('button', {
      name: /voltar para a consulta/i,
    });
    fireEvent.click(button);

    expect(mockPush).toHaveBeenCalledWith(
      '/consultations/consultation-123'
    );
  });
});
