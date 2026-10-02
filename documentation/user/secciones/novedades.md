# Novedades

El historial de versiones del tablero. Aquí ves **qué cambió** en cada release: nuevas funcionalidades, ajustes y bugs corregidos.

## ¿Para qué sirve?

- Saber qué se agregó recientemente sin tener que preguntar.
- Recordar cuándo se liberó una funcionalidad ("¿desde cuándo hay alertas?").
- Tener contexto de qué versión estás usando si reportas algún problema.

## ¿Qué ves?

### Encabezado

- **Versión actual** — el número de la versión que estás usando ahora (`v1.7.0`, por ejemplo), con la fecha en la que se liberó.
- **Cuántos releases** lleva el tablero y desde qué fecha.

### Historial

Una lista en orden cronológico inverso (la más reciente arriba). Cada release es una tarjeta colapsable con:

- **Número de versión** (e.g. `v1.6.0`).
- **Fecha** de la release.
- Etiqueta **"Actual"** si es la versión que estás usando.
- **Conteo de cambios** total ("12 cambios").

Cuando abres una tarjeta, ves los cambios agrupados en tres categorías:

- **Added** (verde, ícono de estrellas) — funcionalidades nuevas.
- **Changed** (azul, ícono de llave) — mejoras o ajustes a algo que ya existía.
- **Fixed** (ámbar, ícono de bug) — bugs corregidos.

Cada categoría es una lista de bullets. El texto soporta **negritas** y `bloques de código` para nombres técnicos.

## ¿Cómo lo uso?

1. **Echa un vistazo a la versión actual** arriba. Si ves "v1.7.0" significa que estás en esa.
2. **Abre el primer release** para ver los últimos cambios. Por defecto la versión actual viene abierta.
3. **Usa "Expandir todos"** si quieres leer toda la historia de cambios sin clickear cada uno.
4. **"Colapsar todos"** para volver al estado limpio.

## ¿Por qué importa?

- Te permite **descubrir features nuevas** sin tener que adivinar. Si entras al tablero después de semanas, abre el último release y sabes qué hay nuevo.
- Si algo te confunde o cambió, puedes verificar **cuándo se modificó** y por qué.
- Si reportas un bug, mencionar la versión que estás usando ayuda a quien lo investiga.

## Preguntas comunes

- **¿Qué significa "Added", "Changed", "Fixed"?**
  - "Added" = se agregó algo nuevo (una sección, un KPI, un filtro).
  - "Changed" = algo ya existía y se mejoró o cambió de comportamiento.
  - "Fixed" = se corrigió un bug; lo que estaba mal ya no debería pasar.
- **¿Por qué no aparecen los cambios más recientes?** Las versiones se liberan en bloques. Cuando salga la siguiente release, verás esos cambios listados.
- **¿Puedo recibir notificación cuando salga una versión nueva?** No directamente desde el tablero. Aparecerán aquí en cuanto se libere la versión.
- **¿De dónde sale esta información?** Del archivo `CHANGELOG.md` del repositorio. Cada vez que se libera una versión, alguien anota los cambios ahí y al re-desplegar el tablero los ves aquí.
- **¿Qué versión es la actual?** La que dice "Versión actual" en el encabezado de la página, y también está marcada con la etiqueta "Actual" en la lista.
