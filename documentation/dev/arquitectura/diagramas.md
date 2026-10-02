# Diagramas — Project Navigator

Vistas estructurales del producto en formato Mermaid. GitHub renderiza los bloques `mermaid` de forma nativa; en VS Code basta con la extensión *Markdown Preview Mermaid Support*.

Estos diagramas son derivados del código fuente. Si agregas una ruta, endpoint o sección nueva, actualízalos junto con el PR — el README de `dev/` incluye el orden esperado del sidebar y la matriz de secciones.

Archivos fuente de referencia:

- Sidebar y orden de navegación: [src/components/layout/Sidebar.tsx](../../../src/components/layout/Sidebar.tsx)
- Páginas: [src/pages/](../../../src/pages/)
- Endpoints SSR: [src/pages/api/](../../../src/pages/api/)
- Sections: [src/components/sections/](../../../src/components/sections/)
- Middleware de auth: [src/middleware.ts](../../../src/middleware.ts)

---

## 1. Sitemap (mapa del sitio)

Rutas accesibles a un usuario autenticado, agrupadas por intención de uso. Las rutas dinámicas se muestran con borde punteado; `/metricas-dev` existe pero no está enlazada en el sidebar (decisión de producto — ver `CHANGELOG` v1.1.0).

```mermaid
graph LR
    Login["/login<br/>(público)"]
    App((Project Navigator<br/>auth gate))

    Login -->|"email+password o<br/>Google OAuth"| App

    App --> Dashboard["/<br/>Dashboard"]

    App --> GExec[["Vista ejecutiva"]]
    GExec --> Resumen["/resumen"]
    GExec --> Alertas["/alertas"]

    App --> GPort[["Portafolio operativo"]]
    GPort --> Portafolio["/portafolio"]
    GPort --> Roadmap["/roadmap"]
    GPort --> Timeline["/timeline"]
    GPort --> Cronograma["/cronograma"]

    App --> GFcst[["Pronósticos"]]
    GFcst --> Pronosticos["/pronosticos"]

    App --> GFin[["Finanzas y datos"]]
    GFin --> Costos["/costos"]
    GFin --> Distribucion["/distribucion"]
    GFin --> MetricasDev["/metricas-dev<br/>(oculta en sidebar)"]

    App --> GTeam[["Equipo"]]
    GTeam --> Equipo["/equipo"]
    GTeam --> Cursos["/cursos"]

    App --> GMeta[["Meta / referencia"]]
    GMeta --> Novedades["/novedades"]
    GMeta --> Glosario["/glosario"]

    App --> GUser[["Cuenta"]]
    GUser --> Cuenta["/cuenta"]

    Portafolio -.->|"click card"| ProyectoDetalle["/proyecto/[folio]"]
    Roadmap -.->|"click proyecto"| ProyectoDetalle
    Timeline -.->|"click proyecto"| ProyectoDetalle
    Pronosticos -.->|"click proyecto"| PronosticoDetalle["/pronosticos/[folio]"]
    Equipo -.->|"click persona"| PersonaDetalle["/persona/[nombre]"]
    Cursos -.->|"click persona"| PersonaDetalle

    classDef sidebar fill:#1e3a8a,stroke:#60a5fa,color:#fff
    classDef dynamic fill:#0c4a6e,stroke:#0ea5e9,color:#fff,stroke-dasharray:5 5
    classDef hidden fill:#374151,stroke:#9ca3af,color:#d1d5db,stroke-dasharray:3 3
    classDef public fill:#581c87,stroke:#c084fc,color:#fff

    class Dashboard,Resumen,Alertas,Portafolio,Roadmap,Timeline,Cronograma,Pronosticos,Costos,Distribucion,Equipo,Cursos,Novedades,Glosario,Cuenta sidebar
    class ProyectoDetalle,PronosticoDetalle,PersonaDetalle dynamic
    class MetricasDev hidden
    class Login public
```

**Convenciones del diagrama**:

| Estilo | Significado |
|---|---|
| Azul sólido | Ruta presente en el sidebar (desktop + bottom-nav móvil) |
| Azul punteado | Ruta dinámica con parámetro (`[folio]`, `[nombre]`) |
| Gris punteado | Ruta existente pero no enlazada en sidebar |
| Morado | Ruta pública (no requiere sesión) |
| Flecha punteada `-.->` | Navegación lateral (click sobre un ítem) |

---

## 2. Arquitectura de capas

Cómo se mueve una petición desde el navegador hasta las fuentes de datos. El **middleware** es la única puerta de auth (ver [auth.md](./auth.md)); las **sections** son la única capa que llama hooks de datos (ver [convenciones.md](./convenciones.md)).

