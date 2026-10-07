# Guía de usuario — Project Navigator

Bienvenido. Esta guía está pensada para que **cualquier persona del equipo** (PMs, líderes, dirección, miembros de equipo) entienda qué hay en cada pantalla del tablero, qué decisiones puedes tomar con esa información y dónde encontrar lo que buscas.

No necesitas saber programar para leer esta guía.

## ¿Qué es Project Navigator?

Es el tablero interno de **gestión del portafolio de proyectos** de Vortex IT. En una sola interfaz puedes ver:

- El estado de cada proyecto (avance, salud, riesgos, responsables).
- Qué tareas tiene en marcha cada producto (App y Core), con cuántos puntos y quién las lleva.
- Cómo va el equipo en sus cursos de capacitación.
- Cuánto cuesta el portafolio y cómo se aplica el modelo financiero de pricing.
- Pronósticos de cuándo terminarán los proyectos, qué bloqueos vienen y quién está sobrecargado.
- Alertas automáticas que destacan lo que necesita atención hoy.

La información se actualiza desde un **Google Sheet maestro**. El tablero **no** modifica esos datos (salvo guardar snapshots semanales para los pronósticos): es una capa de lectura, visualización y análisis.

## ¿Cómo navego?

El menú lateral (sidebar) agrupa las secciones por tema. Cada sección de esta guía explica:

1. **Para qué sirve** la sección.
2. **Qué ves** (bloques principales).
3. **Cómo úsala** (filtros, navegación, atajos).
4. **Por qué importa** para la operación del portafolio.

## Índice por sección

### Visión general
- [Inicio (Dashboard)](secciones/dashboard.md) — Personalizable, mezcla KPIs y widgets.
- [Resumen ejecutivo](secciones/resumen.md) — Salud del portafolio + lo bueno y lo que duele.
- [Alertas](secciones/alertas.md) — Centro de notificaciones automáticas.

### Vistas de portafolio
- [Portafolio](secciones/portafolio.md) — Grid de proyectos con filtros y búsqueda.
- [Roadmap](secciones/roadmap.md) — Vista por hito y épica.
- [Timeline](secciones/timeline.md) — Gantt con zoom y proyección.

### Detalle granular
- [Cronograma](secciones/cronograma.md) — Tareas finas de App + Core.
- [Distribución de puntos](secciones/distribucion.md) — Cómo se reparte la carga del equipo.

### Pronóstico y planeación
- [Pronósticos](secciones/pronosticos.md) — Motor de proyección de fechas.
- [Detalle de pronóstico](secciones/pronostico-detalle.md) — Vista por proyecto con simulador.

### Personas y formación
- [Equipo](secciones/equipo.md) — Directorio.
- [Comparativa](secciones/comparativa.md) — Autoevaluaciones trimestrales cruzadas (solo administradores).
- [Cursos](secciones/cursos.md) — Progreso de capacitación.
- [Perfil de persona](secciones/persona-detalle.md) — Carga, proyectos y cursos por individuo.

### Finanzas
- [Costos](secciones/costos.md) — Costo del portafolio + modelo de pricing.

### Detalle de proyecto y tarea
- [Detalle de proyecto](secciones/proyecto-detalle.md) — Toda la información de un proyecto en una pantalla.
- [Detalle de tarea](secciones/tarea-detalle.md) — Ficha completa de una actividad del cronograma con ratio de estimación.

### Herramientas auxiliares
- [Glosario](secciones/glosario.md) — Diccionario de cada KPI y bloque del tablero.
- [Novedades](secciones/novedades.md) — Qué cambió en cada versión.
- [Métricas de devs](secciones/metricas-dev.md) — Comparativa de rendimiento (no aparece en el sidebar).
- [Cuenta](secciones/cuenta.md) — Configuración personal.
- [Administración](secciones/admin.md) — Gestión de usuarios y permisos (sólo administradores).

## Filtro por PM (global)

En 10 secciones del tablero hay un dropdown **"PM"** en la esquina superior derecha. Te permite restringir todo lo que ves a los proyectos de un Project Manager específico. Esto facilita la revisión personal o las 1:1.

Las secciones que tienen filtro PM son: Inicio, Resumen, Alertas, Portafolio, Roadmap, Timeline, Distribución, Costos, Métricas de Devs y Pronósticos.

Las secciones que **no** lo tienen son las que no se centran en proyectos: Cronograma (tareas), Cursos (capacitación) y Equipo (directorio).

## Persistencia de tus filtros

Cuando seleccionas un filtro en cualquier sección, **se guarda automáticamente y persiste entre dispositivos**. Si entras al tablero desde otra computadora, encontrarás los filtros tal como los dejaste.

Si quieres borrar todo de un jalón, ve a [Cuenta → Preferencias](secciones/cuenta.md) y usa el botón **"Limpiar todos los filtros"**.

## ¿Algo no aparece o se ve raro?

- Refresca la pantalla con el ícono de recargar en la esquina superior derecha de cada sección. Los datos vienen cacheados 5 minutos para mejorar el desempeño.
- Si un dato no luce correcto, revisa primero el Google Sheet original. El tablero refleja lo que está ahí.
- Para definiciones precisas de cualquier métrica, ve al [Glosario](secciones/glosario.md) o haz clic en el ícono `i` que aparece junto al título de cada bloque.
