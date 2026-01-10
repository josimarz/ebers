"use client";

import { useState, useEffect } from 'react';
import { Card, CardBody, PatientPhoto } from '@/components/ui';
import { Users, Calendar, CreditCard, TrendingUp, Plus, Activity, ArrowRight } from 'lucide-react';
import Link from 'next/link';

// Types for dashboard data
type DashboardStats = {
  patients: {
    totalPatients: number;
    patientsWithCredits: number;
    patientsWithActiveConsultations: number;
  };
  consultations: {
    totalConsultations: number;
    openConsultations: number;
    finalizedConsultations: number;
    paidConsultations: number;
    unpaidConsultations: number;
  };
  financial: {
    totalPatients: number;
    patientsWithPaymentIssues: number;
    totalUnpaidConsultations: number;
    totalCreditsInSystem: number;
  };
  totalRevenue: number;
};

type RecentConsultation = {
  id: string;
  startedAt: string;
  finishedAt: string | null;
  status: string;
  patient: {
    id: string;
    name: string;
    profilePhoto: string | null;
  };
};

type RecentPatient = {
  id: string;
  name: string;
  profilePhoto: string | null;
  createdAt: string;
  credits: number;
};

type DashboardData = {
  stats: DashboardStats;
  recentConsultations: RecentConsultation[];
  recentPatients: RecentPatient[];
};

// Helper functions
const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value);
};

const formatRelativeTime = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
  
  if (diffInHours < 1) return 'Agora';
  if (diffInHours < 24) return `${diffInHours}h atrás`;
  
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays === 1) return 'Ontem';
  if (diffInDays < 7) return `${diffInDays} dias atrás`;
  
  return date.toLocaleDateString('pt-BR');
};

const getConsultationStatus = (consultation: RecentConsultation): { text: string; color: string } => {
  if (consultation.status === 'OPEN') {
    return { text: 'Em andamento', color: 'warning' };
  }
  if (consultation.status === 'FINALIZED') {
    return { text: 'Concluída', color: 'success' };
  }
  return { text: 'Agendada', color: 'primary' };
};

const getConsultationTime = (consultation: RecentConsultation): string => {
  const startTime = new Date(consultation.startedAt).toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit'
  });
  return startTime;
};

