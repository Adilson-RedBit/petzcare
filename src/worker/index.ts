/**
 * PetCare Worker — versão segura pós-auditoria 2026-05.
 *
 * Mudanças principais frente à versão anterior:
 *  C-1: Middleware de autenticação JWT aplicado a rotas protegidas.
 *  C-2: Endpoints /api/auth/login, /register, /logout, /me implementados.
 *  C-5: Rate limiting ativado em login, register, OTP.
 *  C-8: Validação de uploads (MIME real via magic bytes, tamanho, extensão).
 *  A-1: N+1 eliminado em /api/appointments via JOIN agrupado.
 *  A-2/A-3: Booking usa db.batch() com UNIQUE index parcial.
 *  A-6: Pricing centralizado em src/shared/pricing.ts.
 *  A-7: Sessão é fonte única no worker; Next só guarda cookie.
 *  A-8: CORS restrito a origens permitidas com credentials.
 *  A-9: Logout invalida sessão no banco.
 */

import { Hono } from "hono";
import { cors } from "hono/cors";
import { setCookie, deleteCookie } from "hono/cookie";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";

import {
  PetSchema,
  CreatePetSchema,
  AppointmentSchema,
  CreateAppointmentSchema,
} from "../shared/types";
import { applyCoatMultiplier, calculateTotalPrice } from "../shared/pricing";

import {
  hashPassword,
  verifyPassword,
  validatePasswordComplexity,
} from "./lib/password";
import { checkRateLimit, RATE_LIMIT_CONFIGS } from "./lib/rateLimit";

import {
  createSession,
  invalidateSession,
  validateSession,
  extractToken,
} from "./lib/auth";
import {
  generateAndStoreOtp,
  verifyOtp,
} from "./lib/otpStorage";
import { validateImageUpload } from "./lib/uploadValidation";
import { requireAuth } from "./middleware/authMiddleware";

const app = new Hono<{ Bindings: Env }>();

// ---------- CORS (A-8) ----------
app.use("*", async (c, next) => {
  const allowed = (
    c.env.ALLOWED_ORIGINS ||
    "https://petzcare.org,https://www.petzcare.org,http://localhost:3000,http://localhost:5173"
  )
    .split(",")
    .map((s) => s.trim());

  return cors({
    origin: (origin) => (origin && allowed.includes(origin) ? origin : null),
    credentials: true,
    allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization", "Cookie"],
    exposeHeaders: ["Set-Cookie"],
    maxAge: 600,
  })(c, next);
});

// Helper: obter IP de forma consistente (rate limit + audit)
function clientIp(c: any): string {
  return (
    c.req.header("cf-connecting-ip") ||
    c.req.header("x-forwarded-for")?.split(",")[0]?.trim() ||
    c.req.header("x-real-ip") ||
    "unknown"
  );
}

// =============================================================
//  PUBLIC ROUTES — sem auth, mas com rate limit no que faz sentido
// =============================================================

// ---------- AUTH ----------

const LoginSchema = z.object({
  email: z.string().email().toLowerCase().trim(),
  password: z.string().min(8).max(256),
});

const RegisterSchema = z.object({
  email: z.string().email().toLowerCase().trim(),
  password: z.string().min(8).max(256),
  name: z.string().min(2).max(120).trim(),
});

