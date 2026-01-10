import { Suspense } from 'react'
import { ConsultationHistoryTable } from '@/components/consultation-history-table'
import { ConsultationHistoryFilters } from '@/components/consultation-history-filters'

export const metadata = {
  title: 'Histórico de Consultas - Ebers',
  description: 'Visualize e gerencie o histórico de consultas dos pacientes'
}

type SearchParams = {
  page?: string
  patientId?: string
  sortBy?: string
  sortOrder?: string
}

type ConsultationsPageProps = {
  searchParams: Promise<SearchParams>
}

export default async function ConsultationsPage({ searchParams }: ConsultationsPageProps) {
  const params = await searchParams
  const page = Number(params.page) || 1
  const patientId = params.patientId || undefined
  const sortBy = (params.sortBy as 'startedAt' | 'status' | 'paid') || 'startedAt'
  const sortOrder = (params.sortOrder as 'asc' | 'desc') || 'desc'

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold text-text mb-6">
          Histórico de Consultas
        </h2>
        
        <div className="space-y-6">
          <Suspense fallback={<div className="text-gray-500">Carregando filtros...</div>}>
            <ConsultationHistoryFilters 
              currentPatientId={patientId}
              currentSortBy={sortBy}
              currentSortOrder={sortOrder}
            />
          </Suspense>
          
          <Suspense fallback={<div className="text-gray-500">Carregando consultas...</div>}>
            <ConsultationHistoryTable
              page={page}
              patientId={patientId}
              sortBy={sortBy}
              sortOrder={sortOrder}
            />
          </Suspense>
        </div>
      </div>
    </div>
  )
}