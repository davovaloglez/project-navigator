# changelog

Parser de `CHANGELOG.md` (formato Keep-a-Changelog) y helpers de render. Alimenta la página `/novedades` con releases estructurados.

**Source:** [../../../src/utils/changelog.ts](../../../src/utils/changelog.ts)

## Tipos públicos

```ts
interface ChangelogSection {
  name: string;          // 'Added' | 'Changed' | 'Fixed' | ...
  items: string[];
}

interface ChangelogRelease {
  version: string;       // '1.7.0'
  date: string;          // 'YYYY-MM-DD'
  sections: ChangelogSection[];
}
```

## Funciones públicas

### `parseChangelog(raw)`

```ts
function parseChangelog(raw: string): ChangelogRelease[]
```

Parsea el contenido del `CHANGELOG.md` siguiendo este shape:

```markdown
## [1.7.0] - 2026-05-09
### Added
- Item de feature
  Continuación indentada del item anterior.
- Otro item

### Fixed
- Bug corregido
```

Regexes:

| Regex | Captura |
|---|---|
| `RELEASE_HEADER` (`/^##\s*\[([\d.]+)\]\s*-\s*(\d{4}-\d{2}-\d{2})\s*$/`) | version, date |
| `SECTION_HEADER` (`/^###\s+(.+?)\s*$/`) | name |
| `BULLET` (`/^-\s+(.*)$/`) | item text |

Comportamiento:
- Líneas en blanco "flushean" el item actual.
- Una línea indentada (`/^\s+\S/`) tras un bullet se concatena al item.
- Una línea no-bullet dentro de una section (e.g. `**Core**` como subheader) se agrega como item suelto para preservar visibilidad.
- Líneas antes del primer release header se ignoran.

### `renderMarkdownInline(text)`

Renderer minimalista. Escapa `&<>` y aplica:
- `**bold**` → `<strong class="text-white font-semibold">…</strong>`
- `` `code` `` → `<code class="px-1 py-0.5 bg-slate-700/60 text-cyan-300 rounded text-[0.85em] font-mono">…</code>`

**Notar**: input viene del `CHANGELOG.md` versionado en el repo, no de usuarios. No hay vector de XSS, pero el escape de `&<>` se hace de todos modos para seguridad por capas.

### `formatReleaseDate(iso)`

```ts
function formatReleaseDate('2026-04-17') // → '17 abr 2026'
```

Usa `toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })`. Si el ISO no parsea, retorna el input sin tocar.

## Quién lo usa

| Caller | Uso |
|---|---|
| [`NovedadesSection`](../../../src/components/sections/NovedadesSection.tsx) | Parsea, agrupa por sección, rinde con accordion |
| [`pages/novedades.astro`](../../../src/pages/novedades.astro) | Lee `CHANGELOG.md` del filesystem y se lo pasa al section |

## Casos de borde

- **`CHANGELOG.md` vacío**: retorna `[]`.
- **Releases sin sections**: aparece con `sections: []`.
- **Sections con un solo item multi-línea**: el flush en línea en blanco o nuevo bullet/section concatena correctamente.
- **Líneas sueltas en una section** (no bullet, no indent): se agregan como items sueltos. Ejemplo histórico: `**Core**` en v1.0.0 se preserva como item visible.
- **Header mal formado** (e.g. `## [1.7.0] - sin-fecha`): no matchea `RELEASE_HEADER` y se omite. Si el bullet siguiente cae en "sin release actual", también se omite (`if (!currentRelease) continue`).
- **HTML literal en el bullet**: queda escapado, no se renderiza como HTML.

## Detalles no obvios

- **El parser es line-based y de un solo pase**: O(n) en tamaño del archivo. No hay límites prácticos.
- **`renderMarkdownInline` no soporta listas dentro de listas, headers, ni links**: si el CHANGELOG empieza a usar features Markdown más ricas, hay que extender el renderer (o sustituirlo por una lib full). Hoy es deliberadamente minimal.
- **Date locale `es-MX`**: produce abreviatura "abr", "may" sin punto en algunos navegadores. La UI lo acepta tal cual.
- **Releases ordenados según aparezcan en el archivo**: por convención del proyecto, el `CHANGELOG.md` lista la versión más reciente primero. El parser no reordena.
