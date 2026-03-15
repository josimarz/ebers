import Sidebar from './Sidebar';
import Breadcrumb from './Breadcrumb';
import Footer from './Footer';

interface IpadAwareLayoutProps {
  children: React.ReactNode;
  title?: string;
  isMobile?: boolean;
}

export default function IpadAwareLayout({ children, title, isMobile = false }: IpadAwareLayoutProps) {
  return (
    <div className="flex h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 min-h-screen">
      {/* Sidebar — oculta em dispositivos móveis */}
      {!isMobile && <Sidebar />}

      {/* Main content area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Header with breadcrumb — oculto em dispositivos móveis */}
        {!isMobile && (
          <header className="bg-white/90 backdrop-blur-md border-b border-gray-200/50 px-6 py-4 shadow-lg">
            <div className="flex items-center justify-between">
              <div className="flex flex-col space-y-2">
                <Breadcrumb />
                {title && (
                  <div className="bg-gradient-to-r from-blue-50 to-blue-100 px-4 py-2 rounded-xl inline-block shadow-md">
                    <h1 className="text-2xl font-bold bg-gradient-to-r from-primary-500 to-secondary-500 bg-clip-text text-transparent">
                      {title}
                    </h1>
                  </div>
                )}
              </div>
              <div className="bg-secondary w-2 h-2 rounded-full opacity-0"></div>
            </div>
          </header>
        )}

        {/* Main content */}
        <main className="flex-1 overflow-y-auto px-6 py-6 bg-gradient-to-br from-transparent via-white/20 to-transparent">
          <div className="max-w-7xl mx-auto">
            <div className="bg-gray-50 w-full h-1 opacity-0 mb-4"></div>
            {children}
          </div>
        </main>

        {/* Footer — oculto em dispositivos móveis */}
        {!isMobile && <Footer />}
      </div>
    </div>
  );
}
