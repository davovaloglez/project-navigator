# Cómo documentar Project Navigator

Guía para mantener y extender esta documentación. Léela **antes** de:

- Agregar una sección, endpoint, utility, hook o componente al código.
- Cambiar reglas de negocio que afecten lo que ya está documentado.
- Renombrar archivos o rutas.

## Filosofía

La documentación tiene **dos audiencias separadas** y nunca se mezclan:

| Carpeta | Audiencia | Tono | Contenido |
|---|---|---|---|
| [user/](user/) | PMs, dirección, miembros del equipo que **consultan el tablero** | Conversacional, sin tecnicismos | Qué ves, cómo lo usas, por qué importa |
| [dev/](dev/) | Devs que **mantienen el código** | Técnico, denso, con código | Arquitectura, reglas, fórmulas, firmas TS |

Una entrada en `user/secciones/X.md` y otra en `dev/secciones/X.md` describen **la misma pantalla** pero con perspectivas distintas. Es deliberado: un PM no debería leer dev/, un dev no debería tener que filtrar el "para qué sirve" cuando busca un detalle de implementación.

El **glosario in-product** (`/glosario`, en [src/data/glossary.ts](../src/data/glossary.ts)) es una tercera capa: catálogo vivo de KPIs y bloques visuales, accesible desde tooltips. **No es esta documentación.** Esta es estructural; el glosario es punto-a-punto.

## Estructura

```
documentation/
├── README.md                  ← índice maestro (público)
├── COMO-DOCUMENTAR.md         ← este archivo
├── PROYECTO.md                ← visión general (legacy, mantener al día)
│
├── user/
│   ├── README.md              ← índice de la guía de usuario
│   └── secciones/             ← una entrada por sección del sidebar
│
└── dev/
    ├── README.md              ← índice técnico
    ├── arquitectura/          ← stack, data flow, auth, convenciones
    ├── secciones/             ← una entrada por section component
    ├── api/                   ← una entrada por endpoint
    ├── utils/                 ← una entrada por módulo en src/utils
    ├── hooks/                 ← una entrada por hook
    └── componentes/           ← ui.md + charts.md (no uno por componente)
```

**Regla:** una entrada por unidad de código (`X.md` por cada `XSection.tsx`, `proyectos.md` por cada `api/proyectos.ts`, etc.). Excepción: componentes UI van agrupados en `ui.md` y charts en `charts.md` porque son demasiados para uno por archivo.

## Cuándo actualizar qué

| Cambio en el código | Doc a actualizar |
|---|---|
| Nueva sección (`XYZSection.tsx`) | `dev/secciones/xyz.md` + `user/secciones/xyz.md` + ambos `README.md` |
| Nueva ruta del sidebar | `user/README.md` (índice) y `dev/secciones/README.md` (matriz) |
| Nuevo endpoint | `dev/api/<nombre>.md` + `dev/api/README.md` |
| Nuevo util | `dev/utils/<nombre>.md` + `dev/utils/README.md` |
| Nuevo hook | `dev/hooks/<nombre>.md` + `dev/hooks/README.md` |
| Nuevo componente UI / chart | Agregar entrada en `dev/componentes/ui.md` o `charts.md` |
| Cambio en fórmula (healthScore, forecast, etc.) | El util correspondiente en `dev/utils/` |
| Cambio en convenciones globales (filtro PM, persistencia) | `dev/arquitectura/convenciones.md` |
| Nuevo widget del Dashboard | `dev/secciones/dashboard.md` (sección "Widgets") + `user/secciones/dashboard.md` (lista) + `glossary.ts` |
| Cambio en behaviour de auth | `dev/arquitectura/auth.md` |
| Variable de entorno nueva | `dev/arquitectura/overview.md` + `.env.example` |

**Regla de oro:** un PR que toca código sin actualizar la doc correspondiente es un PR incompleto. Quien revise el PR debe pedir la doc.

## Convenciones de estilo

### Idioma

- **Prosa en español.**
- **Identificadores en inglés** (nombres de funciones, archivos, tipos, props).
- Términos técnicos sin traducir si son nombres propios del código: `useSheetData`, `WeeklySnapshot`, `ProjectRecord`.

### Sin emojis

No usar emojis en ningún archivo. Si necesitas iconografía visual, usa caracteres tipográficos discretos (✅, ❌, ⚠️) **sólo** en tablas donde aporten claridad — nunca en prosa.

### Markdown

- **Tablas** para enumerar opciones, mappings, configs.
- **Code blocks** con fence triple para snippets multi-línea.
- **`inline code`** para nombres de funciones, variables, valores literales.
- **Listas** sin numerar para enumeraciones; numeradas para pasos secuenciales.
- **Headings**: `# H1` sólo uno por archivo (título). `##` para secciones principales.

### Links

**Siempre relativos.** Estilo `[texto](path/relativo.md)`:

```md
Ver [src/utils/forecastEngine.ts](../../../src/utils/forecastEngine.ts) para detalles.
```

**No** uses sufijos `:42` (rompen el path). Si necesitas una línea específica:

