import { useState, useEffect } from 'react';
import { 
  Store, 
  Phone, 
  Mail, 
  MapPin,
  Instagram, 
  MessageCircle, 
  Save,
  Loader2
} from 'lucide-react';

interface BusinessConfig {
  business_name: string;
  phone: string;
  whatsapp: string;
  email: string;
  address: string;
  instagram: string;
  description: string;
}

export default function BusinessConfiguration() {
  const [config, setConfig] = useState<BusinessConfig>({
    business_name: 'PetCare Agenda',
    phone: '(11) 9999-9999',
    whatsapp: '11999999999',
    email: 'contato@petcare.com',
    address: 'Rua dos Pets, 123 - São Paulo/SP',
    instagram: '@petcare.agenda',
    description: 'Cuidamos do seu pet com carinho e profissionalismo. Banho, tosa e muito amor!'
  });
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);

  useEffect(() => {
    fetchBusinessConfig();
  }, []);

  const fetchBusinessConfig = async () => {
    try {
      const response = await fetch('/api/admin/business-config');
      if (response.ok) {
        const data = await response.json();
        setConfig(prev => ({ ...prev, ...data }));
      }
    } catch (error) {
      console.error('Erro ao carregar configurações:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setMessage(null);
      
      const response = await fetch('/api/admin/business-config', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(config),
        credentials: 'include'
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = 'Erro ao salvar';
        
        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.detail || errorData.message || errorData.error || errorMessage;
        } catch {
          errorMessage = errorText || errorMessage;
        }
        
        throw new Error(errorMessage);
      }
      
      setMessage({ type: 'success', text: 'Configurações salvas com sucesso!' });
      
      // Notificar outras telas
      window.dispatchEvent(new Event('business-config-updated'));
      
      // Limpar mensagem após 3 segundos
      setTimeout(() => setMessage(null), 3000);
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      setMessage({ type: 'error', text: errorMessage });
      console.error('Erro ao salvar:', error);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Configurações do Negócio</h3>
          <p className="text-sm text-gray-600 mt-1">Personalize as informações da sua empresa</p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center space-x-2 bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Salvando...</span>
            </>
          ) : (
            <>
              <Save className="h-4 w-4" />
              <span>Salvar</span>
            </>
          )}
        </button>
      </div>

      {/* Mensagem de feedback */}
      {message && (
        <div className={`p-4 rounded-lg ${
          message.type === 'success' 
            ? 'bg-green-50 text-green-800 border border-green-200' 
            : 'bg-red-50 text-red-800 border border-red-200'
        }`}>
          {message.text}
        </div>
      )}

      {/* Formulário */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Informações Básicas */}
        <div className="space-y-4">
          <h4 className="font-medium text-gray-900 flex items-center">
            <Store className="h-4 w-4 mr-2" />
            Informações Básicas
          </h4>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nome do Negócio
            </label>
            <input
              type="text"
              value={config.business_name}
              onChange={(e) => setConfig({ ...config, business_name: e.target.value })}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Nome do seu negócio"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <Phone className="inline h-4 w-4 mr-1" />
              Telefone
            </label>
            <input
              type="tel"
              value={config.phone}
              onChange={(e) => setConfig({ ...config, phone: e.target.value })}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="(11) 9999-9999"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <MessageCircle className="inline h-4 w-4 mr-1" />
              WhatsApp (apenas números)
            </label>
            <input
              type="tel"
              value={config.whatsapp}
              onChange={(e) => setConfig({ ...config, whatsapp: e.target.value.replace(/\D/g, '') })}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="11999999999"
            />
          </div>
        </div>

        {/* Contato e Localização */}
        <div className="space-y-4">
          <h4 className="font-medium text-gray-900 flex items-center">
            <Mail className="h-4 w-4 mr-2" />
            Contato e Redes
          </h4>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <Mail className="inline h-4 w-4 mr-1" />
              E-mail
            </label>
            <input
              type="email"
              value={config.email}
              onChange={(e) => setConfig({ ...config, email: e.target.value })}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="contato@exemplo.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <Instagram className="inline h-4 w-4 mr-1" />
              Instagram
            </label>
            <input
              type="text"
              value={config.instagram}
              onChange={(e) => setConfig({ ...config, instagram: e.target.value })}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="@seuinstagram"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <MapPin className="inline h-4 w-4 mr-1" />
              Endereço
            </label>
            <textarea
              value={config.address}
              onChange={(e) => setConfig({ ...config, address: e.target.value })}
              rows={3}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Endereço completo"
            />
          </div>
        </div>
      </div>

      {/* Descrição */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Descrição do Negócio
        </label>
        <textarea
          value={config.description}
          onChange={(e) => setConfig({ ...config, description: e.target.value })}
          rows={4}
          className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          placeholder="Descreva seu negócio, serviços e diferenciais..."
        />
      </div>

      {/* Preview */}
      <div className="border-t pt-6">
        <h4 className="font-medium text-gray-900 mb-3">Preview</h4>
        <div className="bg-gradient-to-br from-blue-50 to-purple-50 p-6 rounded-xl border border-blue-100">
          <div className="bg-white rounded-lg p-6 shadow-sm">
            <div className="flex items-start space-x-4">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center flex-shrink-0">
                <Store className="h-8 w-8 text-white" />
              </div>
              <div className="flex-1">
                <h5 className="text-xl font-bold text-gray-900 mb-2">
                  {config.business_name || 'Nome do Negócio'}
                </h5>
                <p className="text-sm text-gray-600 mb-3">
                  {config.description || 'Descrição do negócio'}
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-gray-500">
                  <div className="flex items-center">
                    <Phone className="h-4 w-4 mr-2 text-blue-500" />
                    {config.phone || 'Telefone'}
                  </div>
                  <div className="flex items-center">
                    <Mail className="h-4 w-4 mr-2 text-blue-500" />
                    {config.email || 'E-mail'}
                  </div>
                  <div className="flex items-center">
                    <MessageCircle className="h-4 w-4 mr-2 text-green-500" />
                    WhatsApp
                  </div>
                  <div className="flex items-center">
                    <Instagram className="h-4 w-4 mr-2 text-pink-500" />
                    {config.instagram || '@instagram'}
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t">
                  <div className="flex items-start text-sm text-gray-600">
                    <MapPin className="h-4 w-4 mr-2 text-red-500 flex-shrink-0 mt-0.5" />
                    <span>{config.address || 'Endereço'}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
