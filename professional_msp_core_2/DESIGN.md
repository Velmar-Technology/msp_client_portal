---
name: Professional MSP Core
colors:
  surface: '#f7f9fb'
  surface-dim: '#d8dadc'
  surface-bright: '#f7f9fb'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f2f4f6'
  surface-container: '#eceef0'
  surface-container-high: '#e6e8ea'
  surface-container-highest: '#e0e3e5'
  on-surface: '#191c1e'
  on-surface-variant: '#45464d'
  inverse-surface: '#2d3133'
  inverse-on-surface: '#eff1f3'
  outline: '#76777d'
  outline-variant: '#c6c6cd'
  surface-tint: '#565e74'
  primary: '#000000'
  on-primary: '#ffffff'
  primary-container: '#131b2e'
  on-primary-container: '#7c839b'
  inverse-primary: '#bec6e0'
  secondary: '#515f74'
  on-secondary: '#ffffff'
  secondary-container: '#d5e3fd'
  on-secondary-container: '#57657b'
  tertiary: '#000000'
  on-tertiary: '#ffffff'
  tertiary-container: '#002113'
  on-tertiary-container: '#009668'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#dae2fd'
  primary-fixed-dim: '#bec6e0'
  on-primary-fixed: '#131b2e'
  on-primary-fixed-variant: '#3f465c'
  secondary-fixed: '#d5e3fd'
  secondary-fixed-dim: '#b9c7e0'
  on-secondary-fixed: '#0d1c2f'
  on-secondary-fixed-variant: '#3a485c'
  tertiary-fixed: '#6ffbbe'
  tertiary-fixed-dim: '#4edea3'
  on-tertiary-fixed: '#002113'
  on-tertiary-fixed-variant: '#005236'
  background: '#f7f9fb'
  on-background: '#191c1e'
  surface-variant: '#e0e3e5'
typography:
  display-lg:
    fontFamily: Inter
    fontSize: 48px
    fontWeight: '700'
    lineHeight: 56px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 40px
    letterSpacing: -0.01em
  headline-lg-mobile:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  title-md:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-sm:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-mono:
    fontFamily: JetBrains Mono
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.05em
  table-header:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  base: 4px
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 32px
  container-max: 1440px
  gutter: 20px
  margin-mobile: 16px
  margin-desktop: 32px
---

## Marca y Estilo

El sistema de diseño está orientado a plataformas de Servicios Gestionados de TI (MSP), donde la fiabilidad y la precisión son fundamentales. La personalidad de la marca es **autoritaria, eficiente y transparente**, diseñada para transmitir una sensación de control absoluto sobre infraestructuras críticas.

El estilo visual se clasifica como **Corporativo Moderno**. Se aleja de los adornos innecesarios para centrarse en la densidad de información y la claridad operativa. Utiliza una estética de capas limpias, alineación rigurosa a la cuadrícula y un uso estratégico del color para indicar estados del sistema sin saturar la interfaz. El objetivo es evocar una respuesta emocional de seguridad y profesionalismo técnico.

## Colores

La paleta se fundamenta en la psicología de la confianza y el rendimiento técnico:

- **Primario (Deep Blue):** `#0F172A`. Se utiliza para la navegación principal, encabezados de alto nivel y elementos que anclan la estructura. Representa estabilidad.
- **Secundario (Slate Gray):** `#334155`. Aplicado en tipografía secundaria, iconos de soporte y bordes sutiles. Aporta un tono profesional y neutro.
- **Terciario (Emerald Green):** `#10B981`. Reservado exclusivamente para indicadores de "Salud del Sistema", estados activos y confirmaciones de éxito.
- **Neutros:** Una escala de grises azulados (`#F8FAFC` a `#64748B`) para fondos de sección y superficies, manteniendo la interfaz fresca y legible.

El modo por defecto es **Claro (Light)**, con una superficie de trabajo limpia para maximizar la legibilidad durante jornadas laborales prolongadas.

## Tipografía

Se utiliza **Inter** como la familia tipográfica principal debido a su excepcional legibilidad en pantallas de alta densidad y su apariencia técnica pero moderna. 

