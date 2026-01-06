import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { cors } from "hono/cors";
import { 
  PetSchema, 
  CreatePetSchema,
  AppointmentSchema,
  CreateAppointmentSchema
} from "../shared/types";
import { authMiddleware } from "./auth";
import { rateLimit } from "../lib/rateLimit";

const app = new Hono<{ Bindings: Env }>();

app.use("*", cors());

// Rate Limiting Global por IP
app.use("*", async (c, next) => {
  const ip = c.req.header("cf-connecting-ip") || "anonymous";
  const allowed = await rateLimit(c, `global_${ip}`, 100, 60);
  if (!allowed) {
    return c.json({ error: "Too many requests" }, 429);
  }
  await next();
});

// Middlewares de Proteção
app.use("/api/admin/*", authMiddleware);

app.use("/api/pets", async (c, next) => {
  if (c.req.method === "GET" && !c.req.query("phone")) {
    return authMiddleware(c, next);
  }
  await next();
});

app.use("/api/appointments", async (c, next) => {
  if (c.req.method === "GET" && !c.req.query("phone")) {
    return authMiddleware(c, next);
  }
  await next();
});

// Services endpoints
app.get("/api/services", async (c) => {
  try {
    const petId = c.req.query("pet_id");
    if (petId) {
      const petResult = await c.env.DB.prepare("SELECT size, coat_condition FROM pets WHERE id = ?").bind(petId).first() as any;
      if (!petResult) return c.json({ error: "Pet not found" }, 404);
      
      const servicesResult = await c.env.DB.prepare(`
        SELECT s.*, sp.base_price as calculated_price
        FROM services s
        LEFT JOIN service_pricing sp ON s.id = sp.service_id AND sp.size = ?
        WHERE s.is_active = 1
        ORDER BY s.name
      `).bind(petResult.size).all();
      
      const services = servicesResult.results.map((row: any) => {
        let finalPrice = Number(row.calculated_price || row.price || 0);
        const multipliers = { 'excelente': 1.0, 'bom': 1.1, 'regular': 1.2, 'ruim': 1.3 };
        if (petResult.coat_condition) {
          finalPrice *= (multipliers as any)[petResult.coat_condition] || 1.0;
        }
        return { ...row, price: Math.round(finalPrice * 100) / 100, is_active: Boolean(row.is_active) };
      });
      return c.json(services);
    } else {
      const result = await c.env.DB.prepare("SELECT id, name, description, duration_minutes, is_active, created_at, updated_at FROM services WHERE is_active = 1 ORDER BY name").all();
      const services = result.results.map((row: any) => ({ ...row, price: 0, is_active: Boolean(row.is_active) }));
      return c.json(services);
    }
  } catch (error) {
    return c.json({ error: "Failed to fetch services" }, 500);
  }
});

// Pets endpoints
app.get("/api/pets", async (c) => {
  try {
    const phone = c.req.query("phone");
    let query = "SELECT * FROM pets";
    const params = [];
    if (phone) {
      query += " WHERE owner_phone = ?";
      params.push(phone);
    }
    query += " ORDER BY name";
    const result = await c.env.DB.prepare(query).bind(...params).all();
    return c.json(result.results.map((row: any) => PetSchema.parse(row)));
  } catch (error) {
    return c.json({ error: "Failed to fetch pets" }, 500);
  }
});

app.post("/api/pets", zValidator("json", CreatePetSchema), async (c) => {
  try {
    const pet = c.req.valid("json");
    const result = await c.env.DB.prepare(
      `INSERT INTO pets (name, breed, size, weight_kg, age_years, special_notes, photo_url, coat_condition, coat_notes, owner_name, owner_phone, owner_email)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING *`
    ).bind(pet.name, pet.breed || null, pet.size, pet.weight_kg || null, pet.age_years || null, pet.special_notes || null, pet.photo_url || null, pet.coat_condition || null, pet.coat_notes || null, pet.owner_name, pet.owner_phone, pet.owner_email || null).first();
    return c.json(PetSchema.parse(result), 201);
  } catch (error) {
    return c.json({ error: "Failed to create pet" }, 500);
  }
});

// Appointments endpoints
app.get("/api/appointments", async (c) => {
  try {
    const date = c.req.query("date");
    const phone = c.req.query("phone");
    let query = `SELECT a.*, p.name as pet_name, p.breed, p.size, p.weight_kg, p.age_years, p.special_notes FROM appointments a JOIN pets p ON a.pet_id = p.id`;
    const params = [];
    const conditions = [];
    if (date) { conditions.push("a.appointment_date = ?"); params.push(date); }
    if (phone) { conditions.push("p.owner_phone = ?"); params.push(phone); }
    if (conditions.length > 0) { query += " WHERE " + conditions.join(" AND "); }
    query += " ORDER BY a.appointment_date DESC, a.appointment_time";
    const result = await c.env.DB.prepare(query).bind(...params).all();
    const appointments = [];
    for (const row of result.results as any[]) {
      const servicesResult = await c.env.DB.prepare(`SELECT s.* FROM services s JOIN appointment_services as_rel ON s.id = as_rel.service_id WHERE as_rel.appointment_id = ?`).bind(row.id).all();
      appointments.push({
        ...row,
        pet: { id: row.pet_id, name: row.pet_name, breed: row.breed, size: row.size },
        services: servicesResult.results.map((s: any) => ({ ...s, is_active: Boolean(s.is_active) }))
      });
    }
    return c.json(appointments);
  } catch (error) {
    return c.json({ error: "Failed to fetch appointments" }, 500);
  }
});

