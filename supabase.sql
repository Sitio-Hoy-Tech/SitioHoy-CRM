-- ============================================
-- CRM SITIOHOY - Schema completo
-- Proyecto Supabase: SitioHoy CRM (nepjzwwkzsfegapvttgv)
-- Generado a partir del esquema vivo (2026-06-16)
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
-- (Tabla legacy: plantillas/etiquetas_plantillas ya no se usan desde la UI,
--  se mantienen por datos históricos. Ver README — sección "Catálogos".)
-- ============================================
CREATE TABLE etiquetas_plantillas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre VARCHAR(100) NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ NULL
);

-- ============================================
-- 7. PLANTILLAS (legacy, ver nota arriba)
-- ============================================
CREATE TABLE plantillas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre VARCHAR(255) NOT NULL,
  url_plantilla VARCHAR(255) NOT NULL,
  etiqueta_plantilla_id UUID REFERENCES etiquetas_plantillas(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ NULL,
  created_by UUID REFERENCES usuarios(id)
);

CREATE INDEX idx_plantillas_nombre ON plantillas(nombre);
CREATE INDEX idx_plantillas_etiqueta ON plantillas(etiqueta_plantilla_id);

-- ============================================
-- 8. CUENTAS MERCADOPAGO
-- ============================================
CREATE TABLE mp_cuentas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre VARCHAR(255) NOT NULL,
  descripcion TEXT,
  access_token TEXT NOT NULL,
  public_key TEXT,
  webhook_secret TEXT,
  email_titular TEXT,
  activo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 9. CLIENTES
-- ============================================
CREATE TABLE clientes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre_empresa VARCHAR(255) NOT NULL,
  contacto_id UUID NOT NULL REFERENCES contactos(id),
  dominio VARCHAR(255) UNIQUE,
  plan_id UUID NOT NULL REFERENCES planes(id),
  plantilla_id UUID REFERENCES plantillas(id),
  tenant_id VARCHAR(255) UNIQUE,
  etiqueta_negocio_id UUID NOT NULL REFERENCES etiquetas_negocio(id),
  fecha_pago TIMESTAMPTZ NOT NULL,
  fecha_vencimiento TIMESTAMPTZ,
  estado BOOLEAN DEFAULT true,
  pago_unico BOOLEAN NOT NULL DEFAULT false,
  precio_pago_unico DECIMAL(10, 2),
  mp_cuenta_id UUID REFERENCES mp_cuentas(id),
  mp_subscription_id TEXT,
  mp_plan_id TEXT,
  mp_init_point TEXT,
  mp_status TEXT,
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
CREATE INDEX idx_clientes_mp_cuenta ON clientes(mp_cuenta_id);
CREATE INDEX idx_clientes_mp_subscription ON clientes(mp_subscription_id);

-- ============================================
-- 10. SEGUIMIENTO DE CONTACTOS
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
-- 11. AUDIT LOG (manual, vía src/lib/audit.ts)
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
-- 12. CAJA — GASTOS MANUALES
-- ============================================
CREATE TABLE caja_gastos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  descripcion TEXT NOT NULL,
  monto NUMERIC NOT NULL CHECK (monto > 0),
  categoria TEXT NOT NULL DEFAULT 'otros',
  fecha DATE NOT NULL,
  notas TEXT,
  created_by UUID REFERENCES usuarios(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ NULL
);

CREATE INDEX idx_caja_gastos_fecha ON caja_gastos(fecha DESC) WHERE deleted_at IS NULL;

-- ============================================
-- 13. CAJA — SNAPSHOTS MENSUALES DE MRR
-- ============================================
CREATE TABLE caja_mrr_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mes DATE NOT NULL UNIQUE,
  mrr NUMERIC NOT NULL,
  total_clientes INTEGER NOT NULL,
  detalle JSONB,
  detalle_cuentas JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_caja_mrr_snapshots_mes ON caja_mrr_snapshots(mes DESC);

