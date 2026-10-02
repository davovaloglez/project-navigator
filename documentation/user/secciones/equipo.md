# Equipo

El directorio completo del equipo. Aquí ves **quién pertenece al equipo**, cómo están asignados en proyectos y quién tiene acceso al tablero.

## ¿Para qué sirve?

- Encontrar a cualquier miembro del equipo y abrir su perfil detallado.
- Detectar quién está más cargado de proyectos abiertos.
- Ver el progreso promedio de los proyectos donde participa cada persona.
- (Para administradores) Agregar o editar miembros del registro del equipo.

## ¿Qué ves?

### KPIs (arriba)

| Tarjeta | Qué muestra |
|---|---|
| **Total personas** | Total de personas en el registro del equipo |
| **Activos** | Personas que siguen activas en el equipo |
| **Con acceso** | Personas que tienen una cuenta de usuario en el tablero |

### Buscador

Caja debajo de los KPIs. Puedes buscar por nombre, apodo, puesto funcional, correo o banda de costo.

### Cards de personas

Una por persona, en grid. Cada card muestra:

- **Avatar con inicial**, **nombre completo** y **puesto** (título funcional o banda de costo según lo disponible).
- **Chips informativos**: banda de costo, departamento, badge "Acceso" si tiene cuenta, badge "Inactivo" si ya no está en el equipo.
- **Tres números clave:** Proyectos asignados, Progreso promedio, Puntos totales.
- **Barra de progreso** con color: verde si va sobre 80%, amarillo entre 40-80%, rojo por debajo.
- **Mini-badges de estatus:** cuántos proyectos de esta persona están en cada estado.

Las personas inactivas aparecen al final, con opacidad reducida. Las personas con más proyectos aparecen primero dentro de cada grupo.

### Botón "Agregar miembro"

Solo visible para administradores. Abre un formulario para registrar a una nueva persona (nombre, apodo, email, puesto, departamento, jefe directo, estado activo).

### Ícono de lápiz en cada card

Solo visible para administradores. Permite editar los datos de esa persona.

### Clic en una card → Perfil

Al hacer clic en el nombre vas al perfil detallado de la persona, donde puedes ver todos sus proyectos, tareas del cronograma y cursos.

## ¿Cómo lo uso?

1. **Buscando a alguien**: tipea su nombre, apodo o correo en el buscador.
2. **Identificando saturación**: arriba aparecen las personas con más proyectos activos.
3. **Comparando avance**: la barra de progreso te dice si los proyectos en los que participa están avanzando o estancados.
4. **Administrando el registro** (solo admins): usa "Agregar miembro" para incorporar al equipo, o el ícono de lápiz para corregir datos.

## ¿Por qué importa?

Es el **registro canónico del equipo**. A diferencia de una hoja de Excel, este directorio está vinculado con los proyectos, las tareas y los cursos del tablero, por lo que siempre refleja la carga real de cada persona.

## Preguntas comunes

- **¿Por qué no veo el filtro PM aquí?** Porque Equipo es un directorio del personal, no una vista de métricas de proyectos.
- **¿Por qué alguien tiene "0 puntos"?** Sus proyectos no tienen puntos asignados en el Sheet, o todos están en estatuses sin puntos cargados.
- **¿Por qué una persona aparece como "Inactivo"?** Significa que ya no pertenece al equipo activo (por ejemplo, se fue de la empresa). Los datos históricos de sus proyectos se conservan.
- **¿Por qué no veo a alguien que sé que está en un proyecto?** Puede ser que esa persona no esté registrada en el directorio del equipo. Un administrador debe agregarla con "Agregar miembro" y configurar su apodo para que el sistema la vincule automáticamente con los proyectos.
- **¿Qué significa el badge "Acceso"?** Que esa persona tiene una cuenta activa en el tablero y puede iniciar sesión.
- **¿Por qué no veo cuántos cursos toma cada persona?** Esa información está en [Cursos](cursos.md) y en el perfil individual.
