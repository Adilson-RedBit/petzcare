import { useState, useEffect } from 'react';
import { Link2, Copy, Check, ExternalLink, AlertTriangle, XCircle } from 'lucide-react';
import { api } from '@/react-app/lib/apiClient';

interface TenantInfo {
  id: number;
  name: string;
  slug: string;
  plan: string;
  trial_end: string;
}

function daysUntil(dateStr: string): number {
  const end = new Date(dateStr);
  const now = new Date();
  return Math.ceil((end.getTime() - now.getTime()) / 86400000);
}

export default function BookingLinkBanner() {
  const [tenant, setTenant] = useState<TenantInfo | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    api.get<{ tenant: TenantInfo }>('/tenant/me')
      .then((d) => setTenant(d.tenant ?? null))
      .catch(() => {});
  }, []);

  if (!tenant) return null;

  const link = `${window.location.origin}/agendar?t=${tenant.slug}`;
  const isActive = tenant.plan === 'active';
  const daysLeft = isActive ? Infinity : daysUntil(tenant.trial_end);
  const isExpired = !isActive && daysLeft <= 0;
  const isWarning = !isActive && daysLeft > 0 && daysLeft <= 7;

  const copy = async () => {
    await navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (isExpired) {
    return (
      <div className="bg-red-50 border border-red-300 rounded-xl px-4 py-3 flex items-start gap-3 mb-4">
        <XCircle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-red-700">Trial encerrado</p>
          <p className="text-xs text-red-600 mt-0.5">
            Seu período de teste terminou. Entre em contato para continuar usando o PetzCare.
          </p>
        </div>
        <a
          href={`https://wa.me/5511999999999?text=Olá! Quero continuar usando o PetzCare (${tenant.name})`}
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors"
        >
          Falar agora
        </a>
      </div>
    );
  }

  return (
    <div className={`rounded-xl px-4 py-3 flex items-center gap-3 flex-wrap mb-4 ${
      isWarning
        ? 'bg-amber-50 border border-amber-300'
        : 'bg-blue-50 border border-blue-200'
    }`}>
      <Link2 className={`h-4 w-4 shrink-0 ${isWarning ? 'text-amber-500' : 'text-blue-500'}`} />

      <span className={`text-sm font-medium shrink-0 ${isWarning ? 'text-amber-700' : 'text-blue-700'}`}>
        Link de agendamento:
      </span>

      <a
        href={link}
        target="_blank"
        rel="noopener noreferrer"
        className={`text-sm hover:underline truncate flex items-center gap-1 min-w-0 ${
          isWarning ? 'text-amber-600' : 'text-blue-600'
        }`}
      >
        {link}
        <ExternalLink className="h-3 w-3 shrink-0" />
      </a>

      {isWarning && (
        <span className="flex items-center gap-1 text-xs font-semibold text-amber-700 bg-amber-100 px-2 py-1 rounded-full shrink-0">
          <AlertTriangle className="h-3 w-3" />
          {daysLeft} dia{daysLeft !== 1 ? 's' : ''} restantes
        </span>
      )}

      {!isActive && !isWarning && (
        <span className="text-xs text-blue-500 shrink-0">
          Trial: {daysLeft} dias restantes
        </span>
      )}

      <button
        onClick={copy}
        className={`ml-auto shrink-0 flex items-center gap-1.5 text-white text-xs font-medium px-3 py-1.5 rounded-lg transition-colors ${
          isWarning
            ? 'bg-amber-500 hover:bg-amber-600'
            : 'bg-blue-600 hover:bg-blue-700'
        }`}
      >
        {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
        {copied ? 'Copiado!' : 'Copiar'}
      </button>
    </div>
  );
}
