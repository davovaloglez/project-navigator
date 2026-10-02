# useSheetData

## Propósito

Fetch genérico tipado contra cualquier endpoint `/api/*` que devuelva un array JSON. Resuelve cinco problemas que de otra forma cada sección reimplementaría mal:

1. Retry automático ante errores transitorios (1 reintento, sin loops).
2. Aborto de fetches en vuelo cuando el endpoint cambia o el componente se desmonta — evita el clásico "setState on unmounted component" y race conditions entre dos fetches simultáneos.
3. Manejo de **401 → `/login`**: si la sesión expiró, redirige preservando la ruta actual para volver tras login.
4. Manejo de **403 → `forbidden`**: si el usuario no tiene permiso, activa el flag `forbidden` (sin error fatal, sin retry). La sección lo usa para mostrar un estado de "sin acceso" en lugar de romper la página.
5. Loading/error states uniformes que el resto de la UI puede consumir sin lógica condicional.

## Source

[../../../src/hooks/useSheetData.ts](../../../src/hooks/useSheetData.ts)

## Firma

```ts
interface UseSheetDataResult<T> {
  data: T[];
  loading: boolean;
  error: string | null;
  /** true si el endpoint respondió 403 (sin permiso). NO es un error fatal:
   *  el consumidor debe ocultar la sección/dato, no romper la página. */
  forbidden: boolean;
  refetch: () => void;
}

export function useSheetData<T>(endpoint: string): UseSheetDataResult<T>;
```

El parámetro genérico `T` es el tipo de **cada elemento** del array devuelto por el endpoint. Ejemplos: `useSheetData<ProjectRecord>('/api/proyectos')`, `useSheetData<TareaRecord>('/api/tareas')`.

## Comportamiento

### Mount

1. `useEffect` con dependencia `[fetchData]` dispara `fetchData()`.
2. `fetchData` aborta cualquier controller previo, crea uno nuevo y lo guarda en `abortRef`.
3. `setLoading(true)` + `setError(null)`.
4. `fetch(endpoint, { signal })` lee el endpoint.
5. En éxito: `setData(json)` y `retriedRef = false`.
6. `finally`: si el controller no fue abortado, `setLoading(false)`. Si fue abortado, `loading` queda en el estado en el que estaba — el cleanup del effect siguiente lo resetea.

### Cambio de `endpoint`

`fetchData` se recrea (`useCallback` depende de `endpoint`), el `useEffect` corre el cleanup (abort) y vuelve a fetch. El controller viejo se aborta antes de crear el nuevo, evitando que respuestas tardías sobrescriban data más reciente.

### Unmount

El cleanup del effect llama `abortRef.current?.abort()`. La respuesta en vuelo se descarta y el `setLoading(false)` final no se ejecuta porque el guard `if (!controller.signal.aborted)` lo previene.

### Refetch manual

`refetch()` resetea `retriedRef` y llama `fetchData()` directamente. Útil para botones "Recargar" en estado de error.

## Estado interno

| Slot | Tipo | Para qué |
|---|---|---|
| `data` | `useState<T[]>` | Array tipado. Default `[]` para que la UI nunca tenga que chequear null. |
| `loading` | `useState<boolean>` | `true` por default (la primera UI ve loader, no estado vacío). |
| `error` | `useState<string \| null>` | Mensaje legible del último error (post-retry). |
| `forbidden` | `useState<boolean>` | `true` si el endpoint respondió 403. Mutualmente excluyente con `error`. Se resetea en éxito. |
| `retriedRef` | `useRef<boolean>` | Marca si ya se reintentó este ciclo. Evita loops infinitos. Se resetea en éxito y en `refetch()`. |
| `abortRef` | `useRef<AbortController \| null>` | Controller del fetch en vuelo. Se aborta antes de crear uno nuevo y en cleanup. |

## Side effects

- **Red:** un `fetch(endpoint)` por mount. Si falla y no era retry, dispara un segundo fetch inmediato (sin backoff). El segundo fallo se reporta como error.
- **Navigation:** `window.location.href = '/login?redirect=...'` en 401. La redirección preserva `pathname + search` codificado.
- **Sin localStorage, sin timers.** Toda la coordinación es vía `AbortController`.

## Persistencia

Ninguna. Es un hook puramente reactivo; cada mount fetch-ea desde cero. La cache de 5 min vive en el endpoint server-side (`let cache = { data, timestamp }`), no aquí. Ver [arquitectura/data-flow.md](../arquitectura/data-flow.md) para el modelo de caching completo.

## Casos edge

- **401:** la promesa retorna antes de setear estado. `loading` queda en `true` porque el navegador ya está navegando; el componente se desmonta antes de pintar otro frame.
- **403:** setea `forbidden: true`, `data: []`, no hay retry. `loading` queda en `false`. El consumidor debe mostrar un estado de "sin acceso", no un error técnico.
- **AbortError:** se ignora (`return` temprano en el `catch`). No cuenta como error visible ni dispara retry.
- **Network error (offline, DNS):** `fetch` rejecta con `TypeError`. Cae al `catch`, dispara retry una vez, y si vuelve a fallar setea `error`.
- **HTTP 5xx:** el `!res.ok` lanza `Error('Error 500: ...')`. Trata igual que network error: 1 retry y luego error visible.
- **JSON inválido:** `res.json()` rejecta; mismo path que 5xx.
- **Race en cambio de endpoint:** el primer fetch se aborta antes de que su `setData` corra. La data del segundo endpoint nunca convive con la del primero.
- **Doble mount en StrictMode:** el cleanup aborta el primer fetch antes de que termine. El segundo mount hace su propio fetch. Como `setLoading(false)` está protegido por el guard de `aborted`, no hay race.

## Patrón de uso

```tsx
// src/components/sections/ProyectosSection.tsx
import { useSheetData } from '../../hooks/useSheetData';
import type { ProjectRecord, TareaRecord, CursoRecord } from '../../utils/dataTransforms';

export default function ProyectosSection() {
  const { data, loading, error, refetch } = useSheetData<ProjectRecord>('/api/proyectos');
  const tareasQ = useSheetData<TareaRecord>('/api/tareas');
  const cursosQ = useSheetData<CursoRecord>('/api/cursos');

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} onRetry={refetch} />;

  return <ProjectsGrid projects={data} tareas={tareasQ.data} cursos={cursosQ.data} />;
}
```

Convenciones implícitas en el snippet:

- Una sección puede llamar `useSheetData` varias veces; cada llamada es independiente.
- Se renombra el resultado con destructuring (`tareasQ`) cuando hay varios para no chocar identifiers.
- El loader y el error van a componentes UI dedicados; nunca lógica condicional inline cruzada con el render principal.

## Convenciones relacionadas

- [arquitectura/convenciones.md](../arquitectura/convenciones.md#1-sections-son-los-únicos-consumidores-de-hooks-de-datos) — sólo Sections llaman este hook.
- [arquitectura/data-flow.md](../arquitectura/data-flow.md) — flujo Sheets → endpoint → hook → sección.
- [arquitectura/auth.md](../arquitectura/auth.md) — por qué el middleware retorna 401 JSON y cómo se conecta con el redirect a `/login`.
