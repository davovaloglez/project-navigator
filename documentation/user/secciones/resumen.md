# Resumen ejecutivo

Vista de 30 segundos del estado del portafolio. Pensada para abrir la junta de dirección o un standup de PMs sin tener que armar un reporte.

## ¿Para qué sirve?

Responde a las preguntas que típicamente abren una reunión ejecutiva:

- "¿Cómo va el portafolio en general?"
- "¿Qué hitos están adelantados y cuáles atrás?"
- "¿Qué proyectos necesitan que metamos mano hoy?"
- "¿Cuáles van muy bien?"

Si tienes 30 segundos antes de una junta, esta es la sección que debes abrir.

## ¿Qué ves?

### Banner de salud (arriba)

Un score grande de 0 a 100 que resume el estado del portafolio:

- **Verde (≥65):** sano.
- **Amarillo (45-64):** ojo, hay focos amarillos.
- **Rojo (<45):** atención requerida ya.

Al lado, tres KPIs rápidos: Completados, On Track, En riesgo (At Risk + Blocked). Si hay datos de costos, también el costo mensual del portafolio.

El número del score sale de un cálculo automático que cruza:
- Estatus de cada proyecto.
- Campo "Salud" registrado por el PM.
- Progreso vs progreso esperado (según fechas).
- Si está vencido o no.
- Si tiene acciones pendientes.
- La prioridad del proyecto.

Cada proyecto recibe un score individual y el banner muestra el promedio de los activos.

### Distribución de salud (gráfica izquierda)

Barras coloridas con cuántos proyectos caen en cada bucket: Excelente (verde), Bueno (azul), Medio (amarillo), Bajo (naranja), Crítico (rojo). Permite ver **la forma** de la distribución: si la mayoría está bien con pocos críticos, o si hay polarización.

### Comparativa por hito (derecha)

Para cada hito del roadmap (2025 Q4, 2026 Q1, etc.) verás **dos barras**:

- **Progreso** — % promedio de avance de los proyectos en ese hito.
- **Salud** — promedio del score de salud de los proyectos en ese hito.

Esto te permite ver si un hito va bien de progreso pero mal de salud (señal de que vamos rápido pero con riesgos) o al revés (vamos sanos pero lentos).

### Requieren atención (5 cards rojas)

Los 5 proyectos con el peor score de salud. Cada card muestra el folio, la actividad, el estatus y **las dos razones principales** por las que el score es bajo (por ejemplo "Bloqueado / Crítico · Vencido hace 14 días"). Clic para ir al detalle.

### Mejor desempeño (5 cards verdes)

Los 5 con el mejor score. Sirve para destacar en juntas lo que va bien.

### Quick links (abajo)

Atajos a Alertas, Timeline y Portafolio.

## ¿Cómo lo uso?

- **Filtra por PM** si quieres una vista personal de tus proyectos.
- **Refresca** con el ícono de recargar si los datos del Sheet acaban de cambiar.
- **Pasa el cursor por los íconos `i`** junto a los títulos para ver definiciones precisas.

## ¿Por qué importa?

Es el lugar pensado para **iniciar conversaciones**, no para profundizar. Si en Resumen ves rojos, vas a Alertas o Portafolio. Si ves un hito atrás, vas a Roadmap o Timeline.

## Preguntas comunes

- **¿Por qué un proyecto "On Hold" no aparece en el banner ni en la distribución?** Los pausados se excluyen del promedio porque no representan riesgo activo. Sí cuentan en KPIs como "Completados" si están en "Done".
- **¿Por qué un proyecto "Done" cuenta en la distribución de salud?** No — sólo cuentan los activos.
- **¿Cómo elijo el filtro PM?** Dropdown "PM" arriba a la derecha. Recuerda que se guarda y verás los mismos proyectos al volver desde otra computadora.