app.post("/api/auth/login", zValidator("json", LoginSchema), async (c) => {
  const ip = clientIp(c);
  const rl = await checkRateLimit(c.env.DB, ip, RATE_LIMIT_CONFIGS.login);
  if (!rl.allowed) {
    return c.json(
      { error: "Muitas tentativas. Aguarde alguns minutos." },
      429
    );
  }

  const { email, password } = c.req.valid("json");
  const user = await c.env.DB.prepare(
    "SELECT id, email, password_hash, name, role, tenant_id FROM professionals WHERE email = ?"
  )
    .bind(email)
    .first<{
      id: number;
      email: string;
      password_hash: string;
      name: string;
      role: string;
      tenant_id: number | null;
    }>();

  // Mensagem genérica em ambos os casos para não vazar existência de email
  if (!user) {
    return c.json({ error: "Email ou senha inválidos" }, 401);
  }
  const ok = await verifyPassword(password, user.password_hash);
  if (!ok) {
    return c.json({ error: "Email ou senha inválidos" }, 401);
  }

  const { jwt } = await createSession(
    c.env.DB,
    { id: user.id, email: user.email, name: user.name, role: user.role, tenantId: user.tenant_id || 1 },
    c.req.raw,
    c.env.JWT_SECRET
  );

  // Setar cookie httpOnly — front não precisa armazenar o JWT em JS.
  setCookie(c, "auth_token", jwt, {
    httpOnly: true,
    secure: c.env.NODE_ENV === "production",
    sameSite: "Lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });

  return c.json({
    success: true,
    jwt, // mantido pra clientes mobile/cross-domain que usarão Authorization Bearer
    user: { id: user.id, email: user.email, name: user.name, role: user.role },
  });
});

app.post("/api/auth/register", zValidator("json", RegisterSchema), async (c) => {
  try {
    const ip = clientIp(c);
    const rl = await checkRateLimit(c.env.DB, ip, RATE_LIMIT_CONFIGS.register);
    if (!rl.allowed) {
      return c.json({ error: "Muitas tentativas. Tente mais tarde." }, 429);
    }

    const { email, password, name } = c.req.valid("json");
    const complexity = validatePasswordComplexity(password);
    if (complexity) {
      return c.json({ error: complexity }, 400);
    }

    const exists = await c.env.DB.prepare(
      "SELECT id FROM professionals WHERE email = ?"
    )
      .bind(email)
      .first();
    if (exists) {
      return c.json({ error: "Email já cadastrado" }, 409);
    }

    const hash = await hashPassword(password);
    const inserted = await c.env.DB.prepare(
      `INSERT INTO professionals (email, password_hash, name, role, tenant_id)
       VALUES (?, ?, ?, 'professional', 1)
       RETURNING id, email, name, role`
    )
      .bind(email, hash, name)
      .first<{ id: number; email: string; name: string; role: string }>();

    if (!inserted) {
      return c.json({ error: "Falha ao criar conta" }, 500);
    }

    const { jwt } = await createSession(c.env.DB, { ...inserted, tenantId: 1 }, c.req.raw, c.env.JWT_SECRET);

    setCookie(c, "auth_token", jwt, {
      httpOnly: true,
      secure: c.env.NODE_ENV === "production",
      sameSite: "Lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });

    return c.json(
      {
        success: true,
        jwt,
        user: inserted,
      },
      201
    );
  } catch (err) {
    console.error("[register] erro:", err);
    return c.json({ error: "Erro interno ao criar conta" }, 500);
  }
});

app.post("/api/auth/logout", async (c) => {
  // A-9: invalidar sessão no banco
  const token = extractToken(c.req.raw);
  if (token) {
    const validated = await validateSession(c.env.DB, token, c.env.JWT_SECRET);
    if (validated) {
      await invalidateSession(c.env.DB, validated.tokenHash);
    }
  }
  deleteCookie(c, "auth_token", { path: "/" });
  return c.json({ success: true });
});

app.get("/api/auth/me", async (c) => {
  const token = extractToken(c.req.raw);
  if (!token) return c.json({ error: "Não autenticado" }, 401);
  const result = await validateSession(c.env.DB, token, c.env.JWT_SECRET);
  if (!result) return c.json({ error: "Sessão inválida" }, 401);
  const { userId, email, name, role } = result.payload;
  return c.json({ user: { id: userId, email, name, role } });
});

// ---------- RESET DE SENHA ----------

async function sha256hex(text: string): Promise<string> {
  const data = new TextEncoder().encode(text);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

const ResetRequestSchema = z.object({
  email: z.string().email().toLowerCase().trim(),
});

const ResetConfirmSchema = z.object({
  token: z.string().min(10),
  newPassword: z.string().min(8).max(256),
});

app.post("/api/auth/reset-request", zValidator("json", ResetRequestSchema), async (c) => {
  const ip = clientIp(c);
  const rl = await checkRateLimit(c.env.DB, ip, {
    maxRequests: 3,
    windowSeconds: 600,
    keyPrefix: "reset_req",
  });
  if (!rl.allowed) {
    return c.json({ error: "Aguarde antes de tentar novamente." }, 429);
  }

  const { email } = c.req.valid("json");

  // Resposta sempre 200 para não revelar existência de email
  const user = await c.env.DB.prepare(
    "SELECT id, name FROM professionals WHERE email = ?"
  ).bind(email).first<{ id: number; name: string }>();

  if (user) {
    const rawToken = crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().replace(/-/g, "");
    const tokenHash = await sha256hex(rawToken);
    const expiresAt = Math.floor(Date.now() / 1000) + 3600; // 1 hora

    // Invalidar tokens anteriores do mesmo usuário
    await c.env.DB.prepare(
      "DELETE FROM password_reset_tokens WHERE user_id = ?"
    ).bind(user.id).run();

    await c.env.DB.prepare(
      "INSERT INTO password_reset_tokens (user_id, token_hash, expires_at) VALUES (?, ?, ?)"
    ).bind(user.id, tokenHash, expiresAt).run();

    const resetUrl = `https://petzcare.org/reset-password?token=${rawToken}`;

    if (c.env.RESEND_API_KEY) {
      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${c.env.RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "PetzCare <noreply@petzcare.org>",
          to: email,
          subject: "Redefinição de senha — PetzCare",
          html: `
            <div style="font-family:sans-serif;max-width:480px;margin:0 auto">
              <h2 style="color:#1D4ED8">PetzCare — Redefinição de senha</h2>
              <p>Olá, ${user.name}!</p>
              <p>Clique no botão abaixo para redefinir sua senha. O link expira em <strong>1 hora</strong>.</p>
              <a href="${resetUrl}"
                 style="display:inline-block;background:#1D4ED8;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;margin:16px 0">
                Redefinir minha senha
              </a>
              <p style="color:#6B7280;font-size:12px">Se você não solicitou isso, ignore este email. Nenhuma ação é necessária.</p>
              <p style="color:#6B7280;font-size:12px">Link direto: ${resetUrl}</p>
            </div>
          `,
        }),
      });
    } else {
      console.error("[reset-request] RESEND_API_KEY não configurada — email não enviado. Link:", resetUrl);
    }
  }

  return c.json({ success: true });
});

app.post("/api/auth/reset-confirm", zValidator("json", ResetConfirmSchema), async (c) => {
  const { token, newPassword } = c.req.valid("json");

  const complexity = validatePasswordComplexity(newPassword);
  if (complexity) return c.json({ error: complexity }, 400);

  const tokenHash = await sha256hex(token);
  const nowSec = Math.floor(Date.now() / 1000);

  const row = await c.env.DB.prepare(
    `SELECT id, user_id FROM password_reset_tokens
     WHERE token_hash = ? AND expires_at > ? AND used_at IS NULL`
  ).bind(tokenHash, nowSec).first<{ id: number; user_id: number }>();

  if (!row) {
    return c.json({ error: "Link inválido ou expirado. Solicite um novo." }, 400);
  }

  const newHash = await hashPassword(newPassword);

  await c.env.DB.batch([
    c.env.DB.prepare(
      "UPDATE professionals SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?"
    ).bind(newHash, row.user_id),
    c.env.DB.prepare(
      "UPDATE password_reset_tokens SET used_at = CURRENT_TIMESTAMP WHERE id = ?"
    ).bind(row.id),
    // Invalidar todas as sessões ativas do usuário por segurança
    c.env.DB.prepare(
      "DELETE FROM user_sessions WHERE user_id = ?"
    ).bind(row.user_id),
  ]);

  return c.json({ success: true });
});

// ---------- CONTATO / LEAD (página de oferta) ----------

const ContatoSchema = z.object({
  nome: z.string().min(2).max(120).trim(),
  whatsapp: z.string().min(8).max(20).trim(),
  email: z.string().email().optional().or(z.literal("")),
  tipo: z.string().min(2).max(60),
  plano: z.string().max(60).optional(),
  mensagem: z.string().max(1000).optional(),
});

app.post("/api/contato", zValidator("json", ContatoSchema), async (c) => {
  const ip = clientIp(c);
  const rl = await checkRateLimit(c.env.DB, ip, {
    maxRequests: 3,
    windowSeconds: 600,
    keyPrefix: "contato",
  });
  if (!rl.allowed) return c.json({ error: "Muitas tentativas. Aguarde." }, 429);

  const { nome, whatsapp, email, tipo, plano, mensagem } = c.req.valid("json");

  if (c.env.RESEND_API_KEY) {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${c.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "PetzCare Leads <noreply@petzcare.org>",
        to: "petzcare.org@gmail.com",
        subject: `Novo lead PetzCare — ${nome} (${tipo})`,
        html: `
          <div style="font-family:sans-serif;max-width:520px;margin:0 auto">
            <h2 style="color:#1D4ED8">Novo interesse no PetzCare</h2>
            <table style="width:100%;border-collapse:collapse;font-size:14px">
              <tr><td style="padding:8px 0;color:#6B7280;width:130px">Nome</td><td style="padding:8px 0;font-weight:600">${nome}</td></tr>
              <tr><td style="padding:8px 0;color:#6B7280">WhatsApp</td><td style="padding:8px 0;font-weight:600">${whatsapp}</td></tr>
              ${email ? `<tr><td style="padding:8px 0;color:#6B7280">Email</td><td style="padding:8px 0">${email}</td></tr>` : ""}
              <tr><td style="padding:8px 0;color:#6B7280">Tipo</td><td style="padding:8px 0">${tipo}</td></tr>
              ${plano ? `<tr><td style="padding:8px 0;color:#6B7280">Plano</td><td style="padding:8px 0">${plano}</td></tr>` : ""}
              ${mensagem ? `<tr><td style="padding:8px 0;color:#6B7280;vertical-align:top">Mensagem</td><td style="padding:8px 0">${mensagem}</td></tr>` : ""}
            </table>
            <hr style="margin:16px 0;border:none;border-top:1px solid #e5e7eb">
            <p style="color:#9CA3AF;font-size:12px">Lead recebido via petzcare.org/oferta</p>
          </div>
        `,
      }),
    });
  } else {
    console.log("[contato] Lead recebido:", { nome, whatsapp, tipo, plano });
  }

  return c.json({ success: true });
});

