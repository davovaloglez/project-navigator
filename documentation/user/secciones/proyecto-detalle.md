# Proyecto (detalle)

La ficha completa de **un proyecto**. Llegas aquí desde el grid de Portafolio, el roadmap, las alertas, los pronósticos o desde cualquier card del Dashboard. Te da todo el contexto: estado, equipo, fechas, costo, comparación contra su épica/hito y proyectos relacionados.

## ¿Para qué sirve?

- Tener **la foto completa** de un proyecto en una sola página.
- Ver quién está asignado (arquitecto, PM, devs) y saltar a su perfil.
- Comparar este proyecto contra el promedio de su épica y de su hito.
- Detectar **acciones pendientes** (qué requiere, qué falta, quién debe hacer qué).
- Saber **cuánto cuesta al mes** y cómo se distribuye entre el equipo.
- Navegar al proyecto **siguiente o anterior** del portafolio sin volver al grid.

## ¿Qué ves?

### Encabezado

- **Folio** del proyecto (e.g. `H/PROJECT-34`).
- **Nombre** del proyecto.
- **Badges** con estatus, salud, prioridad, tipo (si aplica) y el **health score** con su etiqueta (Excelente/Bueno/Medio/Bajo/Crítico).
- **"Ver en plataforma"** — si el proyecto tiene URL externa (e.g. Jira, ClickUp), botón para abrirla.

Junto al breadcrumb hay flechas `‹` y `›` para ir al proyecto **anterior** o **siguiente** del portafolio.

### Resumen rápido (KPI strip)

Hasta 5 indicadores en línea:

| KPI | Qué dice |
|---|---|
| **Progreso** | % de avance reportado. |
| **Días restantes / atraso** | Cuánto falta para la fecha estimada (o cuánto lleva vencido). "Listo" si está Done. |
| **Story points** | Puntos asignados al proyecto. |
| **Health score** | Score 0-100 cruzando estatus, salud, avance esperado vs real, vencimiento, etc. |
| **Costo est./mes** | Costo prorrateado del equipo asignado (solo si hay datos). |

### Progreso General

Un **gauge** semicircular con el %. Debajo se listan los **factores** del health score (e.g. "Vencido", "Sin avance", "Bloqueado") para saber por qué bajó.

### Línea de Tiempo

- **Barra horizontal** del inicio al fin estimado, con el % completado al fondo y un marcador "HOY" donde estás en el tiempo.
- **Lista de fechas**: inicio, registro, fin estimado, fin real (si Done), hito y épica.
- Si está **vencido**, badge rojo "Nd atraso".

### Comparativa

Si el proyecto pertenece a una épica o hito con otros proyectos, ves dos barras dobles:

- **Promedio del grupo** (azul/morado tenue).
- **Este proyecto** (sólido, verde si está arriba del promedio, rojo si está abajo).

Para cada uno se compara **progreso** y **salud**. Útil para saber si este proyecto está jalando el grupo arriba o abajo.

### Acciones pendientes

Bloque ámbar (solo si aplica) con:

- **Requiere de** — qué bloqueador externo está esperando este proyecto.
- **Acción requerida** — qué hay que hacer concretamente.
- **Fecha de acción** — cuándo se espera ejecutar.

### Equipo

Cards clickeables con avatar + nombre + rol. Click → perfil de esa persona.

- **Arquitecto** del proyecto.
- **PM** asignado.
- **Developers** (uno por card).

### Cliente

Si el proyecto tiene cliente externo, su nombre + cuenta.

### Costo Estimado

Si hay info de costos, ves:

- Costo mensual total.
- Desglose por persona (rol, nombre, share).
- Link "Ver costos completos" → `/costos`.

> Estos costos son **prorrateados**. Si una persona trabaja en 4 proyectos, su costo se divide entre los 4. No es el costo "asignado por contrato" — es la estimación de cuánto cuesta este proyecto considerando que el equipo se comparte.

### Proyectos Relacionados

Hasta 6 cards con otros proyectos de la **misma épica** o del **mismo arquitecto**. Cards compactos con folio, nombre, estatus, % progreso y arquitecto. Click para saltar a ese proyecto.

## ¿Cómo lo uso?

1. **Llegas aquí desde otra sección** (Portafolio, Alertas, Resumen, Dashboard). El detalle se abre con el folio en la URL.
2. **Revisa el encabezado y el KPI strip** — te dan el estado general en 5 segundos.
3. **Si hay acciones pendientes**, ese bloque ámbar es la primera prioridad: te dice qué falta.
4. **La comparativa** te dice si el proyecto está alineado con su grupo o si requiere atención especial.
5. **El equipo** te lleva a perfiles individuales con un clic, si quieres ver carga de trabajo de alguien.
6. **Usa las flechas** del breadcrumb para revisar proyectos vecinos sin volver al grid completo.

## ¿Por qué importa?

- Es la **vista canónica** para una revisión 1:1 con el PM, una junta de estado o un análisis ad-hoc.
- Concentra **todas las señales** del proyecto: lo declarado (estatus, salud, fechas) y lo inferido (health score, costo prorrateado, factores).
- Te conecta con el **equipo y proyectos vecinos** sin necesidad de buscar.

## Preguntas comunes

- **¿Por qué la URL tiene `--` en lugar de `/`?** El folio original es `H/PROJECT-34` pero la URL no puede tener `/`, así que lo convertimos a `H--PROJECT-34`. Es solo cosmético — internamente se vuelve a traducir.
- **¿Por qué el costo dice "Costo est./mes"?** Es una estimación basada en quién está asignado y cuánto cuesta su rol al mes (del módulo de Costos). Si una persona está en varios proyectos, su costo se prorratea.
- **¿Por qué no veo Comparativa?** Solo aparece si el proyecto pertenece a una épica O hito con **más de un proyecto**. Si es el único en su grupo, no hay con qué comparar.
- **¿Qué pasa si el proyecto no existe?** Verás un cartel "Proyecto no encontrado". Verifica el folio o vuelve al portafolio.
- **¿Por qué hay un marker "HOY" en la línea de tiempo?** Para que veas a primera vista si **vas adelantado o atrasado** vs el plan: si la barra de progreso está por debajo del marker HOY, vas atrás.
- **¿Cómo abro a una persona del equipo?** Clic en el card de la persona en la columna derecha. Se abre su perfil con sus proyectos, tareas y cursos.
