# theme

Hook `useTheme` para toggle entre dark/light. Único utility-as-hook (la convención del repo permite la excepción cuando el "calculo" requiere estado React y DOM access).

**Source:** [../../../src/utils/theme.tsx](../../../src/utils/theme.tsx)

## API pública

```ts
function useTheme(
  defaultTheme: Theme = 'dark',
  apply: (theme: Theme) => void = applyTheme
): { theme: 'dark' | 'light'; toggle: () => void }

export function applyCs360Theme(theme: Theme): void
```

`useTheme` es el hook compartido por toda la app. `applyCs360Theme` es una función de aplicación alternativa exportada sólo para CS360 (ver sección "Modo CS360" abajo).

## Persistencia y propagación

| Mecanismo | Detalle |
|---|---|
| `localStorage` | Key `'project-navigator-theme'`, valor `'dark'` o `'light'`. Default: `defaultTheme` (normalmente `'dark'`; CS360 usa `'light'`) |
| DOM | `document.documentElement.classList.add/remove('dark'/'light')` (aplicación estándar) |
| Cross-component | Custom event `pn-theme-change` con `detail: Theme` en `window`. Todas las instancias del hook escuchan y se sincronizan |

## Comportamiento del hook

1. `useState<Theme>(() => getStoredTheme(defaultTheme))`: lee `localStorage` en mount. Si no hay valor, usa `defaultTheme`.
2. `useEffect` (mount):
   - Llama `apply(theme)` para aplicar la clase al `<html>`.
   - Registra listener de `pn-theme-change` para sincronizar estado interno si el toggle se llama desde otro componente.
   - El efecto **no** re-corre si `apply` cambia de referencia; `apply` se trata como una referencia estable de módulo.
3. `toggle()` (memoizado con `[theme, apply]`):
   - Invierte el theme.
   - Llama `apply(newTheme)`.
   - Persiste en `localStorage`.
   - Dispara `pn-theme-change` con el nuevo valor.

## Modo CS360

CS360 (`/cs360`) importa `global.css`, cuyos overrides `html.light` están pensados para la app dark-first y romperían la paleta clara del mock de CS360. Por eso CS360 usa la función `applyCs360Theme` en lugar de `applyTheme`:

```ts
import { useTheme, applyCs360Theme } from '../../utils/theme';

// En Cs360App.tsx:
const { theme, toggle } = useTheme('light', applyCs360Theme);
```

`applyCs360Theme` nunca añade la clase `light` — en modo claro deja el `<html>` sin clases de tema (look del mock original); en modo oscuro agrega `dark` (estilos en `cs360-dark.css`, scoped a la página). El estado y la persistencia en `localStorage` son idénticos al resto de la app.

## SSR-safety

`getStoredTheme(fallback)` chequea `typeof window === 'undefined'` y retorna `fallback` cuando se ejecuta server-side. El `useEffect` aplica la clase real una vez montado en cliente.

**Riesgo de FOUC**: como la clase la setea el JS post-hydration, hay un breve flash si el user tiene tema persistido distinto al default. Solución usada en el codebase: el `<html>` viene con `class="dark"` por default en `Layout.astro`, así que el flash sólo aplica para users con tema `light` guardado. Aceptable hoy.

## Uso (app principal)

```ts
import { useTheme } from '../../utils/theme';

function ThemeToggle() {
  const { theme, toggle } = useTheme();
  return (
    <button onClick={toggle} aria-label="Toggle theme">
      {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
    </button>
  );
}
```

## Quién lo usa

| Caller | Uso |
|---|---|
| [`Header`](../../../src/components/layout/Header.tsx) | Botón de toggle global en la barra superior (app principal) |
| [`Cs360App`](../../../src/components/sections/cs360/Cs360App.tsx) | Toggle de tema con `defaultTheme='light'` y `apply=applyCs360Theme` |

Cualquier otro componente que necesite leer el theme actual puede invocar `useTheme()` sin penalty: el hook ya escucha el event global, así que todas las instancias quedan sincronizadas sin prop-drilling.

## Casos de borde

- **Theme valor inválido en `localStorage`** (e.g. usuario lo modificó manualmente): el cast `as Theme` no valida, así que un valor "purple" sería aplicado al DOM como clase. En la práctica `applyTheme` sólo añade `light` o `dark`, así que valores extraños no rompen el DOM, pero el state queda con basura. Es un riesgo aceptable.
- **`window.dispatchEvent` en SSR**: imposible — el `toggle` sólo se llama desde click handler en cliente.
- **Componente que monta antes de que `Header` haya cargado el theme**: ambos `useState(getStoredTheme)` leen el mismo `localStorage` y arrancan iguales. No hay race condition.

## Detalles no obvios

- **`.tsx` no `.ts`**: aunque no devuelve JSX, el archivo se nombra `.tsx` por convención del repo para hooks que viven en utils.
- **`applyTheme` toggle add/remove explícitamente**: no usa `classList.toggle('dark')` para evitar ambiguedades cuando ambas clases pueden existir simultáneamente (estados intermedios).
- **No respeta `prefers-color-scheme` del sistema**: la decisión es siempre dark by default. Si se quisiera respetar la preferencia del sistema, habría que detectarla en `getStoredTheme` con `window.matchMedia('(prefers-color-scheme: light)')`.
- **El event `pn-theme-change` es propietario del proyecto**: el namespace `pn-` se usa también en `pn-weekly-snapshots` (localStorage) y `pn-prefs-<sectionKey>`. Si en el futuro agregamos más eventos custom, mantener ese prefijo evita colisiones con libs.
