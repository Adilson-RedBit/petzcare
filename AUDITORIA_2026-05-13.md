# 🔍 Auditoria de Código — PetCare Agenda (petzcare.org)

**Data:** 13 de maio de 2026
**Escopo:** Segurança, lógica, arquitetura e limpeza de código
**Estado:** Apenas relatório (nenhum arquivo do código-fonte foi modificado)
**Nota geral atualizada:** **4.5 / 10** — pior do que o RESUMO_EXECUTIVO.md anterior sugere, porque ele descreveu correções que ainda não foram efetivamente aplicadas no nível do worker.

---

## 📊 Sumário por severidade

| Severidade | Quantidade | Bloqueia lançamento? |
|------------|-----------|----------------------|
| 🔴 Crítico  | 8 | **SIM** |
| 🟠 Alto     | 9 | Sim para produção paga |
| 🟡 Médio    | 11 | Não, mas resolver antes de escalar |
| 🟢 Baixo / Limpeza | 14 | Não |

---

## 🔴 CRÍTICOS — Bloqueiam lançamento comercial

### C-1. Worker (Hono) está 100% sem autenticação
**Onde:** `src/worker/index.ts` (todas as rotas, linhas 16-768)
**O que acontece:** Não há middleware de auth no Hono. Todas as rotas estão abertas:
- `GET/POST /api/pets`
- `GET/POST /api/appointments`
- `PATCH /api/appointments/:id/status`
- `GET/POST/PUT/DELETE /api/admin/services`
- `GET/POST /api/admin/business-config`
- `POST /api/upload-pet-photo`, `/api/upload-business-logo`
- `GET /api/files/:folder/:file`

**Impacto:** Como o worker é deployado em `*.workers.dev` separado do front, **qualquer pessoa que conheça a URL do worker consegue listar pets de clientes, criar/cancelar agendamentos, alterar preços, fazer upload de imagens arbitrárias no R2 e baixar arquivos**. Ignorar a sessão do Next.js é trivial — basta chamar o worker direto.
**Correção:** Implementar middleware Hono que valida JWT em cabeçalho `Authorization: Bearer <token>` antes de qualquer rota `/api/*` exceto rotas públicas (login/register/services-list).

---

### C-2. Worker não tem endpoints `/api/auth/login` nem `/api/auth/register`
**Onde:** `src/worker/index.ts` (ausência completa); `src/app/api/auth/login/route.ts:34`
**O que acontece:** O front faz `proxyToWorker("/api/auth/login", …)` mas o worker não implementa essa rota. Em produção (sem o fallback de desenvolvimento), **login simplesmente não funciona**. Em dev, só funciona via fallback hardcoded `admin@petcare.com / admin123`.
**Impacto:** Arquitetura de auth está fundamentalmente quebrada. Em produção, ninguém consegue logar. Em dev, qualquer pessoa loga com a senha fixa.
**Correção:** Implementar no worker: `POST /api/auth/register` (hash bcrypt, INSERT em `professionals`), `POST /api/auth/login` (SELECT, verifyPassword, gerar JWT, INSERT em `user_sessions` com hash), `POST /api/auth/logout` (DELETE de `user_sessions`).

---

### C-3. Middleware do Next.js apenas verifica existência do cookie, não valida JWT
**Onde:** `src/middleware.ts:6-14`
**O que acontece:**
```ts
const authToken = request.cookies.get("auth_token");
if (pathname.startsWith("/professional")) {
  if (!authToken) { … redirect … }
}
```
**Impacto:** Qualquer pessoa pode setar manualmente um cookie `auth_token=qualquercoisa` no navegador (DevTools → Application → Cookies) e o middleware deixa passar. A validação real ocorre só dentro dos endpoints — e como o C-1 mostra, o worker nem valida.
**Correção:** No middleware, importar e chamar `verifyJWT(authToken.value)`. Se retornar `null`, redirecionar.

