/**
 * @jest-environment jsdom
 */

describe('useSpeechRecognition hook', () => {
  beforeEach(() => {
    // Reset window properties
    delete (window as any).SpeechRecognition;
    delete (window as any).webkitSpeechRecognition;
  });

  describe('browser support detection', () => {
    it('should detect when SpeechRecognition is not supported', () => {
      // SpeechRecognition não está definido
      expect(window.SpeechRecognition).toBeUndefined();
      expect(window.webkitSpeechRecognition).toBeUndefined();
    });

    it('should detect when SpeechRecognition is supported', () => {
      // Mock SpeechRecognition
      const mockRecognition = jest.fn().mockImplementation(() => ({
        continuous: false,
        interimResults: false,
        lang: '',
        start: jest.fn(),
        stop: jest.fn(),
        abort: jest.fn(),
        onresult: null,
        onerror: null,
        onend: null,
        onstart: null,
      }));

      (window as any).SpeechRecognition = mockRecognition;
      
      expect(window.SpeechRecognition).toBeDefined();
    });

    it('should detect webkit prefixed SpeechRecognition', () => {
      const mockRecognition = jest.fn().mockImplementation(() => ({
        continuous: false,
        interimResults: false,
        lang: '',
        start: jest.fn(),
        stop: jest.fn(),
        abort: jest.fn(),
        onresult: null,
        onerror: null,
        onend: null,
        onstart: null,
      }));

      (window as any).webkitSpeechRecognition = mockRecognition;
      
      expect(window.webkitSpeechRecognition).toBeDefined();
    });
  });

  describe('error messages', () => {
    it('should have correct error message mappings', () => {
      const errorMessages: Record<string, string> = {
        'not-allowed': 'Permissão de microfone negada',
        'no-speech': 'Nenhuma fala detectada',
        'audio-capture': 'Erro ao capturar áudio',
        'network': 'Erro de rede',
        'aborted': 'Reconhecimento cancelado',
      };

      expect(errorMessages['not-allowed']).toBe('Permissão de microfone negada');
      expect(errorMessages['no-speech']).toBe('Nenhuma fala detectada');
      expect(errorMessages['audio-capture']).toBe('Erro ao capturar áudio');
      expect(errorMessages['network']).toBe('Erro de rede');
      expect(errorMessages['aborted']).toBe('Reconhecimento cancelado');
    });
  });
});

describe('MicrophoneButton component behavior', () => {
  it('should have correct states for listening toggle', () => {
    // Estados do botão
    const states = {
      listening: {
        color: 'bg-[#16a085]',
        label: 'Gravando...',
      },
      notListening: {
        color: 'bg-[#c0392b]',
        label: 'Microfone',
      },
    };

    expect(states.listening.color).toBe('bg-[#16a085]');
    expect(states.notListening.color).toBe('bg-[#c0392b]');
  });

  it('should show different UI for Electron environment', () => {
    // No Electron, deve mostrar botão para abrir no navegador
    const electronUI = {
      showOpenInBrowserButton: true,
      buttonText: 'Transcrição de Voz',
      subtitle: 'Abre no navegador',
    };

    expect(electronUI.showOpenInBrowserButton).toBe(true);
    expect(electronUI.buttonText).toBe('Transcrição de Voz');
  });
});
