import { z } from "zod";

// ============================================
// Auth
// ============================================

export const loginSchema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(6, "Mínimo 6 caracteres"),
});

export const signupSchema = z.object({
  nombre: z.string().min(1, "Nombre requerido"),
  apellido: z.string().min(1, "Apellido requerido"),
  email: z.string().email("Email inválido"),
  password: z.string().min(6, "Mínimo 6 caracteres"),
});

// ============================================
// Contactos
// ============================================

export const contactoSchema = z.object({
  nombre: z.string().min(1, "Nombre requerido"),
  apellido: z.string().optional().default(""),
  email: z.string().email("Email inválido").optional().or(z.literal("")),
  telefono: z.string().optional().default(""),
  estado_id: z.string().uuid("Estado requerido"),
  etiqueta_negocio_id: z.string().uuid().optional().or(z.literal("")),
  origen: z.string().min(1, "Origen requerido"),
  fecha_contacto: z.string().optional(),
  notas: z.string().optional().default(""),
});

// ============================================
// Clientes
// ============================================

export const clienteSchema = z.object({
  nombre_empresa: z.string().min(1, "Nombre de empresa requerido"),
  contacto_id: z.string().uuid("Contacto requerido"),
  dominio: z.string().min(1, "Dominio requerido"),
  plan_id: z.string().uuid("Plan requerido"),
  plantilla_id: z.string().uuid("Plantilla requerida"),
  etiqueta_negocio_id: z.string().uuid("Etiqueta de negocio requerida"),
  fecha_pago: z.string().min(1, "Fecha de pago requerida"),
});

// ============================================
// Planes
// ============================================

export const planSchema = z.object({
  nombre: z.string().min(1, "Nombre requerido"),
  beneficios: z.string().min(1, "Beneficios requeridos"),
  precio: z.coerce.number().positive("Precio debe ser positivo"),
});

// ============================================
// Catálogos simples (estados, etiquetas)
// ============================================

export const catalogoSimpleSchema = z.object({
  nombre: z.string().min(1, "Nombre requerido"),
});

// ============================================
// Plantillas
// ============================================

export const plantillaSchema = z.object({
  nombre: z.string().min(1, "Nombre requerido"),
  url_plantilla: z.string().url("URL de plantilla inválida").min(1, "URL de plantilla requerida"),
  etiqueta_plantilla_id: z.string().uuid().optional().or(z.literal("")),
});

// ============================================
// Seguimiento
// ============================================

export const seguimientoSchema = z.object({
  notas: z.string().min(1, "Notas requeridas"),
  fecha_seguimiento: z.string().optional(),
});

// ============================================
// Usuarios
// ============================================

export const usuarioSchema = z.object({
  nombre: z.string().min(1, "Nombre requerido"),
  apellido: z.string().min(1, "Apellido requerido"),
  email: z.string().email("Email inválido"),
  password: z.string().min(6, "Mínimo 6 caracteres"),
  rol: z.enum(["admin", "sales", "manager"]).default("admin"),
});
