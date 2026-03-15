'use client';

import { useParams, useRouter } from 'next/navigation';
import { Monitor, ArrowLeft } from 'lucide-react';

export default function BrowserActivePage() {
  const params = useParams();
  const router = useRouter();
  const consultationId = params.id as string;

  const handleReturn = () => {
    router.push(`/consultations/${consultationId}`);
  };

  return (
    <div className="flex items-center justify-center min-h-[70vh]">
      <div className="bg-white rounded-2xl shadow-lg p-10 max-w-lg w-full text-center space-y-6">
        <div className="flex justify-center">
          <div className="bg-blue-50 rounded-full p-6">
            <Monitor className="w-16 h-16 text-[#197BBD]" />
          </div>
        </div>

        <h1 className="text-2xl font-bold text-[#204B57]">
          Consulta em andamento no navegador
        </h1>

        <p className="text-gray-600 leading-relaxed">
          A consulta foi aberta no navegador para utilizar a transcrição de voz.
          Quando terminar, feche a aba do navegador e clique no botão abaixo para
          retomar a consulta aqui.
        </p>

        <button
          onClick={handleReturn}
          className="
            inline-flex items-center gap-2
            px-6 py-3
            bg-[#197BBD] text-white
            rounded-lg
            hover:bg-[#125E8A]
            transition-colors duration-200
            font-medium text-base
          "
        >
          <ArrowLeft className="w-5 h-5" />
          Voltar para a consulta
        </button>
      </div>
    </div>
  );
}
