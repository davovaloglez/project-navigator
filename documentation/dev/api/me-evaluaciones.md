# `GET/POST /api/me/evaluaciones` — DESACTIVADO

Este endpoint está **desactivado** desde el refactor de evaluaciones (NAV-78). Tanto `GET` como `POST` retornan `403 EVALUACION_DISABLED` para cualquier cliente, incluyendo sesiones de browser y tokens MCP.

- **Source:** [src/pages/api/me/evaluaciones.ts](../../../src/pages/api/me/evaluaciones.ts)
- **Estado:** siempre retorna `403`; el módulo no accede a Turso ni valida el body.

## Por qué fue desactivado

Las evaluaciones son ahora **admin-only**. El bloque "Mi evaluación" fue eliminado de `/cuenta`. Los administradores gestionan las evaluaciones exclusivamente desde `/comparativa`:

- Lectura cross-persona: `GET /api/evaluaciones` (gateado por `action:evaluacion:view-all`).
- Escritura/borrado: `POST/DELETE /api/admin/evaluaciones` (gateado por `action:evaluacion:manage`).

## Response (ambos métodos)

```ts
// 403 Forbidden
{
  error: 'La autoevaluación está desactivada. Las evaluaciones las gestiona un administrador.',
  code: 'EVALUACION_DISABLED'
}
```

## Contexto histórico

Antes de este cambio, el endpoint implementaba:

- `GET` → `{ evaluaciones: EvaluacionRecord[], equipoId: string | null }` filtrado por `user.equipoId`.
- `POST` → upsert por `(equipo_id, periodo)` con validación de 7 dimensiones enteras 1-10 y formato `YYYY-Qn`.

La tabla `evaluacion` en Turso y el endpoint `GET /api/evaluaciones` siguen activos — sólo la vía de auto-captura del usuario fue bloqueada.

Ver [api/evaluaciones.md](./evaluaciones.md) y [api/admin-evaluaciones.md](./admin-evaluaciones.md) para el flujo actual.