---

### C-4. OTP armazenado em `Map` na memória — não funciona em Cloudflare Workers
**Onde:** `src/lib/otp.ts:70` (`const verificationCodes = new Map<…>()`)
**O que acontece:** Cloudflare Workers são stateless e re-instanciados a cada request (ou pool curto). O `Map` é zerado e o `setTimeout` raramente roda. Em desenvolvimento Node.js funciona; em produção, a verificação **sempre falha** (ou pior, falha de forma intermitente confundindo o usuário).
**Impacto:** Feature de OTP completamente quebrada em produção. Pior ainda: dá falsa sensação de proteção.
**Correção:** Mover armazenamento de OTP para uma tabela D1 (`otp_codes`) com `identifier`, `code_hash`, `expires_at`. Hash do código com SHA-256 antes de salvar.

---

### C-5. Rate limiting está implementado mas **nunca é chamado**
**Onde:** `src/lib/rateLimit.ts` existe e é completo; `grep -rn "checkRateLimit"` em `src/app/api/` → **0 ocorrências**
**Impacto:** Login, OTP send, register estão expostos a brute force / spam de SMS sem nenhuma proteção, apesar do código estar pronto.
**Correção:** Em cada rota sensível, no início:
```ts
const ip = request.headers.get("cf-connecting-ip") || "unknown";
const limit = await checkRateLimit(env.DB, ip, RATE_LIMIT_CONFIGS.login);
if (!limit.allowed) return NextResponse.json({error:"Too many requests"}, {status:429});
```
Mas observe: `checkRateLimit` precisa de `D1Database` e está na pasta Next.js (sem acesso a D1). Tem que mover pro worker ou mudar a estratégia (Cloudflare Workers tem Rate Limiting API nativa).

---

### C-6. Fallback de login com credencial hardcoded em produção, dependente de `NODE_ENV`
**Onde:** `src/app/api/auth/login/route.ts:57-79`
**O que acontece:** Se `NODE_ENV === "development"`, aceita `admin@petcare.com / admin123` sem checar nada. O `wrangler.json:14` define `NODE_ENV: "production"`, mas o `next.config.js` não força isso. Se a env var não for setada corretamente no Cloudflare Pages, este fallback é ativado em produção.
**Impacto:** Risco real de bypass total de autenticação se `NODE_ENV` não estiver propagado. Já vi isso causar incidente.
**Correção:** Remover o bloco completamente. Para dev, usar seed do banco com usuário real.

---

### C-7. `JWT_SECRET` tem fallback hardcoded em código
**Onde:** `src/lib/jwt.ts:24-28`
**O que acontece:**
```ts
if (process.env.NODE_ENV === "development") {
  return "dev-secret-key-for-local-development-only-K8j3mN9pQ2rT5vX8...";
}
```
**Impacto:** Mesmo problema do C-6 — depende de `NODE_ENV` estar correto. Pior: a string está commitada no git (`.gitignore` existe mas o secret está dentro do `.ts`, que é versionado). Se alguém clonar e usar em produção, todos os JWTs são forjáveis.
**Correção:** Falhar `throw` se `JWT_SECRET` não existir, sem nenhuma exceção. Em dev, exigir setar a variável (criar `.env.local`).

---

### C-8. Upload de arquivos no worker sem validação de tipo/tamanho
**Onde:** `src/worker/index.ts:439-469` e `:736-766`
**O que acontece:** O worker recebe `formData` e dá `R2_BUCKET.put()` sem checar MIME type, tamanho ou extensão. A validação só existe no Next.js (`validateUpload.ts`). Mas o worker é acessível diretamente (C-1).
**Impacto:** Atacante pode subir executáveis, PHPs, payloads de até o limite do R2 (5GB), enchendo seu bucket e te custando $$$. Ou hospedar phishing usando seu domínio.
**Correção:** Replicar `validateUpload` no worker (sem dependência de `File` global do Node — usar `Content-Type` e `Content-Length`).

