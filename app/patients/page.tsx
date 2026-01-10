"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { PatientPhoto, Button, Card, CardBody, Input } from '@/components/ui';
import { Search, UserPlus, Filter, Users } from 'lucide-react';
import { useToast } from '@/lib/toast-context';

// Types for patient data with consultation status
type PatientWithConsultationStatus = {
  id: string;
  name: string;
  profilePhoto: string | null;
  age: number;
  phone1: string;
  consultationFrequency: string | null;
  consultationDay: string | null;
  credits: number;
  hasActiveConsultation?: boolean;
};

type PatientListResponse = {
  patients: PatientWithConsultationStatus[];
  totalCount: number;
  totalPages: number;
  currentPage: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
};

// Column type for table definition
type Column<T> = {
  key: keyof T | string;
  label: string;
  sortable?: boolean;
  render?: (value: any, item: T) => React.ReactNode;
  className?: string;
};

// Helper function to format consultation frequency
const formatFrequency = (frequency: string | null): string => {
  if (!frequency) return '-';
  
  const frequencyMap: Record<string, string> = {
    'WEEKLY': 'Semanal',
    'BIWEEKLY': 'Quinzenal', 
    'MONTHLY': 'Mensal',
    'SPORADIC': 'Esporádica'
  };
  
  return frequencyMap[frequency] || frequency;
};

// Helper function to format consultation day
const formatDay = (day: string | null): string => {
  if (!day) return '-';
  
  const dayMap: Record<string, string> = {
    'MONDAY': 'Segunda',
    'TUESDAY': 'Terça',
    'WEDNESDAY': 'Quarta',
    'THURSDAY': 'Quinta',
    'FRIDAY': 'Sexta',
    'SATURDAY': 'Sábado',
    'SUNDAY': 'Domingo'
  };
  
  return dayMap[day] || day;
};

