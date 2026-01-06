import { useState } from 'react';
import Layout from '@/react-app/components/Layout';
import AppointmentForm from '@/react-app/components/AppointmentForm';
import NotificationBanner, { useNotifications } from '@/react-app/components/NotificationBanner';
import { CreateAppointment } from '@/shared/types';
import { 
  Calendar, 
  Sparkles
} from 'lucide-react';

export default function Home() {
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const { notifications, dismissNotification } = useNotifications();

  const handleAppointmentSubmit = async (appointmentData: CreateAppointment) => {
    try {
      setLoading(true);
      
      const response = await fetch('/api/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(appointmentData),
      });

      if (!response.ok) throw new Error('Erro ao agendar');

      setSuccess(true);
      setShowForm(false);
      
      setTimeout(() => {
        setSuccess(false);
        window.location.reload();
      }, 3000);
    } catch (error) {
      alert('Erro ao agendar: ' + (error instanceof Error ? error.message : 'Erro desconhecido'));
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
              <Calendar className="h-12 w-12 text-green-500" />
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
          <AppointmentForm onSubmit={handleAppointmentSubmit} loading={loading} />
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
          <div className="relative bg-white/80 backdrop-blur-sm rounded-3xl p-8 border border-blue-100 shadow-xl">
            <div className="flex justify-center mb-6">
              <div className="bg-gradient-to-r from-pink-500 to-purple-600 p-4 rounded-3xl rotate-12">
                <Sparkles className="h-10 w-10 text-white" />
              </div>
            </div>
            <h1 className="text-4xl lg:text-6xl font-extrabold text-gray-900 mb-6 tracking-tight">
              Cuidamos do seu pet com
              <span className="bg-gradient-to-r from-pink-500 to-purple-600 bg-clip-text text-transparent"> carinho</span>
            </h1>
            <p className="text-xl text-gray-600 mb-10 max-w-3xl mx-auto leading-relaxed">
              Serviços profissionais de banho e tosa para deixar seu pet sempre limpo, 
              cheiroso e lindinho. Agende agora mesmo!
            </p>
            <div className="flex justify-center">
              <button
                onClick={() => setShowForm(true)}
                className="bg-gradient-to-r from-blue-500 to-purple-600 text-white px-10 py-5 rounded-2xl font-bold text-xl hover:from-blue-600 hover:to-purple-700 transition-all duration-300 shadow-xl shadow-blue-500/25 flex items-center justify-center"
              >
                <Calendar className="h-6 w-6 mr-3" />
                Agendar Agora
              </button>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
