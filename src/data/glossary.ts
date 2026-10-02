export const GITHUB_BASE = 'https://github.com/ameza-bit/project-navigator/blob/develop';

export interface GlossarySource {
  label: string;
  href: string;
}

export interface GlossaryEntry {
  id: string;
  section: string;
  sectionSlug: string;
  title: string;
  summary: string;
  whatIs: string;
  howCalculated: string;
  whyMatters: string;
  sources?: GlossarySource[];
}

export interface GlossarySectionRelation {
  slug: string;
  label: string;
  difference: string;
}

export interface GlossarySectionIntro {
  whatIs: string;
  whenToUse: string;
  related?: GlossarySectionRelation[];
}

export interface GlossarySection {
  slug: string;
  title: string;
  description?: string;
  intro?: GlossarySectionIntro;
}

export const GLOSSARY_SECTIONS: GlossarySection[] = [
  {
    slug: 'dashboard',
    title: 'Dashboard',
    description: 'KPIs y widgets que ves en la página principal (/).',
    intro: {
      whatIs: 'Página de inicio (`/`). Vista **customizable** que mezcla KPIs macro del portafolio (6 contadores arriba) con widgets agregables (gráficas, listas, resúmenes). Cada usuario puede mostrar, ocultar y reordenar widgets — la configuración persiste en localStorage (`pn-dashboard-config`).',
      whenToUse: 'Para revisión rápida al iniciar el día, durante un stand-up, o cuando quieres tener "tu" vista personal del portafolio. Si necesitas algo más enfocado y curado para presentar a stakeholders, usa Resumen Ejecutivo en su lugar.',
      related: [
        {
          slug: 'resumen',
          label: 'Resumen Ejecutivo',
          difference: 'El Dashboard es **customizable** y orientado a operación diaria (qué widgets ves depende de ti). El Resumen es **fijo y curado**: pensado para reporte ejecutivo, con foco en salud del portafolio y proyectos a priorizar.',
        },
      ],
    },
  },
  {
    slug: 'resumen',
    title: 'Resumen Ejecutivo',
    description: 'Bloques de la página /resumen: banner de salud, distribuciones, comparativas y rankings.',
    intro: {
      whatIs: 'Página `/resumen`. Vista **fija** (no customizable) con foco exclusivo en la salud del portafolio. Empieza con un banner que muestra el score promedio y conteos clave, sigue con una distribución de salud y comparativa por cuatrimestre, y termina con dos rankings: proyectos que requieren atención y los de mejor desempeño.',
      whenToUse: 'Para la reunión semanal de portafolio, para reportar a stakeholders, o cuando entras al sistema sin una pregunta específica y quieres saber por dónde empezar la semana. La estructura está pensada para llevarte del macro al micro en una sola pasada.',
      related: [
        {
          slug: 'dashboard',
          label: 'Dashboard',
          difference: 'El Resumen es **curado** (mismo orden para todos los usuarios) y se enfoca en lectura ejecutiva. Si quieres construir tu propia vista o ver KPIs operativos rápidos (vencimientos, cronograma de tareas, costos), usa Dashboard.',
        },
        {
          slug: 'alertas',
          label: 'Alertas',
          difference: 'El Resumen muestra el score agregado y rankings; las Alertas muestran qué EVENTOS específicos están activos. Score bajo + alertas activas → trabajo identificado pendiente; score bajo sin alertas → problema estructural (rezago crónico).',
        },
      ],
    },
  },
  {
    slug: 'alertas',
    title: 'Alertas',
    description: 'Centro de 12 tipos de alerta combinando reportes declarados y problemas inferidos por el motor de pronóstico.',
    intro: {
      whatIs: 'Página `/alertas`. Centro unificado de **12 tipos de alerta** distribuidos en **3 severidades** (critical / warning / info). Combina dos fuentes: alertas **declarativas** (basadas en campos/estatus del PM) y alertas **inferidas** (motor de pronóstico, detección de anomalías, análisis de dependencias). Filtros por PM y por tipo.',
      whenToUse: 'Para triaje diario: "¿qué necesita atención HOY?". Útil cuando ya viste el Resumen o Dashboard y necesitas la lista accionable. Si una alerta no aparece pero esperabas verla, revisa el filtro PM activo o el estatus del proyecto (Done, On Hold y Cancelado no generan alertas).',
      related: [
        {
          slug: 'dashboard',
          label: 'Dashboard',
          difference: 'El widget "Alertas" del Dashboard muestra solo el top 5 sin filtros. Si quieres triaje rápido usa el Dashboard; si necesitas ver TODAS, filtrar por tipo o cambiar de PM, ven aquí.',
        },
        {
          slug: 'resumen',
          label: 'Resumen Ejecutivo',
          difference: 'El Resumen agrega salud en un score; las Alertas listan eventos específicos. Usa Resumen para macro, Alertas para micro.',
        },
      ],
    },
  },
  {
    slug: 'portafolio',
    title: 'Portafolio',
    description: 'Grid paginado de todos los proyectos con filtros múltiples y badges de pronóstico.',
    intro: {
      whatIs: 'Página `/portafolio`. Grid paginado de **todos** los proyectos del portafolio (12 por página) con filtros múltiples por estatus, salud, prioridad, arquitecto, cuatrimestre, dev y PM, además de búsqueda por actividad/folio. Cada tarjeta es escaneable en 2 segundos y abre el detalle del proyecto al click.',
      whenToUse: 'Para encontrar un proyecto específico (búsqueda por nombre/folio), revisar el inventario completo de un PM/arquitecto, o filtrar por combinaciones (e.g. "todos los At Risk con prioridad Crítica"). Por default oculta los Done; el toggle "Incluir terminados" los vuelve a mostrar.',
      related: [
        {
          slug: 'resumen',
          label: 'Resumen Ejecutivo',
          difference: 'El Resumen muestra rankings top-N por health score (curado); el Portafolio te deja ver TODOS, buscar y filtrar libremente. Usa Resumen para "qué priorizar", Portafolio para "dónde está X proyecto".',
        },
        {
          slug: 'alertas',
          label: 'Alertas',
          difference: 'Alertas te dice qué eventos están activos hoy; Portafolio te muestra el inventario completo. Si vienes de una alerta y quieres ver el proyecto en contexto del resto, ven aquí.',
        },
        {
          slug: 'proyecto-detalle',
          label: 'Detalle de Proyecto',
          difference: 'Click en cualquier tarjeta abre el detalle, que es la vista de mayor profundidad: factores del health score, línea de tiempo visual, comparativa contra épica/hito, costo prorrateado y proyectos relacionados.',
        },
      ],
    },
  },
  {
    slug: 'proyecto-detalle',
    title: 'Detalle de Proyecto',
    description: 'Vista completa de un proyecto individual: hero, KPIs, gauge, timeline, comparativa, equipo, costo y relacionados.',
    intro: {
      whatIs: 'Página `/proyecto/<id>`. Vista de mayor detalle del sistema. Hero con badges (estatus, salud, prioridad, tipo, health chip), tira de 5 KPIs rápidos, gauge de progreso con factores explícitos del health score, línea de tiempo visual con marker HOY, comparativa contra promedios de épica y cuatrimestre, acciones pendientes (cuando hay), equipo navegable (PO/PM/arquitecto/devs/SQA, multi-persona), detalles (producto/servicio/aliado/cuatrimestre/sprint), costo prorrateado y grid de proyectos relacionados.',
      whenToUse: 'Cuando vienes de Portafolio, Alertas o Resumen para profundizar en un proyecto específico. La página combina datos planos (lo que el PM declaró) con métricas derivadas (health score con factores, costo prorrateado, comparativa contra grupo). Es el punto de aterrizaje para una conversación con el PM/arquitecto sobre ese proyecto.',
      related: [
        {
          slug: 'portafolio',
          label: 'Portafolio',
          difference: 'Si quieres comparar contra el resto del portafolio, regresa al Portafolio (breadcrumb arriba). Los botones ChevronLeft/Right en el top right navegan al proyecto anterior/siguiente del Sheet sin tener que regresar.',
        },
      ],
    },
  },
  {
    slug: 'roadmap',
    title: 'Roadmap',
    description: 'Vista jerárquica Hito → Épica → Proyectos con agregados a cada nivel.',
    intro: {
      whatIs: 'Página `/roadmap`. Vista de **dos niveles** de agrupación: **Cuatrimestre → Épica → Proyectos**. Cada nivel agrega métricas (progreso promedio, done/total, story points). Las épicas son colapsables para enfocar solo en lo que te interesa. El orden de cuatrimestres se puede invertir (ascendente / descendente por nombre).',
      whenToUse: 'Cuando piensas en entregas de negocio en lugar de proyectos individuales. Útil para reportes a stakeholders ("¿cómo va el release 2026 Q1?") o para reuniones donde el contexto es la épica completa. Si solo quieres el avance plano por cuatrimestre sin entrar a épicas, usa el widget "Progreso del Roadmap" del Dashboard.',
      related: [
        {
          slug: 'portafolio',
          label: 'Portafolio',
          difference: 'El Portafolio es plano y filtrable; el Roadmap es jerárquico y orientado a entrega. Portafolio para "dónde está X proyecto"; Roadmap para "cómo va Q1 2026".',
        },
        {
          slug: 'dashboard',
          label: 'Dashboard',
          difference: 'El widget "Progreso del Roadmap" del Dashboard es la versión resumida (solo % por cuatrimestre, sin abrir épicas). Si quieres detalle, ven al Roadmap completo.',
        },
      ],
    },
  },
  {
    slug: 'timeline',
    title: 'Timeline',
    description: 'Vista Gantt del portafolio con zoom, línea de hoy y overlay opcional de fechas pronóstico.',
    intro: {
      whatIs: 'Página `/timeline`. **Vista Gantt** del portafolio: cada proyecto es una barra horizontal posicionada entre su `fechaInicio` (o `inicioEstimado`) y su `finReal`/`finEstimado`, con el porcentaje de progreso como relleno. La línea azul vertical marca **HOY**. Sobre cada barra real se puede superponer un **ghost bar** (zona translúcida con borde punteado) y un **diamond marker** que indican la fecha de pronóstico calculada por el motor. Filtros por estatus, arquitecto, cuatrimestre y PM; zoom de 3 a 20 px/día (o ajuste automático) y atajo "Ir a hoy".',
      whenToUse: 'Cuando necesitas ver el **calendario completo del portafolio** y entender solapamientos: qué proyectos corren en paralelo, qué se vence cuándo, y qué tan lejos están las fechas pronóstico de las planeadas. Útil para detectar cuellos de botella temporales y planear capacidad.',
      related: [
        { slug: 'roadmap', label: 'Roadmap', difference: 'Roadmap agrupa por cuatrimestre y épica (organización lógica); Timeline ordena por fecha (organización temporal). Roadmap responde "qué entra en cada release", Timeline responde "cuándo pasa cada cosa".' },
        { slug: 'pronosticos', label: 'Pronósticos', difference: 'Pronósticos lista todas las fechas estimadas con sus métricas; Timeline solo superpone la fecha pronóstico como overlay visual sobre la barra planeada.' },
        { slug: 'portafolio', label: 'Portafolio', difference: 'Portafolio es lista filtrable con KPIs por proyecto; Timeline es la misma data en vista temporal.' },
      ],
    },
  },
  {
    slug: 'cronograma',
    title: 'Cronograma',
    description: 'KPIs, throughput y cards de las actividades granulares, desde la hoja `actividades`.',
    intro: {
      whatIs: 'Página `/cronograma`. Vista granular de **actividades** (no proyectos): cards individuales con fase, sprint, épica, estatus, tipo, rol, asignado, puntos (estimado), real (tracked) y fechas. Lee la hoja `actividades` vía `/api/tareas`. Arriba, 7 KPIs y bloques de throughput semanal + precisión de estimación (estimado vs real).',
      whenToUse: 'Para responder preguntas a nivel tarea ("¿cuántas tareas tiene Lorena en proceso?", "¿qué épica va más atrasada?", "¿cuánto se entregó la semana pasada?") y para validar la calidad de las estimaciones del equipo.',
      related: [
        { slug: 'portafolio', label: 'Portafolio', difference: 'Portafolio agrupa por proyecto; Cronograma desagrega a las tareas individuales. Una tarea puede tener su propio asignado y estatus distintos al del proyecto padre.' },
        { slug: 'pronosticos', label: 'Pronósticos', difference: 'Pronósticos consume estas tareas (vía `forecastEngine`) para calcular velocity y proyectar fechas. Cronograma muestra el dato crudo; Pronósticos lo interpreta hacia adelante.' },
        { slug: 'distribucion', label: 'Distribución de Puntos', difference: 'Distribución agrega story points a nivel proyecto/persona/cuatrimestre; Cronograma muestra puntos a nivel tarea individual.' },
        { slug: 'tarea-detalle', label: 'Detalle de Tarea', difference: 'Cronograma es la lista; el detalle abre una actividad puntual (click en el título) con su contexto completo y enlaces a proyecto/persona.' },
      ],
    },
  },
  {
    slug: 'tarea-detalle',
    title: 'Detalle de Tarea',
    description: 'Vista de una actividad individual del cronograma: estatus, estimado vs real, avance, fechas y enlaces a su proyecto y persona asignada.',
    intro: {
      whatIs: 'Página `/tarea/<id>`. Detalle de una actividad de la hoja `actividades`. Cabecera con épica, título, folio y badges (estatus, salud, fase, sprint, tipo, prioridad, link al origen). Cuatro KPIs — **puntos estimados**, **real (tracked)**, **avance %** y **ratio real/estimado** — seguidos de dos bloques: Detalles (proyecto, asignado, rol, fase, épica, OU, dificultad, prioridad) y Fechas (registro, inicio, fin estimado, fin real). El `id` es un hash estable generado en `/api/tareas` (la hoja no trae id propio).',
      whenToUse: 'Cuando desde el cronograma necesitas el contexto completo de una tarea puntual: qué tan desviada va su estimación (ratio real/estimado), a qué proyecto y persona pertenece, y sus fechas. Es el "último kilómetro" del seguimiento operativo.',
      related: [
        { slug: 'cronograma', label: 'Cronograma', difference: 'Cronograma es la lista filtrable de todas las actividades; el detalle profundiza en una sola (click en el título de la card).' },
        { slug: 'proyecto-detalle', label: 'Detalle de Proyecto', difference: 'El detalle de proyecto agrega todas sus tareas; el detalle de tarea baja al ítem individual y enlaza de vuelta a su proyecto padre.' },
        { slug: 'persona-detalle', label: 'Detalle de Persona', difference: 'El perfil de persona lista las tareas que tiene asignadas; el detalle de tarea muestra una sola con todo su contexto.' },
      ],
    },
  },
  {
    slug: 'pronosticos',
    title: 'Pronósticos',
    description: 'Motor de pronóstico determinista del portafolio: 6 tabs con proyecciones por proyecto, planeación agregada, dependencias, capacidad de personas, contexto histórico y documentación de los 13 métodos.',
    intro: {
      whatIs: 'Página `/pronosticos`. Motor de pronóstico **determinista y sin ML** organizado en 6 tabs: **Proyectos** (fecha pronóstico + banda por proyecto activo), **Planeación** (anomalías, costo de desvíos, capacidad por horizonte, cierre por cuatrimestre, fechas críticas), **Dependencias** (cascada de bloqueadores), **Personas** (velocity por colaborador + finalización de cursos), **Contexto** (backtest, snapshots, velocity, sesgo, baseline) y **Metodología** (documentación auditable de los 13 métodos).',
      whenToUse: 'Cuando quieres ver hacia adelante en vez de hacia atrás. Útil para anticipar slippages antes de que el PM los reporte, planear capacidad trimestral, traducir desvíos a dinero, detectar dependencias bloqueadoras y auditar qué tan bien predijo el motor. La pestaña "Metodología" es la referencia técnica del cómo se calcula cada cosa.',
      related: [
        { slug: 'pronosticos-detalle', label: 'Detalle de Pronóstico', difference: 'Esta vista es agregada (todos los proyectos / personas / hitos); el detalle por proyecto profundiza en factores, escenarios y panel what-if para un solo folio.' },
        { slug: 'alertas', label: 'Alertas', difference: 'Las alertas inferidas de Pronósticos (riesgo, stale, anomalía, bloqueador) se publican como alertas en /alertas. Usa Alertas para triaje accionable diario; Pronósticos para entender el modelo.' },
        { slug: 'timeline', label: 'Timeline', difference: 'Timeline muestra la fecha pronosticada como overlay ghost sobre el Gantt; Pronósticos muestra el modelo completo (banda, riesgo, probabilidad, capacidad).' },
        { slug: 'costos', label: 'Costos', difference: 'Costos muestra el modelo financiero de pricing actual; Pronósticos traduce los desvíos proyectados a costo adicional (Método 11).' },
      ],
    },
  },
  {
    slug: 'pronosticos-detalle',
    title: 'Detalle de Pronóstico',
    description: 'Vista por proyecto del motor de pronóstico: KPIs de progreso/fechas, timeline con banda, factores, escenarios y panel what-if con impacto en costo.',
    intro: {
      whatIs: 'Página `/pronosticos/<folio>`. Versión "deep dive" del motor de pronóstico para un solo proyecto. Combina cuatro KPIs (progreso actual vs esperado, fin estimado, fecha pronóstico y desvío en días), una **línea de tiempo** con marker HOY + banda optimista–pesimista, una lista de **factores** que llevaron al clasificador a la categoría de riesgo actual, los tres **escenarios** (optimista / más probable / pesimista) y un panel **what-if** que simula extender el pronóstico y recalcula riesgo, probabilidad y costo adicional. Cierra con cards de velocity, baseline y reglas del clasificador.',
      whenToUse: 'Cuando vienes de `/pronosticos` (lista) y necesitas entender **por qué** un proyecto está en riesgo, o **qué pasaría si** se atrasa N días más. También útil al preparar una conversación con el PM: el panel de factores te da las palancas concretas (gap de progreso, variabilidad del equipo, snapshots stale) y el what-if cuantifica el costo de no actuar.',
      related: [
        { slug: 'pronosticos', label: 'Pronósticos', difference: 'La lista agrega resultados a nivel portafolio; el detalle abre uno solo de esos proyectos con timeline, factores y simulación.' },
        { slug: 'proyecto-detalle', label: 'Detalle de Proyecto', difference: 'Comparten el proyecto pero hablan idiomas distintos: /proyecto/<id> muestra lo declarado (estatus, salud, equipo); este detalle muestra lo inferido por el motor (extrapolación de fechas, escenarios, what-if).' },
        { slug: 'alertas', label: 'Alertas', difference: 'Si llegaste aquí por una alerta de desvío, el bloque "Factores del pronóstico" explica el detalle de por qué se disparó.' },
      ],
    },
  },
  {
    slug: 'costos',
    title: 'Costos',
    description: 'KPIs de nómina, distribución por rol, costo prorrateado por proyecto y modelo financiero del Excel (experiencia → admin → margen → IVA).',
    intro: {
      whatIs: 'Página `/costos`. Vista unificada del **costo interno** del equipo (lectura directa de la hoja Costos) cruzado con el **modelo financiero** del Excel para derivar el precio al cliente. Combina nómina total y promedios (KPIs), composición del costo por rol (donut + barras), costo estimado por proyecto con prorrateo por participación (cards), y la cascada de pricing (experiencia → admin → margen → IVA).',
      whenToUse: 'Para responder dos preguntas distintas: (1) "¿cuánto nos cuesta el equipo este mes?" — KPIs y tabla de roles; (2) "¿cuánto cuesta cada proyecto y a cuánto debería cobrarse?" — costo por cuatrimestre, cards por proyecto y modelo financiero. El filtro PM acota proyectos prorrateados pero NO afecta los KPIs de roles (que son org-wide).',
      related: [
        { slug: 'dashboard', label: 'Dashboard', difference: 'El widget de costos del Dashboard solo muestra nómina mensual total y top 5 roles, sin prorrateo ni modelo financiero. Para la cifra que se cobra al cliente o el costo prorrateado por proyecto, ven a /costos.' },
        { slug: 'proyecto-detalle', label: 'Detalle de Proyecto', difference: 'En el detalle ves el costo estimado del proyecto individual (prorrateado) sin el modelo financiero aplicado. En /costos ves el portafolio completo y el precio al cliente con margen e IVA.' },
        { slug: 'equipo', label: 'Equipo', difference: 'Equipo lista personas; Costos lista roles (no personas) y el dinero asociado. La unión es `estimatePersonCost` (cruza por `equipo.id`) que prorratea el costo del rol entre las personas activas.' },
      ],
    },
  },
  {
    slug: 'distribucion',
    title: 'Distribución de Puntos',
    description: 'Vista agregada de story points del portafolio: KPIs macro de carga y desgloses por cliente, arquitecto, épica y cuatrimestre.',
    intro: {
      whatIs: 'Página `/distribucion`. Toma el campo `puntos` de cada ProjectRecord y lo agrega bajo cuatro lentes: por **cliente** (donut), por **arquitecto** (barra apilada done/pendiente, multi-arquitecto), por **épica** (barras horizontales) y por **cuatrimestre** (barras horizontales). Arriba, cuatro KPIs resumen el tamaño del portafolio en esfuerzo: total, entregados, activos y promedio por proyecto.',
      whenToUse: 'Cuando necesitas responder "¿quién está cargado?" o "¿dónde está concentrado el esfuerzo?". Útil para balanceo de carga entre arquitectos antes de asignar un proyecto nuevo, para reportar a un cliente cuánto peso tiene en el portafolio, o para detectar épicas/cuatrimestres con concentración desproporcionada.',
      related: [
        { slug: 'dashboard', label: 'Dashboard', difference: 'El widget Story Points del Dashboard muestra los 3 KPIs principales y el top 5 de arquitectos. Esta página tiene los 4 KPIs completos y desgloses adicionales.' },
        { slug: 'equipo', label: 'Equipo', difference: 'Equipo es el directorio de personas; Distribución mide carga de esfuerzo por arquitecto en story points.' },
        { slug: 'cronograma', label: 'Cronograma', difference: 'Cronograma trabaja con tareas individuales (sub-proyecto); Distribución agrega al nivel proyecto.' },
      ],
    },
  },
  {
    slug: 'equipo',
    title: 'Equipo',
    description: 'Directorio del equipo con KPIs de composición y cards per-persona (proyectos, progreso, puntos, estatus).',
    intro: {
      whatIs: 'Página `/equipo`. Directorio del equipo construido a partir de los campos `arquitecto`, `pm` y `devs` de **Projects**. Cada persona aparece con sus **roles agregados** (una misma persona puede ser Arquitecto y Developer en distintos proyectos), conteo de proyectos únicos, progreso promedio, puntos acumulados y mini-badges con la distribución de estatus.',
      whenToUse: 'Para responder "¿quién está en qué?", revisar carga visual del equipo, encontrar a alguien por nombre o como punto de entrada al perfil detallado de una persona.',
      related: [
        { slug: 'persona-detalle', label: 'Detalle de Persona', difference: 'Equipo es la vista de directorio; Persona es el drill-down de una sola persona. Click en una card aquí lleva allá.' },
        { slug: 'cursos', label: 'Cursos', difference: 'Equipo lista personas con foco en proyectos asignados; Cursos con foco en formación. Las dos vistas son complementarias.' },
        { slug: 'portafolio', label: 'Portafolio', difference: 'Portafolio organiza por proyecto (y dentro ves al equipo); Equipo lo voltea: organiza por persona (y dentro ves sus proyectos).' },
      ],
    },
  },
  {
    slug: 'persona-detalle',
    title: 'Detalle de Persona',
    description: 'Perfil 360 de una persona del equipo: roles, KPIs de carga, rendimiento, costo prorrateado, proyectos, tareas y cursos.',
    intro: {
      whatIs: 'Página `/persona/<nombre>`. Vista de mayor profundidad para una persona. Combina **cuatro fuentes** (Proyectos, Cronograma (actividades), Cursos y Costos) resolviendo el `<nombre>` (apodo o nombre completo) a un `equipo.id` estable vía el registro `equipo` (`/api/equipo` + `resolveId`); luego filtra cada fuente por ese id (los endpoints ya traen `pmIds`/`arquitectoIds`/`devIds`/`asignadoId`/`equipoId`). Esto liga apodos cortos de Projects ("Lore", "Ale") con nombres completos de Cursos y Cronograma sin el viejo fuzzy frágil. Header con avatar, nombre canónico, roles inferidos y health score promedio; KPIs; charts (estatus, radar de rendimiento, progreso por proyecto); distribución de costo prorrateado; progreso en cursos; lista de proyectos asignados y tareas del cronograma.',
      whenToUse: 'Para 1:1s ("¿en cuántas cosas está y cuánto pesa cada una?"), para detectar sobrecarga (muchos proyectos al 25% → poca dedicación real), o para validar onboarding (la card de Cursos muestra el progreso de capacitación).',
      related: [
        { slug: 'equipo', label: 'Equipo', difference: 'Equipo es el directorio plano; Detalle de Persona es la vista de profundidad para una persona específica. Click en cualquier card de Equipo abre este detalle.' },
        { slug: 'cursos', label: 'Cursos', difference: 'Cursos lista el progreso de capacitación de TODO el equipo; el detalle replica solo la fila de la persona actual.' },
        { slug: 'cronograma', label: 'Cronograma', difference: 'Cronograma muestra TODAS las tareas; el detalle filtra solo las de esta persona por `asignadoId === equipo.id`.' },
        { slug: 'proyecto-detalle', label: 'Detalle de Proyecto', difference: 'Click en cualquier proyecto asignado abre el detalle del proyecto.' },
      ],
    },
  },
  {
    slug: 'comparativa',
    title: 'Comparativa',
    description: 'Vista cross-persona de autoevaluaciones trimestrales (privada, admin-only por default). Chips ordenadas + radar overlay + tabla por dimensión.',
    intro: {
      whatIs: 'Página `/comparativa`. Vista de **administración** que cruza las evaluaciones trimestrales del equipo. Modelo de privacidad **Modo A**: el colaborador **no** ve su propia evaluación; sólo un admin (gateado por `action:evaluacion:view-all`) las ve y las captura/edita aquí (vía `action:evaluacion:manage`). Tres bloques: (1) **Ranking** de chips con avatar + calificación promedio, orden descendiente; (2) **Radar overlay** al seleccionar hasta 3 personas (las 7 dimensiones superpuestas); (3) **Tabla sortable** con todas las personas y sus 7 dimensiones + calificación + cantidad de capturas históricas.',
      whenToUse: 'Para sesiones de evaluación de equipo (1:1s con managers, planning de carrera), para detectar a quién subir/dar mentoría, o para identificar gaps de capacidad por categoría de rol (Tecnología vs Management vs UX/UI). El filtro por categoría resuelve "PM vs PM, DEV vs DEV".',
      related: [
        { slug: 'cuenta', label: 'Mi cuenta', difference: 'Las evaluaciones se gestionan sólo aquí (admin). En `/cuenta` el colaborador ya no ve ni captura su propia evaluación.' },
        { slug: 'equipo', label: 'Equipo', difference: 'Equipo es el directorio con métricas **duras** derivadas del Sheet (carga, progreso, puntos). Comparativa son scores **subjetivos** declarados por cada persona, complementarios al directorio.' },
        { slug: 'metricas-dev', label: 'Métricas Dev', difference: 'Métricas Dev compara con datos del Sheet (completion rate, health score); Comparativa compara con autoevaluación. Visiones complementarias: la primera es desempeño objetivo del portafolio, la segunda es percepción personal.' },
      ],
    },
  },
  {
    slug: 'cuenta',
    title: 'Mi cuenta',
    description: 'Configuración personal (perfil, contraseña, sesiones, tokens MCP, preferencias).',
    intro: {
      whatIs: 'Página `/cuenta`. Hub de configuración del usuario logueado. Incluye foto y nombre, cambio de contraseña (oculto para users sólo-Google), lista de sesiones activas (revocar individuales o todas), tokens MCP de larga vida y limpieza de preferencias.',
      whenToUse: 'Setup inicial del perfil, cerrar sesiones de dispositivos perdidos, emitir tokens para el servidor MCP, o reset de filtros guardados.',
      related: [
        { slug: 'comparativa', label: 'Comparativa', difference: 'Las evaluaciones trimestrales se gestionan sólo en `/comparativa` (admin). El colaborador no las ve ni las captura desde `/cuenta`.' },
      ],
    },
  },
  {
    slug: 'cursos',
    title: 'Cursos',
    description: 'Seguimiento del avance del equipo en cursos formativos: KPIs, distribución por O.U., progreso por equipo y por persona.',
    intro: {
      whatIs: 'Página `/cursos`. Vista de seguimiento del programa de capacitación del equipo. Combina cuatro KPIs (total, progreso promedio, completados, sin iniciar) con dos gráficas por O.U. (distribución y progreso promedio), tarjetas agrupadas por jefe directo (cada miembro enlaza a `/persona/<nombre>`) y un ranking horizontal con el progreso individual. Los datos vienen de `/api/cursos`: usa **nombres completos** y no contiene fechas, por lo que el pronóstico de finalización se deriva del histórico de snapshots semanales.',
      whenToUse: 'Para el seguimiento mensual del programa de capacitación, para identificar quién aún no arranca un curso asignado, o para reportar avance por O.U./jefe directo. Si necesitas ver los cursos de una persona junto a sus proyectos, ven directo a `/persona/<nombre>`.',
      related: [
        { slug: 'persona-detalle', label: 'Detalle de Persona', difference: 'Cursos da la vista agregada del programa; Persona muestra los cursos de un colaborador junto a sus proyectos, tareas y costo.' },
        { slug: 'equipo', label: 'Equipo', difference: 'Equipo es el directorio puro; Cursos cruza el directorio con el progreso del programa formativo.' },
      ],
    },
  },
  {
    slug: 'novedades',
    title: 'Novedades',
    description: 'Historial cronológico de releases del Project Navigator parseado desde `CHANGELOG.md`.',
    intro: {
      whatIs: 'Página `/novedades`. Vista del **historial completo de versiones** del sistema. Los datos no vienen de Google Sheets sino del archivo `CHANGELOG.md` del repo (parseado con `parseChangelog()`) y de la versión declarada en `package.json`. Cada release tiene su versión semver, fecha y cambios agrupados en secciones (Added / Changed / Fixed).',
      whenToUse: 'Cuando algo se ve diferente y quieres saber qué cambió, cuando el equipo libera una nueva versión, o para reportar contexto histórico ("cuando agregamos pronósticos fue en v1.4.0"). También útil al investigar regresiones — la fecha exacta del cambio acota la ventana sospechosa.',
      related: [
        { slug: 'dashboard', label: 'Dashboard', difference: 'El Dashboard refleja el estado actual del portafolio con widgets configurables. Novedades muestra QUÉ cambió en cada release del propio tablero (e.g. "cuándo se agregó el widget de Costos"). Si vienes del Dashboard preguntándote por una pieza nueva, busca aquí el release que la introdujo.' },
      ],
    },
  },
  {
    slug: 'metricas-dev',
    title: 'Métricas por DEV',
    description: 'Tabla comparativa de rendimiento por persona con 10 métricas + ranking por health score + perfil radar del DEV seleccionado.',
    intro: {
      whatIs: 'Página `/metricas-dev`. Vista **comparativa** orientada a ranking y benchmark del equipo. Combina un bar chart con el ranking por health score, un radar del perfil del DEV seleccionado (con 5 dimensiones: completación, progreso, salud, puntualidad, capacidad), y una tabla densa con 10 métricas por persona (proyectos totales, Done, activos, en riesgo, % completación, % progreso, salud promedio, story points, puntualidad). **No aparece en el sidebar por diseño**: se accede solo por URL directa.',
      whenToUse: 'Para reviews de desempeño cuantitativo, detectar disparidad de carga entre devs, identificar candidatos para nuevos proyectos por su perfil histórico, o auditar quién entrega a tiempo. La tabla es ordenable por cualquier columna — útil para responder preguntas concretas ("¿quién tiene más Done?", "¿quién entrega más a tiempo?").',
      related: [
        { slug: 'equipo', label: 'Equipo', difference: 'Equipo es el **directorio** del equipo con stats agregados por persona; Métricas por DEV es la **tabla ordenable** con métricas detalladas para ranking. Equipo se usa para encontrar a alguien; Métricas por DEV para comparar.' },
        { slug: 'persona-detalle', label: 'Detalle de Persona', difference: 'El perfil individual de `/persona/<nombre>` agrega tareas del cronograma, cursos y costo prorrateado. Métricas por DEV solo usa datos de Projects (no Cronograma ni Cursos).' },
        { slug: 'distribucion', label: 'Distribución de Puntos', difference: 'Distribución muestra carga en story points por arquitecto/cliente/épica. Métricas por DEV agrega más dimensiones (puntualidad, % completación, salud) y es ordenable.' },
      ],
    },
  },
];

