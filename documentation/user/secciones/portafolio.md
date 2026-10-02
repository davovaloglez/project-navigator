# Portafolio

El grid completo de proyectos. Es la sección que abres cuando necesitas **encontrar un proyecto específico** o **revisar un subconjunto** según ciertos criterios.

## ¿Para qué sirve?

- Buscar un proyecto por nombre o folio.
- Filtrar por estatus, salud, prioridad, arquitecto, hito, DEV o PM.
- Ver de un vistazo el estado de muchos proyectos a la vez con sus señales clave.
- Comparar visualmente proyectos del mismo PM o del mismo arquitecto.

## ¿Qué ves?

### Filtros (arriba)

| Filtro | Permite múltiples | Opciones |
|---|---|---|
| **Estatus** | Sí | On Track, At Risk, Blocked / Critical, Done, Hypercare, On Hold, Upcoming |
| **Salud** | Sí | Estable, Requiere atención, En riesgo |
| **Prioridad** | Sí | Bloqueadora, Crítica, Mayor, Menor, Trivial |
| **Arquitecto** | Sí | Luis, Yorch, Eduardo, Hugo, Rodolfo |
| **Hito** | Sí | 2025 Q4, 2026 Q1, 2026 Q2 |
| **DEV** | No | Ale, Alex, Alexis, Angel, Armando, Edgar, Eduardo, Emilio, Hugo, Jasiel, Josue, Lore, Luis, Rafa |
| **PM** | No | (todos los PMs del Sheet) |

Junto a los filtros hay:

- **Caja de búsqueda** — escribes texto y filtra por actividad o folio (no se queda guardada para la próxima sesión, porque se considera exploratorio).
- **Toggle "Incluir terminados"** — por defecto **oculta** los proyectos en Done. Si lo activas, los verás en el grid.
- **Botón "Limpiar"** — aparece cuando hay filtros activos; los resetea todos.

### Contador

Debajo de los filtros: "N proyectos (filtrados)". Si hay terminados ocultos: "· N terminados ocultos".

### Cards de proyecto

Cada card muestra:

- **Folio + nombre** (clic para ir al detalle del proyecto).
- **Estatus** con su color (verde On Track, ámbar At Risk, rojo Blocked, etc.).
- **Salud** con badge.
- **Progreso** como barra.
- **PM + Arquitecto + DEVs**.
- **Hito** y prioridad.
- **Chip de riesgo del pronóstico** — qué proyecta el motor:
  - **En tiempo** (verde) — terminaría según lo planeado.
  - **Deslizando** (ámbar) — 3-14 días tarde.
  - **En riesgo** (rojo) — más de 14 días tarde.
  - **Estancado** (rojo) — sin avance registrado pese a haber iniciado.
  - **Sin datos** (gris) — falta información para proyectar.
- **Badge "Sin avance N días"** — si el % progreso no se ha movido en al menos 14 días según el histórico semanal del tablero.

### Paginación

Abajo de los resultados hay un control de paginación donde puedes elegir cuántos proyectos quieres ver a la vez: 12, 24, **50** (por defecto), 100 o Todos. También hay botones para pasar a la página anterior o siguiente. Tu elección se guarda entre sesiones.

## ¿Cómo lo uso?

1. **Filtra primero por PM** si te interesa sólo tu portafolio.
2. **Agrega filtros adicionales** (Estatus = "Blocked / Critical" + Prioridad = "Bloqueadora") para encontrar lo crítico.
3. **Usa búsqueda** cuando ya sabes el folio o un fragmento del nombre.
4. **Toggle "Incluir terminados"** cuando preparas un reporte histórico.

## ¿Por qué importa?

Es el **inventario detallado**. Mientras Resumen y Dashboard te dan la vista general, Portafolio es donde te metes a navegar los proyectos uno a uno. Es la "tabla maestra" para casi cualquier análisis ad-hoc.

## Persistencia de tus filtros

Lo que **se queda guardado** entre sesiones y dispositivos:

- Filtros activos (estatus, salud, prioridad, etc.).
- Toggle "Incluir terminados".
- Cuántos resultados por página elegiste.

Lo que **no se queda**:

- La búsqueda (al volver verás la caja vacía).
- La página en la que ibas (vuelves a la 1).

Si quieres borrar todos los filtros guardados de un tirón, ve a [Cuenta → Preferencias](cuenta.md).

## Preguntas comunes

- **¿Por qué un proyecto no aparece?** Probablemente está en "Done" y tienes el toggle apagado, o lo está filtrando algún criterio activo.
- **¿Por qué un proyecto tiene chip "Sin datos"?** El motor necesita fecha de inicio + progreso > 0 para proyectar. Si faltan datos en el Sheet, no puede.
- **¿Qué significa "Sin avance N días"?** El tablero captura cada semana cuánto progreso tiene cada proyecto. Si comparando capturas vemos que llevas 14+ días sin que el % suba, te lo marcamos. Útil para detectar proyectos que se "olvidan".
- **¿Por qué no veo el filtro PM como múltiple?** El filtro PM es de selección única en todo el tablero — está diseñado para que filtres por "TU PM" o "el PM en revisión", no para comparar varios a la vez.
