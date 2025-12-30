# 🚀 Guia de Deploy - PetCare Agenda MVP

Este guia vai te ajudar a fazer o deploy do seu MVP para compartilhar com profissionais para validação.

## 📋 Pré-requisitos

1. **Conta no Cloudflare** (gratuita): https://dash.cloudflare.com/sign-up
2. **Wrangler CLI instalado globalmente**:
   ```bash
   npm install -g wrangler
   ```
3. **Autenticação no Cloudflare**:
   ```bash
   wrangler login
   ```

## 🎯 Opção 1: Deploy no Cloudflare Pages (Recomendado)

### Passo 1: Preparar o Build do Next.js

O projeto já está configurado para Cloudflare Pages. Primeiro, vamos garantir que o build funciona:

```bash
# Instalar dependências (se ainda não instalou)
npm install --legacy-peer-deps

# Fazer build do worker
npm run build:worker

# Fazer build do Next.js
npm run build
```

### Passo 2: Configurar o Banco de Dados D1

1. **Criar o banco de dados D1 no Cloudflare**:
   ```bash
   wrangler d1 create petcare-db
   ```
   
   Isso vai retornar algo como:
   ```
   ✅ Successfully created DB 'petcare-db'!
   Created your database using D1's new storage backend. The new storage backend is not yet recommended for production workloads, but backs up your data via snapshots to R2.
   
   [[d1_databases]]
   binding = "DB"
   database_name = "petcare-db"
   database_id = "abc123..."
   ```

2. **Atualizar o `wrangler.json`** com o `database_id` retornado:
   ```json
   "d1_databases": [
     {
       "binding": "DB",
       "database_name": "petcare-db",
       "database_id": "abc123..." // Cole o ID retornado aqui
     }
   ]
   ```

3. **Executar as migrations no banco de produção**:
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

   Ou execute todas de uma vez:
   ```bash
   for file in migrations/*.sql; do
     wrangler d1 execute petcare-db --file="$file"
   done
   ```

4. **Criar um usuário administrador** (opcional, se precisar):
   ```bash
   wrangler d1 execute petcare-db --file=./scripts/create-admin-user.sql
   ```

### Passo 3: Configurar o R2 Bucket

1. **Criar o bucket R2**:
   ```bash
   wrangler r2 bucket create petcare-files
   ```

2. **Atualizar o `wrangler.json`** com o nome do bucket:
   ```json
   "r2_buckets": [
     {
       "binding": "R2_BUCKET",
       "bucket_name": "petcare-files"
     }
   ]
   ```

### Passo 4: Fazer Deploy do Worker

```bash
# Deploy do worker
wrangler deploy
```

Isso vai retornar uma URL do worker, algo como:
```
https://petcare-agenda.workers.dev
```

### Passo 5: Configurar Variáveis de Ambiente

No dashboard do Cloudflare:
1. Vá em **Workers & Pages** > Seu Worker > **Settings** > **Variables**
2. Configure se necessário (geralmente não precisa, pois D1 e R2 já estão vinculados)

### Passo 6: Deploy do Next.js no Cloudflare Pages

1. **Instalar o adapter do Cloudflare** (já está instalado):
   ```bash
   npm install @cloudflare/next-on-pages
   ```

2. **Fazer build com o adapter**:
   ```bash
   npx @cloudflare/next-on-pages
   ```

3. **Deploy via Wrangler** ou **via GitHub**:
   
   **Opção A: Deploy direto via Wrangler**:
   ```bash
   # Após o build acima, faça deploy
   wrangler pages deploy .vercel/output/static
   ```
   
   **Opção B: Deploy via GitHub (Recomendado para atualizações automáticas)**:
   1. Crie um repositório no GitHub
   2. Faça push do código
   3. No Cloudflare Dashboard:
      - Vá em **Pages** > **Create a project**
      - Conecte seu repositório GitHub
      - Configure:
        - **Framework preset**: Next.js
        - **Build command**: `npm run build && npx @cloudflare/next-on-pages`
        - **Build output directory**: `.vercel/output/static`
        - **Root directory**: `/`

### Passo 7: Configurar a URL do Worker no Next.js

No Cloudflare Pages, configure a variável de ambiente:
- **Variable name**: `WORKER_URL`
- **Value**: A URL do seu worker (ex: `https://petcare-agenda.workers.dev`)

## 🎯 Opção 2: Deploy Rápido para Testes (ngrok/Tunnels)

Para testes rápidos sem fazer deploy completo:

### Usando Cloudflare Tunnels (Recomendado)

```bash
# Instalar cloudflared
# Windows: baixe de https://github.com/cloudflare/cloudflared/releases
# Ou via chocolatey: choco install cloudflared

# Criar um tunnel público
cloudflared tunnel --url http://localhost:3000
```

Isso vai gerar uma URL pública temporária como:
```
https://random-subdomain.trycloudflare.com
```

**⚠️ Limitações:**
- URL muda a cada execução
- Precisa manter o terminal aberto
- Ideal apenas para testes rápidos

### Usando ngrok

```bash
# Instalar ngrok: https://ngrok.com/download
# Criar conta gratuita e pegar o token

# Executar
ngrok http 3000
```

## 📝 Checklist Antes de Compartilhar

- [ ] Banco de dados D1 criado e migrations executadas
- [ ] R2 bucket criado para armazenar imagens
- [ ] Worker deployado e funcionando
- [ ] Next.js deployado no Cloudflare Pages
- [ ] Variável de ambiente `WORKER_URL` configurada
- [ ] Testar criação de agendamento
- [ ] Testar upload de logo
- [ ] Testar cadastro de pet
- [ ] Verificar se as imagens estão carregando

## 🔗 Compartilhando o MVP

Após o deploy, você terá uma URL pública. Compartilhe com os profissionais:

1. **URL da aplicação**: `https://seu-app.pages.dev`
2. **Instruções básicas**:
   - Acesse a URL
   - Na página inicial, clique em "Agendar Agora"
   - Preencha os dados do pet e serviços
   - Para acessar o painel profissional, vá em "Profissional" (se tiver autenticação configurada)

## 🐛 Troubleshooting

### Erro: "R2 bucket não configurado"
- Verifique se o bucket R2 foi criado
- Verifique se o nome no `wrangler.json` está correto

### Erro: "Database not found"
- Verifique se o D1 database foi criado
- Verifique se o `database_id` no `wrangler.json` está correto
- Execute as migrations novamente

### Imagens não carregam
- Verifique se o R2 bucket está configurado
- Verifique as permissões do bucket
- Verifique se o worker está retornando as URLs corretas

### Worker não responde
- Verifique se o worker foi deployado: `wrangler deployments list`
- Verifique os logs: `wrangler tail`

## 📚 Recursos Adicionais

- [Documentação Cloudflare Pages](https://developers.cloudflare.com/pages/)
- [Documentação Cloudflare Workers](https://developers.cloudflare.com/workers/)
- [Documentação D1](https://developers.cloudflare.com/d1/)
- [Documentação R2](https://developers.cloudflare.com/r2/)

## 💡 Dicas para Validação

1. **Crie um documento de feedback** para os profissionais preencherem
2. **Prepare um vídeo rápido** mostrando as funcionalidades principais
3. **Configure um ambiente de teste** com dados de exemplo
4. **Monitore os logs** durante os testes para identificar problemas rapidamente

---

**Boa sorte com a validação do MVP! 🎉**



