Para datos específicos, como direcciones IP, IDs de servidor o registros de consola, se introduce **JetBrains Mono** en niveles de etiquetas (labels). Esto ayuda al usuario a diferenciar visualmente entre contenido narrativo y datos técnicos precisos.

Los encabezados utilizan un peso semibold con un tracking (espaciado entre letras) ligeramente negativo para una apariencia más compacta y "high-end". El cuerpo de texto estándar se mantiene en 14px o 16px para asegurar la comodidad en la lectura de informes y logs.

## Layout & Spacing

Este sistema de diseño emplea un **Grid de 12 columnas fijo** para el contenido central, con una anchura máxima de 1440px, permitiendo que los dashboards mantengan una estructura predecible en monitores ultra-wide.

El ritmo espacial se basa en una unidad de **4px**. 
- **Escritorio:** Márgenes laterales de 32px y gutters de 20px. Las tarjetas de datos utilizan un padding interno de 24px (lg).
- **Móvil:** Transición a un layout de columna única con márgenes de 16px. Los elementos interactivos mantienen un área de toque mínima de 44px.

La jerarquía visual se refuerza mediante el uso de "espacio negativo" alrededor de los KPIs críticos, evitando el hacinamiento de datos.

## Elevación y Profundidad

Para mantener el aspecto profesional y moderno, el sistema de diseño utiliza **Capas Tonales** y **Sombras de Ambiente** muy sutiles.

1.  **Nivel 0 (Fondo):** `#F8FAFC`. Superficie base de la aplicación.
2.  **Nivel 1 (Tarjetas/Contenedores):** Fondo blanco puro (`#FFFFFF`) con un borde de 1px en `#E2E8F0`. No se utilizan sombras aquí para mantener la limpieza.
3.  **Nivel 2 (Elementos Flotantes/Dropdowns):** Sombras difusas de baja opacidad (`rgba(15, 23, 42, 0.08)`) con un radio de desenfoque amplio (12px-16px) para indicar interactividad sobre el plano principal.

No se permiten degradados complejos. La profundidad se comunica a través del contraste entre superficies blancas y fondos grisáceos.

## Formas

Se ha seleccionado un nivel de redondez **Soft (Suave)**. 
- Los botones, campos de entrada y tarjetas utilizan un radio de **4px** (`0.25rem`). 
- Los componentes de estado (badges) y avatares pueden utilizar un radio mayor para suavizar la interfaz, pero los contenedores estructurales siempre mantienen esquinas técnicas y precisas. 

Esta decisión equilibra la modernidad de las interfaces actuales con la rigidez necesaria en un entorno de software empresarial.

## Componentes

### Botones
- **Primarios:** Fondo `#0F172A`, texto blanco, esquinas de 4px.
- **Secundarios:** Borde de 1px `#334155`, fondo transparente, texto `#334155`.
- **Estado:** Para acciones críticas (borrar), usar fondo `#EF4444`.

### Badges de Estado (Status Badges)
Deben ser compactos y utilizar fondos con baja opacidad (10-15%) del color de estado con texto en el color de estado sólido:
- **Online:** Fondo verde claro, texto `#10B981`.
- **Warning:** Fondo ámbar claro, texto `#F59E0B`.
- **Critical:** Fondo rojo claro, texto `#EF4444`.

### Tablas de Datos
Las tablas son el núcleo del MSP. 
- **Encabezados:** Fondo `#F1F5F9`, texto en `table-header` (semibold, 12px).
- **Filas:** Altura mínima de 48px, bordes inferiores sutiles.
- **Interacción:** Resaltado de fila en `#F8FAFC` al hacer hover.

### Tarjetas de Precios / Planes
Diseñadas con un énfasis en la claridad de las características. El precio debe usar `headline-lg`. Las características incluidas deben usar iconos de check en `#10B981`.

### Campos de Entrada (Inputs)
Borde de 1px `#CBD5E1`. En estado de foco, el borde cambia a `#0F172A` con un anillo de sombra azul muy tenue de 2px.