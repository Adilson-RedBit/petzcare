# Variáveis de Ambiente - PetCare Agenda

## 🔐 Obrigatórias

### JWT_SECRET
**Obrigatória para produção**

Chave secreta para assinatura de tokens JWT. Deve ser uma string longa e aleatória.

**Como gerar:**
```bash
openssl rand -base64 32
```

**Exemplo:**
```
JWT_SECRET=K8j3mN9pQ2rT5vX8zA1bC4dE7fG0hI3jK6mN9pQ2rT5vX8zA1bC4dE7fG0hI
```

**⚠️ IMPORTANTE**: 
- NUNCA commite esta chave no repositório
- Use valores diferentes para desenvolvimento e produção
- Se a chave for comprometida, todas as sessões precisarão ser invalidadas

---

## 🔧 Desenvolvimento

### WORKER_URL
**Opcional (padrão: http://localhost:5173)**

URL do Cloudflare Worker em desenvolvimento local.

**Exemplo:**
```
WORKER_URL=http://localhost:5173
```

### NODE_ENV
**Opcional (padrão: development)**

Ambiente de execução.

**Valores:**
- `development` - Desenvolvimento local
- `production` - Produção

---

## 🚫 Removidas (Segurança)

As seguintes variáveis foram **removidas por segurança**:

- ❌ `DEFAULT_PROFESSIONAL_EMAIL` - Removida
- ❌ `DEFAULT_PROFESSIONAL_PASSWORD` - Removida

**Motivo**: Credenciais hardcoded são um risco de segurança crítico. Em produção, o worker deve estar sempre disponível e autenticação deve ser feita apenas através do banco de dados.

---

## 📝 Configuração

### Desenvolvimento Local

1. Copie o template:
```bash
cp ENV_VARIABLES.md .env.local
```

2. Configure as variáveis:
```env
JWT_SECRET=sua-chave-secreta-aqui
WORKER_URL=http://localhost:5173
NODE_ENV=development
```

### Produção (Cloudflare)

Configure as variáveis no painel do Cloudflare:
1. Acesse Workers & Pages
2. Selecione seu projeto
3. Vá em Settings > Variables
4. Adicione `JWT_SECRET` como Secret

---

## ✅ Checklist de Segurança

- [ ] JWT_SECRET configurado e forte (mínimo 32 caracteres)
- [ ] JWT_SECRET diferente em desenvolvimento e produção
- [ ] JWT_SECRET não está no repositório
- [ ] Variáveis de ambiente documentadas
- [ ] Sem credenciais hardcoded no código





















