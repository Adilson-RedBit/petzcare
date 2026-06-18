import { useState, useEffect } from 'react';
import {
  Users,
  PawPrint,
  Calendar,
  AlertTriangle,
  MessageCircle,
  Search,
  ChevronDown,
  ChevronUp,
  Clock,
  X,
  Send,
  Filter,
  MapPin,
  Mail,
} from 'lucide-react';

interface PetAppointment {
  id: number;
  date: string;
  time: string;
  status: string;
  total_price: number;
  services: string[];
}

interface CrmPet {
  id: number;
  name: string;
  breed: string | null;
  size: string;
  photo_url: string | null;
  coat_condition: string | null;
  last_appointments: PetAppointment[];
  days_since_last_visit: number | null;
  inactive: boolean;
}

interface CrmCustomer {
  owner_name: string;
  owner_phone: string;
  owner_email: string;
  owner_address: string | null;
  pets: CrmPet[];
}

const DEFAULT_MESSAGE = (dono: string, pet: string) =>
  `Oi ${dono}! O ${pet} já está com saudade de ficar cheirosinho! 🐾 Que tal agendar um banho para ele? Acesse nosso site e escolha o melhor horário: https://petzcare.org/agendar`;

function formatPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 11) return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  if (digits.length === 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  return phone;
}

function getWhatsAppUrl(phone: string, message: string): string {
  const digits = phone.replace(/\D/g, '');
  const fullNumber = digits.length <= 11 ? `55${digits}` : digits;
  return `https://wa.me/${fullNumber}?text=${encodeURIComponent(message)}`;
}

function formatDate(dateStr: string): string {
  const [year, month, day] = dateStr.split('-');
  return `${day}/${month}/${year}`;
}

function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    agendado: 'Agendado',
    confirmado: 'Confirmado',
    em_andamento: 'Em andamento',
    concluido: 'Concluído',
    cancelado: 'Cancelado',
  };
  return labels[status] || status;
}

function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    agendado: 'bg-yellow-100 text-yellow-700',
    confirmado: 'bg-blue-100 text-blue-700',
    em_andamento: 'bg-purple-100 text-purple-700',
    concluido: 'bg-green-100 text-green-700',
    cancelado: 'bg-red-100 text-red-700',
  };
  return colors[status] || 'bg-gray-100 text-gray-700';
}

function WhatsAppModal({ customer, pet, onClose }: { customer: CrmCustomer; pet: CrmPet; onClose: () => void }) {
  const [message, setMessage] = useState(DEFAULT_MESSAGE(customer.owner_name, pet.name));

  const handleSend = () => {
    window.open(getWhatsAppUrl(customer.owner_phone, message), '_blank');
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full">
        <div className="flex items-center justify-between p-5 border-b">
          <div className="flex items-center space-x-3">
            <div className="bg-green-100 p-2 rounded-xl">
              <MessageCircle className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Enviar WhatsApp</h3>
              <p className="text-sm text-gray-500">Para {customer.owner_name} sobre {pet.name}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <X className="h-5 w-5 text-gray-400" />
          </button>
        </div>

        <div className="p-5">
          <label className="block text-sm font-medium text-gray-700 mb-2">Mensagem (editável)</label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={5}
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-sm"
          />
          <p className="text-xs text-gray-400 mt-2">Telefone: {formatPhone(customer.owner_phone)}</p>
        </div>

        <div className="flex justify-end space-x-3 p-5 border-t bg-gray-50 rounded-b-2xl">
          <button onClick={onClose} className="px-4 py-2 text-gray-600 hover:text-gray-800 text-sm font-medium">
            Cancelar
          </button>
          <button
            onClick={handleSend}
            className="flex items-center space-x-2 px-5 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors text-sm font-semibold"
          >
            <Send className="h-4 w-4" />
            <span>Abrir WhatsApp</span>
          </button>
        </div>
      </div>
    </div>
  );
}

