# SitioHoy CRM

CRM interno de SitioHoy para gestión de contactos, clientes y seguimiento comercial. Construido con Next.js, Supabase y Tailwind CSS con diseño glassmorphism en tema oscuro.

---

## Tabla de contenidos

- [Descripción general](#descripción-general)
- [Tech stack](#tech-stack)
- [Arquitectura del proyecto](#arquitectura-del-proyecto)
- [Estructura de carpetas](#estructura-de-carpetas)
- [Base de datos](#base-de-datos)
- [Autenticación](#autenticación)
- [API REST](#api-rest)
- [Variables de entorno](#variables-de-entorno)
- [Instalación y desarrollo](#instalación-y-desarrollo)
- [Deploy en producción](#deploy-en-producción)
- [Funcionalidades principales](#funcionalidades-principales)
- [Roles de usuario](#roles-de-usuario)
- [Integraciones](#integraciones)

---

## Descripción general

SitioHoy CRM es una aplicación web full-stack diseñada para uso interno del equipo comercial de SitioHoy. Permite gestionar el ciclo de vida completo de un lead: desde el primer contacto hasta la conversión en cliente activo con plan y dominio asignado.

**Capacidad de escala:** MVP para ~3 usuarios internos, arquitectura diseñada para escalar a 100+ clientes sin cambios estructurales.

**Características clave:**
- Gestión completa de contactos y clientes con CRUD y filtros avanzados
- Seguimiento manual de interacciones con notas y timestamps
- Plantillas HTML de email reutilizables
- Catálogos configurables (planes, estados, etiquetas)
- Dashboard con métricas en tiempo real via Supabase Realtime
- Auditoría completa de cambios con diffs JSONB
- Integración multi-tenant con la plataforma SitioHoy
- Soft delete en todas las entidades
- Sistema de tickets en tiempo real con notificaciones push
- Sección de Caja con MRR automático, gastos manuales e historial mensual
- Envío de email personalizado para recuperación de contraseña via Resend

---

## Tech stack

| Categoría | Tecnología | Versión |
|-----------|-----------|---------|
| Framework | Next.js (App Router) | 16.2.3 |
| UI | React | 19.2.4 |
| Base de datos | Supabase (PostgreSQL) | 2.103.0 |
| Autenticación | NextAuth.js | 5.0.0-beta.30 |
| Data fetching | TanStack React Query | 5.99.0 |
| Validación | Zod | 4.3.6 |
| Estilos | Tailwind CSS | 4.x |
| Hashing | bcryptjs | 3.0.3 |
| Lenguaje | TypeScript | 5.x |
| Inputs | react-select, react-datepicker, react-phone-number-input | — |
| Email | Resend | 4.x |

---

## Arquitectura del proyecto

```
Usuario → NextAuth (JWT) → Next.js App Router → Supabase CRM (nepjzwwkzsfegapvttgv)
                                    ↓
                            API Routes (REST)
                                    ↓
                     Supabase Service Role (server-side)
                     Supabase Anon Key (client-side)
                                    ↓
                         Supabase Realtime (WebSocket)

Browser → WebSocket → Supabase SitioHoy Realtime (tickets en tiempo real)
API Routes → Supabase SitioHoy Admin API → Resend (emails de recuperación)
pg_cron (Supabase) → snapshot MRR diario a las 23:00 UTC
```

- **Rendering**: Server Components por defecto, Client Components solo donde hay interactividad
- **Auth**: JWT sessions via NextAuth, middleware protege rutas automáticamente
- **DB access**: Service role key en API routes (server), anon key + RLS en cliente
- **Real-time tickets**: WebSocket directo browser → Supabase SitioHoy (sin pasar por Vercel)
- **Real-time dashboard**: Supabase Realtime subscriptions para contactos, clientes y seguimientos
- **MRR**: Calculado en vivo para el mes actual, snapshots históricos para meses pasados

---

## Estructura de carpetas

```
src/
├── app/
│   ├── (dashboard)/              # Grupo de rutas protegidas con sidebar
│   │   ├── layout.tsx
│   │   ├── page.tsx              # Dashboard principal (métricas)
│   │   ├── contactos/
│   │   │   ├── page.tsx
│   │   │   ├── nuevo/page.tsx
│   │   │   └── [id]/
│   │   │       ├── page.tsx
│   │   │       └── seguimiento/page.tsx
│   │   ├── clientes/
│   │   │   ├── page.tsx          # Lista activa con filtros
│   │   │   ├── nuevo/page.tsx
│   │   │   ├── archivados/page.tsx  # Clientes archivados (restaurar / eliminar)
│   │   │   └── [id]/page.tsx     # Detalle + sección SitioHoy + zona de peligro
│   │   ├── plantillas/
│   │   │   ├── page.tsx
│   │   │   ├── nuevo/page.tsx
│   │   │   └── [id]/page.tsx
│   │   ├── catalogos/
│   │   │   ├── planes/page.tsx
│   │   │   ├── estados-contacto/page.tsx
│   │   │   ├── etiquetas-negocio/page.tsx
│   │   │   └── etiquetas-plantillas/page.tsx
│   │   ├── solicitudes/
│   │   │   ├── page.tsx              # Lista de tickets con filtros y estados
│   │   │   └── [id]/page.tsx         # Detalle completo del ticket
│   │   ├── caja/
│   │   │   └── page.tsx              # MRR, gastos, tendencia mensual
│   │   ├── usuarios/page.tsx
│   │   ├── auditoria/page.tsx
│   │   ├── estadisticas/page.tsx
│   │   └── calendario/page.tsx
│   ├── login/page.tsx
│   ├── api/
│   │   ├── auth/
│   │   │   ├── [...nextauth]/route.ts
│   │   │   └── signup/route.ts
│   │   ├── contactos/
│   │   │   ├── route.ts
│   │   │   └── [id]/
│   │   │       ├── route.ts
│   │   │       └── seguimiento/route.ts
│   │   ├── clientes/
│   │   │   ├── route.ts                        # GET (soporta ?archived=true) / POST
│   │   │   └── [id]/
│   │   │       ├── route.ts                    # GET / PUT / DELETE (soft)
│   │   │       ├── restore/route.ts            # POST — restaurar archivado
│   │   │       └── delete-permanent/route.ts   # POST — borrado total con purga SitioHoy
│   │   ├── plantillas/
│   │   │   ├── route.ts
│   │   │   └── [id]/route.ts
│   │   ├── catalogos/
│   │   │   ├── estados-contacto/route.ts + [id]/route.ts
│   │   │   ├── etiquetas-negocio/route.ts + [id]/route.ts
│   │   │   ├── etiquetas-plantillas/route.ts + [id]/route.ts
│   │   │   └── planes/route.ts + [id]/route.ts
│   │   ├── usuarios/route.ts + [id]/route.ts
│   │   ├── auditoria/route.ts
│   │   ├── solicitudes/
│   │   │   ├── route.ts              # GET tickets con filtros
│   │   │   └── [id]/
│   │   │       ├── route.ts          # GET / PATCH estado
│   │   │       └── reset-password/route.ts  # POST — envía email de recuperación via Resend
│   │   ├── caja/
│   │   │   ├── resumen/route.ts      # GET resumen mensual (MRR + gastos + tendencia)
│   │   │   └── gastos/
│   │   │       ├── route.ts          # GET / POST gastos
│   │   │       └── [id]/route.ts     # PUT / DELETE gastos
│   │   └── sitiohoy/tenants/
│   │       └── [tenant_id]/
│   │           ├── route.ts                    # GET / PATCH — datos del tenant
│   │           └── users/
│   │               ├── route.ts                # GET / POST — usuarios del tenant
│   │               └── [user_id]/route.ts      # PATCH — cambiar email/contraseña
│   ├── globals.css
│   └── layout.tsx
├── components/
│   ├── layout/
│   │   ├── Sidebar.tsx
│   │   ├── Providers.tsx
│   │   └── TicketNotifier.tsx    # WebSocket Realtime + toasts de nuevos tickets
│   ├── common/
│   │   ├── Button.tsx
│   │   ├── Input.tsx
│   │   ├── Textarea.tsx
│   │   ├── Select.tsx
│   │   ├── SearchableSelect.tsx
│   │   ├── DatePicker.tsx
│   │   ├── MonthPicker.tsx       # Selector de mes/año totalmente custom
│   │   ├── PhoneInput.tsx
│   │   ├── CurrencyInput.tsx
│   │   ├── Modal.tsx
│   │   ├── Toast.tsx
│   │   └── FiltersBar.tsx
│   ├── dashboard/
│   │   └── DashboardRealtimeManager.tsx
│   └── CatalogoCRUD.tsx
├── stores/
│   └── ticketStore.ts            # Eventos custom para contador y refresh de tickets
├── lib/
│   ├── auth.ts
│   ├── supabase.ts
│   ├── supabase-sitiohoy.ts      # Cliente service role para DB de SitioHoy
│   ├── supabaseAdmin.ts
│   └── mrr.ts                    # tomarSnapshotMRR() — upsert snapshot mensual
├── types/
│   └── index.ts
└── proxy.ts
```

---

## Base de datos

### Tablas principales

#### `usuarios`
| Columna | Tipo | Descripción |
|---------|------|-------------|
| id | UUID PK | Identificador único |
| nombre | VARCHAR | Nombre |
| apellido | VARCHAR | Apellido |
| email | VARCHAR UNIQUE | Email de acceso |
| password_hash | TEXT | Hash bcrypt |
| rol | ENUM | `admin` / `sales` / `manager` |
| estado | BOOLEAN | Cuenta activa/inactiva |
| deleted_at | TIMESTAMPTZ | Soft delete |

#### `contactos`
| Columna | Tipo | Descripción |
|---------|------|-------------|
| id | UUID PK | — |
| nombre, apellido | VARCHAR | — |
| email | VARCHAR | — |
| telefono | VARCHAR | Formato internacional |
| estado_id | UUID FK | → estados_contacto |
| etiqueta_negocio_id | UUID FK | → etiquetas_negocio |
| origen | VARCHAR | WhatsApp / Instagram / Email / etc. |
| fecha_contacto | DATE | — |
| notas | TEXT | — |
| created_by | UUID FK | → usuarios |
| deleted_at | TIMESTAMPTZ | Soft delete |

#### `clientes`
| Columna | Tipo | Descripción |
|---------|------|-------------|
| id | UUID PK | — |
| nombre_empresa | VARCHAR | — |
| contacto_id | UUID FK | → contactos |
| dominio | VARCHAR UNIQUE | Dominio del cliente |
| plan_id | UUID FK | → planes |
| plantilla_id | UUID FK | → plantillas |
| etiqueta_negocio_id | UUID FK | → etiquetas_negocio |
| tenant_id | VARCHAR UNIQUE | ID multi-tenant plataforma SitioHoy |
| fecha_pago | DATE | Última fecha de pago |
| fecha_vencimiento | DATE | Auto: fecha_pago + 30 días (trigger) |
| estado | ENUM | `active` / `inactive` |
| created_by | UUID FK | → usuarios |
| deleted_at | TIMESTAMPTZ | Soft delete |

#### `seguimiento_contactos`
| Columna | Tipo | Descripción |
|---------|------|-------------|
| id | UUID PK | — |
| contacto_id | UUID FK | CASCADE DELETE |
| fecha_seguimiento | DATE | — |
| notas | TEXT | — |
| created_by | UUID FK | → usuarios |

#### `audit_log`
| Columna | Tipo | Descripción |
|---------|------|-------------|
| id | UUID PK | — |
| usuario_id | UUID FK | Quién hizo el cambio |
| tabla_afectada | VARCHAR | Nombre de la tabla |
| registro_id | UUID | ID del registro modificado |
| accion | VARCHAR | `CREATE` / `UPDATE` / `DELETE` |
| cambios_anteriores | JSONB | Estado previo |
| cambios_nuevos | JSONB | Estado nuevo |
| created_at | TIMESTAMPTZ | — |

#### `caja_gastos`
| Columna | Tipo | Descripción |
|---------|------|-------------|
| id | UUID PK | — |
| descripcion | VARCHAR | Descripción del gasto |
| monto | DECIMAL | Importe |
| categoria | VARCHAR | Ej: "Infraestructura", "Marketing" |
| fecha | DATE | Fecha del gasto |
| created_by | UUID FK | → usuarios |
| deleted_at | TIMESTAMPTZ | Soft delete |

#### `caja_mrr_snapshots`
| Columna | Tipo | Descripción |
|---------|------|-------------|
| id | UUID PK | — |
| mes | DATE UNIQUE | Primer día del mes (ej: 2026-05-01) |
| mrr | DECIMAL | MRR calculado ese mes |
| total_clientes | INTEGER | Cantidad de clientes activos |
| detalle | JSONB | Array de `{ nombre, precio, cantidad }` por plan |
| created_at | TIMESTAMPTZ | — |

#### Tablas de catálogo
- **`planes`**: id, nombre (UNIQUE), beneficios, precio (DECIMAL)
- **`estados_contacto`**: id, nombre (UNIQUE) — ej: "Posible cliente", "Cliente"
- **`etiquetas_negocio`**: id, nombre (UNIQUE) — ej: "Gimnasio", "Restaurante"
- **`etiquetas_plantillas`**: id, nombre (UNIQUE) — categorías de templates
- **`plantillas`**: id, nombre, html (TEXT), etiqueta_plantilla_id, created_by

### Triggers

- `trg_clientes_vencimiento` — dispara `calcular_fecha_vencimiento()` en INSERT/UPDATE de `fecha_pago` en `clientes`, asigna `fecha_vencimiento = fecha_pago + INTERVAL '30 days'`
- `set_updated_at` — actualiza `updated_at` automáticamente en `caja_gastos`

### Cron jobs (pg_cron — Supabase CRM)

| Job | Schedule | Descripción |
|-----|----------|-------------|
| `mrr-snapshot-diario` | `0 23 * * *` | Ejecuta `tomar_snapshot_mrr()` todos los días a las 23:00 UTC para garantizar snapshots históricos de MRR

### Índices

- `contactos`: estado_id, etiqueta_negocio_id, email, fecha_contacto, origen
- `audit_log`: usuario_id, tabla_afectada, created_at

### Row Level Security (RLS)

Habilitado en todas las tablas. Políticas actuales (MVP simplificado):
- Usuarios autenticados leen y escriben en sus tablas correspondientes
- `audit_log`: solo acceso para rol `admin`

El esquema completo está en `supabase.sql` en la raíz del proyecto.

---

## Autenticación

**Provider**: NextAuth.js v5 con Credentials (email + password)  
**Sessions**: JWT (no database sessions)

### Flujo

1. Usuario envía email y password en `/login`
2. `authorize()` en `src/lib/auth.ts` consulta la tabla `usuarios` en Supabase
3. `bcrypt.compare()` verifica el password contra `password_hash`
4. JWT se genera con `{ id, name, email, role }`
5. Middleware en `middleware.ts` protege todas las rutas del dashboard

### Middleware de protección

```
/login   → redirige a /  si ya está autenticado
/*       → redirige a /login si no hay sesión
/_next/* → bypass (archivos estáticos)
```

### Registro de usuarios

Endpoint: `POST /api/auth/signup`  
Solo disponible para usuarios con rol `admin` desde la interfaz de `/usuarios`.

---

## API REST

Todas las rutas retornan JSON. Los errores siguen el formato `{ error: string }`.

### Contactos

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/contactos` | Lista con filtros y paginación |
| POST | `/api/contactos` | Crear contacto |
| GET | `/api/contactos/[id]` | Obtener por ID |
| PUT | `/api/contactos/[id]` | Actualizar |
| DELETE | `/api/contactos/[id]` | Soft delete |
| GET | `/api/contactos/[id]/seguimiento` | Historial de seguimiento |
| POST | `/api/contactos/[id]/seguimiento` | Agregar nota de seguimiento |

**Filtros disponibles en GET /api/contactos:**
- `nombre`, `email` — búsqueda parcial
- `estado_id`, `etiqueta_negocio_id`, `origen` — exacto
- `fecha_desde`, `fecha_hasta` — rango de fechas
- `created_by` — por usuario
- `page`, `limit` — paginación (default: 50/página)

### Clientes

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/clientes` | Lista con filtros (ver parámetros abajo) |
| POST | `/api/clientes` | Crear cliente |
| GET | `/api/clientes/[id]` | Obtener por ID |
| PUT | `/api/clientes/[id]` | Actualizar |
| DELETE | `/api/clientes/[id]` | Soft delete (archiva) |
| POST | `/api/clientes/[id]/restore` | Restaurar cliente archivado |
| POST | `/api/clientes/[id]/delete-permanent` | Borrado permanente + purga SitioHoy |

**Parámetros de GET /api/clientes:**
- `archived=true` — devuelve solo clientes con `deleted_at IS NOT NULL` (archivados)
- `nombre_empresa` — búsqueda parcial case-insensitive
- `plan_id`, `etiqueta_negocio_id` — filtros exactos
- `page`, `limit` — paginación

**POST /api/clientes/[id]/delete-permanent:**  
Elimina permanentemente el registro del CRM y purga todos los datos del tenant en la plataforma SitioHoy en orden seguro de FK: eventos de órdenes → órdenes → imágenes y variantes de productos → productos → subcategorías → categorías → cupones / mensajes / zonas de envío → `user_tenants` → usuarios de Auth → tenant.

### SitioHoy Tenants

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/sitiohoy/tenants/[tenant_id]` | Datos del tenant en plataforma SitioHoy |
| PATCH | `/api/sitiohoy/tenants/[tenant_id]` | Actualizar datos del tenant |
| GET | `/api/sitiohoy/tenants/[tenant_id]/users` | Usuarios vinculados al tenant |
| POST | `/api/sitiohoy/tenants/[tenant_id]/users` | Crear usuario en Auth + vincular al tenant |
| PATCH | `/api/sitiohoy/tenants/[tenant_id]/users/[user_id]` | Cambiar email y/o contraseña de un usuario |

### Plantillas

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/plantillas` | Lista |
| POST | `/api/plantillas` | Crear |
| GET | `/api/plantillas/[id]` | Obtener |
| PUT | `/api/plantillas/[id]` | Actualizar |
| DELETE | `/api/plantillas/[id]` | Soft delete |

### Catálogos

Misma estructura REST para cada catálogo:

| Ruta base | Catálogo |
|-----------|---------|
| `/api/catalogos/planes` | Planes de servicio |
| `/api/catalogos/estados-contacto` | Estados de contacto |
| `/api/catalogos/etiquetas-negocio` | Etiquetas de negocio |
| `/api/catalogos/etiquetas-plantillas` | Etiquetas de plantillas |

Cada uno soporta: `GET /` (lista), `POST /` (crear), `PUT /[id]` (editar), `DELETE /[id]` (eliminar).

### Usuarios

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/usuarios` | Lista de usuarios |
| POST | `/api/usuarios` | Crear usuario (hash password incluido) |
| PUT | `/api/usuarios/[id]` | Editar usuario |
| DELETE | `/api/usuarios/[id]` | Soft delete |

### Auditoría

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/auditoria` | Log de auditoría con filtros |

**Filtros:** `usuario_id`, `tabla_afectada`, `accion`, `fecha_desde`, `fecha_hasta`, `page`

---

## Variables de entorno

Crear un archivo `.env.local` en la raíz del proyecto:

```env
# Supabase - Base de datos del CRM
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_anon_key
SUPABASE_SERVICE_ROLE_KEY=tu_service_role_key

# NextAuth
NEXTAUTH_SECRET=genera_con_openssl_rand_-base64_32
NEXTAUTH_URL=http://localhost:3000
AUTH_SECRET=mismo_valor_que_NEXTAUTH_SECRET

# URL base para llamadas internas a la API
NEXT_PUBLIC_API_URL=http://localhost:3000/

# Supabase de la plataforma SitioHoy (multi-tenant)
SITIOHOY_SUPABASE_URL=https://tu-proyecto-sitiohoy.supabase.co
SITIOHOY_SUPABASE_SERVICE_ROLE_KEY=tu_service_role_key_sitiohoy
NEXT_PUBLIC_SITIOHOY_SUPABASE_URL=https://tu-proyecto-sitiohoy.supabase.co
NEXT_PUBLIC_SITIOHOY_SUPABASE_ANON_KEY=tu_anon_key_sitiohoy  # Usado para Realtime en browser

# URL del panel de clientes SitioHoy (para redirect de recuperación de contraseña)
SITIOHOY_APP_URL=https://admin.sitiohoy.com.ar

# Resend (envío de emails transaccionales)
RESEND_API_KEY=tu_api_key_resend

# Cron secret (protege el endpoint /api/cron/mrr-snapshot si se usa en Vercel Pro)
CRON_SECRET=genera_con_openssl_rand_-hex_32

# Analytics (Umami)
NEXT_PUBLIC_UMAMI_WEBSITE_ID=tu_website_id
NEXT_PUBLIC_UMAMI_SCRIPT_URL=https://analytics.umami.is/script.js

# Integración Calendly
NEXT_PUBLIC_CALENDLY_USERNAME=tu_username_calendly
```

Para generar `NEXTAUTH_SECRET`:
```bash
openssl rand -base64 32
```

---

## Instalación y desarrollo

### Requisitos previos

- Node.js 18+
- npm 9+
- Cuenta en Supabase con el esquema aplicado

### Pasos

```bash
# 1. Clonar el repositorio
git clone https://github.com/Sitio-Hoy-Tech/SitioHoy-CRM.git
cd SitioHoy-CRM

# 2. Instalar dependencias
npm install

# 3. Configurar variables de entorno
cp .env.example .env.local
# Editar .env.local con tus valores

# 4. Aplicar el esquema de base de datos
# Ir a Supabase Dashboard → SQL Editor → pegar contenido de supabase.sql

# 5. Crear el primer usuario admin
# Ir a /api/auth/signup con: { nombre, apellido, email, password, rol: "admin" }

# 6. Iniciar servidor de desarrollo
npm run dev
```

La aplicación estará disponible en [http://localhost:3000](http://localhost:3000).

### Scripts disponibles

| Script | Descripción |
|--------|-------------|
| `npm run dev` | Servidor de desarrollo con hot reload |
| `npm run build` | Build de producción |
| `npm run start` | Iniciar build de producción |
| `npm run lint` | Análisis de código con ESLint |

---

## Deploy en producción

### Vercel (recomendado)

1. Conectar el repositorio en [vercel.com](https://vercel.com)
2. Configurar todas las variables de entorno en el dashboard de Vercel
3. Cambiar `NEXTAUTH_URL` y `NEXT_PUBLIC_API_URL` al dominio de producción
4. Deploy automático en cada push a `main`

### Variables de entorno en producción

Mismas que en desarrollo, con estos cambios:
- `NEXTAUTH_URL` → URL de producción (ej: `https://crm.sitiohoy.com`)
- `NEXT_PUBLIC_API_URL` → URL de producción
- Mismas keys de Supabase (o keys de un proyecto Supabase de producción separado)

---

## Funcionalidades principales

### Dashboard

- Métricas en tiempo real: total de contactos, clientes activos, nuevos esta semana
- Clientes próximos a vencer (próximos 7 días)
- Distribución por etiqueta de negocio
- Feed de actividad reciente con timestamps relativos
- Actualización automática via Supabase Realtime (sin polling)

### Gestión de contactos

- Lista con paginación (50/página) y filtros combinados
- Filtros: nombre, email, estado, etiqueta, origen, rango de fechas, creador
- Vista de detalle con todos los campos editables
- Historial de seguimiento con notas y fechas
- Conversión a cliente desde el detalle del contacto

### Gestión de clientes

- Vinculación a contacto existente
- Asignación de plan, etiqueta de negocio y (opcionalmente) plantilla HTML y dominio
- Tracking de `fecha_pago` y `fecha_vencimiento` automática (+30 días via trigger)
- Integración con la plataforma SitioHoy via `tenant_id`
- **Archivado y restauración**: el botón de archivo en la lista aplica soft delete; los clientes archivados se ven en `/clientes/archivados` y se pueden restaurar desde ahí
- **Dos tipos de borrado**:
  - *Archivar* (soft delete reversible) — oculta el cliente de la lista activa
  - *Borrar permanentemente* — elimina el registro del CRM y purga todos los datos del tenant en SitioHoy; requiere escribir el nombre exacto del cliente para confirmar (estilo GitHub/Vercel)
- **Gestión de usuarios SitioHoy** desde el detalle del cliente: ver usuarios vinculados al tenant, crear nuevos con email y contraseña, y editar email/contraseña de usuarios existentes

### Plantillas HTML

- Editor de HTML para templates de email
- Categorización por etiqueta de plantilla
- Vista previa del HTML

### Catálogos

- Planes: nombre, beneficios, precio
- Estados de contacto: configurables (ej: "Interesado", "En negociación", "Cliente")
- Etiquetas de negocio: sectores (ej: "Gimnasio", "Restaurante")
- Etiquetas de plantillas: categorías de templates

### Tickets (Solicitudes)

- Lista de tickets recibidos desde la plataforma SitioHoy con filtros por estado y origen
- Estados: **Nuevo**, **En revisión**, **Reabierto**, **Solucionado**
- Página de detalle con información completa del remitente, tenant y metadata del ticket
- Cambio de estado desde la página de detalle (panel lateral + botones en header)
- Registro automático en auditoría al cambiar el estado de un ticket
- **Notificaciones en tiempo real**: WebSocket directo browser → Supabase Realtime; al llegar un ticket nuevo aparece un toast animado clickeable que navega al detalle
- Badge en el sidebar con contador de tickets nuevos no vistos
- **Flujo de cambio de contraseña**: en tickets de tipo `password_reset_request`, botón "Enviar link de recuperación" → genera link via `auth.admin.generateLink()` → envía email personalizado HTML via Resend; el ticket se marca como solucionado automáticamente

### Caja

- Resumen mensual navegable con selector de mes personalizado (`MonthPicker`)
- **MRR**: calculado en vivo para el mes actual desde clientes activos; para meses pasados usa snapshots históricos de `caja_mrr_snapshots`
- **Snapshots automáticos**: se actualizan al crear/editar/borrar clientes o al cambiar el precio de un plan
- **Cron job diario** (pg_cron en Supabase): garantiza un snapshot al final de cada día para no perder el histórico de meses sin actividad
- Gráfico de tendencia de ingresos vs gastos de los últimos 6 meses
- Desglose de ingresos por plan (nombre, precio, cantidad de clientes)
- Gastos manuales: alta, edición y baja con categoría y fecha; selector de categoría custom (`SearchableSelect`) y calendario custom (`DatePicker`)
- Desglose de gastos por categoría
- Balance (MRR − gastos) mostrado en cards de resumen

### Auditoría

- Log completo de todas las operaciones CREATE, UPDATE, DELETE
- Incluye cambios de estado de tickets (`contact_messages`)
- Diffs JSONB con estado anterior y nuevo
- Filtros por usuario, tabla, acción y fecha
- Acceso restringido a rol `admin`

### Usuarios

- Alta, edición y baja de usuarios del sistema
- Roles: `admin`, `sales`, `manager`
- Contraseñas hasheadas con bcrypt

---

## Roles de usuario

| Rol | Acceso |
|-----|--------|
| `admin` | Acceso completo: usuarios, auditoría, catálogos, todo el CRM |
| `manager` | CRM completo (contactos, clientes, plantillas, catálogos) |
| `sales` | Contactos y clientes (sin administración de usuarios ni auditoría) |

---

## Integraciones

### Supabase Realtime

El componente `DashboardRealtimeManager` se suscribe a cambios en las tablas `contactos`, `clientes` y `seguimiento_contactos`, actualizando las métricas del dashboard en tiempo real sin necesidad de refrescar la página.

### Plataforma SitioHoy (multi-tenant)

El campo `tenant_id` en `clientes` enlaza cada cliente CRM con su tenant en la base de datos de la plataforma SitioHoy (proyecto Supabase separado). Desde el detalle del cliente el CRM puede:

- Consultar y editar datos del tenant (`GET / PATCH /api/sitiohoy/tenants/[tenant_id]`)
- Listar usuarios vinculados al tenant — consulta la tabla `user_tenants` para obtener todos los usuarios reales, con fallback al campo `owner_id` del tenant (`GET /api/sitiohoy/tenants/[tenant_id]/users`)
- Crear nuevos usuarios de Auth y vincularlos automáticamente en `user_tenants` (`POST`)
- Cambiar email y/o contraseña de usuarios existentes via Admin API (`PATCH /api/sitiohoy/tenants/[tenant_id]/users/[user_id]`)

### Supabase Realtime — Tickets

`TicketNotifier` se monta en el layout del dashboard y abre un WebSocket directo al proyecto Supabase de SitioHoy usando la anon key pública. Se suscribe a eventos INSERT en `contact_messages`. Al llegar un ticket nuevo:
1. Dispara un evento custom `crm:new-ticket` via `window.dispatchEvent`
2. El sidebar lo captura y muestra un badge con el conteo
3. Aparece un toast animado en la esquina inferior derecha, clickeable para ir al detalle
4. Al entrar a la sección de Tickets el contador se resetea

La suscripción requiere la política RLS `anon_select_realtime` en `contact_messages` del proyecto SitioHoy (habilitada en migración).

### Resend — Email transaccional

Cuando un admin hace clic en "Enviar link de recuperación" en un ticket de tipo `password_reset_request`:
1. La API route genera el link via `supabaseSitioHoy.auth.admin.generateLink({ type: 'recovery' })`
2. Envía un email HTML diseñado con estilo SitioHoy via `resend.emails.send()`
3. El email incluye el botón "Crear nueva contraseña" con el link y un fallback de texto

El template usa layout 100% basado en tablas con estilos inline para compatibilidad con todos los clientes de email (Gmail, Outlook, Apple Mail, mobile).

### Umami Analytics

Script de analytics embebido en el root layout para tracking de uso de la aplicación.

### Calendly

Embed de Calendly disponible en la ruta `/calendario` para gestión de reuniones comerciales.

---

## Diseño

- **Tema**: Oscuro con variables CSS personalizadas (`--bg-primary: #020617`)
- **Estilo**: Glassmorphism con `backdrop-filter: blur()` y bordes semitransparentes
- **Acento**: Verde esmeralda (`#10b981`) — color de marca SitioHoy
- **CSS framework**: Tailwind CSS 4 con `@theme` directive en `globals.css`
- **Responsive**: Mobile-first

---

## Licencia

Uso interno — SitioHoy Tech. No distribuir.