```md
Ver [ProjectCard.tsx#L42](../../../src/components/ui/ProjectCard.tsx#L42)
```

`#L42` o `#L42-L60` son los fragments que respetan tanto GitHub como VSCode.

**Externos** (`http://`/`https://`) sólo cuando son documentación oficial de una librería (Astro, React, Recharts, Better-Auth).

### Tono

**User docs:**
- Habla al lector ("ves", "haces clic").
- 1-2 oraciones por idea.
- Sin condicionales largas. Sin "podría", "sería". Directo.
- Empieza por el *para qué*, no por el *qué*.

**Dev docs:**
- Tono neutral, declarativo.
- TypeScript signatures cuando aplique.
- Fórmulas y constantes explícitas (no "más o menos", "alrededor de").
- Comentarios `// ←` apuntando a detalles relevantes en snippets.

## Templates

### Template — sección (dev)

```md
# `/ruta` — XYZSection

Una frase de propósito.

- **Componente:** [src/components/sections/XYZSection.tsx](../../../src/components/sections/XYZSection.tsx)
- **Página:** [src/pages/ruta.astro](../../../src/pages/ruta.astro)
- **LOC:** ~NN
- **Filtro PM:** ✅ / —
- **Snapshot capture:** ✅ / —
- **Persisted filters:** key `xyz` / —

## Datos de entrada

| Hook | Endpoint | Uso |
|---|---|---|
| `useSheetData<…>` | `/api/…` | … |

## Cálculos

(Snippets de useMemo más importantes con comentarios.)

## Reglas especiales

(Cualquier cosa no obvia. Si la sección persiste algo, qué key. Si calcula costos prorrateados, cómo. Si tiene name matching, por qué.)

## Convenciones aplicables

- [Filtro PM](../arquitectura/convenciones.md#9-filtro-por-pm-global) — si aplica.
- [Persistencia](../arquitectura/convenciones.md#10-persistencia-de-filtros-cross-session) — si aplica.
- Otras según corresponda.
```

### Template — sección (user)

```md
# Título de la sección — subtítulo conciso

Frase de apertura: para qué sirve esta sección en términos prácticos.

## ¿Para qué sirve?

- Bullet con caso de uso 1.
- Bullet con caso de uso 2.
- …

## ¿Qué ves?

### Sub-bloque 1
Descripción de lo que aparece.

### Sub-bloque 2
…

## ¿Cómo lo uso?

Pasos accionables: filtra primero, luego haz X, después Y.

## ¿Por qué importa?

Una idea: qué rol cumple esta sección en el flujo del tablero.

## Preguntas comunes

- **¿Por qué no veo X?** Respuesta.
- **¿Cómo cambio Y?** Respuesta.
- **¿Esto sincroniza entre dispositivos?** Respuesta.
```

### Template — util

```md
# nombre.ts

Una frase de propósito.

- **Source:** [src/utils/nombre.ts](../../../src/utils/nombre.ts)

## Exports públicos

### `funcionPrincipal(args): RetornoTipo`

Qué hace.

```ts
function funcionPrincipal(p: ProjectRecord): HealthDetail { … }
```

**Algoritmo:** (paso por paso, con fórmulas, constantes, thresholds).

**Casos de borde:** (qué retorna si datos vacíos, fechas inválidas, etc.).

## Quién lo usa

- `dev/secciones/foo.md`
- `dev/secciones/bar.md`

## Detalles no obvios

(Workarounds, decisiones contrarias a lo intuitivo, bugs históricos que motivaron la implementación.)
```

### Template — endpoint API

```md
# `GET /api/recurso`

- **Source:** [src/pages/api/recurso.ts](../../../src/pages/api/recurso.ts)
- **Auth:** middleware (sesión requerida)
- **Sheet/range:** `Tab!A1:Z200`
- **Cache:** 5 min en memoria por lambda

## Request

(Query params, body si POST/PUT.)

## Response

```ts
type Recurso = { … };
```

Ejemplo:

```json
[{ "campo": "valor", … }]
```

## Mapping header → field

| Header (sheet) | Field (response) | Parser |
|---|---|---|
| `folio` | `folio` | direct |
| `% progreso` | `progreso` | parseProgress (0-1) |
| `fin estimado` | `finEstimado` | parseDate (ISO) |
| … | … | … |

## Errores

(500 con `{ error }`, condiciones que lo disparan.)

## Side effects

(Lecturas/escrituras a Sheets, Turso, etc.)

## Detalles no obvios

(Excel serial dates, normalización de %, etc.)
```

### Template — hook

```md
# useNombre

## Propósito

Qué problema resuelve.

## Source

[src/hooks/useNombre.ts](../../../src/hooks/useNombre.ts)

## Firma

```ts
export function useNombre<T>(args): Result { … }
```

## Comportamiento

(Mount, state changes, unmount.)

## Side effects

(Network, localStorage, debounces.)

## Patrón de uso

```tsx
const { data, loading } = useNombre(...);
```

## Casos edge

(Aborts, retries, race conditions.)
```

