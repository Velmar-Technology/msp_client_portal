# Reporte del Sistema y Documentación Técnica Completa (MSP Client Portal)

Esta es la documentación técnica del monorepo **MSP Client Portal** (sistema de mesa de ayuda y suscripciones para proveedores de servicios gestionados). Este reporte ha sido generado automáticamente escaneando los archivos fuente del backend (servidores de Express + Drizzle ORM) y del frontend (React + Zustand + Tailwind CSS v4).

---

## 1. Arquitectura General del Sistema

El proyecto sigue una arquitectura de **Monolito Modular (Modular Monolith)** utilizando el stack **PERN (PostgreSQL, Express, React, Node.js)**. Se encuentra estructurado bajo un monorepo con un directorio para el frontend (`client/`) y otro para el backend (`server/`).

### Flujo de Datos del Servidor (Capas backend):

El servidor Express implementa una separación estricta de responsabilidades (Separation of Concerns):

```mermaid
graph TD
    Client[Cliente React / API Request] --> Gateway[API Gateway Layer: gatewayAuth, gatewayRateLimiter, gatewayRouter]
    Gateway --> Routes[Rutas: routes/*]
    Routes --> Middlewares[Middlewares: validation, rbac]
    Middlewares --> Controllers[Controladores: controllers/*]
    Controllers --> Services[Servicios de Negocio: services/*]
    Services --> Repositories[Repositorios de Datos: repositories/*]
    Repositories --> DB[(Base de Datos: PostgreSQL + Row-Level Security via Drizzle ORM)]
    DB --> Repositories
    Repositories --> Services
    Services --> Controllers
    Controllers --> Client
```

1. **Capa API Gateway (`shared/middleware/gateway*.ts`):** Punto de entrada unificado que ejecuta la decodificación de JWT, la inyección de cabeceras estándar (`X-User-Id`, `X-Tenant-Id`), el control de tasa de peticiones por inquilino (_Multi-Tenant Rate Limiting_) y el enrutamiento a clústeres.
2. **Middleware de Autorización Universal (`shared/middleware/authzMiddleware.ts`):** Fábrica declarativa `authorize(action, resourceType, extractResource)` que conecta las rutas de Express con el Policy Decision Point (PDP) híbrido.
3. **Rutas (`routes/`):** Define los endpoints de la API. No contiene lógica de negocio, solo delega en los controladores correspondientes.
4. **Controladores (`controllers/`):** Manejan la entrada HTTP (`req`, `res`), validan las entradas de datos (usando Zod a través de middlewares) y delegan la lógica de negocio a los servicios.
5. **Servicios (`services/`):** Contienen toda la lógica de negocio nuclear del sistema (e.g., asignación de tickets mediante Round-Robin, políticas de SLA de 1 hora, facturación automática, sincronización con Nextcloud). No tienen conocimiento de la capa HTTP.
6. **Repositorios (`repositories/`):** Es la única capa autorizada para realizar consultas SQL (o sentencias Drizzle) a la base de datos PostgreSQL.
7. **Seguridad a Nivel de Fila (RLS) y Esquema DB (`shared/db/`):** Define las tablas relacionales y sus políticas de aislamiento por inquilino (_Row-Level Security_) usando `app.current_tenant_id` y `withTenantContext`.
8. **Motor de Autorización SOTA & Zero Standing Privileges (`shared/authz/`):** Subsistema de autorización híbrido desacoplado (_Policy Decision Point - PDP_) que unifica la gestión de privilegios mínimos de última generación (SOTA PoLP):
   - **Acceso Efímero y Just-In-Time (Zero Standing Privileges - `EphemeralAccessService`):** Erradica los privilegios permanentes 24/7. Las solicitudes de elevación temporal (`createRequest`) requieren justificación de negocio y duración limitada (`JIT_CONSTANTS.MIN_DURATION_MINUTES` a `MAX_DURATION_MINUTES`), inyectando tuplas temporales en el grafo Zanzibar con auto-expiración y barrido en segundo plano (`sweepExpiredGrants`).
   - **Identidad de Cargas de Trabajo y M2M Secretless (`WorkloadIdentityService`):** Gestión de identidades no humanas (agentes RMM, workers en segundo plano, agentes de IA) bajo estándares SPIFFE (`spiffe://msp.portal/tenant/{tenantId}/{type}/{id}`). Genera y valida tokens criptográficos firmados (HMAC-SHA256) de vida ultra-corta con delimitación estricta de acciones y prefijos de recursos permitidos.
   - **Minería de Roles y Reducción Continua de Privilegios (`ContinuousAdaptiveTrustService.mineRoles`):** Algoritmo de clustering no supervisado sobre flujos de `EntitlementLog`. Detecta deriva de permisos (>40% no utilizados) y genera diffs de parche estructurados (`PruningPatchDiff`) para pull requests automatizados de minimización de privilegios.
   - **Autenticación Contextual y Step-Up MFA Dinámico (`ContinuousAdaptiveTrustService`, `HybridPolicyEngine`):** Evaluación continua de telemetría multi-vector (picos de datos >50MB, ráfagas de peticiones, viajes imposibles, dispositivos no conformes y actividad fuera de horario). Eleva el riesgo a `MEDIUM`/`HIGH` activando desafíos de Step-Up MFA sin interrumpir sesiones legítimas.
   - **RBAC (Control Coarse-Grained Baseline):** Verificación de identidad y mapeo de acciones por rol (`CLIENT`, `TECHNICIAN`, `ADMIN`).
   - **ReBAC (Zanzibar Graph Engine - `ZanzibarTupleStore`):** Evaluación de tuplas de relación `<sujeto>#<relación>@<objeto>` con herencia jerárquica (`owner` $\rightarrow$ `editor` $\rightarrow$ `viewer`).
   - **ABAC / Policy-as-Code (`PolicyAsCodeEngine`):** Predicados contextuales dinámicos versionados (ventana SLA de 1 hora `BL-101`, aislamiento multi-inquilino estricto, y escala de impagos `BL-702`).
   - **Seguridad Vectorial para IA/RAG (`VectorAclService`):** Autorización de doble fase con pre-filtrado SQL/pgvector y sanitización post-recuperación de chunks de conocimiento.
   - **Constantes Centralizadas (`constants.ts`):** Definición única y tipada de pesos de riesgo, umbrales de telemetría, tiempos de vida de tokens de workload y duraciones de elevación JIT.
9. **Orquestación de Tareas en Segundo Plano y Bloqueo Distribuido (`shared/utils/cache/DistributedLock.ts`, `SubscriptionScheduler`, `EscalationScheduler`):**
   - **Bloqueos Distribuidos Mutex (`DistributedLock`):** Utiliza primitivas atómicas de Redis (`SET ... NX PX` con validación de token UUID y liberación vía scripts Lua). Si Redis no está disponible, conmuta limpiamente a mutexes locales en memoria.
   - **Daemon de Renovación y Facturación (`SubscriptionScheduler`):** Protegido por el lock `cron:subscriptions:sweep` (TTL 60s). Ejecuta la renovación automática de contratos (**BL-402**), emisión de advertencias de vencimiento a 7 días y la evaluación de la escala de impagos de la Sección 9.3 sin duplicidad de cobros ni correos en despliegues con múltiples réplicas de Node.js.
   - **Daemon de Escalado de SLAs (`EscalationScheduler`):** Protegido por el lock `cron:tickets:escalation_sweep` (TTL 50s). Evalúa tickets sin atender y los escala a Nivel 2 (**BL-104**) previniendo colisiones de reasignación entre instancias simultáneas.
   - **Cierre Limpio del Proceso (_Graceful Shutdown_):** Captura `SIGTERM` y `SIGINT` en `server/src/index.ts` deteniendo los temporizadores y liberando los recursos de red y base de datos.
10. **Arquitectura Contract-First y Delegación de Estado (`@shared/contracts` & TanStack Query):**
    - **Fuente Única de Contratos (`packages/contracts`):** Los esquemas Zod de entrada (`CreateTicketInputSchema`, `UpdateTicketStatusInputSchema`, `TicketQuerySchema`) y de salida se mantienen en el paquete compartido `@shared/contracts`. Express valida las peticiones directamente con estos esquemas, erradicando la duplicación y deriva de DTOs.
    - **Delegación de Estado de Servidor (TanStack Query):** El cliente React delega el ciclo de vida asíncrono (caché, paginación, reintentos e invalidación automática tras mutaciones) a `@tanstack/react-query` (`client/src/hooks/queries/`). `Zustand` se reserva exclusivamente para estado local de UI.
    - **Slices Verticales y Servicios Pragmáticos:** Nuevas características siguen la guía [`docs/architecture/feature-slice-recipe.md`](docs/architecture/feature-slice-recipe.md) (Contrato $\rightarrow$ Ruta/Servicio $\rightarrow$ Hook Query $\rightarrow$ Componente UI), eliminando clases de repositorio innecesarias para consultas CRUD estándar.
    - **Registro de Decisión Arquitectónica:** Documentado canónicamente en [`docs/decisions/ADR-001-contract-first-monolith-and-tanstack-query.md`](docs/decisions/ADR-001-contract-first-monolith-and-tanstack-query.md).

---

## 2. Modelos de la Base de Datos (PostgreSQL via Drizzle ORM)

