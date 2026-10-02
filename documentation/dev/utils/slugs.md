# slugs

Codifica/decodifica folios para que sean URL-safe. Astro routing splittea segmentos por `/`, así que un folio como `H/PROJECT-34` no puede ir directo a `/proyecto/[folio]` sin escapar.

**Source:** [../../../src/utils/slugs.ts](../../../src/utils/slugs.ts)

## Funciones

```ts
function folioToSlug(folio: string): string {
  return folio.replace(/\//g, '--');
}

function slugToFolio(slug: string): string {
  return slug.replace(/--/g, '/');
}
```

Convención: cada `/` se reemplaza por `--`. Es bijectiva en el dominio asumido (folios no contienen `--` literal).

| Folio (Sheet) | Slug (URL) |
|---|---|
| `H/PROJECT-34` | `H--PROJECT-34` |
| `BIT-12` | `BIT-12` |
| `A/B/C-1` | `A--B--C-1` |

## Quién lo usa

| Caller | Uso |
|---|---|
| `<Link href={`/proyecto/${folioToSlug(p.folio)}`}>` | Cada link a detalle de proyecto |
| `<Link href={`/pronosticos/${folioToSlug(p.folio)}`}>` | Detalle de pronóstico |
| Routes `[folio].astro`: `const folio = slugToFolio(Astro.params.folio)` | Decodifica en server |

Llamantes principales: [`ProjectCard`](../../../src/components/ui/ProjectCard.tsx), [`ForecastCard`](../../../src/components/ui/ForecastCard.tsx), [`AnomalyCard`](../../../src/components/ui/AnomalyCard.tsx), [`DependencyCard`](../../../src/components/ui/DependencyCard.tsx), [`BacktestCard`](../../../src/components/ui/BacktestCard.tsx), [`CriticalDatesList`](../../../src/components/ui/CriticalDatesList.tsx), [`SlippageCostCard`](../../../src/components/ui/SlippageCostCard.tsx), y todas las sections que linkean a `/proyecto/[folio]` o `/pronosticos/[folio]`.

## Casos de borde

- **Folio con `--` literal**: la conversión de regreso produciría una `/` espuria. En el dataset actual no ocurre, pero si llegara a aparecer, habría que cambiar el separador (e.g. `__` o un percent-encoding del slash).
- **Folio vacío**: ambos retornan `''`. Las rutas dinámicas en Astro requieren el param presente; un folio vacío debería filtrarse antes de generar el link.
- **Caracteres no-ASCII**: las funciones no escapan acentos ni espacios. En la práctica los folios son alfanuméricos (`H/PROJECT-34`); si cambia la convención hay que añadir `encodeURIComponent`.

## Detalles no obvios

- **No usar `encodeURIComponent` en su lugar**: `%2F` se ve feo y algunos middlewares/CDN lo decodifican antes de routing, rompiendo el match.
- **Helper simétrico**: `slugToFolio(folioToSlug(f)) === f` siempre. Asegurate de invocar el codec consistentemente en cualquier nuevo link/route.
