# Inicio — Dashboard personalizable

Es la primera pantalla que ves al entrar al tablero. Está diseñada para que **tú** elijas qué ver primero según lo que más usas en tu día a día.

## ¿Para qué sirve?

Es tu "vista de comando" del portafolio. En lugar de saltar de sección en sección, agrupas aquí los indicadores y widgets que más consultas. Sirve para:

- Detectar de un vistazo qué proyectos están en riesgo.
- Saber qué vence esta semana.
- Tener a mano alertas activas y próximas fechas críticas.
- Filtrar todo por **PM** cuando preparas una 1:1 o revisión.

## ¿Qué ves?

### KPIs (arriba)

6 indicadores rápidos:

| KPI | Qué mide |
|---|---|
| **Total proyectos** | Cuántos hay en el portafolio (después de aplicar el filtro PM, si está activo). |
| **Progreso promedio** | El % de avance promedio. |
| **En riesgo** | Cuántos están como "At Risk" o "Blocked / Critical". |
| **Bloqueados** | Cuántos están específicamente bloqueados. |
| **Completados** | Cuántos ya están terminados. |
| **Story points** | La suma total de puntos del portafolio. |

### Widgets (debajo, en columnas)

Por defecto verás:

- **Salud del portafolio** — un score 0-100 que cruza estatus, salud, avance, vencimientos y prioridades. Acompañado de la distribución (cuántos en Excelente / Bueno / Medio / Bajo / Crítico).
- **Alertas** — las 5 más relevantes (críticas primero). Clic para ir al proyecto.
- **Proyectos en riesgo** — los 5 con el peor score de salud.
- **Próximos vencimientos** — proyectos con fecha estimada en los próximos 30 días (incluye vencidos hasta 7 días atrás).
- **Próximas fechas críticas** — las fechas que **el motor de pronóstico** proyecta para los próximos 60 días, no la fecha planeada.
- **Progreso del roadmap** — % de avance promedio agrupado por hito.
- **Story points** — total / entregados / activos + carga por arquitecto.
- **Resumen de costos** — costo mensual + top 5 roles más caros.
- **Resumen de cronograma** — tareas totales, completadas, activas, bloqueadas + reparto entre App y Core.

Cada widget tiene un enlace "Ver completo" que te lleva a la sección dedicada para profundizar.

## ¿Cómo lo uso?

### Personalizar

Botón **"Personalizar"** en la esquina superior derecha. Abre un panel donde puedes:

- **Ocultar/mostrar** widgets con un checkbox.
- **Reordenarlos** moviéndolos arriba o abajo.
- **Restablecer** al orden por defecto.

Tus cambios se guardan **en este navegador**. Si cambias de dispositivo, verás el orden por defecto hasta que personalices ahí también. (Esto es distinto del filtro PM y otros filtros, que sí se sincronizan entre dispositivos.)

### Filtrar por PM

Dropdown **"PM"** en la cabecera. Selecciona uno para que **todos** los KPIs y widgets muestren sólo los proyectos de ese PM. Útil para revisiones o 1:1.

Cuando hay un filtro PM activo, verás en azul "Mostrando N proyectos del PM <nombre>".

### Refrescar

Botón circular con flecha (junto al título). Vuelve a pedir los datos al servidor. Los datos están cacheados 5 minutos para mejor rendimiento, así que cambios muy recientes del Sheet pueden tardar en aparecer.

## ¿Por qué importa esta sección?

Es el **único lugar del tablero pensado para tu flujo personal**. Si revisas todos los días el dashboard de un PM específico antes de iniciar tu jornada, este es el lugar para tenerlo configurado.

Las demás secciones son vistas globales con propósitos específicos (todo el portafolio, todas las alertas, todos los pronósticos). El dashboard es tu remix personal de esas vistas.

## Preguntas comunes

- **¿Por qué un widget no me aparece?** Probablemente está oculto. Abre "Personalizar" y actívalo.
- **¿Por qué veo "No hay widgets visibles"?** Quitaste todos en Personalizar. Activa al menos uno o presiona "Restablecer".
- **¿Por qué el costo y el cronograma tardan más en cargar?** Esos widgets piden datos extra (no son del Sheet de proyectos). Se ven con skeleton mientras cargan.
- **¿Mis personalizaciones se pierden si entro desde otra computadora?** Sí, la personalización del dashboard es por navegador. Los filtros (como PM) sí se sincronizan.
- **¿Puedo "resetear" mi dashboard?** Sí, dentro de Personalizar hay un botón "Restablecer", o desde [Cuenta → Preferencias](cuenta.md).
