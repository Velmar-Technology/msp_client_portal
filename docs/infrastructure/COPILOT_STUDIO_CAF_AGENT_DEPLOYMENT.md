# Deployment & Operations Guide: Microsoft Copilot Studio CAF Educational Quality Agent & MCP Server

_Status: Production-Ready · Version: 1.0.0 · Date: 2026-09-15_

---

## 1. Overview & Architecture

This guide provides the complete end-to-end deployment runbook for integrating the **Model Context Protocol (MCP)** server ([`@msp/mcp-server`](../../packages/mcp-server/)) with **Microsoft Copilot Studio** to operate autonomous **Educational Quality & Accreditation Agents (Common Assessment Framework - CAF)** under a **Bring Your Own Key (BYOK)** model.

### System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                 Microsoft Copilot Studio                     │
│  - Agent: "Agente CAF de Calidad Educativa"                │
│  - Generative AI Orchestration (Dynamic Tool Calling)       │
└──────────────────────────────┬──────────────────────────────┘
                               │ Streamable HTTP (JSON-RPC)
                               │ Headers: X-API-Key: <TOKEN>
                               │          X-Tenant-Id: <SCHOOL_ID>
                               │          X-BYOK-Api-Key: <LLM_KEY>
                               ▼
┌─────────────────────────────────────────────────────────────┐
│           VPS Public Ingress (Traefik v3.6.4)               │
│               https://helpdesk.velmartech.com.do/mcp/caf     │
│          (Terminates TLS, Let's Encrypt `myresolver`)        │
└──────────────────────────────┬──────────────────────────────┘
                               │ reverse-proxy Docker network
                               ▼
┌─────────────────────────────────────────────────────────────┐
│            Container: msp_mcp_prod (:3005)                  │
│  - Image: msp_mcp_prod:latest (Node.js 22 Alpine)           │
│  - Profile: 'caf-education' (Strict Isolation: Zero IT Tools)│
│  - Privacy Shield: CafPrivacyFilter (Dominican Law 172-13)  │
│  - Multi-Tenant Manager: TenantByokManager                  │
└──────────────────────────────┬──────────────────────────────┘
                               │ Direct BYOK API Calls
                               ▼
┌─────────────────────────────────────────────────────────────┐
│         External LLM Providers (OpenAI / Anthropic)         │
│          (Billed 100% to Educational Institution)           │
└─────────────────────────────────────────────────────────────┘
```

> [!IMPORTANT]
> **Tool Isolation & Security Boundary:**
> Connecting Copilot Studio to the isolated endpoint `/mcp/caf` guarantees that the educational agent only discovers the 7 pedagogical and privacy tools. Administrative MSP IT tools (`msp_remote_exec_powershell`, `msp_list_invoices`, etc.) are completely excluded from the schema, enforcing the Principle of Least Privilege.

---

## 2. Infrastructure & Ingress Specification

The MCP server runs as a managed container within the **`msp_portal`** stack on Portainer CE (`https://helpdesk.velmartech.com.do:9443`):

| Property | Value | Notes |
| :--- | :--- | :--- |
| **Public Endpoint (CAF)** | `https://helpdesk.velmartech.com.do/mcp/caf` | Traefik reverse proxy to `msp-mcp-svc:3005/mcp/caf` |
| **Health Check URL** | `https://helpdesk.velmartech.com.do/mcp/caf/health` | Returns `HTTP 200` with profile `caf-education` |
| **Container Name** | `msp_mcp_prod` | Defined in [`docker-compose.prod.yml`](../../docker-compose.prod.yml) |
| **Transport** | Stateless Streamable HTTP | Per-request fresh transport per MCP 2026-07-28 specification |
| **Inbound Auth** | `X-API-Key` or `Authorization: Bearer <key>` | Timing-safe validation against `MSP_API_KEY` |
| **Tenant & BYOK Headers** | `X-Tenant-Id`, `X-BYOK-Api-Key`, `X-BYOK-Provider` | Multi-tenant routing and customer-funded token credentials |

---

## 3. Step-by-Step Copilot Studio Configuration

### Step 1: Create the Agent
1. Sign in to [Microsoft Copilot Studio](https://copilotstudio.microsoft.com/).
2. Click **Agents** (or **Copilots**) in the left navigation and select **+ New agent**.
3. Set the agent details:
   - **Name:** `Agente CAF de Calidad Educativa`
   - **Description:** `Asistente autónomo de autoevaluación institucional bajo el Marco Común de Evaluación (CAF). Audita evidencias documentales, analiza encuestas de satisfacción con anonimización de datos (Ley 172-13) y genera el Plan de Mejora Institucional (PMI).`
   - **Primary Language:** `Spanish` (Español).

---

### Step 2: Enable Generative Orchestration
> [!IMPORTANT]
> Copilot Studio **must** use generative orchestration to dynamically discover and invoke MCP tools based on user intent.

1. Go to **Settings** (gear icon) in the upper right.
2. Select **Generative AI**.
3. Under **How should your agent decide how to respond?**, select **Generative**.
4. Click **Save**.

---

### Step 3: Add the MCP Server Tool
1. In the **Build** tab, select **Tools** from the left panel.
2. Click **+ Add a tool** and select **Model Context Protocol (MCP)**.
3. Configure the server connection:
   - **Server name:** `CafEducationMcp`
   - **Server description:** `Servidor privado de herramientas CAF y anonimización de datos para centros educativos.`
   - **Server URL:** `https://helpdesk.velmartech.com.do/mcp/caf`
   - **Authentication:** Select **API key**
   - **Parameter type:** Select **Header**
   - **Header name:** `X-API-Key`
   - **Key value:** Paste your active portal API key or Admin JWT token.

---

### Step 4: Establish and Bind the Connection
1. After clicking **Add and configure**, Copilot Studio presents the **Select a connection** screen.
2. Click the dropdown next to **Connection** (showing `Not connected ⛔`).
3. Select **+ Create new connection**.
4. Paste your token when prompted and click **Create**.
5. Once the badge turns green (**Connected 🟢**), click the **Add** button in the bottom right.
6. Copilot Studio will automatically discover and register the 7 isolated CAF tools.

---

### Step 5: Configure Master Agent Instructions
In the **Overview** > **Instructions** text area, paste the following system prompt:

```markdown
Eres el Asesor Senior de Calidad y Acreditación Educativa para Centros Escolares, especializado en el Marco Común de Evaluación (CAF) y potenciado por la infraestructura segura de Velmar Technology.

Tu objetivo principal es asistir a directores académicos, coordinadores y comités de calidad a evaluar evidencias, analizar encuestas y diseñar el Plan de Mejora Institucional (PMI).

### 1. Flujos de Trabajo Maestros

#### Flujo A: Auditoría de Evidencias Documentales (Criterios 1 al 9)
Cuando el usuario proporcione un documento institucional (PEI, POA, manual de convivencia, actas de claustro, memorias de gestión):
1. Si el usuario indica el colegio o tenantId, utiliza ese identificador en la llamada.
2. Invoca la herramienta `caf_audit_evidence` pasando el texto del documento.
   - El servidor aplicará automáticamente el filtro de privacidad local (Ley Dominicana 172-13) anonimizando cédulas, nombres de alumnos y matrículas antes de la evaluación.
3. Presenta los resultados en un formato ejecutivo claro:
   - **Puntaje Global y Grado:** (ej. 78/100, Grado B).
   - **Tabla Resumen de Criterios:** Detalla puntaje (0-100) y nivel de madurez (Inicial, En Desarrollo, Definido, Gestionado, Optimizado) para los 9 criterios (Agentes y Resultados).
   - **Brechas Documentales Críticas:** Lista las evidencias que faltan según el estándar CAF.
   - **Matriz FODA:** Resume fortalezas y debilidades identificadas.

#### Flujo B: Análisis Psicométrico de Encuestas (Criterios 6 y 7)
Cuando el usuario suba respuestas de encuestas de estudiantes, docentes o familias:
1. Invoca `caf_analyze_survey_sentiment` pasando la lista de encuestas.
2. Presenta el desglose cuantitativo:
   - Porcentaje general de satisfacción de la comunidad escolar.
   - Distribución de sentimiento (Positivo, Neutro, Negativo).
   - Impacto directo en Criterio 6 (Alumnos y Familias) y Criterio 7 (Personal Docente).
   - Principales fortalezas reconocidas y quejas urgentes a atender.

#### Flujo C: Síntesis del Plan de Mejora Institucional (PMI)
Una vez completada la auditoría o identificadas las brechas:
1. Invoca `caf_generate_improvement_plan` pasando el reporte de auditoría.
2. Presenta el Plan de Mejora oficial con:
   - Resumen Ejecutivo y Meta de Crecimiento (ej. elevar de 72% a 87%).
   - Acciones Priorizadas (Alta, Media, Baja) con sus Objetivos SMART, Indicador KPI medible, Plazo estimado (ej. Mes 1-3) y Rol Responsable institucional.

#### Flujo D: Configuración de Credenciales BYOK por Colegio
Si un administrador escolar desea registrar o actualizar su clave propia de API (OpenAI o Anthropic):
1. Invoca `caf_configure_tenant_byok` con el `tenantId`, `provider` y la clave de API.
2. Confirma al usuario que las credenciales han sido guardadas en su partición aislada de datos.

---

### 2. Normas de Seguridad y Privacidad (Ley 172-13)
1. **Confidencialidad de Menores:** Jamás expongas nombres reales, cédulas ni datos personales de alumnos en tus respuestas. Confirma siempre al usuario que la anonimización local está activa.
2. **Rol Asesor:** Recuerda al Comité de Calidad que tus informes constituyen un borrador analítico objetivo y que la validación final recae sobre el comité evaluador humano.

---

### 3. Estilo y Formato de Respuesta
- Profesional, pedagógico y estructurado.
- Emplea tablas Markdown para comparar criterios y puntajes.
- Concluye siempre con 2 o 3 recomendaciones de acción inmediata.
```

---

## 4. Catálogo de Herramientas CAF Registradas

| Herramienta | Parámetros | Descripción Funcional |
| :--- | :--- | :--- |
| **`caf_audit_evidence`** | `documentText`, `tenantId`, `criteriaFilter`, `dryRun` | Evalúa evidencias contra los 9 criterios CAF con anonimización en memoria. |
| **`caf_analyze_survey_sentiment`** | `surveys`, `tenantId`, `dryRun` | Convierte opiniones de encuestas en métricas cuantitativas para Criterios 6 y 7. |
| **`caf_detect_documentary_gaps`** | `documentText`, `tenantId`, `dryRun` | Identifica omisiones documentales y expedientes no conformes. |
| **`caf_generate_improvement_plan`** | `auditReport`, `targetYear`, `tenantId` | Sintetiza el Plan de Mejora Institucional (PMI) con metas SMART y KPIs. |
| **`caf_anonymize_text`** | `text`, `tenantId` | Demuestra la sanitización previa de cédulas, matrículas y teléfonos (Ley 172-13). |
| **`caf_configure_tenant_byok`** | `tenantId`, `provider`, `apiKey`, `model` | Registra la clave propia de OpenAI/Anthropic del colegio (Zero-Liability). |
| **`caf_get_tenant_byok_status`** | `tenantId` | Consulta el estado del servicio y filtro de privacidad sin revelar la clave. |

---

## 5. Live Verification Runbook

### Test 1: Verificar Liveness y Aislamiento del Endpoint
```bash
curl -i https://helpdesk.velmartech.com.do/mcp/caf/health
```
**Respuesta Esperada:** `HTTP/1.1 200 OK` con metadatos JSON:
```json
{
  "status": "UP",
  "server": "caf-education-server",
  "version": "1.12.0",
  "spec": "MCP 2026-07-28 (Stateless Streamable HTTP)",
  "transport": "streamable-http",
  "activeProfile": "caf-education",
  "availableEndpoints": {
    "cafIsolated": "/mcp/caf (Academic CAF 9 Criteria & PII Privacy Only)",
    "supportAdmin": "/mcp (Configured Profile / Administrative)"
  }
}
```

### Test 2: Inicialización MCP Streamable (JSON-RPC)
```bash
curl -X POST https://helpdesk.velmartech.com.do/mcp/caf \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -H "X-API-Key: <YOUR_PORTAL_API_KEY>" \
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"CopilotStudioTest","version":"1.0"}}}'
```

### Test 3: Prompts de Prueba en el Canvas de Copilot Studio
1. *"Por favor audita este extracto del POA 2026 del Colegio San José: 'La dirección cuenta con Misión y Visión orientada a la tecnología, pero no tiene código de ética ratificado. Contamos con 2 laboratorios de cómputo y fibra óptica gestionada por Velmar, pero falta inventario de licencias. La profesora Carmen Santana (cédula 001-0987654-3) coordinó las jornadas pedagógicas.'"*  
   $\rightarrow$ El agente ejecuta `caf_audit_evidence`, confirma la anonimización de la cédula y evalúa los criterios.
2. *"Analiza estas encuestas de satisfacción escolar: Estudiante: 'Los laboratorios de robótica son geniales'. Docente: 'Falta tiempo para planificación'. Padre: 'Buena comunicación pero la plataforma es lenta'."*  
   $\rightarrow$ El agente ejecuta `caf_analyze_survey_sentiment` y desglosa la métrica para Criterios 6 y 7.
3. *"Con base en las brechas encontradas, genera el Plan de Mejora Institucional para el año 2026."*  
   $\rightarrow$ El agente ejecuta `caf_generate_improvement_plan` con objetivos SMART e indicadores KPI.

---

## 6. Troubleshooting & Operaciones

### Problema 1: `HTTP 401 Unauthorized` en Copilot Studio
* **Causa:** El encabezado `X-API-Key` no coincide con la clave configurada en el servidor.
* **Solución:** Revisa la conexión en Copilot Studio y actualiza el token de acceso de Velmar.

### Problema 2: Error `BYOK_KEY_MISSING` al auditar
* **Causa:** El colegio no ha registrado su clave de OpenAI/Anthropic ni se pasó en la petición.
* **Solución:** Invoca `caf_configure_tenant_byok` con el `tenantId` correspondiente o define `BYOK_DEFAULT_API_KEY` en el entorno.

### Problema 3: Reinicio o Logs del Contenedor en VPS
```bash
# Inspeccionar logs del contenedor MCP
docker logs msp_mcp_prod --tail 50

# Reiniciar contenedor si es necesario
docker restart msp_mcp_prod
```
