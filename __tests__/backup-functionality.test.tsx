import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ToastProvider } from '@/lib/toast-context';
import BackupPage from '@/app/backup/page';

// Mock do electronAPI
const mockElectronAPI = {
  selectFolder: jest.fn(),
  createBackup: jest.fn(),
};

// Mock do window.electronAPI
Object.defineProperty(window, 'electronAPI', {
  value: mockElectronAPI,
  writable: true,
});

// Wrapper com ToastProvider
const BackupPageWithProvider = () => (
  <ToastProvider>
    <BackupPage />
  </ToastProvider>
);

describe('Backup Functionality', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders backup page with correct elements', () => {
    render(<BackupPageWithProvider />);
    
    expect(screen.getByText('Backup do Sistema')).toBeInTheDocument();
    expect(screen.getByText('Pasta de Destino')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Selecione uma pasta para salvar o backup...')).toBeInTheDocument();
    expect(screen.getByText('Selecionar')).toBeInTheDocument();
    expect(screen.getByText('Criar Backup')).toBeInTheDocument();
  });

  test('backup button is disabled when no folder is selected', () => {
    render(<BackupPageWithProvider />);
    
    const backupButton = screen.getByRole('button', { name: /criar backup/i });
    expect(backupButton).toBeDisabled();
  });

  test('calls selectFolder when select button is clicked', async () => {
    mockElectronAPI.selectFolder.mockResolvedValue({
      canceled: false,
      filePath: '/test/path',
    });

    render(<BackupPageWithProvider />);
    
    const selectButton = screen.getByText('Selecionar');
    fireEvent.click(selectButton);

    await waitFor(() => {
      expect(mockElectronAPI.selectFolder).toHaveBeenCalledTimes(1);
    });
  });

  test('updates selected path when folder is selected', async () => {
    const testPath = '/test/backup/path';
    mockElectronAPI.selectFolder.mockResolvedValue({
      canceled: false,
      filePath: testPath,
    });

    render(<BackupPageWithProvider />);
    
    const selectButton = screen.getByText('Selecionar');
    fireEvent.click(selectButton);

    await waitFor(() => {
      const pathInput = screen.getByDisplayValue(testPath);
      expect(pathInput).toBeInTheDocument();
    });
  });

  test('enables backup button when folder is selected', async () => {
    mockElectronAPI.selectFolder.mockResolvedValue({
      canceled: false,
      filePath: '/test/path',
    });

    render(<BackupPageWithProvider />);
    
    const selectButton = screen.getByRole('button', { name: /selecionar/i });
    fireEvent.click(selectButton);

    await waitFor(() => {
      const backupButton = screen.getByRole('button', { name: /criar backup/i });
      expect(backupButton).not.toBeDisabled();
    });
  });

  test('shows status message when folder is selected', async () => {
    const testPath = '/test/backup/path';
    mockElectronAPI.selectFolder.mockResolvedValue({
      canceled: false,
      filePath: testPath,
    });

    render(<BackupPageWithProvider />);
    
    const selectButton = screen.getByRole('button', { name: /selecionar/i });
    fireEvent.click(selectButton);

    await waitFor(() => {
      expect(screen.getByText(/pasta selecionada:/i)).toBeInTheDocument();
      expect(screen.getByText(testPath)).toBeInTheDocument();
    });
  });

  test('calls createBackup when backup button is clicked', async () => {
    const testPath = '/test/backup/path';
    mockElectronAPI.selectFolder.mockResolvedValue({
      canceled: false,
      filePath: testPath,
    });
    mockElectronAPI.createBackup.mockResolvedValue({
      success: true,
      fileName: 'ebers-20260111T143924.db',
    });

    render(<BackupPageWithProvider />);
    
    // Selecionar pasta primeiro
    const selectButton = screen.getByRole('button', { name: /selecionar/i });
    fireEvent.click(selectButton);

    await waitFor(() => {
      const backupButton = screen.getByRole('button', { name: /criar backup/i });
      expect(backupButton).not.toBeDisabled();
    });

    // Clicar no botão de backup
    const backupButton = screen.getByRole('button', { name: /criar backup/i });
    fireEvent.click(backupButton);

    await waitFor(() => {
      expect(mockElectronAPI.createBackup).toHaveBeenCalledWith(testPath);
    });
  });

  test('shows loading state during backup creation', async () => {
    const testPath = '/test/backup/path';
    mockElectronAPI.selectFolder.mockResolvedValue({
      canceled: false,
      filePath: testPath,
    });
    
    // Mock que demora para resolver
    mockElectronAPI.createBackup.mockImplementation(() => 
      new Promise(resolve => setTimeout(() => resolve({
        success: true,
        fileName: 'ebers-20260111T143924.db',
      }), 100))
    );

    render(<BackupPageWithProvider />);
    
    // Selecionar pasta
    const selectButton = screen.getByRole('button', { name: /selecionar/i });
    fireEvent.click(selectButton);

    await waitFor(() => {
      const backupButton = screen.getByRole('button', { name: /criar backup/i });
      expect(backupButton).not.toBeDisabled();
    });

    // Clicar no backup
    const backupButton = screen.getByRole('button', { name: /criar backup/i });
    fireEvent.click(backupButton);

    // Verificar estado de loading
    expect(screen.getByRole('button', { name: /criando backup/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /criando backup/i })).toBeDisabled();
  });

  test('handles backup creation error', async () => {
    const testPath = '/test/backup/path';
    mockElectronAPI.selectFolder.mockResolvedValue({
      canceled: false,
      filePath: testPath,
    });
    mockElectronAPI.createBackup.mockResolvedValue({
      success: false,
      error: 'Erro ao acessar arquivo',
    });

    render(<BackupPageWithProvider />);
    
    // Selecionar pasta
    const selectButton = screen.getByRole('button', { name: /selecionar/i });
    fireEvent.click(selectButton);

    await waitFor(() => {
      const backupButton = screen.getByRole('button', { name: /criar backup/i });
      expect(backupButton).not.toBeDisabled();
    });

    // Clicar no backup
    const backupButton = screen.getByRole('button', { name: /criar backup/i });
    fireEvent.click(backupButton);

    await waitFor(() => {
      expect(mockElectronAPI.createBackup).toHaveBeenCalledWith(testPath);
    });
  });

  test('handles folder selection cancellation', async () => {
    mockElectronAPI.selectFolder.mockResolvedValue({
      canceled: true,
    });

    render(<BackupPageWithProvider />);
    
    const selectButton = screen.getByRole('button', { name: /selecionar/i });
    fireEvent.click(selectButton);

    await waitFor(() => {
      expect(mockElectronAPI.selectFolder).toHaveBeenCalledTimes(1);
    });

    // Verificar que o campo continua vazio
    const pathInput = screen.getByPlaceholderText('Selecione uma pasta para salvar o backup...');
    expect(pathInput).toHaveValue('');
    
    // Verificar que o botão de backup continua desabilitado
    const backupButton = screen.getByRole('button', { name: /criar backup/i });
    expect(backupButton).toBeDisabled();
  });

  test('shows correct backup file name format information', () => {
    render(<BackupPageWithProvider />);
    
    expect(screen.getByText(/O backup será salvo com o nome no formato: ebers-AAAA-MM-DDTHHMMSS\.db/)).toBeInTheDocument();
  });

  test('shows important information about backup process', () => {
    render(<BackupPageWithProvider />);
    
    expect(screen.getByText('Informações importantes:')).toBeInTheDocument();
    expect(screen.getByText(/Recomendamos fazer backups regulares/)).toBeInTheDocument();
    expect(screen.getByText(/O processo pode levar alguns segundos/)).toBeInTheDocument();
  });
});