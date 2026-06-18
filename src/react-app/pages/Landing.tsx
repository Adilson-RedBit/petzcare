import { useState } from 'react';
import { Link } from 'react-router';
import {
  Calendar, Clock, Users, Smartphone, Bell,
  Shield, Star, ChevronRight, Check,
  MessageSquare, BarChart3, Zap, Heart
} from 'lucide-react';

const BRAND = {
  blue: '#2456B4',
  blueDark: '#1A3D8A',
  blueLight: '#EEF3FC',
  blueMid: '#D0DDF7',
  orange: '#F47920',
  orangeLight: '#FFF3EA',
  orangeMid: '#FFD9B8',
};

const PLANS = {
  monthly: { price: 67, label: 'Mensal', period: '/mês' },
  annual: { price: 47, label: 'Anual', period: '/mês', total: 564, savings: 240 },
};

const PAIN_POINTS = [
  {
    icon: MessageSquare,
    pain: 'WhatsApp lotado de mensagens',
    description: 'Clientes mandando "tem horário?" a toda hora, misturado com fotos, áudios e conversas pessoais.',
  },
  {
    icon: Calendar,
    pain: 'Agenda no caderno ou planilha',
    description: 'Anotações perdidas, horários duplicados, cliente chegando e você nem lembra do agendamento.',
  },
  {
    icon: Clock,
    pain: 'Faltas e atrasos constantes',
    description: 'Cliente marca e não aparece. Você perde tempo, perde dinheiro e perde a paciência.',
  },
  {
    icon: Users,
    pain: 'Não lembra dos pets e donos',
    description: '"Qual era o nome do Shih Tzu daquela moça?" — toda semana a mesma história.',
  },
];

const FEATURES = [
  {
    icon: Smartphone,
    title: 'Agendamento Online 24h',
    description: 'Seus clientes agendam sozinhos, a qualquer hora, pelo celular. Sem WhatsApp, sem ligação.',
    color: BRAND.blue,
    bg: BRAND.blueLight,
  },
  {
    icon: Heart,
    title: 'Ficha Completa do Pet',
    description: 'Nome, raça, porte, pelagem, observações especiais. Tudo salvo e organizado automaticamente.',
    color: BRAND.orange,
    bg: BRAND.orangeLight,
  },
  {
    icon: Calendar,
    title: 'Agenda Inteligente',
    description: 'Controle de horários, intervalos e duração por serviço. Sem conflito, sem overbooking.',
    color: BRAND.blue,
    bg: BRAND.blueLight,
  },
  {
    icon: Bell,
    title: 'Lembretes Automáticos',
    description: 'O cliente recebe lembrete antes do horário. Menos faltas, mais faturamento.',
    soon: true,
    color: BRAND.orange,
    bg: BRAND.orangeLight,
  },
  {
    icon: BarChart3,
    title: 'Painel do Profissional',
    description: 'Veja seus agendamentos do dia, semana e mês. Controle total do seu negócio na palma da mão.',
    color: BRAND.blue,
    bg: BRAND.blueLight,
  },
  {
    icon: Shield,
    title: 'Dados Seguros',
    description: 'Seus dados e dos seus clientes protegidos com criptografia. Nada de caderno que pode se perder.',
    color: BRAND.orange,
    bg: BRAND.orangeLight,
  },
];

const TESTIMONIALS = [
  {
    name: 'Camila R.',
    role: 'Pet Shop Patinhas Felizes',
    text: 'Antes eu perdia pelo menos 3 clientes por semana por confusão na agenda. Agora tá tudo organizado!',
    stars: 5,
    accent: BRAND.blue,
  },
  {
    name: 'Roberto S.',
    role: 'Banho & Tosa do Beto',
    text: 'Meus clientes adoraram poder agendar pelo celular. Meu WhatsApp ficou muito mais tranquilo.',
    stars: 5,
    accent: BRAND.orange,
  },
  {
    name: 'Fernanda L.',
    role: 'Estética Animal Premium',
    text: 'O investimento se paga no primeiro mês. Só de reduzir as faltas, já valeu muito.',
    stars: 5,
    accent: BRAND.blue,
  },
];

