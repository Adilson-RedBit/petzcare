import { useState, useEffect } from 'react';
import Layout from '@/react-app/components/Layout';
import AppointmentForm from '@/react-app/components/AppointmentForm';
import NotificationBanner, { useNotifications } from '@/react-app/components/NotificationBanner';
import { CreateAppointment } from '@/shared/types';
import { 
  Calendar, 
  CheckCircle, 
  Sparkles,
  ClipboardList,
  Search,
  Clock,
  CheckCircle2,
  XCircle,
  Play
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';

interface AppointmentHistory {
  id: number;
  pet: { name: string };
  appointment_date: string;
  appointment_time: string;
  status: 'pending' | 'confirmed' | 'cancelled' | 'in_progress' | 'completed';
  services: { name: string }[];
}

export default function Home() {
  const [showForm, setShowForm] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [phone, setPhone] = useState('');
  const [history, setHistory] = useState<AppointmentHistory[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const { notifications, dismissNotification } = useNotifications();

  const fetchHistory = async () => {
    if (!phone) return;
    try {
      setLoadingHistory(true);
      const response = await fetch(`/api/appointments?phone=${encodeURIComponent(phone)}`);
      if (response.ok) {
        const data = await response.json();
        setHistory(data);
      }
    } catch (error) {
      console.error('Erro ao buscar histórico:', error);
    } finally {
      setLoadingHistory(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-green-100 text-green-800 border-green-200">Concluído</Badge>;
      case 'confirmed':
        return <Badge className="bg-blue-100 text-blue-800 border-blue-200">Confirmado</Badge>;
      case 'in_progress':
        return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200 animate-pulse">Em Andamento</Badge>;
      case 'cancelled':
        return <Badge className="bg-red-100 text-red-800 border-red-200">Cancelado</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-800 border-gray-200">Pendente</Badge>;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      case 'confirmed': return <CheckCircle className="h-5 w-5 text-blue-500" />;
      case 'in_progress': return <Play className="h-5 w-5 text-yellow-500" />;
      case 'cancelled': return <XCircle className="h-5 w-5 text-red-500" />;
      default: return <Clock className="h-5 w-5 text-gray-500" />;
    }
  };

  // ... rest of useEffect remains the same ...

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
          <AppointmentForm onSubmit={handleAppointmentSubmit} loading={loading} />
        </div>
      </Layout>
    );
  }

  if (showHistory) {
    return (
      <Layout>
        <div className="max-w-4xl mx-auto px-4">
          <div className="mb-8 flex items-center justify-between">
            <button
              onClick={() => setShowHistory(false)}
              className="text-blue-600 hover:text-blue-800 font-medium flex items-center"
            >
              ← Voltar para o início
            </button>
            <h2 className="text-2xl font-bold text-gray-900">Meus Agendamentos</h2>
          </div>

          <Card className="p-6 mb-8 border-blue-100 bg-blue-50/50">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="tel"
                  placeholder="Seu telefone (com DDD)"
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>
              <button
                onClick={fetchHistory}
                disabled={loadingHistory || !phone}
                className="bg-blue-600 text-white px-8 py-3 rounded-xl font-semibold hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {loadingHistory ? 'Buscando...' : 'Buscar Histórico'}
              </button>
            </div>
            <p className="mt-2 text-sm text-gray-500 text-center md:text-left">
              Digite seu telefone cadastrado para ver o histórico dos seus pets.
            </p>
          </Card>

          <div className="space-y-4">
            {history.length > 0 ? (
              history.map((app) => (
                <Card key={app.id} className="p-5 hover:shadow-md transition-shadow">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className="bg-blue-100 p-3 rounded-2xl">
                        {getStatusIcon(app.status)}
                      </div>
                      <div>
                        <h3 className="font-bold text-lg text-gray-900">Pet: {app.pet.name}</h3>
                        <p className="text-gray-600 text-sm flex items-center gap-2">
                          <Calendar className="h-3 w-3" /> 
                          {new Date(app.appointment_date).toLocaleDateString('pt-BR')} às {app.appointment_time}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex flex-col items-end gap-2">
                      {getStatusBadge(app.status)}
                      <div className="text-sm text-gray-500 text-right">
                        {app.services.map(s => s.name).join(', ')}
                      </div>
                    </div>
                  </div>
                </Card>
              ))
            ) : !loadingHistory && phone ? (
              <div className="text-center py-12 bg-white rounded-3xl border border-dashed border-gray-200">
                <p className="text-gray-500">Nenhum agendamento encontrado para este telefone.</p>
              </div>
            ) : null}
          </div>
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
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <button
                onClick={() => setShowForm(true)}
                className="bg-gradient-to-r from-blue-500 to-purple-600 text-white px-10 py-5 rounded-2xl font-bold text-xl hover:from-blue-600 hover:to-purple-700 transition-all duration-300 shadow-xl shadow-blue-500/25 flex items-center justify-center"
              >
                <Calendar className="h-6 w-6 mr-3" />
                Agendar Agora
              </button>
              <button
                onClick={() => setShowHistory(true)}
                className="bg-white text-gray-700 border-2 border-gray-100 px-10 py-5 rounded-2xl font-bold text-xl hover:bg-gray-50 transition-all duration-300 flex items-center justify-center"
              >
                <ClipboardList className="h-6 w-6 mr-3 text-blue-500" />
                Meus Agendamentos
              </button>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
