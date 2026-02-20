"use client";

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import PatientRegistrationForm from '@/components/forms/PatientRegistrationForm';
import { isIpadDevice } from '@/lib/device-detection';
import { QRCodeModal } from '@/components/QRCodeModal';
import { QrCode } from 'lucide-react';

interface PatientData {
  id: string;
  name: string;
  profilePhoto?: string;
  birthDate: string;
  gender: string;
  cpf?: string;
  rg?: string;
  religion: string;
  legalGuardian?: string;
  legalGuardianEmail?: string;
  legalGuardianCpf?: string;
  phone1: string;
  phone2?: string;
  email?: string;
  hasTherapyHistory: boolean;
  therapyHistoryDetails?: string;
  therapyReason?: string;
  takesMedication: boolean;
  medicationSince?: string;
  medicationNames?: string;
  hasHospitalization: boolean;
  hospitalizationDate?: string;
  hospitalizationReason?: string;
  consultationPrice?: number;
  consultationFrequency?: string;
  consultationDay?: string;
  credits: number;
}

interface NetworkInfo {
  addresses: string[];
  port: number;
}

export default function PatientEditPage() {
  const router = useRouter();
  const params = useParams();
  const patientId = params.id as string;

  const [patient, setPatient] = useState<PatientData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isIpad, setIsIpad] = useState(false);
  const [networkInfo, setNetworkInfo] = useState<NetworkInfo | null>(null);
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);

  useEffect(() => {
    setIsIpad(isIpadDevice(navigator.userAgent));

    if (window.electronAPI) {
      window.electronAPI.getNetworkInfo().then(setNetworkInfo);
    }
  }, []);

  useEffect(() => {
    const fetchPatient = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch(`/api/patients/${patientId}`);

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Erro ao carregar paciente');
        }

        const patientData = await response.json();

        setPatient({
          ...patientData,
          birthDate: new Date(patientData.birthDate).toISOString().split('T')[0],
        });
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Erro desconhecido');
      } finally {
        setLoading(false);
      }
    };

    if (patientId) {
      fetchPatient();
    }
  }, [patientId]);

  const handleSubmit = async (formData: Partial<PatientData>) => {
    const response = await fetch(`/api/patients/${patientId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...formData,
        birthDate: formData.birthDate,
        consultationPrice: formData.consultationPrice
          ? Number(formData.consultationPrice)
          : undefined,
        credits: Number(formData.credits ?? 0),
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(
        errorData.details
          ? Object.values(errorData.details).join(', ')
          : errorData.error || 'Erro ao atualizar paciente'
      );
    }

    if (!isIpad) {
      router.push('/patients');
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-center py-8">
          <div className="text-gray-500">Carregando dados do paciente...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-center py-8">
          <div className="text-red-600">Erro: {error}</div>
        </div>
      </div>
    );
  }

  if (!patient) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-center py-8">
          <div className="text-gray-500">Paciente não encontrado</div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header — oculto no iPad */}
      {!isIpad && (
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-text">Editar Paciente</h1>
          <div className="flex gap-3">
            {/* Botão QR Code — só aparece no desktop com Electron */}
            {networkInfo && (
              <button
                onClick={() => setIsQrModalOpen(true)}
                className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-secondary transition-colors"
                title="Gerar QR Code para edição via iPad"
              >
                <QrCode size={16} />
                QR Code iPad
              </button>
            )}
            <button
              onClick={() => router.push('/patients')}
              className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
            >
              Voltar à Lista
            </button>
          </div>
        </div>
      )}

      <PatientRegistrationForm
        initialData={patient}
        onSubmit={handleSubmit}
        isIpad={isIpad}
        submitButtonText={isIpad ? 'Salvar' : 'Atualizar Paciente'}
      />

      {/* Modal QR Code para edição via iPad */}
      {networkInfo && (
        <QRCodeModal
          isOpen={isQrModalOpen}
          onClose={() => setIsQrModalOpen(false)}
          addresses={networkInfo.addresses}
          port={networkInfo.port}
          path={`/patients/${patientId}`}
        />
      )}
    </div>
  );
}