## Validador de links

Antes de cualquier commit a `documentation/`, corre:

```bash
node -e "
const fs = require('fs');
const path = require('path');
const ROOT = process.cwd();
const DOCS = path.join(ROOT, 'documentation');
function walk(dir, acc = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, acc);
    else if (e.name.endsWith('.md')) acc.push(p);
  }
  return acc;
}
function stripCode(s) { return s.replace(/\`\`\`[\s\S]*?\`\`\`/g, '').replace(/\`[^\`]*\`/g, ''); }
const LINK_RE = /(?<!\!)\[([^\]]*)\]\(([^)]+)\)/g;
const broken = [];
for (const file of walk(DOCS)) {
  const src = stripCode(fs.readFileSync(file, 'utf8'));
  const dir = path.dirname(file);
  let m;
  while ((m = LINK_RE.exec(src)) !== null) {
    const target = m[2].trim();
    if (/^(https?:|mailto:|#)/i.test(target)) continue;
    const pathPart = target.split('#')[0].split('?')[0];
    if (!pathPart) continue;
    const resolved = path.resolve(dir, pathPart);
    if (!fs.existsSync(resolved)) broken.push({ file: path.relative(ROOT, file), target });
  }
}
console.log(broken.length ? broken : 'OK');
"
```

**Debe imprimir `OK`.** Si imprime una lista de objetos, arregla cada uno antes de commitear.

Causas comunes de rotura:

- Renombraste un archivo `src/*` y olvidaste actualizar links.
- Usaste sufijo `:42` (línea) en vez de fragment `#L42`.
- Path relativo cuenta mal los niveles de `../`.
- Apuntaste a un nombre legacy (`DashboardSection.md` en vez de `dashboard.md`).

## Validador del glosario

Aparte del validador de docs, **antes de commitear cambios a `src/data/glossary.ts`**, corre el validador de cross-refs descrito en [dev/arquitectura/convenciones.md §13](dev/arquitectura/convenciones.md#13-tooltips-y-glosario).

## Workflow para una sección nueva

1. **Implementa la sección** (`XYZSection.tsx`, `xyz.astro`, endpoints si aplica).
2. **Lee y aplica** [dev/arquitectura/convenciones.md](dev/arquitectura/convenciones.md): filtro PM, persistencia, snapshot integrity, name matching, slugs, tooltips.
3. **Crea entradas al glosario** en `src/data/glossary.ts`: una `GlossarySection` con `intro` + entradas `GLOSSARY` por cada bloque visual (KPI, chart, tabla agrupada).
4. **Crea las dos docs:** `dev/secciones/xyz.md` y `user/secciones/xyz.md` usando los templates de arriba.
5. **Actualiza índices:**
   - `user/README.md` (si la sección aparece en sidebar).
   - `dev/secciones/README.md` (matriz de datos).
6. **Corre los dos validadores** (links y glosario).
7. **PR.**

## Workflow para un cambio de fórmula o regla

Ejemplo: cambias el threshold de "stale" de 14 a 21 días en [src/utils/stale.ts](../src/utils/stale.ts).

1. Actualiza el código.
2. Actualiza [dev/utils/stale.md](dev/utils/stale.md) con el nuevo número.
3. Si el cambio afecta lo que el usuario ve (badge "Sin avance"), actualiza el `Preguntas comunes` del o los `user/secciones/*.md` que mencionan stale (Portafolio, Alertas).
4. Si el cambio afecta la fórmula visible en el glosario, actualiza `glossary.ts`.
5. CHANGELOG.md con la entrada Changed.

## Anti-patrones a evitar

- ❌ Documentar código que vas a borrar la próxima semana. Si es transitorio, no documentes.
- ❌ Duplicar contenido entre dev y user. Cada audiencia tiene su perspectiva propia.
- ❌ Convertir user docs en manuales paso a paso de 50 pasos. Si tu sección necesita eso, probablemente la UI tiene un problema.
- ❌ Copiar texto del glosario al doc. El glosario es la source of truth para definiciones de KPIs; el doc debe explicar **dónde** y **cómo** se usa, linkeando al glosario.
- ❌ Dejar links `:42` (suffix de línea). Usar `#L42` o quitar la línea.
- ❌ Usar paths absolutos en links (`/Users/...`). Siempre relativos.
- ❌ Subir docs sin correr el validador.
- ❌ Documentar workarounds sin explicar **por qué**. Si el comentario sólo describe lo que hace el código (que ya se lee), es ruido.

## Checklist final antes de commitear documentación

- [ ] El doc nuevo o actualizado refleja el código actual (no la intención previa).
- [ ] User doc no contiene tecnicismos. Dev doc tiene snippets/firmas cuando aplica.
- [ ] Links relativos, sin sufijos `:NN`, sin paths absolutos.
- [ ] Índices (`README.md`) actualizados si corresponde.
- [ ] Validador de links pasa con `OK`.
- [ ] Validador de glosario pasa si tocaste `glossary.ts`.
- [ ] CHANGELOG.md actualizado si el cambio es user-visible.
