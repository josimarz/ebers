"use client";

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import PatientRegistrationForm from '@/components/forms/PatientRegistrationForm';

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

export default function PatientEditPage() {
  const router = useRouter();
  const params = useParams();
  const patientId = params.id as string;

  const [patient, setPatient] = useState<PatientData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch patient data
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
        
        // Format birth date for form input
        const formattedPatient = {
          ...patientData,
          birthDate: new Date(patientData.birthDate).toISOString().split('T')[0]
        };
        
        setPatient(formattedPatient);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro desconhecido');
      } finally {
        setLoading(false);
      }
    };

    if (patientId) {
      fetchPatient();
    }
  }, [patientId]);

  // Handle form submission
  const handleSubmit = async (formData: any) => {
    try {
      const response = await fetch(`/api/patients/${patientId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          birthDate: formData.birthDate,
          consultationPrice: formData.consultationPrice ? Number(formData.consultationPrice) : undefined,
          credits: Number(formData.credits || 0)
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        if (errorData.details) {
          throw new Error(Object.values(errorData.details).join(', '));
        } else {
          throw new Error(errorData.error || 'Erro ao atualizar paciente');
        }
      }

      // Success - redirect to patients list
      router.push('/patients');
    } catch (error) {
      throw error; // Let the form handle the error display
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-center py-8">
            <div className="text-gray-500">Carregando dados do paciente...</div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-center py-8">
            <div className="text-red-600">Erro: {error}</div>
          </div>
        </div>
      </div>
    );
  }

  if (!patient) {
    return (
      <div className="space-y-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-center py-8">
            <div className="text-gray-500">Paciente não encontrado</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-text">Editar Paciente</h1>
        <div className="flex gap-3">
          <button
            onClick={() => router.push('/patients')}
            className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
          >
            Voltar à Lista
          </button>
        </div>
      </div>

      {/* Patient Form */}
      <PatientRegistrationForm
        initialData={patient}
        onSubmit={handleSubmit}
        submitButtonText="Atualizar Paciente"
      />
    </div>
  );
}