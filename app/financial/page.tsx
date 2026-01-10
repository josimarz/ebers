'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { PatientPhoto } from '@/components/ui/PatientPhoto'
import { Modal } from '@/components/ui/Modal'
import { type PatientFinancialData } from '@/lib/financial'
import { useToast } from '@/lib/toast-context'

type SortField = 'name' | 'paymentDeficit'
type SortOrder = 'asc' | 'desc'

export default function FinancialPage() {
  const { showToast } = useToast();
  const [patients, setPatients] = useState<PatientFinancialData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [sortBy, setSortBy] = useState<SortField>('paymentDeficit')
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc')
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<{ id: string; name: string }[]>([])
  const [showSearchResults, setShowSearchResults] = useState(false)
  const [selectedPatient, setSelectedPatient] = useState<string>('')
  
  // Credit sales modal state
  const [showCreditModal, setShowCreditModal] = useState(false)
  const [selectedPatientForCredits, setSelectedPatientForCredits] = useState<PatientFinancialData | null>(null)
  const [creditQuantity, setCreditQuantity] = useState<number>(1)
  const [isProcessingCredits, setIsProcessingCredits] = useState(false)

  const limit = 10

  // Load financial data
  const loadFinancialData = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: limit.toString(),
        sortBy,
        sortOrder
      })
      
      if (selectedPatient) {
        params.append('search', selectedPatient)
      }
      
      const response = await fetch(`/api/financial?${params}`)
      if (!response.ok) {
        throw new Error('Erro ao carregar dados financeiros')
      }
      
      const result = await response.json()
      setPatients(result.patients)
      setTotalPages(result.totalPages)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar dados financeiros')
    } finally {
      setLoading(false)
    }
  }

  // Search patients for autocomplete
  const searchPatients = async (query: string) => {
    if (query.length < 2) {
      setSearchResults([])
      setShowSearchResults(false)
      return
    }

    try {
      const response = await fetch(`/api/financial/search-patients?q=${encodeURIComponent(query)}`)
      if (response.ok) {
        const results = await response.json()
        setSearchResults(results)
        setShowSearchResults(true)
      }
    } catch (err) {
      console.error('Erro ao buscar pacientes:', err)
    }
  }

  // Handle sort change
  const handleSort = (field: SortField) => {
    const newSortOrder = sortBy === field && sortOrder === 'desc' ? 'asc' : 'desc'
    setSortBy(field)
    setSortOrder(newSortOrder)
    setCurrentPage(1)
  }

  // Handle search input change
  const handleSearchChange = (value: string) => {
    setSearchQuery(value)
    if (value.length === 0) {
      setSelectedPatient('')
      setShowSearchResults(false)
    } else {
      searchPatients(value)
    }
  }

  // Handle patient selection from search
  const handlePatientSelect = (patient: { id: string; name: string }) => {
    setSelectedPatient(patient.name) // Use name for search instead of ID
    setSearchQuery(patient.name)
    setShowSearchResults(false)
    setCurrentPage(1)
  }

  // Clear search filter
  const clearSearch = () => {
    setSearchQuery('')
    setSelectedPatient('')
    setShowSearchResults(false)
    setCurrentPage(1)
  }

  // Load data when dependencies change
  useEffect(() => {
    loadFinancialData()
  }, [currentPage, sortBy, sortOrder, selectedPatient])

  // Handle credit sales
  const handleCreditSales = (patient: PatientFinancialData) => {
    setSelectedPatientForCredits(patient)
    setCreditQuantity(1)
    setShowCreditModal(true)
  }

  // Process credit sales
  const processCreditSales = async () => {
    if (!selectedPatientForCredits || creditQuantity <= 0) return

    // Verify patient has consultation price
    if (!selectedPatientForCredits.consultationPrice || selectedPatientForCredits.consultationPrice <= 0) {
      showToast('Não é possível vender créditos. Valor da consulta não foi estabelecido.', 'warning')
      return
    }

    setIsProcessingCredits(true)
    try {
      const response = await fetch(`/api/patients/${selectedPatientForCredits.id}/credits`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          quantity: creditQuantity,
          unitPrice: selectedPatientForCredits.consultationPrice
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Erro ao vender créditos')
      }

      // Reload financial data to reflect changes
      await loadFinancialData()
      
      // Close modal and reset state
      setShowCreditModal(false)
      setSelectedPatientForCredits(null)
      setCreditQuantity(1)
      
      showToast(`${creditQuantity} crédito(s) vendido(s) com sucesso!`, 'success')
    } catch (error) {
      console.error('Erro ao vender créditos:', error)
      showToast(error instanceof Error ? error.message : 'Erro ao vender créditos', 'error')
    } finally {
      setIsProcessingCredits(false)
    }
  }

  // Close credit modal
  const closeCreditModal = () => {
    setShowCreditModal(false)
    setSelectedPatientForCredits(null)
    setCreditQuantity(1)
  }

  // Handle pagination
  const handlePageChange = (page: number) => {
    setCurrentPage(page)
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="animate-pulse">
            <div className="h-6 bg-gray-200 rounded w-1/4 mb-4"></div>
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-4 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-text mb-4">
            Controle Financeiro
          </h2>
          <div className="bg-red-50 border border-red-200 rounded-md p-4">
            <p className="text-red-800">{error}</p>
            <button
              onClick={() => loadFinancialData()}
              className="mt-2 inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-danger-500 rounded-lg shadow hover:bg-danger-600 hover:shadow-md transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-danger-500 focus:ring-offset-2"
            >
              Tentar novamente
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold text-text mb-4">
          Controle Financeiro
        </h2>
        
        {/* Search Filter */}
        <div className="mb-4 relative">
          <label htmlFor="patient-search" className="block text-sm font-medium text-gray-700 mb-2">
            Filtrar por paciente
          </label>
          <div className="relative">
            <input
              id="patient-search"
              type="text"
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="Digite o nome do paciente..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            />
            {selectedPatient && (
              <button
                onClick={clearSearch}
                className="absolute right-2 top-2 p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-1"
                title="Limpar filtro"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
          
          {/* Search Results Dropdown */}
          {showSearchResults && searchResults.length > 0 && (
            <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
              {searchResults.map((patient) => (
                <button
                  key={patient.id}
                  onClick={() => handlePatientSelect(patient)}
                  className="w-full px-3 py-2 text-left hover:bg-gray-50 focus:bg-gray-50 focus:outline-none"
                >
                  {patient.name}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Financial Overview Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-12">
                </th>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors duration-200 select-none"
                  onClick={() => handleSort('name')}
                >
                  <div className="flex items-center space-x-1">
                    <span>Nome</span>
                    {sortBy === 'name' && (
                      <span className="text-primary-500 font-bold">
                        {sortOrder === 'asc' ? '↑' : '↓'}
                      </span>
                    )}
                    {sortBy !== 'name' && (
                      <span className="text-gray-300 opacity-0 group-hover:opacity-100">
                        ↕
                      </span>
                    )}
                  </div>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Consultas Feitas
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Consultas Pagas
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Créditos
                </th>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors duration-200 select-none"
                  onClick={() => handleSort('paymentDeficit')}
                >
                  <div className="flex items-center space-x-1">
                    <span>Déficit</span>
                    {sortBy === 'paymentDeficit' && (
                      <span className="text-primary-500 font-bold">
                        {sortOrder === 'asc' ? '↑' : '↓'}
                      </span>
                    )}
                    {sortBy !== 'paymentDeficit' && (
                      <span className="text-gray-300 opacity-0 group-hover:opacity-100">
                        ↕
                      </span>
                    )}
                  </div>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {patients.map((patient) => (
                <tr 
                  key={patient.id}
                  className={patient.hasPaymentIssues ? 'bg-red-50' : ''}
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <PatientPhoto 
                      src={patient.profilePhoto} 
                      alt={patient.name}
                      size="sm"
                    />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {patient.name}
                    </div>
                    <div className="text-sm text-gray-500">
                      {patient.age} anos
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {patient.totalConsultations}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {patient.paidConsultations}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {patient.availableCredits}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      patient.paymentDeficit > 0 
                        ? 'bg-red-100 text-red-800' 
                        : 'bg-green-100 text-green-800'
                    }`}>
                      {patient.paymentDeficit > 0 ? `-${patient.paymentDeficit}` : '0'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex space-x-2">
                      <Link
                        href={`/patients/${patient.id}`}
                        className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-primary-600 bg-primary-50 border border-primary-200 rounded-lg hover:bg-primary-100 hover:border-primary-300 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-1"
                      >
                        Perfil
                      </Link>
                      <Link
                        href={`/consultations?patientId=${patient.id}`}
                        className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-secondary-600 bg-secondary-50 border border-secondary-200 rounded-lg hover:bg-secondary-100 hover:border-secondary-300 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-secondary-500 focus:ring-offset-1"
                      >
                        Consultas
                      </Link>
                      <button
                        onClick={() => handleCreditSales(patient)}
                        className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-success-600 bg-success-50 border border-success-200 rounded-lg hover:bg-success-100 hover:border-success-300 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-success-500 focus:ring-offset-1"
                      >
                        Vender Créditos
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
            <div className="flex-1 flex justify-between sm:hidden">
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="relative inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 hover:border-gray-400 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white disabled:hover:border-gray-300 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-1"
              >
                Anterior
              </button>
              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="ml-3 relative inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 hover:border-gray-400 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white disabled:hover:border-gray-300 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-1"
              >
                Próximo
              </button>
            </div>
            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-gray-700">
                  Página <span className="font-medium">{currentPage}</span> de{' '}
                  <span className="font-medium">{totalPages}</span>
                </p>
              </div>
              <div>
                <nav className="relative z-0 inline-flex rounded-lg shadow-sm -space-x-px">
                  <button
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="relative inline-flex items-center px-3 py-2 rounded-l-lg border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 hover:border-gray-400 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white disabled:hover:border-gray-300 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-1"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                    <span className="ml-1">Anterior</span>
                  </button>
                  {[...Array(totalPages)].map((_, i) => {
                    const page = i + 1
                    const isCurrentPage = page === currentPage
                    return (
                      <button
                        key={page}
                        onClick={() => handlePageChange(page)}
                        className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-1 ${
                          isCurrentPage
                            ? 'z-10 bg-primary-500 border-primary-500 text-white shadow-md'
                            : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50 hover:border-gray-400'
                        }`}
                      >
                        {page}
                      </button>
                    )
                  })}
                  <button
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="relative inline-flex items-center px-3 py-2 rounded-r-lg border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 hover:border-gray-400 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white disabled:hover:border-gray-300 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-1"
                  >
                    <span className="mr-1">Próximo</span>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </nav>
              </div>
            </div>
          </div>
        )}

        {/* Empty State */}
        {patients.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">
              {selectedPatient ? 'Nenhum paciente encontrado com esse filtro.' : 'Nenhum paciente cadastrado.'}
            </p>
          </div>
        )}
      </div>

      {/* Credit Sales Modal */}
      {showCreditModal && selectedPatientForCredits && (
        <Modal
          isOpen={showCreditModal}
          onClose={closeCreditModal}
          title="Vender Créditos"
          size="sm"
        >
          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <PatientPhoto 
                src={selectedPatientForCredits.profilePhoto} 
                alt={selectedPatientForCredits.name}
                size="sm"
              />
              <div>
                <h3 className="font-medium text-gray-900">{selectedPatientForCredits.name}</h3>
                <p className="text-sm text-gray-500">
                  Créditos atuais: {selectedPatientForCredits.availableCredits}
                </p>
              </div>
            </div>

            <div>
              <label htmlFor="creditQuantity" className="block text-sm font-medium text-gray-700 mb-2">
                Quantidade de créditos
              </label>
              <input
                type="number"
                id="creditQuantity"
                min="1"
                value={creditQuantity}
                onChange={(e) => setCreditQuantity(Number(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder="Digite a quantidade"
              />
            </div>

            {selectedPatientForCredits.consultationPrice && selectedPatientForCredits.consultationPrice > 0 && (
              <div className="bg-gray-50 p-3 rounded-md">
                <div className="flex justify-between text-sm">
                  <span>Valor unitário:</span>
                  <span>R$ {selectedPatientForCredits.consultationPrice.toFixed(2).replace('.', ',')}</span>
                </div>
                <div className="flex justify-between text-sm font-medium">
                  <span>Total:</span>
                  <span>R$ {(selectedPatientForCredits.consultationPrice * creditQuantity).toFixed(2).replace('.', ',')}</span>
                </div>
              </div>
            )}

            {(!selectedPatientForCredits.consultationPrice || selectedPatientForCredits.consultationPrice <= 0) && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
                <p className="text-sm text-yellow-800">
                  ⚠️ Valor da consulta não foi estabelecido. Não é possível calcular o total.
                </p>
              </div>
            )}

            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={closeCreditModal}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={processCreditSales}
                disabled={isProcessingCredits || creditQuantity <= 0 || !selectedPatientForCredits.consultationPrice || selectedPatientForCredits.consultationPrice <= 0}
                className="px-4 py-2 text-sm font-medium text-white bg-success-600 border border-transparent rounded-lg hover:bg-success-700 focus:outline-none focus:ring-2 focus:ring-success-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isProcessingCredits ? 'Processando...' : 'Confirmar Venda'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}