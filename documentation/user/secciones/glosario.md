# Glosario

El **diccionario** del tablero. Si ves un KPI, una gráfica o un bloque y no estás seguro de qué mide o cómo se calcula, aquí lo encuentras explicado en lenguaje claro.

## ¿Para qué sirve?

- Consultar **qué significa** cualquier KPI o métrica del tablero.
- Ver **cómo se calcula** (fórmula, fuente de datos, condiciones).
- Entender **por qué importa** desde una perspectiva de negocio.
- Saber **qué archivo del código** lo implementa (si te interesa el detalle técnico).
- Comparar **secciones similares** ("Dashboard vs Resumen", "Resumen vs Alertas") para saber cuál abrir según lo que necesites.

## ¿Qué ves?

### Sidebar izquierda

Una lista con las secciones del tablero (Dashboard, Resumen, Alertas, Portafolio, etc.) — espejo del menú lateral global. Cada una con un contador de **cuántas entradas tiene**.

Arriba del sidebar hay una **caja de búsqueda**: escribe ahí y filtra las entradas en tiempo real.

### Tarjetas de introducción ("Acerca de…")

Para cada sección hay una tarjeta azul arriba con tres preguntas:

- **¿Qué es esta sección?** — Descripción general en una oración.
- **¿Cuándo usarla?** — Casos de uso ("para revisión semanal", "antes de una 1:1", etc.).
- **Diferencias con otras secciones** — Si la sección se confunde con otra (Dashboard vs Resumen, por ejemplo), aquí se aclara.

Estas tarjetas desaparecen cuando estás buscando, para que los resultados queden limpios.

### Tarjetas de entrada

Una por cada bloque visible del tablero. Cada tarjeta tiene:

- **Nombre de la sección** (en gris, arriba).
- **Título** del KPI o bloque.
- **Resumen** corto (1-2 oraciones) — lo mismo que verías en el tooltip.
- **¿Qué es?** — Definición completa.
- **¿Cómo se calcula?** — Fórmula, criterios, condiciones.
- **¿Por qué importa?** — Por qué te conviene mirarlo, qué decisión te ayuda a tomar.
- **Ver código** — Enlaces a GitHub para abrir el archivo fuente exacto.

## ¿Cómo lo uso?

### Desde cualquier KPI o gráfica

Cuando veas un icono **"i"** (info) junto a un título en el tablero, hay dos formas de usarlo:

1. **Hover o tap** sobre el icono → aparece un tooltip con el resumen corto. Suficiente para la mayoría de dudas.
2. **Clic** en el tooltip → te lleva al glosario abierto exactamente en esa entrada (queda resaltada).

### Búsqueda

Caja arriba del sidebar. Busca por:

- **Nombre del KPI** ("health score", "stale", "story points").
- **Concepto** ("vencimiento", "pronóstico", "riesgo").
- **Cualquier palabra** que aparezca en la definición.

La búsqueda matchea contra título, resumen y los tres bloques de prosa. No distingue mayúsculas.

### Navegación lateral

Si quieres explorar todo lo de una sección concreta, clic en su nombre en el sidebar → te lleva a la introducción de esa sección y de ahí puedes ir bajando por sus entradas.

### Enlaces directos (deep-links)

Las URLs del glosario son compartibles:

- `…/glosario#resumen-banner` te lleva directo a la entrada "Banner" de Resumen.
- `…/glosario#intro-portafolio` te lleva a la introducción de Portafolio.

Útil para compartir definiciones en mensajes o documentos.

## ¿Por qué importa?

- **Reduce ambigüedad.** "Salud" puede significar muchas cosas; aquí ves exactamente cómo se calcula y qué umbrales se aplican.
- **Onboarding rápido.** Si alguien nuevo entra al tablero, el glosario le dice qué mira sin tener que pedirle a otro humano.
- **Decisiones más confiables.** Saber que un KPI mezcla "lo declarado" con "lo inferido por el motor" cambia cómo interpretas un número rojo.
- **Trazabilidad.** Cada definición apunta al archivo del código que la implementa. Si ves algo raro, puedes verificar.

## Preguntas comunes

- **¿Por qué hay un icono "i" en algunos lugares y en otros no?** Solo los **bloques visuales** principales (KPIs, gráficas, tablas con título, secciones agrupadas) tienen tooltip. Filtros, búsquedas y toggles no — son acciones, no datos a explicar.
- **¿Cuál es la diferencia entre tooltip y glosario?** El tooltip es el resumen corto (1-2 oraciones, suficiente "al vuelo"). El glosario es la versión completa con fórmula, contexto y enlaces al código.
- **¿Por qué dos secciones parecidas se llaman distinto?** Cada introducción tiene un bloque "Diferencias con otras secciones" justo para eso. Por ejemplo, Dashboard es personalizable y Resumen es fijo; Alertas muestra eventos y Resumen muestra agregados.
- **¿Puedo agregar mis propias notas?** No directamente; el glosario es centralizado para todo el equipo. Si crees que falta algo o un texto está mal, pídelo al equipo del tablero.
- **¿Por qué algunas búsquedas no devuelven nada?** El buscador es literal (sin tolerancia a errores). Intenta con menos palabras o sinónimos: "vencido" vs "atraso", "salud" vs "health".
