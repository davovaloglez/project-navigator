# `POST/DELETE /api/admin/evaluaciones`

Edición y borrado cross-persona de evaluaciones trimestrales (HU NAV-78). Usado por `EvaluacionEditModal` desde `/comparativa`. Punto de escritura único para evaluaciones: `/api/me/evaluaciones` está desactivado (`403 EVALUACION_DISABLED`); sólo admins pueden capturar o corregir evaluaciones a través de este endpoint.

- **Source:** [src/pages/api/admin/evaluaciones.ts](../../../src/pages/api/admin/evaluaciones.ts)
- **Auth:** middleware, sesión requerida + `action:evaluacion:manage` (admin por default, override-able).
- **BD:** Turso (`evaluacion`)
- **Cache:** no-store

## POST — upsert de evaluación de cualquier persona

### Body

```ts
{
  equipoId: string;         // requerido — debe existir en tabla `equipo`
  periodo: string;          // "YYYY-Qn" — requerido
  actitud: number;          // entero 1-10 — requerido
  aptitudes: number;
  comunicacion: number;
  velocidad: number;
  analisis: number;
  calidad: number;
  autogestion: number;
  notas?: string;           // opcional, máx 2 000 chars
}
```

### Response (200)

```ts
{ ok: true, equipoId: string, periodo: string }
```

Upsert por `(equipo_id, periodo)`. Verifica que `equipoId` exista en `equipo` antes de insertar; si no existe retorna 404 `EQUIPO_NOT_FOUND`.

## DELETE — borrar evaluación

### Query params

```
DELETE /api/admin/evaluaciones?equipoId=<id>&periodo=<YYYY-Qn>
```

### Response (200)

```ts
{ ok: true, deleted: number }  // deleted = filas eliminadas (0 o 1)
```

## Errores

| Código | Status | Causa |
|---|---|---|
| — | 401 | Sin sesión |
| — | 403 | Sin `action:evaluacion:manage` |
| `BAD_BODY` | 400 | Body no es JSON válido |
| `BAD_EQUIPO` | 400 | `equipoId` vacío o ausente |
| `BAD_PERIODO` | 400 | `periodo` no matchea `/^\d{4}-Q[1-4]$/` |
| `BAD_DIMENSION` | 400 | Una dimensión no es entero 1-10 |
| `EQUIPO_NOT_FOUND` | 404 | `equipoId` no existe en `equipo` |

## Detalles no obvios

- Este endpoint no valida que el período esté cerrado — el admin puede editar o borrar cualquier evaluación en cualquier momento. La inmovilidad de evaluaciones de trimestres pasados es una regla de UI (no de BD).
- Consumido sólo por `EvaluacionEditModal` ([src/components/sections/comparativa/EvaluacionEditModal.tsx](../../../src/components/sections/comparativa/EvaluacionEditModal.tsx)), que también invoca `GET /api/evaluaciones` para refrescar la tabla tras una mutación.