export default function DashboardContent() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const response = await fetch('/api/dashboard');
        if (!response.ok) {
          throw new Error('Erro ao carregar dados do dashboard');
        }
        
        const dashboardData = await response.json();
        setData(dashboardData);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro desconhecido');
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  if (loading) {
    return (
      <div className="space-y-8">
        <div className="animate-pulse">
          <div className="h-48 bg-gray-200 rounded-2xl mb-8"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-32 bg-gray-200 rounded-xl"></div>
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="h-64 bg-gray-200 rounded-xl"></div>
            <div className="h-64 bg-gray-200 rounded-xl"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-8">
        <Card variant="elevated" className="border-red-200">
          <CardBody>
            <div className="text-center py-8">
              <div className="text-red-500 text-lg font-semibold mb-2">
                Erro ao carregar dashboard
              </div>
              <div className="text-gray-600 mb-4">{error}</div>
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
              >
                Tentar novamente
              </button>
            </div>
          </CardBody>
        </Card>
      </div>
    );
  }

  if (!data) return null;

  const stats = [
    {
      title: 'Pacientes',
      value: data.stats.patients.totalPatients.toString(),
      change: `${data.stats.patients.patientsWithCredits} com créditos`,
      icon: Users,
      color: 'primary',
      description: 'Gerencie informações dos seus pacientes'
    },
    {
      title: 'Consultas',
      value: data.stats.consultations.totalConsultations.toString(),
      change: `${data.stats.consultations.openConsultations} em andamento`,
      icon: Calendar,
      color: 'success',
      description: 'Acompanhe suas sessões de terapia'
    },
    {
      title: 'Créditos',
      value: data.stats.financial.totalCreditsInSystem.toString(),
      change: `${data.stats.consultations.unpaidConsultations} não pagas`,
      icon: CreditCard,
      color: 'warning',
      description: 'Controle de créditos dos pacientes'
    },
    {
      title: 'Receita',
      value: formatCurrency(data.stats.totalRevenue),
      change: `${data.stats.financial.patientsWithPaymentIssues} com pendências`,
      icon: TrendingUp,
      color: 'secondary',
      description: 'Acompanhe pagamentos e pendências'
    }
  ];

  const quickActions = [
    {
      title: 'Novo Paciente',
      description: 'Cadastrar um novo paciente no sistema',
      icon: Plus,
      href: '/patients/new',
      color: 'primary'
    },
    {
      title: 'Nova Consulta',
      description: 'Iniciar uma nova sessão de terapia',
      icon: Activity,
      href: '/consultations',
      color: 'success'
    }
  ];

  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <Card variant="glass" className="overflow-hidden relative transform hover:scale-[1.02] transition-all duration-300">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 via-blue-400/5 to-blue-600/10 rounded-2xl" />
        <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-r from-[#197BBD] to-[#125E8A] opacity-10 rounded-full -translate-y-16 translate-x-16"></div>
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-r from-[#16a085] to-[#0d9488] opacity-10 rounded-full translate-y-12 -translate-x-12"></div>
        <CardBody className="relative z-10">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div className="flex-1">
              <div className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-blue-100 to-blue-50 rounded-full mb-4 shadow-md">
                <div className="w-2 h-2 bg-[#197BBD] rounded-full mr-2 animate-pulse"></div>
                <span className="text-sm font-medium text-[#125E8A]">Sistema Online</span>
              </div>
              
              <h1 className="text-4xl font-bold bg-gradient-to-r from-[#197BBD] via-[#125E8A] to-[#0c4a6e] bg-clip-text text-transparent mb-3">
                Bem-vindo ao Ebers
              </h1>
              <p className="text-lg text-gray-600 mb-6 leading-relaxed">
                Sistema de gerenciamento de pacientes e consultas para consultórios de psicologia.
                Gerencie seus pacientes, consultas e controle financeiro de forma simples e eficiente.
              </p>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-3">
              {quickActions.map((action) => {
                const Icon = action.icon;
                return (
                  <Link
                    key={action.title}
                    href={action.href as any}
                    className={`
                      group inline-flex items-center px-6 py-4 rounded-xl font-medium text-white
                      transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl
                      ${action.color === 'primary' 
                        ? 'bg-gradient-to-r from-[#197BBD] to-[#125E8A] hover:from-[#125E8A] hover:to-[#0c4a6e] hover:shadow-blue-500/25' 
                        : 'bg-gradient-to-r from-[#16a085] to-[#0d9488] hover:from-[#0d9488] hover:to-[#0f766e] hover:shadow-green-500/25'
                      }
                    `}
                  >
                    <Icon className="w-5 h-5 mr-3 group-hover:scale-110 transition-transform duration-200" />
                    <div className="text-left">
                      <div className="font-semibold">{action.title}</div>
                      <div className="text-xs opacity-90">{action.description}</div>
                    </div>
                    <ArrowRight className="w-4 h-4 ml-3 group-hover:translate-x-1 transition-transform duration-200" />
                  </Link>
                );
              })}
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          const colorClasses = {
            primary: 'from-[#197BBD] to-[#125E8A]',
            success: 'from-[#16a085] to-[#0d9488]',
            warning: 'from-[#f39c12] to-[#d97706]',
            secondary: 'from-[#125E8A] to-[#0f4c73]'
          };

          const bgColorClasses = {
            primary: 'from-blue-50 to-blue-100',
            success: 'from-green-50 to-green-100',
            warning: 'from-yellow-50 to-yellow-100',
            secondary: 'from-slate-50 to-slate-100'
          };

          return (
            <Card 
              key={stat.title} 
              variant="elevated" 
              className="group hover:scale-105 transition-all duration-300 hover:shadow-2xl relative overflow-hidden"
            >
              <div className={`absolute inset-0 bg-gradient-to-br opacity-5 ${bgColorClasses[stat.color as keyof typeof bgColorClasses]}`} />
              <CardBody className="relative z-10">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <p className="text-sm font-semibold text-gray-600 uppercase tracking-wide">
                        {stat.title}
                      </p>
                      <div className="w-1 h-1 bg-gray-400 rounded-full"></div>
                    </div>
                    <p className="text-3xl font-bold text-gray-900 mb-2">
                      {stat.value}
                    </p>
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 bg-[#16a085] rounded-full"></div>
                      <p className="text-sm text-[#16a085] font-semibold">
                        {stat.change}
                      </p>
                    </div>
                  </div>
                  <div className={`
                    p-4 rounded-2xl bg-gradient-to-br shadow-lg
                    ${colorClasses[stat.color as keyof typeof colorClasses]}
                    group-hover:shadow-xl group-hover:scale-110 transition-all duration-300
                  `}>
                    <Icon className="w-7 h-7 text-white drop-shadow-sm" />
                  </div>
                </div>
                <div className="pt-4 border-t border-gray-100">
                  <p className="text-sm text-gray-600 leading-relaxed">
                    {stat.description}
                  </p>
                </div>
              </CardBody>
            </Card>
          );
        })}
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card variant="elevated" className="hover:shadow-2xl transition-all duration-300">
          <CardBody>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-[#197BBD]" />
                Consultas Recentes
              </h3>
              <Link 
                href="/consultations" 
                className="text-sm text-[#197BBD] hover:text-[#125E8A] font-medium flex items-center gap-1 hover:gap-2 transition-all duration-200"
              >
                Ver todas
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
            <div className="space-y-4">
              {data.recentConsultations.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  Nenhuma consulta encontrada
                </div>
              ) : (
                data.recentConsultations.map((consultation) => {
                  const status = getConsultationStatus(consultation);
                  return (
                    <div key={consultation.id} className="flex items-center justify-between p-4 bg-gradient-to-r from-gray-50 to-gray-100/50 rounded-xl hover:from-gray-100 hover:to-gray-50 transition-all duration-200 group">
                      <div className="flex items-center gap-3">
                        <PatientPhoto
                          src={consultation.patient.profilePhoto}
                          alt={consultation.patient.name}
                          size="sm"
                        />
                        <div>
                          <p className="font-semibold text-gray-900 group-hover:text-[#197BBD] transition-colors duration-200">
                            {consultation.patient.name}
                          </p>
                          <div className="text-sm text-gray-500 flex items-center gap-1">
                            <div className="w-1 h-1 bg-gray-400 rounded-full"></div>
                            {getConsultationTime(consultation)}
                          </div>
                        </div>
                      </div>
                      <span className={`
                        px-3 py-1.5 rounded-full text-xs font-semibold shadow-md
                        ${status.color === 'success' ? 'bg-gradient-to-r from-green-100 to-green-200 text-green-700' :
                          status.color === 'warning' ? 'bg-gradient-to-r from-yellow-100 to-yellow-200 text-yellow-700' :
                          'bg-gradient-to-r from-blue-100 to-blue-200 text-blue-700'}
                      `}>
                        {status.text}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </CardBody>
        </Card>

        <Card variant="elevated" className="hover:shadow-2xl transition-all duration-300">
          <CardBody>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <Users className="w-5 h-5 text-[#16a085]" />
                Pacientes Recentes
              </h3>
              <Link 
                href="/patients" 
                className="text-sm text-[#197BBD] hover:text-[#125E8A] font-medium flex items-center gap-1 hover:gap-2 transition-all duration-200"
              >
                Ver todos
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
            <div className="space-y-4">
              {data.recentPatients.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  Nenhum paciente encontrado
                </div>
              ) : (
                data.recentPatients.map((patient) => (
                  <div key={patient.id} className="flex items-center justify-between p-4 bg-gradient-to-r from-gray-50 to-gray-100/50 rounded-xl hover:from-gray-100 hover:to-gray-50 transition-all duration-200 group">
                    <div className="flex items-center gap-3">
                      <PatientPhoto
                        src={patient.profilePhoto}
                        alt={patient.name}
                        size="sm"
                      />
                      <div>
                        <p className="font-semibold text-gray-900 group-hover:text-[#16a085] transition-colors duration-200">
                          {patient.name}
                        </p>
                        <div className="text-sm text-gray-500 flex items-center gap-1">
                          <div className="w-1 h-1 bg-gray-400 rounded-full"></div>
                          {formatRelativeTime(patient.createdAt)}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`
                        inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold shadow-md
                        ${patient.credits > 5 ? 'bg-gradient-to-r from-green-100 to-green-200 text-green-700' :
                          patient.credits > 0 ? 'bg-gradient-to-r from-yellow-100 to-yellow-200 text-yellow-700' :
                          'bg-gradient-to-r from-red-100 to-red-200 text-red-700'}
                      `}>
                        <CreditCard className="w-3 h-3" />
                        {patient.credits} créditos
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}