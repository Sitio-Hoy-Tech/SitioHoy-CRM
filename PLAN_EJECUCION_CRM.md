# 📋 PLAN DE EJECUCIÓN CRM SITIOHOY
**Versión**: MVP 1.0  
**Creado**: 2026-04-11  
**Stack**: Next.js 16, Supabase, Vercel, Tailwind, Cloudflare, ISR on-demand  
**Usuarios**: 3 personas (uso interno)  
**Target**: 100 clientes en 1 año  

---

## 📊 RESUMEN EJECUTIVO

Este es un **MVP escalable** para SitioHoy. Prioriza la captura y gestión de **Contactos y Clientes** con auditoría completa, plantillas reutilizables, y seguimiento manual de contactos. El sistema está diseñado para crecer de 3 usuarios a múltiples roles sin cambiar la arquitectura base.

**Tiempo estimado de desarrollo**: 3-4 semanas (una persona trabajando full-time)

---

## 1️⃣ SCHEMA BASE DE DATOS (Supabase PostgreSQL)

### 1.1 Tabla: `usuarios`
```sql
CREATE TABLE usuarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre VARCHAR(100) NOT NULL,
  apellido VARCHAR(100) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  rol VARCHAR(50) NOT NULL DEFAULT 'admin', -- 'admin', 'sales', 'manager'
  estado BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  deleted_at TIMESTAMP NULL
);

CREATE INDEX idx_usuarios_email ON usuarios(email);
```

### 1.2 Tabla: `planes`
```sql
CREATE TABLE planes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre VARCHAR(255) NOT NULL UNIQUE,
  beneficios TEXT NOT NULL, -- JSON array o texto
  precio DECIMAL(10, 2) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  deleted_at TIMESTAMP NULL
);

CREATE INDEX idx_planes_nombre ON planes(nombre);
```

### 1.3 Tabla: `estados_contacto`
```sql
CREATE TABLE estados_contacto (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre VARCHAR(100) NOT NULL UNIQUE, -- 'Posible cliente', 'Cliente'
  created_at TIMESTAMP DEFAULT NOW(),
  deleted_at TIMESTAMP NULL
);
```

### 1.4 Tabla: `etiquetas_negocio`
```sql
CREATE TABLE etiquetas_negocio (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre VARCHAR(100) NOT NULL UNIQUE, -- 'Gimnasio', 'Restaurante', 'Tienda de ropa'
  created_at TIMESTAMP DEFAULT NOW(),
  deleted_at TIMESTAMP NULL
);
```

### 1.5 Tabla: `contactos`
```sql
CREATE TABLE contactos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre VARCHAR(100) NOT NULL,
  apellido VARCHAR(100) NOT NULL,
  email VARCHAR(255),
  telefono VARCHAR(20),
  estado_id UUID NOT NULL REFERENCES estados_contacto(id),
  etiqueta_negocio_id UUID NOT NULL REFERENCES etiquetas_negocio(id),
  origen VARCHAR(100) NOT NULL, -- 'Landing', 'Referencia', 'Email', 'Social'
  fecha_contacto TIMESTAMP NOT NULL DEFAULT NOW(),
  notas TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  deleted_at TIMESTAMP NULL,
  created_by UUID REFERENCES usuarios(id)
);

CREATE INDEX idx_contactos_estado ON contactos(estado_id);
CREATE INDEX idx_contactos_etiqueta ON contactos(etiqueta_negocio_id);
CREATE INDEX idx_contactos_email ON contactos(email);
CREATE INDEX idx_contactos_fecha ON contactos(fecha_contacto);
```

### 1.6 Tabla: `etiquetas_plantillas`
```sql
CREATE TABLE etiquetas_plantillas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre VARCHAR(100) NOT NULL UNIQUE,
  created_at TIMESTAMP DEFAULT NOW(),
  deleted_at TIMESTAMP NULL
);
```

### 1.7 Tabla: `plantillas`
```sql
CREATE TABLE plantillas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre VARCHAR(255) NOT NULL,
  html TEXT NOT NULL, -- HTML template
  etiqueta_plantilla_id UUID REFERENCES etiquetas_plantillas(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  deleted_at TIMESTAMP NULL,
  created_by UUID REFERENCES usuarios(id)
);

CREATE INDEX idx_plantillas_nombre ON plantillas(nombre);
```

