# usePersistedFilters

## Propósito

Persistir per-user el estado de UI de cada sección (filtros, toggles, sort, tab activo) entre recargas y entre dispositivos. Antes de existir este hook cada sección guardaba su estado en `useState` que se perdía al recargar y nada se compartía entre el laptop del PM y su tablet.

El hook resuelve cuatro cosas:

1. **Cross-device** vía endpoint `/api/user-preferences` (Turso, scope per-user).
2. **Anti-flash** con cache local: el primer render usa el último valor conocido en `localStorage` para evitar que la UI parpadee de "todo desmarcado" a "filtros aplicados".
3. **Debounce + abort**: cada cambio de estado se escribe a localStorage al instante pero al server se acumula 500ms; la primera PUT en vuelo se aborta cuando llega otra.
4. **Merge con defaults**: si agregas un campo nuevo al shape, el estado guardado por sesiones viejas no rompe — el campo nuevo entra con su default.

## Source

[../../../src/hooks/usePersistedFilters.ts](../../../src/hooks/usePersistedFilters.ts)

## Firma

```ts
export interface UsePersistedFiltersReturn<T> {
  state: T;
  setState: (updater: T | ((prev: T) => T)) => void;
  clear: () => void;
  hydrated: boolean;
}

export function usePersistedFilters<T extends object>(
  sectionKey: string,
  defaults: T
): UsePersistedFiltersReturn<T>;
```

- `sectionKey`: slug kebab-case, único por sección. Debe matchear `/^[a-z0-9-]{1,64}$/` (validado server-side).
- `defaults`: objeto plano. Único shape permitido; arrays o primitivos deben ir envueltos en propiedades.
- `T extends object`: el estado siempre es un objeto plano para que `mergeDefaults` pueda combinar campos.

## Comportamiento

### Mount (síncrono)

1. `useState(() => loadFromLocal(sectionKey, defaults))` corre **antes** del primer render. Lee `localStorage['pn-prefs-<sectionKey>']`, hace `mergeDefaults` y devuelve el resultado. Si no hay cache o el JSON está corrupto, devuelve `defaults`.
2. `hydrated = false`.

### Mount (async)

3. `useEffect` dispara `fetch('/api/user-preferences')` con `AbortController`.
4. La respuesta es `{ [sectionKey]: value, ... }` con todas las prefs del usuario; el hook selecciona la suya por `sectionKey`.
5. Si llega un objeto válido: `mergeDefaults` con los defaults actuales, `setStateRaw(merged)`, `saveToLocal(merged)`, `setHydrated(true)`.
6. Si falla la red o el endpoint: `setHydrated(true)` igual y se queda con el cache local.

### Cambio de estado (`setState`)

1. Calcula `next` aplicando el updater (puede ser valor o función).
2. `saveToLocal(next)` — escritura síncrona.
3. `pendingValueRef.current = next` — guarda el valor "más reciente conocido".
4. Cancela el `setTimeout` anterior si existe.
5. Programa un `setTimeout(..., 500ms)` que al disparar lee `pendingValueRef` y llama `pushRemote(value)`.

### `pushRemote(value)`

1. Aborta cualquier PUT en vuelo (`inflightRef`).
2. Envía `PUT /api/user-preferences` con `{ sectionKey, value }`.
3. En éxito: nada (silencio).
4. En fallo distinto de `AbortError` y `attempt === 0`: re-intenta una sola vez después de 2 segundos con el valor más reciente de `pendingValueRef` (puede haber avanzado).
5. Si el retry también falla: `console.warn`. No se reintenta más.

### Unmount

Si hay un debounce pendiente, se cancela el timeout y se llama `pushRemote(pendingValueRef.current)` directamente — flush sincrónico antes de que React tire el componente. Garantiza que un cambio reciente seguido de un navigate no se pierda.

### `clear()`

1. Cancela el debounce pendiente y aborta el PUT en vuelo.
2. `clearLocal(sectionKey)`.
3. `setStateRaw(defaultsRef.current)` — vuelve al default sin esperar al server.
4. `DELETE /api/user-preferences?section=<key>` fire-and-forget.

## Estado interno

| Slot | Tipo | Para qué |
|---|---|---|
| `state` | `useState<T>` | Estado expuesto al consumidor. Inicializado síncrono desde localStorage. |
| `hydrated` | `useState<boolean>` | `true` después del primer GET (éxito o fallo). Permite a la sección decidir si mostrar skeleton vs. ya pintar filtros. |
| `defaultsRef` | `useRef<T>` | Snapshot del último `defaults` recibido. Permite que `clear` use el default actual sin agregar `defaults` a dependencias. |
| `debounceRef` | `useRef<Timeout \| null>` | Handle del `setTimeout` activo. Se cancela en cada `setState`. |
| `inflightRef` | `useRef<AbortController \| null>` | Controller del PUT actual. Se aborta cuando llega otro `setState`. |
| `pendingValueRef` | `useRef<T \| null>` | Valor más reciente. Lo usa el debounce y el retry para no enviar valores stale. |

