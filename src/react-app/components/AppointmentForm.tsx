import { useState, useEffect } from 'react';
import { useAvailableSlots } from '@/react-app/hooks/useApi';
import { api } from '@/react-app/lib/apiClient';
import { CreateAppointment, Service, Pet } from '@/shared/types';
import ServiceCard from './ServiceCard';
import PetForm from './PetForm';
import {
  Calendar, Clock, User, Phone, Mail, MapPin,
  MessageSquare, Check, Search, Loader2, PawPrint,
} from 'lucide-react';

interface ClientData {
  owner_name: string;
  owner_phone: string;
  owner_email: string;
  owner_address: string;
}

interface AppointmentFormProps {
  onSubmit: (appointment: CreateAppointment) => Promise<void>;
  loading?: boolean;
  tenantSlug?: string;
}

export default function AppointmentForm({ onSubmit, loading, tenantSlug }: AppointmentFormProps) {
  // Fase 0: identificação do cliente
  const [clientView, setClientView] = useState<'phone' | 'found' | 'register'>('phone');
  const [clientConfirmed, setClientConfirmed] = useState(false);
  const [phoneInput, setPhoneInput] = useState('');
  const [lookingUp, setLookingUp] = useState(false);
  const [lookupError, setLookupError] = useState('');
  const [clientData, setClientData] = useState<ClientData>({
    owner_name: '', owner_phone: '', owner_email: '', owner_address: '',
  });
  const [registerForm, setRegisterForm] = useState<ClientData>({
    owner_name: '', owner_phone: '', owner_email: '', owner_address: '',
  });
  const [clientPets, setClientPets] = useState<Pet[]>([]);

  // Etapas do agendamento (1=serviços, 2=data/hora, 3=confirmar)
  const [step, setStep] = useState(1);
  const [selectedServices, setSelectedServices] = useState<Service[]>([]);
  const [selectedPet, setSelectedPet] = useState<Pet | null>(null);
  const [showNewPetForm, setShowNewPetForm] = useState(false);
  const [services, setServices] = useState<Service[]>([]);
  const [loadingServices, setLoadingServices] = useState(false);
  const [formData, setFormData] = useState({
    appointment_date: '',
    appointment_time: '',
    notes: '',
  });

  const primaryServiceId = selectedServices[0]?.id;
  const { slots } = useAvailableSlots(formData.appointment_date, primaryServiceId, tenantSlug);

  useEffect(() => {
    if (!clientConfirmed) return;
    const fetchServices = async () => {
      try {
        setLoadingServices(true);
        const params = new URLSearchParams();
        if (selectedPet) params.set('pet_id', String(selectedPet.id));
        if (tenantSlug) params.set('t', tenantSlug);
        const qs = params.toString() ? `?${params}` : '';
        const data = await api.get<Service[]>(`/services${qs}`);
        setServices(data);
      } catch {
        console.error('Falha ao buscar serviços');
      } finally {
        setLoadingServices(false);
      }
    };
    fetchServices();
  }, [selectedPet, tenantSlug, clientConfirmed]);

  // --- Handlers de identificação ---

  const handlePhoneLookup = async () => {
    const phone = phoneInput.replace(/\D/g, '');
    if (phone.length < 8) { setLookupError('Digite um telefone válido.'); return; }
    setLookingUp(true);
    setLookupError('');
    try {
      const tqs = tenantSlug ? `&t=${tenantSlug}` : '';
      const res = await fetch(`/api/clients/lookup?phone=${encodeURIComponent(phone)}${tqs}`);
      const data = await res.json();
      if (data.found) {
        setClientData(data.client);
        setClientPets(data.pets || []);
        setClientView('found');
      } else {
        setRegisterForm({ owner_name: '', owner_phone: phoneInput, owner_email: '', owner_address: '' });
        setClientView('register');
      }
    } catch {
      setLookupError('Erro de conexão. Tente novamente.');
    } finally {
      setLookingUp(false);
    }
  };

  const handleClientConfirm = () => {
    setClientConfirmed(true);
    // Se cliente já tem pets, mostra a lista; se não, abre form de pet
    if (clientPets.length === 0) setShowNewPetForm(true);
  };

  const handleRegisterClient = () => {
    if (!registerForm.owner_name.trim() || !registerForm.owner_phone.trim()) return;
    setClientData(registerForm);
    setClientPets([]);
    setClientConfirmed(true);
    setShowNewPetForm(true); // novo cliente sem pets → direto para cadastro
  };

  // --- Handlers de pet ---

  const handleNewPet = async (petData: any) => {
    try {
      const qs = tenantSlug ? `?t=${tenantSlug}` : '';
      const newPet = await api.post<Pet>(`/pets${qs}`, {
        ...petData,
        owner_name: clientData.owner_name,
        owner_phone: clientData.owner_phone,
        owner_email: clientData.owner_email,
        owner_address: clientData.owner_address,
      });
      setClientPets(prev => [...prev, newPet]);
      setSelectedPet(newPet);
      setShowNewPetForm(false);
    } catch {
      alert('Erro ao cadastrar pet. Tente novamente.');
    }
  };

  const handlePetSelection = (pet: Pet) => {
    setSelectedPet(pet);
    setSelectedServices([]);
  };

  const toggleService = (service: Service) => {
    setSelectedServices(prev =>
      prev.some(s => s.id === service.id)
        ? prev.filter(s => s.id !== service.id)
        : [...prev, service]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedServices.length === 0 || !selectedPet) return;
    const appointmentData: CreateAppointment = {
      service_ids: selectedServices.map(s => s.id),
      pet_id: selectedPet.id,
      appointment_date: formData.appointment_date,
      appointment_time: formData.appointment_time,
      owner_name: clientData.owner_name || selectedPet.owner_name || '',
      owner_phone: clientData.owner_phone || selectedPet.owner_phone || '',
      owner_email: clientData.owner_email || selectedPet.owner_email || '',
      notes: formData.notes,
    };
    await onSubmit(appointmentData);
  };

  const totalPrice = selectedServices.reduce((sum, s) => sum + s.price, 0);
  const totalDuration = selectedServices.reduce((sum, s) => sum + s.duration_minutes, 0);

  // ====== FASE 0: Identificação do cliente ======
  if (!clientConfirmed) {
    return (
      <div className="bg-white rounded-2xl shadow-xl p-6 lg:p-8">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
            <User className="h-8 w-8 text-blue-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900">Identificação</h2>
          <p className="text-gray-500 mt-1">Informe seu WhatsApp para começar</p>
        </div>

        {/* Lookup de telefone */}
        {clientView === 'phone' && (
          <div className="max-w-sm mx-auto">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Phone className="inline h-4 w-4 mr-1" />
              WhatsApp / Telefone
            </label>
            <div className="flex gap-2">
              <input
                type="tel"
                value={phoneInput}
                onChange={e => { setPhoneInput(e.target.value); setLookupError(''); }}
                onKeyDown={e => e.key === 'Enter' && handlePhoneLookup()}
                placeholder="(11) 99999-9999"
                className="flex-1 p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <button
                onClick={handlePhoneLookup}
                disabled={lookingUp}
                className="px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-colors disabled:opacity-60 flex items-center gap-2"
              >
                {lookingUp
                  ? <Loader2 className="h-4 w-4 animate-spin" />
                  : <Search className="h-4 w-4" />}
              </button>
            </div>
            {lookupError && <p className="text-red-600 text-sm mt-2">{lookupError}</p>}
          </div>
        )}

        {/* Cliente encontrado */}
        {clientView === 'found' && (
          <div className="max-w-sm mx-auto">
            <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-6">
              <p className="text-green-700 font-semibold mb-1">
                Olá, {clientData.owner_name}!
              </p>
              <p className="text-sm text-green-600">{clientData.owner_phone}</p>
              {clientData.owner_email && (
                <p className="text-sm text-green-600">{clientData.owner_email}</p>
              )}
              {clientData.owner_address && (
                <p className="text-sm text-green-600">{clientData.owner_address}</p>
              )}
              {clientPets.length > 0 && (
                <div className="mt-3 pt-3 border-t border-green-200">
                  <p className="text-xs font-medium text-green-700 mb-1">
                    <PawPrint className="inline h-3 w-3 mr-1" />
                    Seus pets cadastrados:
                  </p>
                  {clientPets.map((p: any) => (
                    <p key={p.id} className="text-xs text-green-600">• {p.name} ({p.breed || 'SRD'}, porte {p.size})</p>
                  ))}
                </div>
              )}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => { setClientView('phone'); setPhoneInput(''); }}
                className="flex-1 px-4 py-3 border border-gray-300 text-gray-600 rounded-xl hover:bg-gray-50 transition-colors"
              >
                Voltar
              </button>
              <button
                onClick={handleClientConfirm}
                className="flex-1 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold transition-colors"
              >
                Continuar
              </button>
            </div>
          </div>
        )}

        {/* Cadastro de novo cliente */}
        {clientView === 'register' && (
          <div className="max-w-md mx-auto">
            <div className="bg-blue-50 rounded-xl p-3 mb-5 text-sm text-blue-700">
              Telefone não encontrado. Preencha seus dados para continuar.
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  <User className="inline h-4 w-4 mr-1" />
                  Nome completo *
                </label>
                <input
                  type="text"
                  value={registerForm.owner_name}
                  onChange={e => setRegisterForm({ ...registerForm, owner_name: e.target.value })}
                  placeholder="Seu nome"
                  className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  <Phone className="inline h-4 w-4 mr-1" />
                  WhatsApp *
                </label>
                <input
                  type="tel"
                  value={registerForm.owner_phone}
                  onChange={e => setRegisterForm({ ...registerForm, owner_phone: e.target.value })}
                  placeholder="(11) 99999-9999"
                  className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  <Mail className="inline h-4 w-4 mr-1" />
                  E-mail (opcional)
                </label>
                <input
                  type="email"
                  value={registerForm.owner_email}
                  onChange={e => setRegisterForm({ ...registerForm, owner_email: e.target.value })}
                  placeholder="seuemail@exemplo.com"
                  className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  <MapPin className="inline h-4 w-4 mr-1" />
                  Endereço (opcional)
                </label>
                <input
                  type="text"
                  value={registerForm.owner_address}
                  onChange={e => setRegisterForm({ ...registerForm, owner_address: e.target.value })}
                  placeholder="Rua, número, bairro"
                  className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
            <div className="flex gap-2 mt-6">
              <button
                onClick={() => setClientView('phone')}
                className="flex-1 px-4 py-3 border border-gray-300 text-gray-600 rounded-xl hover:bg-gray-50 transition-colors"
              >
                Voltar
              </button>
              <button
                onClick={handleRegisterClient}
                disabled={!registerForm.owner_name.trim() || !registerForm.owner_phone.trim()}
                className="flex-1 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold transition-colors disabled:opacity-50"
              >
                Próximo
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ====== ETAPAS DO AGENDAMENTO ======
  return (
    <div className="bg-white rounded-2xl shadow-xl p-6 lg:p-8">
      {/* Progress bar */}
      <div className="flex items-center justify-between mb-8">
        {[
          { num: 1, title: 'Serviços', icon: Check },
          { num: 2, title: 'Data/Hora', icon: Calendar },
          { num: 3, title: 'Confirmar', icon: Check },
        ].map((s, i) => (
          <div key={s.num} className="flex items-center">
            <div className={`flex items-center justify-center w-10 h-10 rounded-full text-sm font-semibold ${
              step > s.num ? 'bg-green-500 text-white'
              : step === s.num ? 'bg-blue-500 text-white'
              : 'bg-gray-200 text-gray-500'
            }`}>
              {step > s.num ? <Check className="h-5 w-5" /> : s.num}
            </div>
            <span className="ml-2 text-sm font-medium text-gray-700 hidden sm:inline">{s.title}</span>
            {i < 2 && <div className="w-12 lg:w-24 h-1 bg-gray-200 mx-2"><div className={`h-1 ${step > s.num ? 'bg-green-500' : 'bg-gray-200'}`} /></div>}
          </div>
        ))}
      </div>

      {/* Banner do cliente identificado */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-2 mb-6 flex items-center gap-2 text-sm text-blue-700">
        <User className="h-4 w-4 shrink-0" />
        <span>
          <strong>{clientData.owner_name}</strong> — {clientData.owner_phone}
        </span>
      </div>

      {/* Etapa 1: Pet + Serviços */}
      {step === 1 && (
        <div>
          {!selectedPet ? (
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Selecione o Pet</h2>

              {showNewPetForm ? (
                <div className="mb-6">
                  <PetForm
                    onSubmit={handleNewPet}
                    onCancel={() => { setShowNewPetForm(false); if (clientPets.length === 0) setClientConfirmed(false); }}
                    hideOwner
                  />
                </div>
              ) : (
                <div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
                    {clientPets.map((pet: any) => (
                      <div
                        key={pet.id}
                        onClick={() => handlePetSelection(pet)}
                        className="p-4 rounded-xl border-2 border-gray-200 hover:border-blue-300 hover:shadow-md cursor-pointer transition-all"
                      >
                        {pet.photo_url && (
                          <img src={pet.photo_url} alt={pet.name} className="w-full h-32 object-cover rounded-lg mb-3" />
                        )}
                        <h3 className="font-semibold text-gray-900">{pet.name}</h3>
                        <p className="text-sm text-gray-600">{pet.breed || 'SRD'}</p>
                        <p className="text-sm text-gray-500 capitalize">Porte: {pet.size}</p>
                      </div>
                    ))}
                  </div>
                  <button
                    onClick={() => setShowNewPetForm(true)}
                    className="w-full p-4 border-2 border-blue-500 rounded-xl text-blue-600 font-semibold bg-blue-50 hover:bg-blue-100 transition-colors"
                  >
                    + Cadastrar Novo Pet
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div>
              {/* Pet selecionado */}
              <div className="bg-blue-50 rounded-xl p-4 mb-6 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {selectedPet.photo_url && (
                    <img src={selectedPet.photo_url} alt={selectedPet.name} className="w-12 h-12 object-cover rounded-lg" />
                  )}
                  <div>
                    <h3 className="font-semibold text-blue-900">{selectedPet.name}</h3>
                    <p className="text-sm text-blue-700">
                      {selectedPet.breed || 'SRD'} • Porte {selectedPet.size}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => { setSelectedPet(null); setSelectedServices([]); }}
                  className="text-blue-600 hover:text-blue-800 text-sm"
                >
                  Trocar
                </button>
              </div>

              <h2 className="text-2xl font-bold text-gray-900 mb-4">Escolha os Serviços</h2>
              {loadingServices ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
                  {services.map(service => (
                    <ServiceCard
                      key={service.id}
                      service={service}
                      selected={selectedServices.some(s => s.id === service.id)}
                      onSelect={toggleService}
                      multiSelect
                    />
                  ))}
                </div>
              )}

              {selectedServices.length > 0 && (
                <div className="bg-blue-50 rounded-xl p-4 mb-4">
                  {selectedServices.map(s => (
                    <div key={s.id} className="flex justify-between text-sm text-blue-700 mb-1">
                      <span>{s.name}</span>
                      <span>{s.duration_minutes}min · R$ {s.price.toFixed(2)}</span>
                    </div>
                  ))}
                  <div className="border-t border-blue-200 pt-2 mt-2 flex justify-between font-semibold text-blue-900">
                    <span>Total: {totalDuration}min</span>
                    <span>R$ {totalPrice.toFixed(2)}</span>
                  </div>
                </div>
              )}

              <div className="flex justify-end">
                <button
                  onClick={() => setStep(2)}
                  disabled={selectedServices.length === 0}
                  className="px-6 py-2 bg-blue-500 text-white rounded-lg disabled:opacity-50 hover:bg-blue-600 transition-colors"
                >
                  Próximo
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Etapa 2: Data e Hora */}
      {step === 2 && (
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Data e Horário</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Calendar className="inline h-4 w-4 mr-1" />Data
              </label>
              <input
                type="date"
                value={formData.appointment_date}
                min={new Date().toISOString().split('T')[0]}
                onChange={e => setFormData({ ...formData, appointment_date: e.target.value, appointment_time: '' })}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Clock className="inline h-4 w-4 mr-1" />Horário
              </label>
              <select
                value={formData.appointment_time}
                onChange={e => setFormData({ ...formData, appointment_time: e.target.value })}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                disabled={!formData.appointment_date}
              >
                <option value="">Selecione um horário</option>
                {slots.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
              {formData.appointment_date && slots.length === 0 && (
                <p className="text-sm text-orange-600 mt-2">Nenhum horário disponível nesta data.</p>
              )}
            </div>
          </div>
          <div className="flex justify-between mt-6">
            <button onClick={() => setStep(1)} className="px-6 py-2 text-gray-600 hover:text-gray-800">Voltar</button>
            <button
              onClick={() => setStep(3)}
              disabled={!formData.appointment_date || !formData.appointment_time}
              className="px-6 py-2 bg-blue-500 text-white rounded-lg disabled:opacity-50 hover:bg-blue-600"
            >
              Próximo
            </button>
          </div>
        </div>
      )}

      {/* Etapa 3: Confirmar */}
      {step === 3 && (
        <form onSubmit={handleSubmit}>
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Confirmar Agendamento</h2>

          {/* Resumo */}
          <div className="bg-gray-50 rounded-xl p-4 mb-6 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Pet</span>
              <span className="font-medium">{selectedPet?.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Serviços</span>
              <span className="font-medium text-right">{selectedServices.map(s => s.name).join(', ')}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Data</span>
              <span className="font-medium">{formData.appointment_date}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Horário</span>
              <span className="font-medium">{formData.appointment_time}</span>
            </div>
            <div className="flex justify-between font-semibold border-t pt-2 mt-2">
              <span>Total</span>
              <span>R$ {totalPrice.toFixed(2)}</span>
            </div>
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <MessageSquare className="inline h-4 w-4 mr-1" />
              Observações (opcional)
            </label>
            <textarea
              value={formData.notes}
              onChange={e => setFormData({ ...formData, notes: e.target.value })}
              rows={3}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="Alguma observação especial..."
            />
          </div>

          <div className="flex justify-between mt-6">
            <button type="button" onClick={() => setStep(2)} className="px-6 py-2 text-gray-600 hover:text-gray-800">Voltar</button>
            <button
              type="submit"
              disabled={loading}
              className="px-8 py-3 bg-green-500 text-white rounded-lg disabled:opacity-50 hover:bg-green-600 font-semibold"
            >
              {loading ? 'Agendando...' : 'Confirmar Agendamento'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
