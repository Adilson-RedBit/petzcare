import { useState, useEffect } from 'react';
import { usePets } from '@/react-app/hooks/useApi';
import PetForm from './PetForm';
import { Pet, CreatePet } from '@/shared/types';
import { PlusCircle, Edit, Trash2 } from 'lucide-react';

export default function MyPets() {
  const [showForm, setShowForm] = useState(false);
  const [editingPet, setEditingPet] = useState<Pet | null>(null);
  const [myPets, setMyPets] = useState<Pet[]>([]);
  const [clientPhone, setClientPhone] = useState<string>('');
  const { createPet } = usePets();

  // Carregar telefone do cliente do localStorage
  useEffect(() => {
    const savedData = localStorage.getItem('client_data');
    if (savedData) {
      const clientData = JSON.parse(savedData);
      setClientPhone(clientData.phone);
      
      // Buscar pets do cliente
      if (clientData.phone) {
        fetchMyPets(clientData.phone);
      }
    }
  }, []);

  const fetchMyPets = async (phone: string) => {
    try {
      const response = await fetch(`/api/pets?phone=${encodeURIComponent(phone)}`);
      if (response.ok) {
        const data = await response.json();
        setMyPets(data);
      }
    } catch (error) {
      console.error('Erro ao buscar pets:', error);
    }
  };

  const handleSavePet = async (petData: CreatePet) => {
    try {
      const savedData = localStorage.getItem('client_data');
      if (!savedData) {
        alert('Por favor, cadastre seus dados primeiro na aba "Meus Dados"');
        return;
      }

      const clientData = JSON.parse(savedData);
      
      // Adicionar dados do responsável ao pet
      const petWithOwner = {
        ...petData,
        owner_name: clientData.name,
        owner_phone: clientData.phone,
        owner_email: clientData.email || '',
      };

      const newPet = await createPet(petWithOwner);
      setMyPets([...myPets, newPet]);
      setShowForm(false);
      setEditingPet(null);
      
      alert('Pet cadastrado com sucesso!');
    } catch (error) {
      alert('Erro ao cadastrar pet: ' + (error instanceof Error ? error.message : 'Erro desconhecido'));
    }
  };

  const handleDeletePet = async (petId: number) => {
    if (!confirm('Tem certeza que deseja excluir este pet?')) return;

    try {
      const response = await fetch(`/api/pets/${petId}`, { method: 'DELETE' });
      if (response.ok) {
        setMyPets(myPets.filter(p => p.id !== petId));
        alert('Pet excluído com sucesso!');
      }
    } catch (error) {
      alert('Erro ao excluir pet: ' + (error instanceof Error ? error.message : 'Erro desconhecido'));
    }
  };

  if (!clientPhone) {
    return (
      <div className="max-w-2xl mx-auto text-center py-12">
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6">
          <p className="text-yellow-800 text-lg mb-4">
            ⚠️ Por favor, cadastre seus dados primeiro na aba "Meus Dados" para poder gerenciar seus pets.
          </p>
        </div>
      </div>
    );
  }

  if (showForm) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <button
            onClick={() => {
              setShowForm(false);
              setEditingPet(null);
            }}
            className="text-blue-600 hover:text-blue-800 font-medium"
          >
            ← Voltar para lista de pets
          </button>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">
            {editingPet ? 'Editar Pet' : 'Cadastrar Novo Pet'}
          </h2>
          <PetForm 
            onSubmit={handleSavePet} 
            onCancel={() => {
              setShowForm(false);
              setEditingPet(null);
            }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Meus Pets</h2>
          <p className="text-gray-600">Gerencie os pets cadastrados</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="bg-blue-500 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-600 transition-colors flex items-center gap-2"
        >
          <PlusCircle className="h-5 w-5" />
          Adicionar Pet
        </button>
      </div>

      {myPets.length === 0 ? (
        <div className="bg-gray-50 rounded-xl p-12 text-center border-2 border-dashed border-gray-300">
          <div className="text-gray-400 mb-4">
            <svg className="h-16 w-16 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-700 mb-2">Nenhum pet cadastrado</h3>
          <p className="text-gray-500 mb-4">Cadastre seu primeiro pet para começar a agendar serviços</p>
          <button
            onClick={() => setShowForm(true)}
            className="bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600 transition-colors"
          >
            Cadastrar Pet
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {myPets.map((pet) => (
            <div key={pet.id} className="bg-white rounded-xl p-6 border border-gray-200 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-xl font-bold text-gray-900">{pet.name}</h3>
                  <p className="text-gray-600 text-sm">
                    {pet.breed || 'SRD'} • {pet.size === 'pequeno' ? 'Pequeno' : pet.size === 'medio' ? 'Médio' : 'Grande'}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setEditingPet(pet);
                      setShowForm(true);
                    }}
                    className="text-blue-600 hover:text-blue-800 p-2"
                    title="Editar"
                  >
                    <Edit className="h-5 w-5" />
                  </button>
                  <button
                    onClick={() => handleDeletePet(pet.id)}
                    className="text-red-600 hover:text-red-800 p-2"
                    title="Excluir"
                  >
                    <Trash2 className="h-5 w-5" />
                  </button>
                </div>
              </div>

              <div className="space-y-2 text-sm text-gray-600">
                {pet.weight_kg && <p>Peso: {pet.weight_kg} kg</p>}
                {pet.age_years && <p>Idade: {pet.age_years} anos</p>}
                {pet.special_notes && (
                  <p className="text-xs bg-gray-50 p-2 rounded">
                    Obs: {pet.special_notes}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
