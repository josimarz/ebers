'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { ChevronLeft, ChevronRight } from 'lucide-react'

type ConsultationHistoryPaginationProps = {
  currentPage: number
  totalPages: number
  hasNextPage: boolean
  hasPreviousPage: boolean
  totalCount: number
}

export function ConsultationHistoryPagination({
  currentPage,
  totalPages,
  hasNextPage,
  hasPreviousPage,
  totalCount
}: ConsultationHistoryPaginationProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const navigateToPage = (page: number) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('page', page.toString())
    router.push(`/consultations?${params.toString()}`)
    router.refresh()
  }

  const getPageNumbers = () => {
    const pages: number[] = []
    const maxVisiblePages = 5
    
    if (totalPages <= maxVisiblePages) {
      // Show all pages if total is small
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i)
      }
    } else {
      // Show pages around current page
      const start = Math.max(1, currentPage - 2)
      const end = Math.min(totalPages, currentPage + 2)
      
      if (start > 1) {
        pages.push(1)
        if (start > 2) pages.push(-1) // Ellipsis marker
      }
      
      for (let i = start; i <= end; i++) {
        pages.push(i)
      }
      
      if (end < totalPages) {
        if (end < totalPages - 1) pages.push(-1) // Ellipsis marker
        pages.push(totalPages)
      }
    }
    
    return pages
  }

  if (totalPages <= 1) {
    return (
      <div className="flex justify-between items-center">
        <p className="text-sm text-gray-700">
          Total: {totalCount} consulta{totalCount !== 1 ? 's' : ''}
        </p>
      </div>
    )
  }

  const startItem = (currentPage - 1) * 10 + 1
  const endItem = Math.min(currentPage * 10, totalCount)

  return (
    <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
      <p className="text-sm text-gray-700">
        Mostrando {startItem} a {endItem} de {totalCount} consulta{totalCount !== 1 ? 's' : ''}
      </p>
      
      <div className="flex items-center space-x-2">
        {/* Previous Button */}
        <button
          onClick={() => navigateToPage(currentPage - 1)}
          disabled={!hasPreviousPage}
          className="flex items-center px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 hover:text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white disabled:hover:text-gray-500"
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          Anterior
        </button>

        {/* Page Numbers */}
        <div className="flex items-center space-x-1">
          {getPageNumbers().map((page, index) => {
            if (page === -1) {
              return (
                <span key={`ellipsis-${index}`} className="px-3 py-2 text-sm text-gray-500">
                  ...
                </span>
              )
            }
            
            const isCurrentPage = page === currentPage
            
            return (
              <button
                key={page}
                onClick={() => navigateToPage(page)}
                className={`px-3 py-2 text-sm font-medium rounded-lg ${
                  isCurrentPage
                    ? 'bg-primary-500 text-white'
                    : 'text-gray-700 bg-white border border-gray-300 hover:bg-gray-50'
                }`}
              >
                {page}
              </button>
            )
          })}
        </div>

        {/* Next Button */}
        <button
          onClick={() => navigateToPage(currentPage + 1)}
          disabled={!hasNextPage}
          className="flex items-center px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 hover:text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white disabled:hover:text-gray-500"
        >
          Próxima
          <ChevronRight className="h-4 w-4 ml-1" />
        </button>
      </div>
    </div>
  )
}