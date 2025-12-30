# ⚡ Deploy Rápido - Passo a Passo Simplificado

## 🎯 Para Compartilhar o MVP Rapidamente

### 1️⃣ Preparação (5 minutos)

```bash
# 1. Instalar Wrangler globalmente (se ainda não tem)
npm install -g wrangler

# 2. Fazer login no Cloudflare
wrangler login

# 3. Verificar se está tudo instalado
npm install --legacy-peer-deps
```

### 2️⃣ Criar Recursos no Cloudflare (10 minutos)

```bash
# Criar banco de dados D1
wrangler d1 create petcare-db

# Copie o database_id que aparecer e cole no wrangler.json

# Criar bucket R2 para imagens
wrangler r2 bucket create petcare-files

# Atualizar wrangler.json com o nome do bucket
```

### 3️⃣ Configurar o Banco de Dados (5 minutos)

```bash
# Executar todas as migrations
wrangler d1 execute petcare-db --file=./migrations/1.sql
wrangler d1 execute petcare-db --file=./migrations/2.sql
wrangler d1 execute petcare-db --file=./migrations/3.sql
wrangler d1 execute petcare-db --file=./migrations/4.sql
wrangler d1 execute petcare-db --file=./migrations/5.sql
wrangler d1 execute petcare-db --file=./migrations/6.sql
wrangler d1 execute petcare-db --file=./migrations/7.sql
wrangler d1 execute petcare-db --file=./migrations/8.sql
wrangler d1 execute petcare-db --file=./migrations/9.sql
wrangler d1 execute petcare-db --file=./migrations/10.sql
```

### 4️⃣ Deploy do Worker (2 minutos)

```bash
npm run deploy:worker
```

Anote a URL que aparecer (ex: `https://seu-worker.workers.dev`)

### 5️⃣ Deploy do Next.js (5 minutos)

```bash
# Build e deploy
npm run deploy:pages
```

Ou via GitHub (recomendado):
1. Crie um repositório no GitHub
2. Faça push do código
3. No Cloudflare Dashboard > Pages > Create project
4. Conecte o repositório
5. Configure:
   - Build command: `npm run build:pages`
   - Output directory: `.vercel/output/static`

### 6️⃣ Configurar Variável de Ambiente

No Cloudflare Pages Dashboard:
- Settings > Environment Variables
- Adicione: `WORKER_URL` = URL do seu worker

### 7️⃣ Pronto! 🎉

Sua aplicação estará disponível em:
`https://seu-projeto.pages.dev`

---

## 🚨 Solução Rápida para Testes Imediatos

Se precisar compartilhar AGORA mesmo, use Cloudflare Tunnel:

```bash
# Instalar cloudflared (se não tiver)
# Windows: baixe de https://github.com/cloudflare/cloudflared/releases

# Em um terminal, rode o Next.js
npm run dev

# Em outro terminal, rode o worker
npm run dev:worker

# Em um terceiro terminal, crie o tunnel
cloudflared tunnel --url http://localhost:3000
```

Isso vai gerar uma URL pública temporária que você pode compartilhar imediatamente!

---

## 📋 Checklist Rápido

- [ ] `wrangler login` feito
- [ ] D1 database criado e migrations executadas
- [ ] R2 bucket criado
- [ ] Worker deployado
- [ ] Next.js deployado
- [ ] Variável `WORKER_URL` configurada
- [ ] Testado criação de agendamento
- [ ] Testado upload de logo

---

**Tempo total estimado: ~30 minutos** ⏱️



