---

## 🟠 ALTOS — Resolver antes de cobrar clientes

### A-1. Queries N+1 ao listar agendamentos
**Onde:** `src/worker/index.ts:147-193`
**O que acontece:** Loop `for (const row of result.results)` que executa uma query SQL nova para buscar `appointment_services` de cada agendamento.
**Impacto:** 100 agendamentos = 101 queries D1. D1 cobra por query e tem limite por minuto. Performance ruim já com poucos clientes.
**Correção:** Single query com `LEFT JOIN appointment_services` + agrupamento em memória, ou `IN (?,?,?…)` com todos os IDs.

---

### A-2. Race condition em criação de agendamento
**Onde:** `src/worker/index.ts:201-275`
**O que acontece:** Dois clientes podem clicar "agendar" no mesmo horário simultaneamente. Não há lock nem `UNIQUE(appointment_date, appointment_time)` no SQL. Ambos passam.
**Impacto:** Pet shop com horário duplicado. Cliente irritado.
**Correção:** Adicionar constraint `UNIQUE(appointment_date, appointment_time) WHERE status != 'cancelado'` e tratar erro de conflito, OU usar transaction `BEGIN/COMMIT` com SELECT FOR UPDATE (D1 ainda não suporta — usar UPSERT com WHERE NOT EXISTS).

---

### A-3. Criação de agendamento não é transacional
**Onde:** `src/worker/index.ts:242-268`
**O que acontece:** INSERT em `appointments`, depois loop com INSERT em `appointment_services`. Se um dos serviços falhar, o agendamento fica órfão sem serviços.
**Impacto:** Dados corrompidos, total_price inconsistente com services.
**Correção:** D1 tem `batch()` API. Agrupar todos os INSERTs em uma única operação batch atômica.

---

### A-4. Arquitetura híbrida confusa: 3 sistemas de roteamento
**Onde:** `src/app/` (Next.js App Router), `src/worker/index.ts` (Hono), `src/react-app/` (React Router + Vite)
**O que acontece:** O projeto tem **três front-ends** coexistindo: o Next.js que proxia tudo, o React Router que duplica páginas (`src/react-app/pages/Home.tsx`, `Professional.tsx`), e o worker Hono. O `package.json:38` usa `vite build` (não `next build`), então o que é deployado em produção é confuso.
**Impacto:** Bugs por divergência entre versões da mesma página. Bundle inflado. Dúvida de qual código realmente roda.
**Correção:** Escolher um. Recomendação: manter Next.js + worker Hono e **deletar** `src/react-app/` inteiro, `index.html`, `vite.config.ts`. Mudar `package.json` para `next build`.

---

### A-5. Schema do banco sem foreign keys nem CHECK constraints
**Onde:** `migrations/1.sql:11-30`
**O que acontece:** `appointments.pet_id` deveria ter `REFERENCES pets(id) ON DELETE CASCADE` — não tem. `status` deveria ter `CHECK (status IN ('agendado',...))` — não tem.
**Impacto:** Possível deletar um pet e deixar agendamentos órfãos. Possível inserir `status='qualquercoisa'` via worker (já que falta auth — C-1).
**Correção:** Migration 13 que recria as tabelas com FK e CHECK constraints (SQLite não permite ALTER ADD CONSTRAINT).

---

### A-6. Lógica de pricing duplicada em 2 lugares
**Onde:** `src/worker/index.ts:43-48` (GET /api/services) e `:228-233` (POST /api/appointments)
**O que acontece:** O multiplier `{excelente:1.0, bom:1.1, regular:1.2, ruim:1.3}` está copy-pasted. Cliente vê preço X, mas se você ajustar o multiplier num lugar e esquecer do outro, paga preço Y.
**Correção:** Extrair para `src/shared/pricing.ts` com função `calculatePrice(basePrice, coatCondition)`.

