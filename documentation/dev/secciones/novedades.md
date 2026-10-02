# `/novedades` — NovedadesSection

Historial de releases parseado de [CHANGELOG.md](../../../CHANGELOG.md). Render en accordion por versión con secciones tipo Keep-a-Changelog (Added / Changed / Fixed).

- **Componente:** [src/components/sections/NovedadesSection.tsx](../../../src/components/sections/NovedadesSection.tsx)
- **Página:** [src/pages/novedades.astro](../../../src/pages/novedades.astro)
- **Parser:** [src/utils/changelog.ts](../../../src/utils/changelog.ts)
- **LOC:** ~183
- **Filtro PM:** ❌ (no aplica — contenido estático)
- **Snapshot capture:** ❌
- **Persisted filters:** ❌

## Datos de entrada

Sin hooks de datos. La página Astro lee el changelog en build time y lo pasa por props:

```ts
// src/pages/novedades.astro
import changelogRaw from '../../CHANGELOG.md?raw';
import pkg from '../../package.json';
import { parseChangelog } from '../utils/changelog';

const releases = parseChangelog(changelogRaw);
const currentVersion = pkg.version;
```

Props:

| Prop | Tipo | Descripción |
|---|---|---|
| `releases` | `ChangelogRelease[]` | Lista parseada del CHANGELOG |
| `currentVersion` | `string` | Versión activa leída de `package.json` |

Tipos en [src/utils/changelog.ts](../../../src/utils/changelog.ts):

```ts
interface ChangelogSection { name: string; items: string[]; }
interface ChangelogRelease { version: string; date: string; sections: ChangelogSection[]; }
```

## Parser de changelog

El parser sigue el formato Keep-a-Changelog que usa el repo:

```
## [x.y.z] - YYYY-MM-DD
### Added | Changed | Fixed | ...
- bullet
  continuación indentada
```

Reglas relevantes (ver [changelog.ts](../../../src/utils/changelog.ts)):

- `RELEASE_HEADER` matchea `## [version] - date`.
- `SECTION_HEADER` matchea `### Name`.
- `BULLET` matchea `- text`.
- Líneas indentadas continúan el bullet anterior (se concatenan con espacio).
- Líneas sueltas dentro de una sección (e.g. `**Core**` como sub-encabezado) se agregan como items separados para no perderlas.

## Inline markdown renderer

`renderMarkdownInline()` en [src/utils/changelog.ts](../../../src/utils/changelog.ts) soporta solo `**bold**` y `` `code` ``. Escapa HTML primero (`&`, `<`, `>`) para evitar XSS — aunque el input viene de un archivo versionado y no de usuarios.

Render con `dangerouslySetInnerHTML` porque el input es de confianza. NO usar para datos externos.

## Render

### Sort

```ts
const sortedReleases = useMemo(
  () => [...releases].sort((a, b) =>
    b.version.localeCompare(a.version, undefined, { numeric: true })
  ),
  [releases]
);
```

Sort descendente con `localeCompare` `numeric: true` para que `v1.10.0` quede después de `v1.9.0`.

### Hero card

Muestra la versión actual (de `package.json`), fecha de release y total de releases. Tooltip vía `<GlossaryTooltip id="novedades-hero" />`.

### Accordion

Estado: `openVersions: Set<string>` con versiones expandidas. Por defecto solo se abre la `currentRelease`:

```ts
const [openVersions, setOpenVersions] = useState<Set<string>>(
  () => new Set(currentRelease ? [currentRelease.version] : [])
);
```

Botones globales **Expandir todos** / **Colapsar todos** rellenan o vacían el Set.

Cada release renderiza un `SectionBlock` por sección:

```tsx
function sectionMeta(name: string) {
  // 'added' → Sparkles verde
  // 'changed' → Wrench azul
  // 'fixed' → Bug ámbar
  // otro → FileText slate
}
```

El color/icono se decide solo por el nombre lowercased.

## Reglas especiales

- **Build-time parsing:** el changelog se importa con `?raw` (feature de Vite) y se parsea en el frontmatter Astro, no en cliente. El bundle resultante no carga regex de parser, solo el JSON serializado de releases.
- **Sin React hooks de datos:** la sección es 100% estática post-build. Cualquier cambio al CHANGELOG.md requiere re-deploy.
- **Versión actual ≠ primera del array:** `currentVersion` viene de `package.json`; si por alguna razón no matchea ninguna release del CHANGELOG, cae a `sortedReleases[0]` (la más reciente).

## Tooltips de glosario

Dos entradas en el glosario apuntan aquí:

- `novedades-hero` — en la hero card de versión actual.
- `novedades-historial` — en el encabezado "Historial de versiones".

Ambas se renderizan con `<GlossaryTooltip id="..." />`. Ver [glosario.md](./glosario.md) para detalles del sistema.

## Convenciones aplicables

- Markdown inline limitado (`**bold**`, `` `code` ``) — si necesitas más sintaxis en items del CHANGELOG, hay que extender `renderMarkdownInline()` (ojo con XSS si alguna vez se acepta input externo).
- Fechas: `formatReleaseDate()` formatea `YYYY-MM-DD` → `"17 Abr 2026"` con `Intl` español. Si la fecha es inválida retorna el string original.
- Los iconos por sección están hardcoded en `sectionMeta()`; si agregas tipos nuevos al CHANGELOG (`### Deprecated`, `### Security`), cae al default slate.
