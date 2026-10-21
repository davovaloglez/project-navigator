# `GET /api/repositorios`

- **Source:** [src/pages/api/repositorios.ts](../../../src/pages/api/repositorios.ts)
- **Auth:** Sesión requerida (role-open a cualquier usuario autenticado).

## Propósito

Devuelve la lista de repositorios registrados en Turso con sus colaboradores consolidados por rol de acceso en GitHub.

## Parámetros

- `empresa` (opcional query param): Slug de la empresa a consultar (ej. `vortex-it`). Si no se provee, toma el valor de `context.locals.activeEmpresa`. Si este último es `null` (superadmin en vista global), devuelve los repositorios de todas las empresas.

## Response

Array de objetos con estructura `RepoRecord`:

```json
[
  {
    "id": "academic-admin-site",
    "empresa_id": "vortex-it",
    "nombre": "Academic Admin Site",
    "ambientes": "PROD",
    "estatus": "Activo",
    "dpto": "Academic",
    "producto": "Academic",
    "github": "academic-administration",
    "administrador": "Jorge Enríquez",
    "arquitecto": "Edgar Torres",
    "colaborador": "Armando Meza, Rafael Escobar",
    "visualizador": "David González",
    "deploy": "Edgar Torres"
  }
]
```