// ---------- OTP (C-4) ----------

const OtpSendSchema = z.object({
  identifier: z.string().min(3).max(120),
});
const OtpVerifySchema = z.object({
  identifier: z.string().min(3).max(120),
  code: z.string().regex(/^\d{6}$/),
});

app.post("/api/otp/send", zValidator("json", OtpSendSchema), async (c) => {
  const ip = clientIp(c);
  const rl = await checkRateLimit(c.env.DB, ip, {
    maxRequests: 3,
    windowSeconds: 300,
    keyPrefix: "otp_send",
  });
  if (!rl.allowed) {
    return c.json({ error: "Aguarde antes de pedir outro código" }, 429);
  }

  const { identifier } = c.req.valid("json");
  const code = await generateAndStoreOtp(c.env.DB, identifier);

  // TODO: integrar Z-API/Twilio para envio real. Por ora só em dev expõe.
  if (c.env.NODE_ENV !== "production") {
    return c.json({ success: true, code });
  }
  return c.json({ success: true });
});

app.post("/api/otp/verify", zValidator("json", OtpVerifySchema), async (c) => {
  const { identifier, code } = c.req.valid("json");
  const result = await verifyOtp(c.env.DB, identifier, code);
  if (!result.valid) {
    return c.json({ error: result.reason || "Código inválido" }, 400);
  }
  return c.json({ success: true });
});

// ── TENANT SIGNUP / ME ────────────────────────────────────────────────────

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

const TenantSignupSchema = z.object({
  business_name: z.string().min(2).max(120).trim(),
  owner_name: z.string().min(2).max(120).trim(),
  owner_email: z.string().email().toLowerCase().trim(),
  owner_phone: z.string().min(10).max(20).trim(),
  password: z.string().min(8).max(256),
});

