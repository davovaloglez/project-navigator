# Cursos

Seguimiento del **progreso de capacitación del equipo**. Cuánto avance lleva cada colaborador en sus cursos, agrupado por Unidad Organizacional (O.U.), por rol y por jefe directo.

## ¿Para qué sirve?

- Ver el avance de capacitación de todo el equipo en un solo lugar.
- Identificar a quién le faltan más cursos por terminar.
- Comparar cómo van las distintas Unidades Organizacionales entre sí.
- Detectar a tu equipo directo (si eres jefe) y revisar el avance.

## ¿Qué ves?

### KPIs (arriba)

| Tarjeta | Qué muestra |
|---|---|
| **Total colaboradores** | Personas en seguimiento de cursos (después de filtros) |
| **Progreso promedio** | Promedio del % de avance de todos los colaboradores visibles |
| **Completados** | Cuántos tienen 100% |
| **Sin iniciar** | Cuántos tienen 0% (se resalta cuando hay al menos uno) |

### Filtros

- **O.U.** (multi-select): Tech Ambition, Growth Experiences, Allies Networking, Analytics Solutions.
- **Rol** (multi-select): Software Architect, Project Manager, QA Analyst, Customer Success Explorer, Data Empowerment Explorer, Developers.
- **Búsqueda**: por nombre del colaborador o por rol. No se queda guardada para la próxima sesión.

### Gráficas

- **Distribución por O.U. (donut)**: cuántos colaboradores hay en cada Unidad Organizacional.
- **Progreso promedio por O.U. (barras)**: promedio de avance por O.U., ordenado de mayor a menor.

### Equipos por Jefe Directo

Una card por cada jefe directo. Dentro de cada card:

- Promedio del equipo + barra de progreso.
- Lista de miembros con su rol y su % de progreso (verde / amarillo / naranja / rojo según avance).
- Si un miembro tiene 100%, lleva un ícono de premio.

Haces clic en cualquier miembro y vas a su perfil personal.

### Gráfica final: progreso individual

Una vista detallada con el avance específico de cada colaborador filtrado.

## ¿Cómo lo uso?

1. **Como jefe directo**: scrollea hasta tu nombre en la sección de "Equipos por Jefe Directo" y revisa el avance de tu gente.
2. **Como líder de O.U.**: filtra por tu Unidad y verás los KPIs y gráficas ajustadas a tu equipo.
3. **Para encontrar a alguien específico**: usa la búsqueda con su nombre o rol.
4. **Para identificar rezagados**: el KPI "Sin iniciar" se prende cuando hay alguien en 0%; abre la gráfica final y encuéntralos.

## ¿Por qué importa?

La capacitación continua es parte del modelo de BIT. Este tablero hace visible el avance sin tener que armar reportes ad-hoc, y permite a cada jefe revisar a su gente sin permisos especiales.

## Persistencia de tus filtros

Lo que se guarda entre sesiones y dispositivos:

- Filtros de O.U. y Rol.

Lo que no se guarda:

- La búsqueda libre.

Si quieres borrar todos los filtros guardados del tablero, ve a [Cuenta → Preferencias](cuenta.md).

## Preguntas comunes

- **¿De dónde sale el % de progreso?** Del Sheet de Cursos, columna "progreso" que el equipo de capacitación actualiza.
- **¿Por qué no veo el filtro PM aquí?** Los cursos no están relacionados con proyectos, así que el filtro PM no aplica.
- **Hice clic en un compañero y abrió a una persona distinta.** Los nombres en Cursos vienen completos ("Lorena Raquel Olvera Rodriguez") y en los proyectos vienen como apodo ("Lore"). El tablero resuelve el match aproximado pero ocasionalmente puede confundir personas con primer nombre repetido. Reportarlo al equipo.
- **¿Puedo ver cuándo terminará alguien sus cursos?** Hay un motor de pronóstico de cursos (en [Alertas](alertas.md)) que estima fechas de finalización usando el ritmo histórico capturado en las snapshots semanales.
