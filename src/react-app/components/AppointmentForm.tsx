import { useState, useEffect } from 'react';
import { usePets, useAvailableSlots } from '@/react-app/hooks/useApi';
import { CreateAppointment, Service, Pet, CreatePet } from '@/shared/types';
import ServiceCard from './ServiceCard';
import PetForm from './PetForm';
import { 
  Calendar, 
  Clock, 
  User, 
  Phone, 
  Mail, 
  MessageSquare, 
  Check, 
  ClipboardList,
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

interface AppointmentFormProps {
  onSubmit: (appointment: CreateAppointment) => Promise<void>;
  loading?: boolean;
}

export default function AppointmentForm({ onSubmit, loading }: AppointmentFormProps) {
  const [step, setStep] = useState(1);
  const [selectedServices, setSelectedServices] = useState<Service[]>([]);
  const [selectedPet, setSelectedPet] = useState<Pet | null>(null);
  const [showNewPetForm, setShowNewPetForm] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [history, setHistory] = useState<AppointmentHistory[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [services, setServices] = useState<Service[]>([]);
  const [loadingServices, setLoadingServices] = useState(false);
  const [formData, setFormData] = useState({
    appointment_date: '',
    appointment_time: '',
    owner_name: '',
    owner_phone: '',
    owner_email: '',
    notes: '',
  });

  const { pets, createPet } = usePets();
  const { slots } = useAvailableSlots(formData.appointment_date);

  const fetchHistory = async (phone: string) => {
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
      case 'confirmed': return <CheckCircle2 className="h-5 w-5 text-blue-500" />;
      case 'in_progress': return <Play className="h-5 w-5 text-yellow-500" />;
      case 'cancelled': return <XCircle className="h-5 w-5 text-red-500" />;
      default: return <Clock className="h-5 w-5 text-gray-500" />;
    }
  };

  // Fetch services when pet is selected
  useEffect(() => {
    const fetchServices = async () => {
      try {
        setLoadingServices(true);
        const url = selectedPet ? `/api/services?pet_id=${selectedPet.id}` : '/api/services';
        const response = await fetch(url);
        const data = await response.json();
        setServices(data);
      } catch (error) {
        console.error('Failed to fetch services:', error);
      } finally {
        setLoadingServices(false);
      }
    };

    fetchServices();
  }, [selectedPet]);

  const handleNewPet = async (petData: CreatePet) => {
    try {
      const newPet = await createPet(petData);
      setSelectedPet(newPet);
      setShowNewPetForm(false);
      setStep(1); // Go back to services selection with pricing
    } catch (error) {
      alert('Erro ao cadastrar pet: ' + (error instanceof Error ? error.message : 'Erro desconhecido'));
    }
  };

  const handlePetSelection = (pet: Pet) => {
    setSelectedPet(pet);
    setSelectedServices([]); // Clear previously selected services
    
    // Pre-fill owner data if pet has it
    if (pet.owner_name && pet.owner_phone) {
      setFormData(prev => ({
        ...prev,
        owner_name: pet.owner_name || '',
        owner_phone: pet.owner_phone || '',
        owner_email: pet.owner_email || ''
      }));
    }
    
    setStep(1); // Go back to services with pricing
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (selectedServices.length === 0 || !selectedPet) return;
    
    const appointmentData: CreateAppointment = {
      service_ids: selectedServices.map(s => s.id),
      pet_id: selectedPet.id,
      appointment_date: formData.appointment_date,
      appointment_time: formData.appointment_time,
      owner_name: selectedPet.owner_name || formData.owner_name,
      owner_phone: selectedPet.owner_phone || formData.owner_phone,
      owner_email: selectedPet.owner_email || formData.owner_email,
      notes: formData.notes,
    };

    await onSubmit(appointmentData);
  };

  const canProceed = (stepNum: number) => {
    switch (stepNum) {
      case 1: return selectedServices.length > 0 && selectedPet;
      case 2: return formData.appointment_date && formData.appointment_time;
      case 3: 
        // If pet has owner data, only check for required fields when they are not filled from pet
        if (selectedPet?.owner_name && selectedPet?.owner_phone) {
          return true; // Pet already has owner info, no need for manual entry
        }
        return formData.owner_name && formData.owner_phone;
      default: return false;
    }
  };

  const toggleService = (service: Service) => {
    setSelectedServices(prev => {
      const isSelected = prev.some(s => s.id === service.id);
      if (isSelected) {
        return prev.filter(s => s.id !== service.id);
      } else {
        return [...prev, service];
      }
    });
  };

  const totalPrice = selectedServices.reduce((sum, service) => sum + service.price, 0);
  const totalDuration = selectedServices.reduce((sum, service) => sum + service.duration_minutes, 0);

  return (
    <div className="bg-white rounded-2xl shadow-xl p-6 lg:p-8">
      {/* Progress Steps */}
      <div className="flex items-center justify-between mb-8">
        {[
          { num: 1, title: selectedPet ? 'Serviços' : 'Pet & Serviços', icon: Check },
          { num: 2, title: 'Data/Hora', icon: Calendar },
          { num: 3, title: 'Dados', icon: User },
        ].map((stepItem, index) => (
          <div key={stepItem.num} className="flex items-center">
            <div
              className={`
                flex items-center justify-center w-10 h-10 rounded-full text-sm font-semibold
                ${step > stepItem.num 
                  ? 'bg-green-500 text-white' 
                  : step === stepItem.num 
                    ? 'bg-blue-500 text-white' 
                    : 'bg-gray-200 text-gray-500'
                }
              `}
            >
              {step > stepItem.num ? <Check className="h-5 w-5" /> : stepItem.num}
            </div>
            <span className="ml-2 text-sm font-medium text-gray-700 hidden sm:inline">
              {stepItem.title}
            </span>
            {index < 2 && (
              <div className="w-12 lg:w-24 h-1 bg-gray-200 mx-2">
                <div 
                  className={`h-1 ${step > stepItem.num ? 'bg-green-500' : 'bg-gray-200'}`}
                />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Step 1: Pet and Service Selection */}
      {step === 1 && (
        <div>
          {showHistory ? (
            <div>
              <div className="mb-6 flex items-center justify-between">
                <button
                  onClick={() => setShowHistory(false)}
                  className="text-blue-600 hover:text-blue-800 font-medium"
                >
                  ← Voltar para seleção de pet
                </button>
                <h2 className="text-2xl font-bold text-gray-900">Histórico de Agendamentos</h2>
              </div>

              <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
                {loadingHistory ? (
                  <div className="flex justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  </div>
                ) : history.length > 0 ? (
                  history.map((app) => (
                    <Card key={app.id} className="p-4 border-gray-100">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="bg-blue-50 p-2 rounded-xl">
                            {getStatusIcon(app.status)}
                          </div>
                          <div>
                            <h4 className="font-bold text-gray-900">{app.pet.name}</h4>
                            <p className="text-xs text-gray-500 flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {new Date(app.appointment_date).toLocaleDateString('pt-BR')} às {app.appointment_time}
                            </p>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          {getStatusBadge(app.status)}
                          <p className="text-[10px] text-gray-400">
                            {app.services.map(s => s.name).join(', ')}
                          </p>
                        </div>
                      </div>
                    </Card>
                  ))
                ) : (
                  <div className="text-center py-12 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                    <p className="text-gray-500 italic">Nenhum agendamento encontrado para este pet/cliente.</p>
                  </div>
                )}
              </div>
            </div>
          ) : !selectedPet ? (
            <div>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Selecione o Pet</h2>
                <button
                  onClick={() => {
                    // Try to use the first pet's phone if available to show some history
                    const firstPetWithPhone = pets.find(p => p.owner_phone);
                    if (firstPetWithPhone?.owner_phone) {
                      fetchHistory(firstPetWithPhone.owner_phone);
                      setShowHistory(true);
                    } else {
                      alert('Cadastre um pet primeiro para ver o histórico.');
                    }
                  }}
                  className="flex items-center gap-2 text-sm font-semibold text-blue-600 bg-blue-50 px-4 py-2 rounded-xl hover:bg-blue-100 transition-colors"
                >
                  <ClipboardList className="h-4 w-4" />
                  Meus Agendamentos
                </button>
              </div>
              <p className="text-gray-600 mb-6">Primeiro, selecione o pet para ver os valores dos serviços:</p>
              
              {showNewPetForm ? (
                <div className="mb-6">
                  <PetForm onSubmit={handleNewPet} onCancel={() => setShowNewPetForm(false)} />
                </div>
              ) : (
                <div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                    {pets.map((pet: Pet) => (
                      <div
                        key={pet.id}
                        className="p-4 rounded-xl border-2 border-gray-200 bg-white hover:border-blue-300 hover:shadow-md cursor-pointer transition-all duration-200 group relative"
                        onClick={() => handlePetSelection(pet)}
                      >
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (pet.owner_phone) {
                              fetchHistory(pet.owner_phone);
                              setShowHistory(true);
                            }
                          }}
                          className="absolute top-2 right-2 p-2 bg-white/90 rounded-full shadow-sm opacity-0 group-hover:opacity-100 transition-opacity hover:bg-blue-50 text-blue-600"
                          title="Ver histórico deste pet"
                        >
                          <ClipboardList className="h-4 w-4" />
                        </button>

                        {pet.photo_url && (
                          <img 
                            src={pet.photo_url} 
                            alt={pet.name}
                            className="w-full h-32 object-cover rounded-lg mb-3"
                          />
                        )}
                        <h3 className="font-semibold text-gray-900">{pet.name}</h3>
                        <p className="text-sm text-gray-600">{pet.breed || 'SRD'}</p>
                        <p className="text-sm text-gray-500 capitalize">Porte {pet.size}</p>
                      </div>
                    ))}
                  </div>
                  
                  <button
                    onClick={() => setShowNewPetForm(true)}
                    className="w-full p-4 border-2 border-blue-500 rounded-xl text-blue-600 font-semibold bg-blue-50 hover:bg-blue-100 hover:border-blue-600 transition-colors shadow-sm"
                  >
                    + Cadastrar Novo Pet
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div>
              <div className="bg-blue-50 rounded-xl p-4 mb-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    {selectedPet.photo_url && (
                      <img 
                        src={selectedPet.photo_url} 
                        alt={selectedPet.name}
                        className="w-12 h-12 object-cover rounded-lg"
                      />
                    )}
                    <div>
                      <h3 className="font-semibold text-blue-900">{selectedPet.name}</h3>
                      <p className="text-sm text-blue-700">
                        {selectedPet.breed || 'SRD'} • Porte {selectedPet.size}
                        {selectedPet.coat_condition && ` • Pelos: ${selectedPet.coat_condition}`}
                      </p>
                      {selectedPet.owner_name && (
                        <p className="text-xs text-blue-600">
                          Responsável: {selectedPet.owner_name}
                        </p>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setSelectedPet(null);
                      setSelectedServices([]);
                    }}
                    className="text-blue-600 hover:text-blue-800 text-sm"
                  >
                    Trocar Pet
                  </button>
                </div>
              </div>

              <h2 className="text-2xl font-bold text-gray-900 mb-6">Escolha os Serviços</h2>
              <p className="text-gray-600 mb-6">Valores calculados para {selectedPet.name}:</p>
          
          {loadingServices ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                  {services.map((service: Service) => (
                    <ServiceCard
                      key={service.id}
                      service={service}
                      selected={selectedServices.some(s => s.id === service.id)}
                      onSelect={toggleService}
                      multiSelect={true}
                    />
                  ))}
                </div>
              )}

          {selectedServices.length > 0 && (
            <div className="bg-blue-50 rounded-xl p-4 mb-6">
              <h3 className="font-semibold text-blue-900 mb-3">Resumo dos Serviços Selecionados:</h3>
              <div className="space-y-2 mb-4">
                {selectedServices.map((service) => (
                  <div key={service.id} className="flex justify-between items-center text-sm">
                    <span className="text-blue-700">{service.name}</span>
                    <div className="flex items-center space-x-4 text-blue-600">
                      <span>{service.duration_minutes}min</span>
                      <span>R$ {service.price.toFixed(2)}</span>
                    </div>
                  </div>
                ))}
              </div>
              <div className="border-t border-blue-200 pt-3 flex justify-between items-center font-semibold text-blue-900">
                <span>Total: {totalDuration} minutos</span>
                <span>R$ {totalPrice.toFixed(2)}</span>
              </div>
            </div>
          )}

          <div className="flex justify-end">
                <button
                  onClick={() => setStep(2)}
                  disabled={!canProceed(1)}
                  className="px-6 py-2 bg-blue-500 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-600 transition-colors"
                >
                  Próximo
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Step 2: Date and Time */}
      {step === 2 && (
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Data e Horário</h2>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Calendar className="inline h-4 w-4 mr-1" />
                Data
              </label>
              <input
                type="date"
                value={formData.appointment_date}
                min={new Date().toISOString().split('T')[0]}
                onChange={(e) => setFormData({ ...formData, appointment_date: e.target.value, appointment_time: '' })}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Clock className="inline h-4 w-4 mr-1" />
                Horário
              </label>
              <select
                value={formData.appointment_time}
                onChange={(e) => setFormData({ ...formData, appointment_time: e.target.value })}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
                disabled={!formData.appointment_date}
              >
                <option value="">Selecione um horário</option>
                {slots.map((time: string) => (
                  <option key={time} value={time}>{time}</option>
                ))}
              </select>
              {formData.appointment_date && slots.length === 0 && (
                <p className="text-sm text-orange-600 mt-2">Nenhum horário disponível para esta data.</p>
              )}
            </div>
          </div>

          <div className="flex justify-between mt-6">
            <button
              onClick={() => setStep(1)}
              className="px-6 py-2 text-gray-600 hover:text-gray-800 transition-colors"
            >
              Voltar
            </button>
            <button
              onClick={() => setStep(3)}
              disabled={!canProceed(2)}
              className="px-6 py-2 bg-blue-500 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-600 transition-colors"
            >
              Próximo
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Owner Information */}
      {step === 3 && (
        <form onSubmit={handleSubmit}>
          <h2 className="text-2xl font-bold text-gray-900 mb-6">
            {selectedPet?.owner_name && selectedPet?.owner_phone 
              ? 'Confirmação e Observações'
              : 'Dados do Responsável'
            }
          </h2>
          
          {selectedPet?.owner_name && selectedPet?.owner_phone ? (
            <div className="mb-6">
              <div className="bg-green-50 rounded-xl p-4 border border-green-200">
                <h3 className="font-semibold text-green-900 mb-2">Dados do Responsável (já cadastrado)</h3>
                <div className="text-sm text-green-700">
                  <p><strong>Nome:</strong> {selectedPet.owner_name}</p>
                  <p><strong>Telefone:</strong> {selectedPet.owner_phone}</p>
                  {selectedPet.owner_email && <p><strong>E-mail:</strong> {selectedPet.owner_email}</p>}
                </div>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <User className="inline h-4 w-4 mr-1" />
                  Nome *
                </label>
                <input
                  type="text"
                  value={formData.owner_name}
                  onChange={(e) => setFormData({ ...formData, owner_name: e.target.value })}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Phone className="inline h-4 w-4 mr-1" />
                  Telefone *
                </label>
                <input
                  type="tel"
                  value={formData.owner_phone}
                  onChange={(e) => setFormData({ ...formData, owner_phone: e.target.value })}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>

              <div className="lg:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Mail className="inline h-4 w-4 mr-1" />
                  E-mail (opcional)
                </label>
                <input
                  type="email"
                  value={formData.owner_email}
                  onChange={(e) => setFormData({ ...formData, owner_email: e.target.value })}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
          )}

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <MessageSquare className="inline h-4 w-4 mr-1" />
              Observações (opcional)
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={3}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Alguma observação especial sobre o pet ou preferências para este agendamento..."
            />
          </div>

          <div className="flex justify-between mt-6">
            <button
              type="button"
              onClick={() => setStep(2)}
              className="px-6 py-2 text-gray-600 hover:text-gray-800 transition-colors"
            >
              Voltar
            </button>
            <button
              type="submit"
              disabled={loading || !canProceed(3)}
              className="px-8 py-3 bg-green-500 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-green-600 transition-colors font-semibold"
            >
              {loading ? 'Agendando...' : 'Agendar Serviço'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
