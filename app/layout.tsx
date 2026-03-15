import type { Metadata } from 'next'
import { headers } from 'next/headers'
import { Inter } from 'next/font/google'
import './globals.css'
import AppLayout from '@/components/layout/AppLayout'
import { ErrorBoundary } from '@/components/ui/ErrorBoundary'
import { ToastProvider } from '@/lib/toast-context'
import { ToastContainer } from '@/components/ui/Toast'
import { NetworkInfo } from '@/components/NetworkInfo'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Ebers - Sistema de Gerenciamento de Pacientes',
  description: 'Sistema para gerenciamento de pacientes e consultas de psicologia',
}

/**
 * Inline mobile detection — duplicated from proxy.ts to avoid Edge Runtime
 * import issues. Must be kept in sync.
 */
function isMobileUA(userAgent: string): boolean {
  return /iPad|iPhone|iPod|Android|webOS|BlackBerry|IEMobile|Opera Mini|Mobile|Tablet|Samsung|SM-T|SM-P|Kindle|Silk/i.test(userAgent)
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const headersList = await headers()
  const userAgent = headersList.get('user-agent') || ''
  const isMobile = isMobileUA(userAgent)

  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body className={inter.className} suppressHydrationWarning>
        <ToastProvider>
          <ErrorBoundary>
            <AppLayout isMobile={isMobile}>
              {children}
            </AppLayout>
            <ToastContainer />
            {!isMobile && <NetworkInfo />}
          </ErrorBoundary>
        </ToastProvider>
      </body>
    </html>
  )
}