app.post("/api/appointments", zValidator("json", CreateAppointmentSchema), async (c) => {
  try {
    const appointment = c.req.valid("json");
    const petResult = await c.env.DB.prepare("SELECT size, coat_condition FROM pets WHERE id = ?").bind(appointment.pet_id).first() as any;
    if (!petResult) return c.json({ error: "Pet not found" }, 404);
    const serviceIds = appointment.service_ids.map(() => `?`).join(',');
    const servicesResult = await c.env.DB.prepare(`SELECT s.id, s.price, sp.base_price as calculated_price FROM services s LEFT JOIN service_pricing sp ON s.id = sp.service_id AND sp.size = ? WHERE s.id IN (${serviceIds})`).bind(petResult.size, ...appointment.service_ids).all();
    const multipliers = { 'excelente': 1.0, 'bom': 1.1, 'regular': 1.2, 'ruim': 1.3 };
    const coatMultiplier = (multipliers as any)[petResult.coat_condition] || 1.0;
    const totalPrice = servicesResult.results.reduce((sum: number, s: any) => sum + (Number(s.calculated_price || s.price || 0) * coatMultiplier), 0);
    const result = await c.env.DB.prepare(`INSERT INTO appointments (pet_id, service_id, owner_name, owner_phone, owner_email, appointment_date, appointment_time, total_price, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING *`).bind(appointment.pet_id, appointment.service_ids[0], appointment.owner_name, appointment.owner_phone, appointment.owner_email || null, appointment.appointment_date, appointment.appointment_time, totalPrice, appointment.notes || null).first() as any;
    for (const sId of appointment.service_ids) {
      await c.env.DB.prepare(`INSERT INTO appointment_services (appointment_id, service_id) VALUES (?, ?)`).bind(result.id, sId).run();
    }
    return c.json(AppointmentSchema.parse(result), 201);
  } catch (error) {
    return c.json({ error: "Failed to create appointment" }, 500);
  }
});

app.patch("/api/appointments/:id/status", async (c) => {
  try {
    const id = c.req.param("id");
    const { status } = await c.req.json();
    if (!['agendado', 'confirmado', 'em_andamento', 'concluido', 'cancelado'].includes(status)) return c.json({ error: "Invalid status" }, 400);
    await c.env.DB.prepare("UPDATE appointments SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?").bind(status, id).run();
    return c.json({ success: true });
  } catch (error) {
    return c.json({ error: "Failed to update status" }, 500);
  }
});

app.post("/api/appointments/:id/cancel-client", async (c) => {
  try {
    const id = c.req.param("id");
    const { phone } = await c.req.json();

    if (!phone) return c.json({ error: "Telefone é obrigatório" }, 400);

    // Verificar se o agendamento pertence a este telefone e se pode ser cancelado
    const appointment = await c.env.DB.prepare(`
      SELECT a.id, a.status 
      FROM appointments a 
      JOIN pets p ON a.pet_id = p.id 
      WHERE a.id = ? AND p.owner_phone = ?
    `).bind(id, phone).first() as any;

    if (!appointment) {
      return c.json({ error: "Agendamento não encontrado ou não pertence a este número" }, 404);
    }

    if (['em_andamento', 'concluido', 'cancelado'].includes(appointment.status)) {
      return c.json({ error: `Não é possível cancelar um agendamento com status: ${appointment.status}` }, 400);
    }

    await c.env.DB.prepare("UPDATE appointments SET status = 'cancelado', updated_at = CURRENT_TIMESTAMP WHERE id = ?").bind(id).run();
    
    return c.json({ success: true, message: "Agendamento cancelado com sucesso" });
  } catch (error) {
    return c.json({ error: "Erro ao processar cancelamento" }, 500);
  }
});

// Admin endpoints (simplificados)
app.get("/api/admin/services", async (c) => {
  const result = await c.env.DB.prepare("SELECT * FROM services ORDER BY name").all();
  return c.json(result.results.map((r: any) => ({ ...r, is_active: Boolean(r.is_active) })));
});

app.post("/api/admin/business-config", async (c) => {
  const config = await c.req.json();
  await c.env.DB.prepare(`INSERT OR REPLACE INTO business_config (id, business_name, phone, whatsapp, email, address, instagram, description, logo_url, primary_color, secondary_color, business_hours_display) VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).bind(config.business_name, config.phone, config.whatsapp, config.email, config.address, config.instagram, config.description, config.logo_url || null, config.primary_color, config.secondary_color, config.business_hours_display).run();
  return c.json({ success: true });
});

app.post("/api/upload-business-logo", async (c) => {
  const formData = await c.req.formData();
  const logo = formData.get('logo') as any;
  const filename = `business-logo/${Date.now()}.jpg`;
  await c.env.R2_BUCKET.put(filename, await logo.arrayBuffer(), { httpMetadata: { contentType: logo.type } });
  return c.json({ logoUrl: `/api/files/${encodeURIComponent(filename)}` });
});

app.get("/api/files/:folder/:file", async (c) => {
  const object = await c.env.R2_BUCKET.get(`${c.req.param("folder")}/${c.req.param("file")}`);
  if (!object) return c.json({ error: "File not found" }, 404);
  const headers = new Headers();
  object.writeHttpMetadata(headers);
  return c.body(object.body, { headers });
});

export default app;
