# Timeline — Calendario tipo Gantt

Vista horizontal del portafolio donde cada proyecto es una barra entre su fecha de inicio y su fecha de fin. La forma más rápida de ver **qué se traslapa con qué** y dónde están los choques de calendario.

## ¿Para qué sirve?

- Ver el calendario global de proyectos del trimestre o semestre.
- Detectar traslapes y choques de fechas.
- Identificar proyectos vencidos a simple vista (barra roja).
- Comparar la fecha planeada contra el **pronóstico** del motor (cuándo terminaría según el ritmo real).
- Saltar al detalle del proyecto o de su pronóstico.

## ¿Qué ves?

### Línea de hoy

Una línea azul vertical marca el día actual con la etiqueta "HOY" arriba. Al abrir la sección, la vista hace scroll automático para centrar HOY en pantalla.

### Barras de proyecto

Cada proyecto ocupa una fila. La barra va de `fecha inicio` (o `inicio estimado` si no hay fecha de inicio) a `fin real` (o `fin estimado`). Características:

- **Color de fondo** — el de su estatus (verde On Track, ámbar At Risk, rojo Blocked, etc.).
- **Fill interno** — el % de progreso.
- **Borde rojo** — el proyecto está vencido (`finEstimado` ya pasó y no está en Done).
- **% al inicio de la barra** — número grande indicando avance.
- **Tooltip al pasar el cursor** — aparece sobre la barra con el estatus, el porcentaje, el nivel de salud (coloreado) y las fechas de inicio y fin. Las etiquetas indican si cada fecha es real o estimada ("Inicio est.", "Fin est.").

Clic en la barra para ir al detalle del proyecto.

### Señales del rail izquierdo

A la izquierda de cada fila verás, en este orden: un **chip de color** con el estatus declarado por el PM (verde, ámbar, rojo, etc.) y junto a él un **icono de salud** coloreado según la salud calculada (estrella verde = excelente, alerta roja = crítico). Debajo, el nombre del proyecto, el folio y el arquitecto. Esta columna es fija y no se desplaza con el scroll horizontal.

Los dos iconos miden dimensiones distintas: el chip refleja lo que reporta el PM; el icono de salud lo calcula el sistema. Si un proyecto muestra "On Track" pero el icono de salud es rojo, hay un riesgo que aún no se ha declarado.

### Overlay de pronóstico

Cuando el toggle "Pronóstico visible" está activo (lo está por defecto), cada proyecto activo con datos suficientes muestra:

- **Ghost bar** — un rectángulo semitransparente con bordes punteados que **extiende** la barra original hasta la fecha que pronostica el motor. Sólo aparece si el pronóstico es **posterior** al fin planeado.
- **Diamante** — un romboide pequeño colocado exactamente sobre la fecha pronosticada. Su color refleja el riesgo (verde / ámbar / rojo). Clic para ir al detalle del pronóstico.

Apaga el toggle si quieres ver sólo el plan original.

### Línea de meses

En el header verás los nombres de los meses con líneas verticales suaves cruzando todo el cuerpo. Sirven de referencia visual para ubicar fechas rápido.

## ¿Cómo lo uso?

### Filtros

| Filtro | Permite múltiples | Opciones |
|---|---|---|
| Estatus | Sí | On Track, At Risk, Blocked / Critical, Done, Hypercare, On Hold, Upcoming |
| Arquitecto | Sí | Luis, Yorch, Eduardo, Hugo, Rodolfo |
| Hito | Sí | 2025 Q4, 2026 Q1, 2026 Q2 |
| PM | No | (todos los PMs del Sheet) |

Más:

- **Toggle "Incluir terminados"** — por defecto oculta los Done.
- **Toggle "Pronóstico visible"** — esconde/muestra el overlay de pronóstico.

### Zoom

Cinco niveles, controlados por los botones `ZoomIn` / `ZoomOut`:

1. **Ajustar** — la línea entera cabe en pantalla (sin scroll horizontal).
2. **3px/día** — vista comprimida, buena para horizontes largos (1 año+).
3. **6px/día** — vista intermedia.
4. **12px/día** — detalle mensual.
5. **20px/día** — máximo detalle, útil para alinear fechas exactas.

Botón **"Ir a hoy"** (icono `LocateFixed`) re-centra el scroll sobre HOY en cualquier momento.

## ¿Por qué importa?

Timeline es la vista del **planificador**. Mientras Portafolio te dice "qué hay" y Roadmap "cómo se agrupa", Timeline te dice **cuándo**. Es la vista que abres cuando alguien pregunta "¿podemos meter este proyecto en febrero?" o "¿qué se traslapa con la fase 2?".

El overlay de pronóstico convierte la pregunta de "cuándo se planeó terminar" a "cuándo va a terminar". Ese gap visual (el ghost bar) es exactamente lo que necesitas para tomar decisiones de re-planeación.

## Persistencia

Lo que **se queda guardado** entre sesiones y dispositivos:

- Filtros activos.
- Toggle "Incluir terminados".
- Toggle "Pronóstico visible".
- Nivel de zoom.

Lo que **no se queda**:

- A dónde habías hecho scroll (al volver, la vista se re-centra en HOY).

## Preguntas comunes

- **¿Por qué un proyecto no aparece en la línea?** El proyecto debe tener al menos una de estas fechas en el Sheet: fecha de inicio, inicio estimado, fin real o fin estimado. Si ninguna está cargada, no se puede ubicar en el calendario.
- **¿Por qué la barra arranca tan a la izquierda si el proyecto empieza después?** Si falta `fechaInicio`, el sistema usa `inicioEstimado` como inicio. Si tampoco existe ese campo, la barra se posiciona 30 días antes del fin estimado. Asigna la fecha de inicio real en el Sheet para corregir.
- **¿Por qué algunos proyectos no muestran diamante de pronóstico?** El motor necesita progreso > 0 + datos históricos suficientes. Para proyectos recién iniciados o sin avance, sale "Sin datos" en el chip de riesgo y no se dibuja overlay.
- **¿Por qué el ghost bar no aparece aunque el diamante sí?** Sólo se dibuja cuando el pronóstico es **posterior** al fin planeado. Si el motor proyecta terminar antes o igual, no hay desvío que mostrar.
- **¿Para qué sirve el tooltip que aparece al pasar el cursor sobre una barra?** Muestra el estatus, el avance, el nivel de salud calculado (coloreado) y las fechas de inicio y fin en un formato legible. Las etiquetas indican si los datos son reales o estimados, útil para saber de un vistazo qué tan firme es la fecha antes de hacer clic en el detalle.
- **¿Puedo arrastrar las barras para reprogramar?** No, Timeline es de lectura. Las fechas se editan en el Sheet.