### 1.8 Tabla: `clientes`
```sql
CREATE TABLE clientes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre_empresa VARCHAR(255) NOT NULL,
  contacto_id UUID NOT NULL REFERENCES contactos(id),
  dominio VARCHAR(255) NOT NULL UNIQUE,
  plan_id UUID NOT NULL REFERENCES planes(id),
  plantilla_id UUID NOT NULL REFERENCES plantillas(id),
  tenant_id VARCHAR(255) NOT NULL UNIQUE, -- Identificador único para futura multi-tenancy
  etiqueta_negocio_id UUID NOT NULL REFERENCES etiquetas_negocio(id),
  fecha_pago TIMESTAMP NOT NULL,
  fecha_vencimiento TIMESTAMP GENERATED ALWAYS AS (fecha_pago + INTERVAL '30 days') STORED,
  estado BOOLEAN DEFAULT true, -- activo/inactivo
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  deleted_at TIMESTAMP NULL,
  created_by UUID REFERENCES usuarios(id)
);

CREATE INDEX idx_clientes_nombre ON clientes(nombre_empresa);
CREATE INDEX idx_clientes_dominio ON clientes(dominio);
CREATE INDEX idx_clientes_plan ON clientes(plan_id);
CREATE INDEX idx_clientes_tenant ON clientes(tenant_id);
CREATE INDEX idx_clientes_estado ON clientes(estado);
```

### 1.9 Tabla: `seguimiento_contactos`
```sql
CREATE TABLE seguimiento_contactos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contacto_id UUID NOT NULL REFERENCES contactos(id) ON DELETE CASCADE,
  fecha_seguimiento TIMESTAMP NOT NULL DEFAULT NOW(),
  notas TEXT NOT NULL,
  created_by UUID NOT NULL REFERENCES usuarios(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  deleted_at TIMESTAMP NULL
);

CREATE INDEX idx_seguimiento_contacto ON seguimiento_contactos(contacto_id);
CREATE INDEX idx_seguimiento_fecha ON seguimiento_contactos(fecha_seguimiento);
```

### 1.10 Tabla: `audit_log`
```sql
CREATE TABLE audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id UUID NOT NULL REFERENCES usuarios(id),
  tabla_afectada VARCHAR(100) NOT NULL,
  registro_id UUID NOT NULL,
  accion VARCHAR(50) NOT NULL, -- 'CREATE', 'UPDATE', 'DELETE'
  cambios_anteriores JSONB,
  cambios_nuevos JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_audit_usuario ON audit_log(usuario_id);
CREATE INDEX idx_audit_tabla ON audit_log(tabla_afectada);
CREATE INDEX idx_audit_fecha ON audit_log(created_at);
```

### 1.11 RLS (Row Level Security) Policies
```sql
-- Para MVP con 3 usuarios, usar RLS simple
-- Todos los usuarios tienen acceso a todos los datos (admin)
ALTER TABLE usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE contactos ENABLE ROW LEVEL SECURITY;
ALTER TABLE clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE plantillas ENABLE ROW LEVEL SECURITY;
ALTER TABLE seguimiento_contactos ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- Ejemplo: Solo admins pueden ver audit_log
CREATE POLICY "admins_can_view_audit" ON audit_log
  FOR SELECT USING (
    auth.jwt() ->> 'role' = 'admin'
  );

-- Todos pueden ver datos (MVP simplificado)
CREATE POLICY "all_users_can_read" ON contactos
  FOR SELECT USING (true);

CREATE POLICY "all_users_can_read" ON clientes
  FOR SELECT USING (true);
```

---

## 2️⃣ ESTRUCTURA DEL PROYECTO