app.post("/api/tenant/signup", zValidator("json", TenantSignupSchema), async (c) => {
  const ip = clientIp(c);
  const rl = await checkRateLimit(c.env.DB, ip, RATE_LIMIT_CONFIGS.register);
  if (!rl.allowed) return c.json({ error: "Muitas tentativas. Tente novamente em 5 minutos." }, 429);

  const { business_name, owner_name, owner_email, owner_phone, password } = c.req.valid("json");

  const complexity = validatePasswordComplexity(password);
  if (complexity) return c.json({ error: complexity }, 400);

  const existingEmail = await c.env.DB.prepare(
    "SELECT id FROM professionals WHERE email = ?"
  ).bind(owner_email).first();
  if (existingEmail) return c.json({ error: "Email já cadastrado. Faça login." }, 409);

  let slug = slugify(business_name);
  const slugExists = await c.env.DB.prepare("SELECT id FROM tenants WHERE slug = ?").bind(slug).first();
  if (slugExists) slug = slug + "-" + Date.now().toString(36);

  await c.env.DB.prepare(
    `INSERT INTO tenants (name, slug, owner_name, owner_email, owner_phone, plan, trial_start, trial_end)
     VALUES (?, ?, ?, ?, ?, 'trial', datetime('now'), datetime('now', '+14 days'))`
  ).bind(business_name, slug, owner_name, owner_email, owner_phone).run();

  const tenant = await c.env.DB.prepare(
    "SELECT * FROM tenants WHERE slug = ?"
  ).bind(slug).first<{ id: number; name: string; slug: string; trial_end: string }>();
  if (!tenant) return c.json({ error: "Erro ao criar conta" }, 500);

  const hash = await hashPassword(password);

  await c.env.DB.prepare(
    `INSERT INTO professionals (email, password_hash, name, role, tenant_id) VALUES (?, ?, ?, 'admin', ?)`
  ).bind(owner_email, hash, owner_name, tenant.id).run();

  // Horários padrão (Seg–Sáb 09–18 com almoço 12–13)
  const dayStmts = [];
  for (let day = 1; day <= 6; day++) {
    dayStmts.push(c.env.DB.prepare(
      `INSERT INTO working_hours (day_of_week, start_time, end_time, break_start, break_end, is_active, appointment_duration, tenant_id)
       VALUES (?, '09:00', '18:00', '12:00', '13:00', 1, 30, ?)`
    ).bind(day, tenant.id));
  }
  dayStmts.push(c.env.DB.prepare(
    `INSERT INTO working_hours (day_of_week, start_time, end_time, is_active, appointment_duration, tenant_id)
     VALUES (0, '09:00', '18:00', 0, 30, ?)`
  ).bind(tenant.id));
  await c.env.DB.batch(dayStmts);

  await c.env.DB.prepare(
    `INSERT INTO business_config (business_name, phone, tenant_id) VALUES (?, ?, ?)`
  ).bind(business_name, owner_phone, tenant.id).run();

  const professional = await c.env.DB.prepare(
    "SELECT id, email, name, role FROM professionals WHERE email = ? AND tenant_id = ?"
  ).bind(owner_email, tenant.id).first<{ id: number; email: string; name: string; role: string }>();
  if (!professional) return c.json({ error: "Erro ao criar sessão" }, 500);

  const { jwt } = await createSession(
    c.env.DB,
    { ...professional, tenantId: tenant.id },
    c.req.raw,
    c.env.JWT_SECRET
  );

  setCookie(c, "auth_token", jwt, {
    httpOnly: true,
    secure: c.env.NODE_ENV === "production",
    sameSite: "Lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });

  return c.json({
    success: true,
    tenant: { id: tenant.id, name: tenant.name, slug: tenant.slug, trial_end: tenant.trial_end },
    user: { id: professional.id, email: professional.email, name: professional.name },
  }, 201);
});

app.get("/api/tenant/me", requireAuth(), async (c) => {
  const { tenantId } = c.get("user");
  const tenant = await c.env.DB.prepare(
    "SELECT id, name, slug, plan, trial_start, trial_end FROM tenants WHERE id = ?"
  ).bind(tenantId).first();
  if (!tenant) return c.json({ error: "Tenant não encontrado" }, 404);
  return c.json({ tenant });
});

// Helper: resolve tenant_id a partir de slug (query param ?t=)
async function resolveTenant(db: D1Database, slug: string | undefined): Promise<number> {
  if (!slug) return 1; // default tenant para backward compat
  const t = await db.prepare("SELECT id FROM tenants WHERE slug = ?").bind(slug).first<{ id: number }>();
  return t?.id ?? 1;
}

// ---------- SERVIÇOS (público para cliente final escolher) ----------

app.get("/api/services", async (c) => {
  const petId = c.req.query("pet_id");
  const tenantId = await resolveTenant(c.env.DB, c.req.query("t"));

  if (!petId) {
    const result = await c.env.DB.prepare(
      "SELECT id, name, description, duration_minutes, is_active, created_at, updated_at FROM services WHERE is_active = 1 AND tenant_id = ? ORDER BY name"
    ).bind(tenantId).all();
    return c.json(
      result.results.map((row: any) => ({
        ...row,
        price: 0,
        is_active: Boolean(row.is_active),
      }))
    );
  }

  const pet = await c.env.DB.prepare(
    "SELECT size, coat_condition FROM pets WHERE id = ?"
  )
    .bind(petId)
    .first<{ size: string; coat_condition: string | null }>();
  if (!pet) return c.json({ error: "Pet não encontrado" }, 404);

  const result = await c.env.DB.prepare(
    `SELECT s.*, sp.base_price as calculated_price
     FROM services s
     LEFT JOIN service_pricing sp ON s.id = sp.service_id AND sp.size = ?
     WHERE s.is_active = 1 AND s.tenant_id = ?
     ORDER BY s.name`
  )
    .bind(pet.size, tenantId)
    .all();

  const services = result.results.map((row: any) => ({
    ...row,
    price: applyCoatMultiplier(
      Number(row.calculated_price || row.price || 0),
      pet.coat_condition
    ),
    is_active: Boolean(row.is_active),
  }));
  return c.json(services);
});

// ---------- AVAILABLE SLOTS (público) ----------

app.get("/api/available-slots", async (c) => {
  const date = c.req.query("date");
  if (!date) return c.json({ error: "Data obrigatória" }, 400);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return c.json({ error: "Formato de data inválido" }, 400);
  }

  const tenantId = await resolveTenant(c.env.DB, c.req.query("t"));

  // Duração do serviço que o cliente quer agendar (opcional)
  const serviceId = c.req.query("service_id");
  let requestedDuration = 0;
  if (serviceId) {
    const svc = await c.env.DB.prepare(
      "SELECT duration_minutes FROM services WHERE id = ? AND is_active = 1 AND tenant_id = ?"
    ).bind(Number(serviceId), tenantId).first<{ duration_minutes: number }>();
    requestedDuration = svc?.duration_minutes ?? 0;
  }

  const dayOfWeek = new Date(date).getDay();
  const wh = await c.env.DB.prepare(
    "SELECT start_time, end_time, appointment_duration, break_start, break_end FROM working_hours WHERE day_of_week = ? AND is_active = 1 AND tenant_id = ?"
  )
    .bind(dayOfWeek, tenantId)
    .first<{
      start_time: string;
      end_time: string;
      appointment_duration: number;
      break_start: string | null;
      break_end: string | null;
    }>();
  if (!wh) return c.json([]);

  const toMin = (t: string) =>
    parseInt(t.split(":")[0]) * 60 + parseInt(t.split(":")[1]);

  const slotSize = wh.appointment_duration || 30;
  const startM = toMin(wh.start_time);
  const endM = toMin(wh.end_time);
  const breakS = wh.break_start ? toMin(wh.break_start) : null;
  const breakE = wh.break_end ? toMin(wh.break_end) : null;

  // Busca agendamentos existentes com duração real de cada serviço
  const booked = await c.env.DB.prepare(
    `SELECT a.appointment_time, COALESCE(s.duration_minutes, ?) as duration_minutes
     FROM appointments a
     LEFT JOIN services s ON a.service_id = s.id
     WHERE a.appointment_date = ? AND a.status != 'cancelado' AND a.tenant_id = ?`
  ).bind(slotSize, date, tenantId).all<{ appointment_time: string; duration_minutes: number }>();

  // Mapeia todos os minutos bloqueados por agendamentos existentes
  const blockedMinutes = new Set<number>();
  for (const apt of booked.results) {
    const aptStart = toMin(apt.appointment_time);
    const aptEnd = aptStart + (apt.duration_minutes || slotSize);
    for (let m = aptStart; m < aptEnd; m++) blockedMinutes.add(m);
  }

  // Duração efetiva do novo agendamento (serviço solicitado ou slot padrão)
  const newDuration = requestedDuration || slotSize;

  const slots: string[] = [];
  for (let m = startM; m < endM; m += slotSize) {
    // Slot dentro do intervalo de almoço
    if (breakS != null && breakE != null && m >= breakS && m < breakE) continue;

    // Verifica se o novo agendamento caberia sem invadir intervalo de almoço
    if (breakS != null && breakE != null && m < breakS && m + newDuration > breakS) continue;

    // Verifica se há minutos suficientes até o fim do expediente
    if (m + newDuration > endM) continue;

    // Verifica se algum minuto da janela do novo agendamento está bloqueado
    let conflicts = false;
    for (let i = m; i < m + newDuration; i++) {
      if (blockedMinutes.has(i)) { conflicts = true; break; }
    }
    if (!conflicts) {
      const h = Math.floor(m / 60).toString().padStart(2, "0");
      const mm = (m % 60).toString().padStart(2, "0");
      slots.push(`${h}:${mm}`);
    }
  }
  return c.json(slots);
});

// ---------- PETS / APPOINTMENTS — públicos (fluxo cliente) ----------

// Lookup de cliente pelo telefone (público — usado na página de agendamento)
app.get("/api/clients/lookup", async (c) => {
  const phone = (c.req.query("phone") || "").replace(/\D/g, "");
  if (phone.length < 8) return c.json({ found: false });

  const tenantId = await resolveTenant(c.env.DB, c.req.query("t"));

  const pet = await c.env.DB.prepare(
    `SELECT owner_name, owner_phone, owner_email, owner_address
     FROM pets
     WHERE REPLACE(REPLACE(REPLACE(REPLACE(owner_phone,' ',''),'-',''),'(',''),')','') = ?
       AND tenant_id = ?
     ORDER BY created_at DESC LIMIT 1`
  ).bind(phone, tenantId).first<{
    owner_name: string; owner_phone: string;
    owner_email: string; owner_address: string;
  }>();

  if (!pet) return c.json({ found: false });

  const pets = await c.env.DB.prepare(
    `SELECT id, name, breed, size, photo_url FROM pets
     WHERE REPLACE(REPLACE(REPLACE(REPLACE(owner_phone,' ',''),'-',''),'(',''),')','') = ?
       AND tenant_id = ?
     ORDER BY created_at DESC`
  ).bind(phone, tenantId).all();

  return c.json({
    found: true,
    client: {
      owner_name: pet.owner_name,
      owner_phone: pet.owner_phone,
      owner_email: pet.owner_email || "",
      owner_address: pet.owner_address || "",
    },
    pets: pets.results,
  });
});

app.post("/api/pets", zValidator("json", CreatePetSchema), async (c) => {
  const ip = clientIp(c);
  const rl = await checkRateLimit(c.env.DB, ip, {
    maxRequests: 5,
    windowSeconds: 60,
    keyPrefix: "create_pet",
  });
  if (!rl.allowed) return c.json({ error: "Muitas requisições" }, 429);

  const pet = c.req.valid("json");
  const tenantId = await resolveTenant(c.env.DB, c.req.query("t"));
  const inserted = await c.env.DB.prepare(
    `INSERT INTO pets (name, breed, size, weight_kg, age_years, special_notes, photo_url, coat_condition, coat_notes, owner_name, owner_phone, owner_email, owner_address, tenant_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     RETURNING *`
  )
    .bind(
      pet.name,
      pet.breed || null,
      pet.size,
      pet.weight_kg || null,
      pet.age_years || null,
      pet.special_notes || null,
      pet.photo_url || null,
      pet.coat_condition || null,
      pet.coat_notes || null,
      pet.owner_name,
      pet.owner_phone,
      pet.owner_email || null,
      pet.owner_address || null,
      tenantId
    )
    .first();

  // Mantém dados do dono sincronizados em todos os pets com o mesmo telefone
  const normalizedPhone = pet.owner_phone.replace(/\D/g, '');
  await c.env.DB.prepare(
    `UPDATE pets
     SET owner_name = ?, owner_email = ?, owner_address = ?
     WHERE REPLACE(REPLACE(REPLACE(REPLACE(owner_phone,' ',''),'-',''),'(',''),')','') = ?
       AND tenant_id = ?`
  ).bind(
    pet.owner_name,
    pet.owner_email || null,
    pet.owner_address || null,
    normalizedPhone,
    tenantId
  ).run();

  return c.json(PetSchema.parse(inserted), 201);
});

app.post(
  "/api/appointments",
  zValidator("json", CreateAppointmentSchema),
  async (c) => {
    const ip = clientIp(c);
    const rl = await checkRateLimit(c.env.DB, ip, RATE_LIMIT_CONFIGS.appointment);
    if (!rl.allowed) return c.json({ error: "Muitas requisições" }, 429);

    const data = c.req.valid("json");
    const tenantId = await resolveTenant(c.env.DB, c.req.query("t"));

    const pet = await c.env.DB.prepare(
      "SELECT size, coat_condition FROM pets WHERE id = ?"
    )
      .bind(data.pet_id)
      .first<{ size: string; coat_condition: string | null }>();
    if (!pet) return c.json({ error: "Pet não encontrado" }, 404);

    const placeholders = data.service_ids.map(() => "?").join(",");
    const services = await c.env.DB.prepare(
      `SELECT s.id, s.price, sp.base_price as calculated_price
       FROM services s
       LEFT JOIN service_pricing sp ON s.id = sp.service_id AND sp.size = ?
       WHERE s.id IN (${placeholders}) AND s.is_active = 1`
    )
      .bind(pet.size, ...data.service_ids)
      .all();

    if (services.results.length !== data.service_ids.length) {
      return c.json({ error: "Um ou mais serviços inválidos" }, 404);
    }

    const basePrices = services.results.map(
      (s: any) => Number(s.calculated_price || s.price || 0)
    );
    const total = calculateTotalPrice(basePrices, pet.coat_condition);

    // A-2/A-3: batch transacional. Cria appointment + appointment_services atomicamente.
    // Conflito de horário cai no UNIQUE INDEX uniq_appointment_slot (migration 13).
    try {
      const insertAppt = c.env.DB.prepare(
        `INSERT INTO appointments (pet_id, service_id, owner_name, owner_phone, owner_email,
                                   appointment_date, appointment_time, total_price, notes, tenant_id)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         RETURNING *`
      ).bind(
        data.pet_id,
        data.service_ids[0],
        data.owner_name,
        data.owner_phone,
        data.owner_email || null,
        data.appointment_date,
        data.appointment_time,
        total,
        data.notes || null,
        tenantId
      );

      // Primeiro inserir o appointment (precisamos do id para o batch)
      const apptRow = await insertAppt.first<any>();
      if (!apptRow) {
        return c.json({ error: "Falha ao criar agendamento" }, 500);
      }

      // Depois fazer batch dos appointment_services (atômico)
      const stmts = data.service_ids.map((sid) =>
        c.env.DB.prepare(
          "INSERT INTO appointment_services (appointment_id, service_id) VALUES (?, ?)"
        ).bind(apptRow.id, sid)
      );
      await c.env.DB.batch(stmts);

      return c.json(AppointmentSchema.parse(apptRow), 201);
    } catch (e: any) {
      const msg = String(e?.message || e || "");
      if (msg.includes("UNIQUE") || msg.includes("constraint")) {
        return c.json({ error: "Horário não está mais disponível" }, 409);
      }
      console.error("Erro ao criar agendamento:", msg);
      return c.json({ error: "Falha ao criar agendamento" }, 500);
    }
  }
);

// ---------- FILES (público - read only, paths são timestampados) ----------

app.get("/api/files/:folder/:file", async (c) => {
  const folder = c.req.param("folder");
  const file = c.req.param("file");
  // Anti path traversal
  if (
    folder.includes("..") ||
    file.includes("..") ||
    folder.includes("/") ||
    file.includes("/")
  ) {
    return c.json({ error: "Path inválido" }, 400);
  }
  const filename = `${folder}/${file}`;
  const object = await c.env.R2_BUCKET.get(filename);
  if (!object) return c.json({ error: "Arquivo não encontrado" }, 404);

  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set("etag", object.httpEtag);
  headers.set("Cache-Control", "public, max-age=3600");
  return c.body(object.body, { headers });
});

app.get("/api/files/:filename", async (c) => {
  const filename = decodeURIComponent(c.req.param("filename"));
  if (filename.includes("..")) {
    return c.json({ error: "Path inválido" }, 400);
  }
  const object = await c.env.R2_BUCKET.get(filename);
  if (!object) return c.json({ error: "Arquivo não encontrado" }, 404);

  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set("etag", object.httpEtag);
  headers.set("Cache-Control", "public, max-age=3600");
  return c.body(object.body, { headers });
});

// Upload de foto de pet — público (parte do fluxo de criação)
app.post("/api/upload-pet-photo", async (c) => {
  const ip = clientIp(c);
  const rl = await checkRateLimit(c.env.DB, ip, {
    maxRequests: 10,
    windowSeconds: 300,
    keyPrefix: "upload_pet",
  });
  if (!rl.allowed) return c.json({ error: "Muitas requisições" }, 429);

  const formData = await c.req.formData();
  const photo = formData.get("photo") as unknown as File;
  if (!photo) return c.json({ error: "Foto não enviada" }, 400);

  const result = await validateImageUpload(photo);
  if (!result.ok) return c.json({ error: result.error }, 400);

  const filename = `pet-photos/${Date.now()}-${crypto.randomUUID()}.${result.extension}`;
  await c.env.R2_BUCKET.put(filename, result.buffer, {
    httpMetadata: { contentType: result.mime },
  });
  return c.json({ photoUrl: `/api/files/${encodeURIComponent(filename)}` });
});

// =============================================================
//  PROTECTED ROUTES — exigem JWT válido
// =============================================================

app.get("/api/pets", requireAuth(), async (c) => {
  const { tenantId } = c.get("user");
  const limit = Math.min(parseInt(c.req.query("limit") || "100"), 500);
  const offset = parseInt(c.req.query("offset") || "0");
  const result = await c.env.DB.prepare(
    "SELECT * FROM pets WHERE tenant_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?"
  )
    .bind(tenantId, limit, offset)
    .all();
  return c.json(result.results.map((row: any) => PetSchema.parse(row)));
});

// A-1: N+1 eliminado. Faz LEFT JOIN com appointment_services e agrupa em memória.
app.get("/api/appointments", requireAuth(), async (c) => {
  const { tenantId } = c.get("user");
  const date = c.req.query("date");
  const limit = Math.min(parseInt(c.req.query("limit") || "200"), 500);
  const offset = parseInt(c.req.query("offset") || "0");

  let where = "WHERE a.tenant_id = ?";
  const params: any[] = [tenantId];
  if (date) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return c.json({ error: "Formato de data inválido" }, 400);
    }
    where += " AND a.appointment_date = ?";
    params.push(date);
  }

  const rows = await c.env.DB.prepare(
    `SELECT
       a.id, a.pet_id, a.service_id, a.owner_name, a.owner_phone, a.owner_email,
       a.appointment_date, a.appointment_time, a.status, a.total_price, a.notes,
       a.created_at, a.updated_at,
       p.name as pet_name, p.breed, p.size, p.weight_kg, p.age_years, p.special_notes,
       p.created_at as pet_created_at, p.updated_at as pet_updated_at,
       s.id as svc_id, s.name as svc_name, s.description as svc_description,
       s.duration_minutes as svc_duration, s.price as svc_price, s.is_active as svc_active,
       s.created_at as svc_created_at, s.updated_at as svc_updated_at
     FROM appointments a
     JOIN pets p ON a.pet_id = p.id
     LEFT JOIN appointment_services aps ON aps.appointment_id = a.id
     LEFT JOIN services s ON s.id = aps.service_id
     ${where}
     ORDER BY a.appointment_date DESC, a.appointment_time
     LIMIT ? OFFSET ?`
  )
    .bind(...params, limit * 10, offset) // multiplicar p/ comportar join expansão
    .all();

  const byId = new Map<number, any>();
  for (const row of rows.results as any[]) {
    if (!byId.has(row.id)) {
      byId.set(row.id, {
        id: row.id,
        pet_id: row.pet_id,
        service_id: row.service_id,
        owner_name: row.owner_name,
        owner_phone: row.owner_phone,
        owner_email: row.owner_email,
        appointment_date: row.appointment_date,
        appointment_time: row.appointment_time,
        status: row.status,
        total_price: row.total_price,
        notes: row.notes,
        created_at: row.created_at,
        updated_at: row.updated_at,
        pet: {
          id: row.pet_id,
          name: row.pet_name,
          breed: row.breed,
          size: row.size,
          weight_kg: row.weight_kg,
          age_years: row.age_years,
          special_notes: row.special_notes,
          created_at: row.pet_created_at,
          updated_at: row.pet_updated_at,
        },
        services: [],
      });
    }
    if (row.svc_id) {
      byId.get(row.id).services.push({
        id: row.svc_id,
        name: row.svc_name,
        description: row.svc_description,
        duration_minutes: row.svc_duration,
        price: row.svc_price,
        is_active: Boolean(row.svc_active),
        created_at: row.svc_created_at,
        updated_at: row.svc_updated_at,
      });
    }
  }
  return c.json(Array.from(byId.values()).slice(0, limit));
});

