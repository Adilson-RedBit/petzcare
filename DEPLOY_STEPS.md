# 📋 Passos do Deploy - Siga na Ordem

## ✅ Passo 1: Login no Cloudflare
**Status:** Em andamento - Complete o login no navegador

Após completar o login, continue com os próximos passos.

---

## 📝 Passo 2: Criar Banco de Dados D1

Execute:
```bash
wrangler d1 create petcare-db
```

**IMPORTANTE:** Copie o `database_id` que aparecer. Você vai precisar dele!

Exemplo de saída:
```
✅ Successfully created DB 'petcare-db'!

[[d1_databases]]
binding = "DB"
database_name = "petcare-db"
database_id = "abc123-def456-ghi789"  ← COPIE ESTE ID
```

---

## 📝 Passo 3: Criar Bucket R2

Execute:
```bash
wrangler r2 bucket create petcare-files
```

---

## 📝 Passo 4: Atualizar wrangler.json

Abra o arquivo `wrangler.json` e atualize com os dados que você copiou:

```json
{
  "d1_databases": [
    {
      "binding": "DB",
      "database_name": "petcare-db",
      "database_id": "COLE_AQUI_O_DATABASE_ID"  ← Cole o ID do Passo 2
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

---

## 📝 Passo 5: Executar Migrations

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

---

## 📝 Passo 6: Deploy do Worker

Execute:
```bash
npm run deploy:worker
```

**IMPORTANTE:** Anote a URL do worker que aparecer (ex: `https://seu-worker.workers.dev`)

---

## 📝 Passo 7: Deploy do Next.js

### Opção A: Via Wrangler (Rápido)

```bash
npm run deploy:pages
```

### Opção B: Via GitHub (Recomendado para atualizações automáticas)

1. Crie um repositório no GitHub
2. Faça push do código
3. No Cloudflare Dashboard:
   - Vá em **Pages** > **Create a project**
   - Conecte seu repositório
   - Configure:
     - **Build command**: `npm run build:pages`
     - **Output directory**: `.vercel/output/static`
     - **Root directory**: `/`

---

## 📝 Passo 8: Configurar Variável de Ambiente

No Cloudflare Pages Dashboard:
1. Vá em seu projeto Pages
2. **Settings** > **Environment Variables**
3. Adicione:
   - **Variable name**: `WORKER_URL`
   - **Value**: A URL do seu worker (do Passo 6)

---

## ✅ Pronto!

Sua aplicação estará disponível em uma URL como:
`https://seu-projeto.pages.dev`

---

## 🐛 Se algo der errado

- Verifique os logs: `wrangler tail`
- Verifique o status: `wrangler deployments list`
- Consulte o arquivo `DEPLOY.md` para mais detalhes



























