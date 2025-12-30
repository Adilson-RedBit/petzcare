## Deploy do PetCare Agenda em `petzcare.org` (Cloudflare Pages + Worker + D1/R2)

### 1) JWT_SECRET (produção)

Use este valor como `JWT_SECRET` no Cloudflare (Workers/Pages → Settings → Variables/Secrets):

`9bea0a75c35e8f09642b2ba8a231199b934b3f121e95dee09f12ac232c4caee09ee794ebc28c5f0013ba98bac11d5332`

### 2) Front (Cloudflare Pages — Direct Upload)

O build já foi gerado e empacotado em:

- `petzcare-pages.zip` (contém o conteúdo de `dist/client`)

No painel do Cloudflare:
- Pages → Create a project → **Direct Upload**
- Faça upload do `petzcare-pages.zip`
- Finalize o deploy

### 3) Worker (API) — deploy com Wrangler

Pré-requisito: autenticar o `wrangler`.

Opção A (recomendada): criar um API Token e setar no terminal:
- Crie um token em Cloudflare → My Profile → API Tokens com permissões:
  - Account: Workers Scripts (Edit)
  - Account: D1 (Edit)
  - Account: R2 (Edit)
  - Zone: Workers Routes (Edit) (se for usar rotas no domínio)
- No PowerShell:
  - `$env:CLOUDFLARE_API_TOKEN="SEU_TOKEN_AQUI"`

Depois:
- `npx wrangler deploy --config wrangler.json`

### 4) D1/R2 em produção

O `wrangler.json` já referencia:
- D1 binding `DB`
- R2 binding `R2_BUCKET`

Se esses recursos ainda não existirem na sua conta, crie no painel e ajuste `database_id`/`bucket_name` no `wrangler.json`.

### 5) Domínio `petzcare.org`

Após o Pages estar online, vá em:
- Pages → seu projeto → Custom domains → Add `petzcare.org`

O Cloudflare vai criar/indicar o DNS automaticamente.

Se preferir `www.petzcare.org`, adicione também e faça redirect de `petzcare.org` → `www.petzcare.org`.





