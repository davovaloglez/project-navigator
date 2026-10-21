# `GET/POST/PUT /api/admin/empresas`

- **Source:** [src/pages/api/admin/empresas.ts](../../../src/pages/api/admin/empresas.ts)
- **Auth:** Middleware gatea `action:empresa:manage` (roles `superadmin` y `admin`).

## Propósito

Gestión multi-empresa: consultar lista de organizaciones con métricas operativas agregadas (miembros, proyectos, departamentos), registrar nuevos tenants y actualizar estado o metadatos de empresas existentes.

## Operaciones

### `GET /api/admin/empresas`

Lista todas las empresas registradas junto con sus métricas.

**Response:**

```json
[
  {
    "id": "vortex-it",
    "nombre": "Vortex IT",
    "moneda": "MXN",
    "activa": true,
    "logo_url": null,
    "total_miembros": 42,
    "proyectos_activos": 12,
    "total_departamentos": 4
  }
]
```

### `POST /api/admin/empresas`

Registra una nueva empresa y siembra su modelo financiero base.

**Request Body:**

```json
{
  "id": "acme-corp",
  "nombre": "Acme Corporation",
  "moneda": "MXN",
  "logo_url": "https://..."
}
```

**Response:** `201 { "ok": true, "id": "acme-corp" }`

### `PUT /api/admin/empresas`

Actualiza el nombre, moneda, logo o estado de activación (`activa: boolean`).

**Request Body:**

```json
{
  "id": "acme-corp",
  "activa": false
}
```

**Response:** `200 { "ok": true }`
