# `/glosario` — GlosarioSection

Diccionario in-product de cada bloque visible del tablero. 149 entradas en 17 secciones, con sidebar interno, búsqueda y deep-linking por anchors.

- **Componente:** [src/components/sections/GlosarioSection.tsx](../../../src/components/sections/GlosarioSection.tsx)
- **Página:** [src/pages/glosario.astro](../../../src/pages/glosario.astro)
- **Source of truth:** [src/data/glossary.ts](../../../src/data/glossary.ts)
- **LOC:** ~247
- **Filtro PM:** ❌ (no aplica — contenido estático)
- **Snapshot capture:** ❌
- **Persisted filters:** ❌

## Datos de entrada

Sin hooks de datos de Sheets. La sección importa estáticamente del módulo `glossary` y delega el filtrado al helper compartido:

```ts
import { GLOSSARY, GLOSSARY_SECTIONS, type GlossaryEntry, type GlossarySection } from '../../data/glossary';
import { canSeeGlossarySection, canSeeGlossaryEntry } from '../../lib/glossaryFilter';
import { usePermissions } from '../../hooks/usePermissions';
```

Dos arrays del glosario:

| Constante | Tipo | Descripción |
|---|---|---|
| `GLOSSARY_SECTIONS` | `GlossarySection[]` | 1 por página del sidebar global (con `intro: { whatIs, whenToUse, related[] }`) |
| `GLOSSARY` | `GlossaryEntry[]` | 1 por bloque visible (con `summary`, `whatIs`, `howCalculated`, `whyMatters`, `sources[]`) |
| `GLOSSARY_SECTION_PAGE_KEY` | `Record<string, string>` | Mapeo slug del glosario → page-key de permisos. Fuente única usada por `glossaryFilter.ts` y por `GET /api/glossary` |

Tipos completos en [src/data/glossary.ts](../../../src/data/glossary.ts) (primeras ~40 líneas).

## Filtrado por permisos

La lógica de filtrado vive en [src/lib/glossaryFilter.ts](../../../src/lib/glossaryFilter.ts) — fuente única compartida entre la sección (cliente) y el endpoint `GET /api/glossary` (servidor). Esta separación elimina la copia inline que existía antes directamente en `GlosarioSection`.

Exports del helper:

```ts
// Visible si el page-key equivalente está en perms.pages (default-ALLOW si sin page-key)
function canSeeGlossarySection(perms: EffectivePermissions, slug: string): boolean

// Visible si su sección lo es Y block:<id> no está denegado
function canSeeGlossaryEntry(perms: EffectivePermissions, e: GlossaryEntry): boolean

// Retorna { sections, entries } ya recortados + intro.related depurado
function filterGlossary(perms: EffectivePermissions): { sections: GlossarySection[]; entries: GlossaryEntry[] }
```

El mapeo slug → page-key (antes `SECTION_PAGE_KEY` local en la sección) ahora es `GLOSSARY_SECTION_PAGE_KEY` exportado de `glossary.ts`:

```ts
// src/data/glossary.ts
export const GLOSSARY_SECTION_PAGE_KEY: Record<string, string> = {
  dashboard: 'dashboard',
  resumen: 'resumen',
  alertas: 'alertas',
  portafolio: 'portafolio',
  'proyecto-detalle': 'portafolio',   // hereda del padre
  roadmap: 'roadmap',
  timeline: 'timeline',
  cronograma: 'cronograma',
  pronosticos: 'pronosticos',
  'pronosticos-detalle': 'pronosticos',
  costos: 'costos',
  distribucion: 'distribucion',
  equipo: 'equipo',
  'persona-detalle': 'equipo',        // hereda del padre
  cursos: 'cursos',
  novedades: 'novedades',
  'metricas-dev': 'metricas-dev',
};
```

### Impacto en UI

- `visibleSections` = `GLOSSARY_SECTIONS.filter(s => canSeeGlossarySection(perms, s.slug))`.
- `allowedEntries` = `GLOSSARY.filter(e => canSeeGlossaryEntry(perms, e))` — el buscador opera sólo sobre este subconjunto.
- Sidebar muestra únicamente las secciones visibles; el contador a la derecha refleja las entradas permitidas.
- Si la sección activa queda oculta tras hidratar permisos, un `useEffect` salta automáticamente a la primera sección visible.
- Los anchors de deep-linking (`#intro-<slug>`, `#<entry-id>`) también verifican permisos antes de hacer scroll.

### API endpoint

`GET /api/glossary` ([src/pages/api/glossary.ts](../../../src/pages/api/glossary.ts)) expone las mismas reglas para el servidor MCP. Llama `filterGlossary(perms)` con los permisos del usuario autenticado (sesión o token MCP). Gateado por `page:glosario` en el middleware. Ver [api/glossary.md](../api/glossary.md).

## Layout

Grid de 2 columnas en desktop: sidebar interno (sticky) + entries.

```tsx
<div className="grid grid-cols-1 lg:grid-cols-[14rem_1fr] gap-6">
  <aside className="lg:sticky lg:top-4 ..."> ... </aside>
  <div className="space-y-6 min-w-0"> ... </div>
</div>
```

### Sidebar interno

- **Caja de búsqueda** (input search) → controla `query`.
- **Lista de secciones** con contador a la derecha. Click → scroll suave a `#intro-<slug>`.
- La sección activa se resalta con `bg-blue-500/15 text-blue-400`.

### Entries por sección

Para cada sección con resultados:

1. `<header>` con título + descripción.
2. `<IntroCard>` (solo si NO hay `query` activa) con `whatIs`, `whenToUse` y cross-refs (`related[]`).
3. Lista de `<EntryCard>` filtradas.

## Búsqueda

El buscador opera sólo sobre las entradas que el rol puede ver (`allowedEntries`):

```ts
const filtered = useMemo(() => {
  const q = query.trim().toLowerCase();
  if (!q) return allowedEntries;
  return allowedEntries.filter((e) =>
    [e.title, e.summary, e.whatIs, e.howCalculated, e.whyMatters]
      .some((t) => t.toLowerCase().includes(q))
  );
}, [query, allowedEntries]);
```

Match contra 5 campos textuales (todo en lowercase). Si no hay match, se renderiza un placeholder "Sin resultados para X".

Cuando hay query activa, las `IntroCard` se ocultan para dar prioridad a los resultados.

## Deep-linking por anchors

Dos formatos de hash soportados:

- `#<entry-id>` — apunta a una entrada específica. Resalta el card (`border-blue-500/60 ring-1`) y hace scroll suave.
- `#intro-<section-slug>` — apunta a la intro de una sección. Se usa también desde el sidebar interno.

```ts
useEffect(() => {
  function syncHash() {
    const h = window.location.hash.replace(/^#/, '');
    setHash(h);
    if (!h) return;
    if (h.startsWith('intro-')) {
      const slug = h.slice('intro-'.length);
      if (GLOSSARY_SECTIONS.some((s) => s.slug === slug)) {
        setActiveSection(slug);
        requestAnimationFrame(() => {
          document.getElementById(h)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
      }
      return;
    }
    const entry = GLOSSARY.find((e) => e.id === h);
    if (entry) setActiveSection(entry.sectionSlug);
  }
  syncHash();
  window.addEventListener('hashchange', syncHash);
  return () => window.removeEventListener('hashchange', syncHash);
}, []);
```

El `EntryCard` también auto-scroll-into-view cuando se marca highlighted (vía `useRef` + `useEffect`).

## EntryCard

Cada entrada renderiza tres bloques (separados con divisores):

1. **Header**: section name (uppercase), título, summary.
2. **¿Qué es?** / **¿Cómo se calcula?** / **¿Por qué importa?** — markdown completo via `<MarkdownText>`.
3. **Sources** (footer): links a GitHub (etiquetas + ícono `<ExternalLink>`).

`<MarkdownText>` ([src/components/ui/MarkdownText.tsx](../../../src/components/ui/MarkdownText.tsx)) es un renderer ligero sin dependencias que soporta `**bold**`, `` `code` ``, listas `- ` y bloques ` ``` `. `<InlineMarkdown>` es el mismo pero single-line (sin `<p>`).

## Conexión con tooltips

El glosario es el "lado largo" de un sistema dual:

| Surface | Componente | Datos |
|---|---|---|
| Tooltip inline (icono "i") | `<GlossaryTooltip id="<entry-id>" />` o prop `info={infoFor('...')}` en `KPICard`/`ChartCard` | `summary` (1-2 oraciones) |
| Página `/glosario` | Esta sección | `whatIs`, `howCalculated`, `whyMatters`, `sources[]` |

`infoFor(id)` en [glossary.ts](../../../src/data/glossary.ts) retorna `{ description, glossaryAnchor }` para pasar a la prop `info` de `KPICard` / `ChartCard`. El `glossaryAnchor` se construye como `/glosario#<id>`, permitiendo navegación directa desde tooltip a entrada completa.

Ver [convenciones #13-14](../arquitectura/convenciones.md) para reglas de cuándo agregar tooltips, tono, formato de IDs.

## Reglas especiales

- **No usar HTML literal en el contenido del glosario.** Todo es Markdown procesado por `MarkdownText`. Si necesitas algo que no esté soportado (tablas, imágenes), extiende el renderer en lugar de meter HTML en el string.
- **Cross-refs validados a mano.** Los `related[].slug` deben apuntar a slugs existentes en `GLOSSARY_SECTIONS`. Hay un validador shell en [CLAUDE.md](../../../CLAUDE.md) (sección "Glosario y Tooltips") que detecta refs rotas y entradas huérfanas. Correr antes de commit.
- **Cada entrada debe tener al menos 1 source.** El campo `sources` apunta a GitHub usando `GITHUB_BASE` + ruta relativa. Con `#L<n>-L<m>` cuando se quiere apuntar a un rango específico.
- **No es contenido editorial libre.** El tono es ejecutivo: 1-2 oraciones en `summary`, prosa concisa en los tres bloques principales (formula + por qué importa para negocio). Ver convenciones para reglas de tono.

## Cómo agregar una entrada nueva

Resumen (detalle en [convenciones.md](../arquitectura/convenciones.md)):

1. Agregar entrada a `GLOSSARY` en [glossary.ts](../../../src/data/glossary.ts). ID en kebab-case con prefijo de sección (`portafolio-card-progress`).
2. En el `*Section.tsx` del bloque, agregar `info={infoFor('<id>')}` al `KPICard`/`ChartCard`, o envolver el título custom con `<GlossaryTooltip id="<id>" />`.
3. Validar cross-refs con el script de [CLAUDE.md](../../../CLAUDE.md).

## Convenciones aplicables

- [Glosario y tooltips (convenciones #13-14)](../arquitectura/convenciones.md).
- Single tooltip por bloque visual (KPI, chart, sección agrupada). No por filtro / search / toggle.
- Render markdown limitado (sin HTML literal).
