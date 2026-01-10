import Link from 'next/link'

/**
 * Custom 404 page for the application
 */
export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="text-center">
        <div className="mb-8">
          <h1 className="text-9xl font-bold text-gray-300">404</h1>
        </div>
        
        <div className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-800 mb-2">
            Página não encontrada
          </h2>
          <p className="text-gray-600 max-w-md mx-auto">
            A página que você está procurando não existe ou foi movida para outro local.
          </p>
        </div>
        
        <div className="space-y-4">
          <Link
            href="/"
            className="inline-block px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
          >
            Voltar ao Início
          </Link>
          
          <div className="text-sm text-gray-500">
            <p>Ou navegue para:</p>
            <div className="mt-2 space-x-4">
              <Link href="/patients" className="text-primary hover:underline">
                Pacientes
              </Link>
              <Link href="/consultations" className="text-primary hover:underline">
                Consultas
              </Link>
              <Link href="/financial" className="text-primary hover:underline">
                Financeiro
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}