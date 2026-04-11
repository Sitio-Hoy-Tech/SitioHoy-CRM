-- ============================================
-- CRM SITIOHOY - Schema completo
-- Ejecutar en Supabase SQL Editor
-- ============================================

-- 0. Extensiones
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================
-- 1. USUARIOS
-- ============================================
CREATE TABLE usuarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre VARCHAR(100) NOT NULL,
  apellido VARCHAR(100) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  rol VARCHAR(50) NOT NULL DEFAULT 'admin',
  estado BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ NULL
);

CREATE INDEX idx_usuarios_email ON usuarios(email);

-- ============================================
-- 2. PLANES
-- ============================================
CREATE TABLE planes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre VARCHAR(255) NOT NULL UNIQUE,
  beneficios TEXT NOT NULL,
  precio DECIMAL(10, 2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ NULL
);

CREATE INDEX idx_planes_nombre ON planes(nombre);

-- ============================================
-- 3. ESTADOS DE CONTACTO
-- ============================================
CREATE TABLE estados_contacto (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre VARCHAR(100) NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ NULL
);

-- Datos iniciales
INSERT INTO estados_contacto (nombre) VALUES ('Posible cliente'), ('Cliente');

-- ============================================
-- 4. ETIQUETAS DE NEGOCIO
-- ============================================
CREATE TABLE etiquetas_negocio (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre VARCHAR(100) NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ NULL
);

-- Datos iniciales
INSERT INTO etiquetas_negocio (nombre) VALUES ('Gimnasio'), ('Restaurante'), ('Tienda de ropa');

-- ============================================
-- 5. CONTACTOS
-- ============================================
CREATE TABLE contactos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre VARCHAR(100) NOT NULL,
  apellido VARCHAR(100),
  email VARCHAR(255),
  telefono VARCHAR(50),
  estado_id UUID NOT NULL REFERENCES estados_contacto(id),
  etiqueta_negocio_id UUID REFERENCES etiquetas_negocio(id),
  origen VARCHAR(100) NOT NULL,
  fecha_contacto TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  notas TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ NULL,
  created_by UUID REFERENCES usuarios(id)
);

CREATE INDEX idx_contactos_estado ON contactos(estado_id);
CREATE INDEX idx_contactos_etiqueta ON contactos(etiqueta_negocio_id);
CREATE INDEX idx_contactos_email ON contactos(email);
CREATE INDEX idx_contactos_fecha ON contactos(fecha_contacto);
CREATE INDEX idx_contactos_origen ON contactos(origen);

-- ============================================
-- 6. ETIQUETAS DE PLANTILLAS
-- ============================================
CREATE TABLE etiquetas_plantillas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre VARCHAR(100) NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ NULL
);

-- ============================================
-- 7. PLANTILLAS
-- ============================================
CREATE TABLE plantillas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre VARCHAR(255) NOT NULL,
  html TEXT NOT NULL,
  etiqueta_plantilla_id UUID REFERENCES etiquetas_plantillas(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ NULL,
  created_by UUID REFERENCES usuarios(id)
);

CREATE INDEX idx_plantillas_nombre ON plantillas(nombre);
CREATE INDEX idx_plantillas_etiqueta ON plantillas(etiqueta_plantilla_id);

-- ============================================
-- 8. CLIENTES
-- ============================================
CREATE TABLE clientes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre_empresa VARCHAR(255) NOT NULL,
  contacto_id UUID NOT NULL REFERENCES contactos(id),
  dominio VARCHAR(255) NOT NULL UNIQUE,
  plan_id UUID NOT NULL REFERENCES planes(id),
  plantilla_id UUID NOT NULL REFERENCES plantillas(id),
  tenant_id VARCHAR(255) NOT NULL UNIQUE,
  etiqueta_negocio_id UUID NOT NULL REFERENCES etiquetas_negocio(id),
  fecha_pago TIMESTAMPTZ NOT NULL,
  fecha_vencimiento TIMESTAMPTZ,
  estado BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ NULL,
  created_by UUID REFERENCES usuarios(id)
);