export default function PatientsPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const [patients, setPatients] = useState<PatientWithConsultationStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [sortBy, setSortBy] = useState<'name' | 'age'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Fetch patients data
  const fetchPatients = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '10',
        sortBy,
        sortOrder,
        ...(searchTerm && { search: searchTerm })
      });

      const response = await fetch(`/api/patients?${params}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao carregar pacientes');
      }

      const data: PatientListResponse = await response.json();
      
      setPatients(data.patients);
      setTotalPages(data.totalPages);
      setTotalCount(data.totalCount);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setLoading(false);
    }
  };

  // Handle search with debouncing
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setCurrentPage(1); // Reset to first page when searching
      fetchPatients();
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchTerm]);

  // Fetch data when dependencies change (excluding searchTerm to avoid double calls)
  useEffect(() => {
    fetchPatients();
  }, [currentPage, sortBy, sortOrder]);

  // Handle creating new consultation
  const handleNewConsultation = async (patientId: string) => {
    try {
      const response = await fetch('/api/consultations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ patientId }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao criar consulta');
      }

      const consultation = await response.json();
      
      // Navigate to consultation page
      router.push(`/consultations/${consultation.id}` as any);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Erro ao criar consulta', 'error');
    }
  };

  // Handle accessing existing consultation
  const handleAccessConsultation = async (patientId: string) => {
    try {
      const response = await fetch(`/api/patients/${patientId}/active-consultation`);
      
      if (!response.ok) {
        throw new Error('Consulta não encontrada');
      }

      const consultation = await response.json();
      router.push(`/consultations/${consultation.id}` as any);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Erro ao acessar consulta', 'error');
    }
  };

  // Handle edit patient
  const handleEditPatient = (patientId: string) => {
    router.push(`/patients/${patientId}` as any);
  };

  // Define table columns
  const columns: Column<PatientWithConsultationStatus>[] = [
    {
      key: 'profilePhoto',
      label: '',
      render: (_, patient) => (
        <PatientPhoto
          src={patient.profilePhoto}
          alt={patient.name}
          size="sm"
        />
      ),
      className: 'w-8'
    },
    {
      key: 'name',
      label: 'Nome',
      sortable: true,
      className: 'font-medium w-40'
    },
    {
      key: 'age',
      label: 'Idade',
      sortable: true,
      render: (age) => `${age} anos`,
      className: 'text-center w-24'
    },
    {
      key: 'phone1',
      label: 'Telefone',
      className: 'w-36'
    },
    {
      key: 'consultationFrequency',
      label: 'Periodicidade',
      render: (frequency) => formatFrequency(frequency),
      className: 'text-center w-28'
    },
    {
      key: 'consultationDay',
      label: 'Dia da Semana',
      render: (day) => formatDay(day),
      className: 'text-center w-36'
    },
    {
      key: 'credits',
      label: 'Créditos',
      render: (credits) => credits.toString(),
      className: 'text-center w-12'
    },
    {
      key: 'actions',
      label: 'Ações',
      render: (_, patient) => (
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="secondary"
            onClick={(e) => {
              e.stopPropagation();
              handleEditPatient(patient.id);
            }}
          >
            Editar
          </Button>
          {patient.hasActiveConsultation ? (
            <Button
              size="sm"
              variant="primary"
              onClick={(e) => {
                e.stopPropagation();
                handleAccessConsultation(patient.id);
              }}
            >
              Consulta
            </Button>
          ) : (
            <Button
              size="sm"
              variant="success"
              onClick={(e) => {
                e.stopPropagation();
                handleNewConsultation(patient.id);
              }}
            >
              Nova Consulta
            </Button>
          )}
        </div>
      ),
      className: 'w-60'
    }
  ];

  // Handle table sorting
  const handleSort = (columnKey: string) => {
    if (columnKey === 'name' || columnKey === 'age') {
      if (sortBy === columnKey) {
        setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
      } else {
        setSortBy(columnKey as 'name' | 'age');
        setSortOrder('asc');
      }
      setCurrentPage(1);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardBody>
            <div className="flex items-center justify-center py-8">
              <div className="text-gray-500">Carregando pacientes...</div>
            </div>
          </CardBody>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <Card>
          <CardBody>
            <div className="flex items-center justify-center py-8">
              <div className="text-red-600">Erro: {error}</div>
            </div>
          </CardBody>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary-600 to-primary-500 bg-clip-text text-transparent">
            Lista de Pacientes
          </h1>
          <p className="text-gray-600 mt-1">
            Gerencie e acompanhe todos os seus pacientes
          </p>
        </div>
        <Button
          onClick={() => router.push('/patients/new' as any)}
          variant="primary"
          size="lg"
          className="shadow-glow"
        >
          <UserPlus className="w-5 h-5 mr-2" />
          Novo Paciente
        </Button>
      </div>

      {/* Search and Filters */}
      <Card variant="elevated">
        <CardBody>
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
            <div className="flex-1 w-full">
              <Input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Digite o nome do paciente..."
                icon={<Search className="w-4 h-4" />}
                className="w-full"
              />
            </div>
            
            <div className="flex items-center gap-4">
              <div className="flex items-center px-4 py-2 bg-primary-50 rounded-xl">
                <Filter className="w-4 h-4 text-primary-600 mr-2" />
                <span className="text-sm font-medium text-primary-700">
                  {totalCount} paciente{totalCount !== 1 ? 's' : ''} encontrado{totalCount !== 1 ? 's' : ''}
                </span>
              </div>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Patient Table */}
      <Card variant="elevated">
        {/* Custom table with server-side sorting */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                {columns.map((column) => (
                  <th
                    key={String(column.key)}
                    className={`px-6 py-4 text-left text-sm font-semibold text-gray-700 bg-gradient-soft ${
                      column.sortable ? 'cursor-pointer hover:bg-gray-100 transition-colors' : ''
                    } ${column.className || ''}`}
                    onClick={() => column.sortable && handleSort(String(column.key))}
                  >
                    <div className="flex items-center gap-2">
                      {column.label}
                      {column.sortable && (
                        <span className="text-gray-400">
                          {sortBy === column.key ? (
                            sortOrder === 'asc' ? (
                              <span className="text-primary-600">↑</span>
                            ) : (
                              <span className="text-primary-600">↓</span>
                            )
                          ) : (
                            '↕'
                          )}
                        </span>
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {patients.map((patient, index) => (
                <tr
                  key={patient.id}
                  className="hover:bg-gradient-to-r hover:from-primary-50/50 hover:to-transparent cursor-pointer transition-all duration-200 group"
                  onClick={() => handleEditPatient(patient.id)}
                >
                  {columns.map((column) => {
                    const value = patient[column.key as keyof PatientWithConsultationStatus];
                    return (
                      <td
                        key={String(column.key)}
                        className={`px-6 py-4 text-sm text-gray-900 ${column.className || ''}`}
                      >
                        {column.render ? column.render(value, patient) : String(value ?? '')}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Empty state */}
        {patients.length === 0 && (
          <div className="text-center py-12">
            <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhum paciente encontrado</h3>
            <p className="text-gray-500 mb-6">Comece adicionando seu primeiro paciente ao sistema.</p>
            <Button
              onClick={() => router.push('/patients/new' as any)}
              variant="primary"
            >
              <UserPlus className="w-4 h-4 mr-2" />
              Adicionar Paciente
            </Button>
          </div>
        )}
        
        {/* Custom Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between p-6 border-t border-gray-200 bg-gradient-soft">
            <div className="text-sm text-gray-700 font-medium">
              Página {currentPage} de {totalPages}
            </div>
            
            <div className="flex items-center gap-2">
              <Button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                variant="outline"
                size="sm"
              >
                Anterior
              </Button>
              
              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let page;
                  if (totalPages <= 5) {
                    page = i + 1;
                  } else if (currentPage <= 3) {
                    page = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    page = totalPages - 4 + i;
                  } else {
                    page = currentPage - 2 + i;
                  }
                  
                  return (
                    <Button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      variant={currentPage === page ? 'primary' : 'ghost'}
                      size="sm"
                      className="min-w-[2.5rem]"
                    >
                      {page}
                    </Button>
                  );
                })}
              </div>
              
              <Button
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                variant="outline"
                size="sm"
              >
                Próxima
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}