```
crm-sitiohoy/
├── .env.local                    # Variables de entorno
├── .env.example                  # Template
├── next.config.js
├── tailwind.config.js
├── tsconfig.json
│
├── src/
│   ├── app/
│   │   ├── layout.tsx           # Layout principal
│   │   ├── page.tsx             # Dashboard
│   │   ├── login/
│   │   │   └── page.tsx
│   │   │
│   │   ├── (dashboard)/         # Rutas protegidas
│   │   │   ├── contactos/
│   │   │   │   ├── page.tsx         # Listado + búsqueda
│   │   │   │   ├── nuevo/page.tsx   # Crear
│   │   │   │   ├── [id]/page.tsx    # Ver + editar
│   │   │   │   └── [id]/seguimiento/page.tsx
│   │   │   │
│   │   │   ├── clientes/
│   │   │   │   ├── page.tsx
│   │   │   │   ├── nuevo/page.tsx
│   │   │   │   └── [id]/page.tsx
│   │   │   │
│   │   │   ├── plantillas/
│   │   │   │   ├── page.tsx
│   │   │   │   ├── nuevo/page.tsx
│   │   │   │   └── [id]/page.tsx
│   │   │   │
│   │   │   ├── catalogos/
│   │   │   │   ├── planes/
│   │   │   │   ├── estados-contacto/
│   │   │   │   └── etiquetas-negocio/
│   │   │   │
│   │   │   ├── usuarios/page.tsx
│   │   │   ├── auditoria/page.tsx
│   │   │   │
│   │   │   ├── umami/page.tsx   # Dashboard Umami
│   │   │   └── calendly/page.tsx # Dashboard Calendly
│   │   │
│   │   └── api/
│   │       ├── auth/
│   │       │   ├── login/route.ts
│   │       │   ├── logout/route.ts
│   │       │   └── signup/route.ts
│   │       │
│   │       ├── contactos/
│   │       │   ├── route.ts          # GET (list), POST (create)
│   │       │   ├── [id]/route.ts     # GET, PUT, DELETE
│   │       │   └── [id]/seguimiento/route.ts
│   │       │
│   │       ├── clientes/
│   │       │   ├── route.ts
│   │       │   └── [id]/route.ts
│   │       │
│   │       ├── plantillas/
│   │       │   ├── route.ts
│   │       │   └── [id]/route.ts
│   │       │
│   │       └── catalogos/
│   │           ├── planes/route.ts
│   │           ├── estados-contacto/route.ts
│   │           └── etiquetas-negocio/route.ts
│   │
│   ├── lib/
│   │   ├── supabase.ts          # Cliente Supabase
│   │   ├── auth.ts              # Funciones auth
│   │   ├── api.ts               # Funciones API compartidas
│   │   ├── audit.ts             # Funciones de auditoría
│   │   ├── validations.ts       # Schemas Zod
│   │   └── utils.ts
│   │
│   ├── components/
│   │   ├── layout/
│   │   │   ├── Navbar.tsx
│   │   │   ├── Sidebar.tsx
│   │   │   └── Layout.tsx
│   │   │
│   │   ├── forms/
│   │   │   ├── ContactoForm.tsx
│   │   │   ├── ClienteForm.tsx
│   │   │   └── PlantillaForm.tsx
│   │   │
│   │   ├── tables/
│   │   │   ├── ContactosTable.tsx
│   │   │   └── ClientesTable.tsx
│   │   │
│   │   ├── modals/
│   │   │   └── ConfirmDelete.tsx
│   │   │
│   │   └── common/
│   │       ├── Button.tsx
│   │       ├── Input.tsx
│   │       ├── Select.tsx
│   │       ├── Card.tsx
│   │       └── Loading.tsx
│   │
│   └── types/
│       └── index.ts

├── public/
│   └── favicon.ico

└── package.json
```

---

## 3️⃣ FASES DE DESARROLLO

### FASE 1: SETUP + AUTH (Semana 1)
**Objetivo**: Tener ambiente listo y sistema de login funcional

- [ ] Inicializar proyecto Next.js 16
- [ ] Configurar Supabase (proyecto, variables env)
- [ ] Crear todas las tablas SQL
- [ ] Implementar RLS policies
- [ ] Setup Tailwind + estructura componentes base
- [ ] Implementar autenticación (NextAuth con Supabase)
- [ ] Página login
- [ ] Página dashboard básica
- [ ] Middleware de protección de rutas

**Archivos a entregar**: `.env.local`, tablas creadas, login funcional

---

### FASE 2: CRUD CONTACTOS (Semana 1-2)
**Objetivo**: Captura y gestión completa de contactos

- [ ] API `/api/contactos` - GET (listado con filtros), POST (crear)
- [ ] API `/api/contactos/[id]` - GET, PUT, DELETE
- [ ] API `/api/contactos/[id]/seguimiento` - GET, POST
- [ ] Función de auditoría en cada operación
- [ ] Página listado contactos (con tabla, filtros por estado/etiqueta/fecha)
- [ ] Página crear contacto (form)
- [ ] Página detalle contacto (ver + editar)
- [ ] Página seguimiento contactos (historial + agregar nota)
- [ ] Búsqueda en tiempo real
- [ ] Validaciones con Zod

