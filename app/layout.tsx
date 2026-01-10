import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import AppLayout from '@/components/layout/AppLayout'
import { ErrorBoundary } from '@/components/ui/ErrorBoundary'
import { ToastProvider } from '@/lib/toast-context'
import { ToastContainer } from '@/components/ui/Toast'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Ebers - Sistema de Gerenciamento de Pacientes',
  description: 'Sistema para gerenciamento de pacientes e consultas de psicologia',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-BR">
      <body className={inter.className}>
        <ToastProvider>
          <ErrorBoundary>
            <AppLayout>
              {children}
            </AppLayout>
            <ToastContainer />
          </ErrorBoundary>
        </ToastProvider>
      </body>
    </html>
  )
}