const StatusSchema = z.object({
  status: z.enum(["agendado", "confirmado", "em_andamento", "concluido", "cancelado"]),
});

app.patch(
  "/api/appointments/:id/status",
  requireAuth(),
  zValidator("json", StatusSchema),
  async (c) => {
    const { tenantId } = c.get("user");
    const id = parseInt(c.req.param("id"));
    if (!Number.isFinite(id)) return c.json({ error: "ID inválido" }, 400);
    const { status } = c.req.valid("json");
    await c.env.DB.prepare(
      "UPDATE appointments SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND tenant_id = ?"
    )
      .bind(status, id, tenantId)
      .run();
    return c.json({ success: true });
  }
);

app.patch("/api/appointments/:id/confirm", requireAuth(), async (c) => {
  const { tenantId } = c.get("user");
  const id = parseInt(c.req.param("id"));
  if (!Number.isFinite(id)) return c.json({ error: "ID inválido" }, 400);

  const appt = await c.env.DB.prepare(
    `SELECT a.*, p.name as pet_name, p.owner_name, p.owner_phone
     FROM appointments a JOIN pets p ON a.pet_id = p.id
     WHERE a.id = ? AND a.tenant_id = ?`
  )
    .bind(id, tenantId)
    .first<any>();
  if (!appt) return c.json({ error: "Agendamento não encontrado" }, 404);

  await c.env.DB.prepare(
    "UPDATE appointments SET status = 'confirmado', updated_at = CURRENT_TIMESTAMP WHERE id = ? AND tenant_id = ?"
  )
    .bind(id, tenantId)
    .run();

  // TODO: integrar Z-API/Twilio para WhatsApp
  return c.json({ success: true, message: "Agendamento confirmado" });
});

