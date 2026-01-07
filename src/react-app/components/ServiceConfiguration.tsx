import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Save, X, Clock, Loader2, DollarSign } from 'lucide-react';

interface Service {
  id: number;
  name: string;
  description?: string;
  duration_minutes: number;
  is_active: boolean;
}

interface ServicePricing {
  service_id: number;
  size: string;
  base_price: number;
}

export default function ServiceConfiguration() {
  const [services, setServices] = useState<Service[]>([]);
  const [pricing, setPricing] = useState<{ [key: number]: { [key: string]: number } }>({});
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editData, setEditData] = useState<Service | null>(null);
  const [showNewForm, setShowNewForm] = useState(false);
  const [message, setMessage] = useState('');

  const [newService, setNewService] = useState({
    name: '',
    description: '',
    duration_minutes: 60
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [servicesRes, pricingRes] = await Promise.all([
        fetch('/api/admin/services', { credentials: 'include' }),
        fetch('/api/admin/service-pricing', { credentials: 'include' })
      ]);

      if (servicesRes.ok) {
        const servicesData = await servicesRes.json();
        setServices(servicesData);
      }

      if (pricingRes.ok) {
        const pricingData = await pricingRes.json();
        const organized: { [key: number]: { [key: string]: number } } = {};
        pricingData.forEach((p: ServicePricing) => {
          if (!organized[p.service_id]) organized[p.service_id] = {};
          organized[p.service_id][p.size] = p.base_price;
        });
        setPricing(organized);
      }
    } catch (error) {
      console.error('Erro ao carregar:', error);
    } finally {
      setLoading(false);
    }
  };

  const createService = async () => {
    try {
      const res = await fetch('/api/admin/services', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ ...newService, is_active: true })
      });

      if (res.ok) {
        setMessage('Serviço criado!');
        setNewService({ name: '', description: '', duration_minutes: 60 });
        setShowNewForm(false);
        loadData();
        setTimeout(() => setMessage(''), 3000);
      }
    } catch (error) {
      setMessage('Erro ao criar');
    }
  };

  const updateService = async () => {
    if (!editData) return;

    try {
      const res = await fetch(`/api/admin/services/${editData.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(editData)
      });

      if (res.ok) {
        setMessage('Atualizado!');
        setEditingId(null);
        setEditData(null);
        loadData();
        setTimeout(() => setMessage(''), 3000);
      }
    } catch (error) {
      setMessage('Erro ao atualizar');
    }
  };

  const deleteService = async (id: number) => {
    if (!confirm('Excluir serviço?')) return;

    try {
      const res = await fetch(`/api/admin/services/${id}`, {
        method: 'DELETE',
        credentials: 'include'
      });

      if (res.ok) {
        setMessage('Excluído!');
        loadData();
        setTimeout(() => setMessage(''), 3000);
      }
    } catch (error) {
      setMessage('Erro ao excluir');
    }
  };

  const updatePrice = async (serviceId: number, size: string, price: number) => {
    try {
      await fetch('/api/admin/service-pricing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ service_id: serviceId, size, base_price: price })
      });
    } catch (error) {
      console.error('Erro ao atualizar preço');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-bold">Serviços</h3>
          <p className="text-sm text-gray-600">Gerencie serviços e durações</p>
        </div>
        <button
          onClick={() => setShowNewForm(!showNewForm)}
          className="flex items-center gap-2 bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600"
        >
          {showNewForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
          <span>{showNewForm ? 'Fechar' : 'Novo'}</span>
        </button>
      </div>

      {/* Mensagem */}
      {message && (
        <div className="bg-green-50 text-green-800 p-3 rounded-lg border border-green-200">
          {message}
        </div>
      )}

      {/* Novo serviço */}
      {showNewForm && (
        <div className="bg-blue-50 p-6 rounded-lg border border-blue-200">
          <h4 className="font-bold mb-4">Novo Serviço</h4>
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium mb-1">Nome</label>
              <input
                type="text"
                value={newService.name}
                onChange={(e) => setNewService({ ...newService, name: e.target.value })}
                className="w-full p-2 border rounded-lg"
                placeholder="Nome do serviço"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Duração (min)</label>
              <input
                type="number"
                value={newService.duration_minutes}
                onChange={(e) => setNewService({ ...newService, duration_minutes: parseInt(e.target.value) || 0 })}
                className="w-full p-2 border rounded-lg"
              />
            </div>
            <div className="col-span-3">
              <label className="block text-sm font-medium mb-1">Descrição</label>
              <input
                type="text"
                value={newService.description}
                onChange={(e) => setNewService({ ...newService, description: e.target.value })}
                className="w-full p-2 border rounded-lg"
                placeholder="Opcional"
              />
            </div>
          </div>
          <button
            onClick={createService}
            disabled={!newService.name}
            className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 disabled:opacity-50"
          >
            Salvar
          </button>
        </div>
      )}

      {/* Lista */}
      <div className="space-y-4">
        {services.map((service) => (
          <div key={service.id} className="bg-white border rounded-lg p-4">
            {editingId === service.id && editData ? (
              <div className="space-y-4">
                <input
                  type="text"
                  value={editData.name}
                  onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                  className="w-full text-lg font-bold p-2 border rounded"
                />
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm mb-1">Duração (min)</label>
                    <input
                      type="number"
                      value={editData.duration_minutes}
                      onChange={(e) => setEditData({ ...editData, duration_minutes: parseInt(e.target.value) || 0 })}
                      className="w-full p-2 border rounded"
                    />
                  </div>
                  <div>
                    <label className="block text-sm mb-1">Descrição</label>
                    <input
                      type="text"
                      value={editData.description || ''}
                      onChange={(e) => setEditData({ ...editData, description: e.target.value })}
                      className="w-full p-2 border rounded"
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={updateService}
                    className="flex items-center gap-1 bg-green-500 text-white px-3 py-1 rounded hover:bg-green-600"
                  >
                    <Save className="h-4 w-4" />
                    Salvar
                  </button>
                  <button
                    onClick={() => {
                      setEditingId(null);
                      setEditData(null);
                    }}
                    className="flex items-center gap-1 bg-gray-200 px-3 py-1 rounded hover:bg-gray-300"
                  >
                    <X className="h-4 w-4" />
                    Cancelar
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h4 className="text-lg font-bold">{service.name}</h4>
                    <div className="flex items-center gap-4 text-sm text-gray-600 mt-1">
                      <span className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        {service.duration_minutes} min
                      </span>
                      {service.description && <span>{service.description}</span>}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setEditingId(service.id);
                        setEditData(service);
                      }}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => deleteService(service.id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {/* Preços */}
                <div className="border-t pt-4">
                  <h5 className="font-medium mb-3 flex items-center gap-1">
                    <DollarSign className="h-4 w-4" />
                    Preços por Porte
                  </h5>
                  <div className="grid grid-cols-3 gap-3">
                    {['pequeno', 'medio', 'grande'].map((size) => (
                      <div key={size} className="bg-gray-50 p-3 rounded">
                        <label className="block text-sm font-medium mb-1 capitalize">
                          {size === 'medio' ? 'Médio' : size}
                        </label>
                        <div className="flex items-center gap-1">
                          <span className="text-sm">R$</span>
                          <input
                            type="number"
                            step="0.01"
                            value={pricing[service.id]?.[size] || 0}
                            onChange={(e) => {
                              const newPrice = parseFloat(e.target.value) || 0;
                              setPricing({
                                ...pricing,
                                [service.id]: {
                                  ...pricing[service.id],
                                  [size]: newPrice
                                }
                              });
                            }}
                            onBlur={() => {
                              const price = pricing[service.id]?.[size] || 0;
                              updatePrice(service.id, size, price);
                            }}
                            className="flex-1 p-2 border rounded text-sm"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        ))}
      </div>

      {services.length === 0 && (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <Clock className="h-12 w-12 mx-auto mb-3 text-gray-400" />
          <p className="text-gray-600">Nenhum serviço cadastrado</p>
        </div>
      )}
    </div>
  );
}
