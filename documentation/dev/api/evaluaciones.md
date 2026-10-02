# `GET /api/evaluaciones`

Lectura cross-persona de todas las autoevaluaciones trimestrales (HU NAV-78). Consumido únicamente por `/comparativa`.

- **Source:** [src/pages/api/evaluaciones.ts](../../../src/pages/api/evaluaciones.ts)
- **Auth:** middleware, sesión requerida + `action:evaluacion:view-all` (admin por default, override-able).
- **BD:** Turso (`evaluacion`)
- **Cache:** no-store

## Request

Sin parámetros.

## Response

```ts
interface EvaluacionRow {
  id: number;
  equipoId: string;
  periodo: string;          // "YYYY-Qn"
  actitud: number;          // 1-10
  aptitudes: number;
  comunicacion: number;
  velocidad: number;
  analisis: number;
  calidad: number;
  autogestion: number;
  notas: string | null;
  createdAt: string;
  updatedAt: string;
}

{ evaluaciones: EvaluacionRow[] }
```

Orden: `periodo desc, equipo_id asc`. Retorna **todas** las filas de la tabla sin filtro — la sección consumidora agrupa y filtra en cliente.

## Errores

| Status | Causa |
|---|---|
| 401 | Sin sesión |
| 403 | Sesión activa pero sin `action:evaluacion:view-all` |
| 500 | Error de BD |

## Detalles no obvios

- No filtra por período ni por persona: el cliente recibe el set completo y aplica filtros interactivos (período, `roleCategory`, etc.).
- La lectura individual del usuario autenticado vía `/api/me/evaluaciones` está **desactivada** (`403 EVALUACION_DISABLED`). Las evaluaciones son admin-only; la escritura va por `POST /api/admin/evaluaciones`.
