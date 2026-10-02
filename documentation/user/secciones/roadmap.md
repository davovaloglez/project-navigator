# Roadmap — Vista por hito y épica

El portafolio agrupado en su jerarquía natural: cada **hito** contiene **épicas** y cada épica contiene **proyectos**. Pensado para responder "¿cómo va este hito en conjunto?" en lugar de "¿cómo va este proyecto en particular?".

## ¿Para qué sirve?

- Ver de un vistazo el progreso global de cada hito (2025 Q4, 2026 Q1, etc.).
- Saber qué épicas están adelantadas y cuáles atrás dentro de un mismo hito.
- Identificar épicas con mucho peso (puntos) y poco avance.
- Navegar al proyecto desde su contexto: hito → épica → proyecto.

## ¿Qué ves?

### Encabezado de hito

Para cada hito verás:

- Nombre del hito (e.g. "2025 Q4").
- "N proyectos · X completados · Y pts" como subtítulo.
- Barra de progreso grande con el promedio del hito (verde ≥80%, amarillo 40-79%, rojo <40%).
- % numérico al lado de la barra.

### Épicas dentro del hito

Debajo de cada hito hay una lista de épicas. Cada épica es un renglón colapsable que muestra:

- Nombre de la épica.
- Cuántos proyectos lleva (e.g. "3/7" = 3 de 7 completados).
- Total de puntos.
- Mini barra de progreso (semáforo igual que el hito).

Clic en el renglón para **expandir** y ver el grid de tarjetas de proyecto. Clic de nuevo para colapsar. Por defecto todo viene expandido.

### Tarjetas de proyecto

Cuando expandes una épica, ves cada proyecto como una card con:

- Folio + nombre.
- Estatus con su color.
- Progreso.
- PM, arquitecto, DEVs.
- Chip de riesgo de pronóstico.
- Badge "Sin avance N días" si aplica.

Clic en la card para ir al detalle del proyecto.

### Ordenar

Botón **"Más antiguo primero" / "Más reciente primero"** en la cabecera. Cambia el orden de los hitos.

### Filtro PM

Dropdown PM en la cabecera. Cuando seleccionas un PM, los hitos y épicas se recalculan: si una épica no tiene proyectos del PM, simplemente no aparece. Los promedios se ajustan al subconjunto filtrado.

## ¿Cómo lo uso?

1. **Selecciona el hito de interés** mentalmente (los más cercanos suelen ser los más urgentes).
2. **Expande las épicas críticas** y revisa qué cards están atrás.
3. **Filtra por PM** si quieres ver sólo tus proyectos dentro del roadmap.
4. **Compara dos épicas** del mismo hito para entender dónde concentrar esfuerzo.

## ¿Por qué importa?

El portafolio rara vez se gestiona proyecto a proyecto. Se gestiona por **lotes** que entregan algo coherente al negocio (épicas) dentro de una ventana de compromiso (hitos). Roadmap es la vista pensada para esa conversación: "¿qué tan cerca estamos de cerrar 2026 Q1?".

A diferencia de Timeline (que muestra el calendario) o Portafolio (que es un inventario), Roadmap **agrupa** y te obliga a pensar en términos de entregables, no de tareas.

## Persistencia

Lo que **se queda guardado** entre sesiones y dispositivos:

- El orden de los hitos (asc / desc).
- El filtro PM.

Lo que **no se queda**:

- Qué épicas tenías colapsadas / expandidas (al volver están todas expandidas).

## Preguntas comunes

- **¿Por qué aparece un hito "Sin hito"?** Hay proyectos en el Sheet sin hito asignado. Caen en ese bucket para que no se pierdan silenciosamente.
- **¿Por qué cambia el % del hito cuando filtro por PM?** Porque el promedio se recalcula sobre los proyectos visibles. Es esperado: estás viendo "qué tan avanzado está el hito **en lo que toca a ese PM**".
- **¿Por qué un proyecto Done aparece en el roadmap?** Los terminados sí se muestran (a diferencia de Portafolio que los oculta por defecto). El roadmap es histórico: muestra el progreso completo del hito incluyendo lo que ya entregaste.
- **¿Puedo reordenar épicas dentro de un hito?** No, se ordenan alfabéticamente. Si necesitas otra clasificación, ajusta el nombre de la épica en el Sheet.
- **¿Las "0 pts" significan que la épica no tiene puntos asignados?** Sí. Si todos los proyectos de la épica vienen sin `puntos` en el Sheet, el total será 0 y no se muestra el texto "X pts".
