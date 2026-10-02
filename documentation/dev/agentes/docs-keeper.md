# Agente — docs-keeper

Sub-agente especializado en mantener `documentation/` en sync con `src/`. Es el primero del repo; sirve también como referencia para futuros agentes.

- **Definición:** [.claude/agents/docs-keeper.md](../../../.claude/agents/docs-keeper.md)
- **Slash command:** `/sync-docs`
- **Hook asociado:** Stop reminder (ver [hooks.md](hooks.md))
- **Modelo:** sonnet
- **Tools:** Read, Edit, Write, Bash, Grep, Glob

## Propósito

Después de un cambio en el código, hay un período en el que la doc y el código discrepan: se renombra una función, se cambia un threshold, se agrega un endpoint. Este agente cierra ese gap.

No reemplaza la doc inicial (esa la escribimos a mano con cuidado). Cierra el **drift**: cambios chicos que se acumulan y rompen la fidelidad de la documentación.

## Trigger

El agente se invoca de tres formas:

1. **Manual:** `/sync-docs` en el chat. Recomendado al final de una sesión de coding antes de commitear.
2. **Programática:** el modelo padre lo invoca con `Agent({ subagent_type: 'docs-keeper', prompt: '…' })` cuando detecta que el usuario terminó cambios en directorios trackeados.
3. **Indirecta:** el Stop hook imprime un recordatorio si terminaste una sesión con cambios en `src/` sin tocar `documentation/`. El usuario decide si correr `/sync-docs`.

## Source-to-doc mapping

El agente sabe qué doc actualizar para cada source que cambió:

| Source path | Doc(s) afectada(s) |
|---|---|
| `src/components/sections/XYZSection.tsx` | `documentation/dev/secciones/<slug>.md` + `documentation/user/secciones/<slug>.md` |
| `src/components/sections/*DetailSection.tsx` | `documentation/dev/secciones/<slug>-detalle.md` + user version |
| `src/utils/<name>.ts` | `documentation/dev/utils/<name>.md` |
| `src/hooks/<name>.ts` | `documentation/dev/hooks/<name>.md` |
| `src/pages/api/<name>.ts` | `documentation/dev/api/<name>.md` |
| `src/pages/api/snapshots/auto-capture.ts` | `documentation/dev/api/snapshots-auto-capture.md` |
| `src/components/ui/*.tsx` | Entrada en `documentation/dev/componentes/ui.md` |
| `src/components/charts/*.tsx` | Entrada en `documentation/dev/componentes/charts.md` |
| `src/data/glossary.ts` | Verificar `documentation/dev/arquitectura/convenciones.md §13` + correr validador de cross-refs |
| `src/middleware.ts`, `src/lib/auth.ts`, `src/db/*` | `documentation/dev/arquitectura/auth.md` |
| `astro.config.mjs`, `.env.example` | `documentation/dev/arquitectura/overview.md` |
| `package.json` (deps mayores) | `documentation/dev/arquitectura/overview.md` |

Excepciones que el agente conoce: nombres de section no siempre matchean el slug obvio (`DistribucionPuntosSection.tsx` → `distribucion.md`). Antes de asumir, busca el doc existente en el directorio destino.

## Workflow del agente

Para cada source que cambió:

1. **Lee la versión actual** del archivo source.
2. **Lee `git show HEAD~1:<path>`** si necesita el diff.
3. **Lee la doc correspondiente.** Si no existe (archivo nuevo), la crea desde el template adecuado en `COMO-DOCUMENTAR.md`.
4. **Identifica drift:**
   - Firmas TypeScript desactualizadas.
   - Constantes/thresholds que cambiaron (ej. `STALE_THRESHOLD = 14 → 21`).
   - Listas hardcoded (filtros, opciones) que ya no matchean.
   - Funciones renombradas → links rotos.
   - Secciones nuevas no registradas en `dev/secciones/README.md`.
   - Cambios user-visible que necesitan update a `Preguntas comunes` del user doc.
