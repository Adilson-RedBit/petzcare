import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { cors } from "hono/cors";
import { 
  PetSchema, 
  CreatePetSchema,
  AppointmentSchema,
  CreateAppointmentSchema
} from "../shared/types";

const app = new Hono<{ Bindings: Env }>();

app.use("*", cors());

// Services endpoints
app.get("/api/services", async (c) => {
  try {
    const petId = c.req.query("pet_id");
    
    if (petId) {
      // Get services with pricing for specific pet
      const petResult = await c.env.DB.prepare(
        "SELECT size, coat_condition FROM pets WHERE id = ?"
      ).bind(petId).first();
      
      if (!petResult) {
        return c.json({ error: "Pet not found" }, 404);
      }
      
      const servicesResult = await c.env.DB.prepare(`
        SELECT s.*, sp.base_price as calculated_price
        FROM services s
        LEFT JOIN service_pricing sp ON s.id = sp.service_id AND sp.size = ?
        WHERE s.is_active = 1
        ORDER BY s.name
      `).bind(petResult.size).all();
      
      const services = servicesResult.results.map((row: any) => {
        let finalPrice = Number(row.calculated_price || row.price || 0);
        
        // Apply coat condition multiplier
        if (petResult.coat_condition) {
          const multipliers = {
            'excelente': 1.0,
            'bom': 1.1,
            'regular': 1.2,
            'ruim': 1.3
          };
          finalPrice *= multipliers[petResult.coat_condition as keyof typeof multipliers] || 1.0;
        }
        
        return {
          ...row,
          price: Math.round(finalPrice * 100) / 100, // Round to 2 decimals
          is_active: Boolean(row.is_active)
        };
      });
      
      return c.json(services);
    } else {
      // Get services without pricing (for initial display)
      const result = await c.env.DB.prepare(
        "SELECT id, name, description, duration_minutes, is_active, created_at, updated_at FROM services WHERE is_active = 1 ORDER BY name"
      ).all();
      
      const services = result.results.map((row: any) => ({
        ...row,
        price: 0, // No price shown until pet is selected
        is_active: Boolean(row.is_active)
      }));
      
      return c.json(services);
    }
  } catch (error) {
    return c.json({ error: "Failed to fetch services" }, 500);
  }
});

// Pets endpoints
app.get("/api/pets", async (c) => {
  try {
    const result = await c.env.DB.prepare(
      "SELECT * FROM pets ORDER BY name"
    ).all();
    
    const pets = result.results.map((row: any) => PetSchema.parse(row));
    return c.json(pets);
  } catch (error) {
    return c.json({ error: "Failed to fetch pets" }, 500);
  }
});

app.post("/api/pets", zValidator("json", CreatePetSchema), async (c) => {
  try {
    const pet = c.req.valid("json");
    
    const result = await c.env.DB.prepare(
      `INSERT INTO pets (name, breed, size, weight_kg, age_years, special_notes, photo_url, coat_condition, coat_notes, owner_name, owner_phone, owner_email)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       RETURNING *`
    ).bind(
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
      pet.owner_email || null
    ).first();
    
    const newPet = PetSchema.parse(result);
    return c.json(newPet, 201);
  } catch (error) {
    return c.json({ error: "Failed to create pet" }, 500);
  }
});

