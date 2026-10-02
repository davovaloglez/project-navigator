# Detalle de tarea — toda la información de una actividad en un solo lugar

Cuando haces clic en el nombre de una tarea en el Cronograma, llegas a esta pantalla. Muestra en detalle qué es esa tarea, quién la lleva, cómo van los tiempos y qué tan precisa fue la estimación original.

## ¿Para qué sirve?

- Ver de un vistazo todo lo que corresponde a una actividad específica: estado, salud, puntos, avance.
- Entender si la estimación fue realista comparando los puntos estimados con el tiempo real registrado.
- Navegar al proyecto padre o al perfil del asignado sin perder el contexto.

## ¿Qué ves?

### Encabezado

El nombre completo de la tarea, su épica (si tiene), el folio de referencia y una fila de badges que indica: fase (Desarrollo, SQA, Análisis…), sprint, tipo de trabajo, prioridad y un link para abrir la tarea en la herramienta de origen.

El color del badge de estatus sigue el mismo semáforo que el Cronograma: verde para completado, azul para en proceso, etc.

### Cuatro KPIs

| Métrica | Qué significa |
|---|---|
| Puntos (est.) | Cuántos puntos se estimaron al inicio de la tarea |
| Real (tracked) | Cuántos puntos se registraron como trabajo real |
| Avance | Porcentaje de completitud reportado |
| Ratio real/est. | Cuántas veces más (o menos) tardó respecto a lo estimado |

El ratio se lee así: `1.0×` = estuvo exacto; `1.5×` = tardó 50% más de lo estimado (rojo); `0.7×` = tardó menos (azul).

### Detalles

Proyecto padre (con link), persona asignada (con link a su perfil), su rol en la actividad, fase, épica, línea de producto (OU), dificultad y prioridad.

### Fechas

Fecha de registro, inicio, fin estimado y fin real. Si ambas fechas extremas están disponibles, se muestra el rango completo al pie.

## ¿Cómo llego aquí?

Desde el [Cronograma](cronograma.md): haz clic en el título de cualquier tarjeta de tarea. El botón de regreso en el breadcrumb te devuelve al Cronograma.

## ¿Por qué importa?

Revisar el ratio real/estimado en tareas ya completadas ayuda a calibrar las estimaciones futuras. Si el equipo consistentemente subestima un tipo de tarea (ratio > 1.2 frecuente), conviene ajustar la referencia de puntos para ese tipo de trabajo.

## Preguntas comunes

- **¿Por qué sale "Tarea no encontrada"?** Los identificadores de tarea se calculan a partir del contenido de la hoja. Si alguien modificó el nombre, el sprint o el asignado en el Sheet, el identificador cambia y el link queda obsoleto. Busca la tarea desde el Cronograma para obtener el link nuevo.
- **¿Por qué no aparece el proyecto padre?** Si la tarea no está ligada a un proyecto del portafolio, o si no tienes acceso a ese proyecto, el campo muestra el nombre tal como viene en la hoja sin ser un link.
- **¿Puedo editar la tarea desde aquí?** No. El tablero es de lectura; los cambios se hacen en el Google Sheet maestro o en la herramienta de gestión de tareas.
