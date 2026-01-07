import { useState, useEffect } from 'react';
import { User, Phone, Mail, MapPin } from 'lucide-react';

interface ClientData {
  name: string;
  phone: string;
  email: string;
  address: string;
}

interface ClientProfileProps {
  onSave?: (data: ClientData) => void;
}

export default function ClientProfile({ onSave }: ClientProfileProps) {
  const [formData, setFormData] = useState<ClientData>({
    name: '',
    phone: '',
    email: '',
    address: '',
  });
  const [saved, setSaved] = useState(false);

  // Carregar dados do localStorage
  useEffect(() => {
    const savedData = localStorage.getItem('client_data');
    if (savedData) {
      setFormData(JSON.parse(savedData));
      setSaved(true);
    }
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Salvar no localStorage
    localStorage.setItem('client_data', JSON.stringify(formData));
    setSaved(true);
    
    if (onSave) {
      onSave(formData);
    }

    // Mostrar mensagem de sucesso
    alert('Dados salvos com sucesso!');
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Meus Dados</h2>
          <p className="text-gray-600">
            Mantenha suas informações atualizadas para facilitar o agendamento.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <User className="inline h-4 w-4 mr-1" />
              Nome Completo *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
              placeholder="Seu nome completo"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Phone className="inline h-4 w-4 mr-1" />
              Telefone *
            </label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
              placeholder="(00) 00000-0000"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Mail className="inline h-4 w-4 mr-1" />
              E-mail
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="seu@email.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <MapPin className="inline h-4 w-4 mr-1" />
              Endereço
            </label>
            <textarea
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              rows={3}
              placeholder="Rua, número, bairro, cidade"
            />
          </div>

          <div className="flex justify-end pt-4">
            <button
              type="submit"
              className="bg-blue-500 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-600 transition-colors"
            >
              {saved ? 'Atualizar Dados' : 'Salvar Dados'}
            </button>
          </div>
        </form>

        {saved && (
          <div className="mt-4 p-3 bg-green-50 text-green-700 rounded-lg text-sm">
            ✓ Seus dados estão salvos e serão usados nos próximos agendamentos.
          </div>
        )}
      </div>
    </div>
  );
}
