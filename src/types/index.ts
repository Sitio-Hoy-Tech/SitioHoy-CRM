// ============================================
// CRM SITIOHOY - Tipos TypeScript
// ============================================

export interface Usuario {
  id: string;
  nombre: string;
  apellido: string;
  email: string;
  password_hash?: string;
  rol: "admin" | "sales" | "manager";
  estado: boolean;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface MpCuenta {
  id: string;
  nombre: string;
  descripcion: string | null;
  access_token: string;
  public_key: string | null;
  webhook_secret: string | null;
  email_titular: string | null;
  activo: boolean;
  created_at: string;
  updated_at: string;
}

export interface Plan {
  id: string;
  nombre: string;
  beneficios: string;
  precio: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface EstadoContacto {
  id: string;
  nombre: string;
  created_at: string;
  deleted_at: string | null;
}

export interface EtiquetaNegocio {
  id: string;
  nombre: string;
  created_at: string;
  deleted_at: string | null;
}

export interface Contacto {
  id: string;
  nombre: string;
  apellido: string | null;
  email: string | null;
  telefono: string | null;
  estado_id: string;
  etiqueta_negocio_id: string | null;
  origen: string;
  fecha_contacto: string;
  notas: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  created_by: string | null;
  // Relaciones expandidas
  estado?: EstadoContacto;
  etiqueta_negocio?: EtiquetaNegocio;
  usuario_creador?: Pick<Usuario, "id" | "nombre" | "apellido">;
}

export interface Cliente {
  id: string;
  nombre_empresa: string;
  contacto_id: string;
  dominio: string;
  plan_id: string;
  tenant_id: string;
  etiqueta_negocio_id: string;
  fecha_pago: string;
  fecha_vencimiento: string;
  estado: boolean;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  created_by: string | null;
  mp_subscription_id: string | null;
  mp_plan_id: string | null;
  mp_init_point: string | null;
  mp_status: string | null;
  mp_cuenta_id: string | null;
  // Relaciones expandidas
  contacto?: Contacto;
  plan?: Plan;
  etiqueta_negocio?: EtiquetaNegocio;
  mp_cuenta?: MpCuenta;
}

export interface SeguimientoContacto {
  id: string;
  contacto_id: string;
  fecha_seguimiento: string;
  notas: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  // Relaciones expandidas
  usuario_creador?: Pick<Usuario, "id" | "nombre" | "apellido">;
}

export interface AuditLog {
  id: string;
  usuario_id: string;
  tabla_afectada: string;
  registro_id: string;
  accion: "CREATE" | "UPDATE" | "DELETE";
  cambios_anteriores: Record<string, unknown> | null;
  cambios_nuevos: Record<string, unknown> | null;
  created_at: string;
  // Relaciones expandidas
  usuario?: Pick<Usuario, "id" | "nombre" | "apellido">;
}

export interface KbCategoria {
  id: string;
  nombre: string;
  slug: string;
  descripcion: string | null;
  icono: string | null;
  posicion: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface KbArticulo {
  id: string;
  categoria_id: string;
  titulo: string;
  slug: string;
  resumen: string | null;
  contenido: string;
  posicion: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  created_by: string | null;
  updated_by: string | null;
  // Relaciones expandidas
  categoria?: KbCategoria;
  usuario_creador?: Pick<Usuario, "id" | "nombre" | "apellido">;
  usuario_editor?: Pick<Usuario, "id" | "nombre" | "apellido">;
}

// ============================================
// API Types
// ============================================

export interface ApiResponse<T = unknown> {
  data?: T;
  error?: string;
  count?: number;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
}

export interface ContactoFilters extends PaginationParams {
  search?: string;
  estado_id?: string;
  etiqueta_negocio_id?: string;
  origen?: string;
  fecha_desde?: string;
  fecha_hasta?: string;
}

export interface ClienteFilters extends PaginationParams {
  search?: string;
  plan_id?: string;
  estado?: string;
  vencimiento_dias?: number;
}
