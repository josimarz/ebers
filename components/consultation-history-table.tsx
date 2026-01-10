import { listConsultations, type ConsultationWithPatient } from '@/lib/consultations'
import { PatientPhoto } from '@/components/ui/PatientPhoto'
import { ConsultationHistoryPagination } from '@/components/consultation-history-pagination'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import Link from 'next/link'

type ConsultationHistoryTableProps = {
  page: number
  patientId?: string
  sortBy: 'startedAt' | 'status' | 'paid'
  sortOrder: 'asc' | 'desc'
}

function formatTime(date: Date | null): string {
  if (!date) return '-'
  return format(date, 'HH:mm', { locale: ptBR })
}

function formatDate(date: Date): string {
  return format(date, 'dd/MM/yyyy', { locale: ptBR })
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

export async function ConsultationHistoryTable({
  page,
  patientId,
  sortBy,
  sortOrder
}: ConsultationHistoryTableProps) {
  try {
    const result = await listConsultations({
      page,
      limit: 10,
      patientId,
      sortBy,
      sortOrder
    })

    const { consultations, totalCount, totalPages, currentPage, hasNextPage, hasPreviousPage } = result

    if (consultations.length === 0) {
      return (
        <div className="text-center py-8">
          <p className="text-gray-500">
            {patientId ? 'Nenhuma consulta encontrada para este paciente.' : 'Nenhuma consulta encontrada.'}
          </p>
        </div>
      )
    }

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
  } catch (error) {
    console.error('Erro ao carregar consultas:', error)
    return (
      <div className="text-center py-8">
        <p className="text-red-500">
          Erro ao carregar consultas. Tente novamente.
        </p>
      </div>
    )
  }
}