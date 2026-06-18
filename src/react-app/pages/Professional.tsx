import { useState } from 'react';
import Layout from '@/react-app/components/Layout';
import { useAppointments } from '@/react-app/hooks/useApi';
import { useAuth } from '@/react-app/hooks/useAuth';
import { useAppointmentNotification } from '@/react-app/hooks/useAppointmentNotification';
import { api, ApiError } from '@/react-app/lib/apiClient';
import { AppointmentWithDetails } from '@/shared/types';
import ServiceConfiguration from '@/react-app/components/ServiceConfiguration';
import ScheduleConfiguration from '@/react-app/components/ScheduleConfiguration';
import BusinessConfiguration from '@/react-app/components/BusinessConfiguration';
import CrmPanel from '@/react-app/components/CrmPanel';
import BookingLinkBanner from '@/react-app/components/BookingLinkBanner';
import {
  Calendar,
  Clock,
  Phone,
  Mail,
  PawPrint,
  CheckCircle,
  PlayCircle,
  XCircle,
  AlertCircle,
  User,
  DollarSign,
  MessageSquare,
  Settings,
  Briefcase,
  Wrench,
  Link,
  Copy,
  Bell,
  BellOff,
  Users,
} from 'lucide-react';

export default function Professional() {
  // Auth real via cookie httpOnly (sem senha no localStorage)
  const { user, loading: authLoading, login, register, logout, error: authError } = useAuth();

  // Login form
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [loggingIn, setLoggingIn] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const [mode, setMode] = useState<'login' | 'register' | 'forgot'>('login');
  const [registerName, setRegisterName] = useState('');

  // Reset de senha
  const [resetEmail, setResetEmail] = useState('');
  const [resetSent, setResetSent] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);

  const [activeTab, setActiveTab] = useState('agenda');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const { appointments, updateAppointmentStatus, loading } = useAppointments(selectedDate);
  const [updatingStatus, setUpdatingStatus] = useState<number | null>(null);
  const [confirmingAppointment, setConfirmingAppointment] = useState<number | null>(null);

  const { permission: notifPerm, requestPermission } = useAppointmentNotification(!!user);

  const tabs = [
    { id: 'agenda', label: 'Agenda', icon: Calendar },
    { id: 'clients', label: 'Clientes', icon: Users },
    { id: 'services', label: 'Serviços', icon: Wrench },
    { id: 'schedule', label: 'Horários', icon: Clock },
    { id: 'business', label: 'Negócio', icon: Briefcase },
  ];

  const handleForgotPassword = async () => {
    setLocalError(null);
    if (!resetEmail.trim()) {
      setLocalError('Informe seu email.');
      return;
    }
    setResetLoading(true);
    try {
      await api.post('/auth/reset-request', { email: resetEmail.trim().toLowerCase() });
      setResetSent(true);
    } catch (err) {
      setLocalError(err instanceof ApiError ? err.message : 'Erro ao enviar email.');
    } finally {
      setResetLoading(false);
    }
  };

  const handleLogin = async () => {
    setLocalError(null);
    if (!authEmail.trim() || !authPassword) {
      setLocalError('Preencha email e senha.');
      return;
    }
    setLoggingIn(true);
    try {
      await login(authEmail.trim().toLowerCase(), authPassword);
    } catch (err) {
      setLocalError(err instanceof ApiError ? err.message : 'Erro ao fazer login.');
    } finally {
      setLoggingIn(false);
    }
  };

  const handleRegister = async () => {
    setLocalError(null);
    if (!authEmail.trim() || !authPassword || !registerName.trim()) {
      setLocalError('Preencha nome, email e senha.');
      return;
    }
    if (authPassword.length < 8) {
      setLocalError('Senha deve ter no mínimo 8 caracteres.');
      return;
    }
    setLoggingIn(true);
    try {
      await register(authEmail.trim().toLowerCase(), authPassword, registerName.trim());
    } catch (err) {
      setLocalError(err instanceof ApiError ? err.message : 'Erro ao criar conta.');
    } finally {
      setLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    await logout();
  };

  const handleStatusUpdate = async (appointmentId: number, newStatus: string) => {
    try {
      setUpdatingStatus(appointmentId);
      await updateAppointmentStatus(appointmentId, newStatus);
    } catch (error) {
      alert('Erro ao atualizar status: ' + (error instanceof Error ? error.message : 'Erro desconhecido'));
    } finally {
      setUpdatingStatus(null);
    }
  };

  const handleConfirmAppointment = async (appointmentId: number) => {
    try {
      setConfirmingAppointment(appointmentId);
      await api.patch(`/appointments/${appointmentId}/confirm`);
      await updateAppointmentStatus(appointmentId, 'confirmado');
      alert('Agendamento confirmado! Cliente foi notificado.');
    } catch (error) {
      const msg = error instanceof ApiError ? error.message : 'Erro desconhecido';
      alert('Erro ao confirmar agendamento: ' + msg);
    } finally {
      setConfirmingAppointment(null);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'agendado': return <Calendar className="h-5 w-5" />;
      case 'confirmado': return <CheckCircle className="h-5 w-5" />;
      case 'em_andamento': return <PlayCircle className="h-5 w-5" />;
      case 'concluido': return <CheckCircle className="h-5 w-5" />;
      case 'cancelado': return <XCircle className="h-5 w-5" />;
      default: return <AlertCircle className="h-5 w-5" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'agendado': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'confirmado': return 'bg-green-100 text-green-800 border-green-200';
      case 'em_andamento': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'concluido': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'cancelado': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'agendado': return 'Agendado';
      case 'confirmado': return 'Confirmado';
      case 'em_andamento': return 'Em Andamento';
      case 'concluido': return 'Concluído';
      case 'cancelado': return 'Cancelado';
      default: return status;
    }
  };

  const statusOptions = [
    { value: 'agendado', label: 'Agendado' },
    { value: 'confirmado', label: 'Confirmado' },
    { value: 'em_andamento', label: 'Em Andamento' },
    { value: 'concluido', label: 'Concluído' },
    { value: 'cancelado', label: 'Cancelado' },
  ];

  // Aguarda primeira validação de sessão
  if (authLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </Layout>
    );
  }

  if (!user) {
    const modeLabel =
      mode === 'login' ? 'Faça login para acessar o painel.' :
      mode === 'register' ? 'Crie sua conta de profissional.' :
      'Redefinição de senha';

    return (
      <Layout>
        <div className="max-w-md mx-auto bg-white rounded-2xl shadow-xl p-8 mt-12">
          <div className="flex items-center space-x-3 mb-6">
            <div className="bg-gradient-to-r from-blue-500 to-purple-600 p-3 rounded-xl">
              <Briefcase className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Área do Profissional</h1>
              <p className="text-gray-600 text-sm">{modeLabel}</p>
            </div>
          </div>

          {/* Modo: Esqueci minha senha */}
          {mode === 'forgot' && (
            <div className="space-y-4">
              {resetSent ? (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-sm text-green-800">
                  Email enviado! Verifique sua caixa de entrada e clique no link para redefinir sua senha.
                </div>
              ) : (
                <>
                  <p className="text-sm text-gray-600">
                    Informe o email da sua conta e enviaremos um link para redefinir a senha.
                  </p>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                    <input
                      type="email"
                      value={resetEmail}
                      onChange={(e) => setResetEmail(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleForgotPassword()}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="seu@email.com"
                      autoComplete="email"
                    />
                  </div>
                  {localError && <p className="text-sm text-red-600">{localError}</p>}
                  <button
                    onClick={handleForgotPassword}
                    disabled={resetLoading}
                    className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50"
                  >
                    {resetLoading ? 'Enviando…' : 'Enviar link'}
                  </button>
                </>
              )}
              <div className="text-center text-sm">
                <button
                  onClick={() => { setMode('login'); setLocalError(null); setResetSent(false); }}
                  className="text-blue-600 hover:underline font-semibold"
                >
                  ← Voltar para o login
                </button>
              </div>
            </div>
          )}

          {/* Modo: Login / Cadastro */}
          {mode !== 'forgot' && (
            <div className="space-y-4">
              {mode === 'register' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nome</label>
                  <input
                    type="text"
                    value={registerName}
                    onChange={(e) => setRegisterName(e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Seu nome"
                    autoComplete="name"
                  />
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  value={authEmail}
                  onChange={(e) => setAuthEmail(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (mode === 'login' ? handleLogin() : handleRegister())}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="seu@email.com"
                  autoComplete="email"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Senha</label>
                <input
                  type="password"
                  value={authPassword}
                  onChange={(e) => setAuthPassword(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (mode === 'login' ? handleLogin() : handleRegister())}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder={mode === 'register' ? 'Mín. 8 caracteres' : 'Sua senha'}
                  autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                />
              </div>

              {(localError || authError) && (
                <p className="text-sm text-red-600">{localError || authError}</p>
              )}

              <button
                onClick={mode === 'login' ? handleLogin : handleRegister}
                disabled={loggingIn}
                className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loggingIn ? 'Aguarde...' : mode === 'login' ? 'Entrar' : 'Criar conta'}
              </button>

              <div className="flex flex-col items-center gap-2 text-sm text-gray-600">
                {mode === 'login' ? (
                  <>
                    <div>
                      Ainda não tem conta?{' '}
                      <button
                        onClick={() => { setMode('register'); setLocalError(null); }}
                        className="text-blue-600 hover:underline font-semibold"
                      >
                        Criar conta
                      </button>
                    </div>
                    <button
                      onClick={() => { setMode('forgot'); setLocalError(null); setResetEmail(authEmail); }}
                      className="text-gray-400 hover:text-gray-600 hover:underline text-xs"
                    >
                      Esqueci minha senha
                    </button>
                  </>
                ) : (
                  <div>
                    Já tem conta?{' '}
                    <button
                      onClick={() => { setMode('login'); setLocalError(null); }}
                      className="text-blue-600 hover:underline font-semibold"
                    >
                      Fazer login
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </Layout>
    );
  }

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      {/* Header */}
      <div className="bg-white rounded-2xl shadow-xl p-6 mb-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <div className="bg-gradient-to-r from-blue-500 to-purple-600 p-3 rounded-xl">
              <Settings className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Painel Profissional</h1>
              <p className="text-gray-600">Gerencie sua agenda e configurações</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-3 flex-wrap gap-y-2">
            <span className="text-sm text-gray-600 hidden sm:inline">
              {user.name} <span className="text-gray-400">({user.email})</span>
            </span>

            {/* Botão de notificações */}
            {notifPerm === 'granted' ? (
              <span className="flex items-center gap-1 text-xs text-green-600 bg-green-50 px-2 py-1 rounded-full">
                <Bell className="h-3 w-3" /> Ativas
              </span>
            ) : notifPerm === 'denied' ? (
              <span className="flex items-center gap-1 text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded-full">
                <BellOff className="h-3 w-3" /> Bloqueadas
              </span>
            ) : (
              <button
                onClick={requestPermission}
                className="flex items-center gap-1 text-xs text-blue-600 bg-blue-50 hover:bg-blue-100 px-2 py-1 rounded-full transition-colors"
                title="Ativar alertas sonoros de novos agendamentos"
              >
                <Bell className="h-3 w-3" /> Ativar alertas
              </button>
            )}

            <button
              onClick={handleLogout}
              className="text-sm text-red-600 hover:text-red-700 font-semibold"
            >
              Sair
            </button>
            {activeTab === 'agenda' && (
              <div className="text-sm text-gray-600">
                <span className="font-medium">Total do dia:</span>
                <span className="ml-2 font-bold text-green-600">
                  R$ {appointments.reduce((sum, apt) => sum + (apt.total_price || 0), 0).toFixed(2)}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Booking link */}
        <BookingLinkBanner />

        {/* Navigation Tabs */}
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-1 bg-gray-100 p-1 rounded-lg">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center justify-center space-x-2 px-3 py-2 rounded-lg font-medium transition-all ${
                activeTab === tab.id
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200'
              }`}
            >
              <tab.icon className="h-4 w-4 shrink-0" />
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'agenda' && (
        <div>
          {/* Link de Agendamento */}
          <div className="bg-white rounded-2xl shadow-xl p-5 mb-6 flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className="bg-blue-100 p-2 rounded-lg shrink-0">
                <Link className="h-5 w-5 text-blue-600" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-700">Link de Agendamento</p>
                <p className="text-xs text-gray-400 truncate">Envie este link para seus clientes agendarem</p>
              </div>
            </div>
            <div className="flex gap-2 shrink-0">
              <button
                onClick={() => {
                  navigator.clipboard.writeText('https://petzcare.org/');
                  alert('Link copiado!');
                }}
                className="flex items-center gap-1.5 px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <Copy className="h-4 w-4" />
                Copiar link
              </button>
              <a
                href={`https://wa.me/?text=${encodeURIComponent('Olá! Clique no link abaixo para agendar seu horário comigo:\nhttps://petzcare.org/')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-3 py-2 text-sm bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
              >
                <MessageSquare className="h-4 w-4" />
                Enviar pelo WhatsApp
              </a>
            </div>
          </div>

          {/* Date Selector for Agenda */}
          <div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
            <div className="flex items-center space-x-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Calendar className="inline h-4 w-4 mr-1" />
                  Selecionar Data
                </label>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              <div className="text-sm text-gray-600">
                <span className="font-medium">{appointments.length}</span> agendamentos
              </div>
            </div>
          </div>

      {/* Appointments List */}
          {appointments.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
              <div className="bg-gray-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Calendar className="h-8 w-8 text-gray-400" />
              </div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Nenhum agendamento</h2>
              <p className="text-gray-600">Não há agendamentos para esta data.</p>
            </div>
          ) : (
        <div className="space-y-4">
              {appointments.map((appointment: AppointmentWithDetails) => (
            <div key={appointment.id} className="bg-white rounded-2xl shadow-xl overflow-hidden">
              {/* Header */}
              <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-4 border-b border-gray-100">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="bg-gradient-to-r from-pink-400 to-purple-500 w-12 h-12 rounded-xl flex items-center justify-center">
                      <PawPrint className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">{appointment.pet.name}</h3>
                      <p className="text-sm text-gray-600">
                        {appointment.pet.breed || 'SRD'} • Porte {appointment.pet.size}
                        {appointment.pet.age_years && ` • ${appointment.pet.age_years} anos`}
                        {appointment.pet.weight_kg && ` • ${appointment.pet.weight_kg}kg`}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-4">
                    <div className="text-right">
                      <div className="flex items-center space-x-2 text-lg font-semibold text-gray-900">
                        <Clock className="h-5 w-5 text-blue-500" />
                        <span>{appointment.appointment_time}</span>
                      </div>
                      <p className="text-sm text-gray-600">
                        {appointment.services.reduce((sum, s) => sum + s.duration_minutes, 0)} minutos
                      </p>
                    </div>
                    
                    <div className={`px-4 py-2 rounded-full border text-sm font-medium flex items-center space-x-2 ${getStatusColor(appointment.status)}`}>
                      {getStatusIcon(appointment.status)}
                      <span>{getStatusText(appointment.status)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Content */}
              <div className="p-6">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Pet Photo & Details */}
                  <div className="space-y-4">
                    {appointment.pet.photo_url && (
                      <div>
                        <img 
                          src={appointment.pet.photo_url} 
                          alt={appointment.pet.name}
                          className="w-full h-48 object-cover rounded-xl"
                        />
                      </div>
                    )}
                    
                    {appointment.pet.coat_condition && (
                      <div className="bg-blue-50 p-3 rounded-lg">
                        <h4 className="text-sm font-semibold text-blue-900 mb-1">Condição dos Pelos</h4>
                        <p className="text-sm text-blue-700 capitalize">{appointment.pet.coat_condition}</p>
                        {appointment.pet.coat_notes && (
                          <p className="text-xs text-blue-600 mt-1">{appointment.pet.coat_notes}</p>
                        )}
                      </div>
                    )}
                    
                    {appointment.pet.special_notes && (
                      <div className="bg-yellow-50 p-3 rounded-lg">
                        <h4 className="text-sm font-semibold text-yellow-900 mb-1">Observações do Pet</h4>
                        <p className="text-sm text-yellow-700">{appointment.pet.special_notes}</p>
                      </div>
                    )}
                  </div>

                  {/* Services & Contact */}
                  <div className="space-y-4">
                    <div>
                      <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center">
                        <DollarSign className="h-4 w-4 mr-1" />
                        Serviços
                      </h4>
                      <div className="space-y-2">
                        {appointment.services.map((service) => (
                          <div key={service.id} className="bg-gray-50 p-3 rounded-lg">
                            <div className="flex justify-between items-center">
                              <span className="font-medium text-gray-900">{service.name}</span>
                              <div className="text-sm text-gray-600">
                                {service.duration_minutes}min
                              </div>
                            </div>
                            {service.description && (
                              <p className="text-xs text-gray-600 mt-1">{service.description}</p>
                            )}
                          </div>
                        ))}
                      </div>
                      
                      <div className="bg-green-50 p-3 rounded-lg mt-3 border border-green-200">
                        <div className="flex justify-between items-center font-semibold text-green-900">
                          <span>Total</span>
                          <span>R$ {appointment.total_price?.toFixed(2) || '0.00'}</span>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center">
                        <User className="h-4 w-4 mr-1" />
                        Responsável
                      </h4>
                      <div className="space-y-2">
                        <div className="flex items-center space-x-2 text-sm">
                          <User className="h-4 w-4 text-gray-400" />
                          <span>{appointment.owner_name}</span>
                        </div>
                        <div className="flex items-center space-x-2 text-sm">
                          <Phone className="h-4 w-4 text-gray-400" />
                          <a href={`tel:${appointment.owner_phone}`} className="text-blue-600 hover:underline">
                            {appointment.owner_phone}
                          </a>
                        </div>
                        {appointment.owner_email && (
                          <div className="flex items-center space-x-2 text-sm">
                            <Mail className="h-4 w-4 text-gray-400" />
                            <a href={`mailto:${appointment.owner_email}`} className="text-blue-600 hover:underline">
                              {appointment.owner_email}
                            </a>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions & Notes */}
                  <div className="space-y-4">
                    {/* Quick Confirm Button */}
                    {appointment.status === 'agendado' && (
                      <div>
                        <button
                          onClick={() => handleConfirmAppointment(appointment.id)}
                          disabled={confirmingAppointment === appointment.id}
                          className="w-full bg-gradient-to-r from-green-500 to-emerald-600 text-white py-3 px-4 rounded-lg font-semibold hover:from-green-600 hover:to-emerald-700 transition-all duration-200 shadow-lg hover:shadow-xl flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {confirmingAppointment === appointment.id ? (
                            <>
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                              <span>Confirmando...</span>
                            </>
                          ) : (
                            <>
                              <CheckCircle className="h-5 w-5" />
                              <span>Confirmar Agendamento</span>
                            </>
                          )}
                        </button>
                        <p className="text-xs text-gray-500 mt-2 text-center">
                          Cliente será notificado automaticamente
                        </p>
                      </div>
                    )}

                    <div>
                      <h4 className="text-sm font-semibold text-gray-900 mb-3">Atualizar Status</h4>
                      <select
                        value={appointment.status}
                        onChange={(e) => handleStatusUpdate(appointment.id, e.target.value)}
                        disabled={updatingStatus === appointment.id}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                      >
                        {statusOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                      {updatingStatus === appointment.id && (
                        <div className="flex items-center space-x-2 mt-2 text-sm text-blue-600">
                          <div className="animate-spin rounded-full h-3 w-3 border-b border-blue-600"></div>
                          <span>Atualizando...</span>
                        </div>
                      )}
                    </div>

                    {appointment.notes && (
                      <div className="bg-purple-50 p-3 rounded-lg">
                        <h4 className="text-sm font-semibold text-purple-900 mb-2 flex items-center">
                          <MessageSquare className="h-4 w-4 mr-1" />
                          Observações
                        </h4>
                        <p className="text-sm text-purple-700">{appointment.notes}</p>
                      </div>
                    )}

                    <div className="flex space-x-2">
                      <a
                        href={`https://wa.me/55${appointment.owner_phone.replace(/\D/g, '')}?text=Olá! Sua consulta para ${appointment.pet.name} está confirmada para ${appointment.appointment_date} às ${appointment.appointment_time}.`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 bg-green-500 text-white text-center py-2 px-3 rounded-lg text-sm font-medium hover:bg-green-600 transition-colors"
                      >
                        WhatsApp
                      </a>
                      <a
                        href={`tel:${appointment.owner_phone}`}
                        className="flex-1 bg-blue-500 text-white text-center py-2 px-3 rounded-lg text-sm font-medium hover:bg-blue-600 transition-colors"
                      >
                        Ligar
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'clients' && (
        <div className="bg-white rounded-2xl shadow-xl p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">CRM — Clientes e Pets</h3>
          <CrmPanel />
        </div>
      )}

      {activeTab === 'services' && (
        <div className="bg-white rounded-2xl shadow-xl p-6">
          <ServiceConfiguration />
        </div>
      )}

      {activeTab === 'schedule' && (
        <div className="bg-white rounded-2xl shadow-xl p-6">
          <ScheduleConfiguration />
        </div>
      )}

      {activeTab === 'business' && (
        <div className="bg-white rounded-2xl shadow-xl p-6">
          <BusinessConfiguration />
        </div>
      )}
    </Layout>
  );
}
