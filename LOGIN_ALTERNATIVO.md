# 🔐 Login Alternativo - API Token

Como o login OAuth não está funcionando, vamos usar um API Token do Cloudflare.

## Passo 1: Criar API Token no Cloudflare

1. Acesse: https://dash.cloudflare.com/profile/api-tokens
2. Clique em **"Create Token"**
3. Use o template **"Edit Cloudflare Workers"** ou crie um custom com estas permissões:
   - **Account** > **Cloudflare Workers** > **Edit**
   - **Account** > **Workers Scripts** > **Edit**
   - **Account** > **D1** > **Edit**
   - **Account** > **R2** > **Edit**
   - **Account** > **Pages** > **Edit**
4. Clique em **"Continue to summary"** e depois **"Create Token"**
5. **COPIE O TOKEN** (ele só aparece uma vez!)

## Passo 2: Configurar o Token

Depois de copiar o token, execute:

```bash
# Windows PowerShell
$env:CLOUDFLARE_API_TOKEN="seu-token-aqui"
wrangler whoami
```

Ou crie um arquivo `.dev.vars` na raiz do projeto:

```
CLOUDFLARE_API_TOKEN=seu-token-aqui
```

## Passo 3: Verificar Autenticação

```bash
wrangler whoami
```

Se mostrar seu email, está autenticado!



