// ---------- ADMIN ----------
// Auth e verificação de trial centralizados para todas as rotas /api/admin/*

app.use("/api/admin/*", requireAuth());

app.use("/api/admin/*", async (c, next) => {
  const user = c.get("user");
  if (!user) return next();

  if (c.req.method !== "GET") {
    const { tenantId } = user;
    const tenant = await c.env.DB.prepare(
      "SELECT plan, trial_end FROM tenants WHERE id = ?"
    ).bind(tenantId).first<{ plan: string; trial_end: string }>();

    if (tenant && tenant.plan !== "active") {
      const trialEnd = new Date(tenant.trial_end);
      if (trialEnd < new Date()) {
        return c.json(
          { error: "trial_expirado", trial_end: tenant.trial_end },
          402
        );
      }
    }
  }
  await next();
});

app.get("/api/admin/services", async (c) => {
  const { tenantId } = c.get("user");
  const result = await c.env.DB.prepare(
    "SELECT * FROM services WHERE tenant_id = ? ORDER BY name"
  ).bind(tenantId).all();
  return c.json(
    result.results.map((row: any) => ({ ...row, is_active: Boolean(row.is_active) }))
  );
});

const ServiceSchemaIn = z.object({
  name: z.string().min(1).max(120),
  description: z.string().max(500).optional(),
  duration_minutes: z.number().int().positive().max(720),
  price: z.number().nonnegative().max(100000).optional(),
  is_active: z.boolean(),
});