-- ============================================
-- 14. TICKETS (Solicitudes)
-- Reciben datos desde la plataforma SitioHoy via POST /api/webhooks/ticket
-- ============================================
CREATE TABLE tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  message TEXT NOT NULL,
  source TEXT,
  status TEXT DEFAULT 'new',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX tickets_created_at_idx ON tickets(created_at DESC);
CREATE INDEX tickets_status_idx ON tickets(status);
CREATE INDEX tickets_tenant_id_idx ON tickets(tenant_id);

-- ============================================
-- 15. CHAT DE SOPORTE
-- ============================================
CREATE TABLE chat_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id UUID REFERENCES clientes(id),
  tenant_id TEXT,
  status TEXT NOT NULL DEFAULT 'open',
  unread_agent_count INTEGER NOT NULL DEFAULT 0,
  last_message_at TIMESTAMPTZ,
  last_message_preview TEXT,
  pending_since TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX chat_sessions_tenant_id_idx ON chat_sessions(tenant_id);
CREATE INDEX chat_sessions_last_message_at_idx ON chat_sessions(last_message_at DESC NULLS LAST);

CREATE TABLE chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES chat_sessions(id),
  sender_type TEXT NOT NULL CHECK (sender_type IN ('agent', 'client', 'system')),
  sender_name TEXT,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX chat_messages_session_created_idx ON chat_messages(session_id, created_at DESC);

-- ============================================
-- 16. BASE DE CONOCIMIENTOS
-- ============================================
CREATE TABLE kb_categorias (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre VARCHAR(255) NOT NULL,
  slug VARCHAR(255) NOT NULL UNIQUE,
  descripcion TEXT,
  icono VARCHAR(100),
  posicion INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ NULL
);

CREATE TABLE kb_articulos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  categoria_id UUID NOT NULL REFERENCES kb_categorias(id),
  titulo VARCHAR(255) NOT NULL,
  slug VARCHAR(255) NOT NULL UNIQUE,
  resumen TEXT,
  contenido TEXT NOT NULL,
  posicion INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ NULL,
  created_by UUID REFERENCES usuarios(id),
  updated_by UUID REFERENCES usuarios(id)
);

CREATE INDEX idx_kb_articulos_slug ON kb_articulos(slug);
CREATE INDEX idx_kb_articulos_categoria ON kb_articulos(categoria_id);

-- ============================================
-- 17. FUNCIÓN fecha_vencimiento AUTOMÁTICA
-- ============================================
CREATE OR REPLACE FUNCTION calcular_fecha_vencimiento()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.pago_unico THEN
    NEW.fecha_vencimiento = NULL;
  ELSE
    NEW.fecha_vencimiento = NEW.fecha_pago + INTERVAL '30 days';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_clientes_vencimiento
  BEFORE INSERT OR UPDATE OF fecha_pago, pago_unico ON clientes
  FOR EACH ROW EXECUTE FUNCTION calcular_fecha_vencimiento();

-- ============================================
-- 18. FUNCIÓN updated_at AUTOMÁTICA
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
CREATE TRIGGER trg_kb_categorias_updated BEFORE UPDATE ON kb_categorias FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_kb_articulos_updated BEFORE UPDATE ON kb_articulos FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- caja_gastos usa una función equivalente con otro nombre (set_updated_at)
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER caja_gastos_updated_at BEFORE UPDATE ON caja_gastos FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================
-- 19. FUNCIÓN snapshot de MRR (usada por pg_cron)
-- ============================================
CREATE OR REPLACE FUNCTION tomar_snapshot_mrr()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_mes date;
  v_mrr numeric;
  v_total_clientes integer;
  v_detalle jsonb;
