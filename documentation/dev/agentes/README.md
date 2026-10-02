# Agentes, comandos y hooks de Claude Code

Esta sección documenta la **infraestructura de automatización** del repo — sub-agentes, slash commands y hooks configurados para Claude Code. No es parte del producto que ven los usuarios finales; es tooling para el equipo de desarrollo.

Todo vive en [.claude/](../../../.claude/):

```
.claude/
├── agents/                ← definiciones de sub-agentes
│   └── docs-keeper.md
├── commands/              ← slash commands
│   └── sync-docs.md
├── settings.json          ← hooks (compartido con el equipo)
├── settings.local.json    ← permisos personales (gitignored)
└── skills/                ← skills locales (pre-existente)
```

## Inventario

| Tipo | Nombre | Trigger | Propósito |
|---|---|---|---|
| Agente | [docs-keeper](docs-keeper.md) | `/sync-docs` o invocación manual | Mantiene `documentation/` en sync con `src/` |
| Comando | [`/sync-docs`](docs-keeper.md#slash-command-sync-docs) | Manual (chat) | Invoca al docs-keeper con scope configurable |
| Hook | [Stop reminder](hooks.md#stop-reminder) | Automático al cerrar sesión | Avisa si tocaste `src/` sin tocar `documentation/` |

## Conceptos rápidos

**Sub-agentes** son LLMs especializados con un system prompt y un set de tools restringido. Se invocan con la herramienta `Agent` o vía slash command. Documentación: <https://docs.anthropic.com/en/docs/claude-code/sub-agents>.

**Slash commands** son prompts pre-armados que el usuario dispara con `/<nombre>`. Pueden ejecutar tools antes de pasar el control al modelo. Documentación: <https://docs.anthropic.com/en/docs/claude-code/slash-commands>.

**Hooks** son scripts shell que se ejecutan en eventos del ciclo de vida de Claude Code (Stop, PostToolUse, SessionStart, etc.). Son **deterministas** — no son LLM, son `bash`. Documentación: <https://docs.anthropic.com/en/docs/claude-code/hooks>.

## Cuándo usar cada cosa

| Necesito… | Usa… |
|---|---|
| Una operación compleja que requiere razonar sobre el código | Sub-agente |
| Disparar una operación con una frase corta | Slash command (puede invocar un agente) |
| Reaccionar automáticamente a un evento (write, stop, etc.) sin LLM | Hook |
| Algo determinista y rápido | Hook |
| Algo que necesita leer + decidir | Sub-agente |

## Archivos esperados

Cada sub-agente debe tener:

- Definición en [.claude/agents/](../../../.claude/agents/) con frontmatter (`name`, `description`, `tools`, `model`).
- Documentación en este directorio, una `<nombre>.md` por agente.
- Si tiene slash command propio, registrar en [.claude/commands/](../../../.claude/commands/) y mencionar en su doc.
- Permisos necesarios listados en `settings.local.json` o `settings.json`.

## Cómo agregar un agente nuevo

1. Crea `.claude/agents/<nombre>.md` con frontmatter:
   ```yaml
   ---
   name: <nombre>
   description: Cuándo invocar este agente (esto lo lee el LLM padre)
   tools: Read, Edit, Write, Bash, Grep, Glob
   model: sonnet
   ---
   System prompt detallado…
   ```
2. Si hace falta una invocación corta, crea `.claude/commands/<verbo>.md` que delegue al agente.
3. Documenta el agente en `documentation/dev/agentes/<nombre>.md` usando como template [docs-keeper.md](docs-keeper.md).
4. Agrega cualquier permiso de Bash que necesite el agente a `.claude/settings.local.json` (personal) o `.claude/settings.json` (equipo).
5. Si requiere reaccionar a eventos, añade el hook a `.claude/settings.json` y documéntalo en [hooks.md](hooks.md).
6. Actualiza la tabla **Inventario** de este README.

## Convenciones

- **Idioma del system prompt**: inglés (los modelos siguen instrucciones en inglés con más precisión). Las respuestas al usuario pueden ser en español si el prompt lo indica.
- **Idioma de la documentación** (este directorio): español como el resto.
- **Frontmatter** debe ser válido YAML — sin tabs, indentación con 2 espacios.
- **Tools restringidos al mínimo necesario.** Un agente que sólo lee no debe tener `Write`/`Edit`.
- **Model:** `sonnet` por default. Reservar `opus` para agentes con razonamiento muy complejo.
- **Sin secretos** en ningún archivo. Si un agente necesita credenciales, que las lea de env vars.

## Permisos

`.claude/settings.json` se commitea — pone aquí permisos que **todo el equipo** necesita.

`.claude/settings.local.json` está en `.gitignore` — pon aquí permisos personales (paths absolutos a tu home, etc.).

Para que un agente pueda correr `git diff` o similares sin pedir permiso constantemente, agrega entradas a `permissions.allow` con globs.

## Troubleshooting general

| Síntoma | Causa | Solución |
|---|---|---|
| `/sync-docs` no aparece autocompletado | El archivo `.claude/commands/sync-docs.md` no existe o tiene frontmatter inválido | Verifica YAML del frontmatter |
| El agente "no se invoca" desde chat | El `description` del agente no menciona los triggers correctos | Edita el frontmatter `description` con keywords ("when the user X", "after Y", etc.) |
| El hook no se ejecuta | El JSON de `settings.json` es inválido, o el matcher no aplica | Valida con `node -e "JSON.parse(require('fs').readFileSync('.claude/settings.json'))"` |
| Hook ruidoso | Imprime cuando no debería | Revisa la condición; el comando del hook va a `stderr` con `>&2` |
| Permisos no se aplican | Globs no matchean el comando exacto | Imprime el comando que Claude quiere correr y ajusta el glob |

## Más adelante

Si esta sección crece, dividir en sub-archivos:

```
agentes/
├── README.md
├── docs-keeper.md
├── comandos.md          ← si hay >2 slash commands
├── hooks.md             ← si hay >1 hook
└── <nuevo-agente>.md
```
