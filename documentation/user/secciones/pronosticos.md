# Pronósticos

Es el "**centro de proyecciones**" del tablero. Aquí el motor calcula, a partir del progreso real de cada proyecto y del ritmo histórico del equipo, **cuándo cerraría cada proyecto si todo sigue así**. No usa machine learning: son fórmulas explicables que puedes rastrear hasta los datos del Sheet.

## ¿Para qué sirve?

- Saber **a qué fecha realista** cerraría cada proyecto, no sólo la fecha planeada.
- Identificar proyectos que **se están deslizando** antes de que sea tarde.
- Estimar el **costo monetario** de los desvíos.
- Anticipar **cuellos de botella** por persona o por hito.
- Visualizar **bloqueadores** entre proyectos.
- Entender cuán **preciso** ha sido el motor en el pasado (backtest).

## ¿Qué ves?

Arriba hay 6 KPIs y debajo seis pestañas. Los KPIs cuentan sólo proyectos **activos** (excluyen los Done):

| KPI | Qué mide |
|---|---|
| Proyectos proyectados | Cuántos proyectos activos hay con pronóstico. |
| En tiempo | Cuántos terminarían dentro de la fecha planeada (≤3d de desvío). |
| Deslizando | Cuántos llegarían 4–14 días tarde. |
| En riesgo | Cuántos llegarían >14d tarde o están estancados (en rojo si hay alguno). |
| Desvío promedio | Promedio en días entre el pronóstico y el fin planeado. |
| Datos stale | Cuántos proyectos no han movido su progreso en ≥14 días. |

### Pestaña: Proyectos

Lista de cada proyecto activo como tarjeta, con:

- **Etiqueta de riesgo** (En tiempo / Deslizando / En riesgo / Estancado / Sin datos).
- **Fecha pronosticada** y desvío vs lo planeado (ej. `+12d`).
- **Banda optimista–pesimista** (a más variabilidad del equipo, más ancha).
- **Probabilidad de cumplir** la fecha planeada (porcentaje).
- **Badge "Sin avance N días"** si el progreso lleva ≥14 días estancado.

Puedes filtrar por **Riesgo**, **PM**, **Hito**, y ordenar por **Riesgo / Desvío / Fecha pronóstico**. Hay paginación con selector de 12, 24, 50, 100 o Todos (por defecto 50). Tu elección se guarda entre sesiones.

### Pestaña: Planeación

Vista táctica para PMs. Cuatro secciones:

1. **Anomalías de ritmo** — proyectos donde el ritmo reciente cambió bruscamente (slowdown, stall o aceleración).
2. **Costo proyectado de desvíos** — convierte cada día de desvío en dinero (`costo mensual / 30 × días`) y agrega un total del portafolio.
3. **Capacidad del equipo a 4 / 8 / 12 semanas** — oferta vs demanda. Estados: Holgura, Sano, Saturado, Sobrecarga.
4. **Cierre por hito** — para cada hito, la fecha más tardía entre sus proyectos. El riesgo del hito es el peor de sus proyectos.
5. **Próximas fechas críticas** — qué proyectos cierran en los próximos 30 / 31–60 / 61–90 días.

### Pestaña: Dependencias

Proyectos cuyo campo `requiereDe` indica que dependen de otros. Por cada uno verás:

- Sus **bloqueadores** (Resueltos / Activos / En riesgo / Sin matchear).
- La fecha del **peor bloqueador** (cuándo se desbloquearía realmente este proyecto).
- Días extra de slippage que el bloqueador impone si no se resuelve a tiempo.

Si ningún proyecto declara dependencias, esta tab queda vacía.

### Pestaña: Personas

Dos secciones:

1. **Capacidad por persona** — para cada persona del cronograma:
   - **Velocity** (puntos completados por semana, últimas 8 sem).
   - **Pendientes** (tareas y puntos no terminados).
   - **Semanas para liquidar** lo pendiente al ritmo actual.
   - **Tareas vencidas**.
2. **Finalización de cursos** — proyección de cuándo terminaría cada persona sus cursos. El ritmo se calcula a partir de los **snapshots semanales** que el tablero guarda automáticamente (no hay fechas en el Sheet de Cursos). Si llevas pocos snapshots, esta sección estará vacía y se irá llenando con el tiempo.

### Pestaña: Contexto

Pone números a la **confianza** del motor:

- **Backtesting** — simula qué habría predicho el motor para los proyectos ya cerrados (Done), y compara contra la fecha real. Reporta MAE, sesgo medio, % dentro de ±7d y ±14d.
- **Estado de snapshots** — cuántas semanas de histórico llevas. Más semanas → mejores anomalías, cursos y backtest.
- **Velocity del equipo** — puntos/semana + tareas/semana + variabilidad (CV).
- **Precisión de estimación** — ratio entre tiempo real y tiempo estimado en tareas App. >1.2 = sub-estimando; <0.8 = sobre-estimando.
- **Baseline histórico** — qué tan tarde llegaron los proyectos Done en promedio. Si el baseline dice "+20d", un pronóstico de +15d no es alarmante.

### Pestaña: ¿Cómo funciona?

Documentación in-product de los **13 métodos** del motor: para cada uno explica qué datos usa, la fórmula, el razonamiento "en palabras simples" y **por qué se eligió ese método** y no otro. Incluye también una lista honesta de las limitaciones (ritmo lineal, depende de `progreso` bien mantenido, muestra chica, etc.).

## ¿Cómo lo uso?

1. **Filtra por PM** en la tab Proyectos si te interesa tu portafolio.
2. **Revisa los KPIs**: si "En riesgo" o "Datos stale" están en rojo, esos son los focos.
3. **Tab Planeación** para preparar 1:1s o comités: te da capacidad, costo y fechas críticas en un lugar.
4. **Tab Personas** cuando alguien parece sobrecargado: mira su velocity y cuántas semanas tarda en liquidar.
5. **Tab Contexto** cuando alguien cuestione el motor: aquí está la evidencia de qué tan bien predice.
6. **Tab Metodología** si quieres entender por qué un proyecto tiene cierto pronóstico.

Clic en cualquier tarjeta de proyecto abre la [vista detallada del pronóstico](pronostico-detalle.md).

## ¿Por qué importa?

Las fechas planeadas mienten cuando los proyectos se deslizan en silencio. El pronóstico es la versión **honesta** de esas fechas: mira lo que el equipo está produciendo (no lo que prometió producir) y dice cuándo llegaría realmente. Eso convierte conversaciones tipo "está caminando" en conversaciones tipo "está caminando, pero a este ritmo llegará +18 días tarde, lo cual al equipo de 6 personas le cuesta ~$X".

## Preguntas comunes

- **¿Por qué un proyecto sale "Sin datos"?** El motor necesita fecha de inicio + progreso > 0 para extrapolar. Si falta alguno, no puede.
- **¿Por qué el pronóstico se ve "alargado"?** Probablemente el progreso no se ha actualizado en semanas, lo cual baja la tasa diaria. Revisa el badge "Sin avance N días".
- **¿Por qué la capacidad de un horizonte está "Saturada"?** La demanda proyectada se acerca o supera la oferta (velocity del equipo × N semanas). Es señal para no comprometer más trabajo en ese horizonte.
- **¿Por qué la finalización de cursos no proyecta nada?** Requiere al menos 2 snapshots semanales para calcular ritmo. Con un solo punto en el tiempo no hay velocidad observable.
- **¿Las predicciones se guardan?** No. Cada vez que entras se recalculan con los datos actuales. Sólo se guardan los snapshots (estado semanal del progreso), que sirven para anomalías, backtest y cursos.
- **¿Puedo confiar al 100% en el pronóstico?** No. El motor asume ritmo lineal y no modela bloqueadores intermitentes. Es una **señal**, no una promesa. La pestaña Metodología tiene una lista de limitaciones explícitas.