**Filtros requeridos en listado**:
- Por nombre
- Por estado (Posible cliente / Cliente)
- Por etiqueta de negocio
- Por origen
- Por fecha de contacto (rango)
- Por usuario que lo creó

---

### FASE 3: CRUD CLIENTES (Semana 2-3)
**Objetivo**: Gestión de clientes con relaciones

- [ ] API `/api/clientes` - GET, POST
- [ ] API `/api/clientes/[id]` - GET, PUT, DELETE
- [ ] Función auditoría
- [ ] Página listado clientes (tabla, filtros)
- [ ] Página crear cliente (form con selección de contacto)
- [ ] Página detalle cliente (ver + editar, mostrar vencimiento)
- [ ] Validar dominio único
- [ ] Validar tenant_id único
- [ ] Cálculo automático de fecha_vencimiento (fecha_pago + 30 días)

**Filtros requeridos**:
- Por nombre empresa
- Por dominio
- Por plan
- Por estado (activo/inactivo)
- Por contacto
- Por fecha de pago (próximos a vencer)

---

### FASE 4: PLANTILLAS + CATALOGOS (Semana 3)
**Objetivo**: Sistema de plantillas y datos maestros

- [ ] API `/api/catalogos/planes` - CRUD
- [ ] API `/api/catalogos/estados-contacto` - CRUD
- [ ] API `/api/catalogos/etiquetas-negocio` - CRUD
- [ ] API `/api/plantillas` - CRUD
- [ ] Páginas CRUD para cada catálogo
- [ ] Editor HTML básico para plantillas (textarea o Monaco)
- [ ] Auditoría en todos

---

### FASE 5: VISTAS UMAMI + CALENDLY (Semana 3-4)
**Objetivo**: Integración de analytics embebidas

- [ ] Página `/dashboard/umami` - Embed iframe de Umami
- [ ] Página `/dashboard/calendly` - Embed iframe de Calendly
- [ ] Componentes para mostrar estadísticas

---

### FASE 6: USUARIOS + AUDITORIA (Semana 4)
**Objetivo**: Gestión de usuarios y log de cambios

- [ ] API `/api/usuarios` - CRUD
- [ ] Página lista de usuarios
- [ ] Página para agregar usuario (admin only)
- [ ] Página auditoria (tabla de cambios con filtros)
- [ ] Perfil de usuario (cambiar contraseña)

---

### FASE 7: TESTING + DEPLOYMENT (Semana 4)
**Objetivo**: Verificación y go-live

- [ ] Testing manual de todas funcionalidades
- [ ] Validar ISR on-demand en listados
- [ ] Configurar variables en Vercel
- [ ] Desplegamiento a producción
- [ ] Verificar dominio + Cloudflare

---

## 4️⃣ ENDPOINTS API DETALLADOS

### AUTH

**POST** `/api/auth/signup`
```json
{
  "nombre": "Juan",
  "apellido": "Pérez",
  "email": "juan@sitiohoy.com",
  "password": "securepass123"
}
// Response: { userId, token }
```

**POST** `/api/auth/login`
```json
{
  "email": "juan@sitiohoy.com",
  "password": "securepass123"
}
// Response: { userId, token, rol }
```

---

### CONTACTOS

**GET** `/api/contactos?estado=...&etiqueta=...&origen=...&fecha_desde=...&fecha_hasta=...&search=...`
```json
// Response: Array de contactos con paginación
[
  {
    "id": "uuid",
    "nombre": "Carlos",
    "apellido": "García",
    "email": "carlos@example.com",
    "telefono": "+54911234567",
    "estado": "Cliente",
    "etiqueta_negocio": "Gimnasio",
    "origen": "Landing",
    "fecha_contacto": "2026-04-11T10:00:00Z",
    "notas": "Interesado en plan premium",
    "created_by": "Juan Pérez",
    "created_at": "2026-04-11T10:00:00Z"
  }
]
```

**POST** `/api/contactos`
```json
{
  "nombre": "Carlos",
  "apellido": "García",
  "email": "carlos@example.com",
  "telefono": "+54911234567",
  "estado_id": "uuid",
  "etiqueta_negocio_id": "uuid",
  "origen": "Landing",
  "fecha_contacto": "2026-04-11T10:00:00Z",
  "notas": ""
}
// Response: { id, ... creado_exitosamente }
```

**GET** `/api/contactos/[id]`
```json
// Response: Contacto completo + historial de seguimiento
{
  "id": "uuid",
  "nombre": "Carlos",
  "apellido": "García",
  "email": "carlos@example.com",
  "telefono": "+54911234567",
  "estado": { "id": "uuid", "nombre": "Cliente" },
  "etiqueta_negocio": { "id": "uuid", "nombre": "Gimnasio" },
  "origen": "Landing",
  "fecha_contacto": "2026-04-11T10:00:00Z",
  "notas": "Interesado en plan premium",
  "seguimientos": [
    {
      "id": "uuid",
      "fecha": "2026-04-11T15:00:00Z",
      "notas": "Primera llamada, muy interesado",
      "created_by": "Juan Pérez",
      "created_at": "2026-04-11T15:00:00Z"
    }
  ],
  "created_by": "Juan Pérez",
  "created_at": "2026-04-11T10:00:00Z",
  "updated_at": "2026-04-11T10:00:00Z"
}
```

**PUT** `/api/contactos/[id]`
```json
{
  "nombre": "Carlos",
  "apellido": "García",
  "email": "nuevo@example.com",
  "telefono": "+54911234567",
  "estado_id": "uuid",
  "etiqueta_negocio_id": "uuid",
  "origen": "Landing",
  "notas": "Actualizado"
}
// Response: { actualizado_exitosamente, cambios }
```

**DELETE** `/api/contactos/[id]`
```json
// Response: { eliminado_exitosamente }
```

**GET** `/api/contactos/[id]/seguimiento`
```json
// Response: Array de seguimientos
[
  {
    "id": "uuid",
    "fecha": "2026-04-11T15:00:00Z",
    "notas": "Primera llamada",
    "created_by": "Juan Pérez",
    "created_at": "2026-04-11T15:00:00Z"
  }
]
```

**POST** `/api/contactos/[id]/seguimiento`
```json
{
  "notas": "Segunda llamada, cerrado deal",
  "fecha_seguimiento": "2026-04-11T16:00:00Z"
}
// Response: { id, creado_exitosamente }
```

---

### CLIENTES

**GET** `/api/clientes?plan=...&estado=...&search=...&vencimiento_dias=30`
```json
// Response: Array de clientes
[
  {
    "id": "uuid",
    "nombre_empresa": "Gym Force",
    "contacto": { "id": "uuid", "nombre": "Carlos García" },
    "dominio": "gymforce.com",
    "plan": { "id": "uuid", "nombre": "Premium", "precio": 299 },
    "plantilla": { "id": "uuid", "nombre": "Plantilla Fitness" },
    "tenant_id": "tenant_gymforce",
    "etiqueta_negocio": "Gimnasio",
    "fecha_pago": "2026-04-11T00:00:00Z",
    "fecha_vencimiento": "2026-05-11T00:00:00Z",
    "estado": true,
    "created_by": "Juan Pérez",
    "created_at": "2026-04-11T10:00:00Z",
    "dias_para_vencer": 30
  }
]
```

**POST** `/api/clientes`
```json
{
  "nombre_empresa": "Gym Force",
  "contacto_id": "uuid",
  "dominio": "gymforce.com",
  "plan_id": "uuid",
  "plantilla_id": "uuid",
  "etiqueta_negocio_id": "uuid",
  "fecha_pago": "2026-04-11T00:00:00Z"
}
// Response: { id, tenant_id, ... creado_exitosamente }
```

**GET** `/api/clientes/[id]`
```json
// Response: Cliente completo con todas las relaciones
```

**PUT** `/api/clientes/[id]`
```json
{
  "nombre_empresa": "Gym Force Updated",
  "plan_id": "uuid",
  "plantilla_id": "uuid",
  "estado": true,
  "fecha_pago": "2026-05-11T00:00:00Z"
}
// Response: { actualizado_exitosamente }
```

**DELETE** `/api/clientes/[id]`
```json
// Response: { eliminado_exitosamente }
```

---

### PLANTILLAS

**GET** `/api/plantillas`
```json
// Response: Array de plantillas
[
  {
    "id": "uuid",
    "nombre": "Plantilla Fitness",
    "html": "<html>...</html>",
    "etiqueta_plantilla": { "id": "uuid", "nombre": "Responsive" },
    "created_by": "Juan Pérez",
    "created_at": "2026-04-11T10:00:00Z"
  }
]
```

**POST** `/api/plantillas`
```json
{
  "nombre": "Plantilla Fitness",
  "html": "<html>...</html>",
  "etiqueta_plantilla_id": "uuid"
}
// Response: { id, ... creado_exitosamente }
```

**GET** `/api/plantillas/[id]`
**PUT** `/api/plantillas/[id]`
**DELETE** `/api/plantillas/[id]`

---

### CATALOGOS (Planes, Estados, Etiquetas)

**GET** `/api/catalogos/planes`
```json
// Response: Array de planes
[
  {
    "id": "uuid",
    "nombre": "Premium",
    "beneficios": "50 páginas, 10GB almacenamiento, soporte 24/7",
    "precio": 299.99
  }
]
```

**POST** `/api/catalogos/planes`
```json
{
  "nombre": "Premium",
  "beneficios": "50 páginas, 10GB almacenamiento, soporte 24/7",
  "precio": 299.99
}
```

**PUT** `/api/catalogos/planes/[id]`
**DELETE** `/api/catalogos/planes/[id]`

Similar para `/api/catalogos/estados-contacto` y `/api/catalogos/etiquetas-negocio`

---

### USUARIOS

**GET** `/api/usuarios` (admin only)
```json
// Response: Array de usuarios
[
  {
    "id": "uuid",
    "nombre": "Juan",
    "apellido": "Pérez",
    "email": "juan@sitiohoy.com",
    "rol": "admin",
    "estado": true,
    "created_at": "2026-04-11T10:00:00Z"
  }
]
```

**POST** `/api/usuarios` (admin only)
```json
{
  "nombre": "María",
  "apellido": "López",
  "email": "maria@sitiohoy.com",
  "password": "initial123",
  "rol": "admin"
}
// Response: { id, creado_exitosamente }
```

**PUT** `/api/usuarios/[id]` (own profile or admin)
```json
{
  "nombre": "Juan",
  "apellido": "Pérez",
  "rol": "admin",
  "estado": true
}
```

**DELETE** `/api/usuarios/[id]` (admin only - soft delete)

---

### AUDITORIA

**GET** `/api/auditoria?tabla=...&usuario=...&accion=...&fecha_desde=...&fecha_hasta=...`
```json
// Response: Array de cambios auditados
[
  {
    "id": "uuid",
    "usuario": "Juan Pérez",
    "tabla_afectada": "contactos",
    "registro_id": "uuid",
    "accion": "UPDATE",
    "cambios_anteriores": { "email": "old@example.com" },
    "cambios_nuevos": { "email": "nuevo@example.com" },
    "ip_address": "192.168.1.1",
    "created_at": "2026-04-11T10:00:00Z"
  }
]
```

---

## 5️⃣ COMPONENTES FRONTEND

### Componentes Base (Tailwind)
- `Button.tsx` - Botones estándar
- `Input.tsx` - Inputs de texto
- `Select.tsx` - Selects (relaciones)
- `Card.tsx` - Contenedores
- `Table.tsx` - Tablas con sorting
- `Modal.tsx` - Diálogos
- `Toast.tsx` - Notificaciones
- `Pagination.tsx` - Paginación
- `SearchInput.tsx` - Búsqueda en tiempo real

### Formularios
- `ContactoForm.tsx` - Crear/editar contacto
- `ClienteForm.tsx` - Crear/editar cliente
- `PlantillaForm.tsx` - Crear/editar plantilla
- `LoginForm.tsx` - Login

### Tablas
- `ContactosTable.tsx` - Listado contactos con filtros
- `ClientesTable.tsx` - Listado clientes con filtros
- `UsuariosTable.tsx` - Listado usuarios
- `AuditoriaTable.tsx` - Historial cambios

### Modales
- `ConfirmDelete.tsx` - Confirmación eliminación
- `SeguimientoModal.tsx` - Agregar seguimiento

---

## 6️⃣ VARIABLES DE ENTORNO (.env.local)

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=xxxxx
SUPABASE_SERVICE_ROLE_KEY=xxxxx

# NextAuth (si se usa)
NEXTAUTH_SECRET=xxxxx
NEXTAUTH_URL=http://localhost:3000 (dev) / https://crm.sitiohoy.com (prod)