```mermaid
graph TB
    User([Usuario])

    subgraph BrowserSide["Browser"]
        Page[".astro page<br/>SSR, mount island"]
        Section["Section component<br/>React island · client:load"]
        UI["Charts + UI<br/>props only, sin side-effects"]
        Hooks["useSheetData<br/>useSnapshotCapture<br/>usePersistedFilters"]
    end

    subgraph EdgeLayer["AWS Amplify SSR / serverless"]
        Middleware["middleware.ts<br/>auth gate único"]
        APIRead["/api/* lectura<br/>cache 5 min in-memory"]
        APIWrite["/api/snapshots POST<br/>/api/user-preferences PUT·DELETE<br/>mutable, sin cache"]
        AuthAPI["/api/auth/...all<br/>Better-Auth"]
        Cron["/api/snapshots/auto-capture<br/>EventBridge Scheduler lunes 09:00"]
    end

    Sheets[("Google Sheets (service account)<br/>tabs: Projects, Costos, Cursos,<br/>app, Core, Snapshots")]
    Turso[("Turso libSQL<br/>tablas: user, session, account,<br/>verification, user_preferences")]

    User -->|HTTPS| Middleware
    Middleware -.->|sin sesión| AuthAPI
    Middleware -->|sesión ok| Page
    Page --> Section
    Section --> Hooks
    Section --> UI
    Hooks -->|fetch| APIRead
    Hooks -->|fetch| APIWrite
    APIRead -->|googleapis| Sheets
    APIWrite -->|googleapis| Sheets
    APIWrite -->|libsql| Turso
    AuthAPI -->|libsql| Turso
    Cron -->|bearer CRON_SECRET| APIWrite

    classDef user fill:#7c3aed,stroke:#a78bfa,color:#fff
    classDef browser fill:#065f46,stroke:#34d399,color:#fff
    classDef edge fill:#1e40af,stroke:#60a5fa,color:#fff
    classDef data fill:#7f1d1d,stroke:#f87171,color:#fff

    class User user
    class Page,Section,UI,Hooks browser
    class Middleware,APIRead,APIWrite,AuthAPI,Cron edge
    class Sheets,Turso data
```

**Reglas que el diagrama materializa**:

1. **Middleware único**: todo el tráfico autenticado pasa por `src/middleware.ts`. Los endpoints nuevos heredan auth sin código adicional.
2. **Sections son los únicos consumidores de datos**: charts y UI reciben todo por props.
3. **Cache 5 min sólo en lectura**: los endpoints que escriben (`POST /api/snapshots`, `PUT /api/user-preferences`) no cachean.
4. **Dos fuentes desacopladas**: Google Sheets para datos operativos (proyectos, tareas, cursos, costos), Turso para auth + preferencias per-user.

---

## 3. Páginas → API endpoints

Qué endpoints consume cada sección. La columna `prefs` aplica a toda sección con filtros persistidos (`usePersistedFilters`); la columna `snapshots` aplica a las que invocan `useSnapshotCapture`.

```mermaid
graph LR
    subgraph EP["Endpoints (hub)"]
        proyectos[("/api/proyectos")]
        tareas[("/api/tareas")]
        costos[("/api/costos")]
        costosModelo[("/api/costos-modelo")]
        cursos[("/api/cursos")]
        snapshots[("/api/snapshots")]
        prefs[("/api/user-preferences")]
        auth[("/api/auth/...")]
    end

    proyectos --> Pall["13 secciones<br/>(prácticamente todas las<br/>vistas de portafolio)"]
    tareas --> Tused["alertas · cronograma · dashboard<br/>persona · pronosticos · pronostico-detalle<br/>portafolio · timeline"]
    costos --> Cused["costos · dashboard · persona<br/>pronosticos · pronostico-detalle<br/>proyecto-detalle · resumen"]
    costosModelo --> CM["costos<br/>(modelo financiero de pricing)"]
    cursos --> Csused["cursos · dashboard · persona<br/>pronosticos · portafolio<br/>resumen · timeline"]
    snapshots --> Sused["dashboard · resumen · alertas<br/>portafolio · timeline · pronosticos<br/>(vía useSnapshotCapture)"]
    prefs --> Pused["12 secciones con filtros<br/>+ /cuenta (gestión)"]
    auth --> Aused["/login · /cuenta<br/>+ middleware en toda /"]

    classDef endpoint fill:#1e40af,stroke:#60a5fa,color:#fff
    classDef consumers fill:#374151,stroke:#9ca3af,color:#fff

    class proyectos,tareas,costos,costosModelo,cursos,snapshots,prefs,auth endpoint
    class Pall,Tused,Cused,CM,Csused,Sused,Pused,Aused consumers
```

### Matriz inversa (sección → endpoints)

| Sección | proyectos | tareas | costos | costos-modelo | cursos | snapshots | prefs |
|---|:-:|:-:|:-:|:-:|:-:|:-:|:-:|
| `/` Dashboard | ● | ● | ● |  | ● | ● | ● |
| `/resumen` | ● |  | ● |  | ● | ● | ● |
| `/alertas` | ● | ● |  |  |  | ● | ● |
| `/portafolio` | ● | ● |  |  | ● | ● | ● |
| `/proyecto/[folio]` | ● |  | ● |  |  |  |  |
| `/roadmap` | ● |  |  |  |  |  | ● |
| `/timeline` | ● | ● |  |  | ● | ● | ● |
| `/cronograma` |  | ● |  |  |  |  | ● |
| `/pronosticos` | ● | ● | ● |  | ● | ● | ● |
| `/pronosticos/[folio]` | ● | ● | ● |  |  |  |  |
| `/costos` | ● |  | ● | ● |  |  | ● |
| `/distribucion` | ● |  |  |  |  |  | ● |
| `/equipo` | ● |  |  |  |  |  |  |
| `/cursos` |  |  |  |  | ● |  | ● |
| `/persona/[nombre]` | ● | ● | ● |  | ● |  |  |
| `/metricas-dev` | ● |  |  |  |  |  | ● |
| `/cuenta` |  |  |  |  |  |  | ● |

> Las secciones que no aparecen (`/novedades`, `/glosario`) no consumen datos remotos: leen del repo (`CHANGELOG.md` y `src/data/glossary.ts`).

---

## 4. Flujo de auth (request lifecycle)

Cómo cada request se evalúa contra el middleware antes de llegar a la página o al endpoint. Cubre los tres caminos: usuario logueado, usuario anónimo, y el cron (scheduler externo).

```mermaid
sequenceDiagram
    autonumber
    participant U as Usuario / Cron
    participant MW as middleware.ts
    participant BA as Better-Auth<br/>(/api/auth/[...all])
    participant Page as Página o /api/*
    participant Turso as Turso<br/>(session table)
    participant Sheets as Google Sheets

    Note over U,Sheets: Caso 1 — Usuario autenticado pidiendo /portafolio

    U->>MW: GET /portafolio (cookie session)
    MW->>Turso: getSession(token)
    Turso-->>MW: { user, session }
    MW->>Page: next() con Astro.locals.user
    Page->>Page: render island ProyectosSection
    Page-->>U: HTML + JS island
    U->>MW: GET /api/proyectos (desde useSheetData)
    MW->>Turso: getSession(token)
    Turso-->>MW: ok
    MW->>Page: next()
    Page->>Sheets: spreadsheets.values.get(Projects!A1:W200)
    Sheets-->>Page: rows
    Page-->>U: JSON (cache 5min)

    Note over U,Sheets: Caso 2 — Usuario anónimo

    U->>MW: GET /resumen (sin cookie)
    MW->>Turso: getSession(undefined)
    Turso-->>MW: null
    MW-->>U: redirect 302 → /login
    U->>BA: POST /api/auth/sign-in/email
    BA->>Turso: verify password + create session
    Turso-->>BA: session token
    BA-->>U: Set-Cookie + redirect

    Note over U,Sheets: Caso 3 — Scheduler externo (EventBridge, snapshot semanal)

    U->>MW: GET /api/snapshots/auto-capture<br/>Authorization: Bearer CRON_SECRET
    MW->>MW: matchea ruta pública<br/>+ valida bearer
    MW->>Page: next() sin sesión
    Page->>Sheets: lee Projects + Cursos
    Page->>Sheets: upsert tab Snapshots
    Sheets-->>Page: ok
    Page-->>U: 200
```

**Detalles importantes**:

- El middleware popula `Astro.locals.user` y `Astro.locals.session` (tipados en [src/env.d.ts](../../../src/env.d.ts)). Cualquier `.astro` puede consumirlos en el frontmatter sin re-validar.
- React islands acceden a la sesión vía `authClient.useSession()` (cliente), sin necesidad de un endpoint extra.
- `useSheetData` detecta 401 en cualquier `/api/*` y redirige automáticamente a `/login`. Por eso una sesión expirada nunca llega a la UI como "datos vacíos".
- El cron de snapshots es la **única** excepción a la regla de "todo requiere sesión": el scheduler externo (EventBridge) debe enviar el header `Authorization: Bearer <CRON_SECRET>`.

---

## Mantenimiento

Cuando cambies estructura del producto, actualiza este archivo siguiendo el checklist:

| Cambio en el código | Diagrama a tocar |
|---|---|
| Nueva ruta en el sidebar (`Sidebar.tsx`) | 1 (sitemap), 3 (matriz) |
| Nueva ruta dinámica `[param]` | 1 (sitemap con borde punteado) |
| Nuevo endpoint en `src/pages/api/` | 2 (capas), 3 (hub + matriz) |
| Cambio en autenticación o middleware | 2 (capas), 4 (sequence) |
| Nueva fuente de datos (e.g. otra DB) | 2 (capas, subgraph Data + Tabs) |

Para validar que los diagramas renderizan sin errores antes de hacer commit, basta con abrir el archivo en VS Code con *Markdown Preview Mermaid Support* o pegar cada bloque en [mermaid.live](https://mermaid.live).
