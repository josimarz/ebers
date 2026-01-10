export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-gray-200/50 bg-gradient-to-r from-white/90 to-gray-50/90 backdrop-blur-md px-6 py-4 shadow-lg">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 max-w-7xl mx-auto">
        <div className="text-sm text-text-500">
          <p className="font-medium">© {currentYear} Ebers - Sistema de Gerenciamento de Pacientes</p>
        </div>
        
        <div className="text-sm text-primary-500 font-medium">
          <p>Consultório de Psicologia</p>
        </div>
      </div>
    </footer>
  );
}