BEGIN
  v_mes := date_trunc('month', now())::date;

  SELECT
    COALESCE(SUM(p.precio), 0),
    COUNT(c.id)
  INTO v_mrr, v_total_clientes
  FROM clientes c
  JOIN planes p ON p.id = c.plan_id
  WHERE c.deleted_at IS NULL
    AND c.estado = true
    AND c.plan_id IS NOT NULL;

  SELECT COALESCE(jsonb_agg(row), '[]'::jsonb)
  INTO v_detalle
  FROM (
    SELECT jsonb_build_object(
      'nombre', p.nombre,
      'precio', p.precio::numeric,
      'cantidad', COUNT(c.id)
    ) AS row
    FROM clientes c
    JOIN planes p ON p.id = c.plan_id
    WHERE c.deleted_at IS NULL
      AND c.estado = true
      AND c.plan_id IS NOT NULL
    GROUP BY p.id, p.nombre, p.precio
  ) sub;

  INSERT INTO caja_mrr_snapshots (mes, mrr, total_clientes, detalle)
  VALUES (v_mes, v_mrr, v_total_clientes, v_detalle)
  ON CONFLICT (mes) DO UPDATE SET
    mrr = EXCLUDED.mrr,
    total_clientes = EXCLUDED.total_clientes,
    detalle = EXCLUDED.detalle;
END;
$$;

-- ============================================
-- 20. ESQUEMA snapshots — backups diarios + auditoría de borrados
-- (infraestructura de respaldo, independiente del audit_log manual)
-- ============================================
CREATE SCHEMA IF NOT EXISTS snapshots;

CREATE TABLE snapshots.table_snapshots (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  snapshot_date DATE DEFAULT CURRENT_DATE,
  table_name TEXT NOT NULL,
  row_data JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE snapshots.deleted_rows (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  table_name TEXT NOT NULL,
  row_data JSONB NOT NULL,
  deleted_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS habilitado, sin policies: anon/authenticated quedan denegados por
-- defecto; postgres/service_role acceden igual porque tienen BYPASSRLS,
-- así que el cron de snapshots y el trigger de borrado no se ven afectados.
ALTER TABLE snapshots.table_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE snapshots.deleted_rows ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION snapshots.capture_delete()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
begin
  insert into snapshots.deleted_rows (table_name, row_data)
  values (tg_table_name, to_jsonb(old));
  return old;
end
$$;

CREATE OR REPLACE FUNCTION snapshots.take_snapshot()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
declare
  t text;
begin
  foreach t in array array[
    'usuarios','planes','estados_contacto','etiquetas_negocio',
    'contactos','etiquetas_plantillas','plantillas','clientes',
    'seguimiento_contactos','audit_log','caja_gastos','caja_mrr_snapshots',
    'tickets','chat_sessions','chat_messages','mp_cuentas',
    'kb_categorias','kb_articulos'
  ] loop
    execute format(
      'insert into snapshots.table_snapshots (table_name, row_data)
       select %L, to_jsonb(t) from public.%I t', t, t);
  end loop;

  -- retención: 30 días general, 1 año para tablas financieras/legales
  delete from snapshots.table_snapshots
  where snapshot_date < current_date - 30
    and table_name not in
      ('clientes','caja_gastos','caja_mrr_snapshots','tickets');
  delete from snapshots.table_snapshots
  where snapshot_date < current_date - 365;
end
$$;

-- Triggers BEFORE DELETE que capturan la fila borrada (soft o hard delete)
CREATE TRIGGER audit_delete BEFORE DELETE ON contactos FOR EACH ROW EXECUTE FUNCTION snapshots.capture_delete();
CREATE TRIGGER audit_delete BEFORE DELETE ON clientes FOR EACH ROW EXECUTE FUNCTION snapshots.capture_delete();
CREATE TRIGGER audit_delete BEFORE DELETE ON seguimiento_contactos FOR EACH ROW EXECUTE FUNCTION snapshots.capture_delete();
CREATE TRIGGER audit_delete BEFORE DELETE ON caja_gastos FOR EACH ROW EXECUTE FUNCTION snapshots.capture_delete();
CREATE TRIGGER audit_delete BEFORE DELETE ON caja_mrr_snapshots FOR EACH ROW EXECUTE FUNCTION snapshots.capture_delete();
CREATE TRIGGER audit_delete BEFORE DELETE ON tickets FOR EACH ROW EXECUTE FUNCTION snapshots.capture_delete();
CREATE TRIGGER audit_delete BEFORE DELETE ON chat_sessions FOR EACH ROW EXECUTE FUNCTION snapshots.capture_delete();
CREATE TRIGGER audit_delete BEFORE DELETE ON chat_messages FOR EACH ROW EXECUTE FUNCTION snapshots.capture_delete();
CREATE TRIGGER audit_delete BEFORE DELETE ON mp_cuentas FOR EACH ROW EXECUTE FUNCTION snapshots.capture_delete();
CREATE TRIGGER audit_delete BEFORE DELETE ON kb_categorias FOR EACH ROW EXECUTE FUNCTION snapshots.capture_delete();
CREATE TRIGGER audit_delete BEFORE DELETE ON kb_articulos FOR EACH ROW EXECUTE FUNCTION snapshots.capture_delete();

-- ============================================
-- 21. CRON JOBS (pg_cron)
-- ============================================
-- CREATE EXTENSION IF NOT EXISTS pg_cron;

SELECT cron.schedule('mrr-snapshot-diario', '0 23 * * *', $$SELECT tomar_snapshot_mrr()$$);
SELECT cron.schedule('daily-table-snapshots', '0 9 * * *', $$select snapshots.take_snapshot()$$);
SELECT cron.schedule('purge-archived-tickets', '0 10 * * *', $$
  delete from public.tickets
  where status = 'archived'
    and created_at < now() - interval '1 month';
$$);

-- ============================================
-- 22. ROW LEVEL SECURITY (RLS)
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
ALTER TABLE mp_cuentas ENABLE ROW LEVEL SECURITY;
ALTER TABLE caja_gastos ENABLE ROW LEVEL SECURITY;
ALTER TABLE caja_mrr_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE kb_categorias ENABLE ROW LEVEL SECURITY;
ALTER TABLE kb_articulos ENABLE ROW LEVEL SECURITY;

-- El backend (API routes de Next.js) usa la service_role key, que bypasea RLS.
-- Las policies de abajo solo gobiernan acceso desde el cliente (anon key),
-- usado para Supabase Realtime en el dashboard y el widget de chat.

-- Lectura pública para Realtime (dashboard interno)
CREATE POLICY "Lectura pública para Realtime" ON contactos FOR SELECT USING (true);
CREATE POLICY "Lectura pública para Realtime" ON clientes FOR SELECT USING (true);
CREATE POLICY "Lectura pública para Realtime" ON seguimiento_contactos FOR SELECT USING (true);
CREATE POLICY "Lectura pública para Realtime" ON tickets FOR SELECT USING (true);

-- Chat de soporte: el widget cliente (anon key) lee, el backend (service_role) escribe
CREATE POLICY anon_read_sessions ON chat_sessions FOR SELECT USING (true);
CREATE POLICY service_role_all_sessions ON chat_sessions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY anon_read_messages ON chat_messages FOR SELECT USING (true);
CREATE POLICY service_role_all_messages ON chat_messages FOR ALL USING (true) WITH CHECK (true);

-- Tablas sensibles (caja, credenciales MP): sin acceso desde anon/authenticated,
-- solo accesibles vía service_role (que bypasea estas policies)
CREATE POLICY admin_only ON caja_gastos FOR ALL USING (false);
CREATE POLICY admin_only ON caja_mrr_snapshots FOR ALL USING (false);
CREATE POLICY admin_only ON mp_cuentas FOR ALL USING (false);

-- ============================================
-- 23. USUARIO ADMIN INICIAL (cambiar password después)
-- ============================================
-- NOTA: Ejecutar esto DESPUÉS de deployar, reemplazando el hash
-- con uno generado por la app al hacer signup del primer usuario.
