"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  Users, 
  Calendar, 
  DollarSign, 
  Home,
  UserPlus,
  Stethoscope
} from 'lucide-react';

const navigation = [
  {
    name: 'Dashboard',
    href: '/',
    icon: Home,
  },

  {
    name: 'Pacientes',
    href: '/patients',
    icon: Users,
  },
  {
    name: 'Novo Paciente',
    href: '/patients/new',
    icon: UserPlus,
  },
  {
    name: 'Consultas',
    href: '/consultations',
    icon: Calendar,
  },
  {
    name: 'Controle Financeiro',
    href: '/financial',
    icon: DollarSign,
  },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <div className="flex h-full w-64 flex-col bg-primary bg-gradient-to-b from-primary-500 to-secondary-500 shadow-2xl">
      {/* Logo/Brand */}
      <div className="flex h-16 items-center justify-center border-b border-white/20 bg-black/10">
        <div className="flex items-center space-x-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/20 backdrop-blur-sm">
            <Stethoscope className="h-5 w-5 text-white" />
          </div>
          <h1 className="text-xl font-bold text-white">Ebers</h1>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-2 px-3 py-6">
        {navigation.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          
          return (
            <Link
              key={item.name}
              href={item.href as any}
              className={`
                group flex items-center rounded-xl px-3 py-3 text-sm font-medium transition-all duration-200 ease-in-out
                ${
                  isActive
                    ? 'bg-secondary-500 text-white shadow-lg backdrop-blur-sm transform scale-105'
                    : 'text-blue-100 hover:bg-white/10 hover:text-white hover:transform hover:scale-105'
                }
              `}
            >
              <Icon
                className={`
                  mr-3 h-5 w-5 flex-shrink-0 transition-all duration-200
                  ${isActive ? 'text-white drop-shadow-sm' : 'text-blue-200 group-hover:text-white'}
                `}
              />
              <span className="truncate">{item.name}</span>
              {isActive && (
                <div className="ml-auto h-2 w-2 rounded-full bg-white/60 animate-pulse" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Footer info */}
      <div className="border-t border-white/20 bg-black/10 p-4">
        <div className="rounded-lg bg-white/10 p-3 backdrop-blur-sm">
          <p className="text-xs font-medium text-white">
            Sistema de Gerenciamento
          </p>
          <p className="text-xs text-blue-200">
            Consultório de Psicologia
          </p>
        </div>
      </div>
    </div>
  );
}