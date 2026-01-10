"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronRight, Home } from 'lucide-react';

interface BreadcrumbItem {
  label: string;
  href: string | null;
}

const pathLabels: Record<string, string> = {
  '': 'Dashboard',
  'patients': 'Pacientes',
  'new': 'Novo Paciente',
  'consultations': 'Consultas',
  'financial': 'Controle Financeiro',
};

function generateBreadcrumbs(pathname: string): BreadcrumbItem[] {
  const segments = pathname.split('/').filter(Boolean);
  const breadcrumbs: BreadcrumbItem[] = [
    { label: 'Dashboard', href: '/' }
  ];

  let currentPath = '';
  
  segments.forEach((segment, index) => {
    currentPath += `/${segment}`;
    const label = pathLabels[segment] || segment;
    
    // Don't add href for the last item (current page)
    const isLast = index === segments.length - 1;
    
    breadcrumbs.push({
      label,
      href: isLast ? null : currentPath
    });
  });

  return breadcrumbs;
}

export default function Breadcrumb() {
  const pathname = usePathname();
  const breadcrumbs = generateBreadcrumbs(pathname);

  // Don't show breadcrumb if we're on the home page
  if (pathname === '/') {
    return null;
  }

  return (
    <nav className="flex items-center space-x-2 text-sm">
      <div className="flex items-center px-3 py-1.5 bg-blue-50 rounded-lg">
        <Home className="h-4 w-4 text-primary-500 mr-2" />
        <span className="text-secondary-500 font-medium">Navegação</span>
      </div>
      
      {breadcrumbs.map((item, index) => (
        <div key={index} className="flex items-center">
          {index > 0 && (
            <ChevronRight className="mx-2 h-4 w-4 text-gray-400" />
          )}
          
          {item.href ? (
            <Link
              href={item.href as any}
              className="px-2 py-1 rounded-md hover:bg-blue-50 hover:text-primary-500 transition-all duration-200 text-text-500 hover:shadow-md"
            >
              {item.label}
            </Link>
          ) : (
            <span className="px-3 py-1.5 bg-primary-500 text-white rounded-lg font-medium shadow-md">
              {item.label}
            </span>
          )}
        </div>
      ))}
    </nav>
  );
}