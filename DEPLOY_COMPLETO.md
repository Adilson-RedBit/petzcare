# 🚀 Deploy Completo - Passo a Passo Executável

## ⚠️ IMPORTANTE: Antes de Começar

1. **Faça login no Cloudflare Dashboard**: https://dash.cloudflare.com/login
   - Email: adilson.paulasouza@gmail.com
   - Adicione o domínio `petzcare.org` se ainda não adicionou

2. **Crie um API Token** (alternativa ao login OAuth):
   - Acesse: https://dash.cloudflare.com/profile/api-tokens
   - Clique em "Create Token"
   - Use o template "Edit Cloudflare Workers"
   - Copie o token gerado

---

## 📋 Método 1: Script Automatizado (Recomendado)

Execute no PowerShell:

```powershell
# 1. Configure o API Token (se usar)
$env:CLOUDFLARE_API_TOKEN="cole-seu-token-aqui"

# 2. Execute o script
.\deploy.ps1
```

---

## 📋 Método 2: Comandos Manuais (Passo a Passo)

### Passo 1: Autenticação

**Opção A - API Token (Recomendado):**
```powershell
$env:CLOUDFLARE_API_TOKEN="seu-token-aqui"
wrangler whoami
```

**Opção B - Login OAuth:**
```bash
wrangler login
```
(Complete o login no navegador)

### Passo 2: Criar Banco de Dados D1

```bash
wrangler d1 create petcare-db
```

**⚠️ COPIE O `database_id` que aparecer!**

Exemplo de saída:
```
✅ Successfully created DB 'petcare-db'!

[[d1_databases]]
binding = "DB"
database_name = "petcare-db"
database_id = "abc123-def456-ghi789"  ← COPIE ESTE ID
```

### Passo 3: Atualizar wrangler.json

Abra `wrangler.json` e atualize:

```json
{
  "d1_databases": [
    {
      "binding": "DB",
      "database_name": "petcare-db",
      "database_id": "COLE_AQUI_O_DATABASE_ID"
    }
  ],
  "r2_buckets": [
    {
      "binding": "R2_BUCKET",
      "bucket_name": "petcare-files"
    }
  ]
}
```

### Passo 4: Criar Bucket R2

```bash
wrangler r2 bucket create petcare-files
```

### Passo 5: Executar Migrations

Execute cada migration na ordem:

```bash
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

### Passo 6: Build e Deploy do Worker

```bash
npm run build:worker
npm run deploy:worker
```

**⚠️ ANOTE A URL DO WORKER!** (ex: `https://seu-worker.workers.dev`)

### Passo 7: Build e Deploy do Next.js

```bash
npm run build:pages
npm run deploy:pages
```

Ou via GitHub (recomendado para atualizações automáticas):

1. Crie um repositório no GitHub
2. Faça push do código
3. No Cloudflare Dashboard:
   - Vá em **Pages** > **Create a project**
   - Conecte seu repositório
   - Configure:
     - **Build command**: `npm run build:pages`
     - **Output directory**: `.vercel/output/static`
     - **Root directory**: `/`

### Passo 8: Configurar Variável de Ambiente

No Cloudflare Pages Dashboard:
1. Vá em seu projeto Pages
2. **Settings** > **Environment Variables**
3. Adicione:
   - **Variable name**: `WORKER_URL`
   - **Value**: A URL do seu worker (do Passo 6)

### Passo 9: Configurar Domínio Customizado

No Cloudflare Pages Dashboard:
1. Vá em seu projeto Pages
2. **Custom domains** > **Set up a custom domain**
3. Digite: `petzcare.org`
4. Siga as instruções para configurar DNS

---

## ✅ Verificação Final

Após o deploy, verifique:

- [ ] Worker está respondendo: `https://seu-worker.workers.dev`
- [ ] Pages está funcionando: `https://seu-projeto.pages.dev`
- [ ] Domínio customizado está ativo: `https://petzcare.org`
- [ ] Variável `WORKER_URL` está configurada
- [ ] Teste criar um agendamento
- [ ] Teste upload de logo
- [ ] Teste cadastro de pet

---

## 🐛 Troubleshooting

### Erro: "Not authenticated"
```bash
# Configure o API Token
$env:CLOUDFLARE_API_TOKEN="seu-token"
wrangler whoami
```

### Erro: "Database not found"
- Verifique se o `database_id` no `wrangler.json` está correto
- Execute: `wrangler d1 list` para ver seus bancos

### Erro: "R2 bucket not found"
- Verifique se o bucket foi criado: `wrangler r2 bucket list`
- Verifique o nome no `wrangler.json`

### Imagens não carregam
- Verifique se o R2 bucket está configurado
- Verifique as permissões do bucket
- Verifique se o worker está retornando URLs corretas

---

## 📞 Suporte

Se encontrar problemas:
1. Verifique os logs: `wrangler tail`
2. Verifique o status: `wrangler deployments list`
3. Consulte a documentação: https://developers.cloudflare.com/



























