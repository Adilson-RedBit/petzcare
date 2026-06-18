import { ReactNode, useEffect, useState } from 'react';
import { Phone, Home, Dog, Cat, PawPrint } from 'lucide-react';
import { Link, useLocation, useSearchParams } from 'react-router';
import { api } from '@/react-app/lib/apiClient';

interface LayoutProps {
  children: ReactNode;
}

type BusinessConfig = {
  business_name?: string;
  phone?: string;
  logo_url?: string;
};

export default function Layout({ children }: LayoutProps) {
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const tenantSlug = searchParams.get('t');
  const [config, setConfig] = useState<BusinessConfig>({});

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const qs = tenantSlug ? `?t=${tenantSlug}` : '';
        const data = await api.get<BusinessConfig>(`/business-config${qs}`);
        if (data) setConfig(data);
      } catch (error) {
        console.error('Erro ao carregar config do negócio', error);
      }
    };

    const onUpdated = () => fetchConfig();
    window.addEventListener('business-config-updated', onUpdated);
    fetchConfig();

    return () => {
      window.removeEventListener('business-config-updated', onUpdated);
    };
  }, [tenantSlug]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Header */}
      <header className="bg-white/90 backdrop-blur-md border-b border-blue-100 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-3">
              <Link to={tenantSlug ? `/agendar?t=${tenantSlug}` : '/'} className="flex items-center space-x-3">
                {config.logo_url ? (
                  <img 
                    src={config.logo_url} 
                    alt={config.business_name || 'Logo'} 
                    className="h-10 w-10 rounded-xl object-cover border border-blue-100"
                  />
                ) : (
                  <div className="bg-gradient-to-r from-blue-500 to-purple-600 p-2 rounded-xl">
                    <PawPrint className="h-6 w-6 text-white" />
                  </div>
                )}
                <div>
                  <h1 className="text-xl font-bold text-gray-900">
                    {config.business_name || 'Nome do Negócio'}
                  </h1>
                  <p className="text-xs text-gray-500">&nbsp;</p>
                </div>
              </Link>
            </div>
            
            <nav className="flex items-center space-x-4">
              {location.pathname !== '/agendar' && (
                <Link
                  to={tenantSlug ? `/agendar?t=${tenantSlug}` : '/agendar'}
                  className="flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
                >
                  <Home className="h-4 w-4" />
                  <span className="hidden sm:inline">Início</span>
                </Link>
              )}
            </nav>

            <div className="hidden sm:flex items-center space-x-6 text-sm text-gray-700">
              <div className="flex items-center space-x-2">
                <Phone className="h-4 w-4 text-blue-500" />
                <span>{config.phone || 'Telefone não informado'}</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>

      {/* Footer */}
      <footer className="relative overflow-hidden bg-white/50 backdrop-blur-sm border-t border-blue-50 mt-16">
        <div className="absolute inset-0 pointer-events-none">
          {[
            { Icon: Dog, top: '10%', left: '8%', color: 'text-blue-400' },
            { Icon: Cat, top: '18%', left: '45%', color: 'text-purple-400' },
            { Icon: Dog, top: '35%', left: '75%', color: 'text-blue-300' },
            { Icon: Cat, top: '60%', left: '20%', color: 'text-purple-300' },
            { Icon: Dog, top: '70%', left: '55%', color: 'text-blue-500' },
            { Icon: Cat, top: '40%', left: '15%', color: 'text-purple-500' },
            { Icon: Dog, top: '25%', left: '85%', color: 'text-blue-200' },
            { Icon: Cat, top: '75%', left: '70%', color: 'text-purple-200' },
          ].map(({ Icon, top, left, color }, idx) => (
            <div
              key={idx}
              className={`absolute ${color} opacity-50`}
              style={{ top, left, transform: 'translate(-50%, -50%)' }}
            >
              <Icon className="w-16 h-16" />
            </div>
          ))}
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 relative">
          <div className="min-h-[40px]" />
        </div>
      </footer>
    </div>
  );
}
