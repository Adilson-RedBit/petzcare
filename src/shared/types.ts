import z from "zod";

// Service schemas
export const ServiceSchema = z.object({
  id: z.number(),
  name: z.string(),
  description: z.string().nullable(),
  duration_minutes: z.number(),
  price: z.number(),
  is_active: z.boolean(),
  created_at: z.string(),
  updated_at: z.string(),
});

export type Service = z.infer<typeof ServiceSchema>;

// Pet schemas
export const PetSchema = z.object({
  id: z.number(),
  name: z.string(),
  breed: z.string().nullable(),
  size: z.enum(['pequeno', 'medio', 'grande']),
  weight_kg: z.number().nullable(),
  age_years: z.number().nullable(),
  special_notes: z.string().nullable(),
  photo_url: z.string().nullable(),
  coat_condition: z.enum(['excelente', 'bom', 'regular', 'ruim']).nullable(),
  coat_notes: z.string().nullable(),
  owner_name: z.string().nullable(),
  owner_phone: z.string().nullable(),
  owner_email: z.string().nullable(),
  owner_address: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
});

export const CreatePetSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  breed: z.string().optional(),
  size: z.enum(['pequeno', 'medio', 'grande']),
  weight_kg: z.number().positive().optional(),
  age_years: z.number().positive().optional(),
  special_notes: z.string().optional(),
  photo_url: z.string().optional(),
  coat_condition: z.enum(['excelente', 'bom', 'regular', 'ruim']).optional(),
  coat_notes: z.string().optional(),
  owner_name: z.string().min(1, 'Nome do responsável é obrigatório'),
  owner_phone: z.string().min(1, 'Telefone é obrigatório'),
  owner_email: z.string().email().optional().or(z.literal('')),
  owner_address: z.string().optional(),
});

export type Pet = z.infer<typeof PetSchema>;
export type CreatePet = z.infer<typeof CreatePetSchema>;

// Appointment schemas
export const AppointmentSchema = z.object({
  id: z.number(),
  pet_id: z.number(),
  service_id: z.number(),
  owner_name: z.string(),
  owner_phone: z.string(),
  owner_email: z.string().nullable(),
  appointment_date: z.string(),
  appointment_time: z.string(),
  status: z.enum(['agendado', 'confirmado', 'em_andamento', 'concluido', 'cancelado']),
  total_price: z.number().nullable(),
  notes: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
});

export const CreateAppointmentSchema = z.object({
  pet_id: z.number(),
  service_ids: z.array(z.number()).min(1, 'Pelo menos um serviço deve ser selecionado'),
  owner_name: z.string().min(1, 'Nome do dono é obrigatório'),
  owner_phone: z.string().min(1, 'Telefone é obrigatório'),
  owner_email: z.string().email().optional().or(z.literal('')),
  appointment_date: z.string().min(1, 'Data é obrigatória'),
  appointment_time: z.string().min(1, 'Horário é obrigatório'),
  notes: z.string().optional(),
});

export type Appointment = z.infer<typeof AppointmentSchema>;
export type CreateAppointment = z.infer<typeof CreateAppointmentSchema>;

// Combined appointment with related data
export const AppointmentWithDetailsSchema = AppointmentSchema.extend({
  pet: PetSchema,
  services: z.array(ServiceSchema),
});

export type AppointmentWithDetails = z.infer<typeof AppointmentWithDetailsSchema>;

// Service pricing schema
export const ServicePricingSchema = z.object({
  id: z.number(),
  service_id: z.number(),
  size: z.enum(['pequeno', 'medio', 'grande']),
  base_price: z.number(),
  created_at: z.string(),
  updated_at: z.string(),
});

export type ServicePricing = z.infer<typeof ServicePricingSchema>;

// Service with dynamic pricing
export const ServiceWithPricingSchema = ServiceSchema.extend({
  pricing: z.array(ServicePricingSchema),
});

export type ServiceWithPricing = z.infer<typeof ServiceWithPricingSchema>;
