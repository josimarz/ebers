'use client'

import { useEffect, useState } from 'react'
import { PatientPhoto } from '@/components/ui/PatientPhoto'
import { ConsultationHistoryPagination } from '@/components/consultation-history-pagination'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import Link from 'next/link'

type Patient = {
  id: string
  name: string
  profilePhoto: string | null
  birthDate: string
  age: number
}

type Consultation = {
  id: string
  patientId: string
  startedAt: string
  finishedAt: string | null
  paidAt: string | null
  status: string
  content: string
  notes: string
  price: number
  paid: boolean
  patient: Patient
}

type ConsultationListResult = {
  consultations: Consultation[]
  totalCount: number
  totalPages: number
  currentPage: number
  hasNextPage: boolean
  hasPreviousPage: boolean
}

type ConsultationHistoryTableProps = {
  page: number
  patientId?: string
  sortBy: 'startedAt' | 'status' | 'paid'
  sortOrder: 'asc' | 'desc'
}

function formatTime(dateStr: string | null): string {
  if (!dateStr) return '-'
  return format(new Date(dateStr), 'HH:mm', { locale: ptBR })
}

function formatDate(dateStr: string): string {
  return format(new Date(dateStr), 'dd/MM/yyyy', { locale: ptBR })
}

function getStatusBadge(status: string) {
  const baseClasses = "px-2 py-1 rounded-full text-xs font-medium"
  
  switch (status) {
    case 'OPEN':
      return (
        <span className={`${baseClasses} bg-yellow-100 text-yellow-800`}>
          Aberta
        </span>
      )
    case 'FINALIZED':
      return (
        <span className={`${baseClasses} bg-green-100 text-green-800`}>
          Finalizada
        </span>
      )
    default:
      return (
        <span className={`${baseClasses} bg-gray-100 text-gray-800`}>
          {status}
        </span>
      )
  }
}

function getPaymentBadge(paid: boolean) {
  const baseClasses = "px-2 py-1 rounded-full text-xs font-medium"
  
  if (paid) {
    return (
      <span className={`${baseClasses} bg-green-100 text-green-800`}>
        Pago
      </span>
    )
  } else {
    return (
      <span className={`${baseClasses} bg-red-100 text-red-800`}>
        Não Pago
      </span>
    )
  }
}

export function ConsultationHistoryTable({
  page,
  patientId,
  sortBy,
  sortOrder
}: ConsultationHistoryTableProps) {
  const [data, setData] = useState<ConsultationListResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchConsultations = async () => {
      setLoading(true)
      setError(null)
      
      try {
        const params = new URLSearchParams({
          page: page.toString(),
          limit: '10',
          sortBy,
          sortOrder
        })
        
        if (patientId) {
          params.set('patientId', patientId)
        }

        const response = await fetch(`/api/consultations?${params.toString()}`, {
          cache: 'no-store'
        })
        
        if (!response.ok) {
          throw new Error('Erro ao carregar consultas')
        }
        
        const result = await response.json()
        setData(result)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro ao carregar consultas')
      } finally {
        setLoading(false)
      }
    }

    fetchConsultations()
  }, [page, patientId, sortBy, sortOrder])

  if (loading) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">Carregando consultas...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-red-500">{error}</p>
      </div>
    )
  }

  if (!data || data.consultations.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">
          {patientId ? 'Nenhuma consulta encontrada para este paciente.' : 'Nenhuma consulta encontrada.'}
        </p>
      </div>
    )
  }

  const { consultations, totalCount, totalPages, currentPage, hasNextPage, hasPreviousPage } = data

  return (
    <div className="space-y-4">
      {/* Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Paciente
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Data
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Início
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Fim
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Pagamento
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {consultations.map((consultation) => (
              <tr
                key={consultation.id}
                className="hover:bg-gray-50 cursor-pointer transition-colors"
              >
                <td className="px-6 py-4 whitespace-nowrap">
                  <Link
                    href={`/consultations/${consultation.id}`}
                    className="flex items-center space-x-3 hover:text-primary"
                  >
                    <PatientPhoto
                      src={consultation.patient.profilePhoto}
                      alt={consultation.patient.name}
                      size="sm"
                    />
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {consultation.patient.name}
                      </div>
                      <div className="text-sm text-gray-500">
                        {consultation.patient.age} anos
                      </div>
                    </div>
                  </Link>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <Link
                    href={`/consultations/${consultation.id}`}
                    className="text-sm text-gray-900 hover:text-primary"
                  >
                    {formatDate(consultation.startedAt)}
                  </Link>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <Link
                    href={`/consultations/${consultation.id}`}
                    className="text-sm text-gray-900 hover:text-primary"
                  >
                    {formatTime(consultation.startedAt)}
                  </Link>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <Link
                    href={`/consultations/${consultation.id}`}
                    className="text-sm text-gray-900 hover:text-primary"
                  >
                    {formatTime(consultation.finishedAt)}
                  </Link>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <Link href={`/consultations/${consultation.id}`}>
                    {getStatusBadge(consultation.status)}
                  </Link>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <Link href={`/consultations/${consultation.id}`}>
                    {getPaymentBadge(consultation.paid)}
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <ConsultationHistoryPagination
        currentPage={currentPage}
        totalPages={totalPages}
        hasNextPage={hasNextPage}
        hasPreviousPage={hasPreviousPage}
        totalCount={totalCount}
      />
    </div>
  )
}