CREATE INDEX idx_clientes_nombre ON clientes(nombre_empresa);
CREATE INDEX idx_clientes_dominio ON clientes(dominio);
CREATE INDEX idx_clientes_plan ON clientes(plan_id);
CREATE INDEX idx_clientes_tenant ON clientes(tenant_id);
CREATE INDEX idx_clientes_estado ON clientes(estado);
CREATE INDEX idx_clientes_vencimiento ON clientes(fecha_vencimiento);

-- ============================================
-- 9. SEGUIMIENTO DE CONTACTOS
-- ============================================
CREATE TABLE seguimiento_contactos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contacto_id UUID NOT NULL REFERENCES contactos(id) ON DELETE CASCADE,
  fecha_seguimiento TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  notas TEXT NOT NULL,
  created_by UUID NOT NULL REFERENCES usuarios(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ NULL
);

CREATE INDEX idx_seguimiento_contacto ON seguimiento_contactos(contacto_id);
CREATE INDEX idx_seguimiento_fecha ON seguimiento_contactos(fecha_seguimiento);

-- ============================================
-- 10. AUDIT LOG
-- ============================================
CREATE TABLE audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id UUID NOT NULL REFERENCES usuarios(id),
  tabla_afectada VARCHAR(100) NOT NULL,
  registro_id UUID NOT NULL,
  accion VARCHAR(50) NOT NULL,
  cambios_anteriores JSONB,
  cambios_nuevos JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_audit_usuario ON audit_log(usuario_id);
CREATE INDEX idx_audit_tabla ON audit_log(tabla_afectada);
CREATE INDEX idx_audit_fecha ON audit_log(created_at);

-- ============================================
-- 11. FUNCIÓN fecha_vencimiento AUTOMÁTICA
-- ============================================
CREATE OR REPLACE FUNCTION calcular_fecha_vencimiento()
RETURNS TRIGGER AS $$
BEGIN
  NEW.fecha_vencimiento = NEW.fecha_pago + INTERVAL '30 days';
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_clientes_vencimiento
  BEFORE INSERT OR UPDATE OF fecha_pago ON clientes
  FOR EACH ROW EXECUTE FUNCTION calcular_fecha_vencimiento();

-- ============================================
-- 12. FUNCIÓN updated_at AUTOMÁTICA
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers para updated_at
CREATE TRIGGER trg_usuarios_updated BEFORE UPDATE ON usuarios FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_planes_updated BEFORE UPDATE ON planes FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_contactos_updated BEFORE UPDATE ON contactos FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_plantillas_updated BEFORE UPDATE ON plantillas FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_clientes_updated BEFORE UPDATE ON clientes FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_seguimiento_updated BEFORE UPDATE ON seguimiento_contactos FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================
-- 12. RLS POLICIES (MVP - todos admin)
-- ============================================
ALTER TABLE usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE planes ENABLE ROW LEVEL SECURITY;
ALTER TABLE estados_contacto ENABLE ROW LEVEL SECURITY;
ALTER TABLE etiquetas_negocio ENABLE ROW LEVEL SECURITY;
ALTER TABLE contactos ENABLE ROW LEVEL SECURITY;
ALTER TABLE etiquetas_plantillas ENABLE ROW LEVEL SECURITY;
ALTER TABLE plantillas ENABLE ROW LEVEL SECURITY;
ALTER TABLE clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE seguimiento_contactos ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- Para MVP: acceso completo usando service_role key desde el backend
-- Las API routes de Next.js usan service_role que bypasea RLS
-- Esto es seguro porque el CRM es solo de uso interno

-- ============================================
-- 13. USUARIO ADMIN INICIAL (cambiar password después)
-- Password: admin123 (hasheado con bcrypt)
-- ============================================
-- NOTA: Ejecutar esto DESPUÉS de deployar, reemplazando el hash
-- con uno generado por la app al hacer signup del primer usuario.
