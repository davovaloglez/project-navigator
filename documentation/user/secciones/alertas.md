# Alertas — Centro unificado

Un único lugar para ver todo lo que el tablero detecta como "algo no va bien" en el portafolio. Combina señales de cuatro fuentes (estatus, pronóstico, anomalías y dependencias) y las ordena por severidad.

## ¿Para qué sirve?

- Empezar el día revisando qué proyectos necesitan atención inmediata.
- Filtrar por **tu PM** y ver sólo lo que te concierne.
- Distinguir alertas críticas (rojo) de advertencias (ámbar) e informativas (azul).
- Saltar directo al proyecto afectado con un clic.

## ¿Qué ves?

### KPIs (arriba)

Tres contadores grandes:

- **Críticas** — alertas de la severidad más alta. Si hay alguna, el card se resalta en rojo.
- **Advertencias** — situaciones que necesitan seguimiento pero no son urgentes.
- **Informativas** — recordatorios y acciones pendientes registradas en el Sheet.

Los contadores reflejan el filtro PM seleccionado.

### Tabs de tipo

Debajo de los KPIs hay un fila de botones (chips) con cada **tipo** de alerta y su conteo. Sólo aparecen los tipos que tienen al menos una alerta activa. Los 12 tipos posibles son:

| Tipo | Qué detecta |
|---|---|
| Vencidos | `finEstimado` ya pasó y el proyecto no está en Done |
| Bloqueados | Proyecto con estatus "Blocked / Critical" |
| En riesgo | Proyecto con estatus "At Risk" |
| Vencen pronto | `finEstimado` en los próximos 7 días |
| Acciones | Acciones pendientes registradas en el Sheet |
| Sin avance | Progreso por debajo de lo esperado según fechas |
| Pronóstico en riesgo | El motor proyecta que termina ≥14 días tarde |
| Desaceleración | El ritmo reciente cayó respecto al baseline |
| Detenido | Sin avance en los snapshots semanales |
| Sin actualizar | El % de progreso no se mueve en ≥14 días |
| Bloqueador en riesgo | Un proyecto del que dependes está en riesgo |
| Bloqueador pendiente | Un proyecto del que dependes no se ha resuelto |

Las primeras 6 vienen del análisis de estatus + fechas; las últimas 6 las genera el motor de pronóstico cruzando snapshots históricos y dependencias declaradas (`requiereDe`).

### Lista de alertas

Cada alerta es una tarjeta clickable que te lleva al detalle del proyecto. Muestra:

- Ícono y color por severidad (rojo / ámbar / azul).
- Título corto.
- Descripción con detalle (e.g. "Vencido hace 12 días", "Pronóstico: 14 abr (+18d)").
- Badge con el tipo de alerta.

Las críticas se muestran primero. Si no hay alertas con los filtros activos, verás un card verde "Sin alertas".

## ¿Cómo lo uso?

1. **Filtra por PM** si sólo te interesa tu portafolio.
2. **Toca un tab de tipo** (por ejemplo "Vencidos") para acotar.
3. **Clic en una alerta** para ir al proyecto y atenderla.
4. **Quita el filtro de tipo** (clic en "Todas") cuando quieras la vista completa.

Tip: si abres `/alertas` cada mañana con tu PM, en 30 segundos tienes la lista de cosas a atender ese día.

## ¿Por qué importa?

Es el resumen accionable del portafolio. Mientras Resumen te da el "termómetro" y Portafolio el inventario, **Alertas te dice qué tocar primero**. Cada alerta nace de cruzar varias señales (estatus + fechas + histórico + dependencias) para reducir falsos positivos.

## Persistencia

Lo que **se queda guardado** entre sesiones y dispositivos:

- El tab de tipo activo (e.g. "Bloqueados").
- El filtro PM.

Si quieres limpiar de un tirón, usa el botón "Limpiar" junto a los filtros o ve a [Cuenta → Preferencias](cuenta.md).

## Preguntas comunes

- **¿Por qué un proyecto aparece dos veces?** Porque tiene varias alertas distintas (e.g. está vencido **y** en estatus bloqueado). Son detecciones independientes; cada una tiene su propia recomendación de acción.
- **¿Por qué "Sin actualizar" si el equipo está trabajando?** Probablemente el % de progreso del Sheet no se ha movido en dos semanas. La alerta no dice que no haya actividad, dice que el indicador oficial no refleja avance. Si el equipo trabaja, pero el % no se actualiza, conviene actualizarlo.
- **¿Cuál es la diferencia entre "Detenido" y "Sin actualizar"?** "Sin actualizar" mira el campo `progreso` del Sheet. "Detenido" mira el histórico de snapshots y detecta un quiebre del ritmo (proyecto que venía avanzando y se paró). El segundo es más severo.
- **¿"Pronóstico en riesgo" reemplaza al campo Salud?** No. "Salud" es lo que el PM declara manualmente. "Pronóstico en riesgo" es lo que calcula el motor con datos. Pueden coincidir o no — la divergencia es información útil.
- **¿Los `Done` aparecen aquí?** No. Las alertas se filtran a proyectos activos.