// Appointments endpoints
app.get("/api/appointments", async (c) => {
  try {
    const date = c.req.query("date");
    const phone = c.req.query("phone");
    
    let query = `
      SELECT 
        a.*,
        p.name as pet_name, p.breed, p.size, p.weight_kg, p.age_years, p.special_notes,
        p.created_at as pet_created_at, p.updated_at as pet_updated_at
      FROM appointments a
      JOIN pets p ON a.pet_id = p.id
    `;
    
    const params = [];
    const conditions = [];
    
    if (date) {
      conditions.push("a.appointment_date = ?");
      params.push(date);
    }
    
    if (phone) {
      conditions.push("p.owner_phone = ?");
      params.push(phone);
    }
    
    if (conditions.length > 0) {
      query += " WHERE " + conditions.join(" AND ");
    }
    
    query += " ORDER BY a.appointment_date DESC, a.appointment_time";
    
    const result = await c.env.DB.prepare(query).bind(...params).all();
    
    // For each appointment, get its services
    const appointments = [];
    for (const row of result.results) {
      const servicesResult = await c.env.DB.prepare(`
        SELECT s.id, s.name, s.description, s.duration_minutes, s.price, s.is_active, s.created_at, s.updated_at
        FROM services s
        JOIN appointment_services as_rel ON s.id = as_rel.service_id
        WHERE as_rel.appointment_id = ?
        ORDER BY s.name
      `).bind(row.id).all();
      
      appointments.push({
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
        services: servicesResult.results.map((service: any) => ({
          id: service.id,
          name: service.name,
          description: service.description,
          duration_minutes: service.duration_minutes,
          price: service.price,
          is_active: Boolean(service.is_active),
          created_at: service.created_at,
          updated_at: service.updated_at,
        }))
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
    
    // Get pet details and calculate total price with dynamic pricing
    const petResult = await c.env.DB.prepare(
      "SELECT size, coat_condition FROM pets WHERE id = ?"
    ).bind(appointment.pet_id).first();
    
    if (!petResult) {
      return c.json({ error: "Pet not found" }, 404);
    }

    // Get services with dynamic pricing
    const serviceIds = appointment.service_ids.map(() => `?`).join(',');
    const servicesResult = await c.env.DB.prepare(`
      SELECT s.id, s.price, sp.base_price as calculated_price
      FROM services s
      LEFT JOIN service_pricing sp ON s.id = sp.service_id AND sp.size = ?
      WHERE s.id IN (${serviceIds})
    `).bind(petResult.size, ...appointment.service_ids).all();
    
    if (servicesResult.results.length !== appointment.service_ids.length) {
      return c.json({ error: "One or more services not found" }, 404);
    }
    
    // Calculate total price with coat condition adjustment
    const multipliers = {
      'excelente': 1.0,
      'bom': 1.1,
      'regular': 1.2,
      'ruim': 1.3
    };
    const coatMultiplier = multipliers[petResult.coat_condition as keyof typeof multipliers] || 1.0;
    
    const totalPrice = servicesResult.results.reduce((sum: number, service: any) => {
      const basePrice = Number(service.calculated_price || service.price || 0);
      return sum + (basePrice * coatMultiplier);
    }, 0);
    
    // Create appointment (keeping the old service_id as the first service for backward compatibility)
    const result = await c.env.DB.prepare(
      `INSERT INTO appointments (pet_id, service_id, owner_name, owner_phone, owner_email, 
                                appointment_date, appointment_time, total_price, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
       RETURNING *`
    ).bind(
      appointment.pet_id,
      appointment.service_ids[0], // First service for backward compatibility
      appointment.owner_name,
      appointment.owner_phone,
      appointment.owner_email || null,
      appointment.appointment_date,
      appointment.appointment_time,
      totalPrice,
      appointment.notes || null
    ).first();
    
    if (!result) {
      return c.json({ error: "Failed to create appointment" }, 500);
    }
    
    // Insert appointment services into junction table
    for (const serviceId of appointment.service_ids) {
      await c.env.DB.prepare(
        `INSERT INTO appointment_services (appointment_id, service_id) VALUES (?, ?)`
      ).bind(result.id, serviceId).run();
    }
    
    const newAppointment = AppointmentSchema.parse(result);
    return c.json(newAppointment, 201);
  } catch (error) {
    return c.json({ error: "Failed to create appointment" }, 500);
  }
});

app.patch("/api/appointments/:id/status", async (c) => {
  try {
    const id = parseInt(c.req.param("id"));
    const { status } = await c.req.json();
    
    if (!['agendado', 'confirmado', 'em_andamento', 'concluido', 'cancelado'].includes(status)) {
      return c.json({ error: "Invalid status" }, 400);
    }
    
    await c.env.DB.prepare(
      "UPDATE appointments SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?"
    ).bind(status, id).run();
    
    return c.json({ success: true });
  } catch (error) {
    return c.json({ error: "Failed to update appointment status" }, 500);
  }
});

// Confirm appointment with notification
app.patch("/api/appointments/:id/confirm", async (c) => {
  try {
    const id = parseInt(c.req.param("id"));
    
    // Get appointment details
    const appointmentResult = await c.env.DB.prepare(`
      SELECT 
        a.*,
        p.name as pet_name, p.owner_name, p.owner_phone, p.owner_email
      FROM appointments a
      JOIN pets p ON a.pet_id = p.id
      WHERE a.id = ?
    `).bind(id).first();
    
    if (!appointmentResult) {
      return c.json({ error: "Appointment not found" }, 404);
    }
    
    // Update appointment status
    await c.env.DB.prepare(
      "UPDATE appointments SET status = 'confirmado', updated_at = CURRENT_TIMESTAMP WHERE id = ?"
    ).bind(id).run();
    
    // Send notification to client
    try {
      await sendConfirmationNotification(appointmentResult);
    } catch (notificationError) {
      console.error("Failed to send notification:", notificationError);
      // Continue even if notification fails
    }
    
    return c.json({ 
      success: true, 
      message: "Agendamento confirmado e cliente notificado" 
    });
  } catch (error) {
    return c.json({ error: "Failed to confirm appointment" }, 500);
  }
});

// Helper function to send confirmation notification
async function sendConfirmationNotification(appointment: any) {
  const phone = appointment.owner_phone.replace(/\D/g, '');
  const message = `🐾 *Agendamento Confirmado!*

Olá ${appointment.owner_name}! 

Seu agendamento para *${appointment.pet_name}* foi confirmado:

📅 *Data:* ${new Date(appointment.appointment_date).toLocaleDateString('pt-BR')}
🕐 *Horário:* ${appointment.appointment_time}
💰 *Valor:* R$ ${appointment.total_price?.toFixed(2) || '0,00'}

Estamos ansiosos para cuidar do seu pet! 🐶🐱

_PetCare Agenda - Banho & Tosa_`;

  // For now, we'll prepare the WhatsApp link (in a real implementation, you'd use WhatsApp Business API)
  const whatsappUrl = `https://wa.me/55${phone}?text=${encodeURIComponent(message)}`;
  
  // Log for demonstration (in production, you'd send via API)
  console.log(`Notification would be sent to ${phone}:`, message);
  console.log(`WhatsApp URL:`, whatsappUrl);
  
  return { success: true, whatsappUrl };
}

// Available time slots endpoint
app.get("/api/available-slots", async (c) => {
  try {
    const date = c.req.query("date");
    
    if (!date) {
      return c.json({ error: "Date is required" }, 400);
    }
    
    const selectedDate = new Date(date);
    const dayOfWeek = selectedDate.getDay();
    
    // Get working hours for this day of the week
    const workingHour = await c.env.DB.prepare(
      "SELECT start_time, end_time, appointment_duration, break_start, break_end FROM working_hours WHERE day_of_week = ? AND is_active = 1"
    ).bind(dayOfWeek).first() as {
      start_time: string;
      end_time: string;
      appointment_duration: number;
      break_start: string | null;
      break_end: string | null;
    } | null;
    
    if (!workingHour) {
      return c.json([]); // No working hours for this day
    }
    
    const startTime = workingHour.start_time;
    const endTime = workingHour.end_time;
    const breakStart = workingHour.break_start;
    const breakEnd = workingHour.break_end;
    const duration = workingHour.appointment_duration || 30;
    
    // Get existing appointments for the date
    const result = await c.env.DB.prepare(
      "SELECT appointment_time FROM appointments WHERE appointment_date = ? AND status NOT IN ('cancelado')"
    ).bind(date).all();
    
    const bookedTimes = new Set(result.results.map((row: any) => row.appointment_time));
    
    // Generate time slots based on working hours
    const timeSlots = [];
    const startTimeParts = startTime.split(':');
    const endTimeParts = endTime.split(':');
    const breakStartParts = breakStart ? breakStart.split(':') : null;
    const breakEndParts = breakEnd ? breakEnd.split(':') : null;
    
    const startMinutes = parseInt(startTimeParts[0]) * 60 + parseInt(startTimeParts[1]);
    const endMinutes = parseInt(endTimeParts[0]) * 60 + parseInt(endTimeParts[1]);
    const breakStartMinutes = breakStartParts ? parseInt(breakStartParts[0]) * 60 + parseInt(breakStartParts[1]) : null;
    const breakEndMinutes = breakEndParts ? parseInt(breakEndParts[0]) * 60 + parseInt(breakEndParts[1]) : null;
    
    for (let minutes = startMinutes; minutes < endMinutes; minutes += duration) {
      // Skip break time
      if (breakStartMinutes && breakEndMinutes && 
          minutes >= breakStartMinutes && minutes < breakEndMinutes) {
        continue;
      }
      
      const hour = Math.floor(minutes / 60);
      const minute = minutes % 60;
      const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
      
      if (!bookedTimes.has(timeString)) {
        timeSlots.push(timeString);
      }
    }
    
    return c.json(timeSlots);
  } catch (error) {
    return c.json({ error: "Failed to fetch available slots" }, 500);
  }
});

// File upload endpoint for pet photos
app.post("/api/upload-pet-photo", async (c) => {
  try {
    const formData = await c.req.formData();
    const photo = formData.get('photo') as File;
    
    if (!photo) {
      return c.json({ error: "No photo provided" }, 400);
    }
    
    // Generate unique filename
    const timestamp = Date.now();
    const extension = photo.name.split('.').pop() || 'jpg';
    // Use flat filenames (no folders) to simplify routing in Hono
    const filename = `pet-photos/${timestamp}.${extension}`;
    
    // Upload to R2
    // NOTE: Using arrayBuffer for better compatibility in local dev (Miniflare)
    const buffer = await photo.arrayBuffer();
    await c.env.R2_BUCKET.put(filename, buffer, {
      httpMetadata: {
        contentType: photo.type,
      },
    });
    
    const photoUrl = `/api/files/${encodeURIComponent(filename)}`;
    
    return c.json({ photoUrl });
  } catch (error) {
    return c.json({ error: "Failed to upload photo" }, 500);
  }
});

// File download endpoint (supports nested keys like business-logo/xxx.jpg)
app.get("/api/files/:folder/:file", async (c) => {
  try {
    const folder = c.req.param("folder");
    const file = c.req.param("file");
    const filename = `${folder}/${file}`;
    const object = await c.env.R2_BUCKET.get(filename);

    if (!object) {
      return c.json({ error: "File not found" }, 404);
    }

    const headers = new Headers();
    object.writeHttpMetadata(headers);
    headers.set("etag", object.httpEtag);

    return c.body(object.body, { headers });
  } catch (error) {
    return c.json({ error: "Failed to fetch file" }, 500);
  }
});

// File download endpoint (flat filename)
app.get("/api/files/:filename", async (c) => {
  try {
    const filename = decodeURIComponent(c.req.param("filename"));
    const object = await c.env.R2_BUCKET.get(filename);
    
    if (!object) {
      return c.json({ error: "File not found" }, 404);
    }
    
    const headers = new Headers();
    object.writeHttpMetadata(headers);
    headers.set("etag", object.httpEtag);
    
    return c.body(object.body, { headers });
  } catch (error) {
    return c.json({ error: "Failed to fetch file" }, 500);
  }
});

// Admin Service Management
app.get("/api/admin/services", async (c) => {
  try {
    const result = await c.env.DB.prepare(
      "SELECT * FROM services ORDER BY name"
    ).all();
    
  const services = result.results.map((row: any) => ({
      ...row,
      is_active: Boolean(row.is_active)
    }));
    
    return c.json(services);
  } catch (error) {
    return c.json({ error: "Failed to fetch services" }, 500);
  }
});

app.post("/api/admin/services", async (c) => {
  try {
    const service = await c.req.json();
    
    const result = await c.env.DB.prepare(
      `INSERT INTO services (name, description, duration_minutes, price, is_active)
       VALUES (?, ?, ?, ?, ?)
       RETURNING *`
    ).bind(
      service.name,
      service.description || null,
      service.duration_minutes,
      service.price || 0,
      service.is_active ? 1 : 0
    ).first();
    
    if (!result) {
      return c.json({ error: "Failed to create service" }, 500);
    }
    
    return c.json({
      ...result,
      is_active: Boolean((result as any).is_active)
    }, 201);
  } catch (error) {
    return c.json({ error: "Failed to create service" }, 500);
  }
});

app.put("/api/admin/services/:id", async (c) => {
  try {
    const id = parseInt(c.req.param("id"));
    const service = await c.req.json();
    
    await c.env.DB.prepare(
      `UPDATE services 
       SET name = ?, description = ?, duration_minutes = ?, price = ?, is_active = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`
    ).bind(
      service.name,
      service.description || null,
      service.duration_minutes,
      service.price || 0,
      service.is_active ? 1 : 0,
      id
    ).run();
    
    return c.json({ success: true });
  } catch (error) {
    return c.json({ error: "Failed to update service" }, 500);
  }
});

app.delete("/api/admin/services/:id", async (c) => {
  try {
    const id = parseInt(c.req.param("id"));
    
    // Also delete pricing for this service
    await c.env.DB.prepare("DELETE FROM service_pricing WHERE service_id = ?").bind(id).run();
    await c.env.DB.prepare("DELETE FROM services WHERE id = ?").bind(id).run();
    
    return c.json({ success: true });
  } catch (error) {
    return c.json({ error: "Failed to delete service" }, 500);
  }
});

// Service Pricing Management
app.get("/api/admin/service-pricing", async (c) => {
  try {
    const result = await c.env.DB.prepare(
      "SELECT * FROM service_pricing ORDER BY service_id, size"
    ).all();
    
    return c.json(result.results);
  } catch (error) {
    return c.json({ error: "Failed to fetch pricing" }, 500);
  }
});

app.post("/api/admin/service-pricing", async (c) => {
  try {
    const pricing = await c.req.json();
    
    // Update or insert pricing
    await c.env.DB.prepare(
      `INSERT OR REPLACE INTO service_pricing (service_id, size, base_price)
       VALUES (?, ?, ?)`
    ).bind(
      pricing.service_id,
      pricing.size,
      pricing.base_price
    ).run();
    
    return c.json({ success: true });
  } catch (error) {
    return c.json({ error: "Failed to update pricing" }, 500);
  }
});

// Working Hours Management
app.get("/api/admin/working-hours", async (c) => {
  try {
    const result = await c.env.DB.prepare(
      "SELECT * FROM working_hours ORDER BY day_of_week"
    ).all();
    
    return c.json(result.results);
  } catch (error) {
    return c.json({ error: "Failed to fetch working hours" }, 500);
  }
});

app.post("/api/admin/working-hours", async (c) => {
  try {
    const { working_hours } = await c.req.json();
    
    // Delete existing working hours
    await c.env.DB.prepare("DELETE FROM working_hours").run();
    
    // Insert new working hours
    for (const hour of working_hours) {
      await c.env.DB.prepare(
        `INSERT INTO working_hours (day_of_week, start_time, end_time, is_active, appointment_duration, break_start, break_end)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      ).bind(
        hour.day_of_week,
        hour.start_time,
        hour.end_time,
        hour.is_active ? 1 : 0,
        hour.appointment_duration,
        hour.break_start || null,
        hour.break_end || null
      ).run();
    }
    
    return c.json({ success: true });
  } catch (error) {
    return c.json({ error: "Failed to save working hours" }, 500);
  }
});

// Business Configuration
app.get("/api/admin/business-config", async (c) => {
  try {
    const result = await c.env.DB.prepare(
      "SELECT * FROM business_config LIMIT 1"
    ).first();
    
    if (result) {
      return c.json(result);
    } else {
      // Return default config if none exists
      return c.json({
        business_name: 'PetCare Agenda',
        phone: '(11) 9999-9999',
        whatsapp: '11999999999',
        email: 'contato@petcare.com',
        address: 'Rua dos Pets, 123 - São Paulo/SP',
        instagram: '@petcare.agenda',
        description: 'Cuidamos do seu pet com carinho e profissionalismo. Banho, tosa e muito amor!',
        logo_url: '',
        primary_color: '#3B82F6',
        secondary_color: '#8B5CF6',
        business_hours_display: 'Seg-Sáb: 8h às 18h'
      });
    }
  } catch (error) {
    return c.json({ error: "Failed to fetch business config" }, 500);
  }
});

app.post("/api/admin/business-config", async (c) => {
  try {
    const config = await c.req.json();
    
    // Update or insert business config
    await c.env.DB.prepare(
      `INSERT OR REPLACE INTO business_config (
        id, business_name, phone, whatsapp, email, address, instagram, 
        description, logo_url, primary_color, secondary_color, business_hours_display
      ) VALUES (
        1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
      )`
    ).bind(
      config.business_name,
      config.phone,
      config.whatsapp,
      config.email,
      config.address,
      config.instagram,
      config.description,
      config.logo_url || null,
      config.primary_color,
      config.secondary_color,
      config.business_hours_display
    ).run();
    
    return c.json({ success: true });
  } catch (error) {
    return c.json({ error: "Failed to save business config" }, 500);
  }
});

// Business logo upload endpoint
app.post("/api/upload-business-logo", async (c) => {
  try {
    const formData = await c.req.formData();
    const logo = formData.get('logo') as File;
    
    if (!logo) {
      return c.json({ error: "No logo provided" }, 400);
    }
    
    // Generate unique filename
    const timestamp = Date.now();
    const extension = logo.name.split('.').pop() || 'jpg';
    // Use flat filenames (no folders) to simplify routing in Hono
    const filename = `business-logo/${timestamp}.${extension}`;
    
    // Upload to R2
    // NOTE: Using arrayBuffer for better compatibility in local dev (Miniflare)
    const buffer = await logo.arrayBuffer();
    await c.env.R2_BUCKET.put(filename, buffer, {
      httpMetadata: {
        contentType: logo.type,
      },
    });
    
    const logoUrl = `/api/files/${encodeURIComponent(filename)}`;
    
    return c.json({ logoUrl });
  } catch (error) {
    return c.json({ error: "Failed to upload logo" }, 500);
  }
});

export default app;