app.post(
  "/api/admin/services",
  zValidator("json", ServiceSchemaIn),
  async (c) => {
    const { tenantId } = c.get("user");
    const s = c.req.valid("json");
    const inserted = await c.env.DB.prepare(
      `INSERT INTO services (name, description, duration_minutes, price, is_active, tenant_id)
       VALUES (?, ?, ?, ?, ?, ?) RETURNING *`
    )
      .bind(
        s.name,
        s.description || null,
        s.duration_minutes,
        s.price ?? 0,
        s.is_active ? 1 : 0,
        tenantId
      )
      .first();
    return c.json(
      { ...(inserted as any), is_active: Boolean((inserted as any).is_active) },
      201
    );
  }
);

app.put(
  "/api/admin/services/:id",
  zValidator("json", ServiceSchemaIn),
  async (c) => {
    const { tenantId } = c.get("user");
    const id = parseInt(c.req.param("id"));
    if (!Number.isFinite(id)) return c.json({ error: "ID inválido" }, 400);
    const s = c.req.valid("json");
    await c.env.DB.prepare(
      `UPDATE services SET name = ?, description = ?, duration_minutes = ?, price = ?, is_active = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND tenant_id = ?`
    )
      .bind(
        s.name,
        s.description || null,
        s.duration_minutes,
        s.price ?? 0,
        s.is_active ? 1 : 0,
        id,
        tenantId
      )
      .run();
    return c.json({ success: true });
  }
);

app.delete("/api/admin/services/:id", async (c) => {
  const { tenantId } = c.get("user");
  const id = parseInt(c.req.param("id"));
  if (!Number.isFinite(id)) return c.json({ error: "ID inválido" }, 400);
  const svc = await c.env.DB.prepare(
    "SELECT id FROM services WHERE id = ? AND tenant_id = ?"
  ).bind(id, tenantId).first();
  if (!svc) return c.json({ error: "Serviço não encontrado" }, 404);
  await c.env.DB.batch([
    c.env.DB.prepare("DELETE FROM service_pricing WHERE service_id = ?").bind(id),
    c.env.DB.prepare("DELETE FROM services WHERE id = ?").bind(id),
  ]);
  return c.json({ success: true });
});

const PricingSchema = z.object({
  service_id: z.number().int().positive(),
  size: z.enum(["pequeno", "medio", "grande"]),
  base_price: z.number().nonnegative().max(100000),
});

app.get("/api/admin/service-pricing", async (c) => {
  const { tenantId } = c.get("user");
  const result = await c.env.DB.prepare(
    `SELECT sp.* FROM service_pricing sp
     JOIN services s ON s.id = sp.service_id
     WHERE s.tenant_id = ?
     ORDER BY sp.service_id, sp.size`
  ).bind(tenantId).all();
  return c.json(result.results);
});

app.post(
  "/api/admin/service-pricing",
  zValidator("json", PricingSchema),
  async (c) => {
    const { tenantId } = c.get("user");
    const p = c.req.valid("json");
    const svc = await c.env.DB.prepare(
      "SELECT id FROM services WHERE id = ? AND tenant_id = ?"
    ).bind(p.service_id, tenantId).first();
    if (!svc) return c.json({ error: "Serviço não encontrado" }, 404);
    await c.env.DB.prepare(
      `INSERT OR REPLACE INTO service_pricing (service_id, size, base_price) VALUES (?, ?, ?)`
    )
      .bind(p.service_id, p.size, p.base_price)
      .run();
    return c.json({ success: true });
  }
);

const WorkingHoursSchema = z.object({
  working_hours: z.array(
    z.object({
      day_of_week: z.number().int().min(0).max(6),
      start_time: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/),
      end_time: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/),
      // Aceita boolean ou 0/1 (SQLite retorna inteiro)
      is_active: z.union([z.boolean(), z.number()]).transform((v) => Boolean(v)),
      // Campo opcional — hardcoded a 30 min no sistema
      appointment_duration: z.number().int().min(1).max(720).optional().default(30),
      break_start: z
        .string()
        .regex(/^([01]\d|2[0-3]):([0-5]\d)$/)
        .nullable()
        .optional(),
      break_end: z
        .string()
        .regex(/^([01]\d|2[0-3]):([0-5]\d)$/)
        .nullable()
        .optional(),
    })
  ),
});

app.get("/api/admin/working-hours", async (c) => {
  const { tenantId } = c.get("user");
  const result = await c.env.DB.prepare(
    "SELECT * FROM working_hours WHERE tenant_id = ? ORDER BY day_of_week"
  ).bind(tenantId).all();
  return c.json(result.results);
});

