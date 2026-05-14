import { useState, useEffect } from 'react';
import { api, ApiError } from '@/react-app/lib/apiClient';
import {
  Store,
  Phone,
  MapPin,
  Mail,
  Clock,
  Instagram,
  MessageCircle,
  Save,
  Camera,
} from 'lucide-react';

interface BusinessConfig {
  business_name: string;
  phone: string;
  whatsapp: string;
  email: string;
  address: string;
  instagram: string;
  description: string;
  logo_url?: string;
  primary_color: string;
  secondary_color: string;
  business_hours_display: string;
}

export default function BusinessConfiguration() {
  const [config, setConfig] = useState<BusinessConfig>({
    business_name: 'PetCare Agenda',
    phone: '(11) 9999-9999',
    whatsapp: '11999999999',
    email: 'contato@petcare.com',
    address: 'Rua dos Pets, 123 - São Paulo/SP',
    instagram: '@petcare.agenda',
    description: 'Cuidamos do seu pet com carinho e profissionalismo. Banho, tosa e muito amor!',
    logo_url: '',
    primary_color: '#3B82F6',
    secondary_color: '#8B5CF6',
    business_hours_display: 'Seg-Sáb: 8h às 18h'
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [logoUploading, setLogoUploading] = useState(false);

  useEffect(() => {
    fetchBusinessConfig();
  }, []);

  const fetchBusinessConfig = async () => {
    try {
      const data = await api.get<Partial<BusinessConfig>>('/admin/business-config');
      if (data) setConfig({ ...config, ...data });
    } catch (error) {
      console.error('Failed to fetch business config:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      await api.post('/admin/business-config', config);
      alert('Configurações salvas com sucesso!');
      window.dispatchEvent(new Event('business-config-updated'));
    } catch (error) {
      const msg = error instanceof ApiError ? error.message : 'Erro desconhecido';
      alert('Erro ao salvar: ' + msg);
    } finally {
      setSaving(false);
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setLogoUploading(true);
      // Para facilitar no modo local e evitar problemas de rota/armazenamento,
      // salvamos o logo como Data URL (base64) diretamente no business_config.logo_url.
      // Recomendação: use um arquivo de logo pequeno.
      const dataUrl: string = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(new Error('Falha ao ler arquivo de logo'));
        reader.readAsDataURL(file);
      });

      const updatedConfig = { ...config, logo_url: dataUrl };
      setConfig(updatedConfig);

      await api.post('/admin/business-config', updatedConfig);
      window.dispatchEvent(new Event('business-config-updated'));
    } catch (error) {
      const msg = error instanceof ApiError ? error.message : 'Erro desconhecido';
      alert('Erro ao fazer upload da logo: ' + msg);
    } finally {
      setLogoUploading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Configurações do Negócio</h3>
          <p className="text-sm text-gray-600 mt-1">Personalize as informações da sua empresa</p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center space-x-2 bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 transition-colors disabled:opacity-50"
        >
          <Save className="h-4 w-4" />
          <span>{saving ? 'Salvando...' : 'Salvar'}</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Basic Information */}
        <div className="space-y-4">
          <h4 className="font-medium text-gray-900 flex items-center">
            <Store className="h-4 w-4 mr-2" />
            Informações Básicas
          </h4>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nome do Negócio</label>
            <input
              type="text"
              value={config.business_name}
              onChange={(e) => setConfig({ ...config, business_name: e.target.value })}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
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
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
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
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="11999999999"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <Mail className="inline h-4 w-4 mr-1" />
              E-mail
            </label>
            <input
              type="email"
              value={config.email}
              onChange={(e) => setConfig({ ...config, email: e.target.value })}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
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
              rows={2}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
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
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="@seuinstagram"
            />
          </div>
        </div>

        {/* Visual Configuration */}
        <div className="space-y-4">
          <h4 className="font-medium text-gray-900 flex items-center">
            <Camera className="h-4 w-4 mr-2" />
            Logo
          </h4>

          {/* Logo Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Camera className="inline h-4 w-4 mr-1" />
              Logo da Empresa
            </label>
            <div className="flex items-center space-x-4">
              {config.logo_url && (
                <img 
                  src={config.logo_url} 
                  alt="Logo"
                  className="w-16 h-16 object-contain bg-gray-100 rounded-lg p-2"
                />
              )}
              <div>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleLogoUpload}
                  disabled={logoUploading}
                  className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                />
                {logoUploading && (
                  <p className="text-xs text-gray-500 mt-1">Fazendo upload...</p>
                )}
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <Clock className="inline h-4 w-4 mr-1" />
              Horário de Funcionamento (exibição)
            </label>
            <input
              type="text"
              value={config.business_hours_display}
              onChange={(e) => setConfig({ ...config, business_hours_display: e.target.value })}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="Ex: Seg-Sáb: 8h às 18h"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Descrição do Negócio</label>
            <textarea
              value={config.description}
              onChange={(e) => setConfig({ ...config, description: e.target.value })}
              rows={4}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="Descreva seu negócio e diferenciais..."
            />
          </div>
        </div>
      </div>

      {/* Preview */}
      <div className="border-t pt-6">
        <h4 className="font-medium text-gray-900 mb-3">Preview</h4>
        <div className="bg-gray-50 p-6 rounded-lg border">
          <div className="bg-white rounded-lg p-4 shadow-sm">
            <div className="flex items-center space-x-3 mb-3">
              {config.logo_url ? (
                <img src={config.logo_url} alt="Logo" className="w-8 h-8 object-contain" />
              ) : (
                <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-gray-200">
                  <Store className="h-4 w-4 text-white" />
                </div>
              )}
              <h5 className="font-semibold text-lg">
                {config.business_name}
              </h5>
            </div>
            <p className="text-sm text-gray-600 mb-2">{config.description}</p>
            <div className="text-xs text-gray-500 space-y-1">
              <p><Phone className="inline h-3 w-3 mr-1" />{config.phone}</p>
              <p><Clock className="inline h-3 w-3 mr-1" />{config.business_hours_display}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
