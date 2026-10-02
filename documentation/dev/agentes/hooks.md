# Hooks de Claude Code

Hooks instalados en [.claude/settings.json](../../../.claude/settings.json). Son scripts `bash` que se ejecutan en eventos del ciclo de vida de Claude Code, **no LLMs**.

Documentación oficial: <https://docs.anthropic.com/en/docs/claude-code/hooks>.

## Eventos disponibles

| Evento | Cuándo dispara |
|---|---|
| `PreToolUse` | Antes de ejecutar una tool (puede bloquear) |
| `PostToolUse` | Después de ejecutar una tool exitosamente |
| `UserPromptSubmit` | Cuando el usuario envía un prompt (puede inyectar contexto) |
| `Stop` | Cuando Claude termina su respuesta |
| `SubagentStop` | Cuando un sub-agente termina |
| `Notification` | Eventos de notificación (idle, permission required, etc.) |
| `SessionStart` | Al iniciar una sesión |
| `SessionEnd` | Al cerrar una sesión |
| `PreCompact` | Antes de compactar el contexto |

## Hooks instalados

### Stop reminder

```json
{
  "hooks": {
    "Stop": [
      {
        "matcher": "",
        "hooks": [{
          "type": "command",
          "command": "bash -c 'cd \"$CLAUDE_PROJECT_DIR\" 2>/dev/null || cd \"$(pwd)\"; changed_src=$(git diff --name-only HEAD 2>/dev/null | grep -E \"^(src/components/sections/|src/utils/|src/hooks/|src/pages/api/|...)\" || true); changed_docs=$(git diff --name-only HEAD 2>/dev/null | grep -E \"^documentation/\" || true); if [ -n \"$changed_src\" ] && [ -z \"$changed_docs\" ]; then count=$(echo \"$changed_src\" | wc -l | tr -d \" \"); echo \"\\n[docs-keeper] $count source file(s) changed without doc updates. Run /sync-docs to review.\" >&2; fi; exit 0'"
        }]
      }
    ]
  }
}
```

**Qué hace:** al cerrar una sesión de Claude, compara los cambios del working tree con `HEAD`. Si hay archivos modificados en directorios trackeados de `src/` **y ninguno** en `documentation/`, imprime un recordatorio a stderr sugiriendo correr `/sync-docs`.

**Directorios trackeados** (regex en el `grep -E`):

- `src/components/sections/`
- `src/utils/`
- `src/hooks/`
- `src/pages/api/`
- `src/data/glossary.ts`
- `src/middleware.ts`
- `src/lib/`
- `src/db/`
- `src/components/ui/`
- `src/components/charts/`
- `astro.config.mjs`
- `.env.example`

**Por qué stderr y no stdout:** Claude Code convierte stderr del hook en un mensaje que el usuario ve, pero **no** lo inyecta al contexto del modelo (a diferencia de stdout). Es la forma correcta de "avisar al humano" sin gastar tokens.

**Por qué `exit 0`:** los hooks que retornan no-cero pueden bloquear acciones de Claude. Como esto es sólo informativo, siempre cerramos con `0`.

**Variables:**
- `$CLAUDE_PROJECT_DIR` es expuesta por Claude Code; apunta a la raíz del proyecto.
- `2>/dev/null` en los `git` evita ruido si el directorio no es un repo.

### Cómo desactivarlo temporalmente

Si te molesta durante un trabajo grande (refactor sin docs):

```bash
# opción 1: vacía el matcher en .claude/settings.json
# opción 2: comenta el hook
# opción 3: pon un settings.local.json con hooks: {} para override personal
```

### Cómo extenderlo

Si el recordatorio se vuelve muy ruidoso o muy laxo, ajusta el `grep -E` para incluir/excluir más paths.

Si quieres que **bloquee** el cierre de sesión (no sólo avisar), cámbialo a `exit 2` cuando detecte cambios sin doc — esto fuerza a Claude a procesar el mensaje antes de terminar. **No recomendado** para este caso porque es demasiado intrusivo.

## Hooks que NO tenemos (y por qué)

Cosas que se consideraron pero no instalamos para no ser intrusivos:

### PostToolUse en Edit/Write para `src/`

Idea: cada vez que Claude edita un archivo en `src/utils/`, disparar `/sync-docs` automáticamente.

Por qué no: caro (corre el agente muchas veces durante una sesión, mientras los cambios todavía están a medias) y ruidoso. El `Stop` hook ya cubre el caso al final.

### PreToolUse para bloquear edits a docs sin lectura previa

Idea: si Claude intenta `Write` a un archivo en `documentation/` sin haberlo `Read` antes, bloquear.

Por qué no: el harness de Claude Code ya lo bloquea internamente. Sería duplicar.

### SessionStart inyectando `CLAUDE.md`

Idea: cargar automáticamente las convenciones al iniciar.

Por qué no: `CLAUDE.md` ya se carga automáticamente por convención de Claude Code. No hace falta.

### UserPromptSubmit con keywords

Idea: si el usuario escribe "deploy", "release", "commit", inyectar un reminder de docs.

Por qué no: muy fácil de hacer mal — termina disparando en falsos positivos.

## Cómo agregar un hook nuevo

1. Decide el **evento** (la tabla de arriba).
2. Escribe el comando bash que ejecutará. **Probarlo en terminal primero** simulando los inputs de Claude Code (stdin JSON con `tool_input`, etc. — ver docs oficiales).
3. Edita `.claude/settings.json` (o `.claude/settings.local.json` si es personal):

   ```json
   {
     "hooks": {
       "<EventName>": [
         {
           "matcher": "<glob/pattern>",  // opcional, depende del evento
           "hooks": [
             { "type": "command", "command": "<tu-comando>" }
           ]
         }
       ]
     }
   }
   ```

4. Valida el JSON: `node -e "JSON.parse(require('fs').readFileSync('.claude/settings.json'))"`.
5. **Documéntalo aquí** con: qué evento, qué hace, por qué es necesario, cómo desactivarlo.
6. Si el hook puede gastar dinero (invoca otro agente, hace llamadas a API), ponle un kill-switch (variable de entorno que lo desactive).

## Convenciones

- **Siempre `exit 0`** salvo que quieras bloquear deliberadamente.
- **stderr** para mensajes al usuario que no van al contexto del modelo.
- **stdout** para mensajes que sí quieres que Claude lea (cuidado con el tamaño).
- **Comandos cortos.** Si son largos, mueve la lógica a `scripts/hooks/<nombre>.sh` y llama al script desde el hook.
- **Sin operaciones destructivas** en hooks de uso continuo. Nada de `rm`, `git push`, etc.
- **Testear con `--debug`** en Claude Code para ver la ejecución del hook.

## Troubleshooting

| Síntoma | Causa | Solución |
|---|---|---|
| El hook no se ejecuta | JSON inválido | `node -e "JSON.parse(require('fs').readFileSync('.claude/settings.json'))"` |
| El hook ejecuta pero no imprime nada | Salida va a stdout pero esperabas mensaje | Usar `>&2` para stderr |
| Mensaje aparece pero Claude lo ignora | stdout en vez de stderr | Si querías que sólo lo vea el usuario, usa stderr |
| Hook se ejecuta dos veces | Hay un hook duplicado en settings.json y settings.local.json | Quita uno |
| Permission denied | El script no tiene `+x` | `chmod +x scripts/hooks/<nombre>.sh` o invocar con `bash <script>` |
