import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QRCodeModal } from '../components/QRCodeModal';

// Mock da biblioteca qrcode
jest.mock('qrcode', () => ({
  toDataURL: jest.fn().mockResolvedValue('data:image/png;base64,mock-qr-code')
}));

// Mock do navigator.clipboard
Object.assign(navigator, {
  clipboard: {
    writeText: jest.fn().mockResolvedValue(undefined)
  }
});

describe('QRCodeModal', () => {
  const mockProps = {
    isOpen: true,
    onClose: jest.fn(),
    addresses: ['192.168.1.100', '10.0.0.1'],
    port: 3000
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders modal when open', () => {
    render(<QRCodeModal {...mockProps} />);
    
    expect(screen.getByText('Acesso via QR Code')).toBeInTheDocument();
    expect(screen.getByText('Escaneie o QR Code com o iPad para acessar o sistema')).toBeInTheDocument();
  });

  it('does not render when closed', () => {
    render(<QRCodeModal {...mockProps} isOpen={false} />);
    
    expect(screen.queryByText('Acesso via QR Code')).not.toBeInTheDocument();
  });

  it('displays all network addresses', () => {
    render(<QRCodeModal {...mockProps} />);
    
    expect(screen.getByText('http://192.168.1.100:3000')).toBeInTheDocument();
    expect(screen.getByText('http://10.0.0.1:3000')).toBeInTheDocument();
  });

  it('shows address selector when multiple addresses available', () => {
    render(<QRCodeModal {...mockProps} />);
    
    expect(screen.getByText('Selecione o endereço de rede:')).toBeInTheDocument();
    expect(screen.getByRole('combobox')).toBeInTheDocument();
  });

  it('does not show address selector when only one address', () => {
    render(<QRCodeModal {...mockProps} addresses={['192.168.1.100']} />);
    
    expect(screen.queryByText('Selecione o endereço de rede:')).not.toBeInTheDocument();
  });

  it('generates QR code for selected address', async () => {
    const QRCode = require('qrcode');
    render(<QRCodeModal {...mockProps} />);
    
    await waitFor(() => {
      expect(QRCode.toDataURL).toHaveBeenCalledWith('http://192.168.1.100:3000', {
        width: 256,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });
    });
  });

  it('copies URL to clipboard when copy button clicked', async () => {
    render(<QRCodeModal {...mockProps} />);
    
    const copyButtons = screen.getAllByTitle('Copiar URL');
    fireEvent.click(copyButtons[0]);
    
    await waitFor(() => {
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith('http://192.168.1.100:3000');
    });
  });

  it('shows check icon after successful copy', async () => {
    render(<QRCodeModal {...mockProps} />);
    
    const copyButtons = screen.getAllByTitle('Copiar URL');
    fireEvent.click(copyButtons[0]);
    
    await waitFor(() => {
      // Verifica se o ícone de check aparece (indicando sucesso na cópia)
      const checkIcon = document.querySelector('.lucide-check');
      expect(checkIcon).toBeInTheDocument();
    });
  });

  it('calls onClose when close button clicked', () => {
    render(<QRCodeModal {...mockProps} />);
    
    const closeButton = screen.getByLabelText('Fechar modal');
    fireEvent.click(closeButton);
    
    expect(mockProps.onClose).toHaveBeenCalled();
  });

  it('displays usage instructions', () => {
    render(<QRCodeModal {...mockProps} />);
    
    expect(screen.getByText('Como usar:')).toBeInTheDocument();
    expect(screen.getByText(/Certifique-se de que o iPad está conectado à mesma rede Wi-Fi/)).toBeInTheDocument();
    expect(screen.getByText(/Abra a câmera do iPad ou um leitor de QR Code/)).toBeInTheDocument();
  });

  it('updates QR code when address selection changes', async () => {
    const QRCode = require('qrcode');
    render(<QRCodeModal {...mockProps} />);
    
    const selector = screen.getByRole('combobox');
    fireEvent.change(selector, { target: { value: '10.0.0.1' } });
    
    await waitFor(() => {
      expect(QRCode.toDataURL).toHaveBeenCalledWith('http://10.0.0.1:3000', expect.any(Object));
    });
  });
});