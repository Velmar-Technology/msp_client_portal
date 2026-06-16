# Directrices de Desarrollo para IA (Mesa de Ayuda)

## 1. Arquitectura del Proyecto
Este proyecto es un **Monolito en Capas (Layered Monolith)** utilizando el **Stack PERN** (PostgreSQL, Express, React, Node.js). Todo el código (Frontend y Backend) residirá en este repositorio monorepo, pero con una separación estricta de responsabilidades.

## 2. Stack Tecnológico
* **Base de Datos:** PostgreSQL.
* **Backend:** Node.js + Express.
* **Frontend:** React.
* **Lenguaje:** TypeScript (Estrictamente tipado).

## 3. Estructura de Directorios (Monolito)
Debes respetar la siguiente estructura al generar o modificar archivos:

/
├── client/                 # Frontend en React
│   ├── src/
│   │   ├── components/     # Componentes UI reutilizables
│   │   ├── pages/          # Vistas principales (ClientDashboard, TechDashboard)
│   │   ├── services/       # Llamadas a la API (Axios/Fetch)
│   │   └── hooks/          # Custom hooks para lógica de UI
├── server/                 # Backend en Express (Arquitectura de Capas)
│   ├── src/
│   │   ├── routes/         # Definición de endpoints (Solo ruteo)
│   │   ├── controllers/    # Manejo de peticiones HTTP (Req/Res)
│   │   ├── services/       # Lógica de negocio core (Reglas de asignación, SLAs)
│   │   ├── repositories/   # Acceso directo a datos (PostgreSQL/ORM queries)
│   │   ├── models/         # Entidades de la base de datos
│   │   └── utils/          # Utilidades (Integración WhatsApp, Email)
└── AGENTS.md               # Este archivo

## 4. Reglas de Capas en el Backend (¡CRÍTICO!)
* **Rutas (`routes/`):** NO deben contener lógica de negocio. Solo delegan al controlador.
* **Controladores (`controllers/`):** Se encargan de procesar el `req`, validar el input, llamar al Servicio correspondiente, y retornar el `res`.
* **Servicios (`services/`):** Aquí reside **TODA** la lógica de negocio (ej. validación de la regla de 1 hora, lógica de distribución rotativa de tickets). Los servicios NO deben saber nada de HTTP (req/res).
* **Repositorios (`repositories/`):** Son la única capa autorizada para interactuar con PostgreSQL. Los servicios llaman a los repositorios.

## 5. Reglas de Negocio a Considerar
Al generar código para los módulos, ten en cuenta el contexto funcional del sistema:
1.  **Tickets:** Entidad principal. Tienen estados y categorías (Reparación, Garantía, Caída de Servicio).
2.  **SLA de 1 Hora:** Validaciones de tiempo estrictas para acciones post-creación en garantías/servicios.
3.  **Distribución:** El servicio de asignación debe soportar asignación equitativa (Round-Robin) y filtrado por especialidad del técnico (ej. "Técnico TV").
4.  **Eventos/Notificaciones:** Los cambios de estado de un ticket en la capa de Servicio deben disparar notificaciones automatizadas (Email/WhatsApp) mediante funciones de la carpeta `utils/`.