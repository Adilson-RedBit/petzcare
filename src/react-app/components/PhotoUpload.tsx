import { useState, useRef } from 'react';
import { api, ApiError } from '@/react-app/lib/apiClient';
import { Camera, Upload, X, AlertCircle } from 'lucide-react';

interface PhotoUploadProps {
  onPhotoUpload: (photoUrl: string) => void;
  currentPhotoUrl?: string;
  onRemovePhoto?: () => void;
}

export default function PhotoUpload({ onPhotoUpload, currentPhotoUrl, onRemovePhoto }: PhotoUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Por favor, selecione apenas arquivos de imagem');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('A imagem deve ter no máximo 5MB');
      return;
    }

    setError(null);
    setUploading(true);

    try {
      const formData = new FormData();
      formData.append('photo', file);
      const { photoUrl } = await api.post<{ photoUrl: string }>(
        '/upload-pet-photo',
        formData
      );
      onPhotoUpload(photoUrl);
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Erro ao enviar imagem';
      setError(msg);
    } finally {
      setUploading(false);
    }
  };

  const triggerFileSelect = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="space-y-4">
      <div className="text-sm font-medium text-gray-700 mb-2">
        <Camera className="inline h-4 w-4 mr-1" />
        Foto do Pet (opcional, mas recomendada para novos cadastros)
      </div>
      
      <div className="flex flex-col space-y-3">
        {currentPhotoUrl ? (
          <div className="relative">
            <img 
              src={currentPhotoUrl} 
              alt="Foto do pet"
              className="w-full h-48 object-cover rounded-lg border-2 border-gray-200"
            />
            {onRemovePhoto && (
              <button
                type="button"
                onClick={onRemovePhoto}
                className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full hover:bg-red-600 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        ) : (
          <div 
            className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-colors"
            onClick={triggerFileSelect}
          >
            <div className="flex flex-col items-center space-y-2">
              <div className="bg-gray-100 p-3 rounded-full">
                <Upload className="h-6 w-6 text-gray-500" />
              </div>
              <div className="text-sm text-gray-600">
                <p className="font-medium">Clique para enviar uma foto</p>
                <p className="text-xs mt-1">PNG, JPG até 5MB</p>
              </div>
            </div>
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          className="hidden"
        />

        {uploading && (
          <div className="flex items-center space-x-2 text-sm text-blue-600">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
            <span>Enviando foto...</span>
          </div>
        )}

        {error && (
          <div className="flex items-center space-x-2 text-sm text-red-600">
            <AlertCircle className="h-4 w-4" />
            <span>{error}</span>
          </div>
        )}
      </div>

      <div className="text-xs text-gray-500 bg-blue-50 p-3 rounded-lg">
        <p className="font-medium text-blue-700 mb-1">💡 Por que enviar uma foto?</p>
        <p>A foto nos ajuda a avaliar as condições dos pelos e definir o valor mais justo para os serviços, considerando o trabalho necessário.</p>
      </div>
    </div>
  );
}
