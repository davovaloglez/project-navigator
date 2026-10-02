# dependencies

Parsea el campo libre `requiereDe` de cada proyecto, identifica los bloqueadores, calcula la cascada de slippage y reporta los proyectos con mayor riesgo de bloqueo.

**Source:** [../../../src/utils/dependencies.ts](../../../src/utils/dependencies.ts)

## Constantes

```ts
const CHUNK_SEPARATORS = /[,;/]|\s+y\s+|\n+|\s{2,}/gi;   // splitter multi-separador
const MIN_MATCH_LEN = 6;                                  // mínimo para fuzzy match por actividad
```

## Tipos públicos

```ts
type BlockerStatus = 'resolved' | 'active' | 'at-risk' | 'unknown' | 'person';

/** Persona del registro `equipo` cuando el chunk resolvió a una persona, no a un proyecto. */
interface BlockerPerson {
  id: string;
  name: string;   // tag o fullName del registro equipo
  image: string | null;
}

interface Blocker {
  rawText: string;
  target: ProjectRecord | null;
  forecast: ProjectForecast | null;
  status: BlockerStatus;
  /** Set cuando el chunk resolvió a una persona del registro `equipo`. */
  person: BlockerPerson | null;
}

interface ProjectDependency {
  dependent: ProjectRecord;
  dependentForecast: ProjectForecast | null;
  blockers: Blocker[];
  worstBlockerDate: string | null;
  effectiveStartDate: string | null;
  additionalSlippageDays: number | null;
  unresolvedBlockerCount: number;
}

/** Lookup de personas pasado como tercer argumento opcional a `analyzeDependencies`. */
interface EquipoLookup {
  members: MatchMember[];                            // de src/lib/equipoMatch
  byId: Map<string, { name: string; image: string | null }>;
}
```

## Funciones públicas

### `analyzeDependencies(projects, forecastById, equipo?)`

```ts
function analyzeDependencies(
  projects: ProjectRecord[],
  forecastById: Map<string, ProjectForecast>,  // ← keyed by project.id (no por folio)
  equipo?: EquipoLookup | null,                // ← opcional: lookup de personas (NAV-76)
): ProjectDependency[]
```

Nota: el segundo parámetro pasó de `forecastByFolio` (map keyed by folio) a `forecastById` (map keyed by `project.id`). Los callers construyen el map con `new Map(forecasts.map(f => [f.project.id, f]))`.

#### Algoritmo

Para cada proyecto con `requiereDe` no vacío:

1. **Split**: `requiereDe` se splittea por `,` `;` `/` `\s+y\s+` `\n` o doble espacio. Cada chunk se trimea.
2. **Match proyecto** (función `matchBlocker`): por cada chunk, busca en `projects` con 3 estrategias en orden:
   - **Folio exacto** (case-insensitive, normalizado sin acentos): `normalize(p.folio) === normalize(chunk)`.
   - **Folio substring**: si el chunk contiene el folio (o viceversa) con folio normalizado ≥ 4 chars.
   - **Actividad substring**: chunk ≥ 6 chars y `actividad.includes(chunk)` o viceversa. Tiebreak por longitud (más larga gana).
   - Se excluye el propio proyecto (`p.folio === selfFolio`).
3. **Match persona** (NAV-76, sólo si `target === null` y `equipo` fue pasado):
   - Llama `resolveId(chunk, equipo.members)` del matcher puro de `src/lib/equipoMatch`.
   - Si resuelve a un `equipo.id`, construye `BlockerPerson` con el nombre y la imagen del lookup.
   - El blocker queda con `status: 'person'`, `target: null`, `person: BlockerPerson`.
   - Si nada matchea → `target: null`, `person: null`, `status: 'unknown'`.
3. **Status del bloqueador**:
   - Sin target → `unknown`.
   - Target `Done` → `resolved`.
   - Target sin forecast → `active`.
   - Target con forecast `at-risk` o `stalled` → `at-risk`.
   - Resto → `active`.
