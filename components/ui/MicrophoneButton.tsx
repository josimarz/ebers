'use client';

import { useDeviceDetection } from '@/lib/hooks/useDeviceDetection';

interface MicrophoneButtonProps {
  isListening: boolean;
  isSupported: boolean;
  disabled?: boolean;
  error?: string | null;
  onToggle: () => void;
  onOpenInBrowser?: () => void;
}

export function MicrophoneButton({
  isListening,
  isSupported,
  disabled = false,
  error,
  onToggle,
  onOpenInBrowser,
}: MicrophoneButtonProps) {
  const { isElectron } = useDeviceDetection();

  // No Electron, mostrar botão para abrir no navegador
  if (isElectron) {
    return (
      <div className="flex flex-col items-center gap-2">
        <button
          onClick={onOpenInBrowser}
          className="
            flex items-center gap-2
            px-4 py-2
            bg-[#197BBD] text-white
            rounded-lg
            hover:bg-[#125E8A]
            transition-colors duration-200
            text-sm font-medium
          "
          title="Abrir no navegador para usar transcrição de voz"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="w-5 h-5"
          >
            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
            <polyline points="15 3 21 3 21 9" />
            <line x1="10" y1="14" x2="21" y2="3" />
          </svg>
          Transcrição de Voz
        </button>
        <span className="text-xs text-gray-500">
          Abre no navegador
        </span>
      </div>
    );
  }

  // Na web, verificar suporte
  if (!isSupported) {
    return (
      <div className="flex flex-col items-center gap-1">
        <button
          disabled
          className="
            p-3
            rounded-full
            bg-gray-200 text-gray-400
            cursor-not-allowed
          "
          title="Transcrição de voz não suportada neste navegador"
        >
          <MicrophoneIcon />
        </button>
        <span className="text-xs text-gray-500">
          Não suportado
        </span>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-1">
      <button
        onClick={onToggle}
        disabled={disabled}
        className={`
          relative
          p-3
          rounded-full
          transition-all duration-200
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
          ${isListening 
            ? 'bg-[#16a085] text-white shadow-lg' 
            : 'bg-[#c0392b] text-white hover:bg-red-600'
          }
        `}
        title={isListening ? 'Parar transcrição' : 'Iniciar transcrição de voz'}
        aria-label={isListening ? 'Parar transcrição de voz' : 'Iniciar transcrição de voz'}
        aria-pressed={isListening}
      >
        <MicrophoneIcon />
        
        {/* Animação pulsante quando ativo */}
        {isListening && (
          <>
            <span className="absolute inset-0 rounded-full bg-[#16a085] animate-ping opacity-30" />
            <span className="absolute -inset-1 rounded-full border-2 border-[#16a085] animate-pulse" />
          </>
        )}
      </button>
      
      <span className={`text-xs ${isListening ? 'text-[#16a085] font-medium' : 'text-gray-500'}`}>
        {isListening ? 'Gravando...' : 'Microfone'}
      </span>
      
      {error && (
        <span className="text-xs text-red-500 max-w-[120px] text-center">
          {error}
        </span>
      )}
    </div>
  );
}

function MicrophoneIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      className="w-6 h-6"
    >
      <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z" />
      <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
    </svg>
  );
}
