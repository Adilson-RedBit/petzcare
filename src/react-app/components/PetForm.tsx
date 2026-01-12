import { useState } from 'react';
import { CreatePet } from '@/shared/types';
import { Heart, Weight, Calendar, FileText } from 'lucide-react';
import PhotoUpload from './PhotoUpload';
import CoatConditionSelector from './CoatConditionSelector';

interface PetFormProps {
  onSubmit: (petData: CreatePet) => void;
  onCancel: () => void;
}

export default function PetForm({ onSubmit, onCancel }: PetFormProps) {
  const [formData, setFormData] = useState<CreatePet>({
    name: '',
    breed: '',
    size: 'medio',
    weight_kg: undefined,
    age_years: undefined,
    special_notes: '',
    photo_url: '',
    coat_condition: undefined,
    coat_notes: '',
    owner_name: '',
    owner_phone: '',
    owner_email: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <div className="bg-gradient-to-br from-purple-50 to-pink-50 p-6 rounded-xl border border-purple-200">
      <h3 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
        <Heart className="h-5 w-5 text-pink-500 mr-2" />
        Cadastrar Novo Pet
      </h3>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nome do Pet *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Raça
            </label>
            <input
              type="text"
              value={formData.breed || ''}
              onChange={(e) => setFormData({ ...formData, breed: e.target.value })}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              placeholder="Ex: Labrador, Golden Retriever, SRD..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Porte *
            </label>
            <select
              value={formData.size}
              onChange={(e) => setFormData({ ...formData, size: e.target.value as 'pequeno' | 'medio' | 'grande' })}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              required
            >
              <option value="pequeno">Pequeno (até 10kg)</option>
              <option value="medio">Médio (10-25kg)</option>
              <option value="grande">Grande (acima de 25kg)</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Weight className="inline h-4 w-4 mr-1" />
              Peso (kg)
            </label>
            <input
              type="number"
              step="0.1"
              value={formData.weight_kg || ''}
              onChange={(e) => setFormData({ 
                ...formData, 
                weight_kg: e.target.value ? parseFloat(e.target.value) : undefined 
              })}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              placeholder="Ex: 15.5"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Calendar className="inline h-4 w-4 mr-1" />
              Idade (anos)
            </label>
            <input
              type="number"
              value={formData.age_years || ''}
              onChange={(e) => setFormData({ 
                ...formData, 
                age_years: e.target.value ? parseInt(e.target.value) : undefined 
              })}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              placeholder="Ex: 3"
              min="0"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <FileText className="inline h-4 w-4 mr-1" />
            Observações Especiais
          </label>
          <textarea
            value={formData.special_notes || ''}
            onChange={(e) => setFormData({ ...formData, special_notes: e.target.value })}
            rows={3}
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
            placeholder="Temperamento, alergias, comportamento especial, etc..."
          />
        </div>

        <div className="lg:col-span-2">
          <PhotoUpload 
            onPhotoUpload={(photoUrl) => setFormData({ ...formData, photo_url: photoUrl })}
            currentPhotoUrl={formData.photo_url}
            onRemovePhoto={() => setFormData({ ...formData, photo_url: '' })}
          />
        </div>

        <div className="lg:col-span-2">
          <CoatConditionSelector
            value={formData.coat_condition}
            onChange={(condition, notes) => setFormData({ 
              ...formData, 
              coat_condition: condition as any,
              coat_notes: notes || ''
            })}
          />
        </div>

        <div className="flex justify-end space-x-3 pt-4">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
          >
            Cancelar
          </button>
          <button
            type="submit"
            className="px-6 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors"
          >
            Cadastrar Pet
          </button>
        </div>
      </form>
    </div>
  );
}