4. **`worstBlockerDate`**: max de `forecastDate` entre bloqueadores no resueltos.
5. **`effectiveStartDate`**: max entre la `fechaInicio` del dependiente y el `worstBlockerDate`. Es cuándo *realmente* puede empezar el proyecto.
6. **`additionalSlippageDays`**: días extra de slippage por los bloqueadores. Cálculo:
   - Si hay `worstBlockerDate` y `dependentStart` válidos: `max(plannedStart, worstBlockerDate, today) - plannedStart`.
   - Si sólo hay `worstBlockerDate` sin start: `worstBlockerDate - today`.
   - Si no aplica → `null`.

Orden de la salida: por `unresolvedBlockerCount` desc; tiebreak por `additionalSlippageDays` desc.

### `blockerStatusMeta(status)`

Devuelve `{ label, color, bg }` con clases Tailwind:

| Status | Label | Color |
|---|---|---|
| `resolved` | "Resuelto" | verde |
| `active` | "Activo" | ámbar |
| `at-risk` | "En riesgo" | rojo |
| `person` | "Responsable" | azul |
| `unknown` | "No identificado" | gris |

## Helpers internos

### `normalize(s)`

Lowercase + NFD decomposition + strip diacritics + trim. Esto hace que "Configuración" matchee "configuracion".

### `splitChunks(text)`

Aplica `CHUNK_SEPARATORS` y filtra vacíos. Genérico: tolera múltiples convenciones de escritura (",", "y", line break, doble espacio, "/").

## Quién lo usa

| Caller | Uso |
|---|---|
| [`PronosticosSection`](../../../src/components/sections/PronosticosSection.tsx) | Tab "Dependencias" → render con `DependencyCard` |
| [`AlertasSection`](../../../src/components/sections/AlertasSection.tsx) | Pasa a `generateForecastAlerts` |
| [`DependencyCard`](../../../src/components/ui/DependencyCard.tsx) | Render por proyecto + `blockerStatusMeta` |

## Casos de borde

- **`requiereDe` vacío** o sólo whitespace: el proyecto se omite de la salida (no aparece como dependent).
- **Chunk muy corto (< 3 chars normalizado)**: skip silencioso. Evita matches falsos por dos letras sueltas.
- **Match por actividad necesita ≥ 6 chars**: textos como "PMO" o "API" no matchean por actividad (sólo por folio). Esto reduce falsos positivos.
- **`requiereDe` con texto humano libre** (e.g. "Esperar feedback del cliente"): ningún match → todos los chunks salen como `unknown`. La UI los muestra como notas en lugar de bloqueadores tipificados.
- **Bloqueador `Done` con fecha pasada**: cuenta como `resolved`, no aporta slippage adicional.
- **Cadena de bloqueos (A bloquea B, B bloquea C)**: `analyzeDependencies` no resuelve recursivamente. C ve a B con su forecastDate (que ya internamente refleja el delay de A si forecastEngine lo capturó). Para casos transitivos complejos haría falta un grafo, no se calcula hoy.

## Detalles no obvios

- **`forecastById` se construye por `id`, no por folio**: el caller hace `new Map(forecasts.map(f => [f.project.id, f]))`. Si el id del bloqueador no está en el map, `target` se identifica pero `forecast` queda `null` → status `active`.
- **Match persona (modo 4)**: `DependencyCard` en la UI usa `equipo.byId.get(person.id)` para mostrar el avatar y un link a `/persona/<person.id>`. Un chunk de tipo "persona" nunca contribuye a `worstBlockerDate` porque no tiene `forecast`.
- **`effectiveStartDate` no se usa en otros utils hoy**: existe para futuras integraciones (e.g. mostrar gantt con start "real" vs "planeado"). El campo más usado downstream es `additionalSlippageDays`.
- **Ordenamiento**: la UI prioriza proyectos con más bloqueadores pendientes (suelen ser los más afectados), luego los que más slippage acumulan.
- **`MIN_MATCH_LEN = 6`** fue calibrado contra el dataset real: nombres de actividad típicos tienen ≥ 10 chars, y palabras genéricas como "Login" (5 chars) generaban demasiados falsos positivos.
- **Auto-matching robusto a typos pequeños**: el `includes` bidireccional cubre cosas como `requiereDe: "PROJECT-34"` matcheando un folio `H/PROJECT-34`. No cubre typos reales ("PROJEC-34") — para eso haría falta Levenshtein, que no parece necesario hoy.