# Umami
NEXT_PUBLIC_UMAMI_WEBSITE_ID=xxxxx
NEXT_PUBLIC_UMAMI_SCRIPT_URL=https://analytics.umami.is/script.js

# Calendly
NEXT_PUBLIC_CALENDLY_USERNAME=sitiohoy

# Cloudflare (optional)
CLOUDFLARE_ACCOUNT_ID=xxxxx
CLOUDFLARE_API_TOKEN=xxxxx

# Base URLs
NEXT_PUBLIC_API_URL=http://localhost:3000 (dev)
```

---

## 7️⃣ CHECKLIST DE DEPLOYMENT

- [ ] Variables de entorno configuradas en Vercel
- [ ] Supabase conectada y tablas creadas
- [ ] RLS policies activas
- [ ] Email de bienvenida configurado (Supabase)
- [ ] Backup diario de BD configurado (Supabase)
- [ ] Domain vinculado (sitiohoy.com o crm.sitiohoy.com)
- [ ] Cloudflare configurado (DNS, SSL)
- [ ] Umami tracking script integrado
- [ ] Calendly embed funcionando
- [ ] Testing en producción:
  - [ ] Login funciona
  - [ ] CRUD Contactos completo
  - [ ] CRUD Clientes completo
  - [ ] Filtros funcionan
  - [ ] Auditoría registra cambios
  - [ ] ISR on-demand actualiza datos

---

## 8️⃣ CONSIDERACIONES DE ESCALABILIDAD

### Para crecer a 100 clientes + múltiples usuarios:

1. **Índices**: Ya están definidos en schema para búsquedas comunes
2. **Caché**: Considerar Redis para listados que no cambian frecuentemente
3. **Paginación**: Implementar desde el inicio (limit 50 registros por página)
4. **Soft Deletes**: Todos los datos tienen `deleted_at` para recuperación
5. **Tenant ID**: Preparado para multi-tenancy (cada cliente puede tener su propio CRM)
6. **Rate Limiting**: Implementar en API routes para evitar abuse
7. **Roles**: Schema ya soporta 'admin', 'sales', 'manager'
8. **ISR on-demand**: Usar en listados para revalidación eficiente
9. **Auditoría**: Permite rastrear todo cambio (compliance)
10. **Backups**: Supabase automático, considerar backups externos

---

## 9️⃣ TECNOLOGÍAS Y VERSIONES

| Tech | Versión | Propósito |
|------|---------|----------|
| Next.js | 16 | Framework |
| React | 19 | UI |
| TypeScript | Latest | Type safety |
| Tailwind CSS | 3.4+ | Styling |
| Supabase | Latest | Base de datos |
| NextAuth | 5 | Autenticación |
| Zod | Latest | Validaciones |
| React Query | 5 | Data fetching |
| Vercel | Cloud | Deployment |
| Cloudflare | CDN | Performance |

---

## 🔟 NOTAS IMPORTANTES

1. **Prioridad MVP**: Contactos → Clientes → Plantillas → Usuarios
2. **No incluir por ahora**: Sistema de cupones, Integraciones complejas
3. **Testing**: Hacer testing manual de UI, no necesita tests automatizados para MVP
4. **Performance**: ISR on-demand es suficiente para 100 clientes
5. **Seguridad**: RLS policies implementadas, auditoría de todos los cambios
6. **Escalabilidad**: Schema diseñado para crecer sin cambios mayores
7. **Datos sensibles**: Passwords hasheados con bcrypt, no almacenar en logs
8. **Backups**: Supabase cuida backups automáticos cada 24h
9. **Documentación**: Mantener este documento actualizado
10. **Handoff**: Este documento debe ser suficiente para otro desarrollador

---

## PRÓXIMOS PASOS

1. **Crear proyecto Next.js**: `npx create-next-app@latest crm-sitiohoy --typescript`
2. **Configurar Supabase**: Crear proyecto, obtener credenciales
3. **Ejecutar SQL schema**: En Supabase SQL editor
4. **Clonar este repo**: Usar como base para desarrollo
5. **Arrancar desarrollo**: `npm run dev` en puerto 3000

---

**Documento preparado para**: Otro desarrollador independiente  
**Última actualización**: 2026-04-11  
**Estado**: Listo para desarrollo
