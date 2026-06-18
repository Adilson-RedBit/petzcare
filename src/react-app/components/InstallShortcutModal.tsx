import { useState } from 'react';
import { X } from 'lucide-react';

interface InstallShortcutModalProps {
  isOpen: boolean;
  onClose: () => void;
  businessName?: string;
}

export default function InstallShortcutModal({
  isOpen,
  onClose,
  businessName = 'Petzcare'
}: InstallShortcutModalProps) {
  const [step, setStep] = useState<'permission' | 'instructions'>('permission');

  if (!isOpen) return null;

  const handleAllowClick = () => {
    // Solicita permissão para instalar atalho
    if ('shortcuts' in navigator) {
      // Web App Manifest já está configurado
      setStep('instructions');
    } else {
      setStep('instructions');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-500 to-purple-600 p-6 text-white relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 hover:bg-white/20 rounded-full p-2 transition"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="flex items-center space-x-3">
            {/* SVG Patinha */}
            <svg 
              viewBox="0 0 200 200" 
              xmlns="http://www.w3.org/2000/svg"
              className="w-10 h-10"
            >
              <rect width="200" height="200" fill="white" rx="20"/>
              <ellipse cx="60" cy="50" rx="20" ry="30" fill="#ec4899" stroke="#1f2937" strokeWidth="2"/>
              <ellipse cx="140" cy="50" rx="20" ry="30" fill="#ec4899" stroke="#1f2937" strokeWidth="2"/>
              <ellipse cx="30" cy="100" rx="18" ry="28" fill="#ec4899" stroke="#1f2937" strokeWidth="2"/>
              <ellipse cx="170" cy="100" rx="18" ry="28" fill="#ec4899" stroke="#1f2937" strokeWidth="2"/>
              <ellipse cx="100" cy="130" rx="35" ry="45" fill="#ec4899" stroke="#1f2937" strokeWidth="2"/>
              <g transform="translate(100, 115)">
                <path d="M 0,-8 C -8,-15 -15,-15 -15,-8 C -15,0 0,15 0,15 C 0,15 15,0 15,-8 C 15,-15 8,-15 0,-8 Z" 
                      fill="#ffffff" stroke="#1f2937" strokeWidth="1.5"/>
              </g>
            </svg>
            <h2 className="text-xl font-bold">Atalho Rápido</h2>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {step === 'permission' && (
            <div className="space-y-4">
              <p className="text-gray-700">
                Deseja adicionar um <strong>atalho rápido</strong> da {businessName} na sua tela inicial?
              </p>
              
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 space-y-2">
                <p className="text-sm font-semibold text-blue-900">✨ Benefícios:</p>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>✓ Acesso em 1 toque</li>
                  <li>✓ Sem abrir navegador</li>
                  <li>✓ Ícone com pata de cachorro 🐾</li>
                  <li>✓ Funciona offline</li>
                </ul>
              </div>

              <div className="flex space-x-3">
                <button
                  onClick={onClose}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition"
                >
                  Agora não
                </button>
                <button
                  onClick={handleAllowClick}
                  className="flex-1 px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg font-medium hover:shadow-lg transition"
                >
                  Sim, adicionar
                </button>
              </div>
            </div>
          )}

          {step === 'instructions' && (
            <div className="space-y-4">
              <p className="text-gray-700 font-semibold">Como adicionar atalho:</p>

              {/* Para iOS */}
              <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                <p className="font-semibold text-gray-900">📱 iPhone/iPad:</p>
                <ol className="text-sm text-gray-700 space-y-1 list-decimal list-inside">
                  <li>Toque <span className="font-mono bg-white px-2 py-1 rounded">Compartilhar</span></li>
                  <li>Role até <span className="font-mono bg-white px-2 py-1 rounded">Add to Home Screen</span></li>
                  <li>Toque <span className="font-mono bg-white px-2 py-1 rounded">Add</span></li>
                </ol>
              </div>

              {/* Para Android */}
              <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                <p className="font-semibold text-gray-900">🤖 Android:</p>
                <ol className="text-sm text-gray-700 space-y-1 list-decimal list-inside">
                  <li>Toque o menu <span className="font-mono bg-white px-2 py-1 rounded">⋮</span></li>
                  <li>Selecione <span className="font-mono bg-white px-2 py-1 rounded">Install app</span></li>
                  <li>Toque <span className="font-mono bg-white px-2 py-1 rounded">Install</span></li>
                </ol>
              </div>

              <button
                onClick={onClose}
                className="w-full px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg font-medium hover:shadow-lg transition"
              >
                Pronto! ✓
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
