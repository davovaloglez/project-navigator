# Costos

Una vista del **costo operativo del portafolio** y de cómo se traduce ese costo en precio al cliente: cuánto cuesta cada rol al mes, cuánto cuesta hipotéticamente cada proyecto, y qué precio sale al aplicar el modelo financiero (valor de experiencia + admin + margen + IVA).

## ¿Para qué sirve?

- Saber cuánto cuesta operar el portafolio cada mes.
- Estimar cuánto cuesta un proyecto específico, considerando que muchas personas trabajan en varios proyectos a la vez.
- Ver cómo se compone el precio que pagamos al cliente: cuánto es costo, cuánto admin, cuánto margen, cuánto IVA.
- Detectar dónde se concentra el costo del portafolio (qué rol o qué hito pesa más).

## ¿Qué ves?

### KPIs (arriba)

| Tarjeta | Qué muestra |
|---|---|
| **Costo mensual total** | Suma del costo de todos los roles activos al mes |
| **Total recursos** | Cantidad total de personas |
| **Horas totales/mes** | Horas trabajadas/mes en agregado |
| **Costo/hora promedio** | Promedio ponderado del costo por hora |
| **Precio al cliente/mes** | Lo que cobraríamos al cliente aplicando el modelo financiero |
| **Margen bruto** | El % de margen del modelo |

> Los KPIs **no cambian** al filtrar por PM, porque la tabla de costos es organizacional (cuesta lo mismo aunque tú sólo veas tu portafolio). El filtro sí afecta las tarjetas de proyectos al final.

### Gráficas

- **Distribución de costo mensual por rol (donut)** — quién pesa más en la nómina.
- **Costo por hora por rol (barras)** — ranking por tarifa por hora.
- **Costo estimado mensual por hito** — suma del costo de los proyectos activos agrupado por hito.

### Modelo financiero

Dos vistas complementarias del mismo cálculo:

1. **Composición del precio al cliente (waterfall)**: 5 barras que muestran cómo se construye el precio paso a paso (Experiencia → Admin → Margen → IVA → Precio cliente).
2. **Tabla del modelo (Excel)**: las filas literales del Excel del modelo financiero, con el % y el valor en pesos.

### Detalle por Rol

Tabla con una fila por rol: recursos, horas/recurso, costo mensual, costo/hora, horas totales y total mensual.

### Costo estimado por proyecto

Cards de los 12 proyectos activos más caros. Cada card muestra:

- **Costo interno mensual** (lo que nos cuesta a nosotros operar ese proyecto).
- **Precio al cliente** (lo que cobraríamos aplicando el modelo) + utilidad.
- **Breakdown** persona por persona con el costo prorrateado.

## Cómo se calcula el costo de un proyecto

La idea clave es el **prorrateo**: una persona no cuesta lo mismo cuando está en 1 proyecto que cuando está en 5.

Ejemplo: si un Arquitecto cuesta $50,000 al mes y trabaja en 4 proyectos activos al mismo tiempo, a cada uno de esos proyectos le imputamos $50,000 ÷ 4 = $12,500 al mes.

Se hace lo mismo con el PM y con cada Developer. Sumas todo y obtienes el costo interno mensual del proyecto.

> **Importante**: aunque tú filtres por PM, el sistema sigue contando *todos* los proyectos activos del Arquitecto (no sólo los del PM seleccionado) para hacer el prorrateo. Si no fuera así, el costo se inflaría artificialmente. Es una estimación operativa, no contabilidad.

## Qué es el "modelo financiero"

Es la fórmula con la que pasamos de **costo interno** a **precio al cliente**. Tiene 4 pasos:

1. **Valor de experiencia** — aplicamos un factor que refleja el valor del know-how acumulado del equipo. Resultado: el costo "vale más" que el sueldo crudo.
2. **+ Admin** — sumamos un porcentaje encima por costos administrativos (oficina, herramientas, soporte, RH).
3. **+ Margen** — sumamos el margen de utilidad que define el negocio.
4. **+ IVA** — finalmente el impuesto.

Cada rate viene del Excel del modelo financiero (sheet `Costos`). Si BIT cambia los rates en el Sheet, el tablero los toma automáticamente.

## ¿Por qué importa?

- **Para PMs y líderes de cuenta**: te da una estimación rápida de cuánto te cuesta un proyecto y a qué precio sale, sin tener que armar Excels manuales.
- **Para Finanzas**: una primera vista de visibilidad de costos y márgenes operativos del portafolio.
- **Para decisiones de capacity**: si "Costo por hito" muestra que un Q concentra el 70% del costo, es señal de que la capacidad está mal distribuida en el tiempo.

## Limitaciones (importante)

Esta sección **NO es un sistema contable**. Es una herramienta de estimación operativa. No tomes decisiones contables, fiscales o de facturación vinculantes a partir de estos números — usa los reportes oficiales de Finanzas para eso. Razones:

- El prorrateo asume que cada persona divide tiempo equitativamente entre todos sus proyectos activos, lo cual es una simplificación.
- Los rates del modelo financiero pueden estar desfasados respecto al cierre fiscal real.
- No considera bonos, comisiones, vacaciones, ni gastos puntuales del proyecto.

## Persistencia de tus filtros

Lo que se guarda entre sesiones:

- Filtro PM.

Para borrar todos los filtros del tablero ve a [Cuenta → Preferencias](cuenta.md).

## Preguntas comunes

- **¿Por qué el "Costo mensual total" no cambia cuando filtro por PM?** Porque la nómina es organizacional. El filtro PM sólo recorta las tarjetas de proyectos abajo, no los KPIs globales.
- **¿Por qué un proyecto cuesta tan poco si tiene 5 personas?** Porque esas 5 personas están en otros proyectos también, y el costo se prorratea. Si los 5 son exclusivos del proyecto, te toca el 100% de cada uno.
- **¿Por qué la utilidad sale negativa en algunos proyectos?** Si el precio cliente del proyecto es menor al costo interno estimado, sale rojo. Es señal de revisar la fórmula o el alcance.
- **¿De dónde sale el costo por rol?** Del Sheet de Costos (filas 1-12). Si Finanzas actualiza ahí, el tablero refresca al recargar.
- **¿De dónde sale el modelo financiero?** Del mismo Sheet, filas 13-21. Si lo cambias en Excel, lo refleja aquí.
