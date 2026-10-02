# Métricas por DEV

Una **tabla comparativa de rendimiento por persona** del equipo (Arquitectos, PMs y Developers). Permite ver de un vistazo quién tiene mejor tasa de entrega, mejor puntualidad, mejor salud promedio en sus proyectos.

## Cómo se accede

**La sección no aparece en el menú lateral por diseño.** Es una vista interna, no es parte del flujo operativo del día a día.

Para llegar a ella, abre tu navegador y agrega `/metricas-dev` al final de la URL del tablero. Por ejemplo: `https://<tu-tablero>/metricas-dev`.

Razón del ocultamiento: estas métricas son comparativas y a nivel individual. Tenerlas siempre visibles en el sidebar genera presión innecesaria (sensación de ranking público). Si necesitas usarla con frecuencia, puedes marcarla como favorita en tu navegador.

## ¿Para qué sirve?

- Comparar el rendimiento entre personas del equipo de forma objetiva.
- Identificar a quién le va bien en puntualidad y a quién se le complica.
- Detectar saturación: quién carga más proyectos a la vez.
- Tener material para conversaciones 1:1 con datos concretos en lugar de impresiones.

## ¿Qué ves?

### Ranking por Health Score (gráfica)

Una barra horizontal por persona, ordenada de mejor a peor salud promedio en sus proyectos. Colores: verde si va bien (≥65), amarillo si requiere atención (≥45), rojo si está en problemas (<45).

### Perfil del DEV seleccionado (radar)

Al hacer clic en una fila de la tabla, se llena el radar con 5 ejes:

- **Completación** — % de proyectos terminados.
- **Progreso** — promedio de avance en sus proyectos.
- **Salud** — health score promedio.
- **Puntualidad** — % de proyectos Done que entregó en o antes de la fecha estimada.
- **Capacidad** — qué tan cargado está (más proyectos → eje más lleno).

Debajo del radar verás tres números clave (pts entregados / tasa de completación / puntualidad) y la lista de proyectos en los que participa.

### Tabla comparativa

Una fila por persona con 10 columnas:

| Columna | Significado |
|---|---|
| **DEV** | Avatar + nombre + roles (Arquitecto / PM / Developer) |
| **Proy.** | Total de proyectos en los que participa |
| **Done** | Proyectos terminados |
| **Activos** | Proyectos vivos (no Done ni On Hold) |
| **Riesgo** | Proyectos en At Risk o Blocked |
| **% Compl.** | Done ÷ Total |
| **% Prog.** | Progreso promedio |
| **Salud** | Health score promedio (verde / amarillo / rojo) |
| **Pts Total** | Story points en todos sus proyectos |
| **Pts Done** | Story points entregados |
| **Puntual.** | % de proyectos Done entregados en o antes de la fecha planeada |

Haz clic en el header de cualquier columna para ordenar por ella (clic de nuevo para invertir).

### Filtro PM

Arriba a la derecha. Al filtrar por un PM, todas las métricas se recalculan considerando **únicamente** los proyectos de ese PM.

## ¿Cómo lo uso?

1. **Para una conversación 1:1**: filtra por tu PM, ordena por "Puntual." descendente, ve quién entrega a tiempo. Cruza con "Salud" para entender si la puntualidad viene de proyectos bien armados o de prisa.
2. **Para detectar saturación**: ordena por "Activos" descendente. Si alguien tiene 7+ activos, probablemente está estirado.
3. **Para revisar riesgo concentrado**: ordena por "Riesgo" descendente — ¿alguien acumula muchos At Risk?
4. **Para entender un perfil específico**: clic en la fila, mira el radar y la lista de proyectos.

## ¿Por qué importa?

Hace visible cosas que normalmente requieren extraer Excels manualmente o "preguntar a memoria". El radar permite ver el balance de un perfil en una sola imagen: alguien con alta puntualidad pero baja capacidad es muy distinto a alguien con alta capacidad pero baja puntualidad.

## Limitaciones

- **Puntualidad sólo se calcula para proyectos Done con ambas fechas cargadas**. Si una persona acaba de empezar o sus proyectos no tienen `Fin estimado` y `Fin real`, sale como N/A (—).
- **No mide calidad del código ni satisfacción del cliente**. Es una métrica operativa de delivery, no una evaluación 360.
- **Una persona con 1 proyecto entregado a tiempo aparece con 100%** — toma con criterio cuando el volumen es bajo.

## Persistencia

Lo que se guarda entre sesiones:

- Filtro PM seleccionado.
- Columna por la que estás sorteando + dirección.

Lo que no se guarda:

- El DEV seleccionado para el radar (vuelves a abrir sin selección).

## Preguntas comunes

- **¿Por qué no aparece en el menú lateral?** Porque es una vista interna, no operativa día a día. Acceso por URL directa: `/metricas-dev`.
- **¿"Puntualidad" toma en cuenta proyectos cancelados?** No. Sólo proyectos en estatus Done con `Fin real` y `Fin estimado` cargados.
- **¿Por qué un Dev tiene Capacidad 100% si solo tiene 7 proyectos?** El eje de Capacidad se satura en 7 proyectos para que la gráfica sea legible. Más de 7 = saturación de pantalla, no necesariamente saturación real.
- **¿Por qué cuando filtro por PM las métricas de cada persona cambian?** Porque al filtrar, sólo se cuentan sus proyectos de ese PM. Si te interesa ver el rendimiento "total" de la persona, quita el filtro.
- **¿Hay forma de exportar la tabla?** No directamente. Usa la captura del navegador o pídele al equipo de producto que agregue la exportación.
