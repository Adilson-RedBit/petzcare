# 🌐 Configurar Domínio petzcare.org no Cloudflare

## Passo 1: Adicionar Domínio ao Cloudflare

1. Acesse: https://dash.cloudflare.com/login
2. Faça login com: **adilson.paulasouza@gmail.com**
3. Clique em **"Add a Site"** ou **"Add Site"**
4. Digite: **petzcare.org**
5. Clique em **"Add site"**

## Passo 2: Escolher Plano

- Selecione o plano **Free** (gratuito)
- Clique em **"Continue"**

## Passo 3: Verificar DNS Records

O Cloudflare vai escanear seus registros DNS atuais. Revise e clique em **"Continue"**.

## Passo 4: Atualizar Nameservers

O Cloudflare vai fornecer 2 nameservers, algo como:
- `lola.ns.cloudflare.com`
- `milo.ns.cloudflare.com`

**IMPORTANTE:** Você precisa atualizar os nameservers no seu registrador de domínio (onde você comprou o petzcare.org).

1. Acesse o painel do seu registrador (GoDaddy, Registro.br, etc.)
2. Vá em configurações de DNS/Nameservers
3. Substitua pelos nameservers do Cloudflare
4. Salve as alterações

**Tempo de propagação:** 24-48 horas (mas geralmente funciona em algumas horas)

## Passo 5: Verificar Status

No dashboard do Cloudflare, aguarde até aparecer **"Active"** ao lado do domínio.

---

## Após Configurar o Domínio

Depois que o domínio estiver ativo no Cloudflare, podemos:
1. Fazer login no Wrangler
2. Criar os recursos (D1, R2)
3. Fazer deploy do Worker e Pages
4. Configurar o domínio customizado



