function CustomerCard({ customer }: { customer: CrmCustomer }) {
  const [expanded, setExpanded] = useState(false);
  const [whatsAppTarget, setWhatsAppTarget] = useState<CrmPet | null>(null);
  const hasInactivePets = customer.pets.some((p) => p.inactive);
  const totalPets = customer.pets.length;

  return (
    <>
      <div className={`bg-white rounded-xl border-2 transition-all duration-200 ${hasInactivePets ? 'border-orange-200 shadow-orange-100' : 'border-gray-100'} shadow-sm hover:shadow-md`}>
        <div className="flex items-center justify-between p-4 cursor-pointer" onClick={() => setExpanded(!expanded)}>
          <div className="flex items-center space-x-3 min-w-0">
            <div className={`p-2.5 rounded-xl ${hasInactivePets ? 'bg-orange-100' : 'bg-blue-100'}`}>
              <Users className={`h-5 w-5 ${hasInactivePets ? 'text-orange-600' : 'text-blue-600'}`} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center space-x-2">
                <h3 className="font-semibold text-gray-900 truncate">{customer.owner_name}</h3>
                {hasInactivePets && (
                  <span className="flex items-center space-x-1 px-2 py-0.5 bg-orange-100 text-orange-700 text-xs font-medium rounded-full whitespace-nowrap">
                    <AlertTriangle className="h-3 w-3" />
                    <span>Inativo</span>
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-500">
                {formatPhone(customer.owner_phone)} · {totalPets} {totalPets === 1 ? 'pet' : 'pets'}
              </p>
              {customer.owner_email && (
                <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                  <Mail className="h-3 w-3" />{customer.owner_email}
                </p>
              )}
              {customer.owner_address && (
                <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                  <MapPin className="h-3 w-3" />{customer.owner_address}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {expanded ? <ChevronUp className="h-5 w-5 text-gray-400" /> : <ChevronDown className="h-5 w-5 text-gray-400" />}
          </div>
        </div>

        {expanded && (
          <div className="border-t px-4 pb-4">
            {customer.pets.map((pet, petIdx) => (
              <div key={pet.id} className="mt-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    {pet.photo_url ? (
                      <img src={pet.photo_url} alt={pet.name} className="w-10 h-10 rounded-lg object-cover" />
                    ) : (
                      <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                        <PawPrint className="h-5 w-5 text-purple-500" />
                      </div>
                    )}
                    <div>
                      <h4 className="font-medium text-gray-900">{pet.name}</h4>
                      <p className="text-xs text-gray-500">
                        {pet.breed || 'SRD'} · Porte {pet.size}
                        {pet.coat_condition && ` · Pelos: ${pet.coat_condition}`}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    {pet.inactive && (
                      <span className="text-xs text-orange-600 font-medium bg-orange-50 px-2 py-1 rounded-lg">
                        {pet.days_since_last_visit} dias sem visita
                      </span>
                    )}
                    <button
                      onClick={(e) => { e.stopPropagation(); setWhatsAppTarget(pet); }}
                      className="flex items-center space-x-1.5 px-3 py-1.5 bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition-colors text-sm font-medium"
                    >
                      <MessageCircle className="h-4 w-4" />
                      <span>WhatsApp</span>
                    </button>
                  </div>
                </div>

                {pet.last_appointments.length > 0 ? (
                  <div className="space-y-2 ml-1">
                    {pet.last_appointments.map((appt) => (
                      <div key={appt.id} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2 text-sm">
                        <div className="flex items-center space-x-3">
                          <Calendar className="h-3.5 w-3.5 text-gray-400" />
                          <span className="text-gray-700">{formatDate(appt.date)}</span>
                          <span className="text-gray-400 flex items-center space-x-1">
                            <Clock className="h-3 w-3" />
                            <span>{appt.time}</span>
                          </span>
                        </div>
                        <div className="flex items-center space-x-3">
                          <span className="text-gray-600 text-xs truncate max-w-[150px]">
                            {appt.services.join(', ') || '—'}
                          </span>
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(appt.status)}`}>
                            {getStatusLabel(appt.status)}
                          </span>
                          {appt.total_price > 0 && (
                            <span className="text-gray-600 font-medium text-xs">R$ {appt.total_price.toFixed(2)}</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-400 italic ml-1">Nenhum agendamento registrado</p>
                )}

                {petIdx < customer.pets.length - 1 && <hr className="mt-4 border-gray-100" />}
              </div>
            ))}
          </div>
        )}
      </div>

      {whatsAppTarget && (
        <WhatsAppModal customer={customer} pet={whatsAppTarget} onClose={() => setWhatsAppTarget(null)} />
      )}
    </>
  );
}

export default function CrmPanel() {
  const [customers, setCustomers] = useState<CrmCustomer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [filterInactive, setFilterInactive] = useState(false);

  useEffect(() => { fetchCustomers(); }, []);

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/crm/customers', { credentials: 'include' });
      if (!res.ok) throw new Error('Erro ao buscar clientes');
      setCustomers(await res.json());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setLoading(false);
    }
  };

  const filtered = customers.filter((c) => {
    const matchesSearch =
      !search ||
      c.owner_name.toLowerCase().includes(search.toLowerCase()) ||
      c.owner_phone.includes(search) ||
      c.pets.some((p) => p.name.toLowerCase().includes(search.toLowerCase()));
    return matchesSearch && (!filterInactive || c.pets.some((p) => p.inactive));
  });

  const totalPets = customers.reduce((sum, c) => sum + c.pets.length, 0);
  const inactiveCount = customers.filter((c) => c.pets.some((p) => p.inactive)).length;

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600">{error}</p>
        <button onClick={fetchCustomers} className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 text-sm">
          Tentar novamente
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-blue-50 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-blue-700">{customers.length}</p>
          <p className="text-sm text-blue-600">Clientes</p>
        </div>
        <div className="bg-purple-50 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-purple-700">{totalPets}</p>
          <p className="text-sm text-purple-600">Pets</p>
        </div>
        <div
          className={`rounded-xl p-4 text-center cursor-pointer transition-colors ${filterInactive ? 'bg-orange-200 ring-2 ring-orange-400' : 'bg-orange-50 hover:bg-orange-100'}`}
          onClick={() => setFilterInactive(!filterInactive)}
        >
          <p className="text-2xl font-bold text-orange-700">{inactiveCount}</p>
          <p className="text-sm text-orange-600 flex items-center justify-center space-x-1">
            <AlertTriangle className="h-3.5 w-3.5" />
            <span>Inativos</span>
          </p>
        </div>
      </div>

      <div className="flex items-center space-x-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por cliente, telefone ou pet..."
            className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
          />
        </div>
        <button
          onClick={() => setFilterInactive(!filterInactive)}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${filterInactive ? 'bg-orange-100 text-orange-700 border-2 border-orange-300' : 'bg-gray-100 text-gray-600 border-2 border-transparent hover:bg-gray-200'}`}
        >
          <Filter className="h-4 w-4" />
          <span>Só inativos</span>
        </button>
      </div>

      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <Users className="h-12 w-12 mx-auto mb-3 text-gray-300" />
            <p className="font-medium">Nenhum cliente encontrado</p>
            <p className="text-sm">
              {search || filterInactive ? 'Tente ajustar os filtros' : 'Os clientes aparecerão aqui conforme fizerem agendamentos'}
            </p>
          </div>
        ) : (
          filtered.map((customer) => <CustomerCard key={customer.owner_phone} customer={customer} />)
        )}
      </div>
    </div>
  );
}