## Side effects

- **localStorage:** lectura síncrona en mount; escritura síncrona en cada `setState` y al hidratar desde server. Key: `pn-prefs-<sectionKey>`.
- **Red:**
  - 1 `GET /api/user-preferences` en mount.
  - 1 `PUT /api/user-preferences` por debounce window (500ms).
  - 1 `DELETE /api/user-preferences?section=<key>` por `clear()`.
- **Timers:** un `setTimeout(500ms)` por debounce; un `setTimeout(2000ms)` por retry fallido.

## Persistencia

- **Cache local:** `localStorage['pn-prefs-<sectionKey>']` con el JSON del estado completo. Sólo para anti-flash en el siguiente mount.
- **Server:** Turso table `user_preferences` con PK compuesta `(userId, sectionKey)` y columna `value` JSON. Ver [api/user-preferences.md](../api/user-preferences.md) y [src/db/auth-schema.sql](../../../src/db/auth-schema.sql).
- **Sin sync entre tabs ni dispositivos en vivo.** Sólo en mount. Para ver cambios de otra sesión, recargar la página.

## Casos edge

- **Quota error en localStorage:** el `try/catch` traga la excepción. La persistencia server-side sigue funcionando; el próximo mount tira de server (más lento pero correcto).
- **JSON corrupto en localStorage:** `loadFromLocal` devuelve `defaults` y la próxima escritura sobrescribe el JSON malo.
- **Server 401:** el `useSheetData` está aparte. Aquí simplemente cae al `catch` y se queda con cache local. La sección ya redirigió a `/login` desde otro `useSheetData` paralelo.
- **Server 500:** identical — `hydrated = true`, estado = cache local.
- **Campo nuevo agregado a `defaults`:** `mergeDefaults` lo inyecta tanto en la hidratación desde local como desde server. Old state `{ filters: {...} }` + new defaults `{ filters: {}, sort: 'desc' }` → resultado `{ filters: {...del cache}, sort: 'desc' }`.
- **Valor stale (un PM ya no existe):** el filtro no matchea nada en el dataset. El estado lo sigue conteniendo; aceptable. Ver [arquitectura/convenciones.md](../arquitectura/convenciones.md) sección "Persistencia de filtros".
- **Cambio rápido (5 setStates en 100ms):** sólo se hace 1 PUT al server, con el valor final. El localStorage tiene los 5 estados intermedios (todos sobrescritos hasta el último).
- **Navigate durante debounce:** el cleanup del effect de unmount llama `pushRemote(pendingValueRef.current)` directamente sin esperar al timeout.

## Patrón de uso

```tsx
// src/components/sections/ProyectosSection.tsx
import { usePersistedFilters } from '../../hooks/usePersistedFilters';

interface ProyectosState {
  filters: Record<string, string[]>;
  includeDone: boolean;
}

export default function ProyectosSection() {
  const { state: persisted, setState: setPersisted, clear: clearPersisted } =
    usePersistedFilters<ProyectosState>('proyectos', { filters: {}, includeDone: false });

  const activeFilters = persisted.filters;
  const includeDone = persisted.includeDone;

  const setActiveFilters = useCallback(
    (updater: Record<string, string[]> | ((prev: Record<string, string[]>) => Record<string, string[]>)) =>
      setPersisted((prev) => ({
        ...prev,
        filters: typeof updater === 'function' ? updater(prev.filters) : updater,
      })),
    [setPersisted],
  );

  // Búsqueda libre va en useState aparte — no se persiste.
  const [search, setSearch] = useState('');

  return (
    <>
      <FilterDropdowns
        active={activeFilters}
        onChange={setActiveFilters}
        onClear={() => { clearPersisted(); setSearch(''); }}
      />
      {/* ... */}
    </>
  );
}
```

Reglas concretas del snippet:

- Todo lo persistible va en un solo objeto pasado al hook. Filtros y toggles separados se derivan con `useCallback`.
- `search` y `page` no van adentro — son exploratorios y molestan al quedar pegados entre sesiones.
- `clearPersisted` se cablea al botón "Limpiar" de `FilterDropdowns`. Si la sección también tiene `search`, se resetean ambos en el mismo handler.

## Convenciones relacionadas

- [arquitectura/convenciones.md](../arquitectura/convenciones.md) — sección "Persistencia de filtros (cross-session)" tiene las reglas completas (qué persistir, qué `sectionKey` usar, cómo cablear el botón "Limpiar").
- [api/user-preferences.md](../api/user-preferences.md) — contrato del endpoint server-side.
