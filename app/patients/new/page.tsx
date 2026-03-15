"use client";

import { useSearchParams } from 'next/navigation';
import { useEffect, useState, Suspense } from 'react';
import PatientRegistrationForm from '@/components/forms/PatientRegistrationForm';

/**
 * Reads the x-device-mobile cookie set by proxy.ts.
 */
function readMobileCookie(): boolean {
  if (typeof document === 'undefined') return false;
  return document.cookie.split(';').some(c => c.trim().startsWith('x-device-mobile=1'));
}

function PatientRegistrationContent() {
  const searchParams = useSearchParams();
  const [isIpad, setIsIpad] = useState(false);

  useEffect(() => {
    const deviceParam = searchParams.get('device');
    setIsIpad(deviceParam === 'mobile' || deviceParam === 'ipad' || readMobileCookie());
  }, [searchParams]);

  return (
    <PatientRegistrationForm 
      isIpad={isIpad}
      submitButtonText={isIpad ? 'Cadastrar' : 'Salvar Paciente'}
    />
  );
}

export default function NewPatientPage() {
  return (
    <div className="space-y-6">
      <Suspense fallback={
        <div className="bg-white rounded-lg shadow p-6">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
            <div className="space-y-3">
              <div className="h-4 bg-gray-200 rounded w-full"></div>
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            </div>
          </div>
        </div>
      }>
        <PatientRegistrationContent />
      </Suspense>
    </div>
  );
}