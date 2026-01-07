import { useState } from 'react';
import Layout from '@/react-app/components/Layout';
import AppointmentForm from '@/react-app/components/AppointmentForm';
import ClientProfile from '@/react-app/components/ClientProfile';
import MyPets from '@/react-app/components/MyPets';
import NotificationBanner, { useNotifications } from '@/react-app/components/NotificationBanner';
import { CreateAppointment } from '@/shared/types';
import { 
  Calendar, 
  User,
  PawPrint
} from 'lucide-react';

type Tab = 'dados' | 'pets' | 'agendamento';

export default function Home() {
  const [activeTab, setActiveTab] = useState<Tab>('dados');
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
      
      setTimeout(() => {
        setSuccess(false);
        setActiveTab('dados'); // Voltar para a aba inicial
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

  const tabs = [
    { id: 'dados' as Tab, label: 'Meus Dados', icon: User },
    { id: 'pets' as Tab, label: 'Meus Pets', icon: PawPrint },
    { id: 'agendamento' as Tab, label: 'Agendamento', icon: Calendar },
  ];

  return (
    <Layout>
      {/* Notification Banner */}
      <NotificationBanner 
        notifications={notifications}
        onDismiss={dismissNotification}
      />

      {success && (
        <div className="mb-6 bg-green-50 border border-green-200 rounded-xl p-6 text-center">
          <div className="bg-green-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3">
            <Calendar className="h-8 w-8 text-green-600" />
          </div>
          <h3 className="text-xl font-bold text-green-900 mb-2">Agendamento Confirmado!</h3>
          <p className="text-green-700">
            Seu pet será muito bem cuidado. Aguarde nossa confirmação via WhatsApp.
          </p>
        </div>
      )}
      
      {/* Tabs Navigation */}
      <div className="mb-8">
        <div className="bg-white rounded-xl shadow-sm p-2 border border-gray-200">
          <div className="flex gap-2">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg font-semibold transition-all ${
                    activeTab === tab.id
                      ? 'bg-blue-500 text-white shadow-md'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  <span className="hidden sm:inline">{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Tab Content */}
      <div className="mb-8">
        {activeTab === 'dados' && <ClientProfile />}
        {activeTab === 'pets' && <MyPets />}
        {activeTab === 'agendamento' && (
          <AppointmentForm onSubmit={handleAppointmentSubmit} loading={loading} />
        )}
      </div>
    </Layout>
  );
}
