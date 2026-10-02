# Detalle de pronóstico

La vista profunda de **un solo proyecto** según el motor de pronóstico. Llegas aquí dando clic en cualquier tarjeta de la sección [Pronósticos](pronosticos.md) o desde la lista de proyectos.

## ¿Para qué sirve?

- Ver la **fecha proyectada** y compararla contra la planeada.
- Entender **por qué** el motor llegó a esa fecha (qué factores la mueven).
- Visualizar la **banda de incertidumbre** (escenarios optimista / esperado / pesimista).
- Simular **¿qué pasa si extiendo o acorto el compromiso?** sin tocar datos.
- Estimar el **impacto monetario** de los desvíos.

## ¿Qué ves?

### Cabecera (Hero)

Nombre del proyecto + etiquetas:

- **Riesgo** (En tiempo / Deslizando / En riesgo / Estancado).
- **Probabilidad a tiempo** (porcentaje de cumplir la fecha planeada).
- **Confianza** del pronóstico (Alta / Media / Baja, según variabilidad del equipo).
- **Hito** y **PM** asignados.
- Botón **"Ver proyecto"** que te lleva a la vista de detalle del proyecto.

### Métricas principales (4 tarjetas)

| Tarjeta | Qué dice |
|---|---|
| **Progreso actual** | % avance real + el % esperado por fecha. |
| **Fin estimado** | Lo planeado en el Sheet. |
| **Fecha pronóstico** | A qué fecha cerraría si todo sigue como hoy. |
| **Desvío vs plan** | Diferencia en días (positivo = tarde; verde si ≤3d, ámbar 4–14d, rojo >14d). |

### Línea de tiempo

Barra horizontal con cuatro marcadores: **Inicio**, **Hoy**, **Fin estimado** y **Pronóstico**. Sobre la barra hay una banda azul translúcida que representa el rango **optimista–pesimista**. A más variabilidad del equipo, más ancha la banda.

### Factores del pronóstico

Lista con explicaciones de por qué el proyecto está como está. Cada factor tiene un ícono según su tono:

- **Verde** — algo positivo (entrega adelantada, progreso alineado, baja variabilidad).
- **Gris** — neutral (variabilidad moderada).
- **Ámbar** — advertencia (gap moderado, datos stale, aviso del motor).
- **Rojo** — crítico (gap severo, desvío significativo, proyecto estancado).

Ejemplos típicos:

- "Gap de progreso severo: actual 40% vs esperado 75% (gap 35pp)."
- "Desvío significativo: pronóstico llega 22 días después de fin estimado."
- "Variabilidad del equipo: 18% (CV bajo → banda angosta, mayor confianza)."
- "Datos potencialmente obsoletos: el progreso no se ha movido en 19 días."

### Escenarios

Tres fechas:

- **Optimista** (azul claro) — si el equipo entrega arriba de su promedio.
- **Más probable** (blanco) — la fecha pronóstico central.
- **Pesimista** (ámbar) — si el equipo entrega abajo de su promedio.

El ancho del rango sale de la **variabilidad histórica del equipo** (coeficiente de variación entre 15% y 60%).

### What-if: ¿qué pasa si se extiende?

Un **simulador** para razonar sobre el costo de mover la fecha. Tienes:

- **Slider** de −30 a +60 días (también botones rápidos: −7, 0, +7, +14, +30).
- **Comparación lado a lado:**

| Métrica | Pronóstico actual | Escenario simulado |
|---|---|---|
| Fecha | la del motor | la simulada |
| Riesgo | etiqueta actual | recalculada con las mismas reglas |
| Desvío | en días | recalculado |
| Probabilidad a tiempo | porcentaje | recalculado |
| Costo adicional | si hay datos de costos | recalculado |

Abajo aparece un resumen del **delta de costo**: cuánto cuesta extra extender (en rojo) o cuánto se ahorra acortar (en verde).

> El simulador **no modifica nada**: sólo recalcula con las mismas fórmulas del motor para que entiendas el impacto de un cambio antes de tomarlo.

### Contexto (parte inferior, 3 tarjetas)

- **Velocity del equipo** — puntos por semana + tareas/sem + cuántos días lleva el proyecto desde su inicio.
- **Baseline del portafolio** — qué tan tarde llegaron en promedio los proyectos Done. Da contexto: si el portafolio históricamente se desliza +15d, un pronóstico de +12d no es una anomalía.
- **Reglas del riesgo** — recordatorio de los umbrales que clasifican el riesgo (≤3d en tiempo, 4–14d deslizando, >14d en riesgo, sin progreso = estancado).

## ¿Cómo lo uso?

1. **Mira el hero** para tener el veredicto en una línea.
2. **Lee los factores**: te dicen por qué el motor llegó ahí, sin que tengas que adivinar.
3. **Usa el what-if** antes de prometer una nueva fecha al cliente:
   - Mueve el slider a +14d. ¿Cómo cambia el riesgo? ¿La probabilidad? ¿El costo?
   - Si el costo extra es alto, vale la pena negociar alcance en vez de tiempo.
4. **Compara con el baseline**: si tu desvío proyectado está debajo del promedio histórico del portafolio, no entres en pánico.

## ¿Por qué importa?

Saber que "este proyecto va tarde" no es accionable. Saber que **"este proyecto cerrará el 12 de agosto en lugar del 25 de julio, con 32% de probabilidad de cumplir, y cada día extra cuesta ~$1,200"** sí lo es. El detalle convierte una etiqueta categórica en una conversación cuantitativa.

## Preguntas comunes

- **¿Por qué el desvío es 0 si llevo 50% de progreso al 80% del tiempo?** Porque el motor proyecta la fecha **futura** según tu ritmo, no juzga el pasado. Si avanzaste 50% en 80% del tiempo planeado pero ese ritmo te lleva a cerrar a la fecha esperada, no hay desvío. Mira el factor "gap de progreso": ahí se ve si vas atrasado del plan.
- **¿Qué quiere decir "Datos stale"?** Quiere decir que el progreso del proyecto no se ha movido en al menos 14 días según los snapshots semanales del tablero. El pronóstico podría estar artificialmente alargado.
- **¿Por qué la banda es tan ancha?** Porque la **variabilidad del equipo** (CV) es alta. Algunas semanas se entregan muchos puntos, otras pocas. A más oscilación, más ancha la banda. Reducirla requiere consistencia, no más datos.
- **¿Por qué la probabilidad es tan baja si el desvío es pequeño?** Suelen ir juntas, pero no siempre. La probabilidad penaliza también la **incertidumbre** (CV alto). Un desvío chico con alta variabilidad puede dar probabilidad media.
- **¿El what-if guarda algo?** No. Es un simulador que recalcula al vuelo. Cierra la pestaña y vuelve: el slider está en 0 de nuevo.
- **¿Por qué no veo costo adicional?** Porque el proyecto no tiene roles costeados en el Sheet de Costos, o el costo mensual prorrateado es 0. Si quieres ver costos, asegúrate de que los devs/arquitectos del proyecto tengan costos asignados.