La base de datos está modelada para soportar **Multi-tenancy (Multi-inquilino)** mediante la columna `tenant_id` presente en casi todas las tablas nucleares. A continuación se detallan los modelos definidos en [schema.ts](file:///c:/Users/DELL/Desktop/wordspace/msp_client_portal/server/src/shared/db/schema.ts):

| Tabla / Modelo               | Propósito                                                        | Campos Clave                                                                                                                                                                                  |
| :--------------------------- | :--------------------------------------------------------------- | :-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **tenants**                  | Inquilinos del portal (empresas cliente directas).               | `id`, `name`, `subdomain`, `rnc`, `account_status` (ACTIVE, READ_ONLY, SUSPENDED, PURGED), `read_only_at`, `suspended_at`, `purged_at`, `created_at`, `updated_at`                            |
| **users**                    | Usuarios del sistema con roles diferenciados.                    | `id`, `email`, `name`, `password_hash`, `role` (CLIENT, TECHNICIAN, ADMIN), `account_status`, `rnc`, `specialty`, `is_active`, `tenant_id`                                                    |
| **tickets**                  | Entidades de solicitudes de soporte.                             | `id`, `title`, `description`, `category` (REPAIR, WARRANTY, SERVICE_OUTAGE), `status` (OPEN, IN_PROGRESS, AWAITING_PAYMENT, etc.), `priority`, `client_id`, `assigned_tech_id`, `tenant_id`   |
| **ticket_attachments**       | Archivos adjuntos para tickets o respuestas.                     | `id`, `ticket_id`, `response_id`, `filename`, `path`, `mime_type`, `size_bytes`, `tenant_id`                                                                                                  |
| **ticket_events**            | Registro histórico de cambios de estado del ticket.              | `id`, `ticket_id`, `old_status`, `new_status`, `changed_by`, `notes`                                                                                                                          |
| **ticket_responses**         | Mensajes e interacciones (hilo de discusión) del ticket.         | `id`, `ticket_id`, `user_id`, `message`, `tenant_id`                                                                                                                                          |
| **plans**                    | Planes de suscripción disponibles en la plataforma.              | `id`, `name`, `description`, `price`, `features`, `recommended`, `client_type`, `active`                                                                                                      |
| **subscriptions**            | Suscripciones de clientes ligadas a planes.                      | `id`, `client_id`, `service_name`, `plan` (ID del plan), `status`, `renewal_date`, `equipment_count`, `paypal_order_id`, `tenant_id`                                                          |
| **subscription_equipment**   | Dispositivos/slots asignados a una suscripción (e.g. Nextcloud). | `id`, `subscription_id`, `slot_index`, `status` (PENDING_ACTIVATION, ACTIVE), `device_name`, `device_serial`, `otp`, `nextcloud_username`, `nextcloud_password`, `tenant_id`                  |
| **invoices**                 | Facturas de clientes generadas para sus suscripciones.           | `id`, `invoice_number`, `client_id`, `amount`, `tax_amount` (18% ITBIS), `total`, `currency` (USD, DOP), `ncf` (Serie B01), `rnc`, `status` (PENDING, PAID, OVERDUE), `due_date`, `tenant_id` |
| **round_robin_state**        | Estado del asignador Round-Robin para técnicos.                  | `category`, `last_assigned_tech_id`, `updated_at`                                                                                                                                             |
| **notifications**            | Notificaciones internas del sistema.                             | `id`, `user_id`, `title`, `message`, `link`, `ticket_id`, `read`, `tenant_id`                                                                                                                 |
| **notification_preferences** | Preferencias de canal por evento.                                | `id`, `user_id`, `preferences` (JSON de canales in_app, email, whatsapp por evento), `tenant_id`                                                                                              |
| **expenses**                 | Gastos operativos registrados en el sistema.                     | `id`, `amount`, `description`, `category`, `expense_date`, `tenant_id`                                                                                                                        |

---

## 3. Interfaces del Sistema

Definidas centralmente en [types/index.ts](file:///c:/Users/DELL/Desktop/wordspace/msp_client_portal/server/src/shared/types/index.ts), representan los contratos de tipos en el servidor y ayudan a mantener la integridad de datos:

- **Enums y Constantes de Dominio:**
  - `UserRole`: CLIENT, TECHNICIAN, ADMIN
  - `AccountStatus`: ACTIVE, READ_ONLY, SUSPENDED, PURGED
  - `Currency`: USD, DOP
  - `TicketStatus`: OPEN, IN_PROGRESS, AWAITING_PAYMENT, RESOLVED, CLOSED, CANCELLED
  - `TicketCategory`: REPAIR, WARRANTY, SERVICE_OUTAGE, PREVENTATIVE_MAINTENANCE, HELPDESK, AI
  - `TicketPriority`: LOW, MEDIUM, HIGH, CRITICAL
  - `SubscriptionPlan`: BASIC, STANDARD, PREMIUM, PL-001...PL-007
  - `SubscriptionStatus`: ACTIVE, EXPIRING, EXPIRED, CANCELLED
  - `InvoiceStatus`: PENDING, PAID, OVERDUE
  - `FEATURE_CODES` (24 capacidades empresariales canónicas): `HELPDESK_SUPPORT`, `SECURITY_MONITORING`, `CLOUD_STORAGE`, `BACKUP_INCLUDED`, `SLA_LEVEL`, `RMM_PATCH_MANAGEMENT`, `ONSITE_SUPPORT`, `CONTENT_FILTERING`, `PREMIUM_CONTENT_FILTERING`, `EDR_SECURITY`, `M365_BACKUP`, `EDR_M365_BACKUP`, `VULNERABILITY_SCANNING`, `IDENTITY_MFA_MANAGEMENT`, `ASSET_LIFECYCLE`, `VCIO_REVIEW`, `COMPLIANCE_AUDIT`, `REPORTING_LEVEL`, `PASSWORD_MANAGER`, `DARK_WEB_MONITORING`, `PASSWORD_DARK_WEB`, `PHISHING_TRAINING`, `STORE_DISCOUNT`, `CUSTOM_FEATURE`.
  - `FEATURE_BUNDLE_EXPANSIONS` & `expandFeatureBundles`: Motor de descomposición bidireccional de paquetes (ej. `PASSWORD_DARK_WEB` $\rightarrow$ `PASSWORD_MANAGER` + `DARK_WEB_MONITORING`, `EDR_M365_BACKUP` $\rightarrow$ `EDR_SECURITY` + `M365_BACKUP`).
- **Interfaces de Entidad:** Mapean directamente los tipos devueltos por Drizzle ORM (`Tenant`, `User`, `Ticket`, `TicketAttachment`, `TicketEvent`, `TicketResponse`, `Subscription`, `Invoice`, `RoundRobinState`, `Notification`, `NotificationPreference`, `SubscriptionEquipment`, `Expense`).
- **Interfaces Auxiliares/API:**
  - `ApiResponse<T>`: Formato estándar de respuesta HTTP.
  - `ValidationError`: Estructura para errores de validación de esquemas Zod.
  - `PaginatedResponse<T>`: Envoltura para respuestas con paginación.
  - `JwtPayload`: Atributos codificados en el token JWT (`userId`, `email`, `role`, `tenantId`).
  - `AuthTokens`: Tokens emitidos (`accessToken`, `refreshToken`).
  - `TicketFilters`: Parámetros permitidos para buscar tickets.

---

## 4. Detalle Completo de Clases, Métodos y Funciones del Backend

A continuación se detalla la estructura física del backend organizada por capas:

### 4.1. Repositorios (Capa de Acceso a Datos - `server/src/modules/<domain>/repositories/`)

Esta capa ejecuta las consultas directas en Drizzle o queries SQL brutas.

Todos los repositorios heredan CRUD genérico de la clase abstracta `BaseRepository` de Drizzle.

#### [BaseRepository.ts](./file:/c:/Users/DELL/Desktop/wordspace/msp_client_portal/server/src/shared/repositories/BaseRepository.ts)

_Ruta: `server/src/shared/repositories/BaseRepository.ts`_

##### Clase: `BaseRepository`

| Método / Función | Argumentos                                                            | Descripción / Rol                                        |
| :--------------- | :-------------------------------------------------------------------- | :------------------------------------------------------- |
| `constructor`    | `protected readonly table: any, protected readonly tableName: string` | Inicializador del componente e inyección de dependencias |
| `findById`       | `id: string`                                                          | Mapeo o funcionalidad interna                            |
| `findAll`        | `limit = 20, offset = 0`                                              | Mapeo o funcionalidad interna                            |
| `count`          | `whereClause = '', params: unknown[] = []`                            | Mapeo o funcionalidad interna                            |
| `deleteById`     | `id: string`                                                          | Mapeo o funcionalidad interna                            |

#### [EquipmentRepository.ts](./file:/c:/Users/DELL/Desktop/wordspace/msp_client_portal/server/src/modules/equipment/repositories/EquipmentRepository.ts)

_Ruta: `server/src/modules/equipment/repositories/EquipmentRepository.ts`_

##### Clase: `EquipmentRepository`

| Método / Función     | Argumentos                                                                         | Descripción / Rol                                                                                                                                                            |
| :------------------- | :--------------------------------------------------------------------------------- | :--------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------- |
| `constructor`        | `Ninguno`                                                                          | Inicializador del componente e inyección de dependencias                                                                                                                     |
| `findBySubscription` | `subscriptionId: string`                                                           | Mapeo o funcionalidad interna                                                                                                                                                |
| `findBySlot`         | `subscriptionId: string, slotIndex: number`                                        | Mapeo o funcionalidad interna                                                                                                                                                |
| `findByOtp`          | `otp: string`                                                                      | Mapeo o funcionalidad interna                                                                                                                                                |
| `create`             | `data: { subscription_id: string; slot_index: number; status: 'PENDING_ACTIVATION' | 'ACTIVE'; device_name?: string; device_serial?: string; otp?: string; otp_expires_at?: Date; nextcloud_username?: string; nextcloud_password?: string; tenant_id: string; }` | Mapeo o funcionalidad interna |
| `update`             | `id: string, data: Partial<SubscriptionEquipment>`                                 | Mapeo o funcionalidad interna                                                                                                                                                |
| `findActiveByClient` | `clientId: string, tenantId: string`                                               | Mapeo o funcionalidad interna                                                                                                                                                |
| `findAllWithDetails` | `Ninguno`                                                                          | Mapeo o funcionalidad interna                                                                                                                                                |

#### [ExpenseRepository.ts](./file:/c:/Users/DELL/Desktop/wordspace/msp_client_portal/server/src/modules/billing/repositories/ExpenseRepository.ts)

_Ruta: `server/src/modules/billing/repositories/ExpenseRepository.ts`_

##### Clase: `ExpenseRepository`

| Método / Función | Argumentos                                                                                                                         | Descripción / Rol                                        |
| :--------------- | :--------------------------------------------------------------------------------------------------------------------------------- | :------------------------------------------------------- | ----------------------------- |
| `constructor`    | `Ninguno`                                                                                                                          | Inicializador del componente e inyección de dependencias |
| `findByTenant`   | `tenantId: string, limit = 20, offset = 0`                                                                                         | Mapeo o funcionalidad interna                            |
| `countByTenant`  | `tenantId: string`                                                                                                                 | Mapeo o funcionalidad interna                            |
| `getAllForStats` | `tenantId?: string`                                                                                                                | Mapeo o funcionalidad interna                            |
| `create`         | `data: { amount: number; description: string; category: string; expense_date: Date; tenant_id: string; expense_identifier?: string | null; }`                                                 | Mapeo o funcionalidad interna |

#### [InvoiceRepository.ts](./file:/c:/Users/DELL/Desktop/wordspace/msp_client_portal/server/src/modules/billing/repositories/InvoiceRepository.ts)

_Ruta: `server/src/modules/billing/repositories/InvoiceRepository.ts`_

##### Clase: `InvoiceRepository`

| Método / Función      | Argumentos                                                                                                                                                           | Descripción / Rol                                        |
| :-------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :------------------------------------------------------- |
| `constructor`         | `Ninguno`                                                                                                                                                            | Inicializador del componente e inyección de dependencias |
| `findByTenant`        | `tenantId: string, limit = 20, offset = 0`                                                                                                                           | Mapeo o funcionalidad interna                            |
| `findByInvoiceNumber` | `invoiceNumber: string`                                                                                                                                              | Mapeo o funcionalidad interna                            |
| `create`              | `data: { invoice_number: string; client_id: string; amount: number; tax_amount: number; total: number; due_date: Date; tenant_id: string; status?: InvoiceStatus; }` | Mapeo o funcionalidad interna                            |
| `updateStatus`        | `id: string, status: InvoiceStatus`                                                                                                                                  | Mapeo o funcionalidad interna                            |
| `countByTenant`       | `tenantId: string`                                                                                                                                                   | Mapeo o funcionalidad interna                            |
| `getAllForStats`      | `tenantId?: string`                                                                                                                                                  | Mapeo o funcionalidad interna                            |

#### [NotificationPreferenceRepository.ts](./file:/c:/Users/DELL/Desktop/wordspace/msp_client_portal/server/src/modules/notifications/repositories/NotificationPreferenceRepository.ts)

_Ruta: `server/src/modules/notifications/repositories/NotificationPreferenceRepository.ts`_

##### Clase: `NotificationPreferenceRepository`

| Método / Función          | Argumentos                                                                  | Descripción / Rol                                        |
| :------------------------ | :-------------------------------------------------------------------------- | :------------------------------------------------------- |
| `constructor`             | `Ninguno`                                                                   | Inicializador del componente e inyección de dependencias |
| `findByUserId`            | `userId: string`                                                            | Mapeo o funcionalidad interna                            |
| `upsert`                  | `userId: string, tenantId: string, preferences: NotificationPreferencesMap` | Mapeo o funcionalidad interna                            |
| `getEffectivePreferences` | `userId: string`                                                            | Mapeo o funcionalidad interna                            |

#### [NotificationRepository.ts](./file:/c:/Users/DELL/Desktop/wordspace/msp_client_portal/server/src/modules/notifications/repositories/NotificationRepository.ts)

_Ruta: `server/src/modules/notifications/repositories/NotificationRepository.ts`_

##### Clase: `NotificationRepository`

| Método / Función   | Argumentos                                                                                                                                                       | Descripción / Rol                                        |
| :----------------- | :--------------------------------------------------------------------------------------------------------------------------------------------------------------- | :------------------------------------------------------- |
| `constructor`      | `Ninguno`                                                                                                                                                        | Inicializador del componente e inyección de dependencias |
| `create`           | `data: { user_id: string; title: string; message: string; link?: string; ticket_id?: string; type: string; metadata?: Record<string, any>; tenant_id: string; }` | Mapeo o funcionalidad interna                            |
| `findByUser`       | `userId: string, limit = 50, offset = 0`                                                                                                                         | Mapeo o funcionalidad interna                            |
| `getUnreadCount`   | `userId: string`                                                                                                                                                 | Mapeo o funcionalidad interna                            |
| `markAsRead`       | `id: string, userId: string`                                                                                                                                     | Mapeo o funcionalidad interna                            |
| `markAllAsRead`    | `userId: string`                                                                                                                                                 | Mapeo o funcionalidad interna                            |
| `deleteAllForUser` | `userId: string`                                                                                                                                                 | Mapeo o funcionalidad interna                            |

#### [PlanRepository.ts](./file:/c:/Users/DELL/Desktop/wordspace/msp_client_portal/server/src/modules/subscriptions/repositories/PlanRepository.ts)

_Ruta: `server/src/modules/subscriptions/repositories/PlanRepository.ts`_

##### Clase: `PlanRepository`

| Método / Función | Argumentos                                 | Descripción / Rol                                        |
| :--------------- | :----------------------------------------- | :------------------------------------------------------- | ----------------------------- | ----------------------------- |
| `constructor`    | `Ninguno`                                  | Inicializador del componente e inyección de dependencias |
| `create`         | `data: Omit<Plan, 'created_at'             | 'updated_at'>`                                           | Mapeo o funcionalidad interna |
| `update`         | `id: string, data: Partial<Omit<Plan, 'id' | 'created_at'                                             | 'updated_at'>>`               | Mapeo o funcionalidad interna |

#### [SubscriptionRepository.ts](./file:/c:/Users/DELL/Desktop/wordspace/msp_client_portal/server/src/modules/subscriptions/repositories/SubscriptionRepository.ts)

_Ruta: `server/src/modules/subscriptions/repositories/SubscriptionRepository.ts`_

##### Clase: `SubscriptionRepository`

| Método / Función                 | Argumentos                                                                                                                                                             | Descripción / Rol                                        |
| :------------------------------- | :--------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :------------------------------------------------------- |
| `constructor`                    | `Ninguno`                                                                                                                                                              | Inicializador del componente e inyección de dependencias |
| `findByTenant`                   | `tenantId: string`                                                                                                                                                     | Mapeo o funcionalidad interna                            |
| `findByClient`                   | `clientId: string`                                                                                                                                                     | Mapeo o funcionalidad interna                            |
| `findByPaypalOrderId`            | `paypalOrderId: string`                                                                                                                                                | Mapeo o funcionalidad interna                            |
| `create`                         | `data: { client_id: string; service_name: string; plan: SubscriptionPlan; equipment_count: number; renewal_date: Date; tenant_id: string; paypal_order_id?: string; }` | Mapeo o funcionalidad interna                            |
| `updatePlan`                     | `id: string, plan: SubscriptionPlan, equipmentCount?: number`                                                                                                          | Mapeo o funcionalidad interna                            |
| `updateStatus`                   | `id: string, status: SubscriptionStatus`                                                                                                                               | Mapeo o funcionalidad interna                            |
| `findPendingRenewal`             | `now: Date`                                                                                                                                                            | Mapeo o funcionalidad interna                            |
| `updateRenewal`                  | `id: string, renewalDate: Date, status: SubscriptionStatus`                                                                                                            | Mapeo o funcionalidad interna                            |
| `getActiveSubscriptionsWithPlan` | `tenantId?: string`                                                                                                                                                    | Mapeo o funcionalidad interna                            |

#### [TenantRepository.ts](./file:/c:/Users/DELL/Desktop/wordspace/msp_client_portal/server/src/modules/auth/repositories/TenantRepository.ts)

_Ruta: `server/src/modules/auth/repositories/TenantRepository.ts`_

##### Clase: `TenantRepository`

| Método / Función  | Argumentos                         | Descripción / Rol                                        |
| :---------------- | :--------------------------------- | :------------------------------------------------------- |
| `constructor`     | `Ninguno`                          | Inicializador del componente e inyección de dependencias |
| `create`          | `name: string, subdomain?: string` | Mapeo o funcionalidad interna                            |
| `findByName`      | `name: string`                     | Mapeo o funcionalidad interna                            |
| `findBySubdomain` | `subdomain: string`                | Mapeo o funcionalidad interna                            |

#### [TicketEventRepository.ts](./file:/c:/Users/DELL/Desktop/wordspace/msp_client_portal/server/src/modules/tickets/repositories/TicketEventRepository.ts)

_Ruta: `server/src/modules/tickets/repositories/TicketEventRepository.ts`_

##### Clase: `TicketEventRepository`

| Método / Función | Argumentos                                           | Descripción / Rol                                                                         |
| :--------------- | :--------------------------------------------------- | :---------------------------------------------------------------------------------------- | ----------------------------- |
| `constructor`    | `Ninguno`                                            | Inicializador del componente e inyección de dependencias                                  |
| `create`         | `data: { ticket_id: string; old_status: TicketStatus | null; new_status: TicketStatus; changed_by: string; notes?: string; tenant_id: string; }` | Mapeo o funcionalidad interna |
| `findByTicket`   | `ticketId: string`                                   | Mapeo o funcionalidad interna                                                             |

#### [TicketRepository.ts](./file:/c:/Users/DELL/Desktop/wordspace/msp_client_portal/server/src/modules/tickets/repositories/TicketRepository.ts)

_Ruta: `server/src/modules/tickets/repositories/TicketRepository.ts`_

##### Clase: `TicketRepository`

| Método / Función            | Argumentos                                                                                                                                | Descripción / Rol                                                                                  |
| :-------------------------- | :---------------------------------------------------------------------------------------------------------------------------------------- | :------------------------------------------------------------------------------------------------- | ----------------------------- |
| `constructor`               | `Ninguno`                                                                                                                                 | Inicializador del componente e inyección de dependencias                                           |
| `findById`                  | `id: string`                                                                                                                              | Mapeo o funcionalidad interna                                                                      |
| `create`                    | `data: { title: string; description: string; category: TicketCategory; priority: TicketPriority; client_id: string; equipment_id?: string | null; tenant_id: string; }`                                                                        | Mapeo o funcionalidad interna |
| `findByClient`              | `clientId: string, limit = 20, offset = 0`                                                                                                | Mapeo o funcionalidad interna                                                                      |
| `findByTechnician`          | `techId: string, limit = 20, offset = 0`                                                                                                  | Mapeo o funcionalidad interna                                                                      |
| `findWithFilters`           | `filters: TicketFilters`                                                                                                                  | Mapeo o funcionalidad interna                                                                      |
| `updateStatus`              | `id: string, status: TicketStatus`                                                                                                        | Mapeo o funcionalidad interna                                                                      |
| `assignTechnician`          | `id: string, techId: string`                                                                                                              | Mapeo o funcionalidad interna                                                                      |
| `countByStatus`             | `clientId?: string, assignedTechId?: string, tenantId?: string`                                                                           | Mapeo o funcionalidad interna                                                                      |
| `addAttachment`             | `data: { ticket_id: string; response_id?: string                                                                                          | null; filename: string; path: string; mime_type: string; size_bytes: number; tenant_id: string; }` | Mapeo o funcionalidad interna |
| `getAttachments`            | `ticketId: string`                                                                                                                        | Mapeo o funcionalidad interna                                                                      |
| `getAttachmentsByResponses` | `ticketId: string`                                                                                                                        | Mapeo o funcionalidad interna                                                                      |

#### [TicketResponseRepository.ts](./file:/c:/Users/DELL/Desktop/wordspace/msp_client_portal/server/src/modules/tickets/repositories/TicketResponseRepository.ts)

_Ruta: `server/src/modules/tickets/repositories/TicketResponseRepository.ts`_

##### Clase: `TicketResponseRepository`

| Método / Función | Argumentos                                                                          | Descripción / Rol                                        |
| :--------------- | :---------------------------------------------------------------------------------- | :------------------------------------------------------- |
| `constructor`    | `Ninguno`                                                                           | Inicializador del componente e inyección de dependencias |
| `create`         | `data: { ticket_id: string; user_id: string; message: string; tenant_id: string; }` | Mapeo o funcionalidad interna                            |
| `findByTicket`   | `ticketId: string`                                                                  | Mapeo o funcionalidad interna                            |

#### [UserRepository.ts](./file:/c:/Users/DELL/Desktop/wordspace/msp_client_portal/server/src/modules/auth/repositories/UserRepository.ts)

_Ruta: `server/src/modules/auth/repositories/UserRepository.ts`_

##### Clase: `UserRepository`

| Método / Función             | Argumentos                                                                                                                                   | Descripción / Rol                                        |
| :--------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------- | :------------------------------------------------------- | ---------- | --------------- | ----------------------------- |
| `constructor`                | `Ninguno`                                                                                                                                    | Inicializador del componente e inyección de dependencias |
| `buildFilterConditions`      | `filters: UserListFilters`                                                                                                                   | Mapeo o funcionalidad interna                            |
| `countWithFilters`           | `filters: UserListFilters`                                                                                                                   | Mapeo o funcionalidad interna                            |
| `countByRole`                | `Ninguno`                                                                                                                                    | Mapeo o funcionalidad interna                            |
| `countByStatus`              | `Ninguno`                                                                                                                                    | Mapeo o funcionalidad interna                            |
| `updateRole`                 | `id: string, role: UserRole`                                                                                                                 | Mapeo o funcionalidad interna                            |
| `updateStatus`               | `id: string, isActive: boolean`                                                                                                              | Mapeo o funcionalidad interna                            |
| `findByEmail`                | `email: string`                                                                                                                              | Mapeo o funcionalidad interna                            |
| `findByRole`                 | `role: UserRole`                                                                                                                             | Mapeo o funcionalidad interna                            |
| `findClientsByTenant`        | `tenantId: string`                                                                                                                           | Mapeo o funcionalidad interna                            |
| `findAllClients`             | `Ninguno`                                                                                                                                    | Mapeo o funcionalidad interna                            |
| `findTechniciansBySpecialty` | `specialty: string`                                                                                                                          | Mapeo o funcionalidad interna                            |
| `findActiveTechnicians`      | `Ninguno`                                                                                                                                    | Mapeo o funcionalidad interna                            |
| `create`                     | `data: { email: string; name: string; password_hash: string; role?: UserRole; language?: string; tenant_id: string; client_type?: string; }` | Mapeo o funcionalidad interna                            |
| `updateProfile`              | `id: string, data: Partial<Pick<User, 'name'                                                                                                 | 'email'                                                  | 'language' | 'avatar_url'>>` | Mapeo o funcionalidad interna |
| `verifyEmail`                | `id: string`                                                                                                                                 | Mapeo o funcionalidad interna                            |
| `setOTP`                     | `id: string, otpCode: string, otpExpires: Date`                                                                                              | Mapeo o funcionalidad interna                            |
| `updatePassword`             | `id: string, passwordHash: string`                                                                                                           | Mapeo o funcionalidad interna                            |
| `updateLastLogin`            | `id: string, ip: string`                                                                                                                     | Mapeo o funcionalidad interna                            |

##### Interfaces definidas:

- `UserListFilters`

---

### 4.2. Servicios (Capa de Lógica de Negocio - `server/src/modules/<domain>/services/`)

Esta capa orquesta las transacciones, valida reglas complejas (como SLAs y límites de equipos), distribuye llamadas de correo o facturación.

#### [AssignmentService.ts](./file:/c:/Users/DELL/Desktop/wordspace/msp_client_portal/server/src/modules/tickets/services/AssignmentService.ts)

_Ruta: `server/src/modules/tickets/services/AssignmentService.ts`_

##### Clase: `AssignmentService`

| Método / Función    | Argumentos                                              | Descripción / Rol             |
| :------------------ | :------------------------------------------------------ | :---------------------------- |
| `getNextTechnician` | `category: TicketCategory, requestedSpecialty?: string` | Mapeo o funcionalidad interna |

#### [AuthService.ts](./file:/c:/Users/DELL/Desktop/wordspace/msp_client_portal/server/src/modules/auth/services/AuthService.ts)

_Ruta: `server/src/modules/auth/services/AuthService.ts`_

##### Clase: `AuthService`

| Método / Función | Argumentos                                 | Descripción / Rol             |
| :--------------- | :----------------------------------------- | :---------------------------- |
| `register`       | `data: RegisterInput`                      | Mapeo o funcionalidad interna |
| `login`          | `data: LoginInput, ipAddress: string`      | Mapeo o funcionalidad interna |
| `googleAuth`     | `data: GoogleAuthInput, ipAddress: string` | Mapeo o funcionalidad interna |
| `refreshToken`   | `refreshToken: string`                     | Mapeo o funcionalidad interna |
| `verifyEmail`    | `email: string, otp: string`               | Mapeo o funcionalidad interna |
| `forgotPassword` | `email: string`                            | Mapeo o funcionalidad interna |
| `resetPassword`  | `token: string, newPassword: string`       | Mapeo o funcionalidad interna |
| `generateTokens` | `payload: JwtPayload`                      | Mapeo o funcionalidad interna |

#### [EquipmentService.ts](./file:/c:/Users/DELL/Desktop/wordspace/msp_client_portal/server/src/modules/equipment/services/EquipmentService.ts)

_Ruta: `server/src/modules/equipment/services/EquipmentService.ts`_

##### Clase: `EquipmentService`

| Método / Función            | Argumentos                                                                                                                                               | Descripción / Rol                                                                                                   |
| :-------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------- | :------------------------------------------------------------------------------------------------------------------ |
| `getEquipmentSlots`         | `subscriptionId: string, tenantId: string, byAdmin = false`                                                                                              | Mapeo o funcionalidad interna                                                                                       |
| `generateSlotOTP`           | `subscriptionId: string, slotIndex: number, tenantId: string, byAdmin = false`                                                                           | Mapeo o funcionalidad interna                                                                                       |
| `activateSlot`              | `options: { subscriptionId?: string; slotIndex?: number; otp?: string; deviceName: string; deviceSerial: string; tenantId: string; byAdmin?: boolean; }` | Mapeo o funcionalidad interna                                                                                       |
| `deactivateSlot`            | `subscriptionId: string, slotIndex: number, tenantId: string, byAdmin = false`                                                                           | Mapeo o funcionalidad interna                                                                                       |
| `getActiveDevicesForClient` | `clientId: string, tenantId: string`                                                                                                                     | Mapeo o funcionalidad interna                                                                                       |
| `getAllDevicesForAdmin`     | `Ninguno`                                                                                                                                                | Mapeo o funcionalidad interna                                                                                       |
| `resolveLiveAgentStatus`    | `device: SubscriptionEquipment`                                                                                                                          | Determina el estado ONLINE u OFFLINE según socket WebSocket activo o ventana de recencia de 15 minutos.             |
| `reconcileEquipmentSlots`   | `Ninguno`                                                                                                                                                | Barre y limpia slots zombis en PENDING_ACTIVATION que duplican seriales ya activos para restaurar invariante 1 a 1. |

#### [ExpenseService.ts](./file:/c:/Users/DELL/Desktop/wordspace/msp_client_portal/server/src/modules/billing/services/ExpenseService.ts)

_Ruta: `server/src/modules/billing/services/ExpenseService.ts`_

##### Clase: `ExpenseService`

| Método / Función | Argumentos                                                                                                                         | Descripción / Rol             |
| :--------------- | :--------------------------------------------------------------------------------------------------------------------------------- | :---------------------------- | ----------------------------- |
| `getExpenses`    | `tenantId: string, userRole: UserRole, page = 1, limit = 20`                                                                       | Mapeo o funcionalidad interna |
| `getExpenseById` | `id: string, tenantId: string, userRole: UserRole`                                                                                 | Mapeo o funcionalidad interna |
| `createExpense`  | `data: { amount: number; description: string; category: string; expense_date: Date; tenant_id: string; expense_identifier?: string | null; }, userRole: UserRole`  | Mapeo o funcionalidad interna |
| `deleteExpense`  | `id: string, tenantId: string, userRole: UserRole`                                                                                 | Mapeo o funcionalidad interna |

#### [InvoiceService.ts](./file:/c:/Users/DELL/Desktop/wordspace/msp_client_portal/server/src/modules/billing/services/InvoiceService.ts)

_Ruta: `server/src/modules/billing/services/InvoiceService.ts`_

##### Clase: `InvoiceService`

| Método / Función     | Argumentos                                                                | Descripción / Rol             |
| :------------------- | :------------------------------------------------------------------------ | :---------------------------- | ------- | ----------------------------- |
| `getClientInvoices`  | `tenantId: string, userRole: UserRole, page = 1, limit = 20`              | Mapeo o funcionalidad interna |
| `getInvoiceById`     | `id: string, tenantId: string, userRole: UserRole`                        | Mapeo o funcionalidad interna |
| `createPaypalOrder`  | `id: string, tenantId: string, userRole: UserRole`                        | Mapeo o funcionalidad interna |
| `capturePaypalOrder` | `id: string, paypalOrderId: string, tenantId: string, userRole: UserRole` | Mapeo o funcionalidad interna |
| `downloadInvoice`    | `id: string, tenantId: string, userRole: UserRole, lang?: string`         | Mapeo o funcionalidad interna |
| `getFinancialStats`  | `tenantId: string, userRole: UserRole, range: '30_days'                   | 'quarter'                     | 'year'` | Mapeo o funcionalidad interna |
| `Date`               | `allInvoices[0].invoice_date`                                             | Mapeo o funcionalidad interna |

#### [NextcloudService.ts](./file:/c:/Users/DELL/Desktop/wordspace/msp_client_portal/server/src/modules/system/services/NextcloudService.ts)

_Ruta: `server/src/modules/system/services/NextcloudService.ts`_

##### Clase: `NextcloudService`

| Método / Función    | Argumentos                                                                             | Descripción / Rol             |
| :------------------ | :------------------------------------------------------------------------------------- | :---------------------------- |
| `getStorageUsage`   | `Ninguno`                                                                              | Mapeo o funcionalidad interna |
| `parseQuotaXml`     | `xmlText: string`                                                                      | Mapeo o funcionalidad interna |
| `provisionUser`     | `options: { username: string; email?: string; quota?: string; displayName?: string; }` | Mapeo o funcionalidad interna |
| `Error`             | ``Nextcloud OCS error (${statusCode}`                                                  | Mapeo o funcionalidad interna |
| `deleteUser`        | `username: string`                                                                     | Mapeo o funcionalidad interna |
| `Error`             | ``Nextcloud OCS error (${statusCode}`                                                  | Mapeo o funcionalidad interna |
| `getUserStorage`    | `username: string`                                                                     | Mapeo o funcionalidad interna |
| `Error`             | ``Nextcloud OCS error (${statusCode}`                                                  | Mapeo o funcionalidad interna |
| `getFallbackStatus` | `Ninguno`                                                                              | Mapeo o funcionalidad interna |

##### Interfaces definidas:

- `StorageStatus`

#### [ClientHealthService.ts](file:///c:/Users/eapolanco/Workspace/msp_client_portal/server/src/modules/system/services/ClientHealthService.ts)

_Ruta: `server/src/modules/system/services/ClientHealthService.ts`_

##### Clase: `ClientHealthService`

| Método / Función | Argumentos         | Descripción / Rol                                                                                                                                                                                                                     |
| :--------------- | :----------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `calculateScore` | `tenantId: string` | Evalúa el puntaje compuesto de salud del inquilino según la regla BL-601 ($H = 0.40 S_{\text{ticket}} + 0.30 S_{\text{hardware}} + 0.30 S_{\text{security}}$), genera recomendaciones operativas y activa revisión QBR si $H < 70\%$. |

##### Interfaces definidas:

- `ClientHealthReport`

#### [TechnicianEarningsService.ts](file:///c:/Users/eapolanco/Workspace/msp_client_portal/server/src/modules/system/services/TechnicianEarningsService.ts)

_Ruta: `server/src/modules/system/services/TechnicianEarningsService.ts`_

##### Clase: `TechnicianEarningsService`

| Método / Función                | Argumentos                                                     | Descripción / Rol                                                                                                                                                                                    |
| :------------------------------ | :------------------------------------------------------------- | :--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `calculateAndRecordEarnings`    | `ticket: Ticket, technicianId: string, tenantId: string`       | Calcula base rate × multiplicador de prioridad + bono SLA, registra el pago en `technician_earnings` y genera asiento de gasto operativo pre-split en `expenses` (`Labor & Technician Commissions`). |
| `voidEarningsForReopenedTicket` | `ticketId: string, tenantId?: string`                          | Anula automáticamente comisiones pendientes si el ticket es reabierto durante el período de retención de 48 horas.                                                                                   |
| `getTechnicianEarnings`         | `technicianId: string, tenantId: string, page = 1, limit = 50` | Retorna el resumen consolidado de ganancias, tasa de adherencia a SLA y listado paginado para el técnico autenticado.                                                                                |
| `getAdminEarningsOverview`      | `tenantId: string, status?: string, page = 1, limit = 50`      | Retorna la nómina global de comisiones para revisión administrativa y conciliación de pagos.                                                                                                         |
| `processBatchPayout`            | `earningIds: string[], ctx: UserContext`                       | Procesa en lote el desembolso de comisiones marcándolas como `PAID` con timestamp de pago.                                                                                                           |
| `updateRates`                   | `data: Partial<TechnicianRate>, ctx: UserContext`              | Configura tasas base de comisión, bonos SLA y multiplicadores por prioridad.                                                                                                                         |

##### Interfaces definidas:

- `TechnicianEarning`
- `TechnicianRate`
- `TechnicianEarningsSummary`
- `TechnicianEarningBreakdown`

#### [NotificationPreferenceService.ts](./file:/c:/Users/DELL/Desktop/wordspace/msp_client_portal/server/src/modules/notifications/services/NotificationPreferenceService.ts)

_Ruta: `server/src/modules/notifications/services/NotificationPreferenceService.ts`_

##### Clase: `NotificationPreferenceService`

| Método / Función    | Argumentos                                                                  | Descripción / Rol             |
| :------------------ | :-------------------------------------------------------------------------- | :---------------------------- | ----------- | ----------------------------- |
| `getPreferences`    | `userId: string`                                                            | Mapeo o funcionalidad interna |
| `updatePreferences` | `userId: string, tenantId: string, preferences: NotificationPreferencesMap` | Mapeo o funcionalidad interna |
| `shouldNotify`      | `userId: string, eventType: NotificationEventType, channel: 'in_app'        | 'email'                       | 'whatsapp'` | Mapeo o funcionalidad interna |

#### [NotificationService.ts](./file:/c:/Users/DELL/Desktop/wordspace/msp_client_portal/server/src/modules/notifications/services/NotificationService.ts)

_Ruta: `server/src/modules/notifications/services/NotificationService.ts`_

##### Clase: `NotificationService`

| Método / Función          | Argumentos                                                                                                                                                    | Descripción / Rol             |
| :------------------------ | :------------------------------------------------------------------------------------------------------------------------------------------------------------ | :---------------------------- |
| `registerSSEClient`       | `userId: string, res: Response`                                                                                                                               | Mapeo o funcionalidad interna |
| `sendRealTimeUpdate`      | `userId: string, event: string, data: any`                                                                                                                    | Mapeo o funcionalidad interna |
| `createInAppNotification` | `data: { userId: string; title: string; message: string; link?: string; ticketId?: string; type: string; metadata?: Record<string, any>; tenantId: string; }` | Mapeo o funcionalidad interna |
| `onTicketCreated`         | `ticket: Ticket, client: User`                                                                                                                                | Mapeo o funcionalidad interna |
| `onTicketStatusChanged`   | `ticket: Ticket, client: User, notes?: string`                                                                                                                | Mapeo o funcionalidad interna |
| `onTicketAssigned`        | `ticket: Ticket, technician: User`                                                                                                                            | Mapeo o funcionalidad interna |
| `onTicketResponseCreated` | `ticket: Ticket, recipient: User, senderName: string, message: string`                                                                                        | Mapeo o funcionalidad interna |

#### [PaypalService.ts](./file:/c:/Users/DELL/Desktop/wordspace/msp_client_portal/server/src/modules/billing/services/PaypalService.ts)

_Ruta: `server/src/modules/billing/services/PaypalService.ts`_

##### Clase: `PaypalService`

| Método / Función             | Argumentos                                                                                    | Descripción / Rol             |
| :--------------------------- | :-------------------------------------------------------------------------------------------- | :---------------------------- | ----------------------------- |
| `baseUrl`                    | `Ninguno`                                                                                     | Mapeo o funcionalidad interna |
| `isMockMode`                 | `Ninguno`                                                                                     | Mapeo o funcionalidad interna |
| `getAccessToken`             | `Ninguno`                                                                                     | Mapeo o funcionalidad interna |
| `createOrder`                | `invoice: Invoice`                                                                            | Mapeo o funcionalidad interna |
| `captureOrder`               | `paypalOrderId: string`                                                                       | Mapeo o funcionalidad interna |
| `getOrder`                   | `paypalOrderId: string`                                                                       | Mapeo o funcionalidad interna |
| `createOrderForAmount`       | `amount: number, description: string, referenceId: string`                                    | Mapeo o funcionalidad interna |
| `createProduct`              | `name: string, description: string`                                                           | Mapeo o funcionalidad interna |
| `createPlan`                 | `productId: string, name: string, description: string, price: number, billingCycle: 'monthly' | 'annual'`                     | Mapeo o funcionalidad interna |
| `createSubscription`         | `paypalPlanId: string, quantity: number, returnUrl: string, cancelUrl: string`                | Mapeo o funcionalidad interna |
| `getSubscription`            | `subscriptionId: string`                                                                      | Mapeo o funcionalidad interna |
| `updateSubscriptionQuantity` | `subscriptionId: string, quantity: number`                                                    | Mapeo o funcionalidad interna |

#### [PlanService.ts](./file:/c:/Users/DELL/Desktop/wordspace/msp_client_portal/server/src/modules/<domain>/services/PlanService.ts)

_Ruta: `server/src/modules/<domain>/services/PlanService.ts`_

##### Clase: `PlanService`

| Método / Función | Argumentos                          | Descripción / Rol             |
| :--------------- | :---------------------------------- | :---------------------------- |
| `getAllPlans`    | `includeInactive = false`           | Mapeo o funcionalidad interna |
| `getPlanById`    | `id: string`                        | Mapeo o funcionalidad interna |
| `createPlan`     | `data: CreatePlanInput`             | Mapeo o funcionalidad interna |
| `updatePlan`     | `id: string, data: UpdatePlanInput` | Mapeo o funcionalidad interna |

#### [SubscriptionScheduler.ts](./file:/c:/Users/DELL/Desktop/wordspace/msp_client_portal/server/src/modules/subscriptions/services/SubscriptionScheduler.ts)

_Ruta: `server/src/modules/subscriptions/services/SubscriptionScheduler.ts`_

##### Clase: `SubscriptionScheduler`

| Método / Función             | Argumentos           | Descripción / Rol             |
| :--------------------------- | :------------------- | :---------------------------- |
| `start`                      | `intervalMs = 15000` | Mapeo o funcionalidad interna |
| `stop`                       | `Ninguno`            | Mapeo o funcionalidad interna |
| `checkAndRenewSubscriptions` | `Ninguno`            | Mapeo o funcionalidad interna |
| `renewSubscription`          | `sub: Subscription`  | Mapeo o funcionalidad interna |

#### [SubscriptionService.ts](./file:/c:/Users/DELL/Desktop/wordspace/msp_client_portal/server/src/modules/subscriptions/services/SubscriptionService.ts)

_Ruta: `server/src/modules/subscriptions/services/SubscriptionService.ts`_

##### Clase: `SubscriptionService`

| Método / Función                   | Argumentos                                                                           | Descripción / Rol                                                                                                                                                                                    |
| :--------------------------------- | :----------------------------------------------------------------------------------- | :--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------- |
| `getClientSubscriptions`           | `tenantId: string`                                                                   | Mapeo o funcionalidad interna                                                                                                                                                                        |
| `getSubscriptionById`              | `id: string, tenantId: string`                                                       | Mapeo o funcionalidad interna                                                                                                                                                                        |
| `createPaypalOrderForSubscription` | `data: { plan: string; equipmentCount: number; billingCycle?: 'monthly'              | 'annual'; currentSubscriptionId?: string }`                                                                                                                                                          | Mapeo o funcionalidad interna |
| `createPaypalSubscription`         | `data: { plan: string; equipmentCount: number; billingCycle?: 'monthly'              | 'annual' }`                                                                                                                                                                                          | Mapeo o funcionalidad interna |
| `createSubscription`               | `data: CreateSubscriptionInput, clientId: string, tenantId: string, byAdmin = false` | Mapeo o funcionalidad interna                                                                                                                                                                        |
| `updateSubscription`               | `id: string, data: UpdateSubscriptionInput, tenantId: string, byAdmin = false`       | Mapeo o funcionalidad interna                                                                                                                                                                        |
| `sendQuotation`                    | `data: SendQuoteInput, senderUserId: string, senderTenantId: string, role: string`   | Mapeo o funcionalidad interna                                                                                                                                                                        |
| `getClientActiveFeatures`          | `tenantId: string`                                                                   | Resuelve la unión de todas las características activas de los planes asociados a suscripciones en estado ACTIVE o EXPIRING del tenant, aplicando descomposición de bundles vía expandFeatureBundles. |

#### [TicketService.ts](./file:/c:/Users/DELL/Desktop/wordspace/msp_client_portal/server/src/modules/<domain>/services/TicketService.ts)

_Ruta: `server/src/modules/<domain>/services/TicketService.ts`_

##### Clase: `TicketService`

| Método / Función       | Argumentos                                                                                                                                                                   | Descripción / Rol             |
| :--------------------- | :--------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :---------------------------- |
| `createTicket`         | `data: CreateTicketInput, clientId: string, tenantId: string`                                                                                                                | Mapeo o funcionalidad interna |
| `getTicketById`        | `ticketId: string, _userId: string, userRole: UserRole, tenantId: string`                                                                                                    | Mapeo o funcionalidad interna |
| `getTickets`           | `filters: TicketFilters, userId: string, userRole: UserRole, tenantId: string,`                                                                                              | Mapeo o funcionalidad interna |
| `updateTicketStatus`   | `ticketId: string, data: UpdateTicketStatusInput, userId: string, userRole: UserRole, tenantId: string,`                                                                     | Mapeo o funcionalidad interna |
| `getTicketTimeline`    | `ticketId: string, userId: string, userRole: UserRole, tenantId: string`                                                                                                     | Mapeo o funcionalidad interna |
| `getTicketAttachments` | `ticketId: string, userId: string, userRole: UserRole, tenantId: string`                                                                                                     | Mapeo o funcionalidad interna |
| `addAttachment`        | `ticketId: string, file: { filename: string; path: string; mimetype: string; size: number }, userId: string, userRole: UserRole, tenantId: string,`                          | Mapeo o funcionalidad interna |
| `getStatusSummary`     | `userId: string, userRole: UserRole, tenantId: string`                                                                                                                       | Mapeo o funcionalidad interna |
| `assignTicket`         | `ticketId: string, techId: string, userId: string,`                                                                                                                          | Mapeo o funcionalidad interna |
| `enforceSLARule`       | `ticket: Ticket`                                                                                                                                                             | Mapeo o funcionalidad interna |
| `getTicketResponses`   | `ticketId: string, userId: string, userRole: UserRole, tenantId: string,`                                                                                                    | Mapeo o funcionalidad interna |
| `addTicketResponse`    | `ticketId: string, message: string, userId: string, userRole: UserRole, tenantId: string, files: { filename: string; path: string; mimetype: string; size: number }[] = [],` | Mapeo o funcionalidad interna |

#### [UserService.ts](./file:/c:/Users/DELL/Desktop/wordspace/msp_client_portal/server/src/modules/auth/services/UserService.ts)

_Ruta: `server/src/modules/auth/services/UserService.ts`_

##### Clase: `UserService`

| Método / Función   | Argumentos                                                                                      | Descripción / Rol             |
| :----------------- | :---------------------------------------------------------------------------------------------- | :---------------------------- |
| `getProfile`       | `userId: string`                                                                                | Mapeo o funcionalidad interna |
| `updateProfile`    | `userId: string, data: UpdateProfileInput`                                                      | Mapeo o funcionalidad interna |
| `changePassword`   | `userId: string, data: ChangePasswordInput`                                                     | Mapeo o funcionalidad interna |
| `getTechnicians`   | `Ninguno`                                                                                       | Mapeo o funcionalidad interna |
| `getClients`       | `Ninguno`                                                                                       | Mapeo o funcionalidad interna |
| `getAllUsers`      | `params: { page?: number; limit?: number; role?: string; isActive?: string; search?: string; }` | Mapeo o funcionalidad interna |
| `updateUserRole`   | `adminUserId: string, targetUserId: string, newRole: UserRole`                                  | Mapeo o funcionalidad interna |
| `toggleUserStatus` | `adminUserId: string, targetUserId: string, isActive: boolean`                                  | Mapeo o funcionalidad interna |
| `getUserStats`     | `Ninguno`                                                                                       | Mapeo o funcionalidad interna |

##### Interfaces definidas:

- `UserListResponse`
- `UserStats`

---

### 4.3. Controladores (Capa de Entrada y Respuestas - `server/src/modules/<domain>/controllers/`)

Reciben peticiones HTTP de Express, extraen parámetros y llaman a la capa de Servicios.

#### [AuthController.ts](./file:/c:/Users/DELL/Desktop/wordspace/msp_client_portal/server/src/modules/auth/controllers/AuthController.ts)

_Ruta: `server/src/modules/auth/controllers/AuthController.ts`_

##### Clase: `AuthController`

| Método / Función | Argumentos                    | Descripción / Rol             |
| :--------------- | :---------------------------- | :---------------------------- |
| `register`       | `req: Request, res: Response` | Mapeo o funcionalidad interna |
| `googleAuth`     | `req: Request, res: Response` | Mapeo o funcionalidad interna |
| `login`          | `req: Request, res: Response` | Mapeo o funcionalidad interna |
| `refreshToken`   | `req: Request, res: Response` | Mapeo o funcionalidad interna |
| `forgotPassword` | `req: Request, res: Response` | Mapeo o funcionalidad interna |
| `resetPassword`  | `req: Request, res: Response` | Mapeo o funcionalidad interna |
| `verifyEmail`    | `req: Request, res: Response` | Mapeo o funcionalidad interna |

#### [EquipmentController.ts](./file:/c:/Users/DELL/Desktop/wordspace/msp_client_portal/server/src/modules/equipment/controllers/EquipmentController.ts)

_Ruta: `server/src/modules/equipment/controllers/EquipmentController.ts`_

##### Clase: `EquipmentController`

| Método / Función        | Argumentos                                         | Descripción / Rol             |
| :---------------------- | :------------------------------------------------- | :---------------------------- |
| `getSlots`              | `req: Request, res: Response, next: NextFunction`  | Mapeo o funcionalidad interna |
| `generateOTP`           | `req: Request, res: Response, next: NextFunction`  | Mapeo o funcionalidad interna |
| `activateSlot`          | `req: Request, res: Response, next: NextFunction`  | Mapeo o funcionalidad interna |
| `deactivateSlot`        | `req: Request, res: Response, next: NextFunction`  | Mapeo o funcionalidad interna |
| `getMyDevices`          | `req: Request, res: Response, next: NextFunction`  | Mapeo o funcionalidad interna |
| `getAllDevicesForAdmin` | `_req: Request, res: Response, next: NextFunction` | Mapeo o funcionalidad interna |

#### [ExpenseController.ts](./file:/c:/Users/DELL/Desktop/wordspace/msp_client_portal/server/src/modules/billing/controllers/ExpenseController.ts)

_Ruta: `server/src/modules/billing/controllers/ExpenseController.ts`_

##### Clase: `ExpenseController`

| Método / Función | Argumentos                                        | Descripción / Rol             |
| :--------------- | :------------------------------------------------ | :---------------------------- |
| `getAll`         | `req: Request, res: Response, next: NextFunction` | Mapeo o funcionalidad interna |
| `getById`        | `req: Request, res: Response, next: NextFunction` | Mapeo o funcionalidad interna |
| `create`         | `req: Request, res: Response, next: NextFunction` | Mapeo o funcionalidad interna |
| `delete`         | `req: Request, res: Response, next: NextFunction` | Mapeo o funcionalidad interna |

#### [InvoiceController.ts](./file:/c:/Users/DELL/Desktop/wordspace/msp_client_portal/server/src/modules/billing/controllers/InvoiceController.ts)

_Ruta: `server/src/modules/billing/controllers/InvoiceController.ts`_

##### Clase: `InvoiceController`

| Método / Función     | Argumentos                    | Descripción / Rol             |
| :------------------- | :---------------------------- | :---------------------------- |
| `getAll`             | `req: Request, res: Response` | Mapeo o funcionalidad interna |
| `getById`            | `req: Request, res: Response` | Mapeo o funcionalidad interna |
| `createPaypalOrder`  | `req: Request, res: Response` | Mapeo o funcionalidad interna |
| `capturePaypalOrder` | `req: Request, res: Response` | Mapeo o funcionalidad interna |
| `download`           | `req: Request, res: Response` | Mapeo o funcionalidad interna |

#### [TechnicianEarningsController.ts](file:///c:/Users/eapolanco/Workspace/msp_client_portal/server/src/modules/system/controllers/TechnicianEarningsController.ts)

_Ruta: `server/src/modules/system/controllers/TechnicianEarningsController.ts`_

##### Clase: `TechnicianEarningsController`

| Método / Función           | Argumentos                    | Descripción / Rol                                                                                                                       |
| :------------------------- | :---------------------------- | :-------------------------------------------------------------------------------------------------------------------------------------- |
| `getMyEarnings`            | `req: Request, res: Response` | `GET /api/v1/system/technicians/me/earnings` — Retorna comisiones, bono SLA y desglose de tickets cerrados para el técnico autenticado. |
| `getAdminEarningsOverview` | `req: Request, res: Response` | `GET /api/v1/system/technicians/earnings` — Retorna nómina general y desglose de desembolsos para administradores.                      |
| `processBatchPayout`       | `req: Request, res: Response` | `POST /api/v1/system/technicians/earnings/payout` — Procesa pago por lote marcando registros seleccionados como `PAID`.                 |
| `updateRates`              | `req: Request, res: Response` | `PUT /api/v1/system/technicians/rates` — Configura tasas base, bono SLA y multiplicadores.                                              |

#### [NotificationController.ts](./file:/c:/Users/DELL/Desktop/wordspace/msp_client_portal/server/src/modules/notifications/controllers/NotificationController.ts)

_Ruta: `server/src/modules/notifications/controllers/NotificationController.ts`_

##### Clase: `NotificationController`

| Método / Función | Argumentos                    | Descripción / Rol             |
| :--------------- | :---------------------------- | :---------------------------- |
| `getAll`         | `req: Request, res: Response` | Mapeo o funcionalidad interna |
| `markAsRead`     | `req: Request, res: Response` | Mapeo o funcionalidad interna |
| `markAllAsRead`  | `req: Request, res: Response` | Mapeo o funcionalidad interna |
| `clearAll`       | `req: Request, res: Response` | Mapeo o funcionalidad interna |
| `stream`         | `req: Request, res: Response` | Mapeo o funcionalidad interna |

#### [NotificationPreferenceController.ts](./file:/c:/Users/DELL/Desktop/wordspace/msp_client_portal/server/src/modules/notifications/controllers/NotificationPreferenceController.ts)

_Ruta: `server/src/modules/notifications/controllers/NotificationPreferenceController.ts`_

##### Clase: `NotificationPreferenceController`

| Método / Función    | Argumentos                    | Descripción / Rol             |
| :------------------ | :---------------------------- | :---------------------------- |
| `getPreferences`    | `req: Request, res: Response` | Mapeo o funcionalidad interna |
| `updatePreferences` | `req: Request, res: Response` | Mapeo o funcionalidad interna |

#### [PlanController.ts](./file:/c:/Users/DELL/Desktop/wordspace/msp_client_portal/server/src/modules/subscriptions/controllers/PlanController.ts)

_Ruta: `server/src/modules/subscriptions/controllers/PlanController.ts`_

##### Clase: `PlanController`

| Método / Función | Argumentos                    | Descripción / Rol             |
| :--------------- | :---------------------------- | :---------------------------- |
| `getAll`         | `req: Request, res: Response` | Mapeo o funcionalidad interna |
| `getById`        | `req: Request, res: Response` | Mapeo o funcionalidad interna |
| `create`         | `req: Request, res: Response` | Mapeo o funcionalidad interna |
| `update`         | `req: Request, res: Response` | Mapeo o funcionalidad interna |

#### [SubscriptionController.ts](./file:/c:/Users/DELL/Desktop/wordspace/msp_client_portal/server/src/modules/subscriptions/controllers/SubscriptionController.ts)

_Ruta: `server/src/modules/subscriptions/controllers/SubscriptionController.ts`_

##### Clase: `SubscriptionController`

| Método / Función           | Argumentos                                        | Descripción / Rol                                                                                                                                  |
| :------------------------- | :------------------------------------------------ | :------------------------------------------------------------------------------------------------------------------------------------------------- |
| `getAll`                   | `req: Request, res: Response`                     | Mapeo o funcionalidad interna                                                                                                                      |
| `getById`                  | `req: Request, res: Response`                     | Mapeo o funcionalidad interna                                                                                                                      |
| `create`                   | `req: Request, res: Response`                     | Mapeo o funcionalidad interna                                                                                                                      |
| `createPaypalOrder`        | `req: Request, res: Response, next: NextFunction` | Mapeo o funcionalidad interna                                                                                                                      |
| `createPaypalSubscription` | `req: Request, res: Response, next: NextFunction` | Mapeo o funcionalidad interna                                                                                                                      |
| `update`                   | `req: Request, res: Response`                     | Mapeo o funcionalidad interna                                                                                                                      |
| `sendQuote`                | `req: Request, res: Response`                     | Mapeo o funcionalidad interna                                                                                                                      |
| `getActiveFeatures`        | `req: Request, res: Response, next: NextFunction` | Retorna la lista de características y servicios activos para el tenant autenticado mediante el endpoint GET /api/v1/subscriptions/features/active. |

#### [SystemController.ts](./file:/c:/Users/DELL/Desktop/wordspace/msp_client_portal/server/src/modules/system/controllers/SystemController.ts)

_Ruta: `server/src/modules/system/controllers/SystemController.ts`_

##### Clase: `SystemController`

| Método / Función   | Argumentos                                         | Descripción / Rol                                                                               |
| :----------------- | :------------------------------------------------- | :---------------------------------------------------------------------------------------------- |
| `getStorageStatus` | `_req: Request, res: Response, next: NextFunction` | Mapeo o funcionalidad interna                                                                   |
| `getClientHealth`  | `req: Request, res: Response`                      | Consulta el reporte de salud compuesto de un inquilino (BL-601) y retorna `ClientHealthReport`. |

#### [TicketController.ts](./file:/c:/Users/DELL/Desktop/wordspace/msp_client_portal/server/src/modules/tickets/controllers/TicketController.ts)

_Ruta: `server/src/modules/tickets/controllers/TicketController.ts`_

##### Clase: `TicketController`

| Método / Función   | Argumentos                    | Descripción / Rol             |
| :----------------- | :---------------------------- | :---------------------------- |
| `create`           | `req: Request, res: Response` | Mapeo o funcionalidad interna |
| `getAll`           | `req: Request, res: Response` | Mapeo o funcionalidad interna |
| `getById`          | `req: Request, res: Response` | Mapeo o funcionalidad interna |
| `updateStatus`     | `req: Request, res: Response` | Mapeo o funcionalidad interna |
| `getTimeline`      | `req: Request, res: Response` | Mapeo o funcionalidad interna |
| `getAttachments`   | `req: Request, res: Response` | Mapeo o funcionalidad interna |
| `uploadAttachment` | `req: Request, res: Response` | Mapeo o funcionalidad interna |
| `getStatusSummary` | `req: Request, res: Response` | Mapeo o funcionalidad interna |
| `assign`           | `req: Request, res: Response` | Mapeo o funcionalidad interna |
| `getResponses`     | `req: Request, res: Response` | Mapeo o funcionalidad interna |
| `createResponse`   | `req: Request, res: Response` | Mapeo o funcionalidad interna |

#### [UserController.ts](./file:/c:/Users/DELL/Desktop/wordspace/msp_client_portal/server/src/modules/auth/controllers/UserController.ts)

_Ruta: `server/src/modules/auth/controllers/UserController.ts`_

##### Clase: `UserController`

| Método / Función | Argumentos                     | Descripción / Rol             |
| :--------------- | :----------------------------- | :---------------------------- |
| `getProfile`     | `req: Request, res: Response`  | Mapeo o funcionalidad interna |
| `updateProfile`  | `req: Request, res: Response`  | Mapeo o funcionalidad interna |
| `changePassword` | `req: Request, res: Response`  | Mapeo o funcionalidad interna |
| `getTechnicians` | `_req: Request, res: Response` | Mapeo o funcionalidad interna |
| `uploadAvatar`   | `req: Request, res: Response`  | Mapeo o funcionalidad interna |
| `getClients`     | `_req: Request, res: Response` | Mapeo o funcionalidad interna |
| `getAllUsers`    | `req: Request, res: Response`  | Mapeo o funcionalidad interna |
| `Number`         | `page`                         | Mapeo o funcionalidad interna |
| `getStats`       | `_req: Request, res: Response` | Mapeo o funcionalidad interna |
| `updateRole`     | `req: Request, res: Response`  | Mapeo o funcionalidad interna |
| `toggleStatus`   | `req: Request, res: Response`  | Mapeo o funcionalidad interna |

---

### 4.4. Rutas y Middlewares (`server/src/modules/<domain>/routes/` y `server/src/shared/middleware/`)

Controles de acceso (RBAC), subida de archivos (Multer), autenticación por JWT y validaciones dinámicas con Zod.

#### Rutas definidoras:

- **`system.routes.ts` (`/api/v1/system`):** Expone diagnósticos de estado de almacenamiento, APIs del sistema, y el endpoint de puntaje de salud compuesto `GET /health/:tenantId` (BL-601).
- **`authz.routes.ts` (`/api/v1/authz`):** Expone endpoints REST de Zero Standing Privileges (ZSP) y Policy Decision Point (PDP):
  - `POST /ephemeral/request` — Solicitud de elevación de privilegios Just-In-Time con justificación y expiración temporal.
  - `GET /ephemeral/grants` — Listado de concesiones JIT activas por inquilino o global para administradores.
  - `POST /ephemeral/grants/:id/revoke` — Revocación inmediata de privilegios y retiro de tuplas Zanzibar.
  - `POST /decision` — Evaluación unificada de políticas ABAC/ReBAC para tuplas `<sujeto>#<relación>@<objeto>`.
  - `GET /trust-score` — Puntaje de confianza y riesgo contextual adaptable continuo.

#### Middlewares de apoyo:

#### [authMiddleware.ts](./file:/c:/Users/DELL/Desktop/wordspace/msp_client_portal/server/src/shared/middleware/authMiddleware.ts)

_Ruta: `server/src/shared/middleware/authMiddleware.ts`_

##### Funciones auxiliares / Standalone:

| Función          | Parámetros                                         | Descripción              |
| :--------------- | :------------------------------------------------- | :----------------------- |
| `authMiddleware` | `req: Request, _res: Response, next: NextFunction` | Operación lógica directa |

#### [rbacMiddleware.ts](./file:/c:/Users/DELL/Desktop/wordspace/msp_client_portal/server/src/shared/middleware/rbacMiddleware.ts)

_Ruta: `server/src/shared/middleware/rbacMiddleware.ts`_

##### Funciones auxiliares / Standalone:

| Función          | Parámetros                    | Descripción              |
| :--------------- | :---------------------------- | :----------------------- |
| `rbacMiddleware` | `...allowedRoles: UserRole[]` | Operación lógica directa |

#### [validationMiddleware.ts](./file:/c:/Users/DELL/Desktop/wordspace/msp_client_portal/server/src/shared/middleware/validationMiddleware.ts)

_Ruta: `server/src/shared/middleware/validationMiddleware.ts`_

##### Funciones auxiliares / Standalone:

| Función    | Parámetros                         | Descripción |
| :--------- | :--------------------------------- | :---------- | ------------------ | ------------------------ |
| `validate` | `schema: ZodSchema, source: 'body' | 'query'     | 'params' = 'body'` | Operación lógica directa |

#### [requireSubscriptionFeature.ts](./file:/c:/Users/DELL/Desktop/wordspace/msp_client_portal/server/src/shared/middleware/requireSubscriptionFeature.ts)

_Ruta: `server/src/shared/middleware/requireSubscriptionFeature.ts`_

##### Funciones auxiliares / Standalone:

| Función                      | Parámetros                                              | Descripción                                                                                                                                                                                                                                                                                                                                                               |
| :--------------------------- | :------------------------------------------------------ | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `requireSubscriptionFeature` | `featureCode: string, subService?: SubscriptionService` | Middleware de compuerta (feature gating) que restringe el acceso al endpoint según las características del plan de suscripción activo. Los roles `ADMIN` y `TECHNICIAN` eluden la validación incondicionalmente. Para clientes (`CLIENT`), verifica que el tenant posea la característica activa o heredada por un bundle; de lo contrario arroja `ForbiddenError` (403). |

---

### 4.5. DTOs y Utilidades del Backend (`server/src/dtos/` y `server/src/utils/`)

#### [AppError.ts](./file:/c:/Users/DELL/Desktop/wordspace/msp_client_portal/server/src/utils/AppError.ts)

_Ruta: `server/src/utils/AppError.ts`_

##### Clase: `AppError`

| Método / Función | Argumentos                                                                                                                                                          | Descripción / Rol                                        |
| :--------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------ | :------------------------------------------------------- |
| `constructor`    | `message: string, statusCode: number = 500, code: string = 'INTERNAL_ERROR', isOperational: boolean = true, details?: Record<string, any>, originalError?: unknown` | Inicializador del componente e inyección de dependencias |
| `badRequest`     | `message: string, code = 'BAD_REQUEST'`                                                                                                                             | Mapeo o funcionalidad interna                            |
| `unauthorized`   | `message = 'Unauthorized', code = 'UNAUTHORIZED'`                                                                                                                   | Mapeo o funcionalidad interna                            |
| `forbidden`      | `message = 'Forbidden', code = 'FORBIDDEN'`                                                                                                                         | Mapeo o funcionalidad interna                            |
| `notFound`       | `message = 'Resource not found', code = 'NOT_FOUND'`                                                                                                                | Mapeo o funcionalidad interna                            |
| `conflict`       | `message: string, code = 'CONFLICT'`                                                                                                                                | Mapeo o funcionalidad interna                            |
| `slaViolation`   | `message: string`                                                                                                                                                   | Mapeo o funcionalidad interna                            |
| `internal`       | `message = 'Internal server error'`                                                                                                                                 | Mapeo o funcionalidad interna                            |

#### [emailService.ts](./file:/c:/Users/DELL/Desktop/wordspace/msp_client_portal/server/src/utils/emailService.ts)

_Ruta: `server/src/utils/emailService.ts`_

##### Funciones auxiliares / Standalone:

| Función                        | Parámetros                                                                                            | Descripción                                                                                        |
| :----------------------------- | :---------------------------------------------------------------------------------------------------- | :------------------------------------------------------------------------------------------------- | ------------------------ |
| `sendEmail`                    | `payload: NotificationPayload`                                                                        | Operación lógica directa                                                                           |
| `sendTicketCreatedEmail`       | `clientEmail: string, clientName: string, ticket: Ticket,`                                            | Operación lógica directa                                                                           |
| `sendTicketStatusChangedEmail` | `clientEmail: string, clientName: string, ticket: Ticket, notes?: string,`                            | Operación lógica directa                                                                           |
| `sendTicketAssignedEmail`      | `technicianEmail: string, technicianName: string, ticket: Ticket,`                                    | Operación lógica directa                                                                           |
| `sendTicketStatusEmail`        | `clientEmail: string, ticketId: string, newStatus: string, notes?: string,`                           | Operación lógica directa                                                                           |
| `sendTicketResponseEmail`      | `recipientEmail: string, recipientName: string, senderName: string, ticket: Ticket, message: string,` | Operación lógica directa                                                                           |
| `sendQuotationEmail`           | `clientEmail: string, clientName: string, plan: Plan, billingCycle: 'monthly'                         | 'annual', equipmentCount: number, subtotal: number, tax: number, total: number, language: string,` | Operación lógica directa |

#### [passwordUtils.ts](./file:/c:/Users/DELL/Desktop/wordspace/msp_client_portal/server/src/utils/passwordUtils.ts)

_Ruta: `server/src/utils/passwordUtils.ts`_

##### Funciones auxiliares / Standalone:

| Función           | Parámetros                       | Descripción              |
| :---------------- | :------------------------------- | :----------------------- |
| `hashPassword`    | `password: string`               | Operación lógica directa |
| `comparePassword` | `password: string, hash: string` | Operación lógica directa |

#### [emailService.ts](./file:/server/src/shared/utils/emailService.ts)

_Ruta: `server/src/shared/utils/emailService.ts`_

##### Funciones auxiliares / Standalone:

| Función                        | Parámetros                                                                                    | Descripción                                                  |
| :----------------------------- | :-------------------------------------------------------------------------------------------- | :----------------------------------------------------------- |
| `sendEmail`                    | `payload: NotificationPayload`                                                                | Envío de correo mediante Nodemailer (SMTP o Stub)            |
| `sendPasswordResetEmail`       | `recipientEmail, recipientName, resetToken, language?`                                        | Envío de correo con enlace de restablecimiento de contraseña |
| `sendOTPEmail`                 | `recipientEmail, recipientName, otp, language?`                                               | Envío de código de verificación de 6 dígitos (OTP)           |
| `sendTicketCreatedEmail`       | `clientEmail, clientName, ticket`                                                             | Envío de correo de bienvenida y acuse de recibo de ticket    |
| `sendTicketStatusChangedEmail` | `clientEmail, clientName, ticket, notes?`                                                     | Envío de actualización de estado y comentarios del técnico   |
| `sendTicketAssignedEmail`      | `technicianEmail, technicianName, ticket`                                                     | Notificación de asignación de ticket para el técnico         |
| `sendTicketResponseEmail`      | `recipientEmail, recipientName, senderName, ticket, message`                                  | Notificación de nueva respuesta agregada a un ticket         |
| `sendInvoiceDueEmail`          | `clientEmail, clientName, invoice, language`                                                  | Recordatorio de vencimiento y pago pendiente de factura      |
| `sendQuotationEmail`           | `clientEmail, clientName, plan, billingCycle, equipmentCount, subtotal, tax, total, language` | Envío de cotización formal de plan de soporte                |

#### [pdfGenerator.ts](./file:/c:/Users/DELL/Desktop/wordspace/msp_client_portal/server/src/utils/pdfGenerator.ts)

_Ruta: `server/src/utils/pdfGenerator.ts`_

##### Funciones auxiliares / Standalone:

| Función              | Parámetros                                                                                          | Descripción              |
| :------------------- | :-------------------------------------------------------------------------------------------------- | :----------------------- |
| `generateInvoicePdf` | `invoice: Invoice, clientName: string, clientEmail: string, tenantName: string, language = 'en_US'` | Operación lógica directa |

#### [whatsappService.ts](./file:/c:/Users/DELL/Desktop/wordspace/msp_client_portal/server/src/utils/whatsappService.ts)

_Ruta: `server/src/utils/whatsappService.ts`_

##### Funciones auxiliares / Standalone:

| Función                    | Parámetros                                                                  | Descripción              |
| :------------------------- | :-------------------------------------------------------------------------- | :----------------------- |
| `sendWhatsApp`             | `payload: NotificationPayload`                                              | Operación lógica directa |
| `sendTicketStatusWhatsApp` | `phoneNumber: string, ticketId: string, newStatus: string, notes?: string,` | Operación lógica directa |

---

## 5. Estructura y Componentes del Frontend (React + Zustand + React Router v7)

El frontend está ubicado en `client/`. Utiliza Zustand para la gestión de estados globales y Axios para comunicarse con los endpoints del backend.

### 5.0. Sistema de Diseño de Correos Electrónicos (`client/src/email-templates/`)

El frontend cuenta con un sistema de diseño de correos electrónicos homogéneo y basado en tokens (`tokens.ts`) con subcomponentes reutilizables (`components.tsx`), layout unificado (`EmailWrapper.tsx`) y galería de previsualización interactiva con soporte bilingüe (EN/ES) en la página de Preferencias de Notificación (`/notifications`).

- **Tokens (`tokens.ts`):** Paleta oceánica (`#0C4A6E`, `#38BDF8`, `#2563EB`), escala tipográfica, espaciados y sombras.
- **Componentes (`components.tsx`):** `Greeting`, `BodyText`, `InfoCard`, `DetailRow`, `Badge`, `Callout`, `Disclaimer`, `HighlightCode`, `FallbackLink`.
- **Plantillas:** `PasswordResetTemplate`, `OTPTemplate`, `TicketCreatedTemplate`, `InvoiceReminderTemplate`.

### 5.1. Manejadores de Estado Global (Zustand Stores - `client/src/store/`)

#### [useAuthStore.ts](./file:/c:/Users/DELL/Desktop/wordspace/msp_client_portal/client/src/store/useAuthStore.ts)

_Ruta: `client/src/store/useAuthStore.ts`_

##### Interfaces definidas:

- `AuthUser`
- `AuthState`

#### [useNotificationStore.ts](./file:/c:/Users/DELL/Desktop/wordspace/msp_client_portal/client/src/store/useNotificationStore.ts)

_Ruta: `client/src/store/useNotificationStore.ts`_

##### Interfaces definidas:

- `NotificationState`

#### [usePlanStore.ts](./file:/c:/Users/DELL/Desktop/wordspace/msp_client_portal/client/src/store/usePlanStore.ts)

_Ruta: `client/src/store/usePlanStore.ts`_

##### Interfaces definidas:

- `PlanState`

---

### 5.2. Llamadas a la API (Client Services - `client/src/services/`)

#### [authService.ts](./file:/c:/Users/DELL/Desktop/wordspace/msp_client_portal/client/src/services/authService.ts)

_Ruta: `client/src/services/authService.ts`_

##### Interfaces definidas:

- `LoginPayload`
- `RegisterPayload`
- `GoogleAuthPayload`
- `AuthResponse`

#### [equipmentService.ts](./file:/c:/Users/DELL/Desktop/wordspace/msp_client_portal/client/src/services/equipmentService.ts)

_Ruta: `client/src/services/equipmentService.ts`_

##### Interfaces definidas:

- `SubscriptionEquipment`

#### [expenseService.ts](./file:/c:/Users/DELL/Desktop/wordspace/msp_client_portal/client/src/services/expenseService.ts)

_Ruta: `client/src/services/expenseService.ts`_

##### Interfaces definidas:

- `Expense`

#### [invoiceService.ts](./file:/c:/Users/DELL/Desktop/wordspace/msp_client_portal/client/src/services/invoiceService.ts)

_Ruta: `client/src/services/invoiceService.ts`_

##### Interfaces definidas:

- `Invoice`

#### [notificationPreferenceService.ts](./file:/c:/Users/DELL/Desktop/wordspace/msp_client_portal/client/src/services/notificationPreferenceService.ts)

_Ruta: `client/src/services/notificationPreferenceService.ts`_

##### Interfaces definidas:

- `ChannelPreference`
- `GetPreferencesResponse`
- `UpdatePreferencesResponse`

#### [notificationService.ts](./file:/c:/Users/DELL/Desktop/wordspace/msp_client_portal/client/src/services/notificationService.ts)

_Ruta: `client/src/services/notificationService.ts`_

##### Interfaces definidas:

- `Notification`
- `GetNotificationsResponse`

#### [planService.ts](./file:/c:/Users/DELL/Desktop/wordspace/msp_client_portal/client/src/services/planService.ts)

_Ruta: `client/src/services/planService.ts`_

##### Interfaces definidas:

- `PlanFeature`
- `Plan`

#### [subscriptionService.ts](./file:/c:/Users/DELL/Desktop/wordspace/msp_client_portal/client/src/services/subscriptionService.ts)

_Ruta: `client/src/services/subscriptionService.ts`_

##### Interfaces definidas:

- `Subscription`

#### [systemService.ts](./file:/c:/Users/DELL/Desktop/wordspace/msp_client_portal/client/src/services/systemService.ts)

_Ruta: `client/src/services/systemService.ts`_

##### Interfaces definidas:

- `StorageStatus`

#### [ticketService.ts](./file:/c:/Users/DELL/Desktop/wordspace/msp_client_portal/client/src/services/ticketService.ts)

_Ruta: `client/src/services/ticketService.ts`_

##### Interfaces definidas:

- `Ticket`
- `TicketAttachment`
- `TicketEvent`
- `TicketResponse`
- `CreateTicketPayload`

#### [userService.ts](./file:/c:/Users/DELL/Desktop/wordspace/msp_client_portal/client/src/services/userService.ts)

_Ruta: `client/src/services/userService.ts`_

##### Interfaces definidas:

- `ChangePasswordPayload`
- `ManagedUser`
- `UserListResponse`
- `UserStats`
- `UserListParams`

#### [earningsService.ts](file:///c:/Users/eapolanco/Workspace/msp_client_portal/client/src/services/earningsService.ts)

_Ruta: `client/src/services/earningsService.ts`_

##### Interfaces definidas:

- `TechnicianEarning`
- `TechnicianRate`
- `TechnicianEarningsSummary`
- `TechnicianEarningBreakdown`

##### Métodos expuestos:

- `getMyEarnings(params)`: Consulta comisiones del técnico conectado.
- `getAdminOverview(params)`: Consulta nómina general de técnicos para administradores.
- `processBatchPayout(earningIds)`: Ejecuta desembolsos en lote (`PAID`).
- `updateRates(data)`: Configura tarifas base y multiplicadores.

---

### 5.3. React Hooks Personalizados (`client/src/hooks/`)

#### [use-mobile.ts](./file:/c:/Users/DELL/Desktop/wordspace/msp_client_portal/client/src/hooks/use-mobile.ts)

_Ruta: `client/src/hooks/use-mobile.ts`_

##### Funciones auxiliares / Standalone:

| Función       | Parámetros | Descripción              |
| :------------ | :--------- | :----------------------- |
| `useIsMobile` | `Ninguno`  | Operación lógica directa |

#### [useAdminDashboard.ts](./file:/c:/Users/DELL/Desktop/wordspace/msp_client_portal/client/src/hooks/useAdminDashboard.ts)

_Ruta: `client/src/hooks/useAdminDashboard.ts`_

##### Funciones auxiliares / Standalone:

| Función             | Parámetros | Descripción              |
| :------------------ | :--------- | :----------------------- |
| `useAdminDashboard` | `Ninguno`  | Operación lógica directa |

#### [useAppLayout.ts](./file:/c:/Users/DELL/Desktop/wordspace/msp_client_portal/client/src/hooks/useAppLayout.ts)

_Ruta: `client/src/hooks/useAppLayout.ts`_

##### Funciones auxiliares / Standalone:

| Función        | Parámetros | Descripción              |
| :------------- | :--------- | :----------------------- |
| `useAppLayout` | `Ninguno`  | Operación lógica directa |

#### [useAuth.tsx](./file:/c:/Users/DELL/Desktop/wordspace/msp_client_portal/client/src/hooks/useAuth.tsx)

_Ruta: `client/src/hooks/useAuth.tsx`_

##### Interfaces definidas:

- `AuthContextType`

##### Funciones auxiliares / Standalone:

| Función        | Parámetros                                    | Descripción              |
| :------------- | :-------------------------------------------- | :----------------------- |
| `AuthProvider` | `{ children }: { children: React.ReactNode }` | Operación lógica directa |
| `useAuth`      | `Ninguno`                                     | Operación lógica directa |

#### [useBilling.ts](./file:/c:/Users/DELL/Desktop/wordspace/msp_client_portal/client/src/hooks/useBilling.ts)

_Ruta: `client/src/hooks/useBilling.ts`_

##### Funciones auxiliares / Standalone:

| Función      | Parámetros | Descripción              |
| :----------- | :--------- | :----------------------- |
| `useBilling` | `Ninguno`  | Operación lógica directa |

#### [useCheckout.ts](./file:/c:/Users/DELL/Desktop/wordspace/msp_client_portal/client/src/hooks/useCheckout.ts)

_Ruta: `client/src/hooks/useCheckout.ts`_

##### Funciones auxiliares / Standalone:

| Función       | Parámetros                                                                | Descripción              |
| :------------ | :------------------------------------------------------------------------ | :----------------------- |
| `useCheckout` | `{ currentPlan, billingCycle, currentEquipmentCount, }: UseCheckoutProps` | Operación lógica directa |

#### [useClientDashboard.ts](./file:/c:/Users/DELL/Desktop/wordspace/msp_client_portal/client/src/hooks/useClientDashboard.ts)

_Ruta: `client/src/hooks/useClientDashboard.ts`_

##### Funciones auxiliares / Standalone:

| Función              | Parámetros | Descripción              |
| :------------------- | :--------- | :----------------------- |
| `useClientDashboard` | `Ninguno`  | Operación lógica directa |

#### [useEntitlements.ts](./file:/c:/Users/DELL/Desktop/wordspace/msp_client_portal/client/src/hooks/useEntitlements.ts)

_Ruta: `client/src/hooks/useEntitlements.ts`_

##### Interfaces definidas:

- `UseEntitlementsReturn` (`hasFeature`, `isFeatureLocked`, `activeFeatures`, `getRequiredTierForFeature`, `isLoading`, `hasActiveSubscription`, `activeSubscriptions`)

##### Funciones auxiliares / Standalone:

| Función           | Parámetros | Descripción                                                                                                                                                                                                                                                                                                                                                                 |
| :---------------- | :--------- | :-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `useEntitlements` | `Ninguno`  | Hook que evalúa las suscripciones activas del tenant autenticado frente al catálogo de planes (`planService`), descomponiendo paquetes compuestos y exponiendo métodos de validación de permisos de características (`hasFeature`, `isFeatureLocked`) y nivel de plan requerido (`getRequiredTierForFeature`). Otorga acceso total automático a administradores y técnicos. |

#### [useDevicesPage.ts](./file:/c:/Users/DELL/Desktop/wordspace/msp_client_portal/client/src/hooks/useDevicesPage.ts)

_Ruta: `client/src/hooks/useDevicesPage.ts`_

##### Funciones auxiliares / Standalone:

| Función          | Parámetros | Descripción              |
| :--------------- | :--------- | :----------------------- |
| `useDevicesPage` | `Ninguno`  | Operación lógica directa |

#### [useFinancialDashboard.ts](./file:/c:/Users/DELL/Desktop/wordspace/msp_client_portal/client/src/hooks/useFinancialDashboard.ts)

_Ruta: `client/src/hooks/useFinancialDashboard.ts`_

##### Interfaces definidas:

- `KpiCardData`
- `MonthlyData`
- `ExpenseCategory`
- `Transaction`

##### Funciones auxiliares / Standalone:

| Función                 | Parámetros | Descripción              |
| :---------------------- | :--------- | :----------------------- |
| `useFinancialDashboard` | `Ninguno`  | Operación lógica directa |

#### [useHelpPage.ts](./file:/c:/Users/DELL/Desktop/wordspace/msp_client_portal/client/src/hooks/useHelpPage.ts)

_Ruta: `client/src/hooks/useHelpPage.ts`_

##### Interfaces definidas:

- `FAQ`
- `Category`

##### Funciones auxiliares / Standalone:

| Función       | Parámetros | Descripción              |
| :------------ | :--------- | :----------------------- |
| `useHelpPage` | `Ninguno`  | Operación lógica directa |

#### [useNotificationPreferences.ts](./file:/c:/Users/DELL/Desktop/wordspace/msp_client_portal/client/src/hooks/useNotificationPreferences.ts)

_Ruta: `client/src/hooks/useNotificationPreferences.ts`_

##### Funciones auxiliares / Standalone:

| Función                      | Parámetros | Descripción              |
| :--------------------------- | :--------- | :----------------------- |
| `useNotificationPreferences` | `Ninguno`  | Operación lógica directa |

#### [usePlansPage.ts](./file:/c:/Users/DELL/Desktop/wordspace/msp_client_portal/client/src/hooks/usePlansPage.ts)

_Ruta: `client/src/hooks/usePlansPage.ts`_

##### Funciones auxiliares / Standalone:

| Función        | Parámetros | Descripción              |
| :------------- | :--------- | :----------------------- |
| `usePlansPage` | `Ninguno`  | Operación lógica directa |

#### [usePrivacyPage.tsx](./file:/c:/Users/DELL/Desktop/wordspace/msp_client_portal/client/src/hooks/usePrivacyPage.tsx)

_Ruta: `client/src/hooks/usePrivacyPage.tsx`_

##### Interfaces definidas:

- `PrivacySection`

##### Funciones auxiliares / Standalone:

| Función          | Parámetros | Descripción              |
| :--------------- | :--------- | :----------------------- |
| `usePrivacyPage` | `Ninguno`  | Operación lógica directa |

#### [useProfile.ts](./file:/c:/Users/DELL/Desktop/wordspace/msp_client_portal/client/src/hooks/useProfile.ts)

_Ruta: `client/src/hooks/useProfile.ts`_

##### Funciones auxiliares / Standalone:

| Función      | Parámetros | Descripción              |
| :----------- | :--------- | :----------------------- |
| `useProfile` | `Ninguno`  | Operación lógica directa |

#### [useSidebar.ts](./file:/c:/Users/DELL/Desktop/wordspace/msp_client_portal/client/src/hooks/useSidebar.ts)

_Ruta: `client/src/hooks/useSidebar.ts`_

##### Interfaces definidas:

- `NavSubItem`
- `NavItem`

##### Funciones auxiliares / Standalone:

| Función      | Parámetros | Descripción              |
| :----------- | :--------- | :----------------------- |
| `useSidebar` | `Ninguno`  | Operación lógica directa |

#### [useSLATimer.ts](./file:/c:/Users/DELL/Desktop/wordspace/msp_client_portal/client/src/hooks/useSLATimer.ts)

_Ruta: `client/src/hooks/useSLATimer.ts`_

##### Funciones auxiliares / Standalone:

| Función       | Parámetros                                  | Descripción              |
| :------------ | :------------------------------------------ | :----------------------- |
| `useSLATimer` | `ticketCreatedAt: string, category: string` | Operación lógica directa |

#### [useTermsPage.tsx](./file:/c:/Users/DELL/Desktop/wordspace/msp_client_portal/client/src/hooks/useTermsPage.tsx)

_Ruta: `client/src/hooks/useTermsPage.tsx`_

##### Interfaces definidas:

- `TermSection`

##### Funciones auxiliares / Standalone:

| Función        | Parámetros | Descripción              |
| :------------- | :--------- | :----------------------- |
| `useTermsPage` | `Ninguno`  | Operación lógica directa |

#### [useTicketDetail.ts](./file:/c:/Users/DELL/Desktop/wordspace/msp_client_portal/client/src/hooks/useTicketDetail.ts)

_Ruta: `client/src/hooks/useTicketDetail.ts`_

##### Funciones auxiliares / Standalone:

| Función           | Parámetros        | Descripción |
| :---------------- | :---------------- | :---------- | ------------------------ |
| `useTicketDetail` | `ticketId: string | undefined`  | Operación lógica directa |

#### [useTicketsPage.ts](./file:/c:/Users/DELL/Desktop/wordspace/msp_client_portal/client/src/hooks/useTicketsPage.ts)

_Ruta: `client/src/hooks/useTicketsPage.ts`_

##### Funciones auxiliares / Standalone:

| Función          | Parámetros | Descripción              |
| :--------------- | :--------- | :----------------------- |
| `useTicketsPage` | `Ninguno`  | Operación lógica directa |

#### [useTopNav.ts](./file:/c:/Users/DELL/Desktop/wordspace/msp_client_portal/client/src/hooks/useTopNav.ts)

_Ruta: `client/src/hooks/useTopNav.ts`_

##### Interfaces definidas:

- `PageLink`
- `FlatItem`

##### Funciones auxiliares / Standalone:

| Función     | Parámetros | Descripción              |
| :---------- | :--------- | :----------------------- |
| `useTopNav` | `Ninguno`  | Operación lógica directa |

#### [useUserManagement.ts](./file:/c:/Users/DELL/Desktop/wordspace/msp_client_portal/client/src/hooks/useUserManagement.ts)

_Ruta: `client/src/hooks/useUserManagement.ts`_

##### Interfaces definidas:

- `ConfirmationState`

##### Funciones auxiliares / Standalone:

| Función             | Parámetros | Descripción              |
| :------------------ | :--------- | :----------------------- |
| `useUserManagement` | `Ninguno`  | Operación lógica directa |

#### [useUrlState.ts](./file:/c:/Users/Public/Workspace/msp_client_portal/client/src/hooks/useUrlState.ts)

_Ruta: `client/src/hooks/useUrlState.ts`_

##### Interfaces definidas:

- `SetUrlParamsOptions`

##### Funciones auxiliares / Standalone:

| Función       | Parámetros | Descripción                                                                          |
| :------------ | :--------- | :----------------------------------------------------------------------------------- |
| `useUrlState` | `Ninguno`  | Sincronización declarativa y type-safe de parámetros de búsqueda URL (search params) |

---

### 5.4. Páginas y Componentes de Vista (`client/src/pages/` y `client/src/components/`)

#### Vistas Principales:

#### [AdminDashboard.tsx](./file:/c:/Users/DELL/Desktop/wordspace/msp_client_portal/client/src/pages/AdminDashboard.tsx)

_Ruta: `client/src/pages/AdminDashboard.tsx`_

##### Funciones auxiliares / Standalone:

| Función           | Parámetros                                                                             | Descripción              |
| :---------------- | :------------------------------------------------------------------------------------- | :----------------------- |
| `SummaryCard`     | `{ icon, badge, title, value, subtitle, footer }: SummaryCardProps`                    | Operación lógica directa |
| `StorageOverview` | `{ storage, loading, t }: StorageOverviewProps`                                        | Operación lógica directa |
| `RecentInvoices`  | `{ invoices, t, language, getStatusLabel, getStatusColorClass, }: RecentInvoicesProps` | Operación lógica directa |
| `AdminDashboard`  | `Ninguno`                                                                              | Operación lógica directa |

#### [BillingPage.tsx](./file:/c:/Users/DELL/Desktop/wordspace/msp_client_portal/client/src/pages/BillingPage.tsx)

_Ruta: `client/src/pages/BillingPage.tsx`_

##### Funciones auxiliares / Standalone:

| Función       | Parámetros | Descripción              |
| :------------ | :--------- | :----------------------- |
| `BillingPage` | `Ninguno`  | Operación lógica directa |

#### [ActiveSubscriptions.tsx](./file:/c:/Users/DELL/Desktop/wordspace/msp_client_portal/client/src/pages/ClientDashboard/components/ActiveSubscriptions.tsx)

_Ruta: `client/src/pages/ClientDashboard/components/ActiveSubscriptions.tsx`_

##### Funciones auxiliares / Standalone:

| Función               | Parámetros                                                     | Descripción              |
| :-------------------- | :------------------------------------------------------------- | :----------------------- |
| `ActiveSubscriptions` | `{ subscriptions, getStatusColor, }: ActiveSubscriptionsProps` | Operación lógica directa |

#### [RecentInvoices.tsx](./file:/c:/Users/DELL/Desktop/wordspace/msp_client_portal/client/src/pages/ClientDashboard/components/RecentInvoices.tsx)

_Ruta: `client/src/pages/ClientDashboard/components/RecentInvoices.tsx`_

##### Funciones auxiliares / Standalone:

| Función          | Parámetros                                           | Descripción              |
| :--------------- | :--------------------------------------------------- | :----------------------- |
| `RecentInvoices` | `{ invoices, getStatusColor, }: RecentInvoicesProps` | Operación lógica directa |

#### [StatsGrid.tsx](./file:/c:/Users/DELL/Desktop/wordspace/msp_client_portal/client/src/pages/ClientDashboard/components/StatsGrid.tsx)

_Ruta: `client/src/pages/ClientDashboard/components/StatsGrid.tsx`_

##### Funciones auxiliares / Standalone:

| Función     | Parámetros                        | Descripción              |
| :---------- | :-------------------------------- | :----------------------- |
| `StatsGrid` | `{ openTickets }: StatsGridProps` | Operación lógica directa |

#### [StorageQuota.tsx](./file:/c:/Users/DELL/Desktop/wordspace/msp_client_portal/client/src/pages/ClientDashboard/components/StorageQuota.tsx)

_Ruta: `client/src/pages/ClientDashboard/components/StorageQuota.tsx`_

##### Funciones auxiliares / Standalone:

| Función        | Parámetros                                                                                         | Descripción              |
| :------------- | :------------------------------------------------------------------------------------------------- | :----------------------- |
| `StorageQuota` | `{ totalSlotsCount, activeSlotsCount, totalStorageQuota, activeStorageQuota, }: StorageQuotaProps` | Operación lógica directa |

#### [ClientDashboard.tsx](./file:/c:/Users/DELL/Desktop/wordspace/msp_client_portal/client/src/pages/ClientDashboard.tsx)

_Ruta: `client/src/pages/ClientDashboard.tsx`_

##### Funciones auxiliares / Standalone:

| Función           | Parámetros | Descripción              |
| :---------------- | :--------- | :----------------------- |
| `ClientDashboard` | `Ninguno`  | Operación lógica directa |

#### [DevicesPage.tsx](./file:/c:/Users/DELL/Desktop/wordspace/msp_client_portal/client/src/pages/DevicesPage.tsx)

_Ruta: `client/src/pages/DevicesPage.tsx`_

##### Funciones auxiliares / Standalone:

| Función                  | Parámetros                                                                                                                                                                                                                        | Descripción              |
| :----------------------- | :-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :----------------------- |
| `EmptySubscriptionsCard` | `{ onBrowsePlans }: EmptySubscriptionsCardProps`                                                                                                                                                                                  | Operación lógica directa |
| `SubscriptionSelector`   | `{ subscriptions, selectedId, onChange }: SubscriptionSelectorProps`                                                                                                                                                              | Operación lógica directa |
| `DevicesTableFilters`    | `{ searchTerm, setSearchTerm, searchPlaceholder, isAdmin, selectedClient, setSelectedClient, uniqueClients = [], selectedPlan, setSelectedPlan, uniquePlans = [], selectedStatus, setSelectedStatus, }: DevicesTableFiltersProps` | Operación lógica directa |
| `ActivationWizardModal`  | `{ slotIdx, step, deviceName, setDeviceName, deviceSerial, setDeviceSerial, loading, onClose, onNextStep, onActivate, slotsEquipment, }: ActivationWizardModalProps`                                                              | Operación lógica directa |
| `PaginationBar`          | `{ page, total, limit, totalPages, onPrev, onNext, onLimitChange, }: PaginationBarProps`                                                                                                                                          | Operación lógica directa |
| `DevicesPage`            | `Ninguno`                                                                                                                                                                                                                         | Operación lógica directa |

#### [FinancialDashboard.tsx](./file:/c:/Users/DELL/Desktop/wordspace/msp_client_portal/client/src/pages/FinancialDashboard.tsx)

_Ruta: `client/src/pages/FinancialDashboard.tsx`_

##### Funciones auxiliares / Standalone:

| Función              | Parámetros | Descripción              |
| :------------------- | :--------- | :----------------------- |
| `FinancialDashboard` | `Ninguno`  | Operación lógica directa |

#### [HelpPage.tsx](./file:/c:/Users/DELL/Desktop/wordspace/msp_client_portal/client/src/pages/HelpPage.tsx)

_Ruta: `client/src/pages/HelpPage.tsx`_

##### Funciones auxiliares / Standalone:

| Función    | Parámetros | Descripción              |
| :--------- | :--------- | :----------------------- |
| `HelpPage` | `Ninguno`  | Operación lógica directa |

#### [LoginPage.tsx](./file:/c:/Users/DELL/Desktop/wordspace/msp_client_portal/client/src/pages/LoginPage.tsx)

_Ruta: `client/src/pages/LoginPage.tsx`_

##### Funciones auxiliares / Standalone:

| Función     | Parámetros | Descripción              |
| :---------- | :--------- | :----------------------- |
| `LoginPage` | `Ninguno`  | Operación lógica directa |

#### [NotificationPreferencesPage.tsx](./file:/c:/Users/DELL/Desktop/wordspace/msp_client_portal/client/src/pages/NotificationPreferencesPage.tsx)

_Ruta: `client/src/pages/NotificationPreferencesPage.tsx`_

##### Funciones auxiliares / Standalone:

| Función                       | Parámetros | Descripción              |
| :---------------------------- | :--------- | :----------------------- |
| `NotificationPreferencesPage` | `Ninguno`  | Operación lógica directa |

#### [ActiveSubscriptionsDashboard.tsx](./file:/c:/Users/DELL/Desktop/wordspace/msp_client_portal/client/src/pages/PlansPage/components/ActiveSubscriptionsDashboard.tsx)

_Ruta: `client/src/pages/PlansPage/components/ActiveSubscriptionsDashboard.tsx`_

##### Funciones auxiliares / Standalone:

| Función                        | Parámetros                                                             | Descripción              |
| :----------------------------- | :--------------------------------------------------------------------- | :----------------------- |
| `ActiveSubscriptionsDashboard` | `{ activeSubscriptions, columns, }: ActiveSubscriptionsDashboardProps` | Operación lógica directa |

#### [BillingCycleSwitcher.tsx](./file:/c:/Users/DELL/Desktop/wordspace/msp_client_portal/client/src/pages/PlansPage/components/BillingCycleSwitcher.tsx)

_Ruta: `client/src/pages/PlansPage/components/BillingCycleSwitcher.tsx`_

##### Funciones auxiliares / Standalone:

| Función                | Parámetros                                                      | Descripción              |
| :--------------------- | :-------------------------------------------------------------- | :----------------------- |
| `BillingCycleSwitcher` | `{ billingCycle, setBillingCycle, }: BillingCycleSwitcherProps` | Operación lógica directa |

#### [EditPlanModal.tsx](./file:/c:/Users/DELL/Desktop/wordspace/msp_client_portal/client/src/pages/PlansPage/components/EditPlanModal.tsx)

_Ruta: `client/src/pages/PlansPage/components/EditPlanModal.tsx`_

##### Funciones auxiliares / Standalone:

| Función         | Parámetros                                                                                                                                                                                                                                                                                                                                                                                                                                                                     | Descripción              |
| :-------------- | :----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :----------------------- |
| `EditPlanModal` | `{ editingPlan, isCreateMode, editId, setEditId, editClientType, setEditClientType, editName, setEditName, editDescription, setEditDescription, editPrice, setEditPrice, editRecommended, setEditRecommended, editActive, setEditActive, editFeatures, saveLoading, draggedIndex, dragOverIndex, onClose, onSave, onAddFeature, onDeleteFeature, onToggleFeatureIncluded, onEditFeatureText, onMoveFeature, onDragStart, onDragOver, onDrop, onDragEnd, }: EditPlanModalProps` | Operación lógica directa |

#### [PaymentSection.tsx](./file:/c:/Users/DELL/Desktop/wordspace/msp_client_portal/client/src/pages/PlansPage/components/PaymentSection.tsx)

_Ruta: `client/src/pages/PlansPage/components/PaymentSection.tsx`_

##### Funciones auxiliares / Standalone:

| Función          | Parámetros                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     | Descripción              |
| :--------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :----------------------- |
| `PaymentSection` | `{ currentPlan, billingCycle, currentEquipmentCount, isAdmin, acceptedTos, setAcceptedTos, paymentMethod, setPaymentMethod, paymentMessage, reference, subscribeLoading, handleProcessSubscription, activeSubscriptions, getPlanName, clients, selectedClientId, setSelectedClientId, unregisteredEmail, setUnregisteredEmail, unregisteredName, setUnregisteredName, quoteLoading, handleSendQuote, actionType, setActionType, subscriptionToModifyId, setSubscriptionToModifyId, handleUpdateSubscription, handleCancelSubscription, }: PaymentSectionProps` | Operación lógica directa |

#### [PlanCard.tsx](./file:/c:/Users/DELL/Desktop/wordspace/msp_client_portal/client/src/pages/PlansPage/components/PlanCard.tsx)

_Ruta: `client/src/pages/PlansPage/components/PlanCard.tsx`_

##### Funciones auxiliares / Standalone:

| Función    | Parámetros                                                                                                                                                                                                    | Descripción              |
| :--------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | :----------------------- |
| `PlanCard` | `{ plan, selectedPlan, billingCycle, equipmentCount, isAdmin, activeSubscriptions, onSelect, onEdit, onAdjustEquipmentCount, getPlanName, getPlanDescription, getFeatureText, getTierLabel, }: PlanCardProps` | Operación lógica directa |

#### [PlansPage.tsx](./file:/c:/Users/DELL/Desktop/wordspace/msp_client_portal/client/src/pages/PlansPage.tsx)

_Ruta: `client/src/pages/PlansPage.tsx`_

##### Funciones auxiliares / Standalone:

| Función     | Parámetros | Descripción              |
| :---------- | :--------- | :----------------------- |
| `PlansPage` | `Ninguno`  | Operación lógica directa |

#### [PrivacyPage.tsx](./file:/c:/Users/DELL/Desktop/wordspace/msp_client_portal/client/src/pages/PrivacyPage.tsx)

_Ruta: `client/src/pages/PrivacyPage.tsx`_

##### Funciones auxiliares / Standalone:

| Función       | Parámetros | Descripción              |
| :------------ | :--------- | :----------------------- |
| `PrivacyPage` | `Ninguno`  | Operación lógica directa |

#### [ProfilePage.tsx](./file:/c:/Users/DELL/Desktop/wordspace/msp_client_portal/client/src/pages/ProfilePage.tsx)

_Ruta: `client/src/pages/ProfilePage.tsx`_

##### Funciones auxiliares / Standalone:

| Función       | Parámetros | Descripción              |
| :------------ | :--------- | :----------------------- |
| `ProfilePage` | `Ninguno`  | Operación lógica directa |

#### [RegisterPage.tsx](./file:/c:/Users/DELL/Desktop/wordspace/msp_client_portal/client/src/pages/RegisterPage.tsx)

_Ruta: `client/src/pages/RegisterPage.tsx`_

##### Funciones auxiliares / Standalone:

| Función        | Parámetros | Descripción              |
| :------------- | :--------- | :----------------------- |
| `RegisterPage` | `Ninguno`  | Operación lógica directa |

#### [TechDashboard.tsx](./file:/c:/Users/DELL/Desktop/wordspace/msp_client_portal/client/src/pages/TechDashboard.tsx)

_Ruta: `client/src/pages/TechDashboard.tsx`_

##### Funciones auxiliares / Standalone:

| Función         | Parámetros | Descripción              |
| :-------------- | :--------- | :----------------------- |
| `TechDashboard` | `Ninguno`  | Operación lógica directa |

#### [TermsPage.tsx](./file:/c:/Users/DELL/Desktop/wordspace/msp_client_portal/client/src/pages/TermsPage.tsx)

_Ruta: `client/src/pages/TermsPage.tsx`_

##### Funciones auxiliares / Standalone:

| Función     | Parámetros | Descripción              |
| :---------- | :--------- | :----------------------- |
| `TermsPage` | `Ninguno`  | Operación lógica directa |

#### [TicketDetailPage.tsx](./file:/c:/Users/DELL/Desktop/wordspace/msp_client_portal/client/src/pages/TicketDetailPage.tsx)

_Ruta: `client/src/pages/TicketDetailPage.tsx`_

##### Funciones auxiliares / Standalone:

| Función            | Parámetros | Descripción              |
| :----------------- | :--------- | :----------------------- |
| `TicketDetailPage` | `Ninguno`  | Operación lógica directa |

#### [TicketsPage.tsx](./file:/c:/Users/DELL/Desktop/wordspace/msp_client_portal/client/src/pages/TicketsPage.tsx)

_Ruta: `client/src/pages/TicketsPage.tsx`_

##### Funciones auxiliares / Standalone:

| Función                    | Parámetros                                                                                                                          | Descripción              |
| :------------------------- | :---------------------------------------------------------------------------------------------------------------------------------- | :----------------------- |
| `TicketTitleWithHoverCard` | `{ ticket }: { ticket: Ticket }`                                                                                                    | Operación lógica directa |
| `FiltersBar`               | `{ search, setSearch, statusFilter, setStatusFilter, deviceFilter, setDeviceFilter, devices, onSubmitSearch, t, }: FiltersBarProps` | Operación lógica directa |
| `BulkActionBar`            | `{ selectedCount, onBulkCancel, selectedLabel, cancelLabel, }: BulkActionBarProps`                                                  | Operación lógica directa |
| `PaginationBar`            | `{ page, total, limit, totalPages, onPrev, onNext, showingLabel, ofLabel, }: PaginationBarProps`                                    | Operación lógica directa |
| `TicketsPage`              | `Ninguno`                                                                                                                           | Operación lógica directa |

#### [UserManagementPage.tsx](./file:/c:/Users/DELL/Desktop/wordspace/msp_client_portal/client/src/pages/UserManagementPage.tsx)

_Ruta: `client/src/pages/UserManagementPage.tsx`_

##### Funciones auxiliares / Standalone:

| Función              | Parámetros | Descripción              |
| :------------------- | :--------- | :----------------------- |
| `UserManagementPage` | `Ninguno`  | Operación lógica directa |

---

### 5.5. Arquitectura de Ruteo Basada en Layouts (`client/src/routes/`)

El cliente utiliza una estructura de rutas basada en carpetas y layouts jerárquicos (patrón TanStack Router / File-Based Routing) para organizar las vistas según su contexto y alcance de acceso:

```text
client/src/routes/
├── _public/                          # Layout público sin autenticación (PublicLayout)
│   ├── index.tsx                     # Página de Inicio / Landing ("/")
│   ├── terms.tsx                     # Términos y Condiciones ("/terms")
│   └── privacy.tsx                   # Política de Privacidad ("/privacy")
├── _auth/                            # Layout para flujos de autenticación
│   ├── login.tsx                     # Inicio de Sesión ("/login")
│   └── register.tsx                  # Registro de Cuenta ("/register")
└── _app/                             # Layout principal autenticado (AppLayout)
    ├── dashboard.tsx                 # Dashboard Principal ("/dashboard")
    ├── financial.tsx                 # Métricas Financieras ("/financial")
    ├── plans.tsx                     # Planes y Suscripciones ("/plans")
    ├── billing.tsx                   # Facturación ("/billing")
    ├── devices.tsx                   # Gestión de Dispositivos ("/devices")
    ├── resources.tsx                 # Recursos e Documentación ("/resources")
    ├── maintenance.tsx               # Mantenimientos Programados ("/maintenance")
    ├── profile.tsx                   # Perfil del Usuario ("/profile")
    ├── help.tsx                      # Centro de Ayuda ("/help")
    ├── notifications/
    │   └── preferences.tsx           # Preferencias de Notificación ("/notifications/preferences")
    ├── tickets/
    │   ├── index.tsx                 # Lista de Tickets ("/tickets")
    │   └── $id.tsx                   # Detalle de Ticket Dinámico ("/tickets/:id")
    ├── tech/
    │   └── dashboard.tsx             # Portal del Técnico ("/tech/dashboard")
    └── admin/
        ├── users.tsx                 # Gestión de Usuarios ("/admin/users")
        └── api-status.tsx            # Estado del Sistema / API ("/admin/api-status")
```

#### Componentes Reutilizables:

#### [GoogleLoginButton.tsx](./file:/c:/Users/DELL/Desktop/wordspace/msp_client_portal/client/src/components/auth/GoogleLoginButton.tsx)

_Ruta: `client/src/components/auth/GoogleLoginButton.tsx`_

##### Funciones auxiliares / Standalone:

| Función             | Parámetros                                                             | Descripción              |
| :------------------ | :--------------------------------------------------------------------- | :----------------------- |
| `GoogleLoginButton` | `{ onSuccess, onError, text = "signin_with" }: GoogleLoginButtonProps` | Operación lógica directa |

#### [FeatureLockedPreview.tsx](./file:/c:/Users/DELL/Desktop/wordspace/msp_client_portal/client/src/components/shared/FeatureLockedPreview.tsx)

_Ruta: `client/src/components/shared/FeatureLockedPreview.tsx`_

##### Interfaces definidas:

- `FeatureLockedPreviewProps` (`requiredFeature: FeatureCode, className?: string`)

##### Funciones auxiliares / Standalone:

| Función                | Parámetros                                                  | Descripción                                                                                                                                                                                                                                                          |
| :--------------------- | :---------------------------------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `FeatureLockedPreview` | `{ requiredFeature, className }: FeatureLockedPreviewProps` | Componente de vista previa y upsell de alta conversión que se muestra cuando un cliente intenta acceder a una funcionalidad no incluida en su plan. Muestra beneficios clave, plan mínimo requerido y botones de acción ("Volver al Panel", "Ver Planes y Mejorar"). |

#### [FeatureRouteGuard.tsx](./file:/c:/Users/DELL/Desktop/wordspace/msp_client_portal/client/src/components/shared/FeatureRouteGuard.tsx)

_Ruta: `client/src/components/shared/FeatureRouteGuard.tsx`_

##### Interfaces definidas:

- `FeatureRouteGuardProps` (`requiredFeature: FeatureCode, children: ReactNode`)

##### Funciones auxiliares / Standalone:

| Función             | Parámetros                                              | Descripción                                                                                                                                                                                                                                                                      |
| :------------------ | :------------------------------------------------------ | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `FeatureRouteGuard` | `{ requiredFeature, children }: FeatureRouteGuardProps` | Envoltorio de rutas protegidas que comprueba si la característica requerida está bloqueada para el cliente (`isFeatureLocked`). Si está bloqueada, renderiza `<FeatureLockedPreview>`; si está permitida (o si el usuario es técnico/administrador), renderiza la vista destino. |

#### [CheckoutSheet.tsx](./file:/c:/Users/DELL/Desktop/wordspace/msp_client_portal/client/src/components/CheckoutSheet.tsx)

_Ruta: `client/src/components/CheckoutSheet.tsx`_

##### Funciones auxiliares / Standalone:

| Función         | Parámetros                                                                                                                                                                                                                                                   | Descripción              |
| :-------------- | :----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :----------------------- |
| `OrderSummary`  | `{ planName, billingCycle, currentEquipmentCount, subtotal, tax, total, }: OrderSummaryProps`                                                                                                                                                                | Operación lógica directa |
| `PaymentFields` | `{ isAdmin, acceptedTos, setAcceptedTos, paymentMethod, setPaymentMethod, paymentMessage, reference, subscribeLoading, handleProcessSubscription, }: PaymentFieldsProps`                                                                                     | Operación lógica directa |
| `CheckoutSheet` | `{ currentPlan, billingCycle, currentEquipmentCount, isAdmin, acceptedTos, setAcceptedTos, paymentMethod, setPaymentMethod, paymentMessage, reference, subscribeLoading, handleProcessSubscription, activeSubscriptions, getPlanName, }: CheckoutSheetProps` | Operación lógica directa |

#### [ExpenseDoughnut.tsx](./file:/c:/Users/DELL/Desktop/wordspace/msp_client_portal/client/src/components/financial/ExpenseDoughnut.tsx)

_Ruta: `client/src/components/financial/ExpenseDoughnut.tsx`_

##### Funciones auxiliares / Standalone:

| Función           | Parámetros                                                                            | Descripción              |
| :---------------- | :------------------------------------------------------------------------------------ | :----------------------- |
| `ExpenseDoughnut` | `{ categories, hoveredIndex, setHoveredIndex, totalExpenses, }: ExpenseDoughnutProps` | Operación lógica directa |

#### [KpiCards.tsx](./file:/c:/Users/DELL/Desktop/wordspace/msp_client_portal/client/src/components/financial/KpiCards.tsx)

_Ruta: `client/src/components/financial/KpiCards.tsx`_

##### Funciones auxiliares / Standalone:

| Función    | Parámetros                | Descripción              |
| :--------- | :------------------------ | :----------------------- |
| `KpiCards` | `{ kpis }: KpiCardsProps` | Operación lógica directa |

#### [LogExpenseDialog.tsx](./file:/c:/Users/DELL/Desktop/wordspace/msp_client_portal/client/src/components/financial/LogExpenseDialog.tsx)

_Ruta: `client/src/components/financial/LogExpenseDialog.tsx`_

##### Funciones auxiliares / Standalone:

| Función            | Parámetros                                   | Descripción              |
| :----------------- | :------------------------------------------- | :----------------------- |
| `LogExpenseDialog` | `{ onExpenseLogged }: LogExpenseDialogProps` | Operación lógica directa |

#### [RevenueChart.tsx](./file:/c:/Users/DELL/Desktop/wordspace/msp_client_portal/client/src/components/financial/RevenueChart.tsx)

_Ruta: `client/src/components/financial/RevenueChart.tsx`_

##### Funciones auxiliares / Standalone:

| Función        | Parámetros                                                   | Descripción              |
| :------------- | :----------------------------------------------------------- | :----------------------- |
| `RevenueChart` | `{ data, hoveredIndex, setHoveredIndex }: RevenueChartProps` | Operación lógica directa |

#### [TransactionsTable.tsx](./file:/c:/Users/DELL/Desktop/wordspace/msp_client_portal/client/src/components/financial/TransactionsTable.tsx)

_Ruta: `client/src/components/financial/TransactionsTable.tsx`_

##### Funciones auxiliares / Standalone:

| Función             | Parámetros                                 | Descripción              |
| :------------------ | :----------------------------------------- | :----------------------- |
| `TransactionsTable` | `{ transactions }: TransactionsTableProps` | Operación lógica directa |

#### [app-sidebar.tsx](./file:/c:/Users/DELL/Desktop/wordspace/msp_client_portal/client/src/components/layout/app-sidebar.tsx)

_Ruta: `client/src/components/layout/app-sidebar.tsx`_

##### Funciones auxiliares / Standalone:

| Función          | Parámetros                                                                              | Descripción                                                                                                                                                                                                                     |
| :--------------- | :-------------------------------------------------------------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `SidebarBrand`   | `{ logo, portalTitle, infraTitle }: SidebarBrandProps`                                  | Operación lógica directa                                                                                                                                                                                                        |
| `ActiveSubCard`  | `{ sub, renewalLabel, isSpanish }: ActiveSubCardProps`                                  | Operación lógica directa                                                                                                                                                                                                        |
| `SidebarNavList` | `{ navItems, checkIsActive, checkIsGroupActive, isFeatureLocked }: SidebarNavListProps` | Renderiza la lista de navegación lateral; evalúa `isFeatureLocked` para cada ítem que requiere una suscripción (`requiredFeature`) y despliega la insignia interactiva `UpgradeBadge` si el cliente no posee la característica. |
| `AppSidebar`     | `Ninguno`                                                                               | Operación lógica directa                                                                                                                                                                                                        |

#### [AppLayout.tsx](./file:/c:/Users/DELL/Desktop/wordspace/msp_client_portal/client/src/components/layout/AppLayout.tsx)

_Ruta: `client/src/components/layout/AppLayout.tsx`_

##### Funciones auxiliares / Standalone:

| Función              | Parámetros                                                   | Descripción              |
| :------------------- | :----------------------------------------------------------- | :----------------------- |
| `Footer`             | `Ninguno`                                                    | Operación lógica directa |
| `BlockedPortalAlert` | `{ onChoosePlan, choosePlanLabel }: BlockedPortalAlertProps` | Operación lógica directa |
| `AppLayout`          | `Ninguno`                                                    | Operación lógica directa |

#### [Breadcrumbs.tsx](./file:/c:/Users/DELL/Desktop/wordspace/msp_client_portal/client/src/components/layout/Breadcrumbs.tsx)

_Ruta: `client/src/components/layout/Breadcrumbs.tsx`_

##### Funciones auxiliares / Standalone:

| Función       | Parámetros                              | Descripción              |
| :------------ | :-------------------------------------- | :----------------------- |
| `Breadcrumbs` | `{ className }: { className?: string }` | Operación lógica directa |

#### [NotificationBell.tsx](./file:/c:/Users/DELL/Desktop/wordspace/msp_client_portal/client/src/components/layout/NotificationBell.tsx)

_Ruta: `client/src/components/layout/NotificationBell.tsx`_

##### Funciones auxiliares / Standalone:

| Función            | Parámetros | Descripción              |
| :----------------- | :--------- | :----------------------- |
| `NotificationBell` | `Ninguno`  | Operación lógica directa |

#### [routeCrumbs.ts](./file:/c:/Users/DELL/Desktop/wordspace/msp_client_portal/client/src/components/layout/routeCrumbs.ts)

_Ruta: `client/src/components/layout/routeCrumbs.ts`_

##### Interfaces definidas:

- `RouteCrumb`
- `RouteCrumbConfig`

#### [ThemeToggle.tsx](./file:/c:/Users/DELL/Desktop/wordspace/msp_client_portal/client/src/components/layout/ThemeToggle.tsx)

_Ruta: `client/src/components/layout/ThemeToggle.tsx`_

##### Funciones auxiliares / Standalone:

| Función       | Parámetros | Descripción              |
| :------------ | :--------- | :----------------------- |
| `ThemeToggle` | `Ninguno`  | Operación lógica directa |

#### [TopNav.tsx](./file:/c:/Users/DELL/Desktop/wordspace/msp_client_portal/client/src/components/layout/TopNav.tsx)

_Ruta: `client/src/components/layout/TopNav.tsx`_

##### Funciones auxiliares / Standalone:

| Función        | Parámetros                                                                                                                                                   | Descripción              |
| :------------- | :----------------------------------------------------------------------------------------------------------------------------------------------------------- | :----------------------- |
| `SearchBar`    | `{ searchQuery, setSearchQuery, isOpen, setIsOpen, isLoading, selectedIndex, flatItems, containerRef, prefetchInvoices, handleKeyDown, t, }: SearchBarProps` | Operación lógica directa |
| `SettingsMenu` | `{ showSettingsMenu, setShowSettingsMenu, settingsRef, userRole, navigate, t, }: SettingsMenuProps`                                                          | Operación lógica directa |
| `UserMenu`     | `{ showUserMenu, setShowUserMenu, userMenuRef, user, logout, t, }: UserMenuProps`                                                                            | Operación lógica directa |
| `TopNav`       | `Ninguno`                                                                                                                                                    | Operación lógica directa |

#### [login-form.tsx](./file:/c:/Users/DELL/Desktop/wordspace/msp_client_portal/client/src/components/login-form.tsx)

_Ruta: `client/src/components/login-form.tsx`_

##### Funciones auxiliares / Standalone:

| Función     | Parámetros                                             | Descripción              |
| :---------- | :----------------------------------------------------- | :----------------------- |
| `LoginForm` | `{ className, ...props }: React.ComponentProps<"div">` | Operación lógica directa |

#### [Page.tsx](./file:/c:/Users/DELL/Desktop/wordspace/msp_client_portal/client/src/components/Page.tsx)

_Ruta: `client/src/components/Page.tsx`_

##### Interfaces definidas:

- `PageProps`

##### Funciones auxiliares / Standalone:

| Función | Parámetros                                                                                                  | Descripción              |
| :------ | :---------------------------------------------------------------------------------------------------------- | :----------------------- |
| `Page`  | `{ title, subtitle, actions, showBreadcrumbs = true, children, className, isLoading, ...props }: PageProps` | Operación lógica directa |

#### [theme-provider.tsx](./file:/c:/Users/DELL/Desktop/wordspace/msp_client_portal/client/src/components/theme-provider.tsx)

_Ruta: `client/src/components/theme-provider.tsx`_

##### Funciones auxiliares / Standalone:

| Función         | Parámetros                                                                                             | Descripción              |
| :-------------- | :----------------------------------------------------------------------------------------------------- | :----------------------- |
| `ThemeProvider` | `{ children, defaultTheme = 'system', storageKey = 'msp-portal-theme', ...props }: ThemeProviderProps` | Operación lógica directa |
| `useTheme`      | `Ninguno`                                                                                              | Operación lógica directa |

#### [UserActionsMenu.tsx](./file:/c:/Users/DELL/Desktop/wordspace/msp_client_portal/client/src/components/users/UserActionsMenu.tsx)

_Ruta: `client/src/components/users/UserActionsMenu.tsx`_

##### Funciones auxiliares / Standalone:

| Función           | Parámetros                                                                     | Descripción              |
| :---------------- | :----------------------------------------------------------------------------- | :----------------------- |
| `UserActionsMenu` | `{ user, currentUserId, onRoleChange, onStatusToggle, }: UserActionsMenuProps` | Operación lógica directa |

#### [UserFiltersBar.tsx](./file:/c:/Users/DELL/Desktop/wordspace/msp_client_portal/client/src/components/users/UserFiltersBar.tsx)

_Ruta: `client/src/components/users/UserFiltersBar.tsx`_

##### Funciones auxiliares / Standalone:

| Función          | Parámetros                                                                                                                         | Descripción              |
| :--------------- | :--------------------------------------------------------------------------------------------------------------------------------- | :----------------------- |
| `UserFiltersBar` | `{ searchQuery, onSearchChange, roleFilter, onRoleFilterChange, statusFilter, onStatusFilterChange, total, }: UserFiltersBarProps` | Operación lógica directa |

#### [UserRoleBadge.tsx](./file:/c:/Users/DELL/Desktop/wordspace/msp_client_portal/client/src/components/users/UserRoleBadge.tsx)

_Ruta: `client/src/components/users/UserRoleBadge.tsx`_

##### Funciones auxiliares / Standalone:

| Función         | Parámetros                            | Descripción              |
| :-------------- | :------------------------------------ | :----------------------- |
| `UserRoleBadge` | `{ role, label }: UserRoleBadgeProps` | Operación lógica directa |

#### [UserStatsBar.tsx](./file:/c:/Users/DELL/Desktop/wordspace/msp_client_portal/client/src/components/users/UserStatsBar.tsx)

_Ruta: `client/src/components/users/UserStatsBar.tsx`_

##### Funciones auxiliares / Standalone:

| Función        | Parámetros                              | Descripción              |
| :------------- | :-------------------------------------- | :----------------------- |
| `UserStatsBar` | `{ stats, loading }: UserStatsBarProps` | Operación lógica directa |

### 5.6. Rendimiento del Runtime y Telemetría (Faro)

Las mejoras Tier-1 de rendimiento del frontend quedan documentadas de forma formal en
[`docs/decisions/ADR-006-frontend-runtime-performance-and-faro-telemetry.md`](docs/decisions/ADR-006-frontend-runtime-performance-and-faro-telemetry.md). Resumen operativo:

#### 5.6.1. Code-Splitting por Gateways Livianos

Los barrels de cada feature (`client/src/features/<domain>/index.ts`) exportan únicamente **routes, services,
queryOptions, hooks y types** — ya no re-exportan páginas ni componentes de UI. Las páginas se cargan
exclusivamente mediante el `import()` lazy de cada `routes.tsx` de feature. Toda importación sigue pasando por el
gateway público `@/features/<domain>` (invariante ADR-002).

Cuando un componente debe seguir siendo público en un gateway pero permanecer lazy, se re-exporta un _wrapper_
lazy con su propio `<Suspense>` (ejemplo: `client/src/features/rmm/components/ScheduleMaintenanceModal.lazy.tsx`
exportado desde `@/features/rmm`).

#### 5.6.2. Telemetría: Grafana Faro (única RUM)

- Datadog RUM fue eliminado del cliente (`@datadog/browser-rum`, `telemetry/datadog.ts`, args `VITE_DD_*`). Datadog
  queda solo como APM del servidor.
- Faro se inicializa **de forma diferida** en `client/src/main.tsx` (vía `import('@/telemetry/faro').then(...)` sobre
  `requestIdleCallback` con timeout de 3 s), de modo que el SDK nunca bloquea el primer render.
- Los chunks de Faro/OTel se agrupan en un bucket lazy `vendor-rum` (`vite.config.ts`).
- Construcción: `.github/workflows/deploy.yml` inyecta `VITE_FARO_URL` (secret `VITE_FARO_URL`) más
  `VITE_FARO_APP_NAME`/`VITE_FARO_APP_ENV` como build args del Dockerfile del cliente.

#### 5.6.3. Entregables de Reducción de Bytes

| Ítem                            | Antes                        | Después                    |
| ------------------------------- | ---------------------------- | -------------------------- |
| JS+CSS inicial raw              | 2,461 KB                     | ≈ 1,680 KB                 |
| JS+CSS inicial gzip             | 662 KB                       | ≈ 478 KB                   |
| `modulepreload` en `index.html` | 26                           | 22                         |
| SDK Datadog RUM                 | eager (168-173 KB)           | eliminado                  |
| Páginas                         | duplicadas en el entry chunk | chunks lazy independientes |

Además:

- **Fuentes** auto-alojadas (interrumpido el `@import` de Google Fonts; `JetBrains Mono Variable` vía
  `@fontsource-variable/jetbrains-mono`).
- **Assets** optimizados: `logo.png` 864×670 → 512 px (226.8 → 82.3 KB); `favicon.svg` con PNG de 128 px (303 → 17.6 KB).
- **Entrega**: `gzip_static on;` en `client/nginx.conf` (Brotli por el middleware de compresión de Traefik en el edge);
  `sw.js` precachea solo `/index.html` (navegación network-first).
- **Limpieza**: eliminados shims legacy (`components/tickets/*`, `components/new-ticket-modal.tsx`,
  `components/devices/index.ts`, forwarders muertos de `routes/_app/*` y `routes/_auth/*`).
- **Preloaders**: `lib/preloadRoute.ts` conserva el prefetch de **cache de consultas** (TanStack Query) en hover/focus;
  se retiraron los preloaders de chunk inefectivos (el gateway ya está en el grafo estático).

---

## 6. Arquitectura de Deep Links y Estado de Recursos por URL

La aplicación implementa patrones avanzados de URLs para aplicaciones SaaS que permiten a los usuarios guardar en marcadores (bookmarking), compartir enlaces exactos y mantener la navegación persistente:

### 6.1. Patrones de URL Soportados

1. **IDs Dinámicos (`/tickets/:id`, `/devices/:id`):**
   - Rutas RESTful asociadas a entidades individuales con resolución dinámica de migas de pan (breadcrumbs).
2. **Pestañas y Sub-vistas por Parámetros de Búsqueda (`?tab=...`):**
   - Vistas secundarias en `/billing?tab=plans`, `/help?tab=billing`, `/profile?tab=security`.
   - Mantiene activo el componente de layout (`AppLayout`) y la barra lateral (sidebar) sin desmontar la estructura ni reiniciar el scroll.
3. **Modales y Overlays Compartibles (`?openModal=...&...`):**
   - Apertura automática de modales al navegar o cargar un enlace compartido:
     - `/tickets?openModal=create-ticket`
     - `/billing?openModal=pay-invoice&invoiceId=...`
     - `/billing?openModal=invoice-details&invoiceId=...`
     - `/help?tab=billing&faq=4` (expande automáticamente una pregunta del FAQ).

### 6.2. Hook `useUrlState`

El hook [`useUrlState.ts`](file:///c:/Users/Public/Workspace/msp_client_portal/client/src/hooks/useUrlState.ts) encapsula `useSearchParams` de `react-router-dom` para ofrecer actualización atómica y reactiva de los query parameters sin perder otros filtros o estados activos en la URL.

---

## 7. Infraestructura de Almacenamiento en la Nube y Túnel WireGuard (TrueNAS / Nextcloud)

Para el aprovisionamiento automatizado de cuotas de respaldo en la nube (25 GB por slot de equipo en `subscription_equipment`) y el acceso remoto multi-dispositivo de los clientes, la plataforma se integra con una instancia dedicada de **Nextcloud** desplegada sobre **TrueNAS SCALE** (`cloud-storage-srv-1`).

### 7.1. Topología del Túnel Sitio a Cliente (Site-to-Client)

Dado que el almacenamiento del cliente se ubica tras una IP WAN dinámica sin puertos públicos abiertos en su router perimetral, se implementa un túnel cifrado **WireGuard**:

```
Clientes (Navegador / App de Escritorio Nextcloud)
                      │
                [ HTTPS / TLS ]
                      ▼
VPS Traefik Ingress (Linode 172.235.145.77)
                      │
              [ reverse-proxy net ]
                      ▼
Nginx Gateway (`cloud_gateway` / Stack 18)
                      │
                      │ WireGuard Hub (10.13.13.1 / Stack 14)
                      │ [ UDP:51820 cifrado ]
                      ▼
TrueNAS Host (`cloud_wg_client` / Stack 19) [10.13.13.3]
                      │
             [ Puerto Host :30027 ]
                      ▼
Contenedor Nextcloud (`ix-nextcloud`: 172.16.1.5:80)
```

### 7.2. Tabla de Enrutamiento y Direcciones IP

| Nodo / Servicio          | Rol de Red       | Dirección IP / Puerto             | Propósito                                           |
| :----------------------- | :--------------- | :-------------------------------- | :-------------------------------------------------- |
| **Linode VPS Hub**       | `wg0` Hub        | `10.13.13.1:51820`                | Concentrador de túneles WireGuard                   |
| **TrueNAS SCALE**        | `wg0` Spoke      | `10.13.13.3/32`                   | Cliente WireGuard (host netns)                      |
| **Nextcloud WebDAV/OCS** | Servicio Interno | `10.13.13.3:30027`                | Comunicación directa de `NextcloudService`          |
| **Acceso Público**       | Dominio Traefik  | `https://cloud.velmartech.com.do` | Acceso para clientes y sincronización de escritorio |

### 7.3. Operación en el Backend (`NextcloudService.ts`)

El servicio [`NextcloudService.ts`](file:///c:/Users/Public/Workspace/msp_client_portal/server/src/modules/system/services/NextcloudService.ts) del módulo de sistema interactúa directamente con `10.13.13.3:30027`:

- **`getStorageUsage()`**: Consulta la cuota utilizada y disponible mediante WebDAV `PROPFIND` en `/remote.php/dav/files/{user}/`.
- **`provisionUser()`**: Crea cuentas individuales por slot mediante el API OCS (`POST /ocs/v1.php/cloud/users`).
- **`deleteUser()`**: Elimina cuentas al reducir slots o cancelar suscripciones (`DELETE /ocs/v1.php/cloud/users/{id}`).
- **`getUserStorage()`**: Obtiene métricas individuales de almacenamiento en bytes para el portal de clientes.

Para especificaciones operativas, scripts de diagnóstico y runbooks de infraestructura, consultar [`docs/infrastructure/WIREGUARD_NEXTCLOUD_INTEGRATION.md`](file:///c:/Users/Public/Workspace/msp_client_portal/docs/infrastructure/WIREGUARD_NEXTCLOUD_INTEGRATION.md).

---

## 8. Estándares de Git, Convención de Commits y Hooks Locales (Husky & Commitlint)

El monorepo implementa **Conventional Commits** y validación automatizada mediante **Husky** y **Commitlint** a nivel raíz para garantizar un historial limpio y habilitar el versionamiento semántico automatizado (`commit-and-tag-version`).

### 8.1. Estructura de Mensajes de Commit

```text
<type>(<scope>): <resumen en modo imperativo>

[cuerpo opcional con lista de cambios detallados y justificación técnica]

[pie opcional con referencia a issues: Closes #123]
```

### 8.2. Tipos Admitidos

- `feat`: Nuevas funcionalidades o capacidades añadidas.
- `fix`: Corrección de errores (bugs).
- `docs`: Modificaciones exclusivamente en archivos de documentación.
- `style`: Ajustes visuales, formateo de código, estilos CSS o UI sin alterar lógica.
- `refactor`: Reestructuración de código sin alterar el comportamiento observable ni corregir bugs.
- `perf`: Mejoras de rendimiento y optimización de consultas/renders.
- `test`: Creación o ajuste de pruebas unitarias y de integración.
- `build`: Cambios en dependencias, empaquetado o herramientas de compilación.
- `ci`: Modificaciones en pipelines de CI/CD (`.github/workflows/`).
- `chore`: Tareas de mantenimiento y lanzamientos de versión (`chore(release): 1.5.5`).
- `revert`: Reversión de un commit previo.

### 8.3. Ámbitos (Scopes) del Dominio

- **Módulos**: `auth`, `tickets`, `billing`, `subscriptions`, `rmm`, `equipment`, `crm`, `notifications`, `system`
- **Capas Globales**: `client`, `server`, `ui`, `i18n`, `infra`, `shared`, `deps`

### 8.4. Validación Automatizada con Husky y Commitlint

- **Configuración**: [`.commitlintrc.json`](file:///c:/Users/eapolanco/Workspace/msp_client_portal/.commitlintrc.json) extiende `@commitlint/config-conventional`.
- **Hook de Git**: [`.husky/commit-msg`](file:///c:/Users/eapolanco/Workspace/msp_client_portal/.husky/commit-msg) intercepta el comando `git commit` y valida la sintaxis antes de permitir la creación del commit.
- **Instalación Automática**: El script `prepare` en el [`package.json`](file:///c:/Users/eapolanco/Workspace/msp_client_portal/package.json) raíz instala los hooks automáticamente tras ejecutar `npm install`.

---

## 9. Tarifas, Facturación (NCF), Impuestos (ITBIS) y Sistema de Falta de Pago

### 9.1. Impuestos e ITBIS 18% y Multi-Moneda

- **Cálculo de ITBIS**: Todas las tarifas y precios calculados por `BillingPricingService` no incluyen el dieciocho por ciento (18%) de ITBIS, el cual se aplica automáticamente sobre el subtotal de la factura final.
- **Monedas Admitidas**: Soporte completo para Dólares Estadounidenses (`USD`) y Pesos Dominicanos (`DOP`) con formateo regional (`$100.00 USD` / `RD$ 5,800.00 DOP`).

### 9.2. Emisión de Comprobantes Fiscales (NCF) y Validación de RNC

- **Validación DGII (`rncValidator.ts`)**:
  - RNC de Personas Jurídicas: 9 dígitos numéricos validados con algoritmo **Módulo 11**.
  - Cédula de Personas Físicas: 11 dígitos numéricos validados con algoritmo **Módulo 10 (Luhn)**.
- **Generación Secuencial de NCF Serie B01 (`NcfService.ts`)**:
  - Emite comprobantes de Factura de Crédito Fiscal (`B0100000001` - `B0199999999`) cuando el cliente o la empresa inquilina posee un RNC válido registrado antes del corte de facturación.

### 9.3. Escala Gradual de Suspensión por Falta de Pago

El servicio `NonPaymentSuspensionService` y la tarea programada `SubscriptionScheduler` evalúan la factura vencida más antigua de cada cliente/inquilino aplicando las siguientes fases:

- **Día 1 de Vencimiento**: Notificación electrónica de cobro automatizada (`sendInvoiceOverdueNoticeEmail`) y alerta en la plataforma.
- **Día 5 de Vencimiento**: Transición a **Modo Solo Lectura (`READ_ONLY`)**. La directiva `AccountStatusPolicy.assertWriteAllowed` bloquea la creación de tickets, respuestas en hilos, subida de archivos adjuntos y vinculación de nuevos equipos.
- **Día 15 de Vencimiento**: **Suspensión Total (`SUSPENDED`)**. Se desactiva el acceso a la plataforma (`is_active = false`) y se pausan los servicios de soporte técnico.
- **Día 30 de Vencimiento**: **Depuración Técnica Permanente (`PURGED`)**. Para liberación de almacenamiento en servidores, se eliminan las cuentas de usuario de almacenamiento en la nube (Nextcloud) vía API y se revocan las credenciales de agentes de hardware, con cero responsabilidad para LA EMPRESA.
- **Restablecimiento Automático**: La liquidación y pago de las facturas pendientes mediante PayPal o confirmación de transferencia bancaria ejecuta `restoreAccountIfPaid()`, restableciendo inmediatamente el inquilino y los usuarios al estado `ACTIVE`.

### 9.4. Evaluación de Salud de la Cuenta y Revisiones QBR (BL-601)

El servicio `ClientHealthService` evalúa de forma continua la estabilidad técnica y la postura de seguridad de cada inquilino mediante la fórmula canónica:
$$H = 0.40 \times S_{\text{ticket}} + 0.30 \times S_{\text{hardware}} + 0.30 \times S_{\text{security}}$$

- **Sub-puntaje de Soporte ($S_{\text{ticket}}$):** Deducciones de 25 puntos por tickets en estado `CRITICAL` sin resolver, 5 puntos por tickets abiertos y 20 puntos adicionales por violaciones a los umbrales de escalación de SLA (BL-104).
- **Sub-puntaje de Infraestructura ($S_{\text{hardware}}$):** Deducciones de 15 puntos por equipos inactivos (>7 días), 15 puntos por saturación de disco (>85%) y 10 puntos por sobrecarga de memoria (>90%).
- **Sub-puntaje de Seguridad ($S_{\text{security}}$):** Deducciones de 8 puntos por cada parche de seguridad o actualización crítica pendiente en endpoints monitoreados.
- **Disparador de Revisión QBR:** Puntuaciones globales inferiores al $70\%$ (`score < 70`) generan automáticamente una advertencia para que el vCIO programe una Revisión Comercial Trimestral (_Quarterly Business Review - QBR_) prioritaria con el cliente.

---

## 10. Arquitectura de Inteligencia Artificial (AIaaS), BYOK y Cumplimiento de la Ley 172-13

### 10.1. Principio de Cero Responsabilidad Financiera (Zero-Liability BYOK)
Velmar Technology opera bajo una política estricta de **Cero Pasivo Financiero** en servicios de Inteligencia Artificial gestionada (AIaaS). El portal no revende micro-tokens ni asume costes de consumo de computación LLM. Las instituciones educativas y empresas cliente aportan sus propias credenciales de API (**BYOK - Bring Your Own Key**) directamente con OpenAI o Anthropic. La facturación de Velmar se limita exclusivamente al licenciamiento del software, mantenimiento del servidor MCP y soporte técnico con SLA.

### 10.2. Cumplimiento de la Ley No. 172-13 sobre Protección de Datos Personales
Para salvaguardar la privacidad de menores de edad, registros académicos y datos sensibles de docentes en centros educativos dominicanos, el sistema implementa la capa de filtrado determinista `CafPrivacyFilter` antes de que cualquier texto cruce los límites de la red hacia los proveedores externos de IA:
- **Cédulas y RNC:** `001-1234567-8` $\rightarrow$ `[CEDULA_01]`
- **Matrículas Estudiantiles:** `2024-0891`, `MAT-4491` $\rightarrow$ `[MATRICULA_01]`
- **Correos Electrónicos y Teléfonos:** Reemplazados por identificadores anónimos (`[EMAIL_01]`, `[TELEFONO_01]`).
- **Nombres de Alumnos y Docentes:** Detectados contextualmente y convertidos a tokens de reemplazo.
- **Aislamiento en Memoria:** La tabla de re-identificación reside única y temporalmente en la memoria volátil del servidor durante la ejecución y nunca se almacena en bases de datos externas o almacenamiento no volátil.

### 10.3. Cifrado en Reposo AES-256-GCM y Máscara de Claves
Las credenciales de API de los inquilinos se persisten en la tabla `tenant_byok_credentials`:
- **Cifrado Fuerte:** Cifradas en reposo mediante **AES-256-GCM** utilizando un vector de inicialización criptográfico aleatorio (`key_iv`) y etiqueta de autenticación (`key_auth_tag`).
- **Máscara Segura en API:** La API y la base de datos exponen únicamente la clave ofuscada (`key_masked`, ej. `sk-pr...7890`). Ningún endpoint cliente devuelve la llave en texto claro.
- **Validación en Memoria:** El servicio `TenantByokService.testConnection` realiza consultas ligeras en memoria a los endpoints de modelos de OpenAI/Anthropic para verificar saldo y conectividad antes de guardar sin consumir prompts pesados.

### 10.4. Proxy MCP Privado y Sincronización Cero-Secretos (Zero-Secret Desktop Setup)
Para su uso en **Claude Desktop**, **Cursor** o **Copilot Studio**, el portal web genera un bloque de configuración que apunta al proxy MCP de Velmar (`https://helpdesk.velmartech.com.do/mcp/caf`):
- **Cero Secretos Locales:** El archivo `claude_desktop_config.json` contiene únicamente la URL del endpoint y la cabecera `X-Tenant-Id`. Los profesores y directores jamás manipulan claves maestras en texto plano en sus ordenadores.
- **Sincronización Dinámica M2M:** Al recibir una invocación de herramienta CAF, `TenantByokManager` resuelve las credenciales del colegio bajo demanda a través de la ruta interna `GET /api/v1/internal/byok/:tenantId`, autenticada mediante `MSP_API_KEY`.
- **Revocación Instantánea:** Si el colegio rota o revoca su clave en el portal web, todas las instancias de escritorio reflejan el cambio de inmediato sin necesidad de intervenir los equipos cliente.

### 10.5. Endpoints y Control de Entitlements (BL-204)
Los endpoints del módulo (`server/src/modules/system/controllers/TenantByokController.ts`) están protegidos bajo la regla **BL-204**:
- `PUT /api/v1/byok`: Actualiza credenciales; protegido por `requireSubscriptionFeature(FEATURE_CODES.CAF_EDUCATION_AGENT)`.
- `GET /api/v1/byok/status`: Consulta el estado de configuración y máscara de clave.
- `POST /api/v1/byok/test`: Prueba la conexión con el proveedor y devuelve métricas de latencia.
- `GET /api/v1/internal/byok/:tenantId`: Endpoint M2M interno protegido por token de servicio para la sincronización con `@msp/mcp-server`.
- **Ruta Web:** `/settings/ai` gestionada por `ByokSettingsPage` con soporte bilingüe (`en_US.json` / `es_DO.json`) y sincronización de pestañas en URL (`useUrlState`).

---

## 11. Ingesta de Telemetría de Alto Rendimiento, Búfer Redis Write-Behind y Clúster WebSocket Mesh (5,000 Endpoints) (@see ADR-011)

### 11.1. Contexto de Escala y Descarte de Directus / Microservicios
Para satisfacer una carga operativa de 500 a 5,000 estaciones de trabajo conectadas concurrentemente (~300 pings/s y WebSockets bidireccionales continuos), se descartaron dos alternativas:
- **Directus:** Descartado porque genera SQL directo que elude los 18 invariantes de negocio (BL-101 a BL-802), añade 25+ tablas ajenas a la base de datos y es incompatible con el PDP Zanzibar ReBAC/ZSP.
- **Reescritura a Microservicios en Go/Rust:** Descartada por fricción innecesaria, pérdida de seguridad de tipos compartidos (`@shared/contracts`) y fragmentación de repositorios. Node.js 22 maneja holgadamente 10,000+ eventos de E/S por segundo; el cuello de botella era la persistencia síncrona en PostgreSQL.

### 11.2. Fortificación de Base de Datos y Upserts Atómicos (`RmmTelemetryRepository`)
- **Upsert en 1 Consulta SQL:** Se eliminó el patrón de dos pasos (`SELECT` previo seguido de `UPDATE`/`INSERT`). Ahora `upsertTelemetry` ejecuta una única sentencia atómica PostgreSQL:
  `INSERT INTO rmm_device_telemetry (...) VALUES (...) ON CONFLICT (equipment_id) DO UPDATE SET ...`
- **Operación por Lotes (`upsertTelemetryBatch`):** Inserta hasta 500 registros de telemetría en un solo roundtrip mediante referencias `EXCLUDED` (`COALESCE(EXCLUDED.cpu_usage, ...)`), reduciendo drásticamente la saturación del pool de conexiones `pg`.
- **Índice Compuesto para Sweeps de Equipos Offline:** Migración `046_add_rmm_telemetry_status_sync_index.sql` añade el índice `idx_rmm_telemetry_status_sync` sobre `(agent_status, last_sync_at)` en `rmm_device_telemetry`, eliminando lecturas secuenciales completas en la tabla durante las limpiezas periódicas de agentes desconectados.

### 11.3. Búfer de Escritura Diferida (Write-Behind) en Memoria Redis (`TelemetryBufferService`)
- **Latencia Sub-2ms:** Las señales de vida y telemetría de los agentes se escriben en Redis Hash `telemetry:device:<id>` en menos de 2 milisegundos con TTL de 24 horas, registrando el identificador del equipo en el Redis Set `telemetry:dirty_devices`.
- **Vaciado Micro-Batch cada 3 Segundos (`flushBatch`):** Un temporizador periódico extrae hasta 500 claves sucias con `spop`, lee las instantáneas en pipeline `hgetall` y realiza una única escritura agrupada en PostgreSQL vía `upsertTelemetryBatch`. Esto reduce el volumen de transacciones de escritura a disco en más del 95%.
- **Respaldo en Memoria y Vaciado Limpio:** Si Redis se desconecta, el búfer conmuta de inmediato a un `Map` en memoria sin perder telemetría. Durante el apagado controlado del servidor (`SIGTERM`/`SIGINT`), `telemetryBufferService.stop()` drena todos los registros sucios restantes antes de cerrar el proceso.

### 11.4. Malla de Distribución WebSocket con Redis Pub/Sub (`AgentClusterBroker` y `AgentGateway`)
- **Enrutamiento Transparente Multi-Worker:** En configuraciones de varios procesos o contenedores, los WebSockets de los equipos remotos terminan en distintos workers. Cuando se envía un comando (`sendCommand`), `AgentGateway` verifica si el socket está en la memoria local; si no lo está, lo publica a través de `AgentClusterBroker.publishCommand()`.
- **Canales por Patrón:** Los workers se suscriben a los canales `agent:cmd:*` y `agent:res:*` usando una conexión duplicada dedicada (`RedisClientService.createSubscriberClient()`).
- **Resolución Correlacionada:** El worker que aloja el socket físico despacha el mensaje al agente, recibe la respuesta y la publica en `agent:res:<correlationId>`. El worker originador resuelve la promesa asíncrona de inmediato.
- **Presencia en Clúster:** Se mantiene el conjunto `agent:cluster:online` en Redis para conocer en tiempo real si un equipo está activo en cualquier nodo del clúster (`isAgentConnectedInCluster`).

### 11.5. Ejecutor de Clúster Multi-Worker (`cluster.ts`)
- Módulo `server/src/cluster.ts` basado en `node:cluster` que crea un grupo de procesos worker según la variable `WEB_CONCURRENCY` o el número de núcleos de CPU detectados.
- Los workers comparten el mismo puerto HTTP/WS (3001) mediante distribución a nivel de sistema operativo.
- El proceso maestro supervisa la salud de los workers y reinicia automáticamente cualquier worker que falle (`cluster.on('exit')`), retransmitiendo las señales `SIGTERM`/`SIGINT` para un apagado ordenado.
- Compilación integrada en `server/tsup.config.ts` produciendo `dist/cluster.js` y script en `server/package.json` (`npm run start:cluster`).

---

## 12. Grafo de Conocimiento GraphRAG Fuera de Línea y Flujo de Desarrollo con Antigravity (@see ADR-012)

### 12.1. Arquitectura Híbrida de Extracción sin Claves de API Externas
Para resolver la orientación arquitectónica en un monorepo de más de 1,000 archivos sin incurrir en costes de API ni depender de proveedores externos:
- **Pase Estructural AST Determinista:** Analiza código TypeScript, Rust y SQL mediante `tree-sitter`, extrayendo 6,148 nodos y 17,686 aristas con coste cero y tiempo de ejecución inferior a 5 segundos.
- **Extracción Semántica Asistida por el Agente Host:** En ausencia de `GEMINI_API_KEY` o `GOOGLE_API_KEY`, el agente de Antigravity asume el rol del modelo extractor LLM. Los 77 documentos de arquitectura, ADRs y especificaciones se procesan por subagentes en lotes discretos bajo el contrato `extraction-spec.md`.
- **Identificadores Normalizados y Puntuación de Confianza:** Identificadores deterministas `{stem}_{entity}` y clasificación estricta de aristas (`EXTRACTED` = 1.0; `INFERRED` $\in \{0.95, 0.85, 0.75, 0.65, 0.55\}$; `AMBIGUOUS` $\in [0.1, 0.3]$).

### 12.2. Detección de Comunidades y Agregación Meta-Grafo (>5,000 Nodos)
- **Clustering Leiden:** Agrupa 6,845 nodos y 17,516 aristas en **321 comunidades funcionales**, identificando nodos centrales (_God Nodes_) y puentes no obvios entre subsistemas.
- **Visualización HTML Agregada:** Al superar el límite de 5,000 nodos (`node_limit=5000`), el exportador genera automáticamente un meta-grafo visual en [`graphify-out/graph.html`](file:///c:/Users/PC/Workspace/msp_client_portal/graphify-out/graph.html) compuesto por 321 meta-nodos de comunidad y 999 puentes ponderados entre módulos, evitando sobrecargas en el navegador.

### 12.3. Integración con Antigravity CLI (`agy`) y Ciclo de Vida ("Orient First, Grep Second")
- **Consultas Directas al Grafo:** Los desarrolladores y agentes de IA consultan el grafo antes de realizar búsquedas textuales directas en el código:
  `python -m graphify query "<pregunta>" --budget 6000`
  `python -m graphify explain "<entidad>"`
  `python -m graphify path "<origen>" "<destino>"`
- **Actualización Diferencial Ultrarrápida (`graphify update`):** El manifiesto `.graphify_manifest.json` rastrea hashes de archivo; las modificaciones de código se re-indexan en menos de 3 segundos sin consumo de tokens.
- **Modo Vigilante en Segundo Plano:** Sincronización continua de cambios de código con `python -m graphify watch`.

