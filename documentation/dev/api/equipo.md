# GET /api/equipo

Registro canónico del equipo. Lee las tablas `equipo` y `roles` de Turso y retorna el directorio completo de personas con sus métricas de acceso.

| Propiedad | Valor |
|---|---|
| Método | `GET` |
| Path | `/api/equipo` |
| Auth | Requerida (sesión Better-Auth, vía middleware) |
| Permiso | Ninguno adicional — role-open a cualquier usuario autenticado |
| Fuente | Turso, tablas `equipo` y `roles` |
| Cache | Sin cache (`Cache-Control: no-store`). La tabla es pequeña (~33 filas) y mutable desde el módulo de gestión |
| Source | [src/pages/api/equipo.ts](../../../src/pages/api/equipo.ts) |

## Request

Sin query params ni body.

```http
GET /api/equipo
Cookie: better-auth.session_token=<token>
```

## Response

`200 OK` con un objeto `{ equipo: EquipoRecord[], roles: RoleOpt[] }`:

```json
{
  "equipo": [
    {
      "id": "lolvera",
      "fullName": "Lorena Raquel Olvera Rodriguez",
      "nickname": "Lore",
      "email": "lorena@bit.lat",
      "title": "Project Manager",
      "department": "Tech",
      "roleId": "project-manager",
      "roleName": "Project Manager",
      "managerId": "etorres",
      "managerName": "Edgar Torres",
      "active": true,
      "hasLogin": true
    }
  ],
  "roles": [
    { "id": "project-manager", "name": "Project Manager" },
    { "id": "desarrollador-sr", "name": "Desarrollador Sr" }
  ]
}
```

### Tipo `EquipoRecord`

```ts
interface EquipoRecord {
  id: string;           // llave única estable (local-part del email o slug del nombre)
  fullName: string;     // nombre completo canónico
  nickname: string;     // apodo como aparece en Projects.pm / Projects.devs
  email: string;
  title: string;        // título funcional (display) — texto libre, puede ser vacío
  department: string;   // OU / departamento
  roleId: string;       // FK → roles.id (banda de costo); '' si no asignada
  roleName: string;     // nombre del puesto (Desarrollador Sr, etc.); '' si sin banda
  managerId: string;    // equipo.id del jefe directo; '' si no tiene
  managerName: string;  // fullName del jefe; '' si no tiene
  active: boolean;      // sigue en el equipo (tracking); no es indicador de acceso
  hasLogin: boolean;    // true si hay al menos un user.equipoId = este id
}
```

### Tipo `RoleOpt` (catálogo de bandas de costo)

```ts
interface RoleOpt {
  id: string;   // slug (e.g. 'desarrollador-sr')
  name: string; // nombre del puesto (e.g. 'Desarrollador Sr')
}
```

El catálogo tiene 17 bandas: las 12 originales de la hoja Costos más cio, desarrollador-mid, desarrollador-trainee, ed-tech y service-manager añadidas en `2026-equipo-title.sql`.

## Query SQL

```sql
select e.id, e.full_name, e.nickname, e.email, e.title, e.department,
       e.role_id, r.name as role_name,
       e.manager_id, m.full_name as manager_name,
       e.active,
       (select count(*) from "user" u where u.equipoId = e.id) as login_count
from equipo e
left join roles r on r.id = e.role_id
left join equipo m on m.id = e.manager_id
order by e.full_name
```

`hasLogin` se deriva de `login_count > 0`.

## Errores

| Código | Cuándo | Body |
|---|---|---|
| `500` | Error de conexión a Turso o SQL inválido | `{ "error": "<mensaje>" }` |
| `401` | Sin sesión | `{ "error": "No autorizado...", "code": "UNAUTHORIZED" }` |

## Consumidores

- [`EquipoSection`](../../../src/components/sections/EquipoSection.tsx) — directorio del equipo (fuente única de la lista de personas).
- [`PersonaDetailSection`](../../../src/components/sections/PersonaDetailSection.tsx) — carga el registro para resolver `nombre` → `personId` vía `buildMembers` + `resolveId`.

## Relación con el resolver de identidad

`GET /api/equipo` es la **versión cliente-friendly** del registro. El resolver server-side ([src/lib/equipoResolver.ts](../../../src/lib/equipoResolver.ts)) hace su propia query a Turso con cache de 5 min y no expone el registro completo — es sólo para resolver nombres a ids durante el parseo de Sheets en otros endpoints.

## Detalles no obvios

- Sin cache deliberado: las ediciones hechas desde `/api/admin/equipo` deben reflejarse de inmediato en el directorio. A diferencia de los endpoints de Sheets (mutable sólo por RH en el Sheet), este registro lo edita el admin del tablero.
- `title` y `roleId` son ejes ortogonales: `title` es el título funcional real (texto libre, ej. "Full-Stack Developer"); `roleId` es la banda de costo para el modelo financiero. Un campo puede estar vacío sin que el otro lo esté.
- La auto-join `equipo m` para `manager_name` puede retornar `null` si el `manager_id` no existe (FK `ON DELETE SET NULL`). El endpoint mapea `null` a `''`.
