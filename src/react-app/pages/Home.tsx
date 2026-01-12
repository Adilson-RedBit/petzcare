import { useState, useEffect } from 'react';
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
  const [showForm, setShowForm] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>('dados');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [_professionalInfo, setProfessionalInfo] = useState<any>(null);
  const { notifications, dismissNotification} = useNotifications();

  // Capturar código de referência da URL e buscar informações do profissional
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const refCode = urlParams.get('ref');
    
    if (refCode) {
      fetch(`/api/professional/referral-info?code=${refCode}`)
        .then(res => res.json())
        .then(data => {
          if (data.professionalId) {
            localStorage.setItem('professional_id', data.professionalId.toString());
            localStorage.setItem('professional_name', data.professionalName || '');
            localStorage.setItem('business_name', data.businessName || '');
            setProfessionalInfo(data);
          }
        })
        .catch(err => console.error('Erro ao buscar informações do profissional:', err));
    } else {
      // Tentar carregar do localStorage se já existe
      const savedProfId = localStorage.getItem('professional_id');
      if (savedProfId) {
        setProfessionalInfo({
          professionalId: parseInt(savedProfId),
          professionalName: localStorage.getItem('professional_name') || '',
          businessName: localStorage.getItem('business_name') || ''
        });
      }
    }
  }, []);

  // Função para abrir o formulário na aba correta
  const handleStartBooking = () => {
    // Verificar se há dados do cliente salvos
    const savedData = localStorage.getItem('client_data');
    if (savedData) {
      try {
        const clientData = JSON.parse(savedData);
        // Se tem nome e telefone cadastrados, abre direto em "Meus Pets"
        if (clientData.name && clientData.phone) {
          setActiveTab('pets');
        } else {
          setActiveTab('dados');
        }
      } catch {
        setActiveTab('dados');
      }
    } else {
      setActiveTab('dados');
    }
    setShowForm(true);
  };

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
        setShowForm(false); // Voltar para a tela inicial
        setActiveTab('dados');
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

      {!showForm ? (
        /* Tela de Apresentação Inicial */
        <div className="text-center max-w-3xl mx-auto">
          <div className="mb-8">
            <div className="inline-flex items-center justify-center w-24 h-24 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full mb-6 shadow-xl">
              <PawPrint className="h-12 w-12 text-white" />
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              Cuidado especial para seu pet
            </h1>
            <p className="text-xl text-gray-600 mb-8">
              Agende banho, tosa e outros serviços de forma rápida e prática
            </p>
          </div>

          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8 mb-12 max-w-md mx-auto">
            <ul className="space-y-4 text-left">
              <li className="flex items-center text-gray-700">
                <span className="text-green-500 text-2xl mr-3">✓</span>
                <span className="text-lg font-medium">Agendamento Fácil</span>
              </li>
              <li className="flex items-center text-gray-700">
                <span className="text-green-500 text-2xl mr-3">✓</span>
                <span className="text-lg font-medium">Profissionais Qualificados</span>
              </li>
              <li className="flex items-center text-gray-700">
                <span className="text-green-500 text-2xl mr-3">✓</span>
                <span className="text-lg font-medium">Atendimento Personalizado</span>
              </li>
            </ul>
          </div>

          <button
            onClick={handleStartBooking}
            className="bg-gradient-to-r from-blue-500 to-purple-600 text-white px-12 py-4 rounded-full text-lg font-bold shadow-2xl hover:shadow-3xl transform hover:scale-105 transition-all duration-300"
          >
            Agendar Agora
          </button>
        </div>
      ) : (
        /* Área de Formulários com Abas */
        <>
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
        </>
      )}
    </Layout>
  );
}
