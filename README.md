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
- Catálogos configurables (planes, estados, etiquetas)
- Dashboard con métricas en tiempo real via Supabase Realtime
- Auditoría completa de cambios con diffs JSONB
- Integración multi-tenant con la plataforma SitioHoy
- Soft delete en todas las entidades
- Sistema de tickets en tiempo real con notificaciones del sistema operativo
- Sección de Caja con MRR automático, gastos manuales, pagos únicos, historial mensual y desglose de ingresos por cuenta MercadoPago
- Clientes con plan recurrente o de **pago único** (sin fecha de vencimiento, no cuentan para el MRR)
- Importación de clientes desde un tenant ya existente de la plataforma SitioHoy
- Envío de email personalizado para recuperación de contraseña via Hostinger SMTP
- Integración MercadoPago: cuentas multi-cuenta, suscripciones recurrentes y webhooks por cuenta
- **Base de Conocimientos**: artículos con editor Markdown, organizados por categoría
- **Chat de soporte en tiempo real**: widget cliente embebido en los paneles de administración, recibe mensajes y notificaciones de estado via Supabase Realtime

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
| Email | Nodemailer (Hostinger SMTP) | 9.x |
| Markdown | react-markdown, remark-gfm | 10.x / 4.x |

---

## Arquitectura del proyecto

```
Usuario → NextAuth (JWT) → Next.js App Router → Supabase CRM (nepjzwwkzsfegapvttgv)
                                    ↓
                            API Routes (REST)
                                    ↓
                     Supabase Service Role (server-side)
                     Supabase Anon Key (client-side Realtime)
                                    ↓
                         Supabase Realtime (WebSocket) → tabla tickets

Plataforma SitioHoy → POST /api/webhooks/ticket → tabla tickets (CRM DB)
API Routes → Supabase SitioHoy Admin API → Hostinger SMTP (emails de recuperación)
pg_cron (Supabase) → snapshot MRR diario a las 23:00 UTC, backups diarios y purga de tickets archivados
```

