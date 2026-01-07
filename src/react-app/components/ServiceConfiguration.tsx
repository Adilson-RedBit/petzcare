import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Save, X, Clock, Loader2, DollarSign, Check } from 'lucide-react';

interface Service {
  id: number;
  name: string;
  description?: string;
  duration_minutes: number;
  is_active: boolean;
  price?: number;
}

interface ServicePricing {
  service_id: number;
  size: string;
  base_price: number;
}

export default function ServiceConfiguration() {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [showNewForm, setShowNewForm] = useState(false);
  const [message, setMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);
  const [pricingData, setPricingData] = useState<{ [key: number]: { [key: string]: number } }>({});

  const [newService, setNewService] = useState({
    name: '',
    description: '',
    duration_minutes: 60,
    is_active: true
  });

  const sizes = [
    { value: 'pequeno', label: 'Pequeno' },
    { value: 'medio', label: 'Médio' },
    { value: 'grande', label: 'Grande' }
  ];

  useEffect(() => {
    fetchServices();
    fetchPricing();
  }, []);

  const fetchServices = async () => {
    try {
      const response = await fetch('/api/admin/services', {
        credentials: 'include'
      });
      if (response.ok) {
        const data = await response.json();
        setServices(data);
      }
    } catch (error) {
      console.error('Erro ao carregar serviços:', error);
      showMessage('error', 'Erro ao carregar serviços');
    } finally {
      setLoading(false);
    }
  };

  const fetchPricing = async () => {
    try {
      const response = await fetch('/api/admin/service-pricing', {
        credentials: 'include'
      });
      if (response.ok) {
        const data = await response.json();
        const organized: { [key: number]: { [key: string]: number } } = {};
        data.forEach((price: ServicePricing) => {
          if (!organized[price.service_id]) {
            organized[price.service_id] = {};
          }
          organized[price.service_id][price.size] = price.base_price;
        });
        setPricingData(organized);
      }
    } catch (error) {
      console.error('Erro ao carregar preços:', error);
    }
  };

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 3000);
  };

  const handleCreateService = async () => {
    try {
      setSaving(true);
      const response = await fetch('/api/admin/services', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newService),
        credentials: 'include'
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Erro ao criar serviço');
      }
      
      showMessage('success', 'Serviço criado com sucesso!');
      setNewService({ name: '', description: '', duration_minutes: 60, is_active: true });
      setShowNewForm(false);
      await fetchServices();
    } catch (error) {
      showMessage('error', error instanceof Error ? error.message : 'Erro ao criar serviço');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateService = async () => {
    if (!editingService) return;
    
    try {
      setSaving(true);
      const response = await fetch(`/api/admin/services/${editingService.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingService),
        credentials: 'include'
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Erro ao atualizar serviço');
      }
      
      showMessage('success', 'Serviço atualizado!');
      setEditingId(null);
      setEditingService(null);
      await fetchServices();
    } catch (error) {
      showMessage('error', error instanceof Error ? error.message : 'Erro ao atualizar');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteService = async (serviceId: number) => {
    if (!confirm('Tem certeza que deseja excluir este serviço?')) return;
    
    try {
      const response = await fetch(`/api/admin/services/${serviceId}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('Erro ao excluir');
      }
      
      showMessage('success', 'Serviço excluído!');
      await fetchServices();
    } catch (error) {
      showMessage('error', error instanceof Error ? error.message : 'Erro ao excluir');
    }
  };

  const handleUpdatePricing = async (serviceId: number, size: string, price: number) => {
    try {
      const response = await fetch('/api/admin/service-pricing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          service_id: serviceId,
          size,
          base_price: price
        }),
        credentials: 'include'
      });
      
      if (!response.ok) throw new Error('Erro ao atualizar preço');
      
      await fetchPricing();
    } catch (error) {
      showMessage('error', 'Erro ao atualizar preço');
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
          <h3 className="text-lg font-semibold text-gray-900">Serviços</h3>
          <p className="text-sm text-gray-600 mt-1">Configure os serviços, durações e preços</p>
        </div>
        <button
          onClick={() => setShowNewForm(!showNewForm)}
          className="flex items-center space-x-2 bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors"
        >
          {showNewForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
          <span>{showNewForm ? 'Cancelar' : 'Novo Serviço'}</span>
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

      {/* Formulário novo serviço */}
      {showNewForm && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h4 className="font-medium text-blue-900 mb-4">Criar Novo Serviço</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Nome do Serviço</label>
              <input
                type="text"
                value={newService.name}
                onChange={(e) => setNewService({ ...newService, name: e.target.value })}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="Ex: Banho, Tosa, Hidratação..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <Clock className="inline h-4 w-4 mr-1" />
                Duração (minutos)
              </label>
              <input
                type="number"
                value={newService.duration_minutes}
                onChange={(e) => setNewService({ ...newService, duration_minutes: parseInt(e.target.value) || 0 })}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                min="15"
                step="15"
              />
            </div>
            <div className="md:col-span-3">
              <label className="block text-sm font-medium text-gray-700 mb-1">Descrição (opcional)</label>
              <textarea
                value={newService.description}
                onChange={(e) => setNewService({ ...newService, description: e.target.value })}
                rows={2}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="Descreva o serviço..."
              />
            </div>
          </div>
          <button
            onClick={handleCreateService}
            disabled={!newService.name || saving}
            className="flex items-center space-x-2 bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            <span>{saving ? 'Salvando...' : 'Salvar Serviço'}</span>
          </button>
        </div>
      )}

      {/* Lista de serviços */}
      <div className="space-y-4">
        {services.map((service) => {
          const isEditing = editingId === service.id;

          return (
            <div key={service.id} className={`border rounded-lg p-6 transition-all ${
              service.is_active ? 'bg-white border-gray-200' : 'bg-gray-50 border-gray-300'
            }`}>
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  {isEditing && editingService ? (
                    <div className="space-y-3">
                      <input
                        type="text"
                        value={editingService.name}
                        onChange={(e) => setEditingService({ ...editingService, name: e.target.value })}
                        className="text-lg font-semibold w-full p-2 border border-blue-500 rounded-lg"
                      />
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            <Clock className="inline h-4 w-4 mr-1" />
                            Duração (min)
                          </label>
                          <input
                            type="number"
                            value={editingService.duration_minutes}
                            onChange={(e) => setEditingService({ ...editingService, duration_minutes: parseInt(e.target.value) || 0 })}
                            className="w-full p-2 border border-gray-300 rounded-lg"
                            min="15"
                            step="15"
                          />
                        </div>
                      </div>
                      <textarea
                        value={editingService.description || ''}
                        onChange={(e) => setEditingService({ ...editingService, description: e.target.value })}
                        rows={2}
                        className="w-full p-2 border border-gray-300 rounded-lg"
                        placeholder="Descrição..."
                      />
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center space-x-3 mb-2">
                        <h4 className="text-lg font-semibold text-gray-900">{service.name}</h4>
                        {service.is_active ? (
                          <span className="flex items-center space-x-1 text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">
                            <Check className="h-3 w-3" />
                            <span>Ativo</span>
                          </span>
                        ) : (
                          <span className="text-xs bg-gray-200 text-gray-600 px-2 py-1 rounded-full">
                            Inativo
                          </span>
                        )}
                      </div>
                      <div className="flex items-center space-x-4 text-sm text-gray-600">
                        <span className="flex items-center">
                          <Clock className="h-4 w-4 mr-1 text-blue-500" />
                          {service.duration_minutes} minutos
                        </span>
                      </div>
                      {service.description && (
                        <p className="text-sm text-gray-600 mt-2">{service.description}</p>
                      )}
                    </>
                  )}
                </div>

                <div className="flex items-center space-x-2 ml-4">
                  {isEditing ? (
                    <>
                      <button
                        onClick={handleUpdateService}
                        disabled={saving}
                        className="p-2 text-green-600 hover:bg-green-100 rounded-lg disabled:opacity-50"
                      >
                        {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />}
                      </button>
                      <button
                        onClick={() => {
                          setEditingId(null);
                          setEditingService(null);
                        }}
                        className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                      >
                        <X className="h-5 w-5" />
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => {
                          setEditingId(service.id);
                          setEditingService(service);
                        }}
                        className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg"
                      >
                        <Edit2 className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => handleDeleteService(service.id)}
                        className="p-2 text-red-600 hover:bg-red-100 rounded-lg"
                      >
                        <Trash2 className="h-5 w-5" />
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Preços por porte */}
              {!isEditing && (
                <div className="border-t pt-4 mt-4">
                  <h5 className="font-medium text-gray-900 mb-3 flex items-center">
                    <DollarSign className="h-4 w-4 mr-1 text-green-600" />
                    Preços por Porte
                  </h5>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {sizes.map((size) => (
                      <div key={size.value} className="bg-gray-50 p-3 rounded-lg">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          {size.label}
                        </label>
                        <div className="flex items-center space-x-2">
                          <span className="text-sm text-gray-500">R$</span>
                          <input
                            type="number"
                            step="0.01"
                            value={pricingData[service.id]?.[size.value] || 0}
                            onChange={(e) => {
                              const newPrice = parseFloat(e.target.value) || 0;
                              setPricingData(prev => ({
                                ...prev,
                                [service.id]: {
                                  ...prev[service.id],
                                  [size.value]: newPrice
                                }
                              }));
                            }}
                            onBlur={() => {
                              const newPrice = pricingData[service.id]?.[size.value] || 0;
                              handleUpdatePricing(service.id, size.value, newPrice);
                            }}
                            className="flex-1 p-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {services.length === 0 && (
        <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
          <Clock className="h-16 w-16 mx-auto mb-4 text-gray-400" />
          <p className="text-gray-600 mb-2">Nenhum serviço cadastrado</p>
          <p className="text-sm text-gray-500">Clique em "Novo Serviço" para começar</p>
        </div>
      )}
    </div>
  );
}