---

### A-7. Token de sessão "retornado" pelo worker é fictício
**Onde:** `src/app/api/auth/login/route.ts:44` (`data.sessionToken`)
**O que acontece:** A rota Next.js espera `data.sessionToken` do worker, mas o worker nem tem rota de login (C-2). Mesmo quando implementar, o fluxo é: front gera JWT (em `setSession`) com `generateJWT` chamado **antes** do worker validar a senha. A "sessão no banco" não está realmente conectada.
**Impacto:** A intenção declarada em `migrations/11.sql` (tabela `user_sessions` para revogar tokens) está completamente desconectada do código.
**Correção:** Worker gera o JWT após validar senha; retorna `{ jwt, user }`. Front recebe e seta cookie. Hash do JWT vai pra `user_sessions`.

---

### A-8. CORS aberto para qualquer origem no worker
**Onde:** `src/worker/index.ts:13` (`app.use("*", cors())` sem origem)
**Impacto:** Qualquer site malicioso pode fazer fetch para seu worker e ler/escrever dados (mesmo problema do C-1 amplificado).
**Correção:** `cors({ origin: ["https://petzcare.org", "https://www.petzcare.org"], credentials: true })`.

---

### A-9. Logout não invalida JWT
**Onde:** `src/app/api/auth/logout/route.ts` + `src/lib/auth.ts:81-85`
**O que acontece:** `clearSession` só apaga o cookie. O JWT em si permanece válido até `exp` (7 dias). Se alguém roubou o cookie (XSS, malware), continua tendo acesso após logout.
**Correção:** Logout deve fazer DELETE em `user_sessions` por `token_hash`. Antes de cada requisição autenticada, verificar se a sessão ainda existe na tabela.

---

## 🟡 MÉDIOS — Reduzir risco e melhorar UX

### M-1. Hash bcrypt com 10 rounds
`src/lib/auth.ts:28` — recomendação atual da OWASP é 12+. Migrar gradualmente em cada login.

### M-2. Senha mínima de 6 caracteres, sem complexidade
`src/lib/auth.ts` (não há validação de complexidade) e `LoginSchema` em `login/route.ts:9`. Exigir 8+, com letra+número.

### M-3. JWT carrega `name` (PII)
`src/lib/jwt.ts:6-13`. JWTs ficam em logs, são acessíveis a qualquer JS no domínio se o cookie não for httpOnly em alguma versão futura. Minimizar payload: só `userId` e `role`. Buscar nome no banco quando precisar.

### M-4. Sem CSRF protection
Cookies httpOnly não protegem contra CSRF. Adicionar token CSRF em forms POST/PATCH.

### M-5. Sem headers de segurança
Nenhum `Content-Security-Policy`, `Strict-Transport-Security`, `X-Frame-Options`, `Referrer-Policy`. Adicionar no `next.config.js` via `headers()` e no Cloudflare via Page Rules.

### M-6. Console.log com dados sensíveis
`src/worker/index.ts:358-359` loga telefone do cliente. `src/app/api/appointments/route.ts:52` loga body inteiro. Remover ou usar logger estruturado que mascara PII.

### M-7. Validação de email muito permissiva
`src/lib/sanitize.ts:51` regex aceita `a@b.c` mas também coisas estranhas. Usar `zod.email()` que já é mais rigoroso, ou lib dedicada.

### M-8. Sem paginação em listagens
`/api/pets`, `/api/appointments`, `/api/admin/services` retornam tudo. Com 10k registros, vai estourar memória do worker (128MB).

### M-9. Erros expõem detalhes internos em alguns endpoints
Vários `catch (error)` retornam mensagem genérica (bom), mas alguns vazam `error.message` em `appointments/route.ts:84`. Padronizar.

### M-10. Sem invalidação de cache do navegador em uploads
Após `POST /api/upload-pet-photo`, a imagem pode estar em cache se reusa o mesmo path. Versionar URLs com hash do conteúdo.