- **Rendering**: Server Components por defecto, Client Components solo donde hay interactividad
- **Auth**: JWT sessions via NextAuth, middleware en `src/proxy.ts` protege todas las rutas del dashboard (excluye `/api/webhooks/*` que usan su propio mecanismo de autenticación por header)
- **DB access**: Service role key en API routes (server), anon key + RLS en cliente
- **Tickets**: La plataforma SitioHoy envía nuevos tickets via webhook HTTP al CRM. El CRM los almacena en su propia tabla `tickets` y los sirve via Supabase Realtime al browser
- **Chat de soporte**: widget cliente (en `paneles-administracion`) se conecta al CRM via API REST + Supabase Realtime. Los operadores ven y responden chats en `/chats`. Mensajes, cierre y reapertura de sesiones se sincronizan en tiempo real via INSERT en `chat_messages`
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
│   │   ├── catalogos/
│   │   │   ├── planes/page.tsx
│   │   │   ├── estados-contacto/page.tsx
│   │   │   ├── etiquetas-negocio/page.tsx
│   │   │   └── mp-cuentas/page.tsx       # Cuentas MercadoPago (CRUD)
│   │   ├── solicitudes/
│   │   │   ├── page.tsx              # Lista de tickets con filtros y estados
│   │   │   └── [id]/page.tsx         # Detalle completo del ticket
│   │   ├── caja/
│   │   │   ├── page.tsx              # MRR, pagos únicos, gastos, tendencia mensual
│   │   │   └── historico/page.tsx    # Totales acumulados y tabla mensual paginada
│   │   ├── base-conocimientos/
│   │   │   ├── page.tsx              # Lista de artículos por categoría
│   │   │   ├── nuevo/page.tsx        # Crear artículo (editor Markdown)
│   │   │   └── [id]/
│   │   │       ├── page.tsx          # Vista del artículo
│   │   │       └── editar/page.tsx   # Editar artículo
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
│   │   │       ├── delete-permanent/route.ts   # POST — borrado total con purga SitioHoy
│   │   │       └── mp-subscription/route.ts    # POST — crear/regenerar suscripción MP
│   │   ├── mp-cuentas/
│   │   │   ├── route.ts                        # GET / POST cuentas MP
│   │   │   └── [id]/route.ts                   # PUT / DELETE cuenta MP
│   │   ├── catalogos/
│   │   │   ├── estados-contacto/route.ts + [id]/route.ts
│   │   │   ├── etiquetas-negocio/route.ts + [id]/route.ts
│   │   │   └── planes/route.ts + [id]/route.ts
│   │   ├── usuarios/route.ts + [id]/route.ts
│   │   ├── auditoria/route.ts
│   │   ├── kb/
│   │   │   ├── articulos/route.ts + [id]/route.ts      # CRUD de artículos
│   │   │   └── categorias/route.ts + [id]/route.ts     # CRUD de categorías
│   │   ├── solicitudes/
│   │   │   ├── route.ts              # GET tickets con filtros (DB CRM)
│   │   │   ├── nuevos/route.ts       # GET conteo de tickets con status=new
│   │   │   └── [id]/
│   │   │       ├── route.ts          # GET / PATCH estado
│   │   │       └── reset-password/route.ts  # POST — envía email de recuperación via Hostinger SMTP
│   │   ├── webhooks/
│   │   │   ├── ticket/route.ts                         # POST — recibe tickets desde SitioHoy
│   │   │   └── mercadopago/
│   │   │       ├── route.ts                            # POST — webhook genérico MP (fallback)
│   │   │       └── [cuenta_id]/route.ts                # POST — webhook por cuenta (con secret)
│   │   ├── caja/
│   │   │   ├── resumen/route.ts      # GET resumen mensual (MRR + pagos únicos + gastos + tendencia)
│   │   │   ├── historico/route.ts    # GET totales acumulados por mes (paginado)
│   │   │   ├── ingresos-mp/route.ts  # GET desglose de ingresos por cuenta MercadoPago
│   │   │   └── gastos/
│   │   │       ├── route.ts          # GET / POST gastos
│   │   │       └── [id]/route.ts     # PUT / DELETE gastos
│   │   └── sitiohoy/tenants/
│   │       ├── route.ts                        # GET — buscar tenant existente por tenant_id (importar cliente)
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
│   │   └── TicketNotifier.tsx    # WebSocket Realtime (CRM DB) + toasts + notificaciones del SO
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
│   │   ├── FiltersBar.tsx
│   │   └── MpCuentaSelect.tsx    # Selector de cuenta MP (dropdown custom compartido)
│   ├── dashboard/
│   │   └── DashboardRealtimeManager.tsx
│   └── CatalogoCRUD.tsx
├── stores/
│   └── ticketStore.ts            # Contador de tickets: inicializa desde DB, incrementa via Realtime
├── lib/
│   ├── auth.ts
│   ├── supabase.ts               # supabaseAdmin (service role) + supabase (anon, client-side)
│   ├── supabase-sitiohoy.ts      # Cliente service role para DB de SitioHoy
│   ├── mercadopago.ts            # createSubscription, getSubscription, cancelSubscription, verifyWebhookSignature
│   ├── mrr.ts                    # tomarSnapshotMRR() — upsert snapshot mensual, incluye desglose por cuenta MP
│   ├── mailer.ts                 # sendMail() — Hostinger SMTP via Nodemailer (emails del propio CRM)
│   ├── audit.ts                  # Helper para insertar filas en audit_log
│   ├── validations.ts            # Schemas Zod compartidos
│   ├── cors.ts                   # Headers CORS para rutas públicas (webhooks, chat cliente)
│   └── api.ts                    # Helper de fetch interno
├── types/
│   └── index.ts
└── proxy.ts                      # Middleware NextAuth — protege rutas del dashboard
```

---

## Base de datos

El CRM usa dos bases de datos Supabase separadas:

| Proyecto | ID | Uso |
|----------|----|-----|
| **SitioHoy CRM** | `nepjzwwkzsfegapvttgv` | Todas las tablas del CRM |
| **SitioHoy** | `suvpddgmhyjmixvcbpqc` | Plataforma multi-tenant (tenants, contact_messages) |

### Tablas principales (CRM DB)

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
| etiqueta_negocio_id | UUID FK | → etiquetas_negocio |
| tenant_id | VARCHAR UNIQUE | ID multi-tenant plataforma SitioHoy |
| fecha_pago | DATE | Última fecha de pago |
| fecha_vencimiento | DATE | Auto: fecha_pago + 30 días (trigger, solo al cambiar fecha_pago) |
| mp_cuenta_id | UUID FK | → mp_cuentas (cuenta MP asignada) |
| mp_subscription_id | VARCHAR | ID de preapproval en MercadoPago |
| mp_init_point | TEXT | URL de pago generada por MP |
| mp_status | VARCHAR | Estado de la suscripción MP (`pending` / `authorized` / `cancelled` / `paused`) |
| pago_unico | BOOLEAN | Si es `true`, el cliente pagó una sola vez (no recurrente) |
| precio_pago_unico | DECIMAL | Precio cobrado en el pago único (independiente del precio del plan) |
| estado | ENUM | `active` / `inactive` |
| created_by | UUID FK | → usuarios |
| deleted_at | TIMESTAMPTZ | Soft delete |

> **Pago único**: cuando `pago_unico = true`, el trigger `trg_clientes_vencimiento` deja `fecha_vencimiento` en `NULL` (sin renovación) y el cliente queda excluido del cálculo de MRR; el monto de `precio_pago_unico` se contabiliza como ingreso único en el mes de `fecha_pago` (ver sección Caja).

#### `mp_cuentas`
| Columna | Tipo | Descripción |
|---------|------|-------------|
| id | UUID PK | — |
| nombre | VARCHAR | Nombre descriptivo de la cuenta |
| descripcion | TEXT | Notas opcionales |
| email_titular | VARCHAR | Email del titular de la cuenta MP |
| access_token | TEXT | Access Token de producción de MP |
| public_key | TEXT | Public Key de producción de MP |
| webhook_secret | TEXT | Secret que MP provee al configurar el webhook |
| activo | BOOLEAN | Si la cuenta está disponible para asignar |
| created_at | TIMESTAMPTZ | — |
| updated_at | TIMESTAMPTZ | —

#### `tickets`
| Columna | Tipo | Descripción |
|---------|------|-------------|
| id | UUID PK | Mismo ID que en `contact_messages` de SitioHoy |
| tenant_id | UUID | ID del tenant que generó el ticket |
| name | TEXT | Nombre del remitente |
| email | TEXT | Email del remitente |
| phone | TEXT | Teléfono (opcional) |
| message | TEXT | Cuerpo del mensaje |
| source | TEXT | `password_reset_request` / `support_billing` / `support_technical` / etc. |
| status | TEXT | `new` / `read` / `reopened` / `archived` |
| created_at | TIMESTAMPTZ | — |
| updated_at | TIMESTAMPTZ | — |

> Los tickets llegan al CRM desde la plataforma SitioHoy via webhook HTTP (`POST /api/webhooks/ticket`). La tabla `contact_messages` de SitioHoy queda exclusivamente para formularios de contacto de los sitios de los clientes (`source = 'contact_form'`).

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
| detalle_cuentas | JSONB | Desglose de MRR por cuenta MercadoPago (incluye bucket "Sin cuenta MP") |
| created_at | TIMESTAMPTZ | — |

#### `chat_sessions`

| Columna | Tipo | Descripción |
|---------|------|-------------|
| id | UUID PK | Identificador único de la sesión |
| cliente_id | UUID FK | → clientes |
| tenant_id | TEXT | ID multi-tenant de la plataforma SitioHoy |
| status | TEXT NOT NULL | `open` / `closed` / `pending` |
| pending_since | TIMESTAMPTZ | Timestamp desde que está esperando operador |
| last_message_at | TIMESTAMPTZ | Último mensaje (para ordenar la lista) |
| last_message_preview | TEXT | Preview del último mensaje (hasta 120 chars) |
| unread_agent_count | INTEGER | Mensajes no leídos por el operador |
| created_at | TIMESTAMPTZ | — |
| updated_at | TIMESTAMPTZ | — |

#### `chat_messages`

| Columna | Tipo | Descripción |
|---------|------|-------------|
| id | UUID PK | — |
| session_id | UUID FK NOT NULL | → chat_sessions |
| sender_type | TEXT NOT NULL | `client` / `agent` / `system` |
| sender_name | TEXT | Nombre del remitente (null para mensajes de sistema) |
| content | TEXT NOT NULL | Texto del mensaje, URL de imagen, o token de sistema |
| created_at | TIMESTAMPTZ NOT NULL | — |

**Mensajes de sistema (`sender_type = 'system'`):** no se renderizan como burbujas sino como separadores visuales. Los tokens posibles son:
- `__session_closed__` — el operador cerró la conversación
- `__session_reopened__` — el operador reabrió la conversación

#### `kb_categorias`
| Columna | Tipo | Descripción |
|---------|------|-------------|
| id | UUID PK | — |
| nombre | VARCHAR | — |
| slug | VARCHAR UNIQUE | Usado en la URL del artículo |
| descripcion | TEXT | — |
| icono | VARCHAR | Nombre del ícono a mostrar |
| posicion | INTEGER | Orden de despliegue |
| deleted_at | TIMESTAMPTZ | Soft delete |

#### `kb_articulos`
| Columna | Tipo | Descripción |
|---------|------|-------------|
| id | UUID PK | — |
| categoria_id | UUID FK | → kb_categorias |
| titulo | VARCHAR | — |
| slug | VARCHAR UNIQUE | — |
| resumen | TEXT | Bajada corta para el listado |
| contenido | TEXT | Cuerpo del artículo en Markdown |
| posicion | INTEGER | Orden de despliegue dentro de la categoría |
| created_by, updated_by | UUID FK | → usuarios |
| deleted_at | TIMESTAMPTZ | Soft delete |

#### Tablas de catálogo
- **`planes`**: id, nombre (UNIQUE), beneficios, precio (DECIMAL)
- **`estados_contacto`**: id, nombre (UNIQUE) — ej: "Posible cliente", "Cliente"
- **`etiquetas_negocio`**: id, nombre (UNIQUE) — ej: "Gimnasio", "Restaurante"

> **Tablas legacy (sin UI):** `plantillas` y `etiquetas_plantillas` se mantienen en la base por datos históricos, pero ya no tienen pantalla ni API propia en el CRM.

### Storage

| Bucket | Visibilidad | Uso |
|--------|-------------|-----|
| `chat-images` | Público | Imágenes enviadas en el chat de soporte |

Las imágenes se organizan por sesión: `chat-images/{session_id}/{timestamp}-{random}.{ext}`. Se eliminan automáticamente al cerrar o eliminar la sesión (via Storage API desde los route handlers).

### Triggers

- `trg_clientes_vencimiento` — dispara `calcular_fecha_vencimiento()` en INSERT y en UPDATE **cuando cambian `fecha_pago` o `pago_unico`**. Si `pago_unico = true` deja `fecha_vencimiento` en `NULL`; si no, asigna `fecha_vencimiento = fecha_pago + INTERVAL '30 days'`. No interviene cuando el webhook de MP actualiza `fecha_vencimiento` directamente.
- `set_updated_at` / `update_updated_at` — actualizan `updated_at` automáticamente (la primera en `caja_gastos`, la segunda en el resto de las tablas con esa columna).
- `audit_delete` — dispara `snapshots.capture_delete()` BEFORE DELETE en la mayoría de las tablas (incluye soft-deletes que terminan en hard delete y los DELETE directos de `tickets`/`chat_*`). Guarda la fila completa en `snapshots.deleted_rows` antes de borrarla, independiente del `audit_log` manual.

### Esquema `snapshots` — backups y auditoría de borrados

Además del `audit_log` manual (vía `src/lib/audit.ts`), la DB del CRM corre un sistema de respaldo automático en el esquema `snapshots`:

| Objeto | Tipo | Descripción |
|--------|------|-------------|
| `snapshots.table_snapshots` | Tabla | Snapshot diario de todas las tablas (vía cron) |
| `snapshots.deleted_rows` | Tabla | Copia de cada fila borrada (vía trigger `audit_delete`) |
| `snapshots.take_snapshot()` | Función | Copia todas las tablas listadas a `table_snapshots`; retención de 30 días (1 año para `clientes`, `caja_gastos`, `caja_mrr_snapshots`, `tickets`) |
| `snapshots.capture_delete()` | Función | Inserta la fila borrada en `deleted_rows` antes del DELETE |

> ✅ **RLS habilitado** en `snapshots.table_snapshots` y `snapshots.deleted_rows` (sin policies): por defecto deniega a `anon`/`authenticated`, mientras que `postgres`/`service_role` siguen funcionando igual porque tienen `BYPASSRLS` — el cron de snapshots, el trigger de borrado y los restores manuales no se ven afectados. Antes de este cambio, ninguno de los dos roles tenía siquiera `USAGE` sobre el schema `snapshots`, así que esto es una capa adicional de defensa, no una corrección de un acceso activo.

### Cron jobs (pg_cron — Supabase CRM)

| Job | Schedule | Descripción |
|-----|----------|-------------|
| `mrr-snapshot-diario` | `0 23 * * *` | Ejecuta `tomar_snapshot_mrr()` todos los días a las 23:00 UTC para garantizar snapshots históricos de MRR (incluye desglose por plan y por cuenta MP) |
| `daily-table-snapshots` | `0 9 * * *` | Ejecuta `snapshots.take_snapshot()` — backup diario de todas las tablas |
| `purge-archived-tickets` | `0 10 * * *` | Borra tickets con `status = 'archived'` y más de 1 mes de antigüedad |

### Índices

- `contactos`: estado_id, etiqueta_negocio_id, email, fecha_contacto, origen
- `audit_log`: usuario_id, tabla_afectada, created_at
- `tickets`: tenant_id, status, created_at DESC
- `kb_articulos`: slug, categoria_id
- `clientes`: dominio, tenant_id, plan_id, estado, mp_cuenta_id, mp_subscription_id, fecha_vencimiento
- `chat_sessions`: tenant_id, last_message_at DESC
- `chat_messages`: (session_id, created_at DESC)

### Row Level Security (RLS)

| Tabla | Política |
|-------|----------|
| `clientes`, `contactos`, `seguimiento_contactos` | SELECT público para Supabase Realtime |
| `tickets` | SELECT público para Realtime + RESTRICTIVE deny-all para anon/authenticated |
| `chat_messages` | SELECT para anon (necesario para Realtime en el widget cliente) |
| `chat_sessions` | SELECT para anon (necesario para Realtime en el widget cliente) |
| `caja_gastos` | RESTRICTIVE deny-all (solo service role) |
| `caja_mrr_snapshots` | RESTRICTIVE deny-all (solo service role) |
| `mp_cuentas` | RESTRICTIVE deny-all (solo service role) |
| `kb_categorias`, `kb_articulos` | RLS habilitado sin policies → deny-all implícito (solo service role) |

Todo el acceso legítimo desde el backend usa `supabaseAdmin` (service role key) que bypasea RLS por diseño de Postgres.

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
5. Middleware en `src/proxy.ts` protege todas las rutas del dashboard

### Middleware de protección

```
/login           → redirige a /  si ya está autenticado
/api/webhooks/*  → excluido del middleware (autenticación propia via x-webhook-secret)
/*               → redirige a /login si no hay sesión
/_next/*         → bypass (archivos estáticos)
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
| POST | `/api/clientes/[id]/mp-subscription` | Crear o regenerar suscripción MP para el cliente |

**Parámetros de GET /api/clientes:**
- `archived=true` — devuelve solo clientes con `deleted_at IS NOT NULL` (archivados)
- `nombre_empresa` — búsqueda parcial case-insensitive
- `plan_id`, `etiqueta_negocio_id` — filtros exactos
- `page`, `limit` — paginación

**POST /api/clientes/[id]/delete-permanent:**
Elimina permanentemente el registro del CRM y purga todos los datos del tenant en la plataforma SitioHoy en orden seguro de FK: eventos de órdenes → órdenes → imágenes y variantes de productos → productos → subcategorías → categorías → cupones / mensajes / zonas de envío → `user_tenants` → usuarios de Auth → tenant.

**Importar cliente desde tenant existente:**
`POST /api/clientes` acepta `existing_tenant_id` para vincular el cliente del CRM a un tenant que ya existe en SitioHoy (buscado previamente via `GET /api/sitiohoy/tenants?tenant_id=...`). En este modo se omite la creación de tenant y usuario de Auth, y se precargan los datos existentes del tenant.

**Pago único:** `POST` / `PUT /api/clientes/[id]` aceptan `pago_unico` (boolean) y `precio_pago_unico` (decimal). Al activarlo, el trigger de base de datos limpia `fecha_vencimiento` y el cliente queda fuera del cálculo de MRR (ver sección Caja).

### SitioHoy Tenants

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/sitiohoy/tenants` | Buscar tenant existente por `tenant_id` (usado al importar un cliente) |
| GET | `/api/sitiohoy/tenants/[tenant_id]` | Datos del tenant en plataforma SitioHoy |
| PATCH | `/api/sitiohoy/tenants/[tenant_id]` | Actualizar datos del tenant (incluye `smpt_user` / `smpt_pass` para el envío de emails de la tienda del cliente) |
| GET | `/api/sitiohoy/tenants/[tenant_id]/users` | Usuarios vinculados al tenant |
| POST | `/api/sitiohoy/tenants/[tenant_id]/users` | Crear usuario en Auth + vincular al tenant |
| PATCH | `/api/sitiohoy/tenants/[tenant_id]/users/[user_id]` | Cambiar email y/o contraseña de un usuario |

### Tickets (Solicitudes)

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/solicitudes` | Lista con filtros y paginación |
| GET | `/api/solicitudes/nuevos` | Conteo de tickets con `status = new` |
| GET | `/api/solicitudes/[id]` | Detalle del ticket con info del tenant y contacto CRM |
| PATCH | `/api/solicitudes/[id]` | Cambiar estado del ticket |
| POST | `/api/solicitudes/[id]/reset-password` | Enviar email de recuperación via Hostinger SMTP |

**Filtros disponibles en GET /api/solicitudes:**
- `source` — origen del ticket
- `status` — `new` / `read` / `reopened` / `archived`
- `search` — búsqueda en nombre, email o mensaje
- `date_from`, `date_to` — rango de fechas
- `page`, `limit` — paginación (default: 20/página)

### Cuentas MercadoPago

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/mp-cuentas` | Lista todas las cuentas MP |
| POST | `/api/mp-cuentas` | Crear cuenta MP |
| PUT | `/api/mp-cuentas/[id]` | Actualizar cuenta MP |
| DELETE | `/api/mp-cuentas/[id]` | Eliminar cuenta MP |

### Webhooks MercadoPago

| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | `/api/webhooks/mercadopago` | Webhook genérico (busca el access token por `mp_subscription_id`) |
| POST | `/api/webhooks/mercadopago/[cuenta_id]` | Webhook por cuenta — valida firma con el `webhook_secret` específico de la cuenta |

Ambos endpoints están excluidos del middleware de NextAuth. Los tópicos esperados son `preapproval` y `payment`. Al recibir un pago autorizado extienden `fecha_vencimiento` del cliente sumando un mes.

### Webhook de tickets

| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | `/api/webhooks/ticket` | Recibe nuevos tickets desde la plataforma SitioHoy |

**Autenticación:** header `x-webhook-secret` con el valor de `WEBHOOK_SECRET`.
**Body esperado:**
```json
{
  "record": {
    "id": "uuid",
    "tenant_id": "uuid",
    "name": "string",
    "email": "string",
    "phone": "string | null",
    "message": "string",
    "source": "string",
    "status": "new",
    "created_at": "ISO timestamp",
    "updated_at": "ISO timestamp"
  }
}
```
Registros con `source = 'contact_form'` son ignorados. La ruta está excluida del middleware de auth de NextAuth.

### Chat de soporte (operadores)

Rutas usadas por la interfaz del CRM (`/chats`). Requieren sesión NextAuth.

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/chats` | Lista de sesiones con último mensaje y conteo de no leídos |
| PATCH | `/api/chats/[id]` | Cambiar estado (`open` / `closed` / `pending`) o marcar como leído |
| DELETE | `/api/chats/[id]` | Eliminar sesión, mensajes e imágenes del storage |
| GET | `/api/chats/[id]/messages` | Mensajes de una sesión (paginado, 50/página, orden desc) |
| POST | `/api/chats/[id]/messages` | Enviar mensaje del agente |
| GET | `/api/chats/session-info/[id]` | Info básica de la sesión (nombre del cliente) para toasts |

**Lógica del PATCH `/api/chats/[id]`:**
- Al cambiar a `closed` desde otro estado: inserta mensaje de sistema `__session_closed__` y limpia imágenes del storage del bucket `chat-images`
- Al cambiar a `open` desde `closed`: inserta mensaje de sistema `__session_reopened__`
- El body puede incluir `{ status }` y/o `{ markRead: true }` en la misma llamada

### Chat de soporte (widget cliente)

Rutas públicas consumidas por el widget `SupportChat.tsx` en `paneles-administracion`. Autenticación via `Bearer <token>` del usuario SitioHoy (validado contra la DB de SitioHoy).

| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | `/api/client/chat/init` | Inicializa o recupera la sesión activa del cliente; retorna `session_id`, `status` y últimos 50 mensajes |
| POST | `/api/client/chat/[session_id]/request-support` | Pone la sesión en `pending` para que un operador la tome |
| GET | `/api/client/chat/[session_id]/messages` | Carga mensajes anteriores (paginación hacia atrás) |
| POST | `/api/client/chat/[session_id]/messages` | Envía un mensaje del cliente; retorna 403 si la sesión está cerrada |

**Lógica de `/api/client/chat/init`:**
1. Busca sesión activa (`open` o `pending`) del cliente → la reutiliza
2. Si no hay ninguna, busca la primera sesión `closed` y la reabre (UPDATE directo, sin mensaje de sistema)
3. Si no existe ninguna sesión, crea una nueva con `status: open`
4. Retorna los últimos 50 mensajes ya cargados para evitar una segunda request

**Lógica de `/api/client/chat/[session_id]/messages` POST:**
- Retorna `403` si la sesión tiene `status = closed` (no reabre silenciosamente)
- Actualiza `last_message_at`, `last_message_preview` y `unread_agent_count` en la sesión

### Caja

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/caja/resumen` | Resumen del mes: MRR, pagos únicos, gastos, tendencia de los últimos 6 meses |
| GET | `/api/caja/historico` | Totales acumulados por mes, paginado (usado en `/caja/historico`) |
| GET | `/api/caja/ingresos-mp` | Desglose de ingresos por cuenta MercadoPago (mes actual en vivo, meses pasados desde snapshot) |
| GET | `/api/caja/gastos` | Lista de gastos manuales |
| POST | `/api/caja/gastos` | Crear gasto |
| PUT | `/api/caja/gastos/[id]` | Editar gasto |
| DELETE | `/api/caja/gastos/[id]` | Soft delete de gasto |

### Base de Conocimientos

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/kb/categorias` | Lista de categorías |
| POST | `/api/kb/categorias` | Crear categoría |
| PUT | `/api/kb/categorias/[id]` | Editar categoría |
| DELETE | `/api/kb/categorias/[id]` | Soft delete |
| GET | `/api/kb/articulos` | Lista de artículos (filtrable por categoría) |
| POST | `/api/kb/articulos` | Crear artículo (contenido en Markdown) |
| GET | `/api/kb/articulos/[id]` | Obtener artículo por ID |
| PUT | `/api/kb/articulos/[id]` | Editar artículo |
| DELETE | `/api/kb/articulos/[id]` | Soft delete |

### Catálogos

Misma estructura REST para cada catálogo:

| Ruta base | Catálogo |
|-----------|---------|
| `/api/catalogos/planes` | Planes de servicio |
| `/api/catalogos/estados-contacto` | Estados de contacto |
| `/api/catalogos/etiquetas-negocio` | Etiquetas de negocio |

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
NEXT_PUBLIC_SITIOHOY_SUPABASE_ANON_KEY=tu_anon_key_sitiohoy

# URL del panel de clientes SitioHoy (para redirect de recuperación de contraseña)
SITIOHOY_APP_URL=https://admin.sitiohoy.com.ar

# Hostinger SMTP (envío de emails transaccionales del propio CRM, vía Nodemailer)
HOSTINGER_SMTP_HOST=smtp.hostinger.com
HOSTINGER_SMTP_PORT=465
HOSTINGER_SMTP_USER=tu_usuario_smtp
HOSTINGER_SMTP_PASS=tu_password_smtp
HOSTINGER_SMTP_FROM="SitioHoy <tu_usuario_smtp>"

# Webhook secret — autentica los POSTs de la plataforma SitioHoy al endpoint /api/webhooks/ticket
WEBHOOK_SECRET=genera_con_openssl_rand_-hex_32

# Cron secret (protege el endpoint /api/cron/mrr-snapshot si se usa en Vercel Pro)
CRON_SECRET=genera_con_openssl_rand_-hex_32

# Analytics (Umami)
NEXT_PUBLIC_UMAMI_WEBSITE_ID=tu_website_id
NEXT_PUBLIC_UMAMI_SCRIPT_URL=https://analytics.umami.is/script.js

# Integración Calendly
NEXT_PUBLIC_CALENDLY_USERNAME=tu_username_calendly
```

Para generar secrets:
```bash
openssl rand -hex 32
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
3. Cambiar `NEXTAUTH_URL` y `NEXT_PUBLIC_API_URL` al dominio de producción (`https://crm.sitiohoy.com.ar`)
4. Deploy automático en cada push a `main`

### Variables de entorno en producción

Mismas que en desarrollo, con estos cambios:
- `NEXTAUTH_URL` → `https://crm.sitiohoy.com.ar`
- `NEXT_PUBLIC_API_URL` → `https://crm.sitiohoy.com.ar`
- `WEBHOOK_SECRET` → el mismo valor configurado en `crm_webhook_config` de la DB de SitioHoy

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
- Asignación de plan, etiqueta de negocio y (opcionalmente) plantilla y dominio
- Tracking de `fecha_pago` y `fecha_vencimiento` automática (+30 días via trigger)
- **Pago único**: checkbox en alta y edición con precio personalizado independiente del plan; al activarlo no se calcula `fecha_vencimiento` y el cliente queda fuera del MRR. Se muestra un badge "Pago único" en el listado y el detalle.
- **Importar cliente desde tenant existente**: en `/clientes/nuevo` se puede vincular el cliente del CRM a un tenant que ya existe en SitioHoy buscándolo por `tenant_id`; en ese modo se omiten los pasos de creación de Auth, Integraciones y Hostinger.
- Integración con la plataforma SitioHoy via `tenant_id`
- **Archivado y restauración**: el botón de archivo en la lista aplica soft delete; los clientes archivados se ven en `/clientes/archivados` y se pueden restaurar desde ahí
- **Dos tipos de borrado**:
  - *Archivar* (soft delete reversible) — oculta el cliente de la lista activa
  - *Borrar permanentemente* — elimina el registro del CRM y purga todos los datos del tenant en SitioHoy; requiere escribir el nombre exacto del cliente para confirmar (estilo GitHub/Vercel)
- **Gestión de usuarios SitioHoy** desde el detalle del cliente: ver usuarios vinculados al tenant, crear nuevos con email y contraseña, y editar email/contraseña de usuarios existentes
- **Credenciales de Hostinger (SMTP) del cliente**: en el wizard de alta y en el detalle se puede configurar el usuario y contraseña SMTP que la tienda del cliente usa para enviar sus propios emails (campos `smpt_user` / `smpt_pass` en el tenant de SitioHoy) — distinto del Hostinger SMTP que usa el CRM para sus propios emails

### Catálogos

- Planes: nombre, beneficios, precio
- Estados de contacto: configurables (ej: "Interesado", "En negociación", "Cliente")
- Etiquetas de negocio: sectores (ej: "Gimnasio", "Restaurante")
- Etiquetas de plantillas: categorías de templates
- **Cuentas MercadoPago**: gestión de cuentas MP con credenciales de producción, webhook secret y URL de webhook por cuenta

### MercadoPago — Suscripciones

- Catálogo de cuentas MP (`Catálogos → Cuentas MP`): alta, edición y baja de cuentas con Access Token, Public Key y Webhook Secret. Cada cuenta muestra su URL de webhook lista para copiar y configurar en el panel de developers de MP.
- Asignación de cuenta MP a cada cliente desde el formulario de creación y desde el detalle.
- Generación del link de pago (`mp_init_point`) desde el detalle del cliente: el sistema crea una suscripción recurrente mensual en MP usando el access token de la cuenta asignada y el precio del plan del cliente.
- Botón "Copiar link de pago" destacado en el detalle del cliente para compartir el link al cliente.
- Renovación automática de `fecha_vencimiento`: al recibir el webhook de MP con un pago aprobado o la suscripción autorizada, el CRM extiende la fecha de vencimiento del cliente en un mes.
- Webhooks por cuenta con validación de firma HMAC-SHA256 usando el `webhook_secret` específico de cada cuenta.

### Tickets (Solicitudes)

- Lista de tickets recibidos desde la plataforma SitioHoy con filtros por estado y origen
- Estados: **Nuevo**, **En revisión**, **Reabierto**, **Solucionado**
- Página de detalle con información completa del remitente, tenant y metadata del ticket
- La columna Teléfono muestra el dato del formulario; si no está, hace fallback al teléfono del contacto CRM vinculado por `tenant_id`
- Cambio de estado desde la página de detalle (panel lateral + botones en header)
- Registro automático en auditoría al cambiar el estado de un ticket
- **Notificaciones en tiempo real**: cuando llega un ticket nuevo aparece un toast animado clickeable en la esquina inferior derecha que navega al detalle; si el tab no está activo, se muestra además una notificación nativa del sistema operativo con el logo de SitioHoy (requiere permiso del navegador)
- Badge en el sidebar con contador de tickets nuevos: se inicializa al montar consultando los tickets con `status = new` en la DB, y se incrementa en tiempo real via Realtime
- **Flujo de cambio de contraseña**: en tickets de tipo `password_reset_request`, botón "Enviar link de recuperación" → genera link via `auth.admin.generateLink()` → envía email personalizado HTML via Hostinger SMTP (`src/lib/mailer.ts`); el ticket se marca como solucionado automáticamente

### Chat de soporte en tiempo real

El módulo de chat permite a los clientes de SitioHoy comunicarse en tiempo real con los operadores del CRM.

**Componentes involucrados:**
- `ChatNotifier.tsx` — montado en el layout del dashboard, escucha eventos Realtime globales de chat
- `/chats/page.tsx` — interfaz del operador: lista de sesiones, área de mensajes, acciones
- `paneles-administracion/components/shared/SupportChat.tsx` — widget flotante embebido en los paneles del cliente

**Flujo completo de una conversación:**

```
1. Cliente abre el widget → POST /api/client/chat/init
   → retorna session_id + últimos mensajes

2. Cliente solicita soporte → POST /api/client/chat/[id]/request-support
   → sesión pasa a status: "pending"

3. Supabase Realtime dispara UPDATE en chat_sessions (pending)
   → ChatNotifier lo captura → toast + notificación SO → badge en sidebar

4. Operador acepta → PATCH /api/chats/[id] { status: "open" }
   → Widget cliente recibe UPDATE via Realtime → pasa a pantalla de chat

5. Cliente y agente intercambian mensajes en tiempo real
   → Cliente: POST /api/client/chat/[id]/messages
   → Agente: POST /api/chats/[id]/messages
   → Cada INSERT en chat_messages dispara Realtime en ambos lados

6. Operador cierra → PATCH /api/chats/[id] { status: "closed" }
   → CRM inserta mensaje de sistema __session_closed__ en chat_messages
   → Widget cliente recibe el INSERT via Realtime → muestra pantalla "Consulta resuelta"
   → Las imágenes de la sesión se eliminan del storage

7. Si el cliente intenta enviar un mensaje con la sesión cerrada:
   → API retorna 403 → widget navega a pantalla resuelta como fallback
```

**Mensajes de sistema:** cuando el operador cierra o reabre una sesión, el CRM inserta un mensaje con `sender_type: 'system'`. Estos no se renderizan como burbujas sino como separadores de línea en el historial.

**Imágenes en el chat:** el cliente puede adjuntar imágenes (JPEG, PNG, GIF, WebP, máx. 5 MB). Se suben al bucket `chat-images` de Supabase Storage usando la anon key, organizadas por `{session_id}/{timestamp}.{ext}`. La URL pública se guarda como contenido del mensaje. Al cerrar o eliminar una sesión, todas las imágenes de esa carpeta se eliminan via Storage API.

**Notificaciones al operador:**
- Nuevo mensaje de cliente: toast con el nombre del cliente y preview del mensaje
- Nueva solicitud de soporte (pending): toast + notificación nativa del SO + badge en sidebar

**Realtime:**
- `chat_messages` y `chat_sessions` están en la publicación `supabase_realtime`
- Políticas RLS permiten SELECT al rol `anon` para que el widget cliente reciba eventos
- Todas las escrituras usan `supabaseAdmin` (service role, bypasea RLS)

### Caja

- Resumen mensual navegable con selector de mes personalizado (`MonthPicker`)
- **MRR**: calculado en vivo para el mes actual desde clientes activos (excluye clientes de pago único); para meses pasados usa snapshots históricos de `caja_mrr_snapshots`
- **Snapshots automáticos**: se actualizan al crear/editar/borrar clientes o al cambiar el precio de un plan
- **Cron job diario** (pg_cron en Supabase): garantiza un snapshot al final de cada día para no perder el histórico de meses sin actividad
- Gráfico de tendencia de ingresos vs gastos de los últimos 6 meses
- Desglose de ingresos por plan (nombre, precio, cantidad de clientes)
- **Desglose de ingresos por cuenta de MercadoPago**: muestra cuánto MRR aporta cada cuenta MP (`detalle_cuentas` en los snapshots), útil cuando hay varias cuentas de cobro activas
- **Histórico** (`/caja/historico`): vista de todos los meses con datos guardados, navegable mes a mes
- Gastos manuales: alta, edición y baja con categoría y fecha; selector de categoría custom (`SearchableSelect`) y calendario custom (`DatePicker`)
- Desglose de gastos por categoría
- Balance (MRR − gastos) mostrado en cards de resumen

### Base de Conocimientos

- Artículos en Markdown organizados por categorías (`kb_categorias` / `kb_articulos`)
- CRUD completo de categorías y artículos desde `/base-conocimientos`
- Editor con preview en vivo (`react-markdown` + `remark-gfm`)
- Estado publicado/borrador por artículo

### Auditoría

- Log completo de todas las operaciones CREATE, UPDATE, DELETE
- Incluye cambios de estado de tickets
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
| `manager` | CRM completo (contactos, clientes, catálogos) |
| `sales` | Contactos y clientes (sin administración de usuarios ni auditoría) |

---

## Integraciones

### Supabase Realtime — Dashboard

El componente `DashboardRealtimeManager` se suscribe a cambios en las tablas `contactos`, `clientes` y `seguimiento_contactos`, actualizando las métricas del dashboard en tiempo real sin necesidad de refrescar la página.

### Supabase Realtime — Tickets

`TicketNotifier` se monta en el layout del dashboard y abre un WebSocket al proyecto Supabase del CRM usando la anon key pública. Se suscribe a eventos INSERT en la tabla `tickets`. Al llegar un ticket nuevo:
1. Dispara un evento custom `crm:new-ticket` via `window.dispatchEvent`
2. El sidebar lo captura y muestra un badge con el conteo acumulado
3. Aparece un toast animado en la esquina inferior derecha, clickeable para ir al detalle
4. Si el tab no tiene foco, se dispara adicionalmente una notificación nativa del SO
5. Al entrar a la sección de Tickets el contador se resetea

El contador se inicializa al montar consultando `/api/solicitudes/nuevos` (tickets con `status = new` en la DB), por lo que el badge persiste correctamente al reabrir el CRM.

### Supabase Realtime — Chat de soporte

`ChatNotifier` abre dos canales WebSocket al proyecto Supabase del CRM:

1. **`crm-chat-messages`** — escucha INSERT en `chat_messages`. Al recibir un mensaje de un cliente en una sesión que no es la activa, muestra un toast clickeable con el nombre del remitente y preview del mensaje. Filtra mensajes propios del agente para no auto-notificarse.

2. **`crm-chat-sessions`** — escucha UPDATE en `chat_sessions`. Solo reacciona cuando `status = 'pending'` (nueva solicitud de soporte): dispara el evento `crm:support-request`, muestra toast y notificación nativa del SO.

El widget cliente (`SupportChat.tsx` en `paneles-administracion`) abre su propio canal `client-chat-{session_id}` al mismo proyecto Supabase usando la anon key del CRM:
- INSERT en `chat_messages` con filtro `session_id=eq.{id}`: recibe mensajes del agente y mensajes de sistema (`__session_closed__`, `__session_reopened__`)
- UPDATE en `chat_sessions`: detecta cambios de estado como respaldo adicional

### Supabase Storage — Imágenes de chat

Las imágenes enviadas en el chat se almacenan en el bucket público `chat-images`. La estructura de carpetas es `{session_id}/{timestamp}-{random}.{ext}`.

**Ciclo de vida:**
- **Subida**: el widget cliente sube directamente a Storage usando la anon key, antes de enviar el POST del mensaje
- **Eliminación al cerrar sesión**: `PATCH /api/chats/[id]` llama a `storage.list(session_id)` + `storage.remove(paths)` usando `supabaseAdmin`
- **Eliminación al borrar sesión**: `DELETE /api/chats/[id]` hace lo mismo antes de borrar los registros de la DB

### Plataforma SitioHoy — Webhook de tickets

La plataforma SitioHoy envía los tickets de soporte directamente al CRM via `POST /api/webhooks/ticket`. El endpoint valida el header `x-webhook-secret` e inserta el registro en la tabla `tickets` del CRM. La tabla `contact_messages` de SitioHoy queda exclusivamente para formularios de contacto (`source = 'contact_form'`).

La configuración del webhook en la DB de SitioHoy se administra en la tabla `crm_webhook_config`:
```sql
-- Ver configuración actual
SELECT * FROM crm_webhook_config;

-- Actualizar URL (ej: si cambia el dominio del CRM)
UPDATE crm_webhook_config SET value = 'https://crm.sitiohoy.com.ar/api/webhooks/ticket' WHERE key = 'url';
```

### Plataforma SitioHoy — Gestión de tenants

El campo `tenant_id` en `clientes` enlaza cada cliente CRM con su tenant en la base de datos de la plataforma SitioHoy. Desde el detalle del cliente el CRM puede:

- Consultar y editar datos del tenant (`GET / PATCH /api/sitiohoy/tenants/[tenant_id]`)
- Listar usuarios vinculados al tenant con fallback al campo `owner_id` del tenant (`GET`)
- Crear nuevos usuarios de Auth y vincularlos automáticamente en `user_tenants` (`POST`)
- Cambiar email y/o contraseña de usuarios existentes via Admin API (`PATCH`)
- Buscar un tenant existente por `tenant_id` para vincularlo a un cliente nuevo (`GET /api/sitiohoy/tenants`), usado por el flujo de "importar cliente desde tenant existente"
- Configurar las credenciales Hostinger SMTP (`smpt_user` / `smpt_pass`) que el tenant usa para enviar emails desde su propia tienda — distinto del Hostinger SMTP que usa el CRM (ver abajo)

### Hostinger SMTP — Email transaccional del CRM

Cuando un admin hace clic en "Enviar link de recuperación" en un ticket de tipo `password_reset_request`:
1. La API route genera el link via `supabaseSitioHoy.auth.admin.generateLink({ type: 'recovery' })`
2. Envía un email HTML diseñado con estilo SitioHoy via `sendMail()` (`src/lib/mailer.ts`), que usa Nodemailer contra el SMTP de Hostinger (`HOSTINGER_SMTP_*`)
3. El email incluye el botón "Crear nueva contraseña" con el link y un fallback de texto

El template usa layout 100% basado en tablas con estilos inline para compatibilidad con todos los clientes de email (Gmail, Outlook, Apple Mail, mobile).

> Esto es independiente de las credenciales Hostinger SMTP que puede tener cada **cliente/tenant** (`smpt_user` / `smpt_pass`, ver sección anterior): esas son para que la tienda del cliente envíe sus propios emails, no para los emails que envía el CRM.

### MercadoPago — Suscripciones recurrentes

El módulo de MercadoPago (`src/lib/mercadopago.ts`) expone:
- `createSubscription()` — crea un preapproval mensual en MP con el email del contacto, el monto del plan y la `back_url`
- `getSubscription()` — consulta el estado de un preapproval
- `cancelSubscription()` — cancela un preapproval
- `verifyWebhookSignature()` — valida la firma HMAC-SHA256 de las notificaciones de MP

**Flujo completo:**
1. Desde el detalle del cliente, se asigna una cuenta MP y se hace clic en "Crear suscripción"
2. El CRM llama a MP con el access token de la cuenta y genera el `init_point`
3. El link se copia y se envía al cliente (WhatsApp u otro canal)
4. El cliente paga → MP notifica al webhook `POST /api/webhooks/mercadopago/[cuenta_id]`
5. El CRM verifica la firma, consulta el estado del preapproval y extiende `fecha_vencimiento` + 1 mes

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
