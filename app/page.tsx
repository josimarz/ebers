import { Card, CardBody } from '@/components/ui';
import { Users, Calendar, CreditCard, TrendingUp, Plus, Activity, ArrowRight } from 'lucide-react';
import Link from 'next/link';

export default function Home() {
  const stats = [
    {
      title: 'Pacientes',
      value: '127',
      change: '+12%',
      icon: Users,
      color: 'primary',
      description: 'Gerencie informações dos seus pacientes'
    },
    {
      title: 'Consultas',
      value: '48',
      change: '+8%',
      icon: Calendar,
      color: 'success',
      description: 'Acompanhe suas sessões de terapia'
    },
    {
      title: 'Créditos',
      value: '324',
      change: '+15%',
      icon: CreditCard,
      color: 'warning',
      description: 'Controle de créditos dos pacientes'
    },
    {
      title: 'Receita',
      value: 'R$ 12.5k',
      change: '+23%',
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
                        {stat.change} este mês
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
              {[
                { patient: 'Maria Silva', time: '14:00', status: 'Concluída', color: 'success' },
                { patient: 'João Santos', time: '15:30', status: 'Em andamento', color: 'warning' },
                { patient: 'Ana Costa', time: '16:00', status: 'Agendada', color: 'primary' }
              ].map((consultation, index) => (
                <div key={index} className="flex items-center justify-between p-4 bg-gradient-to-r from-gray-50 to-gray-100/50 rounded-xl hover:from-gray-100 hover:to-gray-50 transition-all duration-200 group">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-100 to-blue-200 rounded-full flex items-center justify-center">
                      <span className="text-sm font-bold text-[#197BBD]">
                        {consultation.patient.split(' ').map(n => n[0]).join('')}
                      </span>
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900 group-hover:text-[#197BBD] transition-colors duration-200">
                        {consultation.patient}
                      </p>
                      <div className="text-sm text-gray-500 flex items-center gap-1">
                        <div className="w-1 h-1 bg-gray-400 rounded-full"></div>
                        {consultation.time}
                      </div>
                    </div>
                  </div>
                  <span className={`
                    px-3 py-1.5 rounded-full text-xs font-semibold shadow-md
                    ${consultation.color === 'success' ? 'bg-gradient-to-r from-green-100 to-green-200 text-green-700' :
                      consultation.color === 'warning' ? 'bg-gradient-to-r from-yellow-100 to-yellow-200 text-yellow-700' :
                      'bg-gradient-to-r from-blue-100 to-blue-200 text-blue-700'}
                  `}>
                    {consultation.status}
                  </span>
                </div>
              ))}
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
              {[
                { name: 'Carlos Oliveira', date: 'Hoje', credits: 5, color: 'success' },
                { name: 'Lucia Ferreira', date: 'Ontem', credits: 2, color: 'warning' },
                { name: 'Pedro Almeida', date: '2 dias atrás', credits: 8, color: 'primary' }
              ].map((patient, index) => (
                <div key={index} className="flex items-center justify-between p-4 bg-gradient-to-r from-gray-50 to-gray-100/50 rounded-xl hover:from-gray-100 hover:to-gray-50 transition-all duration-200 group">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-green-100 to-green-200 rounded-full flex items-center justify-center">
                      <span className="text-sm font-bold text-[#16a085]">
                        {patient.name.split(' ').map(n => n[0]).join('')}
                      </span>
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900 group-hover:text-[#16a085] transition-colors duration-200">
                        {patient.name}
                      </p>
                      <div className="text-sm text-gray-500 flex items-center gap-1">
                        <div className="w-1 h-1 bg-gray-400 rounded-full"></div>
                        {patient.date}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`
                      inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold shadow-md
                      ${patient.color === 'success' ? 'bg-gradient-to-r from-green-100 to-green-200 text-green-700' :
                        patient.color === 'warning' ? 'bg-gradient-to-r from-yellow-100 to-yellow-200 text-yellow-700' :
                        'bg-gradient-to-r from-blue-100 to-blue-200 text-blue-700'}
                    `}>
                      <CreditCard className="w-3 h-3" />
                      {patient.credits} créditos
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  )
}