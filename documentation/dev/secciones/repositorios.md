# `/repositorios` — RepositoriosSection

Directorio y gestión de repositorios del equipo y sus accesos por persona y rol en GitHub. Consulta directamente la base de datos de Turso (`repositorio` y `repositorio_colaborador`), respetando el contexto multi-empresa.

- **Componente:** [src/components/sections/RepositoriosSection.tsx](../../../src/components/sections/RepositoriosSection.tsx)
- **Página:** [src/pages/repositorios.astro](../../../src/pages/repositorios.astro)
- **LOC:** ~490
- **Filtro PM:** —
- **Snapshot capture:** —
- **Persisted filters:** —

## Datos de entrada

| Fuente | Método | Uso |
|---|---|---|
| `GET /api/repositorios` | `fetch` + `useState` | Lista de repositorios enriquecidos con sus colaboradores por rol |
| `POST /api/admin/repositorios` | `fetch` (admin) | Alta de nuevo repositorio |
| `PUT /api/admin/repositorios` | `fetch` (admin) | Modificación de repositorio y lista de colaboradores |
| `DELETE /api/admin/repositorios?id=` | `fetch` (admin) | Baja lógica/física del repositorio y sus asignaciones |

## Modelo de datos

Cada repositorio incluye metadatos del proyecto y ambientes:

```ts
interface RepoRecord {
  nombre: string;
  ambientes: string;
  estatus: string;
  dpto: string;
  producto: string;
  github: string;
  administrador: string;
  arquitecto: string;
  colaborador: string;
  visualizador: string;
  deploy: string;
}
```

El cliente normaliza los colaboradores a un arreglo tipado `colaboradores: Array<{ nombre: string; rol: RolAcceso }>` para renderizar badges clasificados.

## Roles de Acceso en Repositorios

- **Admin** (`administrador`): Gestión total del repo y configuraciones.
- **Arquitecto** (`arquitecto`): Liderazgo técnico y revisión de PRs.
- **Colaborador** (`colaborador`): Desarrolladores con permisos de escritura/push.
- **Visualizador** (`visualizador`): Permisos de sólo lectura o auditoría.
- **Deploy** (`deploy`): Despliegues y CI/CD.

## Reglas especiales

- **Multi-empresa:** Si el usuario tiene una empresa activa en sesión (`activeEmpresa`), el endpoint `/api/repositorios?empresa=` filtra solo los repositorios de dicha entidad. Si es `superadmin` y está en modo global (`activeEmpresa = null`), consulta el catálogo de todas las empresas.
- **Acciones administrativas (`action:repositorio:manage`):** Los botones "Nuevo repositorio", "Editar" y "Eliminar" solo están disponibles para usuarios autorizados (`canManage`).

## Convenciones aplicables

- [Auth — Sistema de permisos](../arquitectura/auth.md#sistema-de-permisos) — gate `action:repositorio:manage`.
- [api/admin-repositorios.md](../api/admin-repositorios.md) — endpoints administrativos.
