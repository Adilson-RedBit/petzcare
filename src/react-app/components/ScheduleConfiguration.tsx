import { useState, useEffect } from 'react';
import { api, ApiError } from '@/react-app/lib/apiClient';
import { Clock, Calendar, Plus, X, Save, AlertCircle } from 'lucide-react';

interface WorkingHours {
  id?: number;
  day_of_week: number; // 0 = Sunday, 1 = Monday, etc.
  start_time: string;
  end_time: string;
  is_active: boolean;
  appointment_duration: number;
  break_start?: string;
  break_end?: string;
}

export default function ScheduleConfiguration() {
  const [workingHours, setWorkingHours] = useState<WorkingHours[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const daysOfWeek = [
    { value: 1, label: 'Segunda-feira', short: 'Seg' },
    { value: 2, label: 'Terça-feira', short: 'Ter' },
    { value: 3, label: 'Quarta-feira', short: 'Qua' },
    { value: 4, label: 'Quinta-feira', short: 'Qui' },
    { value: 5, label: 'Sexta-feira', short: 'Sex' },
    { value: 6, label: 'Sábado', short: 'Sáb' },
    { value: 0, label: 'Domingo', short: 'Dom' },
  ];

  useEffect(() => {
    fetchWorkingHours();
  }, []);

  const fetchWorkingHours = async () => {
    try {
      const data = await api.get<WorkingHours[]>('/admin/working-hours');
      if (data && data.length > 0) {
        setWorkingHours(data);
      } else {
        const defaultHours = daysOfWeek.slice(0, 6).map((day) => ({
          day_of_week: day.value,
          start_time: '08:00',
          end_time: '18:00',
          is_active: true,
          appointment_duration: 30,
          break_start: '12:00',
          break_end: '13:00',
        }));
        setWorkingHours(defaultHours);
      }
    } catch (error) {
      console.error('Failed to fetch working hours:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveWorkingHours = async () => {
    try {
      setSaving(true);
      await api.post('/admin/working-hours', { working_hours: workingHours });
      alert('Horários salvos com sucesso!');
      await fetchWorkingHours();
    } catch (error) {
      const msg = error instanceof ApiError ? error.message : 'Erro desconhecido';
      alert('Erro ao salvar horários: ' + msg);
    } finally {
      setSaving(false);
    }
  };

  const updateWorkingHour = (dayValue: number, field: keyof WorkingHours, value: any) => {
    setWorkingHours(prev => {
      const existing = prev.find(h => h.day_of_week === dayValue);
      if (existing) {
        return prev.map(h => 
          h.day_of_week === dayValue ? { ...h, [field]: value } : h
        );
      } else {
        const newHour: WorkingHours = {
          day_of_week: dayValue,
          start_time: '08:00',
          end_time: '18:00',
          is_active: false,
          appointment_duration: 30,
          [field]: value
        };
        return [...prev, newHour];
      }
    });
  };

  const getWorkingHourForDay = (dayValue: number): WorkingHours => {
    return workingHours.find(h => h.day_of_week === dayValue) || {
      day_of_week: dayValue,
      start_time: '08:00',
      end_time: '18:00',
      is_active: false,
      appointment_duration: 30
    };
  };

  const addDay = (dayValue: number) => {
    const newHour: WorkingHours = {
      day_of_week: dayValue,
      start_time: '08:00',
      end_time: '18:00',
      is_active: true,
      appointment_duration: 30,
      break_start: '12:00',
      break_end: '13:00'
    };
    setWorkingHours(prev => [...prev, newHour]);
  };

  const removeDay = (dayValue: number) => {
    setWorkingHours(prev => prev.filter(h => h.day_of_week !== dayValue));
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
          <h3 className="text-lg font-semibold text-gray-900">Configurar Horários</h3>
          <p className="text-sm text-gray-600 mt-1">Defina os dias e horários de funcionamento</p>
        </div>
        <button
          onClick={handleSaveWorkingHours}
          disabled={saving}
          className="flex items-center space-x-2 bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 transition-colors disabled:opacity-50"
        >
          <Save className="h-4 w-4" />
          <span>{saving ? 'Salvando...' : 'Salvar Horários'}</span>
        </button>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start space-x-3">
          <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5" />
          <div className="text-sm text-blue-800">
            <p className="font-medium mb-1">Como funciona:</p>
            <p>Os slots são gerados a cada 30 minutos dentro do horário de funcionamento. A duração de cada atendimento é definida em <strong>Serviços</strong> e o sistema bloqueia automaticamente os slots ocupados — sem risco de overbook.</p>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {daysOfWeek.map(day => {
          const workingHour = getWorkingHourForDay(day.value);
          const isConfigured = workingHours.some(h => h.day_of_week === day.value);
          
          return (
            <div key={day.value} className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <Calendar className="h-5 w-5 text-blue-500" />
                  <h4 className="font-medium text-gray-900">{day.label}</h4>
                  {isConfigured && (
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      workingHour.is_active 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {workingHour.is_active ? 'Ativo' : 'Fechado'}
                    </span>
                  )}
                </div>
                
                <div className="flex items-center space-x-2">
                  {isConfigured ? (
                    <>
                      <button
                        onClick={() => updateWorkingHour(day.value, 'is_active', !workingHour.is_active)}
                        className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                          workingHour.is_active
                            ? 'bg-red-100 text-red-700 hover:bg-red-200'
                            : 'bg-green-100 text-green-700 hover:bg-green-200'
                        }`}
                      >
                        {workingHour.is_active ? 'Fechar' : 'Abrir'}
                      </button>
                      <button
                        onClick={() => removeDay(day.value)}
                        className="p-1 text-red-600 hover:bg-red-100 rounded"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => addDay(day.value)}
                      className="flex items-center space-x-1 text-blue-600 hover:bg-blue-100 px-2 py-1 rounded"
                    >
                      <Plus className="h-4 w-4" />
                      <span className="text-sm">Adicionar</span>
                    </button>
                  )}
                </div>
              </div>

              {isConfigured && workingHour.is_active && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      <Clock className="inline h-4 w-4 mr-1" />
                      Início
                    </label>
                    <input
                      type="time"
                      value={workingHour.start_time}
                      onChange={(e) => updateWorkingHour(day.value, 'start_time', e.target.value)}
                      className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      <Clock className="inline h-4 w-4 mr-1" />
                      Fim
                    </label>
                    <input
                      type="time"
                      value={workingHour.end_time}
                      onChange={(e) => updateWorkingHour(day.value, 'end_time', e.target.value)}
                      className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Intervalo Almoço
                    </label>
                    <div className="flex space-x-1">
                      <input
                        type="time"
                        value={workingHour.break_start || ''}
                        onChange={(e) => updateWorkingHour(day.value, 'break_start', e.target.value)}
                        className="flex-1 p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-xs"
                        placeholder="Início"
                      />
                      <input
                        type="time"
                        value={workingHour.break_end || ''}
                        onChange={(e) => updateWorkingHour(day.value, 'break_end', e.target.value)}
                        className="flex-1 p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-xs"
                        placeholder="Fim"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {workingHours.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          <Clock className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p>Nenhum horário configurado ainda.</p>
          <p className="text-sm">Configure os dias e horários de funcionamento.</p>
        </div>
      )}
    </div>
  );
}
