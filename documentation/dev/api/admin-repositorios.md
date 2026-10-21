# `POST/PUT/DELETE /api/admin/repositorios`

- **Source:** [src/pages/api/admin/repositorios.ts](../../../src/pages/api/admin/repositorios.ts)
- **Auth:** Middleware gatea `action:repositorio:manage` (roles `superadmin` y `admin`).

## Propósito

Permite dar de alta, modificar y eliminar repositorios de código en la base de datos de Turso (`repositorio` y `repositorio_colaborador`), manteniendo la consistencia de los colaboradores por rol.

## Operaciones

### `POST /api/admin/repositorios`

Crea un nuevo repositorio.

**Request Body:**

```json
{
  "nombre": "portal-servicios",
  "url": "https://github.com/vortex-it/portal-servicios",
  "ambientes": "Dev, Prod",
  "estatus": "Activo",
  "dpto": "Core",
  "producto": "Vortex-IT",
  "empresaId": "vortex-it",
  "colaboradores": [
    { "miembroIdOrName": "Jorge Enríquez", "rol": "administrador" },
    { "miembroIdOrName": "Edgar Torres", "rol": "arquitecto" }
  ]
}
```

**Response:** `201 { "ok": true, "id": "portal-servicios" }`

### `PUT /api/admin/repositorios`

Actualiza datos generales y reemplaza la asignación de colaboradores.

**Request Body:**

```json
{
  "id": "portal-servicios",
  "nombre": "Portal de Servicios",
  "estatus": "Archivado",
  "colaboradores": []
}
```

**Response:** `200 { "ok": true, "id": "portal-servicios" }`

### `DELETE /api/admin/repositorios?id=<id>`

Elimina el repositorio indicado. Por claves foráneas con `on delete cascade`, elimina automáticamente los registros asociados en `repositorio_colaborador`.

**Response:** `200 { "ok": true, "deleted": "portal-servicios" }`