### M-11. Sem rate limit no OTP send (mesmo se o rate limit do C-5 for ativado, OTP precisa de regra própria mais agressiva)
`src/app/api/otp/send/route.ts` — sem proteção. Atacante pode esgotar seu saldo de SMS/email.

---

## 🟢 LIMPEZA E PESO DE CÓDIGO

### L-1. 20 arquivos `.md` no root
`ANALISE_PROFUNDA.md`, `AUTH_SETUP.md`, `CHECKLIST_CORRECOES.md`, `COMECE_AQUI.md`, `CONFIGURAR_DOMINIO.md`, 4× CORRECOES_*, `DATABASE_SETUP.md`, 4× DEPLOY_*, `ENV_VARIABLES.md`, `LOGIN_ALTERNATIVO.md`, `NEXTJS_SETUP.md`, `QUICK_DEPLOY.md`, `README.md`, `RESUMO_EXECUTIVO.md`, `TESTE_AUTENTICACAO.md`
**Ação:** Mover tudo para pasta `docs/` e consolidar deploys em 1 só. Manter README.md curto e linkar.

### L-2. 7 scripts PowerShell duplicados
`configurar-token.ps1`, `continuar-deploy.ps1`, `debug-next.ps1`, `deploy.ps1`, `diagnostico.ps1`, `executar-deploy.ps1`, `iniciar-app.ps1`
**Ação:** Consolidar em scripts no `package.json`: `npm run deploy`, `npm run deploy:full`, `npm run dev`. Deletar os `.ps1`.

### L-3. Pasta `src/react-app/` é código morto
Restou da versão Vite original. `App.tsx`, `main.tsx`, `pages/Home.tsx`, `pages/Professional.tsx`, e ~10 componentes vivem em paralelo aos componentes Next.js em `src/app/` e `src/components/`.
**Ação:** Após confirmar que Next.js é o caminho, `rm -rf src/react-app/`. Vai cortar ~30% do bundle.

### L-4. `index.html`, `vite.config.ts`, `vite-env.d.ts`
Sobras da Vite. Não são usadas em produção (Cloudflare Pages roda Next.js build).
**Ação:** Deletar.

### L-5. `package.json` tem `react-router` mas usa Next.js
Linha 13 do `package.json`. Dependência morta.
**Ação:** `npm uninstall react-router`.

### L-6. `proxyToWorker()` duplicado em ~15 rotas
Função idêntica copiada em cada `route.ts` do `src/app/api/`.
**Ação:** Extrair para `src/lib/workerProxy.ts` e importar.

### L-7. Função `sendConfirmationNotification` é placeholder
`src/worker/index.ts:338-362` só faz `console.log`. Promete enviar WhatsApp mas só monta uma URL. Em produção, ninguém recebe notificação.
**Ação:** Integrar Z-API ou Twilio. Ou remover a feature até implementar de verdade.

### L-8. Tipagem fraca em D1 results
`(row: any)` aparece em 15+ lugares no `src/worker/index.ts`. Criar tipos `interface PetRow`, `interface AppointmentRow`.

### L-9. `business-config` tem defaults hardcoded
`src/worker/index.ts:684-696` — telefone `(11) 9999-9999`, `@petcare.agenda`. Movem-se pra .env ou seed.

### L-10. `test-logo.jpg` de 4 bytes no root
Lixo. Deletar.

### L-11. `PetCare Agenda.code-workspace` versionado
Arquivo de IDE. Mover pro `.gitignore`.

### L-12. Sem `.env.example`
Onboarding de novos devs é via tentativa-e-erro. Criar `.env.example` listando `JWT_SECRET`, `WORKER_URL`, `CLOUDFLARE_API_TOKEN`.

