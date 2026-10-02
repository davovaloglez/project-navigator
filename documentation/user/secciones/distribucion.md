# Distribución de Puntos

Una vista visual de **cómo está repartida la carga del portafolio**: qué clientes pesan más, qué épicas concentran trabajo, qué arquitectos cargan más story points y cuántos puntos están entregados vs pendientes.

## ¿Para qué sirve?

- Identificar de un vistazo dónde está concentrada la carga.
- Comparar cuánto trabajo ya entregamos vs cuánto queda pendiente por arquitecto.
- Detectar cuentas o clientes que pesan desproporcionadamente respecto al resto.
- Ver el balance entre épicas (¿qué áreas absorben más capacidad?).

## ¿Qué ves?

### KPIs (arriba)

| Tarjeta | Qué muestra |
|---|---|
| **Puntos totales** | Suma de story points de todos los proyectos visibles |
| **Puntos entregados** | Suma de puntos de proyectos en estatus "Done" |
| **Puntos activos** | Suma de puntos de proyectos que NO están "Done" ni "On Hold" |
| **Promedio / proyecto** | Puntos totales ÷ cantidad de proyectos |

### Gráficas

- **Puntos por Cliente (donut)** — qué clientes concentran más story points. Leyenda debajo con el conteo por cliente.
- **Puntos por Arquitecto (barras apiladas)** — para cada arquitecto, cuántos puntos ya entregó (verde) y cuántos le quedan pendientes (azul). Útil para ver balance de carga y avance real.
- **Puntos por Épica (barras horizontales)** — qué temáticas de producto absorben más esfuerzo.
- **Puntos por Cuenta (barras horizontales)** — peso de cada cuenta comercial.

### Filtro PM

Arriba a la derecha. Selecciona un PM y todos los KPIs y gráficas se recalculan sobre su portafolio.

## ¿Cómo lo uso?

1. Abre la sección sin filtros para tener la foto global del portafolio.
2. Si lideras un PM, filtra por tu nombre — verás únicamente tu carga distribuida.
3. Cruza "Puntos por Arquitecto" con "Puntos por Épica" para detectar si un arquitecto está cargado en una sola épica (riesgo de cuello de botella) o repartido en varias.
4. Si una cuenta concentra >40% de los puntos, considera si la dependencia comercial es saludable.

## ¿Por qué importa?

Los puntos son la unidad de esfuerzo que estimamos por adelantado. Verlos distribuidos te permite:

- Planear capacidad: si una arquitectura concentra el 60% de los puntos pendientes, sabes a quién aliviar.
- Reportar a cuentas: cuántos puntos están entregados vs pendientes en SU cuenta.
- Detectar desbalance: una épica con 200 puntos pendientes y otra con 20 cuenta una historia clara de prioridades.

## Persistencia de tus filtros

Lo que se guarda entre sesiones y dispositivos:

- Filtro PM seleccionado.

Si quieres borrar todos los filtros guardados del tablero de un tirón, ve a [Cuenta → Preferencias](cuenta.md).

## Preguntas comunes

- **¿Por qué un arquitecto no aparece en su gráfica?** Si todos sus proyectos tienen 0 puntos, queda fuera (filtramos `puntos > 0` para que la gráfica sea legible).
- **¿"Puntos activos" incluye los proyectos en On Hold?** No. Solo cuenta los proyectos vivos (no Done, no On Hold). Los On Hold están pausados y no consumen capacidad ahora mismo.
- **¿Por qué el total cambia cuando filtro por PM?** Porque al filtrar, sólo se cuentan los proyectos de ese PM. Es la respuesta correcta: "¿cuánto carga MI PM?" depende sólo de sus proyectos.
- **¿Los puntos vienen de las tareas granulares del cronograma?** No. Estos son los puntos a nivel de proyecto del Sheet `Projects`. Para la vista detallada por tarea ve a [Cronograma](cronograma.md).
