import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router';
import Layout from '@/react-app/components/Layout';
import AppointmentForm from '@/react-app/components/AppointmentForm';
import NotificationBanner, { useNotifications } from '@/react-app/components/NotificationBanner';
import { api, ApiError } from '@/react-app/lib/apiClient';
import { CreateAppointment } from '@/shared/types';
import {
  Calendar,
  CheckCircle,
} from 'lucide-react';

type BusinessConfig = { business_name?: string; logo_url?: string; phone?: string };

export default function Home() {
  const [searchParams] = useSearchParams();
  const tenantSlug = searchParams.get('t') || undefined;
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [config, setConfig] = useState<BusinessConfig>({});
  const { notifications, dismissNotification } = useNotifications();

  useEffect(() => {
    const qs = tenantSlug ? `?t=${tenantSlug}` : '';
    api.get<BusinessConfig>(`/business-config${qs}`).then(setConfig).catch(() => {});
  }, [tenantSlug]);

  const handleAppointmentSubmit = async (appointmentData: CreateAppointment) => {
    try {
      setLoading(true);
      const qs = tenantSlug ? `?t=${tenantSlug}` : '';
      await api.post(`/appointments${qs}`, appointmentData);
      setSuccess(true);
      setShowForm(false);
      setTimeout(() => {
        setSuccess(false);
        window.location.reload();
      }, 3000);
    } catch (error) {
      const msg = error instanceof ApiError ? error.message : 'Erro desconhecido';
      alert('Erro ao agendar: ' + msg);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <div className="bg-green-100 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="h-12 w-12 text-green-500" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Agendamento Confirmado!</h2>
            <p className="text-gray-600">
              Seu pet será muito bem cuidado. Aguarde nossa confirmação via WhatsApp.
            </p>
          </div>
        </div>
      </Layout>
    );
  }

  if (showForm) {
    return (
      <Layout>
        <div className="max-w-4xl mx-auto">
          <div className="mb-6">
            <button
              onClick={() => setShowForm(false)}
              className="text-blue-600 hover:text-blue-800 font-medium"
            >
              ← Voltar
            </button>
          </div>
          <AppointmentForm onSubmit={handleAppointmentSubmit} loading={loading} tenantSlug={tenantSlug} />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      {/* Notification Banner */}
      <NotificationBanner 
        notifications={notifications}
        onDismiss={dismissNotification}
      />
      
      {/* Hero Section */}
      <div className="text-center mb-12">
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-400/20 to-purple-400/20 rounded-3xl blur-3xl"></div>
          <div className="relative bg-white/80 backdrop-blur-sm rounded-3xl p-8 border border-blue-100">
            <div className="flex justify-center mb-6">
              {config.logo_url ? (
                <img src={config.logo_url} alt={config.business_name || 'Logo'} className="h-28 w-auto drop-shadow-md" />
              ) : (
                <img src="/logo.png" alt="PetzCare" className="h-28 w-auto drop-shadow-md" />
              )}
            </div>
            <h1 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-4">
              {config.business_name ? (
                <>{config.business_name}</>
              ) : (
                <>Cuidamos do seu pet com
                  <span className="bg-gradient-to-r from-blue-600 to-orange-500 bg-clip-text text-transparent"> carinho</span>
                </>
              )}
            </h1>
            <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
              Agende online de forma rápida e fácil. Escolha o serviço, o horário e pronto!
            </p>
            <button
              onClick={() => setShowForm(true)}
              className="bg-gradient-to-r from-blue-500 to-purple-600 text-white px-8 py-4 rounded-xl font-semibold text-lg hover:from-blue-600 hover:to-purple-700 transition-all duration-200 shadow-lg shadow-blue-500/25"
            >
              <Calendar className="inline h-5 w-5 mr-2" />
              Agendar Agora
            </button>
          </div>
        </div>
      </div>
    </Layout>
  );
}