### L-13. `database_id` hardcoded em `wrangler.json`
Linha 19: `"acd5b368-09e4-40cb-82ef-257a01dbf654"`. Não é um secret, mas amarra ao DB único — sem ambiente de staging.
**Ação:** Adicionar `[env.staging]` no `wrangler.json` com `database_id` separado.

### L-14. Sem nenhum teste
`find . -name "*.test.*"` → 0 resultados. `package.json` não tem `vitest` nem script `test`.
**Ação:** Adicionar `vitest`, escrever testes para `jwt.ts`, `auth.ts`, e o fluxo de criação de appointment.

---

## 📐 Refatorações estruturais sugeridas (depois dos críticos)

1. **Eliminar a camada de proxy Next.js → Worker.** O Next.js está só repassando requests. Ou (a) o Next.js implementa a lógica direto (com D1 binding via `getRequestContext`) e o worker some, OU (b) o front é estático e tudo vai pro worker direto. Hoje você paga 2× pela mesma chamada.
2. **Consolidar para 1 framework de UI.** Next.js OU React+Vite. Não os dois.
3. **Adicionar camada de domínio.** `src/domain/appointments.ts` com a lógica de pricing, conflito, validação — testável sem precisar de D1.
4. **CI/CD com checks obrigatórios.** GitHub Actions rodando `tsc --noEmit`, `eslint`, e (depois) `vitest` em todo PR.

---

## 🎯 Plano de correção priorizado (proposta de sprints)

### Sprint 1 (1 semana) — Desbloquear segurança crítica
- C-1: Auth middleware no worker
- C-2: Implementar /api/auth/login e /register no worker
- C-3: Validar JWT no middleware Next.js
- C-6, C-7: Remover fallbacks de senha e JWT_SECRET

### Sprint 2 (1 semana) — Fechar buracos restantes
- C-4: OTP no D1
- C-5: Ativar rate limit em login/register/otp
- C-8: Validar uploads no worker
- A-8: Restringir CORS
- A-9: Logout invalida sessão

### Sprint 3 (1-2 semanas) — Integridade de dados
- A-1: Eliminar N+1
- A-2, A-3: Booking transacional + UNIQUE constraint
- A-5: FKs e CHECK constraints (migration 13)
- A-6, A-7: Refatorar pricing e fluxo de sessão

### Sprint 4 (1 semana) — Limpeza
- L-3, L-4, L-5: Remover código morto (react-app, vite, react-router)
- L-1, L-2: Reorganizar docs e scripts
- L-6: Extrair proxyToWorker
- L-14: Adicionar vitest com testes mínimos

### Pós-sprint — Médios e nice-to-have
- Todos os itens M-* conforme prioridade do produto.

---

## 📈 Expectativa pós-correção

Aplicando Sprint 1+2+3, a nota sobe de **4.5/10 → ~7.5/10**:
- Segurança: 3/10 → 8/10
- Arquitetura: 5/10 → 7/10
- Performance: 6/10 → 8/10
- Qualidade: 6/10 → 7/10
- Testes: 0/10 → 4/10
- Documentação: 5/10 → 6/10

**Tempo total estimado:** 4-5 semanas com 1 dev sênior em tempo integral, ou 6-8 semanas em paralelo com outras coisas.

---

## ✅ O que está bom (pra equilibrar)

- TypeScript bem aplicado em quase todo o front
- Zod schemas bem definidos em `src/shared/types.ts`
- Stack moderna e barata (Cloudflare D1+R2+Pages+Workers)
- bcrypt em vez de SHA-256 (correção de fase 2 foi aplicada)
- Estrutura de pastas razoável (lib/ separado, components/ separado)
- httpOnly cookie no auth_token
- Migrations versionadas

---

**Próximo passo recomendado:** começar pelo C-1 + C-2 (implementar auth no worker). Os outros 6 críticos dependem disso estar de pé. Posso preparar os snippets de código (diffs prontos) para cada item crítico se você quiser — basta pedir.
