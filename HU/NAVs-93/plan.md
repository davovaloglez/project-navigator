# Plan de acción — NAVs-93 (Fixes - Navs)

Rama: `fix/NAVs-93-Fixes-Navs`

Cinco ajustes agrupados en dos productos: **cs360** (1) y **pNav** (4). Cada uno es independiente; se pueden commitear por separado.

---

## 1. cs360 — icono de búsqueda en el directorio colapsado

**Problema:** el buscador de clientes ya existe ([Cs360App.tsx:338-348](../../src/components/sections/cs360/Cs360App.tsx#L338-L348)) pero vive **dentro** del directorio expandido. Cuando el directorio está colapsado al riel angosto ([Cs360App.tsx:247-281](../../src/components/sections/cs360/Cs360App.tsx#L247-L281)) no hay forma de buscar.

**Decisión:** el icono **expande el directorio y enfoca el buscador**.

**Cambios** (todo en `Cs360App.tsx`):
- Agregar un `useRef<HTMLInputElement>(null)` y cablearlo al `<input>` de búsqueda existente.
- En el riel colapsado, agregar un `<button>` con el icono `Search` (ya importado de lucide-react) entre "Mostrar directorio" y "Dashboard global".
- Su `onClick`: `setCollapsed(false)` (vía `toggleCollapsed` o setter directo) + en el siguiente tick `requestAnimationFrame(() => searchRef.current?.focus())` para enfocar tras el re-render.
- `title`/`aria-label`: "Buscar cliente".
- Mismo estilo que los otros botones del riel (`p-2 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-slate-100`).

**Riesgo:** mínimo. No toca lógica de filtrado.

---

## 2. pNav — "ocultar terminados" en el Resumen del integrante

**Problema:** [ResumenTab.tsx](../../src/components/sections/persona-detalle/ResumenTab.tsx) muestra **todos** los proyectos (KPIs, distribución por estatus, radar) sin filtro. El toggle `includeDone` ya existe en `PersonaDetailSection` (estado persistido, [PersonaDetailSection.tsx:82-91](../../src/components/sections/PersonaDetailSection.tsx#L82-L91)) y lo usa `ProyectosTab`.

**Decisión:** reutilizar el mismo estado `includeDone` para que el toggle sea consistente entre tabs (no crear un segundo estado).

**Cambios:**
- `PersonaDetailSection.tsx:438` — pasar `includeDone` y `setIncludeDone` a `<ResumenTab>` (hoy sólo recibe `personProjects` y `stats`).
- `ResumenTab.tsx`:
  - Aceptar props `includeDone` / `setIncludeDone`.
  - Derivar `listProjects` con `isTerminal()` de [projectStatus.ts](../../src/utils/projectStatus.ts) en vez de sólo `=== 'Done'`. **Nota:** `ProyectosTab` hoy filtra sólo `'Done'`; para "terminados" lo correcto es `isTerminal()` (Done + Cancelado). Decisión: usar `!isTerminal()` aquí; opcionalmente alinear `ProyectosTab` al mismo predicado para consistencia (incluido en este commit).
  - Recalcular `statusData`, `projectsChartData` y las métricas del radar sobre `listProjects`.
  - Agregar el botón toggle (mismo markup/estilo que [ProyectosTab.tsx:52-62](../../src/components/sections/persona-detalle/ProyectosTab.tsx#L52-L62)) en el header del tab.
- **Cuidado:** si `stats` se calcula en el padre sobre todos los proyectos, decidir si los KPIs del Resumen deben respetar el toggle. Propuesta: el toggle afecta los bloques visuales del Resumen (distribución/radar/lista) pero los KPIs duros agregados pueden quedarse completos — confirmar al implementar mirando qué consume `stats`.

**Riesgo:** bajo. Sin nuevos endpoints.

---

## 3. pNav — costo del proyecto en la card

**Problema:** [ProjectCard.tsx](../../src/components/ui/ProjectCard.tsx) (usado en /portafolio) no muestra costo. `ProyectosSection` no trae datos de costos.

**Decisión:** mostrar **costo mensual estimado** (`estimateProjectCost().estimatedMonthlyCost`, `formatMoney`), **gated por `data:costos`** — oculto para roles sin permiso de costos (dev/ventas).

**Cambios:**
- `ProyectosSection.tsx`:
  - Agregar `const costosQ = useSheetData<CostoRecord>('/api/costos');` (junto a las queries de tareas/cursos, [ProyectosSection.tsx:35-37](../../src/components/sections/ProyectosSection.tsx#L35-L37)).
  - **Gating natural:** si el rol no tiene `data:costos`, el endpoint responde 403 y `useSheetData` expone `forbidden` + data vacía (no rompe). Cuando `costosQ.forbidden` o `!costosQ.data?.length`, **no** se pasa costo → la card no lo muestra. Esto reaprovecha el patrón existente sin tocar middleware.
  - Construir un `Map<projectId, number>` con `estimateProjectCost(project, data, costosQ.data)` para cada proyecto (usar `data` completo como `allProjects` para no inflar el prorrateo — ver convención de costos prorrateados en CLAUDE.md).
  - Pasar `cost={costMap.get(p.id)}` a `<ProjectCard>` ([ProyectosSection.tsx:236](../../src/components/sections/ProyectosSection.tsx#L236)).
- `ProjectCard.tsx`:
  - Prop opcional `cost?: number`.
  - Renderizar en la fila de metadata (junto a points/health) con icono `DollarSign` y `formatMoney(cost)`; sólo si `cost != null`.
  - Tooltip de glosario opcional reutilizando una entrada de costos.

**Verificación de seguridad:** confirmar que un rol `dev`/`ventas` no ve el costo (el 403 de `/api/costos` debe ocultar el bloque). Esto cierra la fuga que tendría mostrarlo ungated en una página `page:portafolio`.

**Riesgo:** medio — es el único item con implicación de permisos. Probar con un usuario sin `data:costos`.

---

## 4. pNav — Cronograma

### 4a. Mecanismo de identificación más claro (leyenda de colores)

**Problema:** las cards de Cronograma ([CronogramaSection.tsx:797-866](../../src/components/sections/CronogramaSection.tsx#L797-L866)) usan colores por tipo de tarea (`getTipoTareaColor`) y badges de estatus, pero **no hay leyenda** que explique el código de color — a diferencia del dashboard, cuyos donuts muestran leyenda de puntos de color + label (patrón en [EstatusDonutChart.tsx:39-46](../../src/components/charts/EstatusDonutChart.tsx#L39-L46)).

**Decisión:** agregar una **leyenda de colores** (estilo dashboard) para tipo de tarea / estatus.

**Cambios:**
- En `CronogramaSection.tsx`, sobre la grilla de cards (después de los filtros), agregar un bloque de leyenda: `flex flex-wrap gap-x-4 gap-y-1.5`, cada item = punto de color (`w-2.5 h-2.5 rounded-full` con el color de `getTipoTareaColor(tipo)`) + label.
- Cubrir las dimensiones que el color codifica en la card. Empezar por **Tipo de tarea** (API/SP/App/Web/Análisis/SQA/Prototipo, paleta de `colors.ts`); evaluar añadir una segunda fila para estatus si aporta.
- `GlossaryTooltip` opcional al lado del título de la leyenda.

**Pendiente menor:** confirmar contra el screenshot exacto qué dimensión causa más confusión (tipo vs estatus). Por defecto: tipo de tarea.

### 4b. "¿Qué es el número arriba del Ideal?" — relabel + tooltip

**Hallazgo (respuesta a la duda):** es el widget de burndown ([CronogramaSection.tsx:486-521](../../src/components/sections/CronogramaSection.tsx#L486-L521)). El número grande cian arriba del mini-chart es **`burndown.donePts` = puntos de historia completados** (`done / total — % avance`). La línea punteada gris del chart es la línea **"Ideal"** (burndown lineal teórico), y la palabra "Ideal" sólo aparece en el tooltip del hover. No hay bug; es ambigüedad de etiqueta.

**Decisión:** **relabel + tooltip** para que se lea sin ambigüedad.

**Cambios:**
- Añadir un micro-label al número headline (p.ej. "pts completados") para que no se confunda con el "Ideal" del tooltip.
- Mejorar/añadir leyenda inline al chart explicando las dos series: **Restantes** (área cian) vs **Ideal** (línea punteada = ritmo lineal esperado).
- Actualizar/crear la entrada de glosario `cronograma-burndown-puntos` para que el `InfoTooltip` ([CronogramaSection.tsx:493](../../src/components/sections/CronogramaSection.tsx#L493)) explique ambas series y qué significa el número.

**Riesgo:** mínimo, sólo presentación.

---

## Orden sugerido de ejecución

1. **#1 cs360 search** (aislado, rápido).
2. **#2 ocultar terminados** (aislado, bajo riesgo).
3. **#4a leyenda** + **#4b relabel burndown** (mismo archivo, un commit de Cronograma).
4. **#3 costo en card** (último; requiere prueba de permisos con rol sin `data:costos`).

## Tests / verificación
- No hay funciones puras nuevas significativas → no se agregan tests unitarios salvo que se extraiga lógica de filtrado.
- `npx astro check` + `npm test` deben pasar.
- Verificación manual: rol `admin` (ve costo), rol `dev` (no ve costo); toggle de terminados en Resumen; icono de búsqueda en cs360 colapsado; leyenda y label de burndown en Cronograma.
- Considerar `docs-keeper` / glosario: #3 y #4b tocan superficies con entradas de glosario (actualizar `src/data/glossary.ts` para la leyenda y el burndown).

## Dudas resueltas
- cs360 search → expandir + enfocar. ✔
- Costo → mensual estimado, gated por `data:costos`. ✔
- Cronograma identificación → leyenda de colores. ✔
- Burndown "Ideal" → relabel + tooltip. ✔
