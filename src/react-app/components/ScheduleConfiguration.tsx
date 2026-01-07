import { useState, useEffect } from 'react';
import { Clock, Calendar, Save, Loader2, Info } from 'lucide-react';

interface WorkingHours {
  id?: number;
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_active: boolean;
  break_start?: string;
  break_end?: string;
}

export default function ScheduleConfiguration() {
  const [workingHours, setWorkingHours] = useState<WorkingHours[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);

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
      const response = await fetch('/api/admin/working-hours');
      if (response.ok) {
        const data = await response.json();
        setWorkingHours(data);
      } else {
        // Inicializar com horários padrão
        const defaultHours = daysOfWeek.slice(0, 6).map(day => ({
          day_of_week: day.value,
          start_time: '08:00',
          end_time: '18:00',
          is_active: day.value !== 0, // Fechado aos domingos
          break_start: '12:00',
          break_end: '13:00'
        }));
        setWorkingHours(defaultHours);
      }
    } catch (error) {
      console.error('Erro ao carregar horários:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveWorkingHours = async () => {
    try {
      setSaving(true);
      setMessage(null);
      
      const response = await fetch('/api/admin/working-hours', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ working_hours: workingHours }),
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
      
      setMessage({ type: 'success', text: 'Horários salvos com sucesso!' });
      await fetchWorkingHours();
      
      setTimeout(() => setMessage(null), 3000);
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      setMessage({ type: 'error', text: errorMessage });
      console.error('Erro ao salvar:', error);
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
          is_active: true,
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
      is_active: false
    };
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
          <h3 className="text-lg font-semibold text-gray-900">Horários de Funcionamento</h3>
          <p className="text-sm text-gray-600 mt-1">Configure os dias e horários de atendimento</p>
        </div>
        <button
          onClick={handleSaveWorkingHours}
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
              <span>Salvar Horários</span>
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

      {/* Info sobre agendamento dinâmico */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start space-x-3">
          <Info className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
          <div className="text-sm text-blue-800">
            <p className="font-medium mb-1">Agendamento Inteligente</p>
            <p>Os horários disponíveis para agendamento são calculados automaticamente baseados na duração de cada serviço. Isso evita overbooking e garante que você tenha tempo suficiente para cada atendimento.</p>
          </div>
        </div>
      </div>

      {/* Lista de dias */}
      <div className="space-y-3">
        {daysOfWeek.map(day => {
          const workingHour = getWorkingHourForDay(day.value);
          const isConfigured = workingHours.some(h => h.day_of_week === day.value);
          
          return (
            <div key={day.value} className={`border rounded-lg p-4 transition-all ${
              workingHour.is_active 
                ? 'bg-white border-blue-200' 
                : 'bg-gray-50 border-gray-200'
            }`}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-3">
                  <Calendar className={`h-5 w-5 ${
                    workingHour.is_active ? 'text-blue-500' : 'text-gray-400'
                  }`} />
                  <div>
                    <h4 className="font-medium text-gray-900">{day.label}</h4>
                    <p className="text-xs text-gray-500">{day.short}</p>
                  </div>
                </div>
                
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={workingHour.is_active}
                    onChange={(e) => updateWorkingHour(day.value, 'is_active', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  <span className="ml-3 text-sm font-medium text-gray-700">
                    {workingHour.is_active ? 'Aberto' : 'Fechado'}
                  </span>
                </label>
              </div>

              {workingHour.is_active && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-3 border-t border-gray-200">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      <Clock className="inline h-4 w-4 mr-1" />
                      Horário de Início
                    </label>
                    <input
                      type="time"
                      value={workingHour.start_time}
                      onChange={(e) => updateWorkingHour(day.value, 'start_time', e.target.value)}
                      className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      <Clock className="inline h-4 w-4 mr-1" />
                      Horário de Término
                    </label>
                    <input
                      type="time"
                      value={workingHour.end_time}
                      onChange={(e) => updateWorkingHour(day.value, 'end_time', e.target.value)}
                      className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Intervalo (Almoço)
                    </label>
                    <div className="flex space-x-2">
                      <input
                        type="time"
                        value={workingHour.break_start || ''}
                        onChange={(e) => updateWorkingHour(day.value, 'break_start', e.target.value || null)}
                        className="flex-1 p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                        placeholder="Início"
                      />
                      <span className="self-center text-gray-500">até</span>
                      <input
                        type="time"
                        value={workingHour.break_end || ''}
                        onChange={(e) => updateWorkingHour(day.value, 'break_end', e.target.value || null)}
                        className="flex-1 p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
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

      {/* Resumo */}
      <div className="bg-gradient-to-br from-blue-50 to-purple-50 p-6 rounded-xl border border-blue-100">
        <h4 className="font-medium text-gray-900 mb-3">Resumo da Semana</h4>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {daysOfWeek.map(day => {
            const wh = getWorkingHourForDay(day.value);
            return (
              <div key={day.value} className={`p-3 rounded-lg ${
                wh.is_active ? 'bg-white shadow-sm' : 'bg-gray-100'
              }`}>
                <div className="text-xs font-medium text-gray-600 mb-1">{day.short}</div>
                {wh.is_active ? (
                  <>
                    <div className="text-sm font-bold text-gray-900">
                      {wh.start_time} - {wh.end_time}
                    </div>
                    {wh.break_start && wh.break_end && (
                      <div className="text-xs text-gray-500 mt-1">
                        Pausa: {wh.break_start}-{wh.break_end}
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-sm text-gray-500">Fechado</div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
