'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { PatientPhoto, RichTextEditor, MicrophoneButton } from '@/components/ui';
import { useDeviceDetection } from '@/lib/hooks/useDeviceDetection';
import { useSpeechRecognition } from '@/lib/hooks/useSpeechRecognition';

type Patient = {
  id: string;
  name: string;
  profilePhoto: string | null;
  birthDate: string;
  age: number;
};

type Consultation = {
  id: string;
  patientId: string;
  startedAt: string;
  finishedAt: string | null;
  paidAt: string | null;
  status: 'OPEN' | 'FINALIZED';
  content: string;
  notes: string;
  price: number;
  paid: boolean;
  patient: Patient;
};

type TimerColor = 'green' | 'yellow' | 'red';

export default function ConsultationPage() {
  const params = useParams();
  const router = useRouter();
  const consultationId = params.id as string;
  const { isElectron } = useDeviceDetection();

  const [consultation, setConsultation] = useState<Consultation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [timerColor, setTimerColor] = useState<TimerColor>('green');

  // Callback para quando texto é transcrito
  const handleTranscript = useCallback((text: string) => {
    if (!consultation || consultation.status === 'FINALIZED') return;
    
    // Adicionar texto transcrito ao conteúdo
    setConsultation(prev => {
      if (!prev) return null;
      const newContent = prev.content 
        ? prev.content + text 
        : text;
      return { ...prev, content: newContent };
    });
  }, [consultation?.status]);

  const {
    isListening,
    isSupported,
    error: speechError,
    toggleListening,
  } = useSpeechRecognition(handleTranscript);

  // Abrir consulta no navegador (para Electron)
  const handleOpenInBrowser = useCallback(async () => {
    if (typeof window === 'undefined') return;
    
    const electronAPI = (window as Window & { electronAPI?: { openInBrowser: (url: string) => Promise<{ success: boolean }> } }).electronAPI;
    if (electronAPI?.openInBrowser) {
      const url = `http://localhost:3000/consultations/${consultationId}`;
      await electronAPI.openInBrowser(url);
    }
  }, [consultationId]);

  // Load consultation data
  useEffect(() => {
    const fetchConsultation = async () => {
      try {
        const response = await fetch(`/api/consultations/${consultationId}`);
        if (!response.ok) {
          throw new Error('Consulta não encontrada');
        }
        const data = await response.json();
        setConsultation(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro ao carregar consulta');
      } finally {
        setLoading(false);
      }
    };

    if (consultationId) {
      fetchConsultation();
    }
  }, [consultationId]);

  // Timer logic
  useEffect(() => {
    if (!consultation || consultation.status === 'FINALIZED') return;

    const startTime = new Date(consultation.startedAt).getTime();
    
    const updateTimer = () => {
      const now = Date.now();
      const elapsed = Math.floor((now - startTime) / 1000);
      setElapsedTime(elapsed);

      // Calculate remaining time (1 hour = 3600 seconds)
      const remaining = 3600 - elapsed;
      
      // Set timer color based on remaining time
      // Requirements: 5.4 - Green (>15min), Yellow (5-15min), Red (≤5min)
      if (remaining > 900) { // More than 15 minutes
        setTimerColor('green');
      } else if (remaining > 300) { // More than 5 minutes
        setTimerColor('yellow');
      } else { // 5 minutes or less
        setTimerColor('red');
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [consultation]);

  // Format time display
  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Auto-save content and notes
  const saveConsultation = async (updates: Partial<Consultation>) => {
    if (!consultation) return;

    try {
      setSaving(true);
      const response = await fetch(`/api/consultations/${consultationId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        throw new Error('Erro ao salvar consulta');
      }

      const updatedConsultation = await response.json();
      setConsultation(updatedConsultation);
    } catch (err) {
      console.error('Error saving consultation:', err);
    } finally {
      setSaving(false);
    }
  };

  // Handle content change with debounced auto-save
  const handleContentChange = (field: 'content' | 'notes', value: string) => {
    if (!consultation) return;

    setConsultation(prev => prev ? { ...prev, [field]: value } : null);
    
    // Debounced save
    const timeoutId = setTimeout(() => {
      saveConsultation({ [field]: value });
    }, 1000);

    return () => clearTimeout(timeoutId);
  };

  // Finalize consultation
  const handleFinalize = async () => {
    if (!consultation) return;

    try {
      setSaving(true);
      const response = await fetch(`/api/consultations/${consultationId}/finalize`, {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Erro ao finalizar consulta');
      }

      const updatedConsultation = await response.json();
      setConsultation(updatedConsultation);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao finalizar consulta');
    } finally {
      setSaving(false);
    }
  };

  // Process payment
  const handlePayment = async () => {
    if (!consultation) return;

    try {
      setSaving(true);
      const response = await fetch(`/api/consultations/${consultationId}/payment`, {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Erro ao processar pagamento');
      }

      const updatedConsultation = await response.json();
      setConsultation(updatedConsultation);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao processar pagamento');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-lg text-gray-600">Carregando consulta...</div>
      </div>
    );
  }

  if (error || !consultation) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="text-center">
          <div className="text-red-600 text-lg mb-4">
            {error || 'Consulta não encontrada'}
          </div>
          <button
            onClick={() => router.back()}
            className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
          >
            Voltar
          </button>
        </div>
      </div>
    );
  }

  const timerColorClasses = {
    green: 'text-green-600 bg-green-50 border-green-200',
    yellow: 'text-yellow-600 bg-yellow-50 border-yellow-200',
    red: 'text-red-600 bg-red-50 border-red-200'
  };

  return (
    <div className="space-y-6">
      {/* Consultation Header */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex items-center space-x-4">
            <PatientPhoto
              src={consultation.patient.profilePhoto}
              alt={consultation.patient.name}
              size="lg"
            />
            <div>
              <h1 className="text-2xl font-bold text-[#204B57]">
                {consultation.patient.name}
              </h1>
              <p className="text-gray-600">
                {consultation.patient.age} anos
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            {/* Session Timer */}
            <div className={`px-6 py-3 rounded-lg border-2 font-mono text-xl font-bold ${timerColorClasses[timerColor]}`}>
              {formatTime(elapsedTime)}
            </div>

            {/* Microphone Button for Voice Transcription */}
            {consultation.status === 'OPEN' && (
              <MicrophoneButton
                isListening={isListening}
                isSupported={isSupported}
                disabled={consultation.status === 'FINALIZED'}
                error={speechError}
                onToggle={toggleListening}
                onOpenInBrowser={handleOpenInBrowser}
              />
            )}

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-2">
              {consultation.status === 'OPEN' && (
                <button
                  onClick={handleFinalize}
                  disabled={saving}
                  className="px-6 py-3 bg-[#197BBD] text-white rounded-lg hover:bg-[#125E8A] disabled:opacity-50 font-medium transition-colors duration-200"
                >
                  {saving ? 'Finalizando...' : 'Finalizar Consulta'}
                </button>
              )}

              {!consultation.paid && (
                <button
                  onClick={handlePayment}
                  disabled={saving}
                  className="px-6 py-3 bg-[#16a085] text-white rounded-lg hover:bg-green-600 disabled:opacity-50 font-medium transition-colors duration-200"
                >
                  {saving ? 'Processando...' : 'Efetuar Pagamento'}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Status Indicators */}
        <div className="mt-6 flex flex-wrap gap-3">
          <span className={`px-4 py-2 rounded-full text-sm font-medium ${
            consultation.status === 'OPEN' 
              ? 'bg-blue-100 text-blue-800' 
              : 'bg-gray-100 text-gray-800'
          }`}>
            {consultation.status === 'OPEN' ? 'Em Andamento' : 'Finalizada'}
          </span>
          
          <span className={`px-4 py-2 rounded-full text-sm font-medium ${
            consultation.paid 
              ? 'bg-green-100 text-green-800' 
              : 'bg-red-100 text-red-800'
          }`}>
            {consultation.paid ? 'Pago' : 'Não Pago'}
          </span>

          {saving && (
            <span className="px-4 py-2 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800">
              Salvando...
            </span>
          )}
        </div>
      </div>

      {/* Content and Notes */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Patient Content */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-text mb-4">
            Conteúdo do Paciente
          </h2>
          <RichTextEditor
            content={consultation.content}
            onChange={(content) => handleContentChange('content', content)}
            placeholder="Digite aqui o que o paciente fala durante a consulta..."
            disabled={consultation.status === 'FINALIZED'}
            className="min-h-[400px]"
          />
        </div>

        {/* Therapist Notes */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-text mb-4">
            Anotações da Terapeuta
          </h2>
          <RichTextEditor
            content={consultation.notes}
            onChange={(content) => handleContentChange('notes', content)}
            placeholder="Digite aqui suas anotações e observações sobre a consulta..."
            disabled={consultation.status === 'FINALIZED'}
            className="min-h-[400px]"
          />
        </div>
      </div>
    </div>
  );
}