export const GLOSSARY: GlossaryEntry[] = [
  // ---------------- KPIs ----------------
  {
    id: 'dashboard-kpi-total',
    section: 'Dashboard',
    sectionSlug: 'dashboard',
    title: 'Total proyectos',
    summary: 'Conteo total de proyectos visibles en el portafolio (todos los estatus, ajustado al filtro de PM si está activo).',
    whatIs: 'Cuenta cuántos registros existen en la hoja Projects, sin filtrar por estatus. Es el universo sobre el que se calculan el resto de los KPIs y widgets de esta página.',
    howCalculated: '`data.length` tras aplicar el filtro de PM. La fuente es `/api/proyectos` (rango `Projects!A1:W200`), que cachea en memoria 5 minutos y parsea filas por nombre de header.',
    whyMatters: 'Es el denominador implícito de muchos otros KPIs (% completados, % en riesgo). Te dice qué tan grande es el universo del que estás reportando antes de mirar las métricas derivadas.',
    sources: [
      { label: 'DashboardSection.tsx · KPIs', href: `${GITHUB_BASE}/src/components/sections/DashboardSection.tsx#L471-L480` },
      { label: '/api/proyectos.ts', href: `${GITHUB_BASE}/src/pages/api/proyectos.ts` },
    ],
  },
  {
    id: 'dashboard-kpi-en-riesgo',
    section: 'Dashboard',
    sectionSlug: 'dashboard',
    title: 'En riesgo',
    summary: 'Proyectos cuyo estatus declarado es At Risk o Blocked / Critical.',
    whatIs: 'Conteo de proyectos marcados explícitamente como en riesgo o bloqueados por el PM en el reporte semanal de la hoja Projects.',
    howCalculated: "`data.filter(p => p.estatus === 'At Risk' || p.estatus === 'Blocked / Critical').length`",
    whyMatters: 'Tamaño de la cola de problemas reportados manualmente. Depende de la disciplina del PM al actualizar el estatus; para detectar riesgos no declarados (e.g. proyecto "On Track" pero rezagado en progreso) complementar con el health score y /alertas.',
    sources: [
      { label: 'DashboardSection.tsx', href: `${GITHUB_BASE}/src/components/sections/DashboardSection.tsx#L471-L480` },
    ],
  },
  {
    id: 'dashboard-kpi-bloqueados',
    section: 'Dashboard',
    sectionSlug: 'dashboard',
    title: 'Bloqueados',
    summary: 'Subconjunto de "En riesgo": solo proyectos en estatus Blocked / Critical.',
    whatIs: 'Conteo de proyectos marcados como Blocked / Critical, normalmente esperando a un unblocker externo (cliente, dependencia, decisión de negocio).',
    howCalculated: "`data.filter(p => p.estatus === 'Blocked / Critical').length`",
    whyMatters: 'Los bloqueos son los problemas más caros porque suelen depender de terceros. Si este contador no baja semana a semana hay un problema sistémico de gestión de dependencias; revisa /alertas y la pestaña Dependencias de /pronosticos.',
    sources: [
      { label: 'DashboardSection.tsx', href: `${GITHUB_BASE}/src/components/sections/DashboardSection.tsx#L471-L480` },
    ],
  },
  {
    id: 'dashboard-kpi-completados',
    section: 'Dashboard',
    sectionSlug: 'dashboard',
    title: 'Completados',
    summary: 'Proyectos con estatus Done. Throughput acumulado del portafolio.',
    whatIs: 'Conteo simple de proyectos cerrados. No distingue por mes, hito ni entregable; es el total histórico visible en la hoja Projects.',
    howCalculated: "`data.filter(p => p.estatus === 'Done').length`",
    whyMatters: 'Indicador básico de entrega total. Para tendencia temporal usa los snapshots semanales (/api/snapshots) o /pronosticos. Para velocity por sprint usa /cronograma con el filtro de fechas.',
    sources: [
      { label: 'DashboardSection.tsx', href: `${GITHUB_BASE}/src/components/sections/DashboardSection.tsx#L471-L480` },
      { label: '/api/snapshots.ts', href: `${GITHUB_BASE}/src/pages/api/snapshots.ts` },
    ],
  },
  {
    id: 'dashboard-kpi-puntos',
    section: 'Dashboard',
    sectionSlug: 'dashboard',
    title: 'Story points',
    summary: 'Suma de story points de todos los proyectos visibles. Aproxima el tamaño del portafolio en esfuerzo.',
    whatIs: 'Σ del campo `puntos` de cada ProjectRecord. Cada proyecto recibe puntos durante el grooming, no por tarea; es una estimación gruesa del tamaño relativo.',
    howCalculated: '`data.reduce((s, p) => s + p.puntos, 0)`',
    whyMatters: 'Mejor proxy de esfuerzo que el conteo crudo de proyectos: 10 proyectos de 8 puntos pesan más que 20 de 1 punto. Combinado con la velocity por persona (/pronosticos · Personas) permite estimar plazo de entrega del portafolio actual.',
    sources: [
      { label: 'DashboardSection.tsx', href: `${GITHUB_BASE}/src/components/sections/DashboardSection.tsx#L471-L480` },
    ],
  },

  // ---------------- Widgets ----------------
  {
    id: 'dashboard-health-summary',
    section: 'Dashboard',
    sectionSlug: 'dashboard',
    title: 'Salud del Portafolio',
    summary: 'Health score promedio (0-100) de proyectos activos + distribución en buckets (Excelente / Bueno / Medio / Bajo / Crítico) + counts Completados / On Track / En riesgo.',
    whatIs: 'Banner consolidado del estado del portafolio. Cada proyecto activo (estatus distinto a Done, On Hold y Cancelado) recibe un score 0-100 calculado por `calcHealthScore()`. El widget muestra: (1) el promedio en un círculo grande, (2) la distribución por bucket con barras, (3) una fila inferior con counts por estatus declarado (Completados / On Track / En riesgo). Movido desde Resumen Ejecutivo → Dashboard en HU NAV-69 absorbiendo el banner original. NAV-90: los proyectos **Cancelado** no cuentan para la salud (se excluyen de todos los agregados); **LaunchPhase** es un estatus activo previo a Hypercare.',
    howCalculated: `El score parte de 60 (neutral) y se ajusta por seis factores:

- **Estatus** (de -25 a +30): Done +30, On Track +15, LaunchPhase +12, Hypercare +10, Upcoming +5, On Hold -5, At Risk -15, Blocked / Critical -25. **Cancelado** no puntúa: se reporta como N/A y queda fuera de la salud general.
- **Salud manual** (de -10 a +10): Estable +10, Requiere atención -5, En riesgo -10.
- **Progreso vs esperado** (de -20 a +10): comparando p.progreso contra el % de calendario consumido entre fechaInicio y finEstimado.
- **Vencimiento** (de -5 a -15): según días vencidos sobre finEstimado.
- **Acción pendiente** (-5): si accionRequerida está set y estatus≠Done.
- **Prioridad bloqueadora/crítica**: -5 / -3 si el proyecto está abierto.

El score se acota a [0, 100]. Buckets: ≥85 Excelente, ≥65 Bueno, ≥45 Medio, ≥25 Bajo, <25 Crítico.

**Counts inferiores** (sobre el dataset completo, no solo activos):
- Completados: \`p.estatus === 'Done'\`
- On Track: \`p.estatus === 'On Track'\`
- En riesgo: \`p.estatus === 'At Risk' || 'Blocked / Critical'\``,
    whyMatters: 'A diferencia de los KPIs basados solo en estatus reportado, este score detecta riesgos no declarados (e.g. proyecto "On Track" con 30% de progreso a 80% del calendario consumido). Es el motor que alimenta /alertas y los rankings de "Proyectos en Riesgo".',
    sources: [
      { label: 'healthScore.ts · calcHealthScore', href: `${GITHUB_BASE}/src/utils/healthScore.ts#L26-L95` },
      { label: 'DashboardSection.tsx · HealthSummaryWidget', href: `${GITHUB_BASE}/src/components/sections/DashboardSection.tsx` },
    ],
  },
  {
    id: 'dashboard-health-distribution',
    section: 'Dashboard',
    sectionSlug: 'dashboard',
    title: 'Distribución de Salud',
    summary: 'Barras verticales con el conteo de proyectos activos por bucket de Health Score. Movido desde Resumen → Dashboard en HU NAV-69.',
    whatIs: 'Vista de la composición del portafolio agrupada por calidad de health: cuántos están en Excelente / Bueno / Medio / Bajo / Crítico. Sólo cuenta proyectos activos (no Done, On Hold ni Cancelado), consistente con el resto del Dashboard.',
    howCalculated: `Para cada proyecto activo: \`calcHealthScore(p)\` → label de bucket. Conteo por bucket; sólo se grafican los buckets con \`value > 0\`. Colores fijos: Excelente verde, Bueno azul, Medio amarillo, Bajo naranja, Crítico rojo.`,
    whyMatters: 'Permite ver el sesgo del portafolio: si la mayoría cae en Medio/Bajo el equipo está estresado aunque ningún proyecto esté en "Crítico" formal. Complementa al widget "Salud del Portafolio" — uno da el promedio, este da la dispersión.',
    sources: [
      { label: 'HealthDistributionChart.tsx', href: `${GITHUB_BASE}/src/components/charts/HealthDistributionChart.tsx` },
    ],
  },
  {
    id: 'dashboard-proyectos-arquitecto',
    section: 'Dashboard',
    sectionSlug: 'dashboard',
    title: 'Proyectos por Arquitecto',
    summary: 'Barras horizontales con el conteo de proyectos en los que cada arquitecto tiene participación. Multi-arquitecto cuenta por separado vía `splitMulti`.',
    whatIs: 'Reemplaza al KPI "Progreso promedio" (HU NAV-69). Responde a la pregunta del PM: ¿cuántos proyectos tiene cada arquitecto encima? Cada proyecto con dos arquitectos (e.g. `"Luis, George"`) suma 1 a cada arquitecto, no aparece como combo.',
    howCalculated: 'Para cada proyecto: `splitMulti(p.arquitecto)` da un arreglo de nombres. Cada uno incrementa su contador. El resultado se ordena descendente.',
    whyMatters: 'Carga real del rol de arquitecto: si un arquitecto tiene el doble de proyectos que otros hay riesgo de cuello de botella en revisiones técnicas y arquitectura. Cruzar con el widget "Progreso por Arquitecto" para ver si esa carga se traduce en avance o se atora.',
    sources: [
      { label: 'ProyectosPorArquitectoChart.tsx', href: `${GITHUB_BASE}/src/components/charts/ProyectosPorArquitectoChart.tsx` },
    ],
  },
  {
    id: 'dashboard-dev-workload',
    section: 'Dashboard',
    sectionSlug: 'dashboard',
    title: 'Carga de Trabajo por DEV',
    summary: 'Dona con la mezcla de proyectos activos por developer. Convertido de bar chart a dona en HU NAV-69.',
    whatIs: 'Conteo de proyectos activos (estatus distinto a Done, On Hold y Cancelado) por developer asignado. Un proyecto con varios devs cuenta una vez por cada dev en `p.devs` (campo ya parseado en `/api/proyectos`).',
    howCalculated: 'Para cada proyecto activo, iterar `p.devs` (arreglo) y `devCounts[dev] += 1`. Cada segmento de la dona corresponde a un dev, con color cíclico de la paleta `COLORS`.',
    whyMatters: 'La dona muestra la proporción de carga de un vistazo: dos o tres devs ocupando 60%+ del área indican concentración. Útil para planear distribución y detectar quien necesita aliviarse antes de la siguiente iteración.',
    sources: [
      { label: 'DevWorkloadChart.tsx', href: `${GITHUB_BASE}/src/components/charts/DevWorkloadChart.tsx` },
    ],
  },
  {
    id: 'dashboard-alerts-preview',
    section: 'Dashboard',
    sectionSlug: 'dashboard',
    title: 'Alertas',
    summary: 'Top 5 alertas activas del portafolio, ordenadas por severidad. Cubre vencidos, bloqueados, deadlines próximos y acciones pendientes.',
    whatIs: 'Subset visible de las alertas que /alertas muestra completas. Cada alerta tiene severidad (critical / warning / info) y descripción accionable con el folio del proyecto.',
    howCalculated: `\`generateAlerts(data)\` recorre cada proyecto no-Done / no-OnHold y emite hasta seis tipos:

- **Vencidos**: finEstimado < hoy. Severidad critical si han pasado más de 14 días, warning si menos.
- **Próximos a vencer**: finEstimado entre hoy y +7 días con progreso < 90% (warning).
- **Bloqueados**: estatus === 'Blocked / Critical' (critical).
- **At risk**: estatus === 'At Risk' (warning).
- **Bajo progreso**: progreso < 20% con prioridad Bloqueadora o Crítica y estatus ≠ Upcoming (warning).
- **Acciones pendientes**: campo accionRequerida no vacío (info).

Las alertas se ordenan critical → warning → info y se muestran las primeras 5.`,
    whyMatters: 'Triaje rápido: si todas son info el portafolio está saludable; si hay critical, atender antes de cualquier ceremonia. Si una alerta no aparece aquí pero esperabas verla, es probable que el estatus del proyecto la excluya (p.ej. proyectos On Hold no generan alertas).',
    sources: [
      { label: 'healthScore.ts · generateAlerts', href: `${GITHUB_BASE}/src/utils/healthScore.ts#L107-L195` },
      { label: 'DashboardSection.tsx · AlertsPreviewWidget', href: `${GITHUB_BASE}/src/components/sections/DashboardSection.tsx#L73-L102` },
    ],
  },
  {
    id: 'dashboard-at-risk-projects',
    section: 'Dashboard',
    sectionSlug: 'dashboard',
    title: 'Proyectos en Riesgo',
    summary: 'Top 5 proyectos activos con peor health score, ordenados de menor a mayor.',
    whatIs: 'Mismo cálculo que el widget "Salud del Portafolio" pero seleccionando los 5 proyectos con score más bajo. Cada item muestra el score, el folio, el arquitecto y el estatus oficial.',
    howCalculated: '`active.map(p => ({ project: p, health: calcHealthScore(p) })).sort((a,b) => a.health.score - b.health.score).slice(0, 5)`. Los proyectos Done, On Hold y Cancelado se excluyen. Para la fórmula del score ver "Salud del Portafolio".',
    whyMatters: 'Lista accionable de candidatos a 1:1 con el PM. El score considera factores que el estatus declarado puede no capturar (rezago, vencimiento, acciones colgantes). Click en cada item abre el detalle del proyecto.',
    sources: [
      { label: 'healthScore.ts · calcHealthScore', href: `${GITHUB_BASE}/src/utils/healthScore.ts#L26-L95` },
      { label: 'DashboardSection.tsx · AtRiskProjectsWidget', href: `${GITHUB_BASE}/src/components/sections/DashboardSection.tsx#L104-L130` },
    ],
  },
  {
    id: 'dashboard-upcoming-deadlines',
    section: 'Dashboard',
    sectionSlug: 'dashboard',
    title: 'Próximos Vencimientos',
    summary: 'Hasta 6 proyectos con fin estimado entre hace 7 días y los próximos 30. Marca vencidos en rojo y los próximos 7 días en ámbar.',
    whatIs: 'Vista corta del horizonte de entrega declarado por los PMs (campo finEstimado de la hoja Projects). NO usa pronóstico — son las fechas planas que aparecen en el reporte semanal.',
    howCalculated: 'Filtra proyectos no-Done / no-OnHold con finEstimado válido, calcula `days = round((finEstimado - hoy) / 1d)`, conserva los que están en la ventana [-7, +30], ordena ascendente por días y toma 6. Color de la pastilla: rojo si vencido, ámbar si 0-7 días, gris si más lejos.',
    whyMatters: 'Visibilidad inmediata de qué se acerca o se pasó según lo declarado. Para una versión con pronóstico (qué se va a vencer aunque el PM no lo haya marcado todavía) usa el widget "Próximas fechas críticas" o /pronosticos.',
    sources: [
      { label: 'DashboardSection.tsx · UpcomingDeadlinesWidget', href: `${GITHUB_BASE}/src/components/sections/DashboardSection.tsx#L132-L177` },
    ],
  },
  {
    id: 'dashboard-critical-forecast',
    section: 'Dashboard',
    sectionSlug: 'dashboard',
    title: 'Próximas fechas críticas',
    summary: 'Hasta 6 fechas críticas pronosticadas por el motor de forecast en los próximos 60 días, con badge de riesgo (on-track / slipping / at-risk / stalled).',
    whatIs: 'A diferencia de "Próximos Vencimientos" (basado en fechas declaradas), este widget usa el motor de pronóstico que cruza velocity histórica, sesgo de estimación y progreso real para proyectar la fecha de fin más probable.',
    howCalculated: `\`forecastProjects(projects, tareas)\` calcula para cada proyecto activo una fecha P50 estimada usando:

- **Velocity por persona**: puntos completados promedio en las últimas 8 semanas (\`computeTeamVelocity\`, tareas con estatus "Done").
- **Sesgo de estimación**: relación entre puntos **estimados** (\`puntos\`) y tiempo **real** traqueado (\`tracked\`) de las actividades (\`computeEstimationBias\`).
- **CV (coeficiente de variación)**: dispersión de la velocity, que determina la confianza (high / medium / low) y el spread del intervalo.

\`computeCriticalDates(forecasts, [30, 60])\` agrupa los eventos en ventanas de 30 y 60 días. El badge de riesgo viene de \`riskMeta()\`: on-track, slipping, at-risk o stalled según la magnitud del slip.`,
    whyMatters: 'El pronóstico detecta resbalones antes que el campo finEstimado, porque éste solo se actualiza si el PM lo edita. Útil para anticipar fechas críticas con clientes y proteger compromisos antes de que un riesgo se vuelva visible en los reportes.',
    sources: [
      { label: 'forecastEngine.ts · forecastProjects', href: `${GITHUB_BASE}/src/utils/forecastEngine.ts#L282-L292` },
      { label: 'forecastEngine.ts · computeCriticalDates', href: `${GITHUB_BASE}/src/utils/forecastEngine.ts#L669-L702` },
      { label: 'DashboardSection.tsx · CriticalForecastWidget', href: `${GITHUB_BASE}/src/components/sections/DashboardSection.tsx#L371-L428` },
    ],
  },
  {
    id: 'dashboard-roadmap-progress',
    section: 'Dashboard',
    sectionSlug: 'dashboard',
    title: 'Progreso del Roadmap',
    summary: 'Avance promedio (%) y proyectos done/total por cuatrimestre del roadmap.',
    whatIs: 'Agrupa proyectos por su campo `cuatrimestre` y calcula tres métricas por cuatrimestre: % de avance promedio, conteo de proyectos cerrados sobre total, y suma de story points.',
    howCalculated: `Para cada cuatrimestre:

- **avg** = \`round((Σ p.progreso / count) × 100)\`
- **done** = \`count(p.estatus === 'Done')\`
- **total** = \`count\`
- **pts** = \`Σ p.puntos\`

Los proyectos sin cuatrimestre asignado entran en un grupo "Sin cuatrimestre". Color de barra: verde si avg ≥ 80, amarillo si ≥ 40, rojo si menor.`,
    whyMatters: 'Visión por horizonte de entrega en lugar de por proyecto individual. Útil para reportar a stakeholders que piensan en cuatrimestres / entregas de cliente, no en folios. Para vista granular usa /roadmap.',
    sources: [
      { label: 'DashboardSection.tsx · RoadmapProgressWidget', href: `${GITHUB_BASE}/src/components/sections/DashboardSection.tsx#L179-L220` },
    ],
  },
  {
    id: 'dashboard-points-distribution',
    section: 'Dashboard',
    sectionSlug: 'dashboard',
    title: 'Story Points',
    summary: 'Total / entregados / activos de story points + distribución por arquitecto (top 5).',
    whatIs: 'Vista agregada de carga del portafolio en puntos: cuánto se ha cerrado vs cuánto sigue vivo, y cómo se reparte por arquitecto responsable.',
    howCalculated: `- **totalPts** = Σ p.puntos
- **donePts** = Σ p.puntos donde estatus === 'Done'
- **activePts** = Σ p.puntos donde estatus ≠ Done && ≠ On Hold

Por arquitecto se separa done / pending del campo puntos. Como un proyecto puede tener **varios arquitectos** ("Luis, George"), sus puntos cuentan para cada uno; los proyectos con arquitecto vacío o '-' se omiten. La barra muestra verde (done) + azul (pending) proporcionalmente.`,
    whyMatters: 'Identifica desbalances de carga (e.g. un arquitecto con 80 puntos pendientes mientras otros tienen 20). Para la vista completa con todos los arquitectos y filtros usa /distribucion.',
    sources: [
      { label: 'DashboardSection.tsx · PointsDistributionWidget', href: `${GITHUB_BASE}/src/components/sections/DashboardSection.tsx#L222-L272` },
    ],
  },
  {
    id: 'dashboard-cost-overview',
    section: 'Dashboard',
    sectionSlug: 'dashboard',
    title: 'Resumen de Costos',
    summary: 'Costo mensual total del equipo y top 5 roles por costo. Lectura directa de la hoja Costos.',
    whatIs: 'Suma del costo mensual de cada rol en la hoja Costos (filas con campo `rol` no vacío) y los 5 roles más caros, junto con la cantidad de recursos.',
    howCalculated: '`totalMensual = Σ c.total` sobre el resultado de `/api/costos` (filas 1-12 de la hoja). `totalRecursos = Σ c.recursos`. Top 5: orden descendente por total, primeros 5. NO incluye prorrateo por proyecto ni el modelo financiero del Excel — es el costo bruto del equipo.',
    whyMatters: 'Línea base de gasto fijo. Para costo por proyecto (con prorrateo por participación y modelo de pricing aplicado: experiencia → admin → margen → IVA) usa /costos. El número aquí es solo la nómina interna sin transformar.',
    sources: [
      { label: '/api/costos.ts', href: `${GITHUB_BASE}/src/pages/api/costos.ts` },
      { label: 'DashboardSection.tsx · CostOverviewWidget', href: `${GITHUB_BASE}/src/components/sections/DashboardSection.tsx#L274-L308` },
    ],
  },
  {
    id: 'dashboard-tareas-overview',
    section: 'Dashboard',
    sectionSlug: 'dashboard',
    title: 'Resumen de Cronograma',
    summary: 'Tareas totales, completadas, activas, atrasadas, puntos entregados y estimado-vs-real (tracked).',
    whatIs: 'A diferencia de los KPIs basados en proyectos, este widget mira la granularidad de actividades individuales del cronograma — la hoja `actividades` (que unificó las antiguas `app` y `Core`).',
    howCalculated: `Lee \`/api/tareas\` (hoja \`actividades\`). Cuenta por estatus:

- **Completadas**: \`isTareaDone(estatus)\` (estatus "Done").
- **Activas**: 'in progress', 'review', 'testing', 'change' o 'pending'.
- **Atrasadas**: \`salud\` contiene "Atrazada".

Calcula \`pctCompletadas = round((completadas / total) × 100)\`, puntos entregados / totales, y compara el **estimado** (\`puntos\`) contra el **real** traqueado (\`tracked\`, en puntos).`,
    whyMatters: 'Granularidad sub-proyecto: un proyecto puede estar al 60% pero tener 80% de sus tareas hechas (las difíciles quedaron al final). El cronograma es donde el throughput semanal se materializa. El contraste estimado-vs-real revela la calidad de las estimaciones. Para análisis profundo, filtros y gráficas, usa /cronograma.',
    sources: [
      { label: '/api/tareas.ts', href: `${GITHUB_BASE}/src/pages/api/tareas.ts` },
      { label: 'DashboardSection.tsx · TareasOverviewWidget', href: `${GITHUB_BASE}/src/components/sections/DashboardSection.tsx#L310-L369` },
    ],
  },

  // ---------------- Resumen Ejecutivo ----------------
  // Bloques "Banner Salud del Portafolio" y "Distribución de Salud" movidos al
  // Dashboard en HU NAV-69 (ver dashboard-health-summary y dashboard-health-distribution).
  {
    id: 'resumen-hito-comparison',
    section: 'Resumen Ejecutivo',
    sectionSlug: 'resumen',
    title: 'Comparativa por Q de entrega',
    summary: 'Por cuatrimestre del roadmap: barra de progreso reportado (%) vs barra de salud promedio (0-100), una al lado de otra.',
    whatIs: 'Permite contrastar dos métricas distintas por cuatrimestre. **Progreso** es el avance plano declarado por el PM; **Salud** es el score calculado que cruza estatus, vencimiento, rezago y prioridad. Útil para detectar cuatrimestres donde una métrica miente sobre la otra.',
    howCalculated: `Agrupa proyectos activos por \`p.cuatrimestre\` (usando \`groupByField\`). Por grupo:

- **progreso** = \`round((Σ p.progreso / count) × 100)\`
- **salud** = \`round((Σ calcHealthScore(p).score) / count)\`
- **count** = número de proyectos del cuatrimestre

Se excluyen valores vacíos o "Sin dato". Color de barra: verde si ≥80/65, amarillo si ≥40/45, rojo si menor (los umbrales difieren entre progreso y salud).`,
    whyMatters: 'Detecta cuatrimestres donde progreso y salud divergen: un cuatrimestre con 80% de progreso pero salud de 30 indica que las tareas restantes están en problemas serios (bloqueos, rezagos finales). Es el principal motivo para no reportar al cliente solo "% de avance".',
    sources: [
      { label: 'ResumenSection.tsx · hitoData', href: `${GITHUB_BASE}/src/components/sections/ResumenSection.tsx#L87-L97` },
      { label: 'healthScore.ts · calcHealthScore', href: `${GITHUB_BASE}/src/utils/healthScore.ts#L26-L95` },
    ],
  },
  {
    id: 'resumen-needs-attention',
    section: 'Resumen Ejecutivo',
    sectionSlug: 'resumen',
    title: 'Requieren Atención',
    summary: 'Top 5 proyectos activos con peor health score. Cada item muestra los factores explícitos que bajan el score.',
    whatIs: 'Lista priorizada de proyectos para revisar. A diferencia del widget similar del Dashboard, aquí mostramos los principales factores que penalizan el score (e.g. "Vencido hace 5 días · Progreso rezagado"), así no tienes que abrir cada proyecto para entender por qué está mal.',
    howCalculated: '`active.map(p => ({ project: p, health: calcHealthScore(p) })).sort((a, b) => a.health.score - b.health.score).slice(0, 5)`. Los factores vienen del array `health.factors` que `calcHealthScore` genera durante el cálculo (se muestran los primeros 2, suelen ser los más impactantes).',
    whyMatters: 'Lista de candidatos a 1:1 con el PM. Si "Vencido" o "Requiere acción" aparece en varios items, hay un problema sistémico de seguimiento. El click te lleva al detalle del proyecto para profundizar.',
    sources: [
      { label: 'ResumenSection.tsx · worstProjects', href: `${GITHUB_BASE}/src/components/sections/ResumenSection.tsx#L73-L75` },
      { label: 'healthScore.ts · calcHealthScore', href: `${GITHUB_BASE}/src/utils/healthScore.ts#L26-L95` },
    ],
  },
  {
    id: 'resumen-best-performance',
    section: 'Resumen Ejecutivo',
    sectionSlug: 'resumen',
    title: 'Mejor Desempeño',
    summary: 'Top 5 proyectos activos con mejor health score, ordenados de mayor a menor.',
    whatIs: 'Inverso de "Requieren Atención": los 5 proyectos cuyo score es más alto. Útil para identificar buenas prácticas y proyectos que no necesitan atención esta semana.',
    howCalculated: '`active.map(p => ({ project: p, health: calcHealthScore(p) })).sort((a, b) => b.health.score - a.health.score).slice(0, 5)`. Mismo dataset y misma fórmula que "Requieren Atención", solo cambia el orden.',
    whyMatters: 'Sirve para celebrar lo que funciona y para detectar patrones (¿mismo PM? ¿mismo arquitecto? ¿tamaño similar?). En portafolios pequeños, todos pueden estar en este top — léelo como "estos no requieren intervención esta semana", liberando tu atención para los de la otra columna.',
    sources: [
      { label: 'ResumenSection.tsx · bestProjects', href: `${GITHUB_BASE}/src/components/sections/ResumenSection.tsx#L78-L80` },
      { label: 'healthScore.ts · calcHealthScore', href: `${GITHUB_BASE}/src/utils/healthScore.ts#L26-L95` },
    ],
  },

  // ---------------- Alertas ----------------
  {
    id: 'alertas-kpi-criticas',
    section: 'Alertas',
    sectionSlug: 'alertas',
    title: 'Críticas',
    summary: 'Alertas de severidad critical: requieren atención inmediata. Cubren vencimientos largos, bloqueos y pronósticos en riesgo profundo.',
    whatIs: 'Contador de alertas marcadas como `severity === "critical"`. Una alerta se asigna a esta severidad cuando representa un problema agudo del cual se desprende impacto inmediato sobre entrega o cliente.',
    howCalculated: `\`pmScopedAlerts.filter(a => a.severity === 'critical').length\`.

Las severidades se asignan en dos lugares:
- **\`generateAlerts()\`** (alertas declarativas): critical para vencidos >14 días y para estatus Blocked / Critical.
- **\`generateForecastAlerts()\`** (alertas inferidas): critical para pronósticos en riesgo "stalled" y para bloqueadores no resueltos que ya impactan ruta crítica.`,
    whyMatters: 'Si este número es >0 al inicio del día, ese debe ser tu foco antes de cualquier otra ceremonia. Si crece semana a semana hay un problema sistémico de seguimiento o de gestión de bloqueadores.',
    sources: [
      { label: 'AlertasSection.tsx · counts', href: `${GITHUB_BASE}/src/components/sections/AlertasSection.tsx#L115-L119` },
      { label: 'healthScore.ts · generateAlerts', href: `${GITHUB_BASE}/src/utils/healthScore.ts#L107-L195` },
      { label: 'forecastAlerts.ts · generateForecastAlerts', href: `${GITHUB_BASE}/src/utils/forecastAlerts.ts` },
    ],
  },
  {
    id: 'alertas-kpi-advertencias',
    section: 'Alertas',
    sectionSlug: 'alertas',
    title: 'Advertencias',
    summary: 'Alertas de severidad warning: requieren atención pronto pero no urgente. Señales tempranas antes de escalar a critical.',
    whatIs: 'Contador de alertas marcadas como `severity === "warning"`. Son situaciones que no son agudas todavía pero que, sin intervención, pueden volverse críticas en días.',
    howCalculated: `\`pmScopedAlerts.filter(a => a.severity === 'warning').length\`.

Ejemplos típicos: estatus 'At Risk', vencen en próximos 7 días con progreso <90%, progreso <20% con prioridad bloqueadora/crítica, pronóstico "slipping" o "at-risk", desaceleración detectada vs baseline, bloqueador con pronóstico en riesgo.`,
    whyMatters: 'El indicador más importante para el seguimiento semanal: revisar todas las warning evita que se conviertan en critical. Si las críticas son "apagar incendios", las warning son "prevenir incendios".',
    sources: [
      { label: 'AlertasSection.tsx · counts', href: `${GITHUB_BASE}/src/components/sections/AlertasSection.tsx#L115-L119` },
      { label: 'healthScore.ts · generateAlerts', href: `${GITHUB_BASE}/src/utils/healthScore.ts#L107-L195` },
      { label: 'forecastAlerts.ts · generateForecastAlerts', href: `${GITHUB_BASE}/src/utils/forecastAlerts.ts` },
    ],
  },
  {
    id: 'alertas-kpi-informativas',
    section: 'Alertas',
    sectionSlug: 'alertas',
    title: 'Informativas',
    summary: 'Alertas de severidad info: visibilidad sin urgencia. Acciones pendientes registradas por el PM o datos con calidad cuestionable.',
    whatIs: 'Contador de alertas marcadas como `severity === "info"`. No representan problemas, pero sí cosas a tener presentes en planeación o conversación con el PM.',
    howCalculated: `\`pmScopedAlerts.filter(a => a.severity === 'info').length\`.

Ejemplos típicos: \`accionRequerida\` no vacío (alerta de tipo action-needed), datos sin actualizar por semanas (stale-data) cuando todavía no causa otro síntoma, o anomalías leves que no se reflejan en estatus.`,
    whyMatters: 'Ojos en estas cuando agendes 1:1 con PMs: son los temas pendientes que el PM ya levantó y todavía no se cierran. No son foco diario, pero ignorarlas durante semanas crea backlog invisible.',
    sources: [
      { label: 'AlertasSection.tsx · counts', href: `${GITHUB_BASE}/src/components/sections/AlertasSection.tsx#L115-L119` },
      { label: 'healthScore.ts · generateAlerts', href: `${GITHUB_BASE}/src/utils/healthScore.ts#L107-L195` },
      { label: 'forecastAlerts.ts · generateForecastAlerts', href: `${GITHUB_BASE}/src/utils/forecastAlerts.ts` },
    ],
  },
  {
    id: 'alertas-lista',
    section: 'Alertas',
    sectionSlug: 'alertas',
    title: 'Lista de Alertas',
    summary: 'Lista combinada de 12 tipos de alerta (6 declarativas + 6 inferidas), ordenadas critical → warning → info y filtrables por tipo y PM.',
    whatIs: 'Vista unificada del centro de alertas. Combina alertas **declarativas** (basadas en estatus/campos del PM) con alertas **inferidas** (motor de pronóstico, detección de anomalías, análisis de dependencias). Cada alerta tiene tipo, severidad, descripción contextual y link al detalle del proyecto.',
    howCalculated: `**Alertas declarativas** (\`generateAlerts(data)\` — basadas en campos reportados):

- **overdue**: \`finEstimado < hoy\` → critical si >14 días, sino warning
- **upcoming-deadline**: \`finEstimado\` en próximos 7d con progreso <90% → warning
- **blocked**: \`estatus === 'Blocked / Critical'\` → critical
- **at-risk**: \`estatus === 'At Risk'\` → warning
- **low-progress**: progreso <20% con prioridad Bloqueadora/Crítica y estatus ≠ Upcoming → warning
- **action-needed**: \`accionRequerida\` no vacío → info

**Alertas inferidas** (\`generateForecastAlerts({forecasts, staleMap, anomalies, dependencies})\` — motor automático):

- **forecast-at-risk**: el motor de pronóstico predice slip significativo en finEstimado
- **stale-data**: progreso sin moverse ≥14 días (comparado contra snapshots semanales)
- **anomaly-slowdown**: ritmo reciente más lento que baseline histórico
- **anomaly-stall**: ritmo en 0 cuando antes había avance medible
- **blocker-unresolved**: proyecto referenciado en \`requiereDe\` de otro sigue abierto
- **blocker-at-risk**: el bloqueador a su vez tiene pronóstico en riesgo (cascada)

Las dos fuentes se concatenan, se ordenan por severidad (critical → warning → info), y se filtran por PM y por tipo en la UI. Proyectos Done u On Hold no generan alertas declarativas.`,
    whyMatters: 'Centro único de seguimiento. La combinación de "lo que el PM declaró" + "lo que el sistema detectó automáticamente" permite encontrar problemas antes de que el PM los reporte. Si una alerta inferida (e.g. stale-data o anomaly-stall) está activa en un proyecto que el PM marca "On Track", hay disonancia que vale la pena conversar.',
    sources: [
      { label: 'healthScore.ts · generateAlerts', href: `${GITHUB_BASE}/src/utils/healthScore.ts#L107-L195` },
      { label: 'forecastAlerts.ts · generateForecastAlerts', href: `${GITHUB_BASE}/src/utils/forecastAlerts.ts` },
      { label: 'anomalies.ts · detectAnomalies', href: `${GITHUB_BASE}/src/utils/anomalies.ts` },
      { label: 'stale.ts · computeStaleness', href: `${GITHUB_BASE}/src/utils/stale.ts` },
      { label: 'dependencies.ts · analyzeDependencies', href: `${GITHUB_BASE}/src/utils/dependencies.ts` },
      { label: 'AlertasSection.tsx · alerts useMemo', href: `${GITHUB_BASE}/src/components/sections/AlertasSection.tsx#L87-L103` },
    ],
  },

  // ---------------- Portafolio ----------------
  {
    id: 'portafolio-grid',
    section: 'Portafolio',
    sectionSlug: 'portafolio',
    title: 'Tarjetas de Proyecto',
    summary: 'Cada tarjeta muestra folio, actividad, progreso, badges de estatus/salud/stale, equipo y chip de pronóstico (riesgo + slippage + probabilidad).',
    whatIs: `Grid paginado (12 por página) donde cada tarjeta resume un proyecto en 2 segundos de lectura. Click abre el detalle completo del proyecto.

**Anatomía de una tarjeta:**

- **Header**: folio (gris monoespaciado) + actividad. Badge "Stale" (ámbar) si los datos no se mueven, badge de estatus.
- **Barra de progreso**: porcentaje + barra horizontal coloreada.
- **Meta**: arquitecto · cuatrimestre · puntos · badge de salud (Estable / Requiere atención / En riesgo).
- **Equipo (DEVs)**: chips de hasta 4 devs + contador "+N" para overflow.
- **Chip de pronóstico** (cuando aplica): riesgo del motor + desvío en días + probabilidad de cumplir a tiempo.`,
    howCalculated: `**Color de la barra de progreso:**
- Verde si \`progreso ≥ 80%\`, amarillo si \`≥ 40%\`, rojo si menor.

**Badge "Stale":**
- Aparece cuando \`computeStaleness(data, snapshots)\` detecta que \`progreso\` no se ha movido durante ≥14 días vs los snapshots semanales. El tooltip nativo muestra la razón.

**Chip de pronóstico** (solo si \`forecast.risk\` no es \`'done'\` ni \`'insufficient-data'\`):
- **Riesgo**: \`riskMeta(forecast.risk)\` → on-track / slipping / at-risk / stalled. Cada nivel tiene su color y borde.
- **Slippage**: días de desvío vs \`finEstimado\`. Color rojo si >14d, ámbar si >3d, azul si <-3d (adelantado), verde si dentro de ±3d. Se oculta si es exactamente 0.
- **Probabilidad a tiempo**: \`probabilityMeta(forecast.onTimeProbability)\` → label "high/medium/low a tiempo" con su color.

**Filtros y búsqueda:**
- Filtros multi-valor por: estatus, salud, prioridad, arquitecto, cuatrimestre, PM. Mono-valor: dev.
- Search: case-insensitive sobre \`actividad\` y \`folio\`.
- Toggle "Incluir terminados": por default los Done se ocultan; al activarlo se incluyen en el grid. El contador "Y terminados ocultos" muestra cuántos se están omitiendo.
- La paginación se resetea automáticamente cuando cambia el conjunto filtrado.`,
    whyMatters: 'La idea es que cada tarjeta sea escaneable: con un vistazo deberías poder identificar proyectos en riesgo. Combinación a vigilar: badge **Stale** (ámbar) + chip de pronóstico **rojo** + salud **En riesgo** = candidato inmediato a 1:1 con el PM. Una tarjeta sin stale, con chip verde y salud Estable es un proyecto que no necesita tu atención esta semana.',
    sources: [
      { label: 'ProjectCard.tsx', href: `${GITHUB_BASE}/src/components/ui/ProjectCard.tsx` },
      { label: 'ProyectosSection.tsx · filtered', href: `${GITHUB_BASE}/src/components/sections/ProyectosSection.tsx#L61-L82` },
      { label: 'forecastEngine.ts · riskMeta / probabilityMeta', href: `${GITHUB_BASE}/src/utils/forecastEngine.ts#L294-L320` },
      { label: 'stale.ts · computeStaleness', href: `${GITHUB_BASE}/src/utils/stale.ts` },
    ],
  },

  // ---------------- Detalle de Proyecto ----------------
  {
    id: 'proyecto-kpi-strip',
    section: 'Detalle de Proyecto',
    sectionSlug: 'proyecto-detalle',
    title: 'KPIs Rápidos',
    summary: 'Tira de 5 mini-KPIs del proyecto: progreso, días restantes/atraso, story points, health score y costo mensual estimado.',
    whatIs: 'Resumen visual del estado del proyecto en una sola línea. Permite ver en un vistazo si está a tiempo, qué tan grande es, qué tan saludable y cuánto cuesta sostenerlo.',
    howCalculated: `- **Progreso**: \`Math.round(project.progreso × 100)\` con sufijo \`%\`.
- **Días restantes / Vencido / Listo**: \`daysFromNow(project.finEstimado)\`. Muestra "Listo" si estatus === Done; "Nd atraso" en rojo si finEstimado < hoy y estatus ≠ Done; "Nd" si futuro. Borde rojo del card cuando hay atraso.
- **Story points**: \`project.puntos || 0\`.
- **Health score**: \`calcHealthScore(project).score\` (0-100). El color se hereda del label (Excelente / Bueno / Medio / Bajo / Crítico). Borde rojo del card si <45.
- **Costo est./mes**: \`estimateProjectCost(project, allProjects, costos).estimatedMonthlyCost\`. Solo aparece si >0. Es el costo prorrateado del equipo (ver entrada "Costo Estimado").`,
    whyMatters: 'Para una conversación rápida: estos 5 números resumen el proyecto. Si el card de "Días restantes" tiene borde rojo o el de Health score lo tiene, hay un problema; si todo está sin borde rojo, el proyecto está bajo control para esta semana.',
    sources: [
      { label: 'ProyectoDetailSection.tsx · KPI strip', href: `${GITHUB_BASE}/src/components/sections/ProyectoDetailSection.tsx#L190-L230` },
      { label: 'healthScore.ts · calcHealthScore', href: `${GITHUB_BASE}/src/utils/healthScore.ts#L26-L95` },
      { label: 'costEngine.ts · estimateProjectCost', href: `${GITHUB_BASE}/src/utils/costEngine.ts#L100-L148` },
    ],
  },
  {
    id: 'proyecto-progress-gauge',
    section: 'Detalle de Proyecto',
    sectionSlug: 'proyecto-detalle',
    title: 'Progreso General',
    summary: 'Gauge radial con el % de avance + chips de factores del health score + desglose de avance por Hito (o Fase) que explica de dónde sale el % global.',
    whatIs: 'Visualización semicircular del progreso reportado por el PM. Debajo, chips con los **factores explícitos** del health score y un **desglose de avance por Hito** (si el proyecto tiene hitos) o **por Fase** (fallback). El desglose responde "¿por qué el avance es X%?" mostrando el % de cada hito/fase que se promedia.',
    howCalculated: `- **Valor del gauge**: \`progressPct = round(project.progreso × 100)\`.
- **Color del fill**: verde si ≥80%, amarillo si ≥40%, rojo si menor.
- **Chips de factores**: \`calcHealthScore(project).factors[]\`.
- **Avance por Hito**: \`HitoRecord.avance × 100\` por cada hito del proyecto (entidad de la hoja \`hitos\`), ordenado descendente. Si no hay hitos, cae a **Avance por Fase**: promedio de \`actividad.avance\` agrupado por \`fase\`.`,
    whyMatters: 'Los chips explican el health score; el desglose por hito/fase explica el **avance**. Ver que el avance global de 60% viene de "Hito A 100%, Hito B 20%" es mucho más accionable que un solo número — te dice exactamente dónde está trabado el proyecto.',
    sources: [
      { label: 'ProyectoDetailSection.tsx · progress gauge', href: `${GITHUB_BASE}/src/components/sections/ProyectoDetailSection.tsx` },
      { label: 'healthScore.ts · calcHealthScore', href: `${GITHUB_BASE}/src/utils/healthScore.ts#L26-L95` },
    ],
  },
  {
    id: 'proyecto-timeline',
    section: 'Detalle de Proyecto',
    sectionSlug: 'proyecto-detalle',
    title: 'Línea de Tiempo',
    summary: 'Barra visual con tiempo transcurrido vs proyectado y marker "HOY" + lista de fechas y metadatos clave en orden Registro → Inicio → Fin estimado → Fin real → Q de entrega → Producto → Cliente.',
    whatIs: 'La parte superior es una barra horizontal que cruza dos cosas en un solo gráfico: el **progreso** del trabajo (fill coloreado) y el **tiempo transcurrido** (marker "HOY"). Si las dos están alineadas, el proyecto va a ritmo. Si HOY está mucho más adelantado que el progreso, hay rezago. Debajo, la lista de fechas y metadatos declarados en la hoja Projects.',
    howCalculated: `**Barra visual:**
- Fill: \`progressPct\` con color verde/amarillo/rojo según umbral 80/40.
- Marker HOY: \`((hoy - fechaInicio) / (finEstimado - fechaInicio)) × 100%\`. Acotado a [0, 100]. Solo se muestra si no es Done y \`timelineElapsedPct > 0\`.

**Lista de campos** (orden fijo, de la hoja Projects):
- \`registro\`: cuando se creó el folio en el Sheet — puede ser anterior al inicio.
- \`fechaInicio\` (Inicio): cuando empezó realmente el trabajo (asignación de devs).
- \`finEstimado\` (Fin estimado): deadline declarado por el PM. **Badge días**: rojo si vencido, ámbar si ≤7d, gris si más lejos.
- \`finReal\` (Fin real): cuando realmente terminó (solo si estatus === Done).
- \`cuatrimestre\` (**Q de entrega**): horizonte de entrega (antes etiquetado "Cuatrimestre"/"Hito").
- \`producto\` (**Producto**): línea de producto (antes este renglón mostraba la Épica).
- \`aliado\` (**Cliente**): aliado/cliente externo; se omite si es "Ninguno".`,
    whyMatters: 'Lectura visual instantánea de "ritmo": si la barra de progreso está al 80% pero HOY apenas al 30% del tiempo, vas adelantado. Si HOY está al 80% pero el progreso al 30%, hay un problema de ritmo grave. El orden de fechas (Registro → Inicio → Fin estimado → Fin real) refleja la vida real del proyecto, y los metadatos (Q de entrega / Producto / Cliente) dan el contexto de a quién y para cuándo entrega.',
    sources: [
      { label: 'ProyectoDetailSection.tsx · timeline', href: `${GITHUB_BASE}/src/components/sections/ProyectoDetailSection.tsx` },
    ],
  },
  {
    id: 'proyecto-comparativa',
    section: 'Detalle de Proyecto',
    sectionSlug: 'proyecto-detalle',
    title: 'Comparativa',
    summary: 'Compara progreso y salud del proyecto contra el promedio de SUS PARES (mismo grupo, excluyéndose a sí mismo) por épica y por Q de entrega. Solo aparece si hay ≥1 par.',
    whatIs: 'Dos pares de barras superpuestas. La barra base (azul tenue para épica, púrpura tenue para Q de entrega) representa el promedio de los **demás** proyectos del grupo; encima va una barra de este proyecto. Si el proyecto está sobre el promedio se pinta verde; si está debajo, rojo.',
    howCalculated: `**Promedio por épica** (sin auto-inclusión):
- \`peers = data.filter(p => p.epica === project.epica && p.id !== project.id)\`
- \`avgProgress = round((Σ peers.progreso / peers.length) × 100)\`
- \`avgHealth = round((Σ calcHealthScore(p).score) / peers.length)\`

**Promedio por Q de entrega**: idéntico agrupando por \`p.cuatrimestre\`.

Solo se renderiza si \`peers.length ≥ 1\`. **Importante**: el proyecto actual se EXCLUYE del promedio para que la comparación sea honesta (antes se auto-incluía y aplanaba la diferencia en grupos chicos).`,
    whyMatters: 'Detecta si el proyecto es outlier vs su grupo de iguales. Un proyecto al 30% en una épica cuyos pares promedian 70% es candidato a 1:1 inmediato; uno al 70% donde los pares promedian 30% indica buenas prácticas que vale la pena replicar. Al excluirse a sí mismo, la referencia es "los demás", no "el grupo conmigo dentro".',
    sources: [
      { label: 'ProyectoDetailSection.tsx · comparativa', href: `${GITHUB_BASE}/src/components/sections/ProyectoDetailSection.tsx` },
    ],
  },
  {
    id: 'proyecto-acciones-pendientes',
    section: 'Detalle de Proyecto',
    sectionSlug: 'proyecto-detalle',
    title: 'Acciones Pendientes',
    summary: 'Card ámbar que aparece cuando el PM reportó dependencias (`requiereDe`) o una acción pendiente (`accionRequerida`) en el Sheet.',
    whatIs: 'Es la "nota del PM" que documenta qué falta para destrabar el proyecto. Tres campos opcionales: **requiereDe** (texto libre con la dependencia: otro proyecto, área, persona), **accionRequerida** (la próxima acción concreta), y **fechaAccion** (deadline opcional).',
    howCalculated: '**Condición de aparición**: `project.requiereDe || project.accionRequerida`. Si ninguno está set, la card no se renderiza. Los valores son texto libre que el PM escribe en la hoja Projects.',
    whyMatters: 'Es el **contexto que el PM dejó por escrito**. Si abres un detalle y este card está presente, esa información debería guiar la conversación. Las acciones pendientes (`accionRequerida`) también disparan automáticamente alertas tipo `action-needed` en /alertas, así que sirven como link bidireccional entre el detalle y el centro de alertas.',
    sources: [
      { label: 'ProyectoDetailSection.tsx · acciones', href: `${GITHUB_BASE}/src/components/sections/ProyectoDetailSection.tsx#L405-L430` },
      { label: 'healthScore.ts · action-needed alert', href: `${GITHUB_BASE}/src/utils/healthScore.ts#L107-L195` },
    ],
  },
  {
    id: 'proyecto-costo-estimado',
    section: 'Detalle de Proyecto',
    sectionSlug: 'proyecto-detalle',
    title: 'Costo Estimado',
    summary: 'Costo mensual del proyecto prorrateado por el % de tiempo que el equipo le dedica vs otros proyectos activos. + breakdown por persona.',
    whatIs: 'Vista de costo interno del proyecto + breakdown por persona. **No incluye el modelo financiero del Excel** (margen, IVA, admin). Para la cifra que se cobra al cliente, ven a /costos. El esfuerzo (Pts/Horas/Días) vive en su propia card "Esfuerzo".',
    howCalculated: `\`estimateProjectCost(project, allProjects, costos)\` itera sobre el equipo y para cada persona:
1. Cuenta cuántos **proyectos activos** tiene (estatus ≠ Done, ≠ On Hold).
2. Toma el costo mensual de su rol (fuzzy match contra la hoja Costos).
3. **Prorratea**: \`share = costoMensual / numProyectosActivos\`.

El **breakdown** muestra cada persona con su rol y costo prorrateado. Si la persona no tiene match en Costos, se omite. La card solo aparece si el costo mensual > 0.`,
    whyMatters: 'El costo prorrateado da una cifra interna justa: un dev en 5 proyectos no carga el costo completo a este. Útil para priorizar (cuáles cuestan más de mantener) y detectar inflación de equipo (8 devs prorrateados al 12% = poca dedicación real).',
    sources: [
      { label: 'costEngine.ts · estimateProjectCost', href: `${GITHUB_BASE}/src/utils/costEngine.ts#L100-L148` },
      { label: 'ProyectoDetailSection.tsx · cost breakdown', href: `${GITHUB_BASE}/src/components/sections/ProyectoDetailSection.tsx` },
    ],
  },
  {
    id: 'proyecto-esfuerzo',
    section: 'Detalle de Proyecto',
    sectionSlug: 'proyecto-detalle',
    title: 'Esfuerzo',
    summary: 'Esfuerzo Asignado (estimado) vs Invertido (real) del proyecto en Pts / Horas / Días. Card independiente del costo.',
    whatIs: 'Traduce el trabajo del proyecto a una unidad que negocio entiende. Dos filas: **Asignado** (lo estimado) y **Invertido** (lo realmente trabajado). Aparece siempre que haya puntos asignados, exista o no costo calculado.',
    howCalculated: `Conversión acordada con negocio: **1 punto = 1 hora**; **1 día = 8 h** (jornada L-V).
- **Asignado** = Σ \`puntos\` de las actividades del proyecto (fallback a \`project.puntos\` si aún no hay actividades ligadas). Horas = pts × 1; Días = horas / 8.
- **Invertido** = Σ \`tracked\` (tiempo real traqueado, en puntos) de las actividades. Solo se muestra la fila si hay \`tracked > 0\`.`,
    whyMatters: 'Asignado vs Invertido revela el sesgo de estimación a nivel proyecto: si invertido ≫ asignado, el proyecto se subestimó (insumo directo para calibrar estimaciones futuras). En días, traduce el backlog a calendario de trabajo real.',
    sources: [
      { label: 'ProyectoDetailSection.tsx · effort', href: `${GITHUB_BASE}/src/components/sections/ProyectoDetailSection.tsx` },
    ],
  },
  {
    id: 'proyecto-gantt',
    section: 'Detalle de Proyecto',
    sectionSlug: 'proyecto-detalle',
    title: 'Cronograma del Proyecto (Gantt)',
    summary: 'Gantt de las actividades del proyecto posicionadas en el tiempo, agrupadas por Hito (default) o por Fase. Con marcador HOY y barra de avance por hito.',
    whatIs: 'Vista temporal de las actividades del proyecto (hoja `actividades` filtradas por `proyectoId`). Un selector elige el eje de agrupación: **Hito** (entidad de la hoja `hitos`, con su propia barra inicio→fin y % de avance) o **Fase** (Análisis/Desarrollo/SQA…). Cada actividad es una barra posicionada por sus fechas, coloreada por estatus.',
    howCalculated: `**Rango temporal**: min/max de todas las fechas de actividades (\`inicioEstimado\`, \`inicio\`, \`finEstimado\`, \`finReal\`) y de hitos (\`inicio\`, \`fin\`), con 2 días de padding. Posición de cada barra = \`(inicioMs − min) / rangoDías\` (left%) y \`(spanDías / rangoDías)\` (width%).

**Agrupar por Hito**: las actividades se agrupan por \`hitoId\`; el encabezado del grupo muestra la barra del hito (\`hitos.inicio → hitos.fin\`) con fill = \`avance\` y chip de \`estatus\`. Actividades sin hito caen en "Sin hito asignado".

**Agrupar por Fase**: se agrupan por \`actividad.fase\` (sin barra de encabezado, porque la fase no tiene fechas propias).

**HOY**: línea vertical azul en la posición del día actual. Actividades sin fechas válidas muestran "sin fechas" en vez de barra.`,
    whyMatters: 'Es la respuesta directa al "muéstrame el plan" del PM. Agrupado por Hito da la lectura ejecutiva (¿qué hito está atrasado?); agrupado por Fase da la lectura operativa (¿cuánto SQA falta?). Las barras posicionadas hacen visible el traslape y la secuencia que una lista plana esconde.',
    sources: [
      { label: 'ProjectGantt.tsx', href: `${GITHUB_BASE}/src/components/charts/ProjectGantt.tsx` },
      { label: '/api/hitos.ts', href: `${GITHUB_BASE}/src/pages/api/hitos.ts` },
    ],
  },
  {
    id: 'proyecto-burndown',
    section: 'Detalle de Proyecto',
    sectionSlug: 'proyecto-detalle',
    title: 'Burndown del Proyecto',
    summary: 'Puntos restantes por semana con tres curvas: ideal (lineal), esperado (por fecha estimada de cada actividad) y real (por cierre real).',
    whatIs: 'Burndown a nivel proyecto sobre las actividades del proyecto. Contrasta tres trayectorias de puntos restantes para revelar si el plan se está cumpliendo y si su forma (front/back-loaded) es realista.',
    howCalculated: `\`totalPts = Σ actividades.puntos\`. Semanas (lunes-ancladas) desde \`inicioEstimado || fechaInicio\` hasta \`max(finEstimado, hoy)\` (máx 40). Por semana \`i\` con fin de semana \`weekEnd\`:
- **Ideal** = \`max(0, totalPts − (totalPts / semanaFin) × i)\` (decaimiento lineal a 0 en la semana del \`finEstimado\`).
- **Esperado** = \`totalPts − Σ puntos\` de actividades con \`finEstimado ≤ weekEnd\`.
- **Real** = \`totalPts − Σ puntos\` de actividades Done con \`finReal ≤ weekEnd\` (solo hasta la semana de hoy; futuro = null).`,
    whyMatters: 'La curva esperada vs ideal muestra si el plan está cargado al final (riesgo); la real vs esperada muestra si se está cumpliendo. Si la real queda por encima de la esperada, el proyecto va rezagado en entrega de puntos, no solo en fechas.',
    sources: [
      { label: 'ProjectBurndown.tsx', href: `${GITHUB_BASE}/src/components/charts/ProjectBurndown.tsx` },
    ],
  },
  {
    id: 'proyecto-relacionados',
    section: 'Detalle de Proyecto',
    sectionSlug: 'proyecto-detalle',
    title: 'Proyectos Relacionados',
    summary: 'Hasta 9 proyectos del portafolio relacionados con el actual según el criterio elegido en el selector "Relacionar por".',
    whatIs: 'Atajo de navegación al final de la página. Mini-cards con folio, actividad, estatus, barra de progreso y arquitecto. Un selector permite elegir el criterio de relación; click navega al detalle de ese proyecto.',
    howCalculated: `Selector **"Relacionar por"** (default: Épica). Filtra \`data\` (excluyendo el proyecto actual) según:
- **Épica**: \`p.epica === project.epica\`.
- **Producto**: \`p.producto === project.producto\`.
- **Cliente**: \`p.aliado === project.aliado\` (ignora "Ninguno").
- **Arquitecto**: comparte al menos un arquitecto (\`splitMulti\`, soporta "Luis, George").
- **Q de entrega**: \`p.cuatrimestre === project.cuatrimestre\`.

Se muestran los primeros 9 matches (orden del Sheet). Si el criterio no arroja resultados, se muestra un estado vacío en vez de ocultar la sección (así el selector sigue accesible).`,
    whyMatters: 'Sin ir a Portafolio y filtrar, saltas entre proyectos relacionados directamente. El selector cambia la lente: "Arquitecto" revela la carga de un arquitecto, "Cliente" agrupa por aliado, "Q de entrega" muestra el cohorte del trimestre. Reutiliza el mismo eje que la Comparativa.',
    sources: [
      { label: 'RelacionadosTab.tsx', href: `${GITHUB_BASE}/src/components/sections/proyecto-detalle/RelacionadosTab.tsx` },
    ],
  },
  {
    id: 'proyecto-pronostico',
    section: 'Detalle de Proyecto',
    sectionSlug: 'proyecto-detalle',
    title: 'Resumen del Pronóstico',
    summary: 'Vista compacta del pronóstico del proyecto (riesgo, fecha, desvío, confianza, escenarios) con enlace al análisis completo en /pronosticos.',
    whatIs: 'La tab "Pronóstico" del detalle muestra un **resumen** del pronóstico calculado por el motor (`forecastEngine`): banner de riesgo + confianza, KPIs (fecha pronóstico, desvío vs plan, probabilidad a tiempo, progreso real vs esperado), escenarios optimista/probable/pesimista y los factores. Para el timeline, what-if y el detalle completo, enlaza a `/pronosticos/[id]`.',
    howCalculated: '`forecastProjects(allProjects, allTareas)` calcula la velocity del equipo y proyecta cada proyecto; se toma el forecast cuyo `project.id` coincide. `riskMeta`/`confidenceMeta` dan el styling. Si no hay forecast o el riesgo es `insufficient-data`, se muestra un estado vacío con el enlace al análisis completo.',
    whyMatters: 'Da el pulso de "¿llega o no?" sin salir del detalle del proyecto, y deja el análisis profundo a la página de pronósticos (opción B: no se duplica la página completa dentro de una tab).',
    sources: [
      { label: 'PronosticoTab.tsx', href: `${GITHUB_BASE}/src/components/sections/proyecto-detalle/PronosticoTab.tsx` },
      { label: 'forecastEngine.ts · forecastProjects', href: `${GITHUB_BASE}/src/utils/forecastEngine.ts#L284-L294` },
    ],
  },

  // ---------------- Roadmap ----------------
  {
    id: 'roadmap-jerarquia',
    section: 'Roadmap',
    sectionSlug: 'roadmap',
    title: 'Jerarquía Q de entrega → Épica → Proyectos',
    summary: 'Vista de dos niveles. Cada nivel agrega progreso promedio, conteo done/total y story points. Épicas colapsables; cuatrimestres ordenables.',
    whatIs: `Estructura jerárquica que agrupa el portafolio en **dos niveles** según los campos \`cuatrimestre\` y \`epica\` de cada proyecto:

- **Nivel 1 (Cuatrimestre)**: encabezado con icono de bandera, nombre del cuatrimestre, contadores y barra de progreso agregado. Representa el horizonte de entrega (e.g. "2026 Q1").
- **Nivel 2 (Épica)**: dentro de cada cuatrimestre, sub-grupos por iniciativa técnica/funcional. Son **colapsables** (chevron a la izquierda) y muestran su propio progreso + conteo + story points.
- **Nivel 3 (Proyectos)**: cuando una épica está expandida, sus proyectos se renderizan como tarjetas (mismo \`ProjectCard\` que en /portafolio).

Proyectos sin cuatrimestre caen en un grupo "Sin cuatrimestre"; sin épica en "Sin épica".`,
    howCalculated: `**Por épica:**
- \`avgProgress = round((Σ projects.progreso / count) × 100)\`
- \`totalPoints = Σ p.puntos\`
- \`doneCount = count(p.estatus === 'Done')\`

**Por cuatrimestre** (suma de épicas):
- \`totalProjects = Σ epic.count\`
- \`avgProgress = round((Σ totalProgress / totalProjects) × 100)\` — promedio sobre proyectos, no sobre épicas (épicas más grandes pesan más)
- \`totalPoints = Σ epic.totalPoints\`
- \`doneCount = Σ epic.doneCount\`

**Orden:**
- Cuatrimestres: ascendente o descendente por nombre, según el toggle "Más antiguo primero / Más reciente primero".
- Épicas dentro de un cuatrimestre: alfabético ascendente.

**Color de barra de progreso** (en ambos niveles): verde si ≥80%, amarillo si ≥40%, rojo si menor.

**Filtro por PM**: cuando hay un PM seleccionado, los grupos se recalculan sobre el subset (un cuatrimestre puede desaparecer si ninguno de sus proyectos es del PM).`,
    whyMatters: 'Ver el portafolio por cuatrimestre te ayuda a comunicar entrega a stakeholders que piensan en horizontes/releases, no en folios individuales. Si un cuatrimestre está al 40% y falta poco para cerrar, hay un problema obvio. Las épicas colapsables permiten enfocar solo en lo que necesitas profundizar sin perder el contexto del cuatrimestre padre.',
    sources: [
      { label: 'RoadmapSection.tsx · roadmap useMemo', href: `${GITHUB_BASE}/src/components/sections/RoadmapSection.tsx#L48-L82` },
      { label: 'ProjectCard.tsx', href: `${GITHUB_BASE}/src/components/ui/ProjectCard.tsx` },
    ],
  },

  // ---------------- Timeline ----------------
  {
    id: 'timeline-gantt',
    section: 'Timeline',
    sectionSlug: 'timeline',
    title: 'Gantt del portafolio',
    summary: 'Barras horizontales por proyecto entre fecha de inicio y fin, con porcentaje de progreso como relleno y línea vertical marcando hoy.',
    whatIs: 'Cada fila representa un proyecto. La **barra** se posiciona horizontalmente entre `fechaInicio` (o `inicioEstimado` como fallback) y `finReal` (o `finEstimado` si todavía está abierto). El **color** viene de `getEstatusColor()`; el **relleno interno** muestra `progreso` (0-100%). Dentro de la barra el orden de lectura es **Estatus > % > Salud** (NAV-84): icono del estatus, porcentaje y el icono de salud con su color de bucket. Si el proyecto venció (`finEstimado < hoy` y no es Done), la barra adopta tinte rojo. La **línea azul vertical** marca el día actual. El rail izquierdo de cada fila tiene **chip de estatus + icono de salud** (ver [timeline-rail-signals]) en lugar del círculo numérico anterior.',
    howCalculated: `Por proyecto:
- \`barDay = (fechaInicio - minDate) / día\` (offset desde el primer día visible)
- \`barDays = max(3, (finReal||finEstimado - fechaInicio) / día)\` (ancho mínimo 3 días)
- \`pct = round(progreso × 100)\` (relleno)
- \`isOverdue = !finReal && finEstimado < hoy && estatus !== 'Done'\`
- \`health = calcHealthScore(p)\` (0-100, score cruzando estatus, salud, progreso esperado vs real, vencimiento)

Rango visible: \`[min(fechaInicio) - 14d, max(finReal||finEstimado) + 21d]\`. Si \`dayWidth = 0\` (modo Ajustar), las posiciones se calculan como porcentaje del total; con zoom fijo se calculan en píxeles absolutos.`,
    whyMatters: 'Es el único lugar donde el portafolio se ve como calendario absoluto: permite detectar choques de fechas, ventanas de capacidad, y proyectos vencidos sin tener que revisar uno por uno. Combinado con el health score en la columna fija, también funciona como semáforo: una fila rojiza significa "vencido o cerca de vencerse".',
    sources: [
      { label: 'TimelineSection.tsx', href: `${GITHUB_BASE}/src/components/sections/TimelineSection.tsx` },
      { label: 'healthScore.ts · calcHealthScore', href: `${GITHUB_BASE}/src/utils/healthScore.ts#L26-L95` },
      { label: 'colors.ts · getEstatusColor', href: `${GITHUB_BASE}/src/utils/colors.ts` },
    ],
  },
  {
    id: 'timeline-rail-signals',
    section: 'Timeline',
    sectionSlug: 'timeline',
    title: 'Chip de estatus + Icono de salud (rail izquierdo)',
    summary: 'Dos signals separados a la izquierda de cada fila — un chip (22px) con el icono del estatus declarado y, a su derecha, el icono de salud calculada con su color de bucket.',
    whatIs: `Reemplazo del círculo numérico anterior (NAV-72; orden de lectura estandarizado en NAV-84: **Estatus | Salud**). En la columna fija del Timeline, antes del título del proyecto, viven **dos signals independientes**:

1. **Chip de estatus** (22×22 px) — color del estatus declarado por el PM, con el icono correspondiente adentro:
   - ✓ Done — emerald
   - ▶ On Track — green
   - 🕒 Upcoming — blue
   - ⏸ On Hold — slate
   - ! At Risk — orange
   - ⊘ Blocked / Critical — red
   - ⚡ Hypercare — amber
   - 🚀 LaunchPhase — violet (fase de lanzamiento previa a Hypercare)
   - ✕ Cancelado — red (terminal; no cuenta para la salud)

2. **Icono de salud** (con color) — icono y color del bucket de \`calcHealthScore.label\`:
   - ★ Excelente (≥85) — verde
   - ↗ Bueno (65-84) — azul
   - − Medio (45-64) — amarillo
   - ↘ Bajo (25-44) — naranja
   - ! Crítico (<25) — rojo

   Al hacer hover, el tooltip muestra el **score numérico** y los **3 factores principales** que lo movieron (cálculo de \`calcHealthScore.factors\`).

**Por qué dos signals separados**: la salud calculada y el estatus reportado son **dimensiones distintas**. Antes el círculo numérico mezclaba ambas (color = bucket de salud, número = score), lo que era ambiguo. Ahora se leen independientemente:
- ¿Cómo lo reportó el PM? → mira el chip.
- ¿Cómo está según el cálculo? → mira el icono de salud.
- Si **disienten** (chip "On Track" + salud crítica), hay un **riesgo no declarado** — el patrón más útil para detectar proyectos donde el reporte no refleja la realidad.`,
    howCalculated: '`health = calcHealthScore(p)` → bucket por `label`. `chipBg/chipText` vienen de `getEstatusColor(p.estatus)`. Iconos resueltos por `estatusIconFor(estatus)` y `healthIconFor(label)` + `healthTextColor(label)` desde `src/utils/healthStatusVisuals.ts` (mapeos centralizados, reusables en otras secciones).',
    whyMatters: 'Cierra el feedback del PM en NAV-72: "el número 39 o 51 no es intuitivo por sí solo". Pasar a iconos hace que la lectura del estado de un proyecto sea instantánea en una pantalla compartida, sin tener que leer cifras. Y separar las dos dimensiones permite usar el Timeline como herramienta de auditoría: las filas donde dot y chip discrepan son las que pide más conversación con el PM responsable.',
    sources: [
      { label: 'TimelineSection.tsx · rail', href: `${GITHUB_BASE}/src/components/sections/TimelineSection.tsx` },
      { label: 'healthStatusVisuals.ts', href: `${GITHUB_BASE}/src/utils/healthStatusVisuals.ts` },
    ],
  },
  {
    id: 'timeline-leyenda',
    section: 'Timeline',
    sectionSlug: 'timeline',
    title: 'Leyenda colapsable',
    summary: 'Bloque expandible debajo del toolbar que explica los chips de estatus y los iconos de salud. Abierto por default la primera vez; persiste la elección del usuario.',
    whatIs: `Tarjeta con dos filas didácticas — primero **Estatus (chip)** con sus 7 etiquetas e iconos correspondientes y debajo **Salud (icono)** con sus 5 buckets (label, range, icono con color) — el orden refleja la jerarquía de lectura estandarizada en NAV-84 (Estatus > % > Salud). Abajo, una nota que explica por qué son dimensiones distintas y cómo leer cuando disienten.

Toggle "📖 Leyenda" en el toolbar (estilo igual a "Incluir terminados" / "Pronóstico visible"). Default \`true\` → cualquier usuario nuevo o existente la ve abierta la primera vez. Se cierra con un click; la elección persiste vía \`usePersistedFilters('timeline')\` server-side.

Atiende explícitamente el punto del PM en NAV-72: "validar si la info puede mostrarse EN la gráfica" — sin esta leyenda, el usuario tendría que ir al glosario para entender el código de color.`,
    howCalculated: 'Estado persistido en `persisted.showLegend` (boolean). Si `false`, el bloque no renderiza. Los datos vienen de `HEALTH_BUCKETS` y `ESTATUS_VISUALS` en `healthStatusVisuals.ts` (mismas constantes que alimentan dot y chip → leyenda nunca queda desincronizada con el render).',
    whyMatters: 'Auto-onboarding del Timeline: la primera vez que abres la página, ves explícitamente qué significa cada color sin tener que consultar fuera. Después, el control persistido respeta tu preferencia. Para PMs/gerentes que usan el Timeline en stand-ups, mantener la leyenda abierta también ayuda a que invitados nuevos en la reunión la entiendan al vuelo.',
    sources: [
      { label: 'TimelineSection.tsx · legend block', href: `${GITHUB_BASE}/src/components/sections/TimelineSection.tsx` },
      { label: 'healthStatusVisuals.ts · HEALTH_BUCKETS + ESTATUS_VISUALS', href: `${GITHUB_BASE}/src/utils/healthStatusVisuals.ts` },
    ],
  },
  {
    id: 'timeline-forecast-overlay',
    section: 'Timeline',
    sectionSlug: 'timeline',
    title: 'Overlay de pronóstico (ghost bar + diamond)',
    summary: 'Capa opcional que dibuja la fecha pronóstico encima de cada barra: un diamante en la fecha estimada por el motor y una zona translúcida cuando hay slippage respecto al plan.',
    whatIs: `Cuando el toggle "Pronóstico visible" está activo, cada proyecto que tenga forecast utilizable (no Done, no \`insufficient-data\`, con \`finEstimado\` definido y sin \`finReal\`) muestra dos overlays:

1. **Ghost bar**: rectángulo translúcido (opacity 18%) con borde punteado superior e inferior, desde \`finEstimado\` hasta \`forecastDate\`. Solo aparece si hay slippage proyectado.
2. **Diamond marker**: rombo 12×12 px en \`forecastDate\`, clickeable para ir a \`/pronosticos/[folio]\`.

El **color** de ambos viene de \`riskMeta(risk)\`: rojo si high, ámbar si medium, verde si low.`,
    howCalculated: `Para cada proyecto:
- \`fc = forecastProjects(data, tareas).forecasts.find(folio)\`
- Visible si: \`showForecast && fc && fc.risk !== 'done' && fc.risk !== 'insufficient-data' && forecastDate && plannedEnd && !finReal\`
- \`fcDay = (forecastDate - minDate) / día\` (posición del diamond)
- Si \`forecastDate > plannedEnd\`:
  - \`ghostDay = (plannedEnd - minDate) / día\`
  - \`ghostDays = (forecastDate - plannedEnd) / día\` (ancho del ghost)`,
    whyMatters: 'Conecta el plan declarado (barra real) con la realidad calculada por el motor (diamond) en la misma línea visual. Un diamond rojo lejos de la barra es un proyecto que va a llegar tarde aunque su `finEstimado` diga lo contrario. Es el único punto del producto donde el slippage se ve como distancia espacial y no como número, lo que hace mucho más fácil priorizar visualmente.',
    sources: [
      { label: 'TimelineSection.tsx · overlay logic', href: `${GITHUB_BASE}/src/components/sections/TimelineSection.tsx#L317-L389` },
      { label: 'forecastEngine.ts · forecastProjects + riskMeta', href: `${GITHUB_BASE}/src/utils/forecastEngine.ts#L282-L320` },
    ],
  },

  // ---------------- Cronograma ----------------
  {
    id: 'cronograma-progreso-tareas',
    section: 'Cronograma',
    sectionSlug: 'cronograma',
    title: 'Progreso de tareas',
    summary: 'Indicador dinámico: completadas / totales / pendientes del subset filtrado, con barra de avance.',
    whatIs: 'Consolida en un solo bloque la posición del cronograma: cuántas tareas existen en el subset visible, cuántas están cerradas (estatus Done) y cuántas siguen abiertas. La barra refleja el % de cierre.',
    howCalculated: `Sobre \`filtered = data.filter(...filtros + búsqueda)\`:
- \`total = filtered.length\`
- \`completadas = count(t con isTareaDone(t.estatus))\`
- \`pendientes = total - completadas\`
- \`pct = Math.round(completadas / total × 100)\` si \`total > 0\``,
    whyMatters: 'Reemplaza a los 4 KPIs antiguos (Total / Completadas / En proceso / Pendientes). Con una sola lectura el PM sabe qué tan cerrado está el subset que tiene en pantalla — el resto del detalle vive en el Kanban abajo.',
    sources: [
      { label: 'CronogramaSection.tsx · progressIndicator', href: `${GITHUB_BASE}/src/components/sections/CronogramaSection.tsx` },
      { label: '/api/tareas.ts', href: `${GITHUB_BASE}/src/pages/api/tareas.ts` },
    ],
  },
  {
    id: 'cronograma-indicador-bloqueadas',
    section: 'Cronograma',
    sectionSlug: 'cronograma',
    title: 'Bloqueadoras / Críticas activas',
    summary: 'Tareas abiertas con prioridad "Bloqueadora" o "Crítica". Se resaltan con borde rojo cuando hay al menos una.',
    whatIs: 'Conteo de tareas que **no** están cerradas (estatus != Done) y cuya `prioridad` indica bloqueo: "Bloqueadora", "Crítica" o "Critica". Lo importante no es solo que estén abiertas, sino que están marcadas como freno del avance.',
    howCalculated: `\`blocked = filtered.filter(t => !isTareaDone(t.estatus) && isBlocker(t))\` donde \`isBlocker\` matchea la prioridad contra "bloqueador" o "crítica/critica".`,
    whyMatters: 'Reemplaza al antiguo KPI "Atrasadas" (basado en salud). El criterio nuevo se basa en **prioridad** y excluye tareas ya cerradas — un blocker que se cerró ya no debe contar. Es la señal directa para escalar.',
    sources: [
      { label: 'CronogramaSection.tsx · blockedIndicator', href: `${GITHUB_BASE}/src/components/sections/CronogramaSection.tsx` },
    ],
  },
  {
    id: 'cronograma-burndown-puntos',
    section: 'Cronograma',
    sectionSlug: 'cronograma',
    title: 'Puntos de historia (Burndown)',
    summary: 'El número grande son los puntos completados (de los totales planeados); el mini-chart contrasta dos series: Restantes (pts por cerrar) vs Ideal (ritmo lineal esperado).',
    whatIs: 'KPI compuesto que reemplaza a "Puntos totales" + "Puntos entregados" + parte del throughput. Muestra cuánto del esfuerzo total ya se cerró y proyecta el ritmo histórico como burndown.',
    howCalculated: `\`totalPts = Σ t.puntos\` sobre \`filtered\`.
\`donePts = Σ t.puntos\` de tareas con \`isTareaDone(estatus)\`.
\`pct = Math.round(donePts / totalPts × 100)\` si \`totalPts > 0\`.

**Burndown (últimas 8 semanas que tuvieron cierres):**
- Se agrupan las tareas Done por la fecha del **lunes** de su semana (lunes-anclado, no ISO week estricto), usando \`finReal\`.
- Las semanas sin cierres **no** aparecen en el eje X.
- Para cada semana \`i\` (donde \`i=0\` es la primera del subset):
  - \`restantes_i = max(0, totalPts − Σ puntos entregados de las semanas 0…i)\` — pendientes **al cierre** de esa semana.
  - \`ideal_i = max(0, totalPts − stepIdeal × (i+1))\` con \`stepIdeal = totalPts / N\` (N = cantidad de semanas en serie).
- La etiqueta del eje X es el lunes formateado \`"dd mmm"\`. El valor del tooltip corresponde al **final** de esa semana.
- La gráfica solo se renderiza si \`series.length ≥ 2\`; si no, se muestra el aviso "Burndown disponible con ≥2 semanas de cierres".`,
    whyMatters: 'El burndown convierte el % en una historia: una pendiente más empinada que la ideal indica adelanto, menos empinada o plana indica rezago. Es la base visual para decidir si el sprint llega o no. Limitación actual: la línea ideal se calcula sobre las mismas N semanas con cierres, no contra la meta oficial del sprint — esto cambiará cuando se cablee la hoja `sprint` del Excel.',
    sources: [
      { label: 'CronogramaSection.tsx · burndown', href: `${GITHUB_BASE}/src/components/sections/CronogramaSection.tsx` },
    ],
  },
  {
    id: 'cronograma-carga-persona',
    section: 'Cronograma',
    sectionSlug: 'cronograma',
    title: 'Carga por Persona',
    summary: 'Gráfica de dona con el conteo de tareas por asignado del subset filtrado. Leyenda con `nombre (conteo)` debajo.',
    whatIs: 'Distribución del backlog entre los miembros del equipo. Se construye a partir del campo `asignado` (apodo de la hoja); el id resuelto (`asignadoId`, vía equipoResolver) permite cruzar con proyectos sin fuzzy matching.',
    howCalculated: '`byAsignado = Map<asignado, count>` sobre `filtered`, descartando `asignado` vacío, convertido a `[{ name, value }]` y ordenado descendente por conteo. Cada segmento de la dona usa un color cíclico de la paleta `COLORS`.',
    whyMatters: 'Detecta desbalance: si una persona ocupa un segmento mucho mayor que el resto, hay riesgo de cuello de botella. Importante: este chart usa conteo crudo de tareas, no story points — para distribución por esfuerzo real consulta /distribucion.',
    sources: [
      { label: 'CronogramaSection.tsx · byAsignado', href: `${GITHUB_BASE}/src/components/sections/CronogramaSection.tsx` },
    ],
  },
  {
    id: 'cronograma-progreso-funcionalidad',
    section: 'Cronograma',
    sectionSlug: 'cronograma',
    title: 'Progreso por Épica',
    summary: 'Barras apiladas (verde = completadas, gris = pendientes) por épica, ordenadas por tamaño total descendente.',
    whatIs: 'Vista del avance de cada épica. Cada épica agrega sus tareas y se descompone en `completadas` vs `pendientes`.',
    howCalculated: `Por épica:
- \`total = count(tareas)\`
- \`completadas = count(tareas con isTareaDone(estatus))\`
- \`pendientes = total - completadas\`

Orden: descendente por \`total\`.`,
    whyMatters: 'Permite identificar épicas trabadas (mucho total, pocas completadas → barra mayormente gris) y épicas casi terminadas (barra mayormente verde). Útil para priorizar empuje final antes de un release.',
    sources: [
      { label: 'CronogramaSection.tsx · byFuncionalidad', href: `${GITHUB_BASE}/src/components/sections/CronogramaSection.tsx#L112-L124` },
    ],
  },
  {
    id: 'cronograma-throughput-semanal',
    section: 'Cronograma',
    sectionSlug: 'cronograma',
    title: 'Throughput Semanal',
    summary: 'Tareas y puntos completados por semana (últimas 12). Bar = tareas, línea = puntos. Usa la fecha `finReal` agrupada por semana ISO.',
    whatIs: 'Velocity histórica real del equipo derivada de las tareas que efectivamente se cerraron. Es el mismo concepto que alimenta `computeTeamVelocity()` del motor de pronóstico, pero visualizado como serie temporal.',
    howCalculated: `Para cada tarea con \`isTareaDone(estatus)\` y \`finReal\` válido:
- \`monday = finReal - ((d.getDay() + 6) % 7) días\` (lunes de su semana ISO)
- \`weekMap[monday].tareas += 1\`
- \`weekMap[monday].puntos += t.puntos ?? 0\`

Se ordenan ascendente por semana y se conservan las últimas 12. Las fechas vienen en formato dd/mm/yyyy y se convierten a ISO en \`/api/tareas\`.`,
    whyMatters: 'Es la base empírica para todo pronóstico — un equipo con throughput estable de 12 puntos/semana terminará el backlog visible aproximadamente en `puntosTotales / 12` semanas. Drops bruscos apuntan a períodos con bloqueos, vacaciones o re-planeación.',
    sources: [
      { label: 'CronogramaSection.tsx · throughput', href: `${GITHUB_BASE}/src/components/sections/CronogramaSection.tsx#L136-L164` },
      { label: 'forecastEngine.ts · computeTeamVelocity', href: `${GITHUB_BASE}/src/utils/forecastEngine.ts#L71-L100` },
    ],
  },
  {
    id: 'cronograma-precision-estimacion',
    section: 'Cronograma',
    sectionSlug: 'cronograma',
    title: 'Precisión de Estimación',
    summary: 'Compara `tracked` (real) vs `puntos` (estimado) en tareas con ambos > 0. Clasifica en acertadas (±20%), sub-estimadas (>1.2×) y sobre-estimadas (<0.8×).',
    whatIs: 'Contrasta los puntos **estimados** (`puntos`) contra el tiempo **real** traqueado (`tracked`, en puntos) de cada actividad. Permite calibrar el sesgo de estimación del equipo.',
    howCalculated: `Sólo tareas con \`puntos > 0\` Y \`tracked > 0\`. Por tarea:
- \`ratio = tracked / puntos\`
- Acertada si \`0.8 ≤ ratio ≤ 1.2\`
- Sub-estimada si \`ratio > 1.2\` (tomó más tiempo del estimado)
- Sobre-estimada si \`ratio < 0.8\` (tomó menos tiempo del estimado)

**Ratio global:** \`globalRatio = Σ tracked / Σ puntos\`. Color: verde dentro de [0.8, 1.2], rojo si >1.2, azul si <0.8.`,
    whyMatters: 'Conocer el sesgo permite corregir estimaciones futuras: si el equipo sistemáticamente subestima (ratio >1.2), aplicar un factor inflador al planear. Este sesgo es exactamente el que `forecastEngine` aplica al calcular fechas P50.',
    sources: [
      { label: 'CronogramaSection.tsx · accuracy', href: `${GITHUB_BASE}/src/components/sections/CronogramaSection.tsx#L167-L193` },
      { label: 'forecastEngine.ts · computeEstimationBias', href: `${GITHUB_BASE}/src/utils/forecastEngine.ts#L102-L117` },
    ],
  },
  {
    id: 'cronograma-lista-tareas',
    section: 'Cronograma',
    sectionSlug: 'cronograma',
    title: 'Tareas / Historias (Kanban)',
    summary: 'Tablero con scroll horizontal. 4 modos de agrupación: Estado, Salud, Asignado, o Estado × Asignado (matriz de swim-lanes). Orden interno por "Fecha est." o "Prioridad".',
    whatIs: 'Vista de columnas que reemplaza al grid paginado. En los 3 modos de eje único (Estado / Salud / Asignado) cada columna es un grupo con sus cards apiladas. En el modo **Estado × Asignado** se renderiza una matriz: cada fila es una persona, cada columna un estado, y la intersección contiene las cards de esa persona en ese estado. Las cards mantienen toda la información operativa (fase, sprint, épica, folio, tipo, prioridad, puntos, tracked, fecha estimada).',
    howCalculated: `**Agrupación** controlada por el selector "Agrupar":
- \`estatus\` (default): agrupa por etiqueta canónica (Pending / In Progress / TL Review / Testing / Change Request / Done / Cancelada).
- \`salud\` y \`asignado\`: agrupa por el valor crudo de cada tarea.
- \`matriz\` (**Estado × Asignado**): \`Map<asignado, Map<estatus, tareas[]>>\`. Sólo aparecen las columnas de estatus que tienen al menos una tarea en el subset. Filas ordenadas por carga total descendente; "Sin asignar" siempre al final.

**Orden dentro de la columna/celda** controlado por "Ordenar":
- \`fecha\` (default): por \`finEstimado\` ascendente, fallback a \`inicio\`.
- \`prioridad\`: por peso (Bloqueadora → Crítica → Mayor → Media → Menor → Baja), desempate por fecha.

**Orden de columnas**: cuando se agrupa por \`estatus\` o \`matriz\` se usa el orden canónico (\`STATUS_GROUP_ORDER\`); para salud/asignado se ordenan por tamaño descendente.

**Layout matriz**: CSS grid con \`gridTemplateColumns: "12rem repeat(N, 16rem)"\` (rotulo de persona sticky a la izquierda + N columnas de estado). Header row con totales por columna; cada celda con altura mínima para que la cuadrícula respire aunque esté vacía.`,
    whyMatters: 'El Kanban hace explícito el flujo: dónde se acumulan las tareas (cuello de botella visible) y permite re-agrupar sin re-filtrar. El modo **Estado × Asignado** es la lectura para reuniones de capacidad — de un vistazo se ve quién tiene mucho In Progress, quién tiene pendientes acumulados, y quién está libre. La columna sticky del nombre permite hacer scroll horizontal sin perder de vista a la persona.',
    sources: [
      { label: 'CronogramaSection.tsx · kanbanColumns + matrixData', href: `${GITHUB_BASE}/src/components/sections/CronogramaSection.tsx` },
    ],
  },

  // ---------------- Detalle de Tarea ----------------
  {
    id: 'tarea-detalle-detalles',
    section: 'Detalle de Tarea',
    sectionSlug: 'tarea-detalle',
    title: 'Detalles de la tarea',
    summary: 'Contexto de la actividad: proyecto padre, persona asignada, rol, fase, épica, OU, dificultad y prioridad.',
    whatIs: 'Bloque que reúne los atributos descriptivos de una actividad de la hoja `actividades`. El **proyecto** enlaza a su detalle (cruzando `proyectoId` con `ProjectRecord.id`) y el **asignado** al perfil de la persona (resuelto a `equipo.id`).',
    howCalculated: 'Lectura directa de los campos de la actividad en `/api/tareas`. La tarea se localiza por su `id` sintético (hash estable de `proyectoId|folio|nombre|asignado|sprint` generado en el endpoint, porque la hoja no trae id propio). El proyecto padre = `proyectos.find(p => p.id === tarea.proyectoId)`.',
    whyMatters: 'Es el "último kilómetro" del seguimiento: cuando algo está atrasado, aquí ves de un vistazo quién la tiene, en qué fase está y a qué proyecto pertenece, con enlaces para navegar al contexto completo.',
    sources: [
      { label: 'TareaDetailSection.tsx', href: `${GITHUB_BASE}/src/components/sections/TareaDetailSection.tsx` },
      { label: '/api/tareas.ts · makeTareaId', href: `${GITHUB_BASE}/src/pages/api/tareas.ts` },
    ],
  },
  {
    id: 'tarea-detalle-fechas',
    section: 'Detalle de Tarea',
    sectionSlug: 'tarea-detalle',
    title: 'Fechas y estimación',
    summary: 'Registro, inicio, fin estimado y fin real de la actividad; arriba, los KPIs de puntos estimados vs tiempo real (tracked) y avance.',
    whatIs: 'Bloque temporal de la actividad. Junto con los KPIs de la cabecera permite contrastar lo **estimado** (`puntos`) contra lo **real** (`tracked`) y ver el `avance` reportado.',
    howCalculated: 'Fechas parseadas a ISO en `/api/tareas` (formato dd/mm/yyyy de la hoja). **Ratio real/estimado** = `tracked / puntos` (sólo si ambos > 0): verde si 0.8–1.2, rojo si >1.2 (tardó más), azul si <0.8 (tardó menos). **Avance** = campo `avance` (0..1) × 100.',
    whyMatters: 'El ratio real/estimado a nivel tarea es la materia prima del sesgo de estimación que el motor de pronóstico agrega. Ver una tarea muy desviada explica por qué su proyecto puede estar resbalando.',
    sources: [
      { label: 'TareaDetailSection.tsx', href: `${GITHUB_BASE}/src/components/sections/TareaDetailSection.tsx` },
    ],
  },

  // ---------------- Pronósticos ----------------
  {
    id: 'pronosticos-kpi-total',
    section: 'Pronósticos',
    sectionSlug: 'pronosticos',
    title: 'Proyectos proyectados',
    summary: 'Conteo de proyectos activos para los que el motor genera un pronóstico (excluye Done).',
    whatIs: 'Universo de proyectos sobre los que aplica el motor de pronóstico en esta vista. Se construye sobre `forecastProjects()` filtrando los que ya están en estado `done`.',
    howCalculated: "`forecasts.filter(f => f.risk !== 'done').length`. Los proyectos sin `fechaInicio` o `progreso > 0` aparecen con risk `insufficient-data` pero sí cuentan aquí.",
    whyMatters: 'Denominador implícito del resto de KPIs de la página. Si este número cambia de semana a semana sin proyectos nuevos, revisa si algún proyecto activo perdió fechaInicio o progreso.',
    sources: [
      { label: 'PronosticosSection.tsx', href: `${GITHUB_BASE}/src/components/sections/PronosticosSection.tsx#L144-L162` },
      { label: 'forecastEngine.ts · forecastProjects', href: `${GITHUB_BASE}/src/utils/forecastEngine.ts#L282-L292` },
    ],
  },
  {
    id: 'pronosticos-kpi-on-track',
    section: 'Pronósticos',
    sectionSlug: 'pronosticos',
    title: 'En tiempo',
    summary: 'Proyectos cuyo pronóstico cae dentro de ±3 días del fin estimado, sin gap severo de progreso.',
    whatIs: 'Subconjunto de los proyectos proyectados cuyo `risk = on-track`. La etiqueta sale del Método 3 del motor.',
    howCalculated: "`activeForecasts.filter(f => f.risk === 'on-track').length`. La etiqueta `on-track` se asigna cuando `|slippageDays| ≤ 3` y el gap de progreso esperado vs real no excede 30%.",
    whyMatters: 'Indica salud del portafolio en su métrica más optimista — proyectos que probablemente cumplirán la fecha comprometida. Caída sostenida es señal temprana de erosión de capacidad.',
    sources: [
      { label: 'PronosticosSection.tsx', href: `${GITHUB_BASE}/src/components/sections/PronosticosSection.tsx#L149-L162` },
      { label: 'forecastEngine.ts · forecastProject', href: `${GITHUB_BASE}/src/utils/forecastEngine.ts#L148-L281` },
    ],
  },
  {
    id: 'pronosticos-kpi-slipping',
    section: 'Pronósticos',
    sectionSlug: 'pronosticos',
    title: 'Deslizando',
    summary: 'Proyectos con desvío proyectado de 4 a 14 días, o con gap de progreso > 30%.',
    whatIs: 'Subconjunto de los proyectos proyectados con `risk = slipping`. Estado intermedio: ya no van en tiempo, pero todavía no son crisis.',
    howCalculated: "`activeForecasts.filter(f => f.risk === 'slipping').length`. Se asigna cuando el desvío proyectado cae en 4–14 días, o cuando el riesgo era `on-track` pero el gap de progreso esperado supera 30%.",
    whyMatters: 'Cola de trabajo recuperable. Estos proyectos suelen ser los más rentables de intervenir: una sesión de unblocking o reasignación de capacidad los devuelve a tiempo.',
    sources: [
      { label: 'PronosticosSection.tsx', href: `${GITHUB_BASE}/src/components/sections/PronosticosSection.tsx#L149-L162` },
    ],
  },
  {
    id: 'pronosticos-kpi-at-risk',
    section: 'Pronósticos',
    sectionSlug: 'pronosticos',
    title: 'En riesgo',
    summary: 'Proyectos con desvío proyectado > 14 días, gap de progreso > 50%, o estancados (progreso 0 con inicio registrado).',
    whatIs: 'Suma de los proyectos con `risk = at-risk` o `risk = stalled`. Es la categoría más severa: requieren intervención antes de que se vuelvan deuda imposible.',
    howCalculated: "`activeForecasts.filter(f => f.risk === 'at-risk' || f.risk === 'stalled').length`. `at-risk` por desvío > 14d o gap > 50%; `stalled` cuando el proyecto ya inició pero `progreso = 0`.",
    whyMatters: 'Cola roja del portafolio: cada uno de estos es un compromiso con cliente que se va a romper si no hay intervención esta semana.',
    sources: [
      { label: 'PronosticosSection.tsx', href: `${GITHUB_BASE}/src/components/sections/PronosticosSection.tsx#L149-L162` },
    ],
  },
  {
    id: 'pronosticos-kpi-avg-slippage',
    section: 'Pronósticos',
    sectionSlug: 'pronosticos',
    title: 'Desvío promedio',
    summary: 'Promedio en días entre fecha pronóstico y fin estimado de los proyectos activos. Positivo = tarde.',
    whatIs: 'Indicador macro del retraso esperado del portafolio. Considera todos los proyectos con `slippageDays` no nulo (los `insufficient-data` quedan fuera).',
    howCalculated: '`Math.round(Σ slippageDays / count)` sobre proyectos activos con `slippageDays !== null`. `slippageDays = forecastDate − finEstimado` (días enteros). Color: rojo si > 7, ámbar si > 0, verde si ≤ 0.',
    whyMatters: 'Una sola cifra que resume si todo el portafolio se está deslizando. Si la cifra es +20d, el portafolio está sistemáticamente atrasado y conviene comparar contra el baseline histórico para saber si es noticia o ruido normal.',
    sources: [
      { label: 'PronosticosSection.tsx', href: `${GITHUB_BASE}/src/components/sections/PronosticosSection.tsx#L154-L162` },
    ],
  },
  {
    id: 'pronosticos-kpi-stale',
    section: 'Pronósticos',
    sectionSlug: 'pronosticos',
    title: 'Datos stale',
    summary: 'Proyectos cuyo campo `progreso` no se ha movido en al menos 14 días (medido contra snapshots semanales).',
    whatIs: 'Conteo de proyectos detectados como "datos viejos" por `computeStaleness()`. Compara el progreso actual contra snapshots previos.',
    howCalculated: '`computeStaleness(projects, snapshots)` compara cada proyecto contra el snapshot más reciente y marca stale si `progreso` no cambió en ≥ 14 días.',
    whyMatters: 'El pronóstico es solo tan bueno como sus inputs: un proyecto con progreso congelado distorsiona la tasa diaria y alarga artificialmente el pronóstico.',
    sources: [
      { label: 'PronosticosSection.tsx', href: `${GITHUB_BASE}/src/components/sections/PronosticosSection.tsx#L125-L129` },
      { label: 'stale.ts · computeStaleness', href: `${GITHUB_BASE}/src/utils/stale.ts` },
    ],
  },
  {
    id: 'pronosticos-proyectos-legend',
    section: 'Pronósticos',
    sectionSlug: 'pronosticos',
    title: 'Cómo leer las tarjetas',
    summary: 'Glosario rápido de los tres elementos clave de cada ForecastCard: etiqueta de Riesgo, valor de Desvío y banda optimista–pesimista.',
    whatIs: 'Bloque informativo que define los conceptos visuales mostrados en cada tarjeta de pronóstico: la etiqueta categórica de riesgo, la cifra de días de desvío y la banda de incertidumbre.',
    howCalculated: 'Riesgo: etiqueta de Método 3. Desvío: `forecastDate − finEstimado` en días. Banda: `forecastDate ± (díasRestantes × spread)`, con `spread = clamp(CV, 15%, 60%)`.',
    whyMatters: 'Sin contexto, una tarjeta con "+12d / banda 28 días" es opaca. Esta leyenda hace evidente que la etiqueta y el desvío miden cosas distintas (categórico vs cuantitativo) y que la banda no es decorativa.',
    sources: [
      { label: 'PronosticosSection.tsx', href: `${GITHUB_BASE}/src/components/sections/PronosticosSection.tsx#L308-L324` },
    ],
  },
  {
    id: 'pronosticos-proyectos-cards',
    section: 'Pronósticos',
    sectionSlug: 'pronosticos',
    title: 'Pronósticos por proyecto',
    summary: 'Grid paginado de tarjetas con fecha pronóstico, banda optimista–pesimista, riesgo y desvío de cada proyecto activo.',
    whatIs: 'Lista paginada (12 por página) de `ForecastCard` por proyecto activo. Cada tarjeta sintetiza el resultado de `forecastProject()`: fecha pronóstico, banda, riesgo, desvío, probabilidad y badge de stale si aplica.',
    howCalculated: 'Se construye desde `forecastProjects(projects, tareas)` que recorre cada proyecto y calcula `forecastProject()`. Filtros (riesgo / PM / hito) se aplican antes de ordenar por `risk`, `slippage` o `forecast`.',
    whyMatters: 'Es la vista táctica del motor: aterriza el modelo en cada folio. Da click a una tarjeta para abrir el detalle con escenarios y panel what-if. Si una tarjeta dice "?", revisa que el proyecto tenga `fechaInicio` y `progreso > 0`.',
    sources: [
      { label: 'PronosticosSection.tsx', href: `${GITHUB_BASE}/src/components/sections/PronosticosSection.tsx#L361-L398` },
      { label: 'ForecastCard.tsx', href: `${GITHUB_BASE}/src/components/ui/ForecastCard.tsx` },
    ],
  },
  {
    id: 'pronosticos-planeacion-anomalies',
    section: 'Pronósticos',
    sectionSlug: 'pronosticos',
    title: 'Anomalías de ritmo',
    summary: 'Proyectos cuyo ritmo reciente difiere significativamente del baseline propio: slowdown, stall o acceleration.',
    whatIs: 'Detección de cambios abruptos en el ritmo de un proyecto comparando los últimos snapshots contra su tasa histórica. Implementado en `detectAnomalies()`.',
    howCalculated: '`detectAnomalies(projects, snapshots)` para cada proyecto: compara la tasa diaria reciente (últimos 1-2 snapshots) contra la baseline propia (resto de snapshots) y clasifica en `slowdown`, `stall` o `acceleration`. Requiere al menos 3 snapshots.',
    whyMatters: 'Un proyecto puede estar `on-track` en el pronóstico pero haber frenado bruscamente esta semana — el motor lineal no detecta cambios de ritmo recientes hasta que llevan varias semanas. Esta señal anticipa el problema antes de que se vuelva slippage acumulado.',
    sources: [
      { label: 'PronosticosSection.tsx', href: `${GITHUB_BASE}/src/components/sections/PronosticosSection.tsx#L403-L419` },
      { label: 'anomalies.ts · detectAnomalies', href: `${GITHUB_BASE}/src/utils/anomalies.ts` },
    ],
  },
  {
    id: 'pronosticos-planeacion-slippage-cost',
    section: 'Pronósticos',
    sectionSlug: 'pronosticos',
    title: 'Costo proyectado de desvíos',
    summary: 'Traducción de los desvíos en días a dinero, usando el costo prorrateado del equipo asignado a cada proyecto.',
    whatIs: 'Tarjeta agregada que multiplica los días de desvío positivo por el costo diario del equipo asignado a cada proyecto, y suma el portafolio. Es el Método 11.',
    howCalculated: 'Por proyecto con `slippageDays > 0`: `costoDiario = estimatedMonthlyCost / 30`, `costoAdicional = costoDiario × slippageDays`. Agregado: `totalImpacto = Σ costoAdicional`, `%Mensual = totalImpacto / Σ costosMensuales`.',
    whyMatters: 'Los PMs razonan en días; los directivos en dinero. Esta cifra convierte "5 proyectos se están deslizando 2 semanas" en "$XXXk de costo adicional proyectado", lo cual cambia totalmente la prioridad de las intervenciones.',
    sources: [
      { label: 'PronosticosSection.tsx', href: `${GITHUB_BASE}/src/components/sections/PronosticosSection.tsx#L421-L423` },
      { label: 'forecastEngine.ts · computeSlippageCostImpact', href: `${GITHUB_BASE}/src/utils/forecastEngine.ts#L731` },
    ],
  },
  {
    id: 'pronosticos-planeacion-capacity-horizons',
    section: 'Pronósticos',
    sectionSlug: 'pronosticos',
    title: 'Capacidad del equipo (4 / 8 / 12 sem)',
    summary: 'Oferta (velocity × semanas) vs demanda (carga restante prorrateada al horizonte) para evaluar holgura/saturación.',
    whatIs: 'Tres tarjetas (4, 8 y 12 semanas) que muestran utilización del equipo en cada horizonte: holgura, sano, saturado o sobrecarga. Es el Método 9.',
    howCalculated: 'Para cada horizonte H: `supply = velocity.meanPoints × H`. `demand = Σ por proyecto activo: remaining × min(1, H×7 / daysRemainingForecast)`. `utilización = demand / supply`. Buckets: <70% holgura, 70-95% sano, 95-115% saturado, >115% sobrecarga.',
    whyMatters: 'Responde la pregunta estratégica "¿podemos tomar un proyecto más este trimestre?". La demanda se prorratea al horizonte para no inflar artificialmente cargas distantes. Útil al decidir qué NO comprometer.',
    sources: [
      { label: 'PronosticosSection.tsx', href: `${GITHUB_BASE}/src/components/sections/PronosticosSection.tsx#L425-L438` },
      { label: 'forecastEngine.ts · computeCapacityProjection', href: `${GITHUB_BASE}/src/utils/forecastEngine.ts#L599` },
    ],
  },
  {
    id: 'pronosticos-planeacion-hitos',
    section: 'Pronósticos',
    sectionSlug: 'pronosticos',
    title: 'Cierre por cuatrimestre',
    summary: 'Agregación del pronóstico más tardío de cada cuatrimestre: cuándo cierra el cuatrimestre completo y cuál es su peor riesgo.',
    whatIs: 'Tarjetas por cuatrimestre mostrando fecha de cierre proyectada, último plan, desvío agregado, progreso promedio y peor riesgo. Es el Método 8.',
    howCalculated: 'Por cuatrimestre: `cierreProyectado = max(forecastDate)` entre proyectos activos del grupo, `ultimoPlan = max(finEstimado)`, `desvíoAgregado = cierreProyectado − ultimoPlan`, `progresoPromedio = media(progreso)`, `peorRiesgo = worstRiskOf(forecasts del grupo)`.',
    whyMatters: 'A los stakeholders les importa cuándo cierra "2026 Q1 completo", no el folio individual. Un cuatrimestre cierra cuando su último proyecto termina, así que no sirve promediar fechas: hay que tomar el máximo.',
    sources: [
      { label: 'PronosticosSection.tsx', href: `${GITHUB_BASE}/src/components/sections/PronosticosSection.tsx#L440-L460` },
      { label: 'forecastEngine.ts · aggregateByHito', href: `${GITHUB_BASE}/src/utils/forecastEngine.ts#L524` },
    ],
  },
  {
    id: 'pronosticos-planeacion-critical-dates',
    section: 'Pronósticos',
    sectionSlug: 'pronosticos',
    title: 'Próximas fechas críticas',
    summary: 'Entregas proyectadas agrupadas en ventanas de 30 / 60 / 90 días, ordenadas cronológicamente.',
    whatIs: 'Lista de proyectos cuyo `forecastDate` cae en los próximos 30, 60 o 90 días. Es el Método 10.',
    howCalculated: 'Para cada proyecto activo: `daysFromNow = forecastDate − hoy`. Asignación a ventanas (0-30, 31-60, 61-90). Orden cronológico (más próximo primero). Valores negativos (vencidos) aparecen en la ventana más próxima.',
    whyMatters: 'Operativiza el pronóstico para el día a día del PM: lo de 30 días entra a 1:1, lo de 60 a planning, lo de 90 a roadmap. Los vencidos suben al inicio para priorizar.',
    sources: [
      { label: 'PronosticosSection.tsx', href: `${GITHUB_BASE}/src/components/sections/PronosticosSection.tsx#L462-L472` },
      { label: 'forecastEngine.ts · computeCriticalDates', href: `${GITHUB_BASE}/src/utils/forecastEngine.ts#L669-L702` },
    ],
  },
  {
    id: 'pronosticos-dependencias-analisis',
    section: 'Pronósticos',
    sectionSlug: 'pronosticos',
    title: 'Análisis de dependencias',
    summary: 'Proyectos con campo `requiereDe` poblado y la cascada de bloqueadores no resueltos que afecta su inicio efectivo. Los chunks que apuntan a personas se resuelven contra el registro `equipo`.',
    whatIs: 'Tarjetas de dependencia: por cada proyecto con `requiereDe` no vacío, se hace matching best-effort contra otros proyectos por folio o nombre. Si el chunk no resuelve a proyecto pero sí a una persona del registro `equipo` (apodo o nombre), la tarjeta muestra su foto y nombre canónico con link a `/persona/[id]` — antes aparecía como `"texto crudo"` con badge **No identificado**. Si los bloqueadores no están Done, el inicio efectivo del dependiente se proyecta a la fecha de cierre del bloqueador más tardío.',
    howCalculated: '`analyzeDependencies(projects, forecastByFolio, equipoLookup?)` parsea `requiereDe` con un splitter multi-separador (coma, slash, salto de línea, etc.), normaliza cada token y prueba en orden: (1) folio exacto, (2) folio substring, (3) actividad substring (≥ 6 chars), (4) — NAV-76 — `resolveId(chunk, equipo.members)` contra el registro `equipo` (alias curado → nickname exacto → fullName exacto → fuzzy único). El chunk resuelto a persona expone `person: { id, name, image }` y badge **Responsable**.',
    whyMatters: 'Permite detectar bloqueadores antes de que generen slippage: un proyecto "On Track" en su pronóstico individual puede estar condenado si depende de otro que aún no inicia. La pestaña convierte el campo libre `requiereDe` en un grafo accionable, y al identificar a la persona responsable detrás del bloqueador la acción de seguimiento queda a un click de distancia.',
    sources: [
      { label: 'PronosticosSection.tsx', href: `${GITHUB_BASE}/src/components/sections/PronosticosSection.tsx#L476-L506` },
      { label: 'dependencies.ts · analyzeDependencies', href: `${GITHUB_BASE}/src/utils/dependencies.ts` },
      { label: 'equipoMatch.ts · resolveId', href: `${GITHUB_BASE}/src/lib/equipoMatch.ts#L55-L74` },
      { label: 'DependencyCard.tsx', href: `${GITHUB_BASE}/src/components/ui/DependencyCard.tsx` },
    ],
  },
  {
    id: 'pronosticos-personas-capacidad',
    section: 'Pronósticos',
    sectionSlug: 'pronosticos',
    title: 'Capacidad por persona',
    summary: 'Velocity individual (puntos/sem) vs carga asignada pendiente, con proyección de cuántas semanas tardará en liquidarla.',
    whatIs: 'Tarjetas por persona con asignaciones activas. Muestra velocity histórica (últimas 8 sem), puntos pendientes y semanas estimadas para liquidar al ritmo actual.',
    howCalculated: '`computePersonCapacity(tareas, windowWeeks=8)`. Por persona: `velocityPersona = puntosCompletados / semanasObservadas`, `puntosPendientes = Σ puntos de tareas no completadas`, `semanasParaLiquidar = puntosPendientes / velocityPersona`, `fechaLibre = hoy + semanasParaLiquidar × 7`.',
    whyMatters: 'Permite ver quién está sobrecargado antes de que se vuelva cuello de botella. El fuzzy matching bidireccional de nombres es crítico aquí: apodos en Projects vs nombres completos en Cronograma deben mapearse para que el cálculo no quede en cero.',
    sources: [
      { label: 'PronosticosSection.tsx', href: `${GITHUB_BASE}/src/components/sections/PronosticosSection.tsx#L505-L559` },
      { label: 'forecastEngine.ts · computePersonCapacity', href: `${GITHUB_BASE}/src/utils/forecastEngine.ts#L402` },
    ],
  },
  {
    id: 'pronosticos-personas-cursos',
    section: 'Pronósticos',
    sectionSlug: 'pronosticos',
    title: 'Finalización de cursos',
    summary: 'Proyección por persona de cuándo terminará sus cursos, basada en la velocidad de progreso derivada de snapshots semanales.',
    whatIs: 'Tarjetas por colaborador con proyección de fecha de finalización de los cursos asignados. Es el Método 12.',
    howCalculated: '`computeCourseForecasts(cursos, snapshots)`. Por colaborador con al menos un snapshot: `ritmo = (progresoActual − snapshotMasViejo.progreso) / semanas`, `semanasRestantes = (100 − progresoActual) / ritmo`, `fechaFinal = hoy + semanasRestantes × 7`. Requiere mínimo 2 semanas de snapshots.',
    whyMatters: 'La hoja de Cursos no tiene fechas, así que no se puede derivar ritmo de ella sola. Los snapshots semanales proveen la dimensión temporal faltante. Es la forma honesta de proyectar: esperar a tener datos en lugar de inventarlos.',
    sources: [
      { label: 'PronosticosSection.tsx', href: `${GITHUB_BASE}/src/components/sections/PronosticosSection.tsx#L561-L590` },
      { label: 'courseForecast.ts · computeCourseForecasts', href: `${GITHUB_BASE}/src/utils/courseForecast.ts` },
    ],
  },
  {
    id: 'pronosticos-contexto-backtest',
    section: 'Pronósticos',
    sectionSlug: 'pronosticos',
    title: 'Backtesting del motor',
    summary: 'Mide qué tan bien predijo el motor en el pasado, comparando predicciones reconstruidas contra `finReal` en proyectos Done.',
    whatIs: 'Tarjeta con MAE, sesgo medio y % dentro de ±7d / ±14d. Es la auto-verificación del motor sobre datos reales. Es el Método 13.',
    howCalculated: 'Por cada proyecto en Done con `finReal`: encuentra snapshot con `progreso ∈ [20%, 95%]`, recalcula `prediccion = snapshotDate + (1 − progresoSnapshot) / ritmo`, `error = prediccion − finReal`. Reporta MAE, sesgo medio, % aciertos en ±7d y ±14d.',
    whyMatters: 'Un método sin forma de verificarse es fe. El backtest hace al motor auditable: si las predicciones erran sistemáticamente, lo sabemos. Si el sesgo es consistente, podemos calibrarlo. Requiere snapshots históricos para funcionar.',
    sources: [
      { label: 'PronosticosSection.tsx', href: `${GITHUB_BASE}/src/components/sections/PronosticosSection.tsx#L594-L607` },
      { label: 'backtest.ts · runBacktest', href: `${GITHUB_BASE}/src/utils/backtest.ts` },
    ],
  },
  {
    id: 'pronosticos-contexto-snapshots',
    section: 'Pronósticos',
    sectionSlug: 'pronosticos',
    title: 'Estado de snapshots',
    summary: 'Inventario del histórico semanal acumulado: cuántas semanas, primer y último snapshot, cuántos proyectos y cursos.',
    whatIs: 'Tarjeta con el estado de la persistencia semanal (localStorage `pn-weekly-snapshots` + sync con Google Sheets). Incluye acciones para capturar manualmente o forzar sync.',
    howCalculated: '`snapshotStats(snapshots)` calcula: `weeks`, `firstWeek` / `lastWeek` (ISO week keys), `projectsTracked` (folios distintos vistos), `cursosTracked` (colaboradores distintos). Los snapshots se construyen vía `useSnapshotCapture()` con guard de 7 días.',
    whyMatters: 'Casi todo el pronóstico (anomalías, stale, cursos, backtest) depende de snapshots históricos. Si esta cifra es 0 o 1, varias pestañas estarán vacías. Aquí también se puede disparar la captura manual.',
    sources: [
      { label: 'PronosticosSection.tsx', href: `${GITHUB_BASE}/src/components/sections/PronosticosSection.tsx#L598-L607` },
      { label: 'snapshots.ts', href: `${GITHUB_BASE}/src/utils/snapshots.ts` },
    ],
  },
  {
    id: 'pronosticos-contexto-velocity',
    section: 'Pronósticos',
    sectionSlug: 'pronosticos',
    title: 'Velocity del equipo',
    summary: 'Puntos/semana promedio del equipo en las últimas 8 semanas + tareas/sem y coeficiente de variación (CV).',
    whatIs: 'Tarjeta con la velocity histórica del equipo derivada del cronograma (hoja `actividades`). Salida de `computeTeamVelocity()`.',
    howCalculated: 'Agrupa tareas completadas por semana ISO (últimas 8). `μ = mean(puntosPorSemana)`, `σ = std(puntosPorSemana)`, `CV = σ / μ`. El CV modula el ancho de la banda en cada pronóstico: `spread = clamp(CV, 15%, 60%)`.',
    whyMatters: 'Es el "ritmo del corazón" del equipo. Velocity más alta = el equipo entrega más; CV más bajo = entrega más parejo y por lo tanto bandas más angostas. Si la velocity baja sostenidamente, los pronósticos se alargan automáticamente.',
    sources: [
      { label: 'PronosticosSection.tsx', href: `${GITHUB_BASE}/src/components/sections/PronosticosSection.tsx#L608-L635` },
      { label: 'forecastEngine.ts · computeTeamVelocity', href: `${GITHUB_BASE}/src/utils/forecastEngine.ts#L71-L101` },
    ],
  },
  {
    id: 'pronosticos-contexto-precision',
    section: 'Pronósticos',
    sectionSlug: 'pronosticos',
    title: 'Precisión de estimación',
    summary: 'Ratio entre tiempo real (`tracked`) y puntos estimados en actividades con ambos valores. Sobre/sub-estimación del equipo.',
    whatIs: 'Métrica de calidad del proceso de estimación. Salida de `computeEstimationBias()`. Aplica a toda actividad con `puntos` (estimado) y `tracked` (real) > 0.',
    howCalculated: '`ratio = Σ tracked / Σ puntos` sobre actividades con ambos valores. `ratio > 1.2` sub-estimación sistemática; `ratio < 0.8` sobre-estimación; `0.8-1.2` calibrado.',
    whyMatters: 'No se aplica al motor de pronóstico (que ya usa progreso real, no estimación), pero es señal del proceso de planeación: si el equipo subestima sistemáticamente al 1.35×, las promesas iniciales a cliente probablemente lleguen tarde.',
    sources: [
      { label: 'PronosticosSection.tsx', href: `${GITHUB_BASE}/src/components/sections/PronosticosSection.tsx#L637-L657` },
      { label: 'forecastEngine.ts · computeEstimationBias', href: `${GITHUB_BASE}/src/utils/forecastEngine.ts#L102-L117` },
    ],
  },
  {
    id: 'pronosticos-contexto-baseline',
    section: 'Pronósticos',
    sectionSlug: 'pronosticos',
    title: 'Baseline histórico (proyectos Done)',
    summary: 'Desempeño pasado del portafolio: desvío promedio/mediano, MAE, % en fecha y distribución del slippage en buckets.',
    whatIs: 'Tarjeta con métricas de qué tan bien el portafolio cumplió las fechas en proyectos ya cerrados. Salida de `computePortfolioBaseline()`. Es el Método 6.',
    howCalculated: 'Para cada proyecto Done con `finEstimado` y `finReal`: `desvío = finReal − finEstimado`. Reporta `meanSlippage`, `medianSlippage`, `mae = Σ|desvío| / n`, `onTimeRate = count(|desvío| ≤ 7) / n` y distribución por buckets (−30d / −7d / ±7d / +30d / +30d+).',
    whyMatters: 'Da contexto para juzgar pronósticos actuales: si históricamente el portafolio se desliza +20d, un pronóstico con +15d no es alarma, está dentro del ruido. Es la ancla de realidad.',
    sources: [
      { label: 'PronosticosSection.tsx', href: `${GITHUB_BASE}/src/components/sections/PronosticosSection.tsx#L659-L717` },
      { label: 'forecastEngine.ts · computePortfolioBaseline', href: `${GITHUB_BASE}/src/utils/forecastEngine.ts#L333-L393` },
    ],
  },
  {
    id: 'pronosticos-contexto-metodo-resumen',
    section: 'Pronósticos',
    sectionSlug: 'pronosticos',
    title: 'Método del pronóstico (resumen)',
    summary: 'Resumen ejecutivo del método: extrapolación de tasa de avance, banda por CV y etiqueta de riesgo combinando desvío + gap.',
    whatIs: 'Tarjeta narrativa que resume en tres párrafos cómo funciona el motor de pronóstico, sin entrar al detalle de cada método. Para el detalle completo, ver la pestaña "Metodología".',
    howCalculated: 'Reescritura corta de los Métodos 1-3: (1) `tasaDiaria = progreso / díasTranscurridos`, fechaPronóstico = hoy + (1 − progreso) / tasaDiaria. (2) Banda ±spread con `spread = clamp(CV, 15%, 60%)`. (3) Riesgo categórico por desvío con escalamiento por gap.',
    whyMatters: 'Brief para usuarios que no quieren leer las 13 cards de Metodología. La frase clave: no usamos ML — la muestra es chica y un modelo probabilístico sobreajustaría. El método es determinista, reproducible y explicable.',
    sources: [
      { label: 'PronosticosSection.tsx', href: `${GITHUB_BASE}/src/components/sections/PronosticosSection.tsx#L719-L747` },
    ],
  },
  {
    id: 'pronosticos-metodologia-forecast-date',
    section: 'Pronósticos',
    sectionSlug: 'pronosticos',
    title: 'Método 1 · Fecha de cierre por proyecto',
    summary: 'Extrapolación lineal de la tasa de avance histórica para estimar cuándo el proyecto llegará a 100%.',
    whatIs: 'Núcleo del motor: predicción de la fecha de finalización de cada proyecto activo. Asume ritmo constante (lineal).',
    howCalculated: `\`\`\`
tasaDiaria = progreso / díasTranscurridos
díasRestantes = (1 − progreso) / tasaDiaria
fechaPronóstico = hoy + díasRestantes
\`\`\`
Usa \`fechaInicio\` (o \`registro\` como fallback) y \`progreso\` actual. Si \`progreso = 0\` o no hay \`fechaInicio\`, no se proyecta (marca \`insufficient-data\` o \`stalled\`).`,
    whyMatters: 'Es el método más simple posible que produce resultados útiles. Con decenas de proyectos y semanas de throughput, métodos más complejos sobreajustarían. La extrapolación lineal es honesta, reproducible y auditable. Su debilidad: no modela el efecto "último 10% es 90% del trabajo".',
    sources: [
      { label: 'forecastEngine.ts · forecastProject', href: `${GITHUB_BASE}/src/utils/forecastEngine.ts#L148-L281` },
    ],
  },
  {
    id: 'pronosticos-metodologia-band',
    section: 'Pronósticos',
    sectionSlug: 'pronosticos',
    title: 'Método 2 · Banda optimista–pesimista',
    summary: 'Ancho de la banda de incertidumbre modulado por el coeficiente de variación (CV) del throughput del equipo.',
    whatIs: 'Intervalo de fechas que rodea la fecha pronóstico. A mayor variabilidad histórica del equipo, banda más ancha.',
    howCalculated: `\`\`\`
μ = mean(puntosCompletadosPorSemana)   // últimas 8 sem
σ = std(puntosCompletadosPorSemana)
CV = σ / μ
anchoBanda = clamp(CV, 15%, 60%)
optimista = fechaPronóstico − díasRestantes × anchoBanda
pesimista = fechaPronóstico + díasRestantes × anchoBanda
\`\`\`
Los límites 15% y 60% evitan bandas absurdas (ni tan cerradas que ignoren variabilidad, ni tan amplias que pierdan significado).`,
    whyMatters: 'El CV es el estándar para medir variabilidad relativa. Usarlo como modulador convierte la incertidumbre observada en un rango concreto de fechas, evitando dar una sola fecha con falsa precisión.',
    sources: [
      { label: 'forecastEngine.ts · spreadFromCV', href: `${GITHUB_BASE}/src/utils/forecastEngine.ts#L125-L128` },
      { label: 'forecastEngine.ts · confidenceFromCV', href: `${GITHUB_BASE}/src/utils/forecastEngine.ts#L118-L123` },
    ],
  },
  {
    id: 'pronosticos-metodologia-risk-label',
    section: 'Pronósticos',
    sectionSlug: 'pronosticos',
    title: 'Método 3 · Etiqueta de riesgo',
    summary: 'Clasificación categórica (En tiempo / Deslizando / En riesgo / Estancado) combinando desvío y gap de progreso.',
    whatIs: 'Etiqueta accionable que destila la información del pronóstico en una sola palabra. Salida de `forecastProject().risk` y `riskMeta()`.',
    howCalculated: `\`\`\`
|desvío| ≤ 3d   → on-track
4-14d           → slipping
> 14d           → at-risk

// Escalamiento por gap de progreso esperado vs real:
gap > 30% y risk = on-track → slipping
gap > 50% y risk ≠ at-risk  → at-risk

// Casos especiales:
progreso = 0 y ya inició → stalled
sin fechaInicio          → insufficient-data
\`\`\``,
    whyMatters: 'El desvío en días es cuantitativo pero no accionable por sí solo: un proyecto puede tener desvío pequeño y aún estar en problemas si su progreso va muy atrasado. El gap escala el riesgo para capturar ese caso.',
    sources: [
      { label: 'forecastEngine.ts · riskMeta', href: `${GITHUB_BASE}/src/utils/forecastEngine.ts#L294-L310` },
    ],
  },
  {
    id: 'pronosticos-metodologia-capacity',
    section: 'Pronósticos',
    sectionSlug: 'pronosticos',
    title: 'Método 4 · Capacidad por persona',
    summary: 'Velocity individual (puntos completados/sem en las últimas 8) cruzada con la carga pendiente asignada.',
    whatIs: 'Cálculo de cuántas semanas tardará cada persona en liquidar su backlog asignado al ritmo histórico propio.',
    howCalculated: `\`\`\`
velocityPersona = puntosCompletados / semanasObservadas   // últimas 8 sem
puntosPendientes = Σ puntos de tareas no-completadas
semanasParaLiquidar = puntosPendientes / velocityPersona
fechaLibre = hoy + semanasParaLiquidar × 7
\`\`\`
El matching de nombres entre fuentes (Projects con apodos, Cronograma con nombres completos) usa \`assigneeMatches()\` con includes bidireccional.`,
    whyMatters: 'Detecta cuellos de botella humanos antes de que se manifiesten como slippages. El fuzzy matching es crítico: usar match exacto haría que el 80% de las personas mostraran 0 carga porque sus nombres difieren entre hojas.',
    sources: [
      { label: 'forecastEngine.ts · computePersonCapacity', href: `${GITHUB_BASE}/src/utils/forecastEngine.ts#L402-L515` },
    ],
  },
  {
    id: 'pronosticos-metodologia-estimation-bias',
    section: 'Pronósticos',
    sectionSlug: 'pronosticos',
    title: 'Método 5 · Precisión de estimación',
    summary: 'Ratio agregado real (`tracked`) vs estimado (`puntos`) en actividades. Mide sesgo de planeación, no de ejecución.',
    whatIs: 'Métrica de calidad del proceso de estimación. NO se aplica al motor (que usa progreso real), solo informa.',
    howCalculated: `\`\`\`
ratio = Σ tracked / Σ puntos   // actividades con ambos campos > 0

ratio > 1.2 → sub-estimación sistemática
ratio < 0.8 → sobre-estimación
0.8–1.2     → estimaciones alineadas
\`\`\``,
    whyMatters: 'Mide algo distinto al resto: la calidad del plan original. Si el ratio es 1.35, las tareas reales toman 35% más que lo estimado — señal para agregar buffer en planeación futura.',
    sources: [
      { label: 'forecastEngine.ts · computeEstimationBias', href: `${GITHUB_BASE}/src/utils/forecastEngine.ts#L102-L117` },
    ],
  },
  {
    id: 'pronosticos-metodologia-baseline',
    section: 'Pronósticos',
    sectionSlug: 'pronosticos',
    title: 'Método 6 · Baseline histórico',
    summary: 'Desempeño pasado del portafolio: promedio, mediana, MAE y distribución del desvío en proyectos cerrados.',
    whatIs: 'Resumen estadístico de qué tanto se cumplió la fecha en proyectos Done. Da contexto para juzgar pronósticos actuales.',
    howCalculated: `\`\`\`
Por cada proyecto Done:
  desvío = finReal − finEstimado   (días)

Reporta:
  meanSlippage, medianSlippage
  MAE = Σ|desvío| / n
  onTimeRate = count(|desvío| ≤ 7) / n
  distribución por bucket (−30d/−7d/±7d/+30d/+30d+)
\`\`\``,
    whyMatters: 'Sin baseline, un desvío de +15d parece malo en abstracto. Con baseline puedes decir "está proyectado a deslizarse menos de lo que históricamente deslizamos". Es la ancla de realidad del sistema.',
    sources: [
      { label: 'forecastEngine.ts · computePortfolioBaseline', href: `${GITHUB_BASE}/src/utils/forecastEngine.ts#L333-L393` },
    ],
  },
  {
    id: 'pronosticos-metodologia-probability',
    section: 'Pronósticos',
    sectionSlug: 'pronosticos',
    title: 'Método 7 · Probabilidad de cumplir fin estimado',
    summary: 'Probabilidad numérica (0-100%) de terminar a tiempo, modelando el cierre como una variable normal alrededor del pronóstico.',
    whatIs: 'Métrica probabilística complementaria a la etiqueta categórica. Salida de `probabilityOnTime` y `probabilityMeta()`.',
    howCalculated: `\`\`\`
σ = daysToFinish × spread(CV)
Z = −slippageDays / σ
P(a tiempo) = Φ(Z)        // CDF normal estándar (erf)

Rangos semánticos:
  ≥ 75% → alta
  50-75% → razonable
  25-50% → frágil
  < 25% → muy improbable
\`\`\`
La función \`erf()\` está implementada inline (Abramowitz & Stegun) para no depender de librerías.`,
    whyMatters: 'La etiqueta de riesgo es categórica y pierde matiz. Una probabilidad numérica (e.g. 38%) comunica mejor cuán frágil es un compromiso sin esconder la incertidumbre bajo una etiqueta.',
    sources: [
      { label: 'forecastEngine.ts · normalCDF / erf', href: `${GITHUB_BASE}/src/utils/forecastEngine.ts#L130-L146` },
      { label: 'forecastEngine.ts · probabilityMeta', href: `${GITHUB_BASE}/src/utils/forecastEngine.ts#L703-L729` },
    ],
  },
  {
    id: 'pronosticos-metodologia-hito-aggregation',
    section: 'Pronósticos',
    sectionSlug: 'pronosticos',
    title: 'Método 8 · Cierre por cuatrimestre',
    summary: 'Agregación de pronósticos individuales a nivel de cuatrimestre: cuándo cierra todo el cuatrimestre y cuál es su peor riesgo.',
    whatIs: 'Convierte pronósticos por folio en pronósticos por entrega de negocio. Salida de `aggregateByHito()` (agrupa por `cuatrimestre`).',
    howCalculated: `\`\`\`
Por cuatrimestre:
  cierreProyectado = max(forecastDate)   // entre proyectos activos
  ultimoPlan       = max(finEstimado)
  desvíoAgregado   = cierreProyectado − ultimoPlan
  progresoPromedio = mean(progreso)
  peorRiesgo       = worstRiskOf(forecasts del grupo)
\`\`\`
Clave: para fecha de cierre se toma el MÁXIMO, no el promedio — el cuatrimestre termina cuando termina su último proyecto.`,
    whyMatters: 'A dirección le importa cuándo cierra "2026 Q1 completo", no folios individuales. Promediar fechas sería incorrecto. El riesgo del cuatrimestre es tan malo como su peor proyecto.',
    sources: [
      { label: 'forecastEngine.ts · aggregateByHito', href: `${GITHUB_BASE}/src/utils/forecastEngine.ts#L524-L598` },
    ],
  },
  {
    id: 'pronosticos-metodologia-capacity-horizons',
    section: 'Pronósticos',
    sectionSlug: 'pronosticos',
    title: 'Método 9 · Capacidad del equipo a N semanas',
    summary: 'Oferta (velocity × N) vs demanda (carga restante prorrateada al horizonte) en 4, 8 y 12 semanas.',
    whatIs: 'Vista de utilización del equipo en distintos horizontes. Salida de `computeCapacityProjection()`.',
    howCalculated: `\`\`\`
Por horizonte H (semanas):
  supply = velocity.meanPoints × H
  demand = Σ por proyecto activo:
    remaining × min(1, H×7 / daysRemainingForecast)

  utilización = demand / supply

  < 70%   → holgura
  70-95%  → sano
  95-115% → saturado
  > 115%  → sobrecarga
\`\`\`
La demanda prorratea para no inflar cargas distantes en horizontes cortos.`,
    whyMatters: 'Responde "¿podemos tomar un proyecto más este trimestre?". Es métrica de compromiso, no de ejecución. Ayuda a decidir qué NO comprometer antes de que se vuelva problema.',
    sources: [
      { label: 'forecastEngine.ts · computeCapacityProjection', href: `${GITHUB_BASE}/src/utils/forecastEngine.ts#L599-L638` },
    ],
  },
  {
    id: 'pronosticos-metodologia-critical-dates',
    section: 'Pronósticos',
    sectionSlug: 'pronosticos',
    title: 'Método 10 · Próximas fechas críticas',
    summary: 'Reagrupación de pronósticos en ventanas operativas (30, 60, 90 días) ordenadas cronológicamente.',
    whatIs: 'Vista cronológica de los próximos cierres proyectados. Salida de `computeCriticalDates(forecasts, [30,60,90])`.',
    howCalculated: `\`\`\`
Por proyecto activo:
  daysFromNow = forecastDate − hoy

Asignación a ventanas (0-30, 31-60, 61-90):
  si daysFromNow ≤ W y daysFromNow > W_previa
  → pertenece a esa ventana

Orden: cronológico (más próximo primero)
Vencidos: aparecen en la ventana más próxima
\`\`\``,
    whyMatters: 'Las fechas individuales se pierden en la vista global. Agruparlas en ventanas accionables las traduce al lenguaje del PM: lo de 30 días entra a 1:1, lo de 60 a planning, lo de 90 a roadmap.',
    sources: [
      { label: 'forecastEngine.ts · computeCriticalDates', href: `${GITHUB_BASE}/src/utils/forecastEngine.ts#L669-L702` },
    ],
  },
  {
    id: 'pronosticos-metodologia-slippage-cost',
    section: 'Pronósticos',
    sectionSlug: 'pronosticos',
    title: 'Método 11 · Costo proyectado de desvíos',
    summary: 'Multiplica los días de desvío positivo por el costo diario prorrateado del equipo asignado a cada proyecto.',
    whatIs: 'Traduce slippage operativo en costo hundido proyectado. Salida de `computeSlippageCostImpact()`.',
    howCalculated: `\`\`\`
Por proyecto con slippage > 0:
  costoDiario = estimatedMonthlyCost / 30
  costoAdicional = costoDiario × slippageDays

Agregado del portafolio:
  totalImpacto = Σ costoAdicional
  %Mensual = totalImpacto / Σ costosMensuales
\`\`\`
\`estimatedMonthlyCost\` viene de \`estimateProjectCost()\` con prorrateo por participación (fuzzy name matching).`,
    whyMatters: 'PMs razonan en días; finanzas en dinero. Esta métrica hace el puente y cambia la priorización de intervenciones: cuando "se desliza un mes" se vuelve "$500k de costo hundido proyectado", la urgencia se vuelve concreta.',
    sources: [
      { label: 'forecastEngine.ts · computeSlippageCostImpact', href: `${GITHUB_BASE}/src/utils/forecastEngine.ts#L731` },
      { label: 'costEngine.ts · estimateProjectCost', href: `${GITHUB_BASE}/src/utils/costEngine.ts` },
    ],
  },
  {
    id: 'pronosticos-metodologia-course-forecast',
    section: 'Pronósticos',
    sectionSlug: 'pronosticos',
    title: 'Método 12 · Finalización de cursos',
    summary: 'Proyección por persona basada exclusivamente en snapshots semanales (la hoja de Cursos no tiene fechas).',
    whatIs: 'Estimación de cuándo cada colaborador terminará sus cursos asignados. Salida de `computeCourseForecasts()`.',
    howCalculated: `\`\`\`
Por colaborador con ≥ 1 snapshot:
  snapshotMasViejo = primera captura disponible
  semanas = (hoy − snapshotMasViejo.fecha) / 7
  delta = progresoActual − snapshotMasViejo.progreso
  ritmo = delta / semanas      // %/sem

  semanasRestantes = (100 − progresoActual) / ritmo
  fechaFinal = hoy + semanasRestantes × 7
\`\`\`
Requiere mínimo 2 semanas de snapshots para producir resultado útil.`,
    whyMatters: 'La hoja de Cursos no tiene fechas, así que el ritmo no puede salir de ella misma. Los snapshots semanales proveen la dimensión temporal faltante. Es la forma honesta: esperar a tener datos en vez de inventarlos.',
    sources: [
      { label: 'courseForecast.ts · computeCourseForecasts', href: `${GITHUB_BASE}/src/utils/courseForecast.ts` },
    ],
  },
  {
    id: 'pronosticos-metodologia-backtest',
    section: 'Pronósticos',
    sectionSlug: 'pronosticos',
    title: 'Método 13 · Backtesting del motor',
    summary: 'Mide qué tan bien predijo el motor en el pasado, reconstruyendo predicciones a partir de snapshots y comparando contra `finReal`.',
    whatIs: 'Auto-verificación del motor sobre datos reales. Salida de `runBacktest(snapshots, projects)`.',
    howCalculated: `\`\`\`
Por cada proyecto hoy en Done con finReal:
  1. Buscar snapshot donde tenía progreso ∈ [20%, 95%]
  2. A ese momento, calcular:
       daysElapsed = snapshotDate − fechaInicio
       ritmo       = progresoSnapshot / daysElapsed
       prediccion  = snapshotDate + (1 − progresoSnapshot) / ritmo
  3. error = prediccion − finReal

Reporta:
  MAE = Σ|error| / n
  sesgo medio = Σ error / n
  % dentro de ±7d y ±14d
\`\`\``,
    whyMatters: 'Un método sin forma de verificarse es fe. El backtest hace al motor auditable: si erra sistemáticamente, lo sabemos. Si el sesgo es consistente, podemos calibrar. Es la única forma científica de mejorar el pronóstico.',
    sources: [
      { label: 'backtest.ts · runBacktest', href: `${GITHUB_BASE}/src/utils/backtest.ts` },
    ],
  },

  // ---------------- Detalle de Pronóstico ----------------
  {
    id: 'pronosticos-detalle-hero',
    section: 'Detalle de Pronóstico',
    sectionSlug: 'pronosticos-detalle',
    title: 'Cabecera de pronóstico',
    summary: 'Encabezado del proyecto con su clasificación de riesgo, probabilidad de llegar a tiempo y nivel de confianza del modelo.',
    whatIs: 'Hero card de la página con el nombre del proyecto y tres atributos derivados por el motor: categoría de riesgo (En tiempo / Deslizando / En riesgo / Estancado / Completado), probabilidad a tiempo (porcentaje) y confianza (low / medium / high). El borde adopta el color del riesgo.',
    howCalculated: 'Las tres etiquetas se obtienen de `forecastProject(project, velocity)`. `risk` aplica las reglas del Método 3. `onTimeProbability = normalCDF(-slippage / sigma)` donde `sigma = daysToFinish × spread`. `confidence` viene de `confidenceFromCV(velocity.cv, velocity.weeks)`.',
    whyMatters: 'Resumen de un vistazo: si arriba ves "En riesgo" + "Improbable a tiempo" + confianza alta, el modelo está convencido del diagnóstico. Si la confianza es baja (poco historial), trata la categoría como hipótesis de trabajo y revisa los factores antes de actuar.',
    sources: [
      { label: 'PronosticoDetailSection.tsx · Hero', href: `${GITHUB_BASE}/src/components/sections/PronosticoDetailSection.tsx#L254-L289` },
      { label: 'forecastEngine.ts · forecastProject', href: `${GITHUB_BASE}/src/utils/forecastEngine.ts#L148-L280` },
    ],
  },
  {
    id: 'pronosticos-detalle-progreso-actual',
    section: 'Detalle de Pronóstico',
    sectionSlug: 'pronosticos-detalle',
    title: 'Progreso actual vs esperado',
    summary: 'Porcentaje reportado por el PM comparado contra el porcentaje teórico que tendría el proyecto si avanzara linealmente desde su fecha de inicio.',
    whatIs: 'Métrica dual: el número grande es `progreso` declarado en la hoja Projects; el sub-label muestra el progreso esperado calculado por el motor asumiendo avance lineal entre inicio y `finEstimado`.',
    howCalculated: '`actualPct = Math.round(progreso × 100)`. `expectedPct = Math.round(daysElapsed / daysPlanned × 100)` con `daysElapsed = today − (fechaInicio || registro)` y `daysPlanned = finEstimado − inicio`. El gap se usa luego para escalar riesgo: `gap > 30%` empuja a slipping y `gap > 50%` a at-risk.',
    whyMatters: 'Indicador inmediato de salud por delta. Si actual = esperado el proyecto va al ritmo declarado; si actual ≪ esperado el plan no se está cumpliendo aunque el estatus diga otra cosa.',
    sources: [
      { label: 'PronosticoDetailSection.tsx · metric row', href: `${GITHUB_BASE}/src/components/sections/PronosticoDetailSection.tsx#L292-L339` },
    ],
  },
  {
    id: 'pronosticos-detalle-fin-estimado',
    section: 'Detalle de Pronóstico',
    sectionSlug: 'pronosticos-detalle',
    title: 'Fin estimado',
    summary: 'Fecha objetivo declarada por el PM en la hoja Projects. Es la referencia contra la que el motor calcula el desvío.',
    whatIs: 'Valor crudo del campo `finEstimado` (columna de la hoja Projects), formateado a `dd mmm yyyy` en español.',
    howCalculated: 'Lectura directa de `project.finEstimado` (string ISO). El motor lo parsea con `parseDate()` para calcular `daysPlanned` y `slippageDays`. Si el campo está vacío, el motor no puede computar slippage (cae a `insufficient-data`).',
    whyMatters: 'Ancla del pronóstico. Toda comparativa "vs plan" parte de aquí; si el PM no actualiza esta fecha tras un re-plan, el motor reportará atrasos artificiales aunque el equipo esté avanzando al ritmo de la nueva fecha objetivo.',
    sources: [
      { label: 'PronosticoDetailSection.tsx · MetricTile', href: `${GITHUB_BASE}/src/components/sections/PronosticoDetailSection.tsx#L300-L305` },
    ],
  },
  {
    id: 'pronosticos-detalle-fecha-pronostico',
    section: 'Detalle de Pronóstico',
    sectionSlug: 'pronosticos-detalle',
    title: 'Fecha pronóstico',
    summary: 'Fecha de fin proyectada extrapolando el ritmo diario observado desde el inicio del proyecto hasta hoy.',
    whatIs: 'Resultado central del motor: la fecha en la que el proyecto debería completarse si mantiene el ritmo con el que ha avanzado hasta hoy.',
    howCalculated: '`dailyRate = progreso / daysElapsed`. `daysToFinish = (1 − progreso) / dailyRate`. `forecastDate = today + round(daysToFinish)`. Casos especiales: `progreso = 0` con inicio → no se puede extrapolar (stalled); `progreso = 1` → forecastDate = today; `daysElapsed < 3` → warning de proyección volátil.',
    whyMatters: 'Es la pregunta más concreta que puedes responderle a un stakeholder: "¿cuándo va a terminar?". A diferencia del estatus declarado, este número se mueve solo en función del avance real, así que detecta atrasos antes de que el PM los reporte.',
    sources: [
      { label: 'PronosticoDetailSection.tsx · MetricTile', href: `${GITHUB_BASE}/src/components/sections/PronosticoDetailSection.tsx#L306-L311` },
      { label: 'forecastEngine.ts · forecastDate', href: `${GITHUB_BASE}/src/utils/forecastEngine.ts#L226-L234` },
    ],
  },
  {
    id: 'pronosticos-detalle-desvio',
    section: 'Detalle de Pronóstico',
    sectionSlug: 'pronosticos-detalle',
    title: 'Desvío vs plan',
    summary: 'Diferencia en días entre la fecha pronóstico y el fin estimado. Positivo = entrega tarde, negativo = entrega temprano.',
    whatIs: 'Distancia firmada en días naturales entre lo que el motor proyecta y lo que el PM declaró. El color salta de verde a ámbar a rojo según los umbrales del clasificador (3d / 14d).',
    howCalculated: '`slippageDays = daysBetween(finEstimado, forecastDate)`. Si `finEstimado` está vacío, queda en `null` y se muestra "—". Umbrales: `≤3d` (verde / on-track), `4–14d` (ámbar / slipping), `>14d` (rojo / at-risk).',
    whyMatters: 'Es la palanca principal del clasificador de riesgo. Mirar el desvío te dice no solo "cuánto" sino "qué tan grave": un proyecto con +3d sigue dentro del margen de error del modelo; con +20d es virtualmente seguro que no llega a tiempo aunque el estatus diga On Track.',
    sources: [
      { label: 'PronosticoDetailSection.tsx · MetricTile Desvío', href: `${GITHUB_BASE}/src/components/sections/PronosticoDetailSection.tsx#L312-L338` },
    ],
  },
  {
    id: 'pronosticos-detalle-timeline',
    section: 'Detalle de Pronóstico',
    sectionSlug: 'pronosticos-detalle',
    title: 'Línea de tiempo',
    summary: 'Barra visual con los hitos del proyecto (Inicio, Hoy, Fin estimado, Pronóstico) y la banda optimista–pesimista superpuesta como ghost bar.',
    whatIs: 'Timeline horizontal con marcadores verticales y etiquetas en carriles para evitar superposición. La franja azul translúcida representa la banda de incertidumbre (rango entre escenario optimista y pesimista) y los puntos circulares marcan eventos puntuales.',
    howCalculated: 'Se calcula `minIso`/`maxIso` con los extremos de [inicio, hoy, plan, pronóstico, optimista, pesimista]. Cada marker recibe `pos = daysBetween(min, iso) / totalDays × 100`. Los labels se asignan a carriles via `assignLanes()` con gap mínimo de 18px. La banda se dibuja entre `optimisticDate` y `pessimisticDate`.',
    whyMatters: 'Síntesis visual del estado del proyecto. Si el marker "Pronóstico" cae claramente a la derecha del "Fin estimado", el proyecto está deslizando — y el ancho de la banda te dice qué tan firme es esa predicción. Una banda muy ancha = mucha incertidumbre = trata el pronóstico como rango, no como fecha.',
    sources: [
      { label: 'PronosticoDetailSection.tsx · TimelineBar', href: `${GITHUB_BASE}/src/components/sections/PronosticoDetailSection.tsx#L828-L918` },
    ],
  },
  {
    id: 'pronosticos-detalle-factores',
    section: 'Detalle de Pronóstico',
    sectionSlug: 'pronosticos-detalle',
    title: 'Factores del pronóstico',
    summary: 'Lista narrada de los inputs que llevaron al motor a la clasificación de riesgo actual (gap de progreso, slippage, variabilidad, snapshots stale, warnings).',
    whatIs: 'Bullets etiquetados por tono (positive / neutral / warn / bad) que descomponen el veredicto del motor: brecha entre progreso real y esperado, magnitud del desvío, CV del throughput del equipo, warnings del engine, condición de stalled y datos potencialmente obsoletos.',
    howCalculated: 'Se construyen dentro del `useMemo` `factors`. Cada bloque chequea un umbral: `gap > 30%` → "Gap severo (bad)", `slippage > 14d` → "Desvío significativo (bad)", `velocity.cv > 0.6` → "Variabilidad alta (warn)", warnings del engine se inyectan tal cual, `staleInfo.state === "stale"` agrega aviso de datos obsoletos.',
    whyMatters: 'Si el riesgo dice "At Risk" pero quieres entender por qué, esta lista te lo explica con números (e.g. "Actual 30% vs esperado 60%, gap 30pp"). Es la palanca para conversaciones: muestra qué evidencia tiene el modelo y qué confianza puedes asignarle.',
    sources: [
      { label: 'PronosticoDetailSection.tsx · factors', href: `${GITHUB_BASE}/src/components/sections/PronosticoDetailSection.tsx#L90-L195` },
      { label: 'stale.ts · computeStaleness', href: `${GITHUB_BASE}/src/utils/stale.ts` },
    ],
  },
  {
    id: 'pronosticos-detalle-escenarios',
    section: 'Detalle de Pronóstico',
    sectionSlug: 'pronosticos-detalle',
    title: 'Escenarios',
    summary: 'Tres fechas: optimista (mejor ritmo razonable), más probable (extrapolación central) y pesimista (peor ritmo razonable).',
    whatIs: 'Card lateral con las tres fechas que delimitan el rango de incertidumbre del pronóstico. La fecha "más probable" coincide con la del KPI principal; las otras dos son los extremos de la banda.',
    howCalculated: '`spread = clamp(velocity.cv, 0.15, 0.6)`. `optimisticDays = daysToFinish × (1 − spread)`, `pessimisticDays = daysToFinish × (1 + spread)`, y se suman a `today` para obtener cada fecha.',
    whyMatters: 'Mejor que comprometerse a una sola fecha es comprometerse a un rango: "entre el 10 y el 24 de junio". Permite negociar con stakeholders con honestidad y refleja directamente la (in)estabilidad operativa del equipo.',
    sources: [
      { label: 'PronosticoDetailSection.tsx · Escenarios', href: `${GITHUB_BASE}/src/components/sections/PronosticoDetailSection.tsx#L381-L407` },
    ],
  },
  {
    id: 'pronosticos-detalle-whatif',
    section: 'Detalle de Pronóstico',
    sectionSlug: 'pronosticos-detalle',
    title: 'What-if: simulación de extensión',
    summary: 'Panel interactivo: deslizas N días extra al pronóstico y el motor recalcula riesgo, probabilidad a tiempo y costo adicional con las mismas reglas.',
    whatIs: 'Slider en rango [-30, +60] días con presets (-7, 0, +7, +14, +30). Compara lado a lado el estado actual contra el simulado: riesgo, desvío, probabilidad a tiempo y, si hay datos de equipo, el costo extra que implicaría dejar correr el atraso.',
    howCalculated: '`newSlip = slippageBase + extraDays`. `newRisk` reusa las mismas reglas del motor. `newProb = normalCDF(-newSlip / sigma)` con `sigma = daysToFinish × spread`. Costo: `dailyCost = costoMensual / 30` y `additionalCost = max(0, slip) × dailyCost`.',
    whyMatters: 'Convierte la pregunta abstracta "¿qué pasa si esto se atrasa 2 semanas más?" en un número: cambia el color del badge de riesgo, te baja la probabilidad a tiempo y muestra cuánto más le va a costar al portafolio.',
    sources: [
      { label: 'PronosticoDetailSection.tsx · WhatIfPanel', href: `${GITHUB_BASE}/src/components/sections/PronosticoDetailSection.tsx#L487-L695` },
      { label: 'costEngine.ts · estimateProjectCost', href: `${GITHUB_BASE}/src/utils/costEngine.ts` },
    ],
  },
  {
    id: 'pronosticos-detalle-velocity',
    section: 'Detalle de Pronóstico',
    sectionSlug: 'pronosticos-detalle',
    title: 'Velocity del equipo',
    summary: 'Throughput promedio del equipo en puntos y tareas por semana, junto con el rango de semanas considerado.',
    whatIs: 'Card de contexto con el ritmo agregado de cierre del equipo. Útil para entender cuán representativo es el spread aplicado al pronóstico actual y cuánto historial alimenta al modelo.',
    howCalculated: '`computeTeamVelocity(tareas)` agrupa las tareas con `finReal` por semana ISO y calcula `meanPoints`, `meanTasks` y `cv = σ/μ`. `weeks` es el número de semanas con cierres registrados.',
    whyMatters: 'Es el insumo principal de la banda optimista–pesimista. Equipos con muchas semanas de historial y CV bajo producen pronósticos con confianza alta y bandas estrechas. Si `weeks = 0` o es muy bajo, el motor cae a un spread por defecto.',
    sources: [
      { label: 'PronosticoDetailSection.tsx · Velocity', href: `${GITHUB_BASE}/src/components/sections/PronosticoDetailSection.tsx#L419-L434` },
    ],
  },
  {
    id: 'pronosticos-detalle-baseline',
    section: 'Detalle de Pronóstico',
    sectionSlug: 'pronosticos-detalle',
    title: 'Baseline del portafolio',
    summary: 'Promedio histórico de desvío entre fecha estimada y fecha real en proyectos ya cerrados (Done), más el porcentaje que cerraron en fecha.',
    whatIs: 'Métrica de contexto histórico: cómo se han comportado los proyectos cerrados del portafolio frente a sus fechas planeadas. Es la "regla a ojo" del PMO contra la que comparar este pronóstico.',
    howCalculated: '`computePortfolioBaseline(projects)` filtra Done con `finReal`, calcula `slippage = daysBetween(finEstimado, finReal)` y devuelve `meanSlippage`, `onTimeRate` (% con `|slippage| ≤ 7`) y `sampleSize`. Color: verde si `|mean| ≤ 7d`, ámbar si excede.',
    whyMatters: 'Calibra expectativas. Si el portafolio históricamente entrega +20d en promedio, un proyecto pronosticado con +12d de desvío está **mejor** que el promedio. Si la `onTimeRate` es baja, el modelo debería sesgar pesimista.',
    sources: [
      { label: 'PronosticoDetailSection.tsx · Baseline', href: `${GITHUB_BASE}/src/components/sections/PronosticoDetailSection.tsx#L436-L460` },
    ],
  },
  {
    id: 'pronosticos-detalle-reglas-riesgo',
    section: 'Detalle de Pronóstico',
    sectionSlug: 'pronosticos-detalle',
    title: 'Reglas del riesgo',
    summary: 'Cheat sheet de los umbrales que aplica el clasificador para asignar cada categoría (en tiempo / deslizando / en riesgo / estancado).',
    whatIs: 'Lista estática que documenta los cortes que usa `forecastProject()` para clasificar. Sirve como referencia rápida en la propia pantalla: no hay que ir al código para saber por qué un proyecto está en una categoría.',
    howCalculated: 'No se calcula — refleja literalmente las reglas codificadas en `forecastEngine.ts`. En tiempo: `slip ≤ 3d` y `gap < 30%`. Deslizando: `slip 4–14d` o `gap 30–50%`. En riesgo: `slip > 14d` o `gap > 50%`. Estancado: proyecto que ya inició pero con `progreso = 0`.',
    whyMatters: 'Transparencia del clasificador. Si el equipo discute por qué algo cayó en at-risk, este bloque cierra la discusión: las reglas son fijas, deterministas y públicas — no hay heurística oculta del modelo.',
    sources: [
      { label: 'PronosticoDetailSection.tsx · Reglas', href: `${GITHUB_BASE}/src/components/sections/PronosticoDetailSection.tsx#L462-L481` },
      { label: 'forecastEngine.ts · risk classifier', href: `${GITHUB_BASE}/src/utils/forecastEngine.ts#L238-L253` },
    ],
  },

  // ---------------- Costos ----------------
  {
    id: 'costos-kpi-mensual-total',
    section: 'Costos',
    sectionSlug: 'costos',
    title: 'Costo Mensual Total',
    summary: 'Suma del costo mensual bruto del equipo (nómina interna sin prorrateo ni modelo financiero).',
    whatIs: 'Total de la columna `total` de la hoja Costos (filas 1-12, una por rol). Representa lo que cuesta operar al equipo en un mes, sin reparto entre proyectos y sin margen o IVA aplicados.',
    howCalculated: '`totalMensual = Σ c.total` sobre los registros de `/api/costos` (filtra filas con `rol` vacío). Es el costo bruto antes de cualquier transformación del modelo financiero.',
    whyMatters: 'Línea base para todo el resto de la página: el donut por rol, el precio al cliente y el costo por cuatrimestre se calculan a partir de este número. Si el equipo crece o cambia tarifas, este KPI se mueve y arrastra al resto.',
    sources: [
      { label: '/api/costos.ts', href: `${GITHUB_BASE}/src/pages/api/costos.ts` },
      { label: 'CostosSection.tsx · kpis', href: `${GITHUB_BASE}/src/components/sections/CostosSection.tsx#L43-L51` },
    ],
  },
  {
    id: 'costos-kpi-recursos',
    section: 'Costos',
    sectionSlug: 'costos',
    title: 'Total de Recursos',
    summary: 'Headcount total declarado en la hoja Costos: suma de personas asignadas a cada rol.',
    whatIs: 'Cuenta agregada de personas. No deduplica por nombre porque la hoja Costos cuenta cabezas por rol, no por persona; si alguien aparece en dos roles, cuenta dos veces.',
    howCalculated: '`totalRecursos = Σ c.recursos` sobre `/api/costos`. La columna `recursos` es número entero por fila/rol.',
    whyMatters: 'Sirve para sanity check rápido contra Equipo: si el directorio tiene 14 personas y este KPI dice 18, alguien está contado en dos roles (probablemente PMs que también desarrollan). El divisor de costo/hora promedio depende de este número.',
    sources: [
      { label: '/api/costos.ts', href: `${GITHUB_BASE}/src/pages/api/costos.ts` },
    ],
  },
  {
    id: 'costos-kpi-horas',
    section: 'Costos',
    sectionSlug: 'costos',
    title: 'Horas Totales por Mes',
    summary: 'Capacidad teórica del equipo en horas/mes según lo declarado en la hoja Costos.',
    whatIs: 'Suma de la columna `horas` (total mensual ya multiplicado por recursos) de cada rol. Es la capacidad disponible asumiendo jornada estándar — no incluye PTO, ramp-up, ni reuniones.',
    howCalculated: '`totalHoras = Σ c.horas` sobre `/api/costos`. La columna `horas` de la hoja ya es `horasRecurso × recursos`.',
    whyMatters: 'Denominador útil para calcular capacidad real cuando se cruza con story points entregados o tareas completadas. La realidad típica es 50-70% del techo teórico por overhead.',
    sources: [
      { label: '/api/costos.ts', href: `${GITHUB_BASE}/src/pages/api/costos.ts` },
    ],
  },
  {
    id: 'costos-kpi-costo-hora-promedio',
    section: 'Costos',
    sectionSlug: 'costos',
    title: 'Costo/Hora Promedio',
    summary: 'Tarifa promedio ponderada por cantidad de recursos en cada rol.',
    whatIs: 'No es el promedio simple de costo/hora entre roles: pondera por número de personas en cada rol para reflejar la mezcla real del equipo.',
    howCalculated: '`avgCostoHora = round(Σ (c.costoHora × c.recursos) / totalRecursos)`. Un rol caro con 1 persona pesa menos que un rol más barato con 5 personas.',
    whyMatters: 'Útil para cotizaciones rápidas sin entrar al modelo financiero completo: "X horas × costo/hora promedio" da una primera aproximación interna. Para la cifra que se cobra al cliente, multiplica por el factor del modelo financiero.',
    sources: [
      { label: 'CostosSection.tsx · kpis', href: `${GITHUB_BASE}/src/components/sections/CostosSection.tsx#L43-L51` },
    ],
  },
  {
    id: 'costos-kpi-precio-cliente',
    section: 'Costos',
    sectionSlug: 'costos',
    title: 'Precio al Cliente por Mes',
    summary: 'Costo mensual total después de aplicar la cascada del modelo financiero del Excel: experiencia → admin → margen → IVA.',
    whatIs: 'Lo que tendría que facturarse al cliente mensualmente para cubrir el costo del equipo aplicando los factores comerciales del Excel. Diferente del costo interno: incluye margen comercial e IVA.',
    howCalculated: '`applyFinancialModel(totalMensual, financialModel).precioCliente`. La cascada: `valorExperiencia = costo × valorExperienciaRate`; `costoAdmin = valorExperiencia × costoAdminRate`; `margen = (valorExperiencia + costoAdmin) × margenRate`; `iva = (...) × ivaRate`.',
    whyMatters: 'Es la cifra "vendible". Si el costo mensual son $X y el precio al cliente $X × 1.6, ese 60% es la cobertura comercial (admin + margen + IVA). Solo aparece si la hoja Costos tiene las filas 13-21 con el modelo cargado.',
    sources: [
      { label: 'costEngine.ts · applyFinancialModel', href: `${GITHUB_BASE}/src/utils/costEngine.ts` },
      { label: '/api/costos-modelo.ts', href: `${GITHUB_BASE}/src/pages/api/costos-modelo.ts` },
    ],
  },
  {
    id: 'costos-kpi-margen-bruto',
    section: 'Costos',
    sectionSlug: 'costos',
    title: 'Margen Bruto',
    summary: 'Porcentaje de margen comercial declarado en el modelo financiero del Excel.',
    whatIs: 'Factor `margenRate` leído de la fila correspondiente en el modelo financiero. Se aplica sobre (valor experiencia + admin) antes del IVA, no sobre el costo crudo.',
    howCalculated: '`Math.round(financialModel.margenRate × 100)`. El factor se normaliza automáticamente en `/api/costos-modelo` si el Sheet lo entrega como porcentaje (e.g. 30% → 0.30).',
    whyMatters: 'Es la palanca comercial más visible: subir el margen 5 puntos sube el precio al cliente proporcionalmente sin tocar costos. Si la cotización queda fuera de mercado, este es el primer parámetro a ajustar antes que admin o experiencia.',
    sources: [
      { label: '/api/costos-modelo.ts', href: `${GITHUB_BASE}/src/pages/api/costos-modelo.ts` },
    ],
  },
  {
    id: 'costos-distribucion-rol',
    section: 'Costos',
    sectionSlug: 'costos',
    title: 'Distribución de Costo Mensual por Rol',
    summary: 'Donut que reparte el costo mensual total entre los roles del equipo, ordenado de mayor a menor.',
    whatIs: 'Vista visual de "dónde se va el dinero": cada slice es un rol (Arquitecto, PM, Developer, etc.) y su porción es proporcional al costo mensual de ese rol.',
    howCalculated: '`costoByRol = costos.data.filter(c => c.total > 0).map(c => ({ name: c.rol, value: c.total })).sort((a,b) => b.value - a.value)`.',
    whyMatters: 'Cuando se decide contratar o congelar headcount, esta vista muestra qué rol mueve más la aguja. Un rol que pesa 5% del costo total casi no afecta el portafolio; uno que pesa 35% es palanca real.',
    sources: [
      { label: 'CostosSection.tsx · costoByRol', href: `${GITHUB_BASE}/src/components/sections/CostosSection.tsx#L54-L59` },
    ],
  },
  {
    id: 'costos-costo-hora-rol',
    section: 'Costos',
    sectionSlug: 'costos',
    title: 'Costo por Hora por Rol',
    summary: 'Bar chart horizontal con la tarifa interna por hora de cada rol, ordenado descendente.',
    whatIs: 'Comparativo de tarifas internas. A diferencia del donut (que pondera por número de personas), aquí se ve el costo unitario por hora — útil para cotizar tiempo de un rol específico sin entrar al modelo financiero.',
    howCalculated: '`costoHoraByRol = costos.data.filter(c => c.costoHora > 0).map(c => ({ name: c.rol, costoHora: c.costoHora, recursos: c.recursos })).sort((a,b) => b.costoHora - a.costoHora)`.',
    whyMatters: 'Para presupuestos por hora (consultoría, soporte) este es el número base interno. Para precio al cliente, aplica encima el factor del modelo financiero.',
    sources: [
      { label: 'CostosSection.tsx · costoHoraByRol', href: `${GITHUB_BASE}/src/components/sections/CostosSection.tsx#L62-L67` },
    ],
  },
  {
    id: 'costos-por-hito',
    section: 'Costos',
    sectionSlug: 'costos',
    title: 'Costo Estimado Mensual por Q de entrega',
    summary: 'Cuánto cuesta al mes cada cuatrimestre del roadmap, sumando los proyectos activos prorrateados por participación.',
    whatIs: 'Agregación a nivel cuatrimestre de los costos prorrateados por proyecto. Solo incluye proyectos activos (estatus ≠ Done, ≠ On Hold). Cuatrimestres sin proyectos o con proyectos terminados no aparecen.',
    howCalculated: 'Para cada `projectCost`, se busca el `cuatrimestre` del proyecto (por `id`) y se acumula `estimatedMonthlyCost` en un Map por cuatrimestre. Proyectos sin cuatrimestre caen en "Sin cuatrimestre". Orden alfabético.',
    whyMatters: 'Permite priorizar inversión: si un cuatrimestre está al 80% pero cuesta poco, terminarlo es barato; uno al 30% y costoso es candidato a recortar scope o reagendar. Útil para conversaciones con el negocio sobre presupuesto por horizonte.',
    sources: [
      { label: 'CostosSection.tsx · costByHito', href: `${GITHUB_BASE}/src/components/sections/CostosSection.tsx#L148-L158` },
      { label: 'costEngine.ts · estimateProjectCost', href: `${GITHUB_BASE}/src/utils/costEngine.ts` },
    ],
  },
  {
    id: 'costos-composicion-precio',
    section: 'Costos',
    sectionSlug: 'costos',
    title: 'Composición del Precio al Cliente',
    summary: 'Bar chart que muestra la cascada del modelo financiero: valor experiencia → admin → margen → IVA → precio cliente.',
    whatIs: 'Visualización del modelo financiero aplicado al costo mensual total. Cada barra es un paso de la cascada con su porcentaje y su valor monetario. La última barra es el total facturable.',
    howCalculated: `Para cada step de \`applyFinancialModel(totalMensual, financialModel)\`:
- **Valor experiencia**: \`costo × valorExperienciaRate\` (markup base por know-how)
- **+ Admin**: \`valorExperiencia × costoAdminRate\` (overhead administrativo)
- **+ Margen**: \`(valorExperiencia + admin) × margenRate\` (utilidad comercial)
- **+ IVA**: \`(valorExperiencia + admin + margen) × ivaRate\` (impuesto)
- **Precio cliente**: suma de los cuatro anteriores`,
    whyMatters: 'Hace explícito el "delta" entre lo que se gasta y lo que se cobra. Cuando el cliente cuestiona el precio, esta cascada explica componente por componente cómo se llega ahí.',
    sources: [
      { label: 'CostosSection.tsx · waterfallData', href: `${GITHUB_BASE}/src/components/sections/CostosSection.tsx#L299-L330` },
      { label: 'costEngine.ts · applyFinancialModel', href: `${GITHUB_BASE}/src/utils/costEngine.ts` },
    ],
  },
  {
    id: 'costos-modelo-financiero',
    section: 'Costos',
    sectionSlug: 'costos',
    title: 'Modelo Financiero (Excel)',
    summary: 'Tabla con los pasos del modelo financiero del Excel: concepto, porcentaje y valor monetario, hasta llegar al precio cliente.',
    whatIs: 'Versión tabular de la cascada del precio. Lee los `steps` que vienen de `/api/costos-modelo` (filas 13-21 del Sheet) y los pinta tal cual, marcando subtotales y totales con tipografía bold.',
    howCalculated: `Cada \`financialModel.steps[i]\` tiene \`{ label, factor, value, kind }\`. La tabla pinta:
- \`label\` en la primera columna (bold si \`kind === 'total' | 'subtotal'\`)
- \`factor × 100 + '%'\` en la columna del medio (o '—' si el step no tiene factor)
- \`formatMoneyFull(value)\` a la derecha (formato \`$X,XXX.XX\`, no abreviado)`,
    whyMatters: 'Es la fuente de verdad del pricing: cualquier cifra de "precio al cliente" en el dashboard se origina en estas filas. Si el modelo cambia (e.g. el dueño del Excel sube margen del 25% al 30%), basta refrescar para que toda la sección recalcule.',
    sources: [
      { label: '/api/costos-modelo.ts', href: `${GITHUB_BASE}/src/pages/api/costos-modelo.ts` },
      { label: 'CostosSection.tsx · tabla modelo', href: `${GITHUB_BASE}/src/components/sections/CostosSection.tsx#L332-L357` },
    ],
  },
  {
    id: 'costos-detalle-rol',
    section: 'Costos',
    sectionSlug: 'costos',
    title: 'Detalle por Rol',
    summary: 'Tabla con todos los roles del equipo: recursos, horas, costo mensual, costo/hora, horas totales y costo total mensual.',
    whatIs: 'Lectura directa de la hoja Costos (filas 1-12). Cada fila es un rol con sus parámetros de costeo. La fila final agrega totales.',
    howCalculated: `Itera \`costos.data\` y pinta columnas:
- **Recursos** = \`c.recursos\` (headcount)
- **Hrs/recurso** = \`c.horasRecurso\` (jornada mensual por persona)
- **$/Mensual** = \`formatMoney(c.costoMensual)\` (costo unitario por persona)
- **$/Hora** = \`c.costoHora\` redondeado
- **Hrs total** = \`c.horas\` (\`horasRecurso × recursos\`)
- **Total** = \`formatMoney(c.total)\` (\`costoMensual × recursos\`)`,
    whyMatters: 'Vista detallada para auditar: si un KPI o gráfica se ve raro, esta tabla revela en qué fila/rol está el origen. También es la referencia para verificar que la hoja Costos esté bien capturada.',
    sources: [
      { label: 'CostosSection.tsx · roles table', href: `${GITHUB_BASE}/src/components/sections/CostosSection.tsx#L364-L400` },
    ],
  },
  {
    id: 'costos-por-proyecto',
    section: 'Costos',
    sectionSlug: 'costos',
    title: 'Costo Estimado por Proyecto',
    summary: 'Cards de proyectos activos con costo interno prorrateado, breakdown por persona y, si hay modelo, precio al cliente y utilidad.',
    whatIs: 'Las cards principales del costeo por proyecto. Solo incluye proyectos activos (estatus ≠ Done, ≠ On Hold) ordenados de mayor a menor costo. Si el modelo financiero está cargado, cada card también muestra el precio al cliente y el delta de utilidad.',
    howCalculated: `Por cada proyecto activo:
1. Para cada miembro del equipo (arquitecto, PM, devs), buscar costo del rol en \`costos.data\` con fuzzy matching.
2. Contar \`activeProjects\` para esa persona: proyectos donde participa y estatus ≠ Done.
3. **Prorratear**: \`share = costoMensual / max(1, activeProjects)\`.
4. **estimatedMonthlyCost** = Σ shares.

Si \`financialModel\` existe, se calcula además \`applyFinancialModel(estimatedMonthlyCost, financialModel)\` para mostrar \`precioCliente\` y \`utilidad\`.

**Importante**: el filtro PM acota qué proyectos se iteran, pero el divisor (\`activeProjects\`) sigue contando sobre \`projects.data\` completo para no inflar artificialmente las shares cuando hay un PM seleccionado.`,
    whyMatters: 'Convierte la nómina abstracta en cifras por proyecto: identifica los más caros, detecta inflación de equipo (8 devs prorrateados al 12% indican poca dedicación real) y compara costo interno vs precio al cliente para ver dónde la utilidad es delgada o negativa.',
    sources: [
      { label: 'CostosSection.tsx · projectCosts', href: `${GITHUB_BASE}/src/components/sections/CostosSection.tsx#L70-L145` },
      { label: 'costEngine.ts · estimateProjectCost', href: `${GITHUB_BASE}/src/utils/costEngine.ts#L100-L148` },
    ],
  },

  // ---------------- Distribución de Puntos ----------------
  {
    id: 'distribucion-kpi-total',
    section: 'Distribución de Puntos',
    sectionSlug: 'distribucion',
    title: 'Puntos totales',
    summary: 'Σ del campo `puntos` de los proyectos visibles. Tamaño bruto del portafolio en esfuerzo.',
    whatIs: 'Suma simple de story points sin distinguir estatus. Si el filtro de PM está activo, agrega solo los proyectos de ese PM.',
    howCalculated: '`data.reduce((s, p) => s + p.puntos, 0)`',
    whyMatters: 'Es el denominador de cualquier análisis de carga: contra él se mide cuántos puntos están entregados, activos o en On Hold. Un total que crece sin que crezcan los entregados es una señal de acumulación.',
    sources: [
      { label: 'DistribucionPuntosSection.tsx · totalPoints', href: `${GITHUB_BASE}/src/components/sections/DistribucionPuntosSection.tsx#L37` },
    ],
  },
  {
    id: 'distribucion-kpi-done',
    section: 'Distribución de Puntos',
    sectionSlug: 'distribucion',
    title: 'Puntos entregados',
    summary: 'Σ de story points de proyectos con estatus Done. Throughput acumulado en puntos.',
    whatIs: 'Mide cuánto esfuerzo se ha cerrado históricamente. A diferencia del conteo de proyectos Done, refleja el peso real entregado: 5 proyectos de 8 puntos pesan más que 10 de 1 punto.',
    howCalculated: "`data.filter(p => p.estatus === 'Done').reduce((s, p) => s + p.puntos, 0)`",
    whyMatters: 'Combinado con Puntos totales, permite calcular el % de cierre del portafolio. Para tendencia temporal de entrega usa snapshots semanales o /pronosticos · Planeación.',
    sources: [
      { label: 'DistribucionPuntosSection.tsx · donePoints', href: `${GITHUB_BASE}/src/components/sections/DistribucionPuntosSection.tsx#L38` },
    ],
  },
  {
    id: 'distribucion-kpi-activos',
    section: 'Distribución de Puntos',
    sectionSlug: 'distribucion',
    title: 'Puntos activos',
    summary: 'Σ de story points de proyectos vivos (excluye Done, On Hold y Cancelado). Carga real en curso.',
    whatIs: 'Mide el esfuerzo comprometido pero no entregado. Excluye Done (ya cerrado) y On Hold (pausado) para reflejar la carga que pesa sobre el equipo hoy.',
    howCalculated: "`data.filter(p => isActive(p.estatus)).reduce((s, p) => s + p.puntos, 0)` — `isActive` excluye Done, On Hold y Cancelado",
    whyMatters: 'Es la métrica más útil para planeación: dividida por la velocity del equipo (puntos por semana) da una estimación gruesa de cuántas semanas falta para vaciar el backlog actual.',
    sources: [
      { label: 'DistribucionPuntosSection.tsx · activePoints', href: `${GITHUB_BASE}/src/components/sections/DistribucionPuntosSection.tsx#L39` },
    ],
  },
  {
    id: 'distribucion-kpi-promedio',
    section: 'Distribución de Puntos',
    sectionSlug: 'distribucion',
    title: 'Promedio / proyecto',
    summary: 'Tamaño medio de un proyecto del portafolio, en story points.',
    whatIs: 'Story points totales divididos entre el conteo de proyectos visibles. Sirve como referencia para clasificar nuevos proyectos: por arriba del promedio = grande, por abajo = chico.',
    howCalculated: '`data.length > 0 ? Math.round(totalPoints / data.length) : 0`',
    whyMatters: 'Útil durante grooming: si un proyecto recibe 30 puntos y el promedio es 8, probablemente debería partirse. También revela si el portafolio se está poblando de proyectos chicos o megaproyectos.',
    sources: [
      { label: 'DistribucionPuntosSection.tsx · avgPerProject', href: `${GITHUB_BASE}/src/components/sections/DistribucionPuntosSection.tsx#L40` },
    ],
  },
  {
    id: 'distribucion-por-cliente',
    section: 'Distribución de Puntos',
    sectionSlug: 'distribucion',
    title: 'Puntos por Cliente',
    summary: 'Donut de la concentración de story points por cliente. Muestra qué cliente pesa más en el portafolio.',
    whatIs: 'Agrupa los proyectos por el campo `cliente` y suma sus puntos. Cada sector del donut representa un cliente; los proyectos sin cliente declarado o con valor "Sin dato" se excluyen.',
    howCalculated: `\`groupByField(data, 'cliente')\` agrupa, luego para cada grupo:
- **puntos** = Σ p.puntos de los proyectos del cliente
- **proyectos** = conteo

Filtra grupos vacíos / "Sin dato" / puntos = 0, ordena descendente por puntos.`,
    whyMatters: 'Concentración de riesgo: si un cliente acumula >40% de los puntos, perderlo o que se atrase impacta desproporcionadamente al equipo. También sirve para conversaciones comerciales.',
    sources: [
      { label: 'DistribucionPuntosSection.tsx · byCliente', href: `${GITHUB_BASE}/src/components/sections/DistribucionPuntosSection.tsx#L43-L54` },
    ],
  },
  {
    id: 'distribucion-por-arquitecto',
    section: 'Distribución de Puntos',
    sectionSlug: 'distribucion',
    title: 'Puntos por Arquitecto (Done vs Pendiente)',
    summary: 'Barras apiladas por arquitecto: verde = puntos entregados, azul = puntos pendientes. Detecta desbalances de carga.',
    whatIs: 'Cada barra representa un arquitecto; la altura total es el total de puntos asignados, partido entre entregados (Done) y pendientes (cualquier otro estatus, incluido On Hold). Un proyecto con varios arquitectos ("Luis, George") cuenta sus puntos para cada uno.',
    howCalculated: `Se separa el campo \`arquitecto\` con \`splitMulti\` y se acumula por persona. Para cada arquitecto:
- **puntos** = Σ p.puntos
- **done** = Σ p.puntos donde estatus === 'Done'
- **pending** = Σ p.puntos donde estatus !== 'Done'`,
    whyMatters: 'Si un arquitecto tiene 80 puntos pendientes mientras el resto tiene 20, el portafolio tiene un cuello de botella. También revela si quien acumula más Done es quien también carga lo pendiente — combinación típica de sobre-asignación.',
    sources: [
      { label: 'DistribucionPuntosSection.tsx · byArquitecto', href: `${GITHUB_BASE}/src/components/sections/DistribucionPuntosSection.tsx#L86-L98` },
    ],
  },
  {
    id: 'distribucion-por-epica',
    section: 'Distribución de Puntos',
    sectionSlug: 'distribucion',
    title: 'Puntos por Épica',
    summary: 'Barras horizontales con los puntos asignados a cada épica del portafolio. Identifica épicas pesadas.',
    whatIs: 'Agrupa proyectos por el campo `epica` y suma puntos. Cada barra es una épica; las épicas sin nombre o "Sin dato" se omiten.',
    howCalculated: `\`groupByField(data, 'epica')\` agrupa, luego para cada épica:
- **puntos** = Σ p.puntos
- **proyectos** = conteo
- **avgProgress** = \`round((Σ p.progreso / count) × 100)\``,
    whyMatters: 'La épica es la unidad de negocio más cercana a stakeholders. Una épica con muchos puntos pero baja avgProgress es candidata a riesgo; muchos puntos + alto avgProgress es señal de cierre próximo.',
    sources: [
      { label: 'DistribucionPuntosSection.tsx · byEpica', href: `${GITHUB_BASE}/src/components/sections/DistribucionPuntosSection.tsx#L57-L69` },
    ],
  },
  {
    id: 'distribucion-por-cuenta',
    section: 'Distribución de Puntos',
    sectionSlug: 'distribucion',
    title: 'Puntos por Q de entrega',
    summary: 'Barras horizontales por cuatrimestre del roadmap. Complementa la vista por cliente/producto.',
    whatIs: 'Agrupa proyectos por el campo `cuatrimestre` y suma puntos. (Reemplaza la antigua vista por `cuenta`, campo que ya no existe en la hoja.)',
    howCalculated: `\`groupByField(data, 'cuatrimestre')\` agrupa, luego para cada cuatrimestre:
- **puntos** = Σ p.puntos
- **proyectos** = conteo`,
    whyMatters: 'Permite ver la concentración de esfuerzo por horizonte de entrega: qué cuatrimestre carga más story points. Útil para balancear el roadmap.',
    sources: [
      { label: 'DistribucionPuntosSection.tsx · byCuenta', href: `${GITHUB_BASE}/src/components/sections/DistribucionPuntosSection.tsx#L72-L83` },
    ],
  },
  {
    id: 'distribucion-tipo-tarea',
    section: 'Distribución de Puntos',
    sectionSlug: 'distribucion',
    title: 'Distribución por Tipo de Trabajo',
    summary: 'Pie chart con la mezcla de tipos de tarea (Mejora, Corrección, Nueva característica, Managment, Ayuda…). Usa colores semánticos vía `getTipoTareaColor`.',
    whatIs: 'Conteo de tareas (no proyectos) agrupadas por el campo `tipo` (naturaleza del trabajo). Se nutre de `/api/tareas` y el color de cada segmento sale de la paleta semántica en `colors.ts`. Movido desde Cronograma porque pertenece al análisis de mezcla de esfuerzo del portafolio, no al sprint diario.',
    howCalculated: '`byTipoTarea = Map<tipo, count>` sobre `tareas`, convertido a `[{ name, value }]` y ordenado descendente. **No** se filtra por PM — refleja el universo completo de actividades del equipo.',
    whyMatters: 'Permite ver el sesgo del esfuerzo: si una iteración tiene 70% Análisis y 10% App, es señal de que el trabajo va arriba del stack. También útil para detectar carga atípica de SQA antes de un release.',
    sources: [
      { label: 'DistribucionPuntosSection.tsx · byTipoTarea', href: `${GITHUB_BASE}/src/components/sections/DistribucionPuntosSection.tsx` },
      { label: 'colors.ts · getTipoTareaColor', href: `${GITHUB_BASE}/src/utils/colors.ts` },
    ],
  },

  // ---------------- Equipo ----------------
  {
    id: 'equipo-kpi-total',
    section: 'Equipo',
    sectionSlug: 'equipo',
    title: 'Total personas',
    summary: 'Cantidad de personas en el registro canónico del equipo (tabla `equipo` de Turso).',
    whatIs: 'Conteo de filas del registro `equipo` traído por `GET /api/equipo`. El registro es la fuente de verdad de "quién existe" — ya no se deriva de los campos de Projects. Incluye gente con y sin acceso al dashboard.',
    howCalculated: '`total = equipo.length` sobre la respuesta de `/api/equipo`. El registro lo mantiene RH/PM desde el modal de gestión (gateado por `action:equipo:manage`).',
    whyMatters: 'Da el tamaño real del equipo registrado, independiente de en cuántos proyectos aparezca cada quien. Es estable: no infla ni encoge según los apodos tecleados en Projects.',
    sources: [
      { label: 'EquipoSection.tsx · total', href: `${GITHUB_BASE}/src/components/sections/EquipoSection.tsx` },
      { label: 'api/equipo.ts', href: `${GITHUB_BASE}/src/pages/api/equipo.ts` },
    ],
  },
  {
    id: 'equipo-kpi-arquitectos',
    section: 'Equipo',
    sectionSlug: 'equipo',
    title: 'Activos',
    summary: 'Personas del registro marcadas como activas (siguen en el equipo, independiente de si tienen acceso al dashboard).',
    whatIs: 'Subconjunto del registro con `active = true`. `active` significa "sigue en el equipo para seguimiento" — NO significa "tiene login". Dar de baja a alguien lo deja inactivo sin perder su histórico.',
    howCalculated: '`activos = equipo.filter(p => p.active).length`. El flag `active` se edita desde el modal de gestión del registro.',
    whyMatters: 'Distingue el equipo vigente del histórico. Una caída aquí refleja bajas reales; el delta vs Total muestra cuánta gente quedó archivada.',
    sources: [
      { label: 'EquipoSection.tsx · activos', href: `${GITHUB_BASE}/src/components/sections/EquipoSection.tsx` },
    ],
  },
  {
    id: 'equipo-kpi-developers',
    section: 'Equipo',
    sectionSlug: 'equipo',
    title: 'Con acceso',
    summary: 'Personas del registro que además tienen una cuenta de login al dashboard (puente `user.equipoId`).',
    whatIs: 'Subconjunto con `hasLogin = true`: existe una fila en la tabla `user` (Better-Auth) ligada a esa persona vía `user.equipoId`. La mayoría del equipo NO tiene login (se les da seguimiento pero no entran al tablero).',
    howCalculated: '`conAcceso = equipo.filter(p => p.hasLogin).length`. `hasLogin` lo calcula `GET /api/equipo` con un `count` de `user` donde `user.equipoId = equipo.id`.',
    whyMatters: 'Es la base del scoping por identidad (Fase 5): quién puede iniciar sesión y, por tanto, a quién aplica filtrar datos por su propia identidad. Crece sólo cuando se otorga acceso explícito.',
    sources: [
      { label: 'EquipoSection.tsx · conAcceso', href: `${GITHUB_BASE}/src/components/sections/EquipoSection.tsx` },
      { label: 'api/equipo.ts · login_count', href: `${GITHUB_BASE}/src/pages/api/equipo.ts` },
    ],
  },
  {
    id: 'equipo-directorio',
    section: 'Equipo',
    sectionSlug: 'equipo',
    title: 'Directorio del equipo',
    summary: 'Grid de cards per-persona del registro `equipo` con puesto/rango, conteo de proyectos, progreso, puntos y estatus. Selectores para **Agrupar** (Categoría / Departamento / Rol) y **Ordenar** (Carga / Pts / Críticos). Click abre el perfil.',
    whatIs: 'Cada card es una persona del registro `equipo` (no derivada de Projects). Muestra (1) avatar con inicial, (2) nombre canónico + título/banda + apodo, (3) chips (banda, **rango** Jr/Mid/Sr/Arq, departamento, "Acceso", "Inactivo"), (4) tres stats — proyectos, progreso, puntos — cruzados con Projects, (5) barra de progreso y (6) mini-badges de estatus. Con `action:equipo:manage` aparece el lápiz para editar y "Agregar miembro".',
    howCalculated: `La espina es \`GET /api/equipo\`. El enriquecimiento de proyectos cruza por **id resuelto** (no por nombre): un proyecto cuenta para la persona si \`p.pmIds.includes(person.id) || p.arquitectoIds.includes(person.id) || p.devIds.includes(person.id)\` (los ids los resuelve \`equipoResolver\` en el server). Sobre los proyectos deduplicados:
- \`projectCount = uniqueProjects.length\`
- \`avgProgress = round(sum(progreso) / projectCount × 100)\`
- \`totalPoints = sum(puntos)\`
- \`criticalCount = count(estatus ∈ {Blocked / Critical, At Risk})\`
- \`statuses[s] = count(proyectos con estatus = s)\`

**Agrupar** (HU NAV-74): *Categoría* deriva de \`rol\` (Tecnología/Management/UX-UI/Servicio/Dirección, ver \`roleCategory\`), *Departamento* usa la unidad de negocio cruda, *Rol* usa el nombre de rol. **Ordenar**: Carga (proyectos), Pts (puntos), Críticos (\`criticalCount\`) — siempre con activos primero. Persistido en \`usePersistedFilters('equipo')\`.`,
    whyMatters: 'Es el punto de entrada visual para entender quién tiene qué carga y abrir el drill-down. Agrupar por Categoría responde "¿cómo está repartido el equipo por disciplina?"; ordenar por Críticos o Carga revela quién está saturado. El cruce por id estable evita el doble-conteo del viejo matching por nombre.',
    sources: [
      { label: 'EquipoSection.tsx', href: `${GITHUB_BASE}/src/components/sections/EquipoSection.tsx` },
      { label: 'equipoResolver.ts', href: `${GITHUB_BASE}/src/lib/equipoResolver.ts` },
    ],
  },
  {
    id: 'equipo-capacity-heatmap',
    section: 'Equipo',
    sectionSlug: 'equipo',
    title: 'Heatmap de Capacidad y Carga',
    summary: 'Matriz persona × semana coloreada por la razón puntos / velocidad. Verde = carga adecuada, amarillo = ajustada, naranja/rojo = sobrecarga. Past = entregado, futuro = pendiente.',
    whatIs: `Visualización del **horizonte cercano** del equipo. Cada fila es una persona activa, cada columna una semana. La celda muestra los puntos de la persona en esa semana, **coloreados según una razón** \`valor / velocidad\` que indica si la carga es razonable, ajustada o excesiva. La columna actual se marca con un anillo azul; las semanas pasadas se atenúan en el header.

Por cada celda:
- **Semanas pasadas**: muestra puntos cerrados (\`finReal\` cae en esa semana).
- **Semana actual y futuras**: muestra puntos pendientes con \`finEstimado\` en esa semana. Los puntos **vencidos** (\`finEstimado < hoy\` y no Done) se agregan al cubo de la semana actual.

A la izquierda de cada fila, dos métricas resumen:
- **Velocidad**: pts/semana cerrados en las últimas 8 semanas (= base para colorear las celdas).
- **Pendiente**: pts totales no-Done y no-cancelados + semanas para limpiarlos al ritmo actual + pts vencidos (si los hay).`,
    howCalculated: `**Velocidad histórica** (por persona, ventana fija de 8 sem):
\`velocity = Σpts cerrados (finReal ≥ hoy−8sem) / # semanas con al menos una entrega\`.

**Carga por celda**:
- \`pending(p, w) = Σpts pendientes con finEstimado en semana w + (si w = semana actual) overdue\`
- \`delivered(p, w) = Σpts cerrados con finReal en semana w\`
- \`displayValue = (w pasada) ? delivered : pending\`

**Color** (\`ratio = displayValue / velocity\`):
- 0 → "Sin carga" (slate-800/30, vacío)
- ratio < 0.5 → **Subutilizada** (teal-500/15)
- 0.5–0.9 → **Carga adecuada** (green-500/30)
- 0.9–1.3 → **Carga ajustada** (yellow-500/40)
- 1.3–1.8 → **Sobrecarga** (orange-500/60)
- ratio ≥ 1.8 → **Crítico** (red-500/75)
- \`velocity = 0\` y carga > 0 → **Sin velocidad histórica** (gris): no hay base para razonar.

**Filtros persistidos** (\`usePersistedFilters('equipo-capacidad')\`):
- Ventana: 4 / 8 (default) / 12 semanas, repartidas 25% pasado / 75% presente+futuro.
- Ordenar: Sobrecarga (default — más celdas naranja/rojo arriba), Velocidad, Nombre, Pendiente.
- "Mostrar personas sin carga": incluir personas activas sin entregas ni pendientes (default OFF).

**Cruce por id resuelto**: las tareas se agrupan por \`asignadoId\` (resuelto en el server por \`equipoResolver\`), no por nombre. Personas sin \`asignadoId\` resoluble quedan fuera.`,
    whyMatters: 'Responde la pregunta operativa más importante de un PM/gerente: "¿a quién puedo asignar este proyecto sin reventarlo?" en 5 segundos. El strip de resumen (Sobrecargadas, Subutilizadas, Pts vencidos) sirve de alerta. El detalle por celda permite ir más al grano: "Lorena tiene cuello la próxima semana, pero la siguiente está libre, así que mueve el deadline".',
    sources: [
      { label: 'CapacityHeatmap.tsx', href: `${GITHUB_BASE}/src/components/sections/equipo/CapacityHeatmap.tsx` },
      { label: 'EquipoSection.tsx', href: `${GITHUB_BASE}/src/components/sections/EquipoSection.tsx` },
    ],
  },
  {
    id: 'equipo-costos-total',
    section: 'Equipo',
    sectionSlug: 'equipo',
    title: 'Costo total/mes del equipo',
    summary: 'Suma del costo mensual prorrateado de cada persona activa (o todas si se incluyen inactivas). Cruza el registro `equipo` con `estimatePersonCost`.',
    whatIs: 'Cuánto le cuesta a la organización mantener al equipo cada mes, agregado. No es lo mismo que el costo total de los proyectos: incluye también a personas idle (sin proyectos activos asignados).',
    howCalculated: '`totalCost = Σ estimatePersonCost(person.id, projects, costos).monthlyCost` sobre las personas que pasan el filtro de actividad. La detección del rol funcional de cada persona se hace por participación en proyectos (mismo patrón que [persona-detalle-kpi-costo-mes]).',
    whyMatters: 'Es el denominador de cualquier conversación de eficiencia: si el equipo cuesta $X y el portafolio activo factura $Y, ¿es sostenible? Cruza con [equipo-costos-absorbido] para ver qué fracción se está convirtiendo en trabajo entregable.',
    sources: [
      { label: 'CostosEquipo.tsx · summary', href: `${GITHUB_BASE}/src/components/sections/equipo/CostosEquipo.tsx` },
      { label: 'costEngine.ts · estimatePersonCost', href: `${GITHUB_BASE}/src/utils/costEngine.ts` },
    ],
  },
  {
    id: 'equipo-costos-absorbido',
    section: 'Equipo',
    sectionSlug: 'equipo',
    title: 'Costo absorbido por proyectos',
    summary: 'Parte del costo total que se está "consumiendo" en proyectos activos. El % al lado es la utilización agregada del equipo.',
    whatIs: 'Costo mensual de personas que SÍ tienen al menos un proyecto activo (estatus ≠ Done, ≠ On Hold). El % es `absorbido / total × 100`.',
    howCalculated: `Por persona, **modelo binario** (limitación del costEngine actual):
- Si tiene ≥1 proyecto activo → \`absorbed = monthlyCost\` (su costo entero se considera absorbido).
- Si no tiene proyectos activos → \`absorbed = 0\` (todo su costo se va a [equipo-costos-idle]).

Agregado: \`totalAbsorbed = Σ absorbed\`, \`utilization = totalAbsorbed / totalCost × 100\`.

**Por qué binario**: el modelo no rastrea horas asignadas por persona-proyecto, sólo conoce la lista de proyectos activos. Una persona en 1 proyecto cuenta igual que una en 5. Para granularidad mayor habría que cargar capacidades en horas por persona × proyecto (existe \`/api/capacidades\` pero por sprint, no por persona-proyecto).`,
    whyMatters: 'Utilización < 80% es un foco de oportunidad: significa que estás pagando a alguien que no está trabajando en algo activo del portafolio. Puede ser por benching legítimo (post-rollout, vacaciones, formación) o por subasignación. La tabla de abajo muestra quiénes.',
    sources: [
      { label: 'CostosEquipo.tsx', href: `${GITHUB_BASE}/src/components/sections/equipo/CostosEquipo.tsx` },
    ],
  },
  {
    id: 'equipo-costos-idle',
    section: 'Equipo',
    sectionSlug: 'equipo',
    title: 'Costo idle',
    summary: 'Costo mensual de personas activas sin proyectos asignados. Si es >0, la card se resalta en ámbar.',
    whatIs: 'El espejo de [equipo-costos-absorbido]. Mientras más cerca de $0, más cargado está el equipo. Si es muy alto, hay sobre-staffing o subasignación.',
    howCalculated: '`totalIdle = totalCost − totalAbsorbed`. El número de personas idle: `idlePeople = count(persona donde activeProjects.length === 0 y monthlyCost > 0)`.',
    whyMatters: 'Idle no es necesariamente malo (benching post-proyecto, formación, vacaciones), pero idle no-explicado durante semanas indica que el roadmap no está aprovechando capacidad disponible. Es input para decisiones de hiring (no contratar si hay capacidad ociosa) y de pricing (proyectos extra-cargo).',
    sources: [
      { label: 'CostosEquipo.tsx', href: `${GITHUB_BASE}/src/components/sections/equipo/CostosEquipo.tsx` },
    ],
  },
  {
    id: 'equipo-costos-tasa-prom',
    section: 'Equipo',
    sectionSlug: 'equipo',
    title: 'Tasa promedio ponderada por hora',
    summary: '`$/hr` promedio del equipo, **ponderada por el costo mensual** de cada persona (no por cabeza).',
    whatIs: 'A diferencia de un promedio simple, esta tasa pondera a las personas más caras más fuerte. Refleja "cuánto cuesta una hora promedio del equipo si pagas a todos en proporción a su tamaño".',
    howCalculated: '`weightedHourly = Σ (costoHora_i × monthlyCost_i) / Σ monthlyCost_i`. Equivale a dar más peso a personas senior y menos peso a juniors al promediar.',
    whyMatters: 'Útil para cotizar: si un proyecto va a consumir N horas-equipo, multiplica por esta tasa y tienes un estimado realista (un promedio simple subestima al pegarle más peso a los juniors). En CostosSection clásica el cálculo es similar pero usa `recursos` de la hoja, aquí usa la composición real del registro `equipo`.',
    sources: [
      { label: 'CostosEquipo.tsx · weightedHourly', href: `${GITHUB_BASE}/src/components/sections/equipo/CostosEquipo.tsx` },
    ],
  },
  {
    id: 'equipo-costos-distribucion',
    section: 'Equipo',
    sectionSlug: 'equipo',
    title: 'Distribución por banda de rol',
    summary: 'Barras horizontales con el costo mensual agrupado por `equipo.roleName` (la banda que asigna RH, no el rol detectado funcional). Tooltip muestra # personas + % del total.',
    whatIs: 'Cómo se reparte el costo mensual total entre las bandas de rol del registro `equipo` (e.g. "Dev Sr", "PM Mid", "Arq", "Dir"). Las personas sin banda asignada caen en "Sin banda asignada".',
    howCalculated: `Para cada persona con \`monthlyCost > 0\`:
- key = \`person.roleName || 'Sin banda asignada'\`
- \`byRole[key].cost += person.monthlyCost\`, \`byRole[key].people += 1\`

Ordenado por costo descendente. Color asignado round-robin del array \`ROLE_COLORS\`.

**Nota**: la banda \`roleName\` viene del registro \`equipo\` (la asigna admin), pero el \`monthlyCost\` se calcula con el rol funcional detectado en proyectos. Si una persona con banda "Dev Mid" trabaja casi siempre como Arquitecto, su costo aquí se carga a "Dev Mid" pero el monto refleja la tarifa de Arq. Es una simplificación intencional.`,
    whyMatters: 'Responde "¿en qué bandas estamos gastando más?" en un golpe de vista. Si "Dev Sr" representa 60% del costo pero solo entrega 30% de los puntos, hay un problema de alocación. Si "Dir" pesa 25% y solo hay 1 persona, hay un cuello.',
    sources: [
      { label: 'CostosEquipo.tsx · byRole', href: `${GITHUB_BASE}/src/components/sections/equipo/CostosEquipo.tsx` },
    ],
  },
  {
    id: 'equipo-costos-tabla',
    section: 'Equipo',
    sectionSlug: 'equipo',
    title: 'Costo por persona (tabla)',
    summary: 'Una fila por persona con costo/mes, $/hr, barra de utilización absorbido↔idle, y # proyectos activos. Ordenable por Costo / Utilización / Proyectos / Nombre.',
    whatIs: `Tabla detallada del costo per cápita. Cada fila:
- **Avatar + nombre** (click → ficha de persona)
- **Costo/mes** con mini-barra proporcional al máximo del equipo (compara visualmente quién es el más caro)
- **$/hr** (costoHora del rol funcional detectado)
- **Utilización**: barra azul/ámbar mostrando absorbido vs idle. 100% azul = todo absorbido por proyectos activos; 0% (todo ámbar) = idle total.
- **# Proyectos**: cuántos activos tiene la persona

Filtros:
- Toggle "Incluir inactivos" (persiste en \`equipo-costos\`)
- Sort: Costo (default) / Utilización (idle primero) / Proyectos / Nombre`,
    howCalculated: 'Mismo `estimatePersonCost` por persona. La utilización es binaria (ver [equipo-costos-absorbido]): 0% o 100% según si tiene proyectos activos.',
    whyMatters: 'Es el drill-down operativo. Cuando el strip dice "hay $30K idle", esta tabla te dice exactamente quiénes son las 3 personas que aportan ese idle. Para 1:1s, planeación y conversación con RH.',
    sources: [
      { label: 'CostosEquipo.tsx · sortedRows', href: `${GITHUB_BASE}/src/components/sections/equipo/CostosEquipo.tsx` },
    ],
  },
  {
    id: 'equipo-comparativa',
    section: 'Equipo',
    sectionSlug: 'equipo',
    title: 'Comparativa side-by-side',
    summary: 'Selecciona 2 o 3 personas y compara sus KPIs en paralelo, agrupados en Throughput, Calidad, Carga y Costo. Radar overlay arriba, tabla horizontal abajo. ★ marca la mejor por métrica direccional.',
    whatIs: `Tab de \`/equipo\` para comparar de un vistazo el rendimiento de 2-3 miembros. Útil para:
- **Evaluaciones / 1:1s**: ver cómo compara la persona contra peers reales.
- **Asignaciones**: decidir entre candidatos para un proyecto nuevo.
- **Promociones / retroalimentación**: respaldar decisiones con datos.

Estructura:
1. **Chips de selección** con color por persona (azul / verde / amarillo). Click "Agregar persona" abre un buscador.
2. **Radar overlay** con 5 ejes normalizados a 0-100: Completación, Progreso, Salud, Puntualidad, Capacidad. Una serie por persona, semi-transparente, para ver el "perfil" de cada quien.
3. **Tabla horizontal** con 14 métricas agrupadas en 4 categorías. Cada celda muestra el valor + una barra coloreada proporcional al máximo entre los seleccionados. **Trofeo ★** = mejor según la dirección de la métrica:
   - **Throughput** (más es mejor): proyectos completados, pts entregados, velocidad, tareas completadas.
   - **Calidad** (más/menos según métrica): health score ↑, puntualidad ↑, completación ↑, progreso ↑, **tareas atrasadas ↓**.
   - **Carga** (neutral): proyectos en riesgo, tareas activas, pts pendientes — solo informativo, no se highlight-ea ganador.
   - **Costo** (neutral, oculto si \`data:costos\` está denegado o nadie tiene datos): costo mensual, costo por hora.

**Estado efímero**: la selección NO persiste entre recargas — la comparativa es típicamente puntual ("comparar X y Y ahora"), no continua.`,
    howCalculated: `**Métricas por persona** (\`computeMetrics()\` en \`Comparativa.tsx\`):
- \`personProjects\` = proyectos donde \`p.{arquitectoIds | pmIds | devIds | poIds | sqaIds}.includes(personId)\`.
- \`personTareas\` = \`tareas.filter(t => t.asignadoId === personId)\`.
- Métricas derivadas (avgHealth, onTimeRate, donePoints, velocidad pts/sem en ventana 8s, etc.) replican la lógica de \`/persona/[id]\` para mantener coherencia.

**Detección del ganador** (★):
- Solo si \`metric.direction !== 'neutral'\` Y hay ≥2 valores válidos (sin N/A) Y \`max !== min\` (sin empates triviales todo-igual).
- Empates entre múltiples ganadores: todos reciben el trofeo.
- Métricas con \`isNA\` (\`onTimeRate < 0\`, \`monthlyCost === 0\`) no participan del cómputo.

**Costo**: \`estimatePersonCost\` corre per-persona; si TODOS los seleccionados tienen costo = 0, la categoría se oculta entera para no llenar la tabla de "—". Si \`/api/costos\` retorna 403 (rol sin acceso), también se oculta.

**Cruce por id resuelto** en todas las métricas (mismo patrón que [persona-detalle-kpi-strip] y [equipo-capacity-heatmap]) — sin fuzzy match local.`,
    whyMatters: 'Los KPIs de una persona aislada cuentan media historia: "Lore tiene 72 de health". Comparados ("Lore 72, Hugo 68, Edgar 78") inmediatamente dan contexto. Esto reduce el sesgo en conversaciones de evaluación y permite identificar a quién apoyar / promover / asignar con base en datos, no en percepción.',
    sources: [
      { label: 'Comparativa.tsx', href: `${GITHUB_BASE}/src/components/sections/equipo/Comparativa.tsx` },
      { label: 'EquipoSection.tsx', href: `${GITHUB_BASE}/src/components/sections/EquipoSection.tsx` },
    ],
  },
  {
    id: 'equipo-comparativa-radar',
    section: 'Equipo',
    sectionSlug: 'equipo',
    title: 'Radar de Vista de Conjunto',
    summary: 'Radar overlay con 5 ejes normalizados (0-100) para ver el "perfil" de cada persona seleccionada. Una serie semi-transparente por persona.',
    whatIs: `Gráfico tipo radar (estilo "telaraña") con 5 dimensiones que viajan en escala 0-100, así son comparables sin importar la métrica original. Cada persona seleccionada aparece como un polígono coloreado con su color (azul / verde / amarillo); la transparencia permite ver superposiciones.

**Ejes**:
- **Completación** = \`completionRate\` (% de proyectos Done).
- **Progreso** = \`avgProgress\` (% promedio de avance de los proyectos asignados).
- **Salud** = \`avgHealth\` (health score promedio, ya 0-100).
- **Puntualidad** = \`onTimeRate\` (% de proyectos Done a tiempo; si no aplica, cae a 0 para el radar — no se distorsiona la silueta).
- **Capacidad** = \`min(100, projects × 15)\` — proxy de "cuántos proyectos puede manejar simultáneamente" (igual al de \`/persona/[id]\`).`,
    howCalculated: 'Estructura plana para Recharts: `[{ metric: \'Completación\', personA: 60, personB: 75 }, ...]`. Cada `Radar` series se identifica por `dataKey = personId` y color de `PERSON_COLORS[index]`. Los valores < 0 se clamp-ean a 0 (la puntualidad "N/A" no debe inflar artificialmente).',
    whyMatters: 'Una tabla con 14 filas es exhaustiva pero pesada de leer. El radar comprime 5 dimensiones en una silueta de un vistazo: "Lore es generalista (polígono uniforme), Hugo está super-especializado en puntualidad (pico en un eje), Edgar es nuevo (polígono pequeño)". Sirve como heurística rápida antes de bucear en la tabla.',
    sources: [
      { label: 'Comparativa.tsx · radar', href: `${GITHUB_BASE}/src/components/sections/equipo/Comparativa.tsx` },
    ],
  },
  {
    id: 'equipo-organigrama',
    section: 'Equipo',
    sectionSlug: 'equipo',
    title: 'Organigrama del equipo',
    summary: 'Árbol jerárquico indentado a partir de `equipo.manager_id`. Soporta búsqueda con auto-expansión, foco en sub-árbol y manejo defensivo de huérfanos y ciclos.',
    whatIs: `Reconstrucción visual de la estructura de mando del registro \`equipo\`. Cada nodo es una persona; sus hijos son quienes tienen \`manager_id = node.id\`. La vista usa indentación + líneas verticales (estilo Finder) en lugar de cards horizontales para que escale bien con jerarquías de 3-4 niveles y branches asimétricos.

Controles:
- **Buscar** por nombre, rol, título o departamento. Los matches se resaltan en azul; sus ancestros se auto-expanden para que el match quede visible; el resto del árbol se atenúa.
- **Foco** (icono de mira al hacer hover en un manager): aísla el subárbol de esa persona y la convierte en la raíz visible.
- **Expandir todo / Colapsar**: controles globales.
- **Incluir inactivos**: por defecto solo se muestran personas activas (\`active = true\`).

Cada nodo manager muestra un chip con \`directos / total descendientes\`. Click en avatar o nombre abre la ficha de la persona (\`/persona/[nombre]\`).`,
    howCalculated: `**Construcción del árbol** (\`buildTree\` en \`Organigrama.tsx\`):
1. Indexa miembros por \`id\` y \`manager_id\` → \`children[]\`.
2. Detecta ciclos defensivamente (anti-ciclo del backend [equipo-directorio] debería prevenirlos, pero protegemos por si la BD se corrompe o la migración 2026-equipo-tag.sql introduce inconsistencias).
3. **Raíces** = personas sin \`manager_id\` O cuyo manager no está en el registro filtrado.
4. **Huérfanos** = raíces sin subordinados → se muestran en una sección aparte.
5. Cada nodo computa: \`directCount = #hijos directos\`, \`totalDescendants = recursivo\`.

**Ordenamiento de hijos**: activos primero → más descendientes primero → alfabético.

**Expansión por defecto**: primeros 2 niveles (\`DEFAULT_EXPAND_LEVELS = 2\`). En modo foco: expansión total del subárbol.

**Auto-expansión por búsqueda**: cualquier ancestro de un match se fuerza a expandido aunque el usuario lo haya colapsado.

**Datos consumidos**: solo lo que \`/api/equipo\` ya devuelve (\`id\`, \`fullName\`, \`image\`, \`active\`, \`managerId\`, \`managerName\`, \`title\`, \`roleName\`, \`department\`). Sin endpoint nuevo.`,
    whyMatters: 'Hace explícita la estructura de mando que vive distribuida en la columna \`manager_id\`. Útil para nuevos en el equipo (entender quién es quién), para reasignaciones (ver de un golpe el alcance de un manager), y como contexto para 1:1s y promociones. El indicador "Sin jerarquía" expone huérfanos que probablemente necesiten un manager asignado.',
    sources: [
      { label: 'Organigrama.tsx', href: `${GITHUB_BASE}/src/components/sections/equipo/Organigrama.tsx` },
      { label: 'EquipoSection.tsx', href: `${GITHUB_BASE}/src/components/sections/EquipoSection.tsx` },
    ],
  },
  {
    id: 'equipo-capacity-leyenda',
    section: 'Equipo',
    sectionSlug: 'equipo',
    title: 'Leyenda de Carga',
    summary: 'Cinco bandas + un caso especial. El color = razón puntos / velocidad histórica de la persona. Sin color = sin carga; gris = sin base histórica.',
    whatIs: `Cada banda traduce un rango de razón a un código de color. La razón se calcula contra la **velocidad histórica de esa persona** (no contra una constante global), así que la misma carga puede ser "fit" para un dev senior y "crítico" para un junior.

| Banda | Rango (valor / velocidad) | Lectura |
|---|---|---|
| **Subutilizada** | < 50% | Puede absorber más trabajo |
| **Carga adecuada** | 50–90% | Ritmo sano |
| **Carga ajustada** | 90–130% | Margen mínimo; cualquier imprevisto la mete en rojo |
| **Sobrecarga** | 130–180% | Probable atraso si no se redistribuye |
| **Crítico** | ≥ 180% | Imposible al ritmo histórico; **redistribuir ya** |
| Sin velocidad histórica | velocity = 0 con carga | No hay base — pide cerrar al menos una tarea con \`finReal\` para poder razonar |`,
    howCalculated: 'Ver fórmulas en [equipo-capacity-heatmap]. La leyenda es estática: muestra los rangos definidos en `cellStatus()` de `CapacityHeatmap.tsx`.',
    whyMatters: 'El color por sí solo no significa nada sin la regla: 21 pts puede ser cómodo para alguien que cierra 25/sem y crítico para quien cierra 8/sem. La leyenda hace explícita la regla.',
    sources: [
      { label: 'CapacityHeatmap.tsx · cellStatus', href: `${GITHUB_BASE}/src/components/sections/equipo/CapacityHeatmap.tsx` },
    ],
  },

  // ---------------- Tecnologías (skills matrix) — Plan 015 ----------------
  {
    id: 'equipo-tecnologias-heatmap',
    section: 'Equipo',
    sectionSlug: 'equipo',
    title: 'Matriz de Tecnologías',
    summary: 'Cuadrícula persona × tecnología con el nivel de dominio (Trainee → Arq) declarado para cada combinación. Permite identificar quién conoce qué y planear staffing por skill.',
    whatIs: `Tab **Tecnologías** en \`/equipo\`. La **vista Matriz** muestra filas (personas activas) × columnas (tecnologías con datos registrados), agrupadas por categoría (Lenguajes, Frameworks, Mobile, Bases de datos, Cloud, DevOps, Herramientas, Diseño). Cada celda es un chip de nivel coloreado (\`Trainee / Jr / Mid / Sr / Arq\`, misma escala que \`roleRango()\`); guión (—) = sin dato para esa combinación.

Las tecnologías **sin ninguna fila en la BD** no aparecen como columnas — la vista se auto-adapta al estado real de la matriz. Cuando la tabla \`equipo_technology\` está vacía (MVP sin datos aún), se muestra un estado vacío explícito en vez de una cuadrícula rota.`,
    howCalculated: `Dos fetches paralelos al montar el tab (en \`loadEquipo()\`):
- \`GET /api/technologies\` → catálogo activo ordenado por categoría y nombre.
- \`GET /api/team-technologies\` → filas de la tabla \`equipo_technology\` (sin filtros).

El join persona × tecnología se hace en cliente: se construye un índice \`Map<equipoId, Map<technologyId, TeamTechnology>>\` para lookup O(1) por celda. Las columnas activas = \`usedTechIds\` (tecnologías con al menos una fila en la matriz). Personas se filtran a \`active = true\`.`,
    whyMatters: 'La pregunta "¿quién sabe React?" tarda segundos en responderse. Antes había que preguntar uno por uno o confiar en el CV. La matriz da visibilidad inmediata de la distribución de skills, puntos de única fuente de conocimiento (SPOF) y brechas de capacidad para nuevas iniciativas.',
    sources: [
      { label: 'Tecnologias.tsx', href: `${GITHUB_BASE}/src/components/sections/equipo/Tecnologias.tsx` },
      { label: 'teamTechnology.ts · helpers', href: `${GITHUB_BASE}/src/utils/teamTechnology.ts` },
      { label: 'api/technologies.ts', href: `${GITHUB_BASE}/src/pages/api/technologies.ts` },
      { label: 'api/team-technologies.ts', href: `${GITHUB_BASE}/src/pages/api/team-technologies.ts` },
    ],
  },
  {
    id: 'equipo-tecnologias-by-tech',
    section: 'Equipo',
    sectionSlug: 'equipo',
    title: 'Por Tecnología',
    summary: 'Vista inversa: selecciona una tecnología y ve quién la domina (y a qué nivel) + proyectos activos cuyo equipo tiene esa skill. Útil para staffing de una iniciativa concreta.',
    whatIs: `Vista secundaria del tab Tecnologías. Muestra dos paneles al seleccionar una tecnología del catálogo:

1. **Personas con esa skill**: chips ordenados de mayor a menor nivel (Arq → Trainee), con avatar y enlace al perfil.
2. **Proyectos activos inferidos**: proyectos cuyo equipo resuelto (\`pmIds / arquitectoIds / devIds\`) incluye al menos a alguien con esa tecnología. La inferencia es gratis y siempre actual — no requiere un campo adicional por proyecto (decisión #3 del plan 015).`,
    howCalculated: `- **Personas**: \`peopleForTech(technologyId, matrix)\` filtra y ordena \`matrix\` por \`compareLevel\` desc.
- **Proyectos inferidos**: \`projectsForTech(technologyId, matrix, projects)\` — une los \`equipoId\` con skill contra los arrays \`pmIds / arquitectoIds / devIds\` de cada proyecto activo (\`isActive(estatus)\`). Todo en \`src/utils/teamTechnology.ts\`.`,
    whyMatters: '"¿Tenemos quien lleve el frente de AWS Lambda en el proyecto nuevo?" se responde abriendo esta vista, seleccionando \`aws-lambda\` y viendo quién está disponible y a qué nivel. Los proyectos inferidos muestran además dónde ya está comprometido ese conocimiento.',
    sources: [
      { label: 'Tecnologias.tsx · by-tech view', href: `${GITHUB_BASE}/src/components/sections/equipo/Tecnologias.tsx` },
      { label: 'teamTechnology.ts · peopleForTech, projectsForTech', href: `${GITHUB_BASE}/src/utils/teamTechnology.ts` },
    ],
  },

  // ---------------- Detalle de Persona ----------------
  {
    id: 'persona-detalle-kpi-strip',
    section: 'Detalle de Persona',
    sectionSlug: 'persona-detalle',
    title: 'KPIs Rápidos',
    summary: 'Tira de 5 mini-KPIs siempre visible: proyectos, progreso promedio, health score, pts entregados y costo mensual estimado.',
    whatIs: 'Resumen del rendimiento de la persona en una sola línea, fija arriba de los tabs. El detalle (Completados, En riesgo, Puntualidad, gráficas, costo prorrateado) vive en el tab **Resumen**.',
    howCalculated: `- **Proyectos**: \`personProjects.length\` (donde la persona aparece como PM/Arq/Dev/PO/SQA por id resuelto).
- **Progreso prom.**: \`Math.round(Σ p.progreso / personProjects.length × 100)\`.
- **Health score**: \`Math.round(Σ calcHealthScore(p).score / personProjects.length)\`. Borde rojo si <45. Color: verde ≥65, amarillo ≥45, rojo <45.
- **Pts entregados**: \`Σ p.puntos\` de los proyectos con estatus Done.
- **Costo/mes**: \`estimatePersonCost(personId, projects, costos).monthlyCost\`. Solo aparece si >0 (la card desaparece si la persona no tiene costo prorrateado en proyectos activos).`,
    whyMatters: 'Para una conversación rápida: estos 5 números resumen a la persona. El strip se mantiene visible cuando cambias de tab, así que siempre tienes el contexto macro a la mano sin tener que regresar al Resumen.',
    sources: [
      { label: 'PersonaDetailSection.tsx · KPI strip', href: `${GITHUB_BASE}/src/components/sections/PersonaDetailSection.tsx` },
      { label: 'healthScore.ts · calcHealthScore', href: `${GITHUB_BASE}/src/utils/healthScore.ts` },
      { label: 'costEngine.ts · estimatePersonCost', href: `${GITHUB_BASE}/src/utils/costEngine.ts` },
    ],
  },
  {
    id: 'persona-detalle-header',
    section: 'Detalle de Persona',
    sectionSlug: 'persona-detalle',
    title: 'Header de Perfil',
    summary: 'Avatar con inicial, nombre, roles inferidos (Arquitecto / PM / Developer) y, a la derecha, health score promedio + costo mensual y por hora.',
    whatIs: 'Banner superior del perfil. Muestra el **nombre canónico** (del registro `equipo`, no el apodo de la URL). Los roles **no se declaran**, se infieren por la presencia de la persona —resuelta a su `equipo.id`— en los campos de proyecto. Por eso una misma persona puede aparecer con varios roles.',
    howCalculated: `El \`<nombre>\` de la URL se resuelve a \`personId\` (\`equipo.id\`) vía \`/api/equipo\` + \`resolveId\`; \`displayName\` = nombre completo del registro.

**Roles** (por id resuelto, ya NO por nombre):
- Si \`projects.data.some(p => p.arquitectoIds.includes(personId))\` → push 'Arquitecto'.
- Si \`projects.data.some(p => p.pmIds.includes(personId))\` → push 'PM'.
- Si algún proyecto tiene \`p.devIds.includes(personId)\` → push 'Developer'.

**Health score promedio**: \`Math.round(Σ calcHealthScore(p).score / personProjects.length)\`. Color: verde ≥65, amarillo ≥45, rojo si menor.

**Costo mensual y por hora**: del retorno de \`estimatePersonCost(personId, projects, costos)\`. Solo se muestran si \`monthlyCost > 0\`.`,
    whyMatters: 'En tres segundos sabes quién es, qué hace y cuánto cuesta. El conjunto de roles te dice si esta persona es plug & play en distintas posiciones o especializada en una.',
    sources: [
      { label: 'PersonaDetailSection.tsx · header', href: `${GITHUB_BASE}/src/components/sections/PersonaDetailSection.tsx` },
      { label: 'equipoMatch.ts · resolveId', href: `${GITHUB_BASE}/src/lib/equipoMatch.ts` },
    ],
  },
  {
    id: 'persona-detalle-health-score',
    section: 'Detalle de Persona',
    sectionSlug: 'persona-detalle',
    title: 'Health Score Promedio',
    summary: 'Promedio del health score (0-100) de los proyectos donde la persona aparece como Arquitecto, PM o Developer.',
    whatIs: 'Indicador macro de la calidad del portafolio que esta persona está manejando. Se calcula corriendo `calcHealthScore()` sobre cada proyecto asignado y promediando.',
    howCalculated: '`avgHealth = round(Σ calcHealthScore(p).score / personProjects.length)`. `personProjects` se obtiene filtrando los proyectos por id resuelto: `p.arquitectoIds.includes(personId) || p.pmIds.includes(personId) || p.devIds.includes(personId)`. **Color**: verde si ≥65, amarillo si ≥45, rojo si menor.',
    whyMatters: 'Combina información de muchos proyectos en un solo número. Si una persona tiene 8 proyectos pero un avgHealth de 40, está cargando demasiado o tiene proyectos crónicamente rezagados. Útil para identificar a quién hay que apoyar.',
    sources: [
      { label: 'PersonaDetailSection.tsx · performance.avgHealth', href: `${GITHUB_BASE}/src/components/sections/PersonaDetailSection.tsx#L113-L124` },
    ],
  },
  {
    id: 'persona-detalle-kpi-proyectos',
    section: 'Detalle de Persona',
    sectionSlug: 'persona-detalle',
    title: 'Proyectos',
    summary: 'Cantidad de proyectos en los que la persona aparece como Arquitecto, PM o algún Developer.',
    whatIs: 'Carga total declarada para esta persona, sin filtrar por estatus (incluye Done, On Hold y Cancelado). Es el universo del que se derivan el resto de los KPIs del perfil.',
    howCalculated: '`personProjects = projects.data.filter(p => p.arquitectoIds.includes(personId) || p.pmIds.includes(personId) || p.devIds?.includes(personId))` y `kpis.total = personProjects.length`.',
    whyMatters: 'Indicador básico de carga. No distingue por rol ni por nivel de dedicación; para una lectura más precisa del esfuerzo real, mira la "Distribución de Costo" abajo (que prorratea el costo entre proyectos activos).',
    sources: [
      { label: 'PersonaDetailSection.tsx · personProjects', href: `${GITHUB_BASE}/src/components/sections/PersonaDetailSection.tsx#L42-L46` },
    ],
  },
  {
    id: 'persona-detalle-kpi-progreso',
    section: 'Detalle de Persona',
    sectionSlug: 'persona-detalle',
    title: 'Progreso promedio',
    summary: 'Promedio del % de avance de todos los proyectos asignados a la persona.',
    whatIs: 'Promedio aritmético del campo `progreso` (0-1) de los proyectos donde aparece la persona, expresado como porcentaje entero. Incluye Done (100%) y On Hold.',
    howCalculated: '`Math.round((Σ personProjects.progreso / personProjects.length) × 100)`.',
    whyMatters: 'Lectura macro del estado de los proyectos que esta persona toca. Limitación: los proyectos Done aportan 100% aunque ya no estén entregando valor. Cruza con "Pts entregados" y "Puntualidad" para una lectura más precisa.',
    sources: [
      { label: 'PersonaDetailSection.tsx · kpis', href: `${GITHUB_BASE}/src/components/sections/PersonaDetailSection.tsx#L103-L110` },
    ],
  },
  {
    id: 'persona-detalle-kpi-completados',
    section: 'Detalle de Persona',
    sectionSlug: 'persona-detalle',
    title: 'Completados',
    summary: 'Cantidad de proyectos asignados a la persona con estatus Done.',
    whatIs: 'Throughput histórico declarado para esta persona. No segmenta por fecha ni por hito; es el total acumulado en el Sheet.',
    howCalculated: "`personProjects.filter(p => p.estatus === 'Done').length`.",
    whyMatters: 'Indicador de entregabilidad. Combinado con "Pts entregados" da granularidad: muchas entregas pequeñas vs pocas grandes.',
    sources: [
      { label: 'PersonaDetailSection.tsx · kpis', href: `${GITHUB_BASE}/src/components/sections/PersonaDetailSection.tsx#L103-L110` },
    ],
  },
  {
    id: 'persona-detalle-kpi-en-riesgo',
    section: 'Detalle de Persona',
    sectionSlug: 'persona-detalle',
    title: 'En riesgo',
    summary: 'Proyectos asignados a la persona cuyo estatus declarado es At Risk o Blocked / Critical. Card se resalta en rojo si el conteo es >0.',
    whatIs: 'Cuántos de los proyectos donde aparece esta persona están en problemas explícitos según el reporte semanal del PM. Highlight rojo cuando hay al menos uno.',
    howCalculated: "`personProjects.filter(p => p.estatus === 'At Risk' || p.estatus === 'Blocked / Critical').length`.",
    whyMatters: 'Atajo de triaje para 1:1s: si la persona tiene 2+ proyectos en riesgo, son los temas a abrir primero. Importante: solo cuenta riesgos declarados; un proyecto "On Track" pero rezagado en progreso aparece sano aquí.',
    sources: [
      { label: 'PersonaDetailSection.tsx · kpis', href: `${GITHUB_BASE}/src/components/sections/PersonaDetailSection.tsx#L103-L110` },
    ],
  },
  {
    id: 'persona-detalle-kpi-pts-entregados',
    section: 'Detalle de Persona',
    sectionSlug: 'persona-detalle',
    title: 'Puntos entregados',
    summary: 'Suma de story points de los proyectos Done a los que la persona contribuyó.',
    whatIs: 'Throughput acumulado en esfuerzo (story points), no en conteo de proyectos. Un proyecto Done de 8 puntos pesa más que tres Done de 1 punto.',
    howCalculated: '`done = personProjects.filter(p => p.estatus === "Done")` y `donePoints = Σ done.puntos`.',
    whyMatters: 'Mejor proxy de productividad que el conteo crudo de Completados. Útil para comparar la contribución relativa entre personas.',
    sources: [
      { label: 'PersonaDetailSection.tsx · performance', href: `${GITHUB_BASE}/src/components/sections/PersonaDetailSection.tsx#L113-L124` },
    ],
  },
  {
    id: 'persona-detalle-kpi-puntualidad',
    section: 'Detalle de Persona',
    sectionSlug: 'persona-detalle',
    title: 'Puntualidad',
    summary: 'Porcentaje de proyectos Done que la persona entregó en o antes de la fecha estimada. N/A si no hay datos suficientes.',
    whatIs: 'Tasa histórica de entregas a tiempo de los proyectos cerrados donde aparece la persona. Solo cuenta los Done que tienen ambas fechas (`finReal` y `finEstimado`) declaradas.',
    howCalculated: `\`withDates = done.filter(p => p.finReal && p.finEstimado)\`
\`onTime = withDates.filter(p => new Date(p.finReal) <= new Date(p.finEstimado))\`
\`onTimeRate = withDates.length > 0 ? round(onTime.length / withDates.length × 100) : -1\`.

Si \`onTimeRate === -1\` (sin suficientes proyectos Done con fechas), se muestra "N/A".`,
    whyMatters: 'Indicador histórico clave para estimaciones futuras: si la persona entrega a tiempo 80% de las veces, sus estimaciones son confiables; si entrega 30%, hay que aplicar buffer.',
    sources: [
      { label: 'PersonaDetailSection.tsx · performance', href: `${GITHUB_BASE}/src/components/sections/PersonaDetailSection.tsx#L113-L124` },
    ],
  },
  {
    id: 'persona-detalle-kpi-costo-mes',
    section: 'Detalle de Persona',
    sectionSlug: 'persona-detalle',
    title: 'Costo/mes',
    summary: 'Costo mensual total de la persona según su rol en la hoja Costos. Solo aparece si hay match con un rol y costo > 0.',
    whatIs: 'Cifra **completa** (no prorrateada) del costo mensual de la persona. La distribución entre proyectos se ve en la card "Distribución de Costo".',
    howCalculated: '`estimatePersonCost(equipoId, projects, costos)` detecta el rol de la persona por su `equipo.id` (no por nombre), busca el costo de ese rol en la hoja Costos y retorna `monthlyCost` y `costoHora`.',
    whyMatters: 'Es la cifra "cruda" de cuánto cuesta tener a esta persona en el equipo. Útil para presupuestar nuevos proyectos. Para la cifra distribuida entre proyectos, mira la sección de Distribución de Costo.',
    sources: [
      { label: 'PersonaDetailSection.tsx · personCost', href: `${GITHUB_BASE}/src/components/sections/PersonaDetailSection.tsx#L127` },
      { label: 'costEngine.ts · estimatePersonCost', href: `${GITHUB_BASE}/src/utils/costEngine.ts#L150` },
    ],
  },
  {
    id: 'persona-detalle-status-pie',
    section: 'Detalle de Persona',
    sectionSlug: 'persona-detalle',
    title: 'Distribución de Estatus',
    summary: 'Pie chart con el conteo de proyectos por estatus declarado en los proyectos asignados a la persona.',
    whatIs: 'Vista visual de cómo se reparten los proyectos de la persona entre los estatus de la hoja Projects (On Track, At Risk, Blocked / Critical, Done, On Hold, etc.). Cada segmento usa el color semántico definido en `colors.ts · estatusColors`.',
    howCalculated: '`counts = {}; for (const p of personProjects) counts[p.estatus] = (counts[p.estatus] || 0) + 1; statusData = Object.entries(counts).map(([name, value]) => ({ name, value }))`. Cada slice se colorea con `estatusColors[entry.name]?.chart`.',
    whyMatters: 'Lectura instantánea del "mix" de carga. Una persona con mucho Done y poco At Risk está en racha; una con dominancia de Blocked / Critical necesita unblockers prioritarios.',
    sources: [
      { label: 'PersonaDetailSection.tsx · statusData', href: `${GITHUB_BASE}/src/components/sections/PersonaDetailSection.tsx#L139-L143` },
    ],
  },
  {
    id: 'persona-detalle-radar',
    section: 'Detalle de Persona',
    sectionSlug: 'persona-detalle',
    title: 'Perfil de Rendimiento',
    summary: 'Radar chart con cinco dimensiones normalizadas 0-100: Completación, Progreso, Salud, Puntualidad y Capacidad.',
    whatIs: 'Resumen visual del perfil multidimensional de la persona. Cada eje es una métrica derivada de los proyectos asignados, escalada a 0-100 para que sean comparables en un mismo gráfico.',
    howCalculated: `Cinco ejes:
- **Completación**: \`performance.completionRate\` = \`round(done.length / total × 100)\`.
- **Progreso**: \`kpis.avgProgress\` (promedio del % de avance).
- **Salud**: \`performance.avgHealth\` (promedio de \`calcHealthScore(p).score\`).
- **Puntualidad**: \`onTimeRate\` si ≥0; si N/A, usa **50** como neutro.
- **Capacidad**: \`min(100, personProjects.length × 15)\`. Heurística: 7+ proyectos saturan el eje en 100.`,
    whyMatters: 'Una persona "balanceada" muestra un pentágono regular grande. Asimetrías son señales: alto Progreso + baja Puntualidad → entrega tarde pero entrega; alta Capacidad + baja Salud → sobrecarga produciendo proyectos rezagados.',
    sources: [
      { label: 'PersonaDetailSection.tsx · radarData', href: `${GITHUB_BASE}/src/components/sections/PersonaDetailSection.tsx#L130-L136` },
    ],
  },
  {
    id: 'persona-detalle-progreso-chart',
    section: 'Detalle de Persona',
    sectionSlug: 'persona-detalle',
    title: 'Progreso por Proyecto',
    summary: 'Barras horizontales con el % de avance de cada proyecto asignado a la persona, ordenadas de mayor a menor.',
    whatIs: 'Vista granular complementaria al "Progreso promedio". Permite ver los outliers (los proyectos más avanzados y los más rezagados) sin tener que abrir la lista de proyectos.',
    howCalculated: '`projectsChartData = personProjects.map(p => ({ name: p.actividad, progreso: round(p.progreso × 100) })).sort((a, b) => b.progreso - a.progreso)`. **Color de la barra**: verde si `progreso ≥ 80`, amarillo si `≥ 40`, rojo si menor.',
    whyMatters: 'En un solo vistazo identificas los proyectos rezagados que tiran del promedio para abajo: si una persona tiene avgProgress de 50% y 6 proyectos, este chart te dice si todos están en 50% o si 5 están en 80% y uno en 0%. La conversación es completamente distinta.',
    sources: [
      { label: 'PersonaDetailSection.tsx · projectsChartData', href: `${GITHUB_BASE}/src/components/sections/PersonaDetailSection.tsx#L146-L150` },
    ],
  },
  {
    id: 'persona-detalle-distribucion-costo',
    section: 'Detalle de Persona',
    sectionSlug: 'persona-detalle',
    title: 'Costo prorrateado por proyecto',
    summary: 'El costo mensual de la persona repartido entre sus proyectos activos. Se muestra en cada card de "Proyectos Asignados" (etiqueta verde $/mes) y el total bajo el encabezado.',
    whatIs: 'Vista prorrateada del costo: en lugar de imputar el costo mensual completo a uno solo, se divide entre todos los proyectos activos (estatus ≠ Done, ≠ On Hold) donde aparece la persona. El share por proyecto aparece en su card; el costo mensual total + costo/hora se resumen bajo el encabezado de la sección.',
    howCalculated: `\`estimatePersonCost(personId, projects, costos)\` retorna:
- \`monthlyCost\`: costo total mensual.
- \`costoHora\`: costo por hora.
- \`projectsCost: { folio, actividad, cost }[]\`: una entrada por cada proyecto activo asignado. \`cost = monthlyCost / numProyectosActivos\`.

La persona y sus proyectos se identifican por \`equipo.id\` (rol y prorrateo por \`pmIds/arquitectoIds/devIds\`), igual que en el resto del perfil. El costo sólo se muestra a roles con acceso a \`data:costos\` (si no, el endpoint responde 403 y la etiqueta no aparece).`,
    whyMatters: 'Cuantifica la dedicación real: si una persona está en 8 proyectos activos, cada uno carga solo 1/8 de su costo. Útil para decisiones de asignación y para detectar concentración de equipo. Si el portafolio tiene proyectos con shares muy bajos, hay inflación de equipo.',
    sources: [
      { label: 'ProyectosTab.tsx · costo por card', href: `${GITHUB_BASE}/src/components/sections/persona-detalle/ProyectosTab.tsx` },
      { label: 'costEngine.ts · estimatePersonCost', href: `${GITHUB_BASE}/src/utils/costEngine.ts#L166` },
    ],
  },
  {
    id: 'persona-detalle-cursos',
    section: 'Detalle de Persona',
    sectionSlug: 'persona-detalle',
    title: 'Progreso en Cursos',
    summary: 'Gauge radial con el % de avance del curso de la persona + metadata (O.U., rol, jefe directo). Solo aparece si hay match en la hoja Cursos.',
    whatIs: 'Replica la fila correspondiente del directorio de /cursos para esta persona, pero en formato visual. Es la vista de capacitación / onboarding del perfil.',
    howCalculated: 'Se toma la fila de `cursos.data` cuyo `equipoId === personId` (el endpoint `/api/cursos` ya resolvió el colaborador a `equipo.id`). **Color del gauge**: verde si ≥100%, amarillo si ≥50%, rojo si menor.',
    whyMatters: 'En entrevistas de desempeño es útil tener a la mano el avance de capacitación en la misma vista. Si el progreso está estancado <50% durante semanas, es señal para conversar.',
    sources: [
      { label: 'PersonaDetailSection.tsx · cursos card', href: `${GITHUB_BASE}/src/components/sections/PersonaDetailSection.tsx#L326-L348` },
    ],
  },
  {
    id: 'persona-detalle-proyectos-asignados',
    section: 'Detalle de Persona',
    sectionSlug: 'persona-detalle',
    title: 'Proyectos Asignados',
    summary: 'Grid de cards con cada proyecto donde la persona aparece, incluyendo folio, actividad, badge de estatus, barra de progreso y rol que ejerce en ese proyecto.',
    whatIs: 'Lista completa (sin paginar) de los proyectos asignados. Cada card es un atajo de navegación al detalle del proyecto. El rol mostrado es el rol específico **en ese proyecto** (puede variar entre proyectos).',
    howCalculated: `Iteración sobre \`personProjects\`. Para cada proyecto se calcula el **rol específico**:
\`roleInProject = p.arquitectoIds.includes(personId) ? 'Arquitecto' : p.pmIds.includes(personId) ? 'PM' : 'Developer'\`.

Orden de precedencia: arquitecto > PM > developer. Click en cualquier card navega a \`/proyecto/<id>\`. Barra de progreso: verde ≥80, amarillo ≥40, rojo si menor.`,
    whyMatters: 'Es la vista que responde "¿en qué está exactamente?". El badge de rol por proyecto es importante porque una persona PM en un proyecto puede ser dev en otro — saber el rol cambia las expectativas.',
    sources: [
      { label: 'PersonaDetailSection.tsx · projects list', href: `${GITHUB_BASE}/src/components/sections/PersonaDetailSection.tsx#L350-L389` },
    ],
  },
  {
    id: 'persona-detalle-tareas-cronograma',
    section: 'Detalle de Persona',
    sectionSlug: 'persona-detalle',
    title: 'Tareas del Cronograma',
    summary: 'Lista de actividades del cronograma asignadas a la persona, con mini-KPIs de total/completadas/activas/atrasadas/puntos y estimado-vs-real (tracked).',
    whatIs: 'Sección que cruza el perfil con la hoja `actividades` del cronograma. Cada tarea muestra fase, nombre, épica, tipo, story points y estatus. Las tareas se **ordenan** activas primero.',
    howCalculated: `\`personTareas = tareas.data.filter(t => t.asignadoId === personId)\`.

El endpoint \`/api/tareas\` resuelve el campo \`asignado\` (apodo de la hoja) a \`equipo.id\` (\`asignadoId\`) vía \`equipoResolver\`; el perfil filtra por ese id. Resolver por id estable evita que el perfil muestre 0 tareas al navegar desde distintas fuentes.

**Mini-KPIs**: total, completadas (\`isTareaDone\`), activas, atrasadas (salud "Atrazada"), \`puntosTotales\`, \`puntosCompletados\` (% entregado).

**Estimado vs real**: suma de \`puntos\` (estimado) vs \`tracked\` (real) de las actividades de la persona.`,
    whyMatters: 'Lectura granular complementaria a Proyectos Asignados: los proyectos te dicen en qué iniciativas está la persona; las tareas te dicen exactamente qué pieza de trabajo tiene en cola. El contraste estimado-vs-real revela la calidad de sus estimaciones.',
    sources: [
      { label: 'PersonaDetailSection.tsx · personTareas', href: `${GITHUB_BASE}/src/components/sections/PersonaDetailSection.tsx#L48-L71` },
      { label: '/api/tareas.ts', href: `${GITHUB_BASE}/src/pages/api/tareas.ts` },
    ],
  },
  {
    id: 'persona-detalle-gantt',
    section: 'Detalle de Persona',
    sectionSlug: 'persona-detalle',
    title: 'Gantt Personal',
    summary: 'Las actividades asignadas a la persona posicionadas en el tiempo, agrupadas por proyecto, con línea de HOY.',
    whatIs: 'Vista de calendario personal: por cada proyecto en el que la persona tiene actividades, sus tareas se dibujan como barras según `inicio`/`inicioEstimado` → `finReal`/`finEstimado`. El color de la barra refleja el estatus de la tarea.',
    howCalculated: 'Filtra `tareas` por `asignadoId === personId`, agrupa por `proyectoId` (nombre resuelto vía `projects`). Cada barra se posiciona en % sobre el rango de fechas del conjunto. Las tareas sin fechas se marcan "sin fechas".',
    whyMatters: 'Permite ver de un vistazo cómo se distribuye la carga de la persona en el tiempo y si tiene solapamientos entre proyectos. Complementa el Burndown (que mide ritmo) con la dimensión calendario.',
    sources: [
      { label: 'PersonGantt.tsx', href: `${GITHUB_BASE}/src/components/charts/PersonGantt.tsx` },
    ],
  },
  {
    id: 'persona-detalle-burndown',
    section: 'Detalle de Persona',
    sectionSlug: 'persona-detalle',
    title: 'Burndown por Proyecto',
    summary: 'Una línea por proyecto (incluye un agregado "Sin proyecto" y proyectos Done recientes). Líneas punteadas marcan la trayectoria ideal hasta finEstimado.',
    whatIs: `Multi-línea de burndown personal. Cada serie sólida es un cubo de puntos remanentes:

- **Por proyecto activo**: actividades de la persona en proyectos cuyo estatus ≠ Done y ≠ On Hold.
- **Por proyecto Done reciente**: proyectos cerrados con \`finReal\` dentro de los últimos **30 días**, para que el throughput reciente quede visible.
- **Sin proyecto** (línea gris): bucket agregado de actividades **sin** \`proyectoId\` o cuyo proyecto no entra en los dos anteriores. Antes se descartaban silenciosamente.

Además, para hasta 3 proyectos reales se traza una **trayectoria ideal** (línea punteada del mismo color): diagonal del total inicial a 0 en la semana de \`finEstimado\`. Si la línea sólida está por encima de la punteada, vas atrasado; por debajo, adelantado.`,
    howCalculated: `Bucketización:
- \`relevantIds\` = proyectos en curso ∪ proyectos Done con \`finReal ≥ hoy − 30d\`.
- Cada tarea con \`puntos > 0\` cae en su \`proyectoId\` (si relevante) o en \`__sin_proyecto__\`.

Por semana \`w\`:
- **Real** \`restantes(w) = total − Σpts cerrados con finReal ≤ fin de semana\` (estatus también debe ser Done).
- **Ideal** \`restantes(w) = max(0, total · (1 − w / totalWeeks))\` donde \`totalWeeks = (mondayOf(finEstimado) − first) / 7d\`.

Eje X: desde la semana \`mondayOf(min(finEstimado, finReal, hoy))\` hasta \`mondayOf(max(...))\`.

**Banner de "sin movimiento"**: aparece si **toda** serie real empezó con puntos pendientes (>0) y terminó con el mismo valor (ninguna tarea cerró en el rango).`,
    whyMatters: 'Muestra dónde la persona avanza y dónde se estanca, sin ocultar tareas huérfanas ni cerrados recientes. Las líneas ideales sirven de referencia: te dicen si la persona va al ritmo esperado para llegar al `finEstimado` de cada proyecto, no sólo si está cerrando puntos en general.',
    sources: [
      { label: 'PersonBurndown.tsx', href: `${GITHUB_BASE}/src/components/charts/PersonBurndown.tsx` },
    ],
  },
  {
    id: 'persona-detalle-accesos',
    section: 'Detalle de Persona',
    sectionSlug: 'persona-detalle',
    title: 'Accesos a Repositorios',
    summary: 'Repositorios GitHub donde la persona tiene un rol (Administrador / Arquitecto / Colaborador / Visualizador / Deploy).',
    whatIs: 'Cruza la hoja `repositorios` con la persona: por cada repo, lista los roles donde aparece su nombre. Muestra solo los repos donde la persona tiene algún acceso asignado.',
    howCalculated: 'Match preferente por `equipo.tag` (nombre display "First Last", e.g. "Lorena Olvera") como substring en cada columna de rol del repo (`administrador`/`arquitecto`/`colaborador`/`visualizador`/`deploy`). Si la persona no tiene `tag` (BD vieja, migración `2026-equipo-tag.sql` sin aplicar/seedear), cae a un match heurístico por tokens del `full_name`: primer nombre presente **y** al menos un apellido presente en la celda. El fallback asegura que la feature degrade limpio durante la ventana de migración.',
    whyMatters: 'Da visibilidad de a qué código tiene acceso cada persona y con qué nivel — útil para onboarding/offboarding y auditoría de permisos. Limitación: el match por nombre puede fallar si dos personas comparten prefijo de nombre; la fuente canónica de accesos sigue siendo GitHub.',
    sources: [
      { label: 'PersonaDetailSection.tsx · personRepos', href: `${GITHUB_BASE}/src/components/sections/PersonaDetailSection.tsx` },
      { label: '/api/repositorios.ts', href: `${GITHUB_BASE}/src/pages/api/repositorios.ts` },
    ],
  },
  {
    id: 'persona-detalle-tecnologias',
    section: 'Detalle de Persona',
    sectionSlug: 'persona-detalle',
    title: 'Tecnologías',
    summary: 'Perfil de skills técnicos de la persona: tecnologías asignadas con su nivel de dominio (Trainee → Arq), agrupadas por categoría.',
    whatIs: 'Tab "Tecnologías" de `/persona/<id>`. Muestra las tecnologías registradas en `equipo_technology` para esta persona, agrupadas por categoría (Lenguajes, Frameworks, Cloud, etc.) y ordenadas por nivel de mayor a menor dentro de cada categoría. Un chip de color codifica el nivel (`trainee`/`jr`/`mid`/`sr`/`arq`). Con permiso `action:tecnologia:manage` (admin por default) aparece un botón "Agregar tecnología" y un lápiz por chip para editar el nivel o quitar la tecnología; los demás roles sólo leen.',
    howCalculated: 'Lee `GET /api/team-technologies?equipo=<id>` (filtra `equipo_technology` por `equipo_id`); el catálogo viene de `GET /api/technologies` (tabla `technology`, `active=1`). El cruce catálogo × matriz en cliente: para cada categoría del orden canónico (`CATEGORY_ORDER`), filtra las techs asignadas a la persona y las ordena por `LEVEL_ORDER` desc (`compareLevel`). **Edición** (admin): `POST /api/admin/team-technologies` (upsert único por `(equipo_id, technology_id)`); `DELETE /api/admin/team-technologies?equipoId=&technologyId=` para quitar. El server gatea por `action:tecnologia:manage`; el `<Gate>` del cliente sólo controla la UX.',
    whyMatters: 'Da visibilidad del mapa de skills de cada colaborador: útil para asignación de proyectos (¿quién sabe React en nivel Sr?), planning de capacitación (¿quién está en Trainee?), y para detectar single-points-of-failure técnicos. La matriz completa del equipo vive en `/equipo` → Tecnologías; este tab la limita a la persona seleccionada y agrega la edición admin.',
    sources: [
      { label: 'TecnologiasTab.tsx', href: `${GITHUB_BASE}/src/components/sections/persona-detalle/TecnologiasTab.tsx` },
      { label: '/api/admin/team-technologies.ts', href: `${GITHUB_BASE}/src/pages/api/admin/team-technologies.ts` },
      { label: 'teamTechnology.ts', href: `${GITHUB_BASE}/src/utils/teamTechnology.ts` },
    ],
  },

  // ---------------- Cursos ----------------
  {
    id: 'cursos-kpi-total',
    section: 'Cursos',
    sectionSlug: 'cursos',
    title: 'Total colaboradores',
    summary: 'Cantidad de colaboradores con al menos un curso registrado en la hoja Cursos (ajustado a los filtros activos).',
    whatIs: 'Conteo del subset de `CursoRecord` que pasa los filtros de O.U., rol y búsqueda por nombre/rol. Es el denominador implícito de los demás KPIs y de las dos gráficas por O.U.',
    howCalculated: '`filtered.length`. La fuente es `/api/cursos` (rango `Cursos!A1:H50`), que cachea 5 minutos.',
    whyMatters: 'Te dice qué tan grande es el universo de seguimiento. Si después de aplicar un filtro de O.U. el total baja a 0, sabes que esa O.U. no tiene cursos registrados (no que el filtro esté roto).',
    sources: [
      { label: 'CursosSection.tsx · kpis', href: `${GITHUB_BASE}/src/components/sections/CursosSection.tsx#L55-L61` },
      { label: '/api/cursos.ts', href: `${GITHUB_BASE}/src/pages/api/cursos.ts` },
    ],
  },
  {
    id: 'cursos-kpi-progreso',
    section: 'Cursos',
    sectionSlug: 'cursos',
    title: 'Progreso promedio',
    summary: 'Promedio simple del % de avance reportado por cada colaborador en el slice visible.',
    whatIs: 'Promedio aritmético del campo `progreso` (escala 0-100, no normalizado) de cada `CursoRecord` filtrado. Cada persona aporta exactamente un punto al promedio, sin ponderar por número de cursos ni por dificultad.',
    howCalculated: '`Math.round(Σ progreso / total)`. Si el filtro deja 0 resultados, retorna 0. Incluye colaboradores en 0% y en 100%.',
    whyMatters: 'Indicador macro de salud del programa de capacitación. Limitación: un colaborador que ya cerró su curso aporta 100% indefinidamente; combina con "Completados" y "Sin iniciar" para distinguir un equipo "ya terminado" de uno "estancado a la mitad".',
    sources: [
      { label: 'CursosSection.tsx · kpis', href: `${GITHUB_BASE}/src/components/sections/CursosSection.tsx#L55-L61` },
    ],
  },
  {
    id: 'cursos-kpi-completados',
    section: 'Cursos',
    sectionSlug: 'cursos',
    title: 'Completados',
    summary: 'Colaboradores con progreso exactamente igual a 100% en el slice visible.',
    whatIs: 'Conteo de `CursoRecord` cuyo `progreso === 100`. Marca a quien ya cerró todos los cursos asignados según el reporte semanal de la hoja Cursos.',
    howCalculated: "`filtered.filter(c => c.progreso === 100).length`",
    whyMatters: 'Throughput acumulado del programa. Cuando este número crece semana a semana significa que el equipo está cerrando cursos. Si se estanca con muchos colaboradores en 80-99%, hay un cuello de botella en el último tramo.',
    sources: [
      { label: 'CursosSection.tsx · kpis', href: `${GITHUB_BASE}/src/components/sections/CursosSection.tsx#L55-L61` },
    ],
  },
  {
    id: 'cursos-kpi-sin-iniciar',
    section: 'Cursos',
    sectionSlug: 'cursos',
    title: 'Sin iniciar',
    summary: 'Colaboradores con progreso 0%. Se resalta en rojo cuando hay al menos uno.',
    whatIs: 'Conteo de `CursoRecord` con `progreso === 0`. Identifica a quienes aún no han abierto ni la primera lección del curso asignado.',
    howCalculated: "`filtered.filter(c => c.progreso === 0).length`. La KPI activa `highlight` cuando el valor es > 0.",
    whyMatters: 'Detector temprano de inscripción inactiva. Distinto al avance bajo (1-49%): "Sin iniciar" significa que la persona ni siquiera abrió la plataforma. Si el contador no baja semana a semana, es indicio de friction en onboarding.',
    sources: [
      { label: 'CursosSection.tsx · kpis', href: `${GITHUB_BASE}/src/components/sections/CursosSection.tsx#L55-L61` },
    ],
  },
  {
    id: 'cursos-ou-distribution',
    section: 'Cursos',
    sectionSlug: 'cursos',
    title: 'Distribución por O.U.',
    summary: 'Donut con la cantidad de colaboradores por Organizational Unit (Tech Ambition, Growth Experiences, etc.).',
    whatIs: 'Pie chart con `innerRadius=55` que cuenta cuántos colaboradores caen en cada O.U. dentro del subset filtrado. Cada slice usa el color semántico definido en `getOUColor()`.',
    howCalculated: "`countByField(filtered, 'ou')` agrupa los `CursoRecord` por el campo `ou` y emite `[{ name, value }]`. Los registros sin O.U. se agrupan en el bucket `Sin dato`. Los colores se obtienen de `getOUColor(name).chart`.",
    whyMatters: 'Te dice qué O.U. concentra más colaboradores en seguimiento de cursos. Comparado contra "Progreso Promedio por O.U." en paralelo, distingue una O.U. grande con buen avance de una pequeña con avance pobre.',
    sources: [
      { label: 'CursosSection.tsx · ouDistribution', href: `${GITHUB_BASE}/src/components/sections/CursosSection.tsx#L63-L66` },
    ],
  },
  {
    id: 'cursos-ou-progress',
    section: 'Cursos',
    sectionSlug: 'cursos',
    title: 'Progreso Promedio por O.U.',
    summary: 'Bar chart con el % de avance promedio por O.U., ordenado de mayor a menor.',
    whatIs: 'Barras verticales que muestran el promedio de `progreso` por O.U. (escala 0-100). Cada barra está coloreada con el color semántico de la O.U. El eje Y está fijo a `[0, 100]` para que las comparaciones sean visualmente consistentes.',
    howCalculated: "`groupByField(filtered, 'ou')` agrupa por O.U.; para cada grupo `avg = round(Σ items.progreso / items.length)`. Los grupos `Sin dato` y los vacíos se descartan. Orden: descendente.",
    whyMatters: 'Combina diagnóstico de cumplimiento por área y benchmark interno: si Analytics Solutions está al 70% y Growth Experiences al 25%, es evidencia para People Ops de que el programa no está siendo prioridad uniforme.',
    sources: [
      { label: 'CursosSection.tsx · ouProgressData', href: `${GITHUB_BASE}/src/components/sections/CursosSection.tsx#L68-L77` },
    ],
  },
  {
    id: 'cursos-equipos-jefe',
    section: 'Cursos',
    sectionSlug: 'cursos',
    title: 'Equipos por Jefe Directo',
    summary: 'Tarjetas agrupadas por jefe directo con promedio del equipo y tarjetas navegables a cada miembro.',
    whatIs: 'Lista de tarjetas, una por jefe directo. Cada tarjeta muestra avatar con la inicial, nombre del jefe, conteo de miembros, promedio del equipo (con barra de progreso semaforizada) y un grid con los miembros ordenados de mayor a menor progreso.',
    howCalculated: `**Agrupación**: \`groupByField(filtered, 'jefeDirecto')\` descarta el bucket \`Sin dato\` y los vacíos; los jefes se ordenan por tamaño del equipo (descendente).

**Promedio del equipo**: \`teamAvg = round(Σ members.progreso / members.length)\`.

**Color de barra** (semáforo): verde ≥100%, amarillo ≥50%, naranja ≥1%, rojo si 0%.

**Navegación**: cada miembro linkea a \`/persona/<encodeURIComponent(colaborador)>\` (nombre completo). El perfil destino resuelve el nombre a equipo.id vía equipoResolver; ya no usa \`includes()\` para cruzar este formato con los apodos cortos que se usan en Projects.`,
    whyMatters: 'Es la vista accionable para los managers: cada jefe puede ver de un vistazo cómo está su equipo y entrar al perfil de quien necesite seguimiento. El promedio del equipo te permite identificar áreas donde la cultura de capacitación no está consolidada.',
    sources: [
      { label: 'CursosSection.tsx · teamGroups', href: `${GITHUB_BASE}/src/components/sections/CursosSection.tsx#L80-L244` },
    ],
  },
  {
    id: 'cursos-progreso-individual',
    section: 'Cursos',
    sectionSlug: 'cursos',
    title: 'Progreso Individual de Cursos',
    summary: 'Bar chart horizontal con el progreso de cada colaborador, ordenado de mayor a menor.',
    whatIs: 'Bar chart horizontal (eje Y categórico con el nombre completo del colaborador, eje X numérico 0-100) que muestra el `progreso` reportado para cada `CursoRecord` del subset filtrado.',
    howCalculated: `Toma \`data\` ya filtrado, lo ordena \`b.progreso - a.progreso\` (descendente) y mapea a \`{ name: colaborador, progreso }\`.

**Color de barra** (semáforo): verde \`#4ade80\` si ≥100%, amarillo \`#facc15\` si ≥50%, naranja \`#fb923c\` si ≥1%, rojo \`#f87171\` si 0%.

A diferencia del resto del dashboard, los nombres aquí están en formato **completo** (e.g. "Lorena Raquel Olvera Rodriguez") porque la hoja Cursos los almacena así.`,
    whyMatters: 'Ranking individual del programa: el extremo superior celebra a quienes ya cerraron, el inferior identifica a quienes requieren intervención directa. Si quieres pronóstico de cuándo termina cada quien, abre el perfil — la finalización se proyecta con `computeCourseForecasts` a partir del ritmo derivado de snapshots.',
    sources: [
      { label: 'CursosProgressChart.tsx', href: `${GITHUB_BASE}/src/components/charts/CursosProgressChart.tsx` },
      { label: 'courseForecast.ts · computeCourseForecasts', href: `${GITHUB_BASE}/src/utils/courseForecast.ts` },
    ],
  },

  // ---------------- Novedades ----------------
  {
    id: 'novedades-hero',
    section: 'Novedades',
    sectionSlug: 'novedades',
    title: 'Versión actual',
    summary: 'Hero card con la versión semver desplegada actualmente, su fecha de release y el conteo total histórico de releases.',
    whatIs: 'Banner morado/azul en la parte superior de la página. A la izquierda, la versión actual con tipografía monoespaciada (`v1.6.0`, leída de `package.json`) y la fecha de su release. A la derecha, el total de releases registrados en `CHANGELOG.md` desde que arrancó el proyecto.',
    howCalculated: `- **\`currentVersion\`** = lectura directa de \`pkg.version\` del \`package.json\` del repo.
- **\`currentRelease\`** = \`sortedReleases.find(r => r.version === currentVersion)\` ?? \`sortedReleases[0]\` (fallback al más reciente si no hay match exacto).
- **Total releases** = \`sortedReleases.length\`.
- **"Desde {fecha}"** = \`sortedReleases[sortedReleases.length - 1].date\` (el release más antiguo después de ordenar descendente).

El parseo del CHANGELOG sigue el formato Keep-a-Changelog (\`## [x.y.z] - YYYY-MM-DD\`).`,
    whyMatters: 'Saber qué versión está corriendo en producción es útil para reportar bugs, alinear con docs externos, o entender qué features están disponibles para tu sesión. La fecha del primer release marca cuándo nació el sistema — útil como contexto de madurez al onboarding de nuevos miembros.',
    sources: [
      { label: 'NovedadesSection.tsx · hero', href: `${GITHUB_BASE}/src/components/sections/NovedadesSection.tsx#L93-L115` },
      { label: 'novedades.astro', href: `${GITHUB_BASE}/src/pages/novedades.astro` },
      { label: 'utils/changelog.ts · parseChangelog', href: `${GITHUB_BASE}/src/utils/changelog.ts` },
    ],
  },
  {
    id: 'novedades-historial',
    section: 'Novedades',
    sectionSlug: 'novedades',
    title: 'Historial de versiones',
    summary: 'Accordion con todos los releases ordenados descendente. Cada uno expande sus cambios en secciones Added (verde), Changed (azul) y Fixed (ámbar).',
    whatIs: 'Lista de todos los releases parseados de `CHANGELOG.md`. Cada release es un panel colapsable: header con versión semver + fecha + contador de cambios; al expandir, los items se agrupan en secciones tipadas con icono y color semántico. La versión actual lleva borde morado y badge "Actual". Botones de "Expandir todos" y "Colapsar todos" para barrido rápido.',
    howCalculated: `**Orden**: \`localeCompare(b.version, a.version, { numeric: true })\` (descendente por número de versión, no por fecha — evita problemas si hay releases fuera de orden cronológico).

**Estado inicial**: solo la versión actual está expandida; el resto colapsadas.

**Mapeo de iconos/colores por sección** (\`sectionMeta\`):
- \`Added\` → \`Sparkles\` verde (feature nueva)
- \`Changed\` → \`Wrench\` azul (modificación a algo existente)
- \`Fixed\` → \`Bug\` ámbar (corrección de bug)
- Cualquier otro nombre → \`FileText\` gris (fallback)

**Items**: cada string del CHANGELOG se renderiza con \`renderMarkdownInline()\` vía \`dangerouslySetInnerHTML\`, lo que permite que código inline (\` \` \`) y \`**negritas**\` del CHANGELOG se vean formateadas.

**Contador "N cambios"**: \`Σ section.items.length\` por release.`,
    whyMatters: 'Es el historial completo y auditable de qué se entregó cuándo. Útil para onboarding ("lee desde tal versión hacia adelante"), para investigar regresiones (acota la ventana de cambios sospechosos por fecha), o para reportar al equipo qué se incluyó en la siguiente release.',
    sources: [
      { label: 'NovedadesSection.tsx · accordion', href: `${GITHUB_BASE}/src/components/sections/NovedadesSection.tsx#L136-L175` },
      { label: 'NovedadesSection.tsx · sectionMeta', href: `${GITHUB_BASE}/src/components/sections/NovedadesSection.tsx#L12-L18` },
      { label: 'utils/changelog.ts · renderMarkdownInline', href: `${GITHUB_BASE}/src/utils/changelog.ts` },
      { label: 'CHANGELOG.md', href: `${GITHUB_BASE}/CHANGELOG.md` },
    ],
  },

  // ---------------- Métricas por DEV ----------------
  {
    id: 'metricas-dev-ranking-chart',
    section: 'Métricas por DEV',
    sectionSlug: 'metricas-dev',
    title: 'Ranking por Health Score',
    summary: 'Bar chart horizontal con el health score promedio de cada persona del equipo, ordenado descendente. Verde ≥65, amarillo ≥45, rojo si menor.',
    whatIs: 'Vista de un vistazo de quiénes manejan los proyectos más sanos vs quienes acumulan riesgo. Cada barra es el promedio de `calcHealthScore(p).score` sobre los proyectos donde la persona aparece como Arquitecto, PM o Developer.',
    howCalculated: `Por cada persona del equipo:
1. \`personProjects\` = proyectos donde la persona aparece en \`arquitecto\`, \`pm\` o \`devs\` (deduplicado por folio).
2. \`avgHealthScore = round(Σ calcHealthScore(p).score / personProjects.length)\`.
3. Orden: descendente por \`avgHealthScore\`.

**Color de la barra**:
- Verde \`#4ade80\` si ≥65
- Amarillo \`#facc15\` si ≥45
- Rojo \`#f87171\` si menor

Altura del chart: \`max(250, rankingData.length × 32 + 40)\` — escala con la cantidad de personas.`,
    whyMatters: 'Quien encabeza la lista típicamente tiene proyectos más estables — útil para benchmarking. El extremo bajo es candidato a coaching o re-asignación. Combinado con la columna "Proy." de la tabla, distingue alto desempeño con alta carga (estrella del equipo) vs bajo desempeño con baja carga (capacidad subutilizada o problemas).',
    sources: [
      { label: 'MetricasDevSection.tsx · rankingData', href: `${GITHUB_BASE}/src/components/sections/MetricasDevSection.tsx#L143-L147` },
      { label: 'healthScore.ts · calcHealthScore', href: `${GITHUB_BASE}/src/utils/healthScore.ts#L26-L95` },
    ],
  },
  {
    id: 'metricas-dev-perfil',
    section: 'Métricas por DEV',
    sectionSlug: 'metricas-dev',
    title: 'Perfil del DEV seleccionado',
    summary: 'Radar de 5 dimensiones (Completación, Progreso, Salud, Puntualidad, Capacidad) + 3 KPIs adicionales + lista navegable de proyectos. Aparece tras click en una fila de la tabla.',
    whatIs: 'Vista de detalle del DEV que se selecciona en la tabla. El radar usa las mismas 5 dimensiones que `persona-detalle-radar`. Bajo el radar, 3 KPIs prominentes (Pts entregados, Tasa completación, Puntualidad) y la lista de proyectos asignados con su estatus y % de progreso. Click en cualquier proyecto abre `/proyecto/<folio>`.',
    howCalculated: `**5 ejes del radar** (todos escalados 0-100):
- **Completación**: \`round(doneProjects / totalProjects × 100)\`
- **Progreso**: \`round(Σ p.progreso / totalProjects × 100)\`
- **Salud**: \`round(Σ calcHealthScore(p).score / totalProjects)\`
- **Puntualidad**: \`onTimeRate\` si ≥0; si N/A, usa **50** como neutro para no romper el polígono
- **Capacidad**: \`min(100, totalProjects × 15)\` — heurística donde 7+ proyectos saturan el eje en 100

**Puntualidad**: % de proyectos Done cuyo \`finReal ≤ finEstimado\` (solo cuenta Done con ambas fechas declaradas). Muestra "N/A" si no hay base.

Los proyectos se deduplican por folio para no contar dos veces a quien es Arquitecto y Developer del mismo proyecto.`,
    whyMatters: 'Una persona "balanceada" muestra un pentágono regular grande. Asimetrías son señales accionables: alta Capacidad + baja Salud → sobrecarga produciendo proyectos rezagados. Alto Progreso + baja Puntualidad → entrega tarde pero entrega. Útil para identificar dónde calibrar carga o coaching.',
    sources: [
      { label: 'MetricasDevSection.tsx · radarData', href: `${GITHUB_BASE}/src/components/sections/MetricasDevSection.tsx#L130-L140` },
      { label: 'MetricasDevSection.tsx · selectedDevData', href: `${GITHUB_BASE}/src/components/sections/MetricasDevSection.tsx#L121-L127` },
      { label: 'healthScore.ts · calcHealthScore', href: `${GITHUB_BASE}/src/utils/healthScore.ts#L26-L95` },
    ],
  },
  {
    id: 'metricas-dev-tabla',
    section: 'Métricas por DEV',
    sectionSlug: 'metricas-dev',
    title: 'Tabla Comparativa',
    summary: 'Tabla ordenable con 10 métricas por persona. Click en encabezado ordena (toggle asc/desc); click en fila abre el perfil del DEV en el radar de arriba.',
    whatIs: 'Tabla con una fila por persona y 10 columnas de métricas. Cada columna es ordenable por click en su encabezado. El avatar a la izquierda muestra inicial + roles agregados. La fila seleccionada se resalta en azul y dispara la actualización del radar y perfil arriba.',
    howCalculated: `**Columnas:**

- **Proy.**: total de proyectos donde la persona aparece (deduplicado por folio).
- **Done**: \`count(estatus === 'Done')\`.
- **Activos**: \`count(estatus !== 'Done' && estatus !== 'On Hold')\`.
- **Riesgo**: \`count(estatus === 'At Risk' || estatus === 'Blocked / Critical')\`. Bold rojo si >0.
- **% Compl.**: \`round(Done / Proy. × 100)\`.
- **% Prog.**: \`round(Σ progreso / Proy. × 100)\` (promedio del campo \`progreso\`).
- **Salud**: \`round(Σ calcHealthScore(p).score / Proy.)\`. Color: verde ≥65, amarillo ≥45, rojo si menor.
- **Pts Total**: \`Σ p.puntos\` sobre todos los proyectos asignados.
- **Pts Done**: \`Σ p.puntos\` sobre proyectos con estatus Done.
- **Puntual.**: % de Done con \`finReal ≤ finEstimado\` (solo Done con ambas fechas). Color: verde ≥80, amarillo ≥50, rojo si menor. "—" si no hay base.

**Interacción**:
- Click en encabezado → ordena por esa columna (toggle asc/desc; default desc).
- Click en fila → selecciona/deselecciona DEV (actualiza el radar).
- El filtro PM acota el universo de proyectos antes de calcular las métricas.`,
    whyMatters: 'Es el corazón de la página. Ordenar por cualquier columna responde preguntas concretas: "¿quién entrega más a tiempo?" → ordenar por Puntual. desc. "¿quién acumula proyectos en riesgo?" → ordenar por Riesgo desc. "¿quién tiene más capacidad libre?" → ordenar por Activos asc. Combinada con el radar de arriba, permite ir de macro (tabla) a micro (perfil individual) en un click.',
    sources: [
      { label: 'MetricasDevSection.tsx · devMetrics', href: `${GITHUB_BASE}/src/components/sections/MetricasDevSection.tsx#L56-L111` },
      { label: 'MetricasDevSection.tsx · sort', href: `${GITHUB_BASE}/src/components/sections/MetricasDevSection.tsx#L113-L119` },
      { label: 'MetricasDevSection.tsx · table render', href: `${GITHUB_BASE}/src/components/sections/MetricasDevSection.tsx#L272-L344` },
    ],
  },
  // ─── Comparativa ───────────────────────────────────────────────────────────
  {
    id: 'comparativa-ranking',
    section: 'Comparativa',
    sectionSlug: 'comparativa',
    title: 'Ranking de calificaciones',
    summary: 'Chips con avatar + calificación promedio del período seleccionado, ordenadas desc. Click para añadir al radar (máx 3).',
    whatIs: `Render visual del **leaderboard del trimestre**. Una chip por persona activa que capturó su evaluación en el período seleccionado, con su avatar, su posición en el ranking, su nombre canónico (\`tag || fullName\`) y la calificación promedio en grande con color por bucket.

Sirve como **selector de comparación**: click en una chip la marca y la suma al [comparativa-radar]. El borde se vuelve azul; el icono de X indica que está activa. Máximo 3 personas concurrentes en el radar (limitación visual — más se vuelve sopa).`,
    howCalculated: `Las chips se construyen así:
1. Para cada miembro **activo** de \`/api/equipo\`, buscar su fila en \`/api/evaluaciones\` con \`periodo === seleccionado\`.
2. Si existe, calcular \`calificacion = avg(7 dimensiones)\`.
3. Filtrar quienes no capturaron en ese período.
4. Ordenar desc por calificación.

**Filtro por categoría**: aplica \`roleCategory(roleId)\` (Tecnología / Management / UX/UI / Servicio / Dirección / Otros) — resuelve el "PM vs PM, DEV vs DEV" sin perder los otros roles.

**Color por bucket**: \`calificacionColor()\` mapea 9+ → verde, 8 → esmeralda, 7 → azul, 6 → amarillo, 5 → naranja, < 5 → rojo.`,
    whyMatters: 'Da una lectura inmediata del estado del trimestre sin abrir la tabla. Útil para preparar 1:1s ("¿quién se autoevaluó alto/bajo este Q?") o para detectar quién aún no capturó (no aparece en el ranking). Mantener visible "X de Y se autoevaluaron" presiona suavemente para que se complete la captura del trimestre.',
    sources: [
      { label: 'ComparativaSection.tsx', href: `${GITHUB_BASE}/src/components/sections/ComparativaSection.tsx` },
      { label: 'evaluacion.ts · calcCalificacion', href: `${GITHUB_BASE}/src/utils/evaluacion.ts` },
      { label: 'roleCategory.ts', href: `${GITHUB_BASE}/src/utils/roleCategory.ts` },
    ],
  },
  {
    id: 'comparativa-radar',
    section: 'Comparativa',
    sectionSlug: 'comparativa',
    title: 'Radar comparativo',
    summary: 'Overlay de hasta 3 personas en las 7 dimensiones de evaluación. Útil para ver fortalezas relativas.',
    whatIs: `Gráfica de **radar superpuesto** con las 7 dimensiones como ejes (Actitud, Aptitudes, Comunicación, Velocidad, Análisis, Calidad, Autogestión). Cada persona seleccionada se renderiza como un polígono semi-transparente con color distinto (azul / verde / ámbar).

Aparece sólo cuando hay al menos 1 persona seleccionada. Se llena haciendo click en chips del ranking o en filas de la tabla.

Sólo aparece para personas que **sí capturaron** evaluación en el período seleccionado.`,
    howCalculated: `Datos de Recharts: para cada dimensión, una fila \`{ metric: label, [persona1]: score, [persona2]: score, [persona3]: score }\`. Personas sin captura en el período son omitidas del overlay.

**Escala**: 1-10. El radar no tiene tickEs configurados explícitamente; usa los defaults de Recharts (auto-scaled).

**Colores**: \`RADAR_COLORS = ['#3b82f6', '#10b981', '#f59e0b']\` en orden de selección.`,
    whyMatters: 'El polígono permite identificar de un vistazo fortalezas relativas — quién es más fuerte en Velocidad pero más débil en Análisis, por ejemplo. Útil para conversaciones de pairing/mentoría ("X es bueno en lo que Y necesita reforzar") y para diseñar equipos balanceados.',
    sources: [
      { label: 'ComparativaSection.tsx', href: `${GITHUB_BASE}/src/components/sections/ComparativaSection.tsx` },
    ],
  },
  {
    id: 'comparativa-tabla',
    section: 'Comparativa',
    sectionSlug: 'comparativa',
    title: 'Tabla por persona',
    summary: 'Filas por persona, columnas por dimensión. Sortable por cualquier columna. Click en fila para añadir al radar.',
    whatIs: `Tabla completa de la comparativa. Una fila por miembro activo del equipo, con su avatar + nombre + rol + categoría. Columnas:

- **Calificación** (promedio de las 7 dimensiones).
- 7 columnas de dimensión, una por cada eje.
- **Histórico**: cantidad total de capturas previas de esa persona.

A diferencia del [comparativa-ranking], la tabla muestra TODAS las personas — incluidas las que no capturaron en el período seleccionado (con "—" en las columnas numéricas). Útil para ver quién falta de evaluar.`,
    howCalculated: `**Sort**: click en cualquier encabezado de columna alterna asc/desc (default desc en \`calificacion\`). Personas sin captura quedan al final cuando se ordena por una dimensión (\`-Infinity\` como fallback).

**Selección sincronizada**: click en cualquier fila la añade al radar overlay (igual que click en chip). Las filas seleccionadas tienen tinte azul claro.

**Persistencia**: \`categoria\`, \`periodo\`, \`sortKey\`, \`sortDir\` persisten en \`pn-prefs-comparativa\` (cross-device vía \`/api/user-preferences\`). El multi-select de personas NO persiste — es exploratorio.`,
    whyMatters: 'La tabla es la **fuente granular** detrás del ranking. Ordenar por una sola dimensión responde preguntas concretas: "¿quiénes son los más fuertes en Análisis?" → sort por Análisis desc. "¿quién no se ha autoevaluado nunca?" → sort por Histórico asc.',
    sources: [
      { label: 'ComparativaSection.tsx', href: `${GITHUB_BASE}/src/components/sections/ComparativaSection.tsx` },
    ],
  },
];