5. **Edita** vía `Edit`/`Write`, respetando el estilo: español, identifiers en inglés, sin emojis, links relativos sin sufijo `:LINE` (usar `#L42`).
6. **Valida** corriendo el script del [COMO-DOCUMENTAR.md](../../COMO-DOCUMENTAR.md#validador-de-links).
7. **Si glossary.ts cambió**, corre también el validador de cross-refs de `convenciones.md §13`.

## Slash command `/sync-docs`

Sintaxis:

```
/sync-docs                  # default: working tree vs HEAD + untracked
/sync-docs working          # explícito (idem)
/sync-docs staged           # sólo cambios staged
/sync-docs branch           # rama actual vs origin/main
/sync-docs src/utils/foo.ts # un path específico
```

El comando:

1. Resuelve el scope a una lista de archivos (con `git diff --name-only ...`).
2. Filtra a los directorios trackeados (los del mapping de arriba).
3. Si la lista está vacía, no invoca al agente — sólo dice "docs presumiblemente en sync".
4. Si hay archivos, **delega al docs-keeper** con la lista explícita.
5. Cuando termina el agente, muestra su summary (files updated/created, validator result).

**No commitea** los cambios. Los deja en working tree para que el usuario revise con `git diff documentation/` y stage selectivo.

## Lo que el agente NO toca

Por diseño:

- **Código bajo `src/`** — el agente es read-only sobre código. Si encuentra que la doc dice algo que el código no hace, **la doc está mal**, no el código.
- **`CHANGELOG.md`** — el equipo lo mantiene a mano por release.
- **`documentation/PROYECTO.md`** — sólo lo modifica si hay cambios mayores (stack, capacidad top-level, integración nueva).
- **`documentation/COMO-DOCUMENTAR.md` y `documentation/dev/arquitectura/convenciones.md`** — son deliberados; el agente redirige al usuario si le piden cambiarlos.
- **`documentation/README.md`, `documentation/user/README.md`, `documentation/dev/README.md`** — sólo actualiza si hubo agregar/renombrar/eliminar de secciones.

## Casos en los que el agente debe rehusar

- Pedirle docs para código que **no existe todavía**. Le dice al usuario que implemente primero.
- Diffs gigantes (cientos de archivos — refactor masivo). Sugiere acotar el scope.
- Pedirle cambiar convenciones (`COMO-DOCUMENTAR.md`, `convenciones.md`).

## Output esperado

Al terminar, el agente imprime:

```
Files reviewed: N
Files updated: M
Files created: K
Files unchanged but verified: L
Validator result: OK / N broken links
```

Y para cada edit, una línea de racional:

> Updated `dev/utils/stale.md`: stale threshold 14d → 21d in line with src/utils/stale.ts

## Cuándo NO usarlo

- En un PR con docs **ya** sincronizadas (waste).
- Antes de implementar — el agente no inventa código.
- Para grandes reescrituras de doc — eso es trabajo humano.
- Para crear la documentación inicial de un proyecto desde cero — esa requiere decisiones de estructura que el agente no debe tomar.

## Cómo mejorarlo

El agente vive en [.claude/agents/docs-keeper.md](../../../.claude/agents/docs-keeper.md). Si encuentras que:

- Está editando docs incorrectamente para algún caso → ajusta el system prompt en la sección **Source-to-doc mapping** o **Anti-patterns**.
- Toma decisiones que deberían ser tuyas → agrega una regla a **When you should refuse**.
- Le faltan permisos → agrega entradas a `permissions.allow` en `settings.local.json`.

Después de modificar el prompt, prueba con `/sync-docs` en un cambio pequeño antes de soltarlo en algo grande.

## Permisos requeridos

Para que el agente corra sin pedir confirmación constante, en `.claude/settings.local.json`:

```json
{
  "permissions": {
    "allow": [
      "Bash(git diff --name-only *)",
      "Bash(git merge-base *)",
      "Bash(git ls-files *)",
      "Bash(git show *)",
      "Bash(node -e ' *)"
    ]
  }
}
```

Ya están instalados; ver el archivo actual.

## Limitaciones conocidas

1. **No detecta cambios de comportamiento sutil.** Si renombras una variable interna pero no cambias output, el agente no se da cuenta — está bien, no hay drift.
2. **No reescribe prosa user-facing salvo cuando hay cambios objetivos.** Si quieres reescribir un párrafo del user doc, hazlo tú.
3. **Confía en `git` para el scope.** Si tienes archivos sin trackear que tocan `src/`, los detecta con `git ls-files --others --exclude-standard`, pero si están en `.gitignore` no los ve.
4. **No invoca a otros sub-agentes.** Es self-contained.

## Roadmap (ideas)

Cosas que podríamos agregar más adelante si el agente se usa lo suficiente:

- **Auto-sync en pre-commit** vía git hook (no Claude hook).
- **Sugerencias de entradas al glosario** cuando se agrega un KPI/chart nuevo.
- **Detección de funciones públicas no documentadas** en utils.
- **Modo "dry-run"** que solo reporta qué docs cambiaría sin tocarlas.
