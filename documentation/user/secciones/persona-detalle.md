# Persona (detalle)

El **perfil** de una persona del equipo. Reúne en una sola vista todo lo que esa persona está haciendo: proyectos, tareas del cronograma, cursos y costo asignado.

## ¿Para qué sirve?

- Saber **en qué está trabajando** alguien sin tener que preguntarle.
- Ver su **carga** (cuántos proyectos / cuántas tareas / cuántos puntos).
- Medir su **rendimiento** (% completados, puntualidad, salud promedio).
- Detectar **señales de sobrecarga** (muchos proyectos en riesgo, tareas bloqueadas).
- Verificar **progreso de cursos** asignados.
- Saber **cuánto cuesta al mes** y cómo se reparte su costo entre proyectos.

## ¿Qué ves?

### Encabezado

- **Avatar** con la inicial.
- **Nombre** de la persona.
- **Roles** que ejerce: Arquitecto, PM, Developer (aparecen los aplicables).
- **Health score promedio** de sus proyectos (verde si ≥65, ámbar 45-64, rojo <45).
- **Costo/mes** y **$/hora** (si están en la tabla de Costos).

### KPIs (7 indicadores)

| KPI | Qué dice |
|---|---|
| **Proyectos** | Cuántos tiene asignados (en cualquier rol). |
| **Progreso promedio** | % de avance promedio entre sus proyectos. |
| **Completados** | Cuántos están en Done. |
| **En riesgo** | Cuántos están en At Risk o Blocked / Critical. Se resalta si > 0. |
| **Pts entregados** | Story points sumados de los Done. |
| **Puntualidad** | % de proyectos Done que terminaron a tiempo (fin real ≤ fin estimado). "N/A" si ninguno tenía ambas fechas. |
| **Costo/mes** | Costo prorrateado entre sus proyectos activos (solo si hay datos). |

### Distribución de Estatus

Pie chart de cuántos proyectos tiene en cada estatus, con leyenda de conteos.

### Perfil de Rendimiento (radar)

Pentágono con 5 ejes:

- **Completación** — % de proyectos terminados.
- **Progreso** — promedio de avance.
- **Salud** — health score promedio.
- **Puntualidad** — % de proyectos a tiempo.
- **Capacidad** — qué tan lleno está (más proyectos, más alto, hasta saturar en 7).

A simple vista te dice si la persona está bien (forma grande y pareja), sobrecargada (Capacidad disparada) o con problemas crónicos (algún eje muy bajo).

### Progreso por Proyecto

Bar chart horizontal con cada proyecto y su % de avance. Coloreado verde/ámbar/rojo según threshold.

### Distribución de Costo

Si está en la tabla de Costos: lista de sus proyectos activos con cuánto le cuesta al mes a cada uno (el costo total se divide entre los proyectos activos). Click en cualquier fila → detalle del proyecto.

### Progreso en Cursos

Si la persona tiene curso asignado: mini-gauge con su % + ficha rápida (O.U., rol, jefe directo, PIDs creados).

### Proyectos Asignados

Grid de cards con sus proyectos. Cada card muestra folio, nombre, estatus, % progreso y un badge con el **rol que ejerce ahí** (Arquitecto / PM / Developer). Click → detalle del proyecto.

### Tareas del Cronograma

Si la persona tiene tareas granulares asignadas (de App o Core):

- **Mini-KPIs**: total / completadas / activas / bloqueadas / pts totales / pts entregados.
- **Reparto App vs Core** con conteos.
- **Lista** de tareas ordenadas por urgencia (bloqueadas primero, completadas al final). Cada fila tiene producto, nombre, funcionalidad, tipo, puntos y estatus.
- Link "Ver cronograma completo" → `/cronograma`.

## ¿Cómo lo uso?

1. **Llegas aquí** desde el directorio de Equipo, desde el detalle de un proyecto (clic en un miembro), o desde Cursos.
2. **Revisa el encabezado y KPIs** — la foto en 5 segundos.
3. **El radar te indica el estado general**: si está "Capacidad" saturada y "Salud" baja, esa persona necesita prioridad o ayuda.
4. **Mira "En riesgo"** — si tiene varios, vale revisar uno por uno.
5. **Tareas del Cronograma** te muestra el nivel más fino (qué exactamente está haciendo esta semana).
6. **Distribución de Costo** ayuda a la conversación de quién está asignado a qué y cuánto sale.

## ¿Por qué importa?

- Sustituye preguntas como "¿en qué está X?" con una página que se actualiza sola.
- Hace **visible la sobrecarga**: si alguien tiene 6 proyectos y 3 en riesgo, el radar y los KPIs lo gritan.
- Sirve para **1:1s**: abres su perfil, repasas sus proyectos y tareas, identifican prioridades juntos.
- Conecta tareas con proyectos: a veces alguien "no parece estar haciendo nada" en Projects pero tiene 15 tareas activas en el cronograma.

## Preguntas comunes

- **¿Por qué algunos perfiles muestran 0 proyectos cuando los abro desde Cursos?** Esto pasaba antes — los nombres no eran consistentes entre fuentes (Projects usa apodos como "Lore" y Cursos nombres completos). Ahora hay un **matching flexible** que detecta ambos. Si te pasa, repórtalo.
- **¿Qué significa "Puntualidad N/A"?** Significa que aún no hay proyectos terminados con fechas completas (fin estimado + fin real). Cuando cierre alguno con esos campos, aparecerá el porcentaje.
- **¿De dónde sale "Capacidad" en el radar?** Es una escala simple: 0 proyectos = 0, 7+ proyectos = 100. No es una medida científica, solo una alerta visual de cuán cargada está la persona.
- **¿Por qué no veo Costo/mes?** Si la persona no aparece en la tabla de Costos del Sheet (o su rol no matchea con los registros de costos), no se calcula.
- **¿Qué pasa si la persona tiene proyectos como Arquitecto Y como Developer?** Aparecen ambos roles arriba (pills), y cada card de proyecto muestra el rol que ejerce **en ese proyecto** específico.
- **¿Las tareas del Cronograma incluyen tareas de App + Core?** Sí. Los badges cyan/morado te indican de dónde viene cada una.
- **¿Cómo abro un proyecto desde aquí?** Click en cualquier card del grid "Proyectos Asignados" o en una fila de "Distribución de Costo". Te lleva al detalle del proyecto.