export function getEntry(id: string): GlossaryEntry | undefined {
  return GLOSSARY.find((e) => e.id === id);
}

export function getEntriesBySection(slug: string): GlossaryEntry[] {
  return GLOSSARY.filter((e) => e.sectionSlug === slug);
}

/**
 * Helper para pasar a las props `info` de KPICard / ChartCard / InfoTooltip:
 * deriva la descripción del tooltip a partir del summary del glosario y
 * mantiene el anchor en sincronía con el id de la entrada.
 */
export function infoFor(id: string): { description: string; glossaryAnchor: string } | undefined {
  const entry = getEntry(id);
  return entry ? { description: entry.summary, glossaryAnchor: entry.id } : undefined;
}

/**
 * Slug de sección del glosario → page-key de permisos. Las secciones de
 * detalle heredan la page-key de su sección padre (espejo de `pageKeyForPath`
 * en src/middleware.ts). Un slug sin entrada aquí es default-ALLOW (no hay
 * página equivalente que negar). Usado por GlosarioSection y por
 * /api/glossary para filtrar entradas con la misma regla.
 */
export const GLOSSARY_SECTION_PAGE_KEY: Record<string, string> = {
  dashboard: 'dashboard',
  resumen: 'resumen',
  alertas: 'alertas',
  portafolio: 'portafolio',
  'proyecto-detalle': 'portafolio',
  roadmap: 'roadmap',
  timeline: 'timeline',
  cronograma: 'cronograma',
  pronosticos: 'pronosticos',
  'pronosticos-detalle': 'pronosticos',
  costos: 'costos',
  distribucion: 'distribucion',
  equipo: 'equipo',
  'persona-detalle': 'equipo',
  comparativa: 'comparativa',
  // 'cuenta' es ungated (siempre accesible al autenticado); su entrada de
  // glosario también lo es — no mapea a page-key.
  cursos: 'cursos',
  novedades: 'novedades',
  'metricas-dev': 'metricas-dev',
};