const FAQ = [
  {
    q: 'Preciso entender de tecnologia?',
    a: 'Não! Se você sabe usar WhatsApp, sabe usar o PetzCare. É super simples e intuitivo.',
  },
  {
    q: 'Funciona no celular?',
    a: 'Sim! O PetzCare foi feito primeiro para celular. Funciona em qualquer smartphone, tablet ou computador.',
  },
  {
    q: 'E se eu quiser cancelar?',
    a: 'Sem multa, sem burocracia. Cancele quando quiser. Mas temos certeza que você vai adorar 😉',
  },
  {
    q: 'Quantos pets posso cadastrar?',
    a: 'Ilimitado! Cadastre todos os pets e clientes que precisar, sem custo extra.',
  },
  {
    q: 'Posso testar antes de pagar?',
    a: 'Claro! Você tem 14 dias grátis para testar tudo, sem compromisso e sem cartão de crédito.',
  },
];

export default function Landing() {
  const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'annual'>('annual');
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  return (
    <div className="min-h-screen" style={{ background: '#0D1117' }}>

      {/* ==================== NAVBAR ==================== */}
      <nav className="fixed top-0 left-0 right-0 z-50" style={{ background: 'rgba(13,17,23,0.85)', backdropFilter: 'blur(12px)', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <div style={{ background: '#fff', borderRadius: '10px', padding: '4px 12px', display: 'inline-flex', alignItems: 'center' }}>
            <img src="/logo.png" alt="PetzCare" style={{ height: '32px', width: 'auto' }} />
          </div>
          <div className="flex items-center space-x-3">
            <Link to="/agendar" className="text-sm hidden sm:block" style={{ color: 'rgba(255,255,255,0.65)' }}>
              Já sou cliente
            </Link>
            <Link
              to="/signup"
              className="text-white px-5 py-2 rounded-full text-sm font-semibold hover:opacity-90 transition-all"
              style={{ background: BRAND.orange }}
            >
              Começar Grátis
            </Link>
          </div>
        </div>
      </nav>

      {/* ==================== HERO ==================== */}
      <section className="pt-28 pb-20 sm:pt-36 sm:pb-28 px-4 overflow-hidden"
        style={{ background: 'linear-gradient(160deg, #111827 0%, #1a2235 55%, #1e2a40 100%)' }}>
        <div className="max-w-3xl mx-auto text-center">

          <div className="inline-flex items-center text-sm font-medium px-4 py-1.5 rounded-full mb-8"
            style={{ border: '1px solid rgba(255,255,255,0.2)', color: 'rgba(255,255,255,0.8)', background: 'rgba(255,255,255,0.06)' }}>
            <Zap className="h-4 w-4 mr-1.5" style={{ color: BRAND.orange }} />
            14 dias grátis — sem cartão de crédito
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold leading-tight mb-6" style={{ color: '#fff' }}>
            Sua agenda de{' '}
            <span style={{ color: BRAND.orange }}>banho e tosa</span>
            <br />no piloto automático
          </h1>

          <p className="text-lg sm:text-xl mb-10 max-w-2xl mx-auto" style={{ color: 'rgba(255,255,255,0.6)' }}>
            Chega de caderno, WhatsApp lotado e cliente que marca e não aparece.
            Profissionalize seu negócio com agendamento online em minutos.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-10">
            <Link
              to="/signup"
              className="w-full sm:w-auto px-8 py-4 rounded-2xl text-lg font-bold hover:opacity-90 transition-all flex items-center justify-center"
              style={{ background: BRAND.orange, color: '#fff' }}
            >
              Começar Agora — É Grátis
              <ChevronRight className="h-5 w-5 ml-2" />
            </Link>
            <Link
              to="/agendar"
              className="w-full sm:w-auto px-8 py-4 rounded-2xl text-lg font-semibold transition-all text-center"
              style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', color: '#fff' }}
            >
              Ver Demo
            </Link>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-6 text-sm" style={{ color: 'rgba(255,255,255,0.5)' }}>
            <span className="flex items-center"><Check className="h-4 w-4 mr-1.5" style={{ color: '#4ADE80' }} /> Sem cartão de crédito</span>
            <span className="flex items-center"><Check className="h-4 w-4 mr-1.5" style={{ color: '#4ADE80' }} /> Pronto em 5 minutos</span>
            <span className="flex items-center"><Check className="h-4 w-4 mr-1.5" style={{ color: '#4ADE80' }} /> Cancele quando quiser</span>
          </div>
        </div>
      </section>

      {/* ==================== PAIN POINTS ==================== */}
      <section className="py-16 sm:py-24 px-4" style={{ background: '#111827' }}>
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4" style={{ color: '#fff' }}>
              Se identificou com algum desses?
            </h2>
            <p className="text-lg max-w-2xl mx-auto" style={{ color: 'rgba(255,255,255,0.55)' }}>
              A rotina do profissional de banho e tosa é pesada. Mas não precisa ser desorganizada.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {PAIN_POINTS.map((item, i) => (
              <div key={i} className="rounded-2xl p-6 flex items-start space-x-4"
                style={{ background: '#1a2235', border: '1px solid rgba(255,255,255,0.07)' }}>
                <div className="p-3 rounded-xl shrink-0" style={{ background: 'rgba(239,68,68,0.15)' }}>
                  <item.icon className="h-6 w-6" style={{ color: '#F87171' }} />
                </div>
                <div>
                  <h3 className="font-bold text-lg mb-1" style={{ color: '#fff' }}>{item.pain}</h3>
                  <p style={{ color: 'rgba(255,255,255,0.5)' }}>{item.description}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="text-center mt-12">
            <p className="text-2xl font-bold" style={{ color: '#fff' }}>
              E se existisse uma solução simples pra tudo isso?{' '}
              <span style={{ color: BRAND.orange }}>Existe.</span>
            </p>
          </div>
        </div>
      </section>

      {/* ==================== FEATURES ==================== */}
      <section className="py-16 sm:py-24 px-4" style={{ background: '#0D1117' }}>
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4" style={{ color: '#fff' }}>
              Tudo que você precisa, num só lugar
            </h2>
            <p className="text-lg max-w-2xl mx-auto" style={{ color: 'rgba(255,255,255,0.55)' }}>
              O PetzCare foi feito por quem entende a rotina do banho e tosa.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map((feature, i) => (
              <div key={i} className="rounded-2xl p-6 relative"
                style={{ background: '#161B2E', border: '1px solid rgba(255,255,255,0.07)' }}>
                {feature.soon && (
                  <span className="absolute top-4 right-4 text-xs font-semibold px-2 py-0.5 rounded-full"
                    style={{ background: 'rgba(244,121,32,0.15)', color: BRAND.orange, border: `1px solid rgba(244,121,32,0.3)` }}>
                    Em breve
                  </span>
                )}
                <div className="p-3 rounded-xl inline-block mb-4"
                  style={{ background: feature.color === BRAND.blue ? 'rgba(36,86,180,0.2)' : 'rgba(244,121,32,0.15)' }}>
                  <feature.icon className="h-6 w-6" style={{ color: feature.color }} />
                </div>
                <h3 className="font-bold text-lg mb-2" style={{ color: '#fff' }}>{feature.title}</h3>
                <p style={{ color: 'rgba(255,255,255,0.5)' }}>{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ==================== TESTIMONIALS ==================== */}
      <section className="py-16 sm:py-24 px-4" style={{ background: '#111827' }}>
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4" style={{ color: '#fff' }}>
              Quem usa, recomenda 🐾
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {TESTIMONIALS.map((t, i) => (
              <div key={i} className="rounded-2xl p-6 border-t-4"
                style={{ background: '#1a2235', borderTopColor: t.accent, borderLeft: '1px solid rgba(255,255,255,0.07)', borderRight: '1px solid rgba(255,255,255,0.07)', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                <div className="flex mb-3">
                  {Array.from({ length: t.stars }).map((_, j) => (
                    <Star key={j} className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                  ))}
                </div>
                <p className="mb-4 italic" style={{ color: 'rgba(255,255,255,0.65)' }}>"{t.text}"</p>
                <div>
                  <p className="font-semibold" style={{ color: '#fff' }}>{t.name}</p>
                  <p className="text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>{t.role}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ==================== PRICING ==================== */}
      <section id="planos" className="py-16 sm:py-24 px-4"
        style={{ background: '#0D1117' }}>
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
              Invista no seu negócio
            </h2>
            <p className="text-lg max-w-xl mx-auto" style={{ color: 'rgba(255,255,255,0.5)' }}>
              Menos que o preço de um banho por mês. E o retorno? Incontável.
            </p>
          </div>

          {/* Toggle */}
          <div className="flex items-center justify-center mb-10">
            <div className="rounded-full p-1 flex" style={{ background: 'rgba(0,0,0,0.25)' }}>
              {(['monthly', 'annual'] as const).map((plan) => (
                <button
                  key={plan}
                  onClick={() => setSelectedPlan(plan)}
                  className="px-6 py-2 rounded-full text-sm font-semibold transition-all"
                  style={{
                    background: selectedPlan === plan ? '#fff' : 'transparent',
                    color: selectedPlan === plan ? BRAND.blue : 'rgba(255,255,255,0.7)',
                  }}
                >
                  {plan === 'monthly' ? 'Mensal' : (
                    <>
                      Anual{' '}
                      <span className="ml-1.5 text-xs px-2 py-0.5 rounded-full"
                        style={{ background: BRAND.orangeLight, color: BRAND.orange }}>
                        -30%
                      </span>
                    </>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Card */}
          <div className="max-w-md mx-auto rounded-3xl p-8 shadow-2xl relative overflow-hidden"
            style={{ background: '#161B2E', border: '1px solid rgba(255,255,255,0.1)' }}>
            {selectedPlan === 'annual' && (
              <div className="absolute top-4 right-4 text-sm font-bold px-3 py-1 rounded-full"
                style={{ background: 'rgba(244,121,32,0.15)', color: BRAND.orange, border: '1px solid rgba(244,121,32,0.3)' }}>
                Economia de R${PLANS.annual.savings}/ano
              </div>
            )}

            <h3 className="text-lg font-bold mb-1" style={{ color: '#fff' }}>Plano Profissional</h3>
            <p className="text-sm mb-6" style={{ color: 'rgba(255,255,255,0.45)' }}>Tudo incluso, sem surpresas</p>

            <div className="flex items-baseline mb-2">
              <span className="text-5xl font-extrabold" style={{ color: BRAND.orange }}>
                R${PLANS[selectedPlan].price}
              </span>
              <span className="ml-2" style={{ color: 'rgba(255,255,255,0.45)' }}>/mês</span>
            </div>

            {selectedPlan === 'annual' && (
              <p className="text-sm mb-6" style={{ color: 'rgba(255,255,255,0.45)' }}>
                Cobrado R${PLANS.annual.total}/ano{' '}
                <span className="line-through" style={{ color: 'rgba(255,255,255,0.25)' }}>R${PLANS.monthly.price * 12}</span>
              </p>
            )}

            <Link
              to="/signup"
              className="block w-full text-white py-4 rounded-2xl text-lg font-bold text-center hover:opacity-90 transition-all mb-4"
              style={{ background: BRAND.orange }}
            >
              Começar 14 Dias Grátis
            </Link>

            <p className="text-center text-sm mb-6" style={{ color: 'rgba(255,255,255,0.35)' }}>Sem cartão. Cancele quando quiser.</p>

            <ul className="space-y-3">
              {[
                'Agendamento online ilimitado',
                'Cadastro ilimitado de pets e clientes',
                'Agenda inteligente com controle de horários',
                'Painel profissional completo',
                'Ficha detalhada de cada pet',
                'Funciona no celular, tablet e PC',
                'Suporte por WhatsApp',
                'Atualizações gratuitas',
                'Seus dados sempre seguros',
              ].map((item, i) => (
                <li key={i} className="flex items-center" style={{ color: 'rgba(255,255,255,0.7)' }}>
                  <Check className="h-5 w-5 mr-3 shrink-0" style={{ color: BRAND.orange }} />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* ==================== FAQ ==================== */}
      <section className="py-16 sm:py-24 px-4" style={{ background: '#111827' }}>
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl sm:text-4xl font-bold text-center mb-12" style={{ color: '#fff' }}>
            Dúvidas frequentes
          </h2>

          <div className="space-y-3">
            {FAQ.map((item, i) => (
              <div key={i} className="rounded-2xl overflow-hidden"
                style={{ border: '1px solid rgba(255,255,255,0.08)', background: '#1a2235' }}>
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full flex items-center justify-between p-5 text-left transition-colors"
                  style={{ background: openFaq === i ? 'rgba(255,255,255,0.04)' : 'transparent' }}
                >
                  <span className="font-semibold" style={{ color: '#fff' }}>{item.q}</span>
                  <ChevronRight
                    className="h-5 w-5 transition-transform flex-shrink-0"
                    style={{ transform: openFaq === i ? 'rotate(90deg)' : 'rotate(0deg)', color: BRAND.orange }}
                  />
                </button>
                {openFaq === i && (
                  <div className="px-5 pb-5" style={{ color: 'rgba(255,255,255,0.55)' }}>{item.a}</div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ==================== FINAL CTA ==================== */}
      <section className="py-16 sm:py-24 px-4" style={{ background: '#0D1117' }}>
        <div className="max-w-3xl mx-auto text-center">
          <div className="inline-flex p-4 rounded-2xl mb-6"
            style={{ background: 'rgba(244,121,32,0.12)', border: '1px solid rgba(244,121,32,0.2)' }}>
            <Heart className="h-10 w-10" style={{ color: BRAND.orange }} />
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold mb-4" style={{ color: '#fff' }}>
            Seu negócio merece ser profissional
          </h2>
          <p className="text-lg mb-8 max-w-xl mx-auto" style={{ color: 'rgba(255,255,255,0.55)' }}>
            Junte-se aos profissionais que já transformaram sua rotina com o PetzCare.
            Comece agora, é grátis por 14 dias.
          </p>
          <Link
            to="/signup"
            className="inline-flex items-center px-8 py-4 rounded-2xl text-lg font-bold hover:opacity-90 transition-all"
            style={{ background: BRAND.orange, color: '#fff' }}
          >
            Quero Testar Grátis
            <ChevronRight className="h-5 w-5 ml-2" />
          </Link>
        </div>
      </section>

      {/* ==================== FOOTER ==================== */}
      <footer className="py-12 px-4" style={{ background: '#080C12', borderTop: '1px solid rgba(255,255,255,0.07)' }}>
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div style={{ background: '#fff', borderRadius: '10px', padding: '4px 12px', display: 'inline-flex', alignItems: 'center' }}>
            <img src="/logo.png" alt="PetzCare" style={{ height: '28px', width: 'auto' }} />
          </div>
          <p className="text-sm" style={{ color: 'rgba(255,255,255,0.35)' }}>
            © {new Date().getFullYear()} PetzCare. Todos os direitos reservados.
          </p>
          <div className="flex items-center space-x-4 text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>
            <Link to="/agendar" className="hover:text-white transition-colors">App</Link>
          </div>
        </div>
      </footer>

    </div>
  );
}
