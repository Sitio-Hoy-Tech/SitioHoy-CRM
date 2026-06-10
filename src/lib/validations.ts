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
  dominio: z.string().optional().or(z.literal("")).transform(v => v || null),
  plan_id: z.string().uuid("Plan requerido"),
  etiqueta_negocio_id: z.string().uuid("Etiqueta de negocio requerida"),
  fecha_pago: z.string().min(1, "Fecha de pago requerida"),
  tenant_id: z.string().uuid("Tenant ID inválido").optional().or(z.literal("")).transform(v => v || null),
  mp_cuenta_id: z.string().uuid().nullable().optional(),
  pago_unico: z.boolean().optional(),
  precio_pago_unico: z.preprocess(
    v => (v === "" || v == null ? null : Number(v)),
    z.number().positive("El precio del pago único debe ser positivo").nullable()
  ).optional(),
})
  .refine(d => !d.pago_unico || (d.precio_pago_unico != null && d.precio_pago_unico > 0), {
    message: "Ingresá el precio del pago único",
    path: ["precio_pago_unico"],
  })
  // El precio personalizado solo aplica a pagos únicos
  .transform(d => ({ ...d, precio_pago_unico: d.pago_unico ? d.precio_pago_unico ?? null : null }));

// ============================================
// Planes
// ============================================

export const planSchema = z.object({
  nombre: z.string().min(1, "Nombre requerido"),
  beneficios: z.string().optional().or(z.literal("")),
  precio: z.coerce.number().positive("Precio debe ser positivo"),
});

// ============================================
// Catálogos simples (estados, etiquetas)
// ============================================

export const catalogoSimpleSchema = z.object({
  nombre: z.string().min(1, "Nombre requerido"),
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

// ============================================
// Base de Conocimientos
// ============================================

export const kbCategoriaSchema = z.object({
  nombre: z.string().min(1, "Nombre requerido"),
  descripcion: z.string().optional().or(z.literal("")),
  icono: z.string().optional().or(z.literal("")),
  posicion: z.coerce.number().int().default(0),
});

export const kbArticuloSchema = z.object({
  categoria_id: z.string().uuid("Categoría requerida"),
  titulo: z.string().min(1, "Título requerido"),
  resumen: z.string().optional().or(z.literal("")),
  contenido: z.string().min(1, "Contenido requerido"),
  posicion: z.coerce.number().int().default(0),
});
