# Cronograma — Tareas granulares App + Core

El nivel "micro" del tablero. Si Portafolio muestra **proyectos**, Cronograma muestra cada **tarea individual** registrada en las hojas `app` y `Core` del Sheet, con sus puntos, asignados, estatus y fechas.

## ¿Para qué sirve?

- Saber qué tareas tiene alguien asignadas y en qué estatus están.
- Ver el throughput semanal del equipo (cuántas tareas y puntos cierra por semana).
- Medir la precisión de las estimaciones del equipo de App (cuánto se desvía el tiempo real del estimado).
- Filtrar por producto, funcionalidad, persona, estatus o tipo de trabajo.

## ¿Qué ves?

### KPIs (arriba)

Siete contadores rápidos basados en las tareas que pasan los filtros:

| KPI | Qué mide |
|---|---|
| Total tareas | Cuántas tareas pasan los filtros |
| Completadas | Las marcadas como completadas |
| En proceso | Las marcadas como en proceso |
| Pendientes | Las marcadas como pendientes |
| Bloqueadas | Las marcadas como bloqueadas (resaltado en rojo si hay alguna) |
| Puntos totales | Suma de puntos de todas las tareas filtradas |
| Puntos entregados | Suma de puntos de las completadas (con el % al lado) |

### Gráficas

- **Distribución por Tipo de Trabajo** (pie) — qué porcentaje de las tareas son API, SP, App, Web, Análisis, SQA, Prototipo, etc. Cada tipo lleva su color semántico fijo.
- **Carga por Persona** (barras horizontales) — quién tiene más tareas asignadas. Útil para detectar desbalances.
- **Progreso por Funcionalidad** (barras horizontales apiladas) — para cada funcionalidad, cuántas tareas completadas vs pendientes. Te dice qué módulos del producto están casi cerrados y cuáles apenas inician.
- **Throughput Semanal** — gráfica combinada con **barras** (tareas completadas por semana) y **línea** (puntos entregados por semana) durante las últimas 12 semanas. La línea usa el eje derecho.
- **Precisión de Estimación (App)** — panel con tres buckets para tareas de App con estimación + tiempo efectivo registrados:
  - **Acertadas** — ratio entre 0.8 y 1.2 (±20% del estimado).
  - **Sub-estimadas** — tomaron más tiempo del estimado.
  - **Sobre-estimadas** — tomaron menos.
  Y un **ratio global** (tiempo efectivo total / estimación total). Si > 1.2 el equipo subestima; si < 0.8 sobreestima; si está en rango, las estimaciones están alineadas.

### Lista de tareas

Grid de cards (24 por página). Cada card muestra:

- Badge del producto (App o Core) y badge del estatus.
- Funcionalidad y nombre de la tarea.
- Tipo de trabajo con su color.
- Puntos.
- Tiempo efectivo (sólo tareas App con `ET` registrado).
- Asignado (clic para ir al perfil de la persona).
- Fechas de inicio → fin.

Las cards se ordenan poniendo **bloqueadas primero**, luego en proceso, pendientes, validación, completadas y canceladas al final. Las canceladas se ven con opacidad reducida.

## ¿Cómo lo uso?

### Filtros

- **Producto** — App o Core (selección única).
- **Funcionalidad** — uno o varios módulos.
- **Asignado** — una o varias personas.
- **Estatus** — uno o varios.
- **Tipo** — uno o varios tipos de trabajo.
- **Búsqueda** — busca dentro del nombre, descripción, funcionalidad y asignado.

Los filtros se combinan (AND). La búsqueda matchea por substring.

### Flujo típico

1. **Filtra por asignado** cuando preparas un 1:1 con alguien — ves todo lo suyo.
2. **Filtra por funcionalidad** cuando preparas un demo y necesitas saber qué cierra antes.
3. **Filtra por estatus = Bloqueado** para ver qué necesita destrabar el día de hoy.

## ¿Por qué importa?

Es el único lugar del tablero donde ves **trabajo individual**, no proyectos completos. Útil para:

- Tracking diario del equipo de desarrollo.
- Calibrar estimaciones futuras (el panel de Precisión es oro para retrospectivas).
- Ver si una funcionalidad de gran tamaño se está moviendo o está parada.

A diferencia de las otras secciones, **no tiene filtro PM**: las tareas no están atadas a un PM porque viven en una capa más baja (las hojas `app` y `Core` no llevan ese dato).

## Persistencia

Lo que **se queda guardado** entre sesiones y dispositivos:

- Filtros activos.

Lo que **no se queda**:

- La búsqueda (vuelves a verla vacía).
- La página en la que ibas.

El botón "Limpiar" resetea los filtros y la búsqueda en una sola acción.

## Preguntas comunes

- **¿Por qué no veo el filtro PM aquí?** Las tareas vienen de dos hojas separadas (`app` y `Core`) que no tienen columna de PM ni de folio de proyecto. Si quieres ver el trabajo de un PM en particular, ve a Portafolio y filtra ahí; las tareas viven un nivel debajo del portafolio.
- **¿Por qué la precisión es sólo de App?** Sólo App tiene columnas separadas para "Estimación" y "Tiempo efectivo" (ET). Core registra los puntos pero no se compara contra tiempo real, así que se excluye para no contaminar el indicador.
- **¿Qué significa ratio 1.4×?** El equipo tardó 1.4 veces más de lo que estimó. Si esto pasa consistentemente, las estimaciones deberían subir.
- **¿Por qué algunas tareas no muestran asignado?** El Sheet no tiene ese dato. Mientras nadie llena la columna, la card muestra "—".
- **¿Por qué el clic en el asignado lleva a un perfil distinto del que aparece en el card?** El tablero usa **fuzzy matching** entre apodos (Projects sheet) y nombres completos (Cronograma sheet). Si el matching falla, abre un issue.
