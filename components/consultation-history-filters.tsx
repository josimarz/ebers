'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Search, X } from 'lucide-react'

type Patient = {
  id: string
  name: string
}

type ConsultationHistoryFiltersProps = {
  currentPatientId?: string
  currentSortBy: string
  currentSortOrder: string
}

export function ConsultationHistoryFilters({
  currentPatientId,
  currentSortBy,
  currentSortOrder
}: ConsultationHistoryFiltersProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [searchQuery, setSearchQuery] = useState('')
  const [patients, setPatients] = useState<Patient[]>([])
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null)
  const [showDropdown, setShowDropdown] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  // Load selected patient on mount
  useEffect(() => {
    if (currentPatientId) {
      // Find patient name for the selected ID
      fetchPatients(currentPatientId).then(results => {
        const patient = results.find(p => p.id === currentPatientId)
        if (patient) {
          setSelectedPatient(patient)
          setSearchQuery(patient.name)
        }
      })
    }
  }, [currentPatientId])

  const fetchPatients = async (query: string): Promise<Patient[]> => {
    if (query.trim().length < 2) return []
    
    try {
      setIsLoading(true)
      const response = await fetch(`/api/consultations/search-patients?q=${encodeURIComponent(query)}`)
      if (!response.ok) throw new Error('Erro ao buscar pacientes')
      
      const data = await response.json()
      return data.patients || []
    } catch (error) {
      console.error('Erro ao buscar pacientes:', error)
      return []
    } finally {
      setIsLoading(false)
    }
  }

  const handleSearchChange = async (value: string) => {
    setSearchQuery(value)
    
    if (value.trim().length >= 2) {
      const results = await fetchPatients(value)
      setPatients(results)
      setShowDropdown(true)
    } else {
      setPatients([])
      setShowDropdown(false)
    }
  }

  const handlePatientSelect = (patient: Patient) => {
    setSelectedPatient(patient)
    setSearchQuery(patient.name)
    setShowDropdown(false)
    updateFilters({ patientId: patient.id })
  }

  const handleClearPatient = () => {
    setSelectedPatient(null)
    setSearchQuery('')
    setShowDropdown(false)
    updateFilters({ patientId: undefined })
  }

  const handleSortChange = (sortBy: string, sortOrder: string) => {
    updateFilters({ sortBy, sortOrder })
  }

  const updateFilters = (updates: Record<string, string | undefined>) => {
    const params = new URLSearchParams(searchParams.toString())
    
    // Update or remove parameters
    Object.entries(updates).forEach(([key, value]) => {
      if (value) {
        params.set(key, value)
      } else {
        params.delete(key)
      }
    })
    
    // Reset to page 1 when filters change
    params.delete('page')
    
    router.push(`/consultations?${params.toString()}`)
  }

  return (
    <div className="space-y-4">
      {/* Patient Filter */}
      <div className="relative">
        <label className="block text-sm font-medium text-text mb-2">
          Filtrar por Paciente
        </label>
        <div className="relative">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              onFocus={() => {
                if (patients.length > 0) setShowDropdown(true)
              }}
              placeholder="Digite o nome do paciente..."
              className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
            />
            {selectedPatient && (
              <button
                onClick={handleClearPatient}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          
          {/* Dropdown */}
          {showDropdown && patients.length > 0 && (
            <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
              {isLoading ? (
                <div className="px-4 py-2 text-gray-500">Carregando...</div>
              ) : (
                patients.map((patient) => (
                  <button
                    key={patient.id}
                    onClick={() => handlePatientSelect(patient)}
                    className="w-full px-4 py-2 text-left hover:bg-gray-50 focus:bg-gray-50 focus:outline-none"
                  >
                    {patient.name}
                  </button>
                ))
              )}
            </div>
          )}
        </div>
      </div>

      {/* Sort Options */}
      <div className="flex flex-wrap gap-4">
        <div>
          <label className="block text-sm font-medium text-text mb-2">
            Ordenar por
          </label>
          <select
            value={currentSortBy}
            onChange={(e) => handleSortChange(e.target.value, currentSortOrder)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
          >
            <option value="startedAt">Data da Consulta</option>
            <option value="status">Status</option>
            <option value="paid">Pagamento</option>
          </select>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-text mb-2">
            Ordem
          </label>
          <select
            value={currentSortOrder}
            onChange={(e) => handleSortChange(currentSortBy, e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
          >
            <option value="desc">Mais Recente</option>
            <option value="asc">Mais Antiga</option>
          </select>
        </div>
      </div>

      {/* Active Filters Display */}
      {selectedPatient && (
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600">Filtros ativos:</span>
          <div className="flex items-center gap-1 px-3 py-1 bg-primary-500/10 text-primary-500 rounded-full text-sm">
            <span>Paciente: {selectedPatient.name}</span>
            <button
              onClick={handleClearPatient}
              className="ml-1 hover:text-primary/80"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}