import { useState } from 'react';
import { useNavigate, Link } from 'react-router';
import { User, Mail, Phone, Lock, Building2, Loader2, Check } from 'lucide-react';
import InstallShortcutModal from '@/react-app/components/InstallShortcutModal';

export default function Signup() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showShortcutModal, setShowShortcutModal] = useState(false);
  const [businessName, setBusinessName] = useState('');
  const [form, setForm] = useState({
    business_name: '',
    owner_name: '',
    owner_email: '',
    owner_phone: '',
    password: '',
    confirm_password: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (form.password !== form.confirm_password) {
      setError('As senhas não coincidem');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/tenant/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          business_name: form.business_name,
          owner_name: form.owner_name,
          owner_email: form.owner_email,
          owner_phone: form.owner_phone.replace(/\D/g, ''),
          password: form.password,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Erro ao criar conta');
        return;
      }

      setBusinessName(form.business_name);
      setShowShortcutModal(true);

      setTimeout(() => {
        navigate('/professional');
      }, 8000);
    } catch {
      setError('Erro de conexão. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const fields = [
    { key: 'business_name', label: 'Nome do seu Pet Shop / Negócio', icon: Building2, type: 'text', placeholder: 'Ex: Pet Shop Patinhas' },
    { key: 'owner_name', label: 'Seu nome completo', icon: User, type: 'text', placeholder: 'Ex: Maria Silva' },
    { key: 'owner_email', label: 'E-mail', icon: Mail, type: 'email', placeholder: 'seuemail@exemplo.com' },
    { key: 'owner_phone', label: 'WhatsApp / Telefone', icon: Phone, type: 'tel', placeholder: '(11) 99999-9999' },
    { key: 'password', label: 'Crie uma senha', icon: Lock, type: 'password', placeholder: 'Mínimo 8 caracteres' },
    { key: 'confirm_password', label: 'Confirme a senha', icon: Lock, type: 'password', placeholder: 'Repita a senha' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex flex-col">
      <nav className="bg-white/95 backdrop-blur-md border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link to="/" className="flex items-center space-x-2">
            <span className="text-xl font-bold text-blue-600">🐾 PetzCare</span>
          </Link>
          <Link to="/professional" className="text-sm text-gray-600 hover:text-gray-900">
            Já tenho conta
          </Link>
        </div>
      </nav>

      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="inline-flex items-center bg-green-100 text-green-700 text-sm font-medium px-4 py-1.5 rounded-full mb-4">
              <Check className="h-4 w-4 mr-1.5" />
              14 dias grátis — sem cartão
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Crie sua conta</h1>
            <p className="text-gray-600">Configure seu negócio em menos de 2 minutos</p>
          </div>

          <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6 space-y-4">
            {fields.map(({ key, label, icon: Icon, type, placeholder }) => (
              <div key={key}>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  <Icon className="inline h-4 w-4 mr-1 text-gray-400" />
                  {label}
                </label>
                <input
                  type={type}
                  value={form[key as keyof typeof form]}
                  onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                  placeholder={placeholder}
                  required
                  className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                />
              </div>
            ))}

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white py-3.5 rounded-xl text-lg font-bold hover:shadow-lg hover:scale-[1.02] transition-all disabled:opacity-60 disabled:hover:scale-100 flex items-center justify-center"
            >
              {loading ? (
                <>
                  <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                  Criando sua conta...
                </>
              ) : (
                'Começar Meu Trial Grátis'
              )}
            </button>

            <p className="text-center text-xs text-gray-400 mt-3">
              Ao criar sua conta, você concorda com nossos termos de uso e política de privacidade.
            </p>
          </form>

          <p className="text-center text-sm text-gray-500 mt-6">
            Já tem uma conta?{' '}
            <Link to="/professional" className="text-blue-600 font-semibold hover:underline">
              Faça login
            </Link>
          </p>
        </div>
      </div>

      <InstallShortcutModal
        isOpen={showShortcutModal}
        onClose={() => {
          setShowShortcutModal(false);
          navigate('/professional');
        }}
        businessName={businessName}
      />
    </div>
  );
}