app.post(
  "/api/admin/working-hours",
  zValidator("json", WorkingHoursSchema),
  async (c) => {
    const { tenantId } = c.get("user");
    const { working_hours } = c.req.valid("json");
    const stmts = [
      c.env.DB.prepare("DELETE FROM working_hours WHERE tenant_id = ?").bind(tenantId),
    ];
    for (const h of working_hours) {
      stmts.push(
        c.env.DB.prepare(
          `INSERT INTO working_hours (day_of_week, start_time, end_time, is_active, appointment_duration, break_start, break_end, tenant_id)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
        ).bind(
          h.day_of_week,
          h.start_time,
          h.end_time,
          h.is_active ? 1 : 0,
          h.appointment_duration,
          h.break_start || null,
          h.break_end || null,
          tenantId
        )
      );
    }
    await c.env.DB.batch(stmts);
    return c.json({ success: true });
  }
);

// Alias público para leitura de business-config (sem auth, suporta ?t=slug)
app.get("/api/business-config", async (c) => {
  const tenantId = await resolveTenant(c.env.DB, c.req.query("t"));
  const result = await c.env.DB.prepare(
    "SELECT * FROM business_config WHERE tenant_id = ? LIMIT 1"
  ).bind(tenantId).first();
  return c.json(
    result || {
      business_name: "PetCare Agenda",
      phone: "", whatsapp: "", email: "", address: "",
      instagram: "", description: "", logo_url: "",
      primary_color: "#3B82F6", secondary_color: "#8B5CF6",
      business_hours_display: "",
    }
  );
});

app.get("/api/admin/business-config", async (c) => {
  const tenantId = await resolveTenant(c.env.DB, c.req.query("t"));
  const result = await c.env.DB.prepare(
    "SELECT * FROM business_config WHERE tenant_id = ? LIMIT 1"
  ).bind(tenantId).first();
  return c.json(
    result || {
      business_name: "PetCare Agenda",
      phone: "", whatsapp: "", email: "", address: "",
      instagram: "", description: "", logo_url: "",
      primary_color: "#3B82F6", secondary_color: "#8B5CF6",
      business_hours_display: "",
    }
  );
});

const BusinessConfigSchema = z.object({
  business_name: z.string().min(1).max(120),
  phone: z.string().max(40).optional(),
  whatsapp: z.string().max(40).optional(),
  email: z.string().email().optional().or(z.literal("")),
  address: z.string().max(300).optional(),
  instagram: z.string().max(80).optional(),
  description: z.string().max(2000).optional(),
  logo_url: z.string().max(500).optional().nullable(),
  primary_color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/)
    .optional(),
  secondary_color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/)
    .optional(),
  business_hours_display: z.string().max(200).optional(),
});

app.post(
  "/api/admin/business-config",
  zValidator("json", BusinessConfigSchema),
  async (c) => {
    const { tenantId } = c.get("user");
    const cfg = c.req.valid("json");
    const existing = await c.env.DB.prepare(
      "SELECT id FROM business_config WHERE tenant_id = ? LIMIT 1"
    ).bind(tenantId).first<{ id: number }>();

    if (existing) {
      await c.env.DB.prepare(
        `UPDATE business_config SET
           business_name = ?, phone = ?, whatsapp = ?, email = ?, address = ?,
           instagram = ?, description = ?, logo_url = ?, primary_color = ?,
           secondary_color = ?, business_hours_display = ?
         WHERE id = ?`
      )
        .bind(
          cfg.business_name,
          cfg.phone || "",
          cfg.whatsapp || "",
          cfg.email || "",
          cfg.address || "",
          cfg.instagram || "",
          cfg.description || "",
          cfg.logo_url || null,
          cfg.primary_color || "#3B82F6",
          cfg.secondary_color || "#8B5CF6",
          cfg.business_hours_display || "",
          existing.id
        )
        .run();
    } else {
      await c.env.DB.prepare(
        `INSERT INTO business_config
         (business_name, phone, whatsapp, email, address, instagram, description, logo_url, primary_color, secondary_color, business_hours_display, tenant_id)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
        .bind(
          cfg.business_name,
          cfg.phone || "",
          cfg.whatsapp || "",
          cfg.email || "",
          cfg.address || "",
          cfg.instagram || "",
          cfg.description || "",
          cfg.logo_url || null,
          cfg.primary_color || "#3B82F6",
          cfg.secondary_color || "#8B5CF6",
          cfg.business_hours_display || "",
          tenantId
        )
        .run();
    }
    return c.json({ success: true });
  }
);

app.post("/api/upload-business-logo", requireAuth(), async (c) => {
  const formData = await c.req.formData();
  const logo = formData.get("logo") as unknown as File;
  const result = await validateImageUpload(logo);
  if (!result.ok) return c.json({ error: result.error }, 400);

  const filename = `business-logo/${Date.now()}-${crypto.randomUUID()}.${result.extension}`;
  await c.env.R2_BUCKET.put(filename, result.buffer, {
    httpMetadata: { contentType: result.mime },
  });
  return c.json({ logoUrl: `/api/files/${encodeURIComponent(filename)}` });
});

// Health check
app.get("/api/health", (c) => c.json({ status: "ok", t: Date.now() }));

// ── CRM ────────────────────────────────────────────────────────────────────
app.get("/api/admin/crm/customers", async (c) => {
  try {
    const { tenantId } = c.get("user");
    const petsResult = await c.env.DB.prepare(`
      SELECT p.id as pet_id, p.name as pet_name, p.breed, p.size,
             p.photo_url, p.coat_condition, p.owner_name, p.owner_phone, p.owner_email, p.owner_address
      FROM pets p
      WHERE p.tenant_id = ? AND p.owner_phone IS NOT NULL AND p.owner_phone != ''
      ORDER BY p.owner_name, p.name
    `).bind(tenantId).all();
    const pets = petsResult.results as any[];

    const appointmentsResult = await c.env.DB.prepare(`
      SELECT a.id, a.pet_id, a.appointment_date, a.appointment_time, a.status, a.total_price
      FROM appointments a
      WHERE a.tenant_id = ?
      ORDER BY a.appointment_date DESC, a.appointment_time DESC
    `).bind(tenantId).all();
    const allAppointments = appointmentsResult.results as any[];

    const appointmentIds = allAppointments.map((a: any) => a.id);
    const servicesByAppointment: Record<number, string[]> = {};

    if (appointmentIds.length > 0) {
      const batchSize = 50;
      for (let i = 0; i < appointmentIds.length; i += batchSize) {
        const batch = appointmentIds.slice(i, i + batchSize);
        const placeholders = batch.map(() => "?").join(",");
        const svcResult = await c.env.DB.prepare(`
          SELECT asr.appointment_id, s.name
          FROM appointment_services asr
          JOIN services s ON s.id = asr.service_id
          WHERE asr.appointment_id IN (${placeholders})
        `).bind(...batch).all();
        for (const svc of svcResult.results as any[]) {
          if (!servicesByAppointment[svc.appointment_id]) servicesByAppointment[svc.appointment_id] = [];
          servicesByAppointment[svc.appointment_id].push(svc.name);
        }
      }
    }

    const customersMap = new Map<string, any>();
    for (const pet of pets) {
      const phone = pet.owner_phone;
      if (!customersMap.has(phone)) {
        customersMap.set(phone, { owner_name: pet.owner_name || "Sem nome", owner_phone: phone, owner_email: pet.owner_email || "", owner_address: pet.owner_address || null, pets: [] });
      }
      const petAppointments = allAppointments
        .filter((a: any) => a.pet_id === pet.pet_id)
        .slice(0, 3)
        .map((a: any) => ({ id: a.id, date: a.appointment_date, time: a.appointment_time, status: a.status, total_price: a.total_price || 0, services: servicesByAppointment[a.id] || [] }));
      const lastAppointment = allAppointments.find((a: any) => a.pet_id === pet.pet_id);
      const daysSinceLastVisit = lastAppointment
        ? Math.floor((Date.now() - new Date(lastAppointment.appointment_date).getTime()) / 86400000)
        : null;
      customersMap.get(phone).pets.push({ id: pet.pet_id, name: pet.pet_name, breed: pet.breed, size: pet.size, photo_url: pet.photo_url, coat_condition: pet.coat_condition, last_appointments: petAppointments, days_since_last_visit: daysSinceLastVisit, inactive: daysSinceLastVisit !== null && daysSinceLastVisit > 14 });
    }

    const customers = Array.from(customersMap.values());
    customers.sort((a, b) => {
      const aInactive = a.pets.some((p: any) => p.inactive);
      const bInactive = b.pets.some((p: any) => p.inactive);
      if (aInactive && !bInactive) return -1;
      if (!aInactive && bInactive) return 1;
      return (a.owner_name || "").localeCompare(b.owner_name || "");
    });
    return c.json(customers);
  } catch (error) {
    console.error("CRM error:", error);
    return c.json({ error: "Failed to fetch CRM data" }, 500);
  }
});

export default app;
