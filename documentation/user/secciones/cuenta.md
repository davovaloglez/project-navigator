# Mi cuenta

Configuración personal: tu perfil, tu contraseña, tus sesiones abiertas, tus tokens de integración y tus preferencias guardadas.

## ¿Para qué sirve?

- **Cambiar tu nombre** o ver tu email.
- **Cambiar tu contraseña** (si entraste con email + contraseña).
- **Cerrar sesiones** en dispositivos que ya no usas.
- **Generar y revocar tokens MCP** para conectar Claude Desktop o Claude Code al tablero.
- **Limpiar tus filtros guardados** si quieres empezar "limpio" en todas las secciones.
- **Restablecer el Dashboard** a los widgets por defecto.

## ¿Cómo llego?

Desde el **menú lateral**, en el área de tu nombre/avatar, hay una opción "Mi cuenta".

## ¿Qué ves?

La página está dividida en **cinco bloques**:

### 1. Perfil

- **Foto de perfil** — muestra tu foto si tienes una, o tus iniciales si no.
  - **"Cambiar foto"** — haz clic para seleccionar una imagen (PNG, JPG o WebP). Se redimensiona automáticamente antes de subirse; no importa el tamaño del original.
  - **"Quitar"** — aparece sólo si ya tienes foto. La elimina y vuelve a mostrar tus iniciales.
- **Email** — sólo lectura. Si quieres cambiarlo, contacta al administrador.
- **Nombre** — lo puedes editar. Es como apareces en el tablero (en proyectos, tareas, etc.).
- **Guardar cambios** — botón que aparece habilitado sólo si modificaste algo.

### 2. Seguridad (sólo si entras con contraseña)

> Si entraste con Google, este bloque **no aparece**. Tu contraseña la gestiona Google.

- **Contraseña actual** (verificación).
- **Nueva contraseña** (mínimo 8 caracteres).
- **Confirmar contraseña**.
- **Toggle "Cerrar sesión en otros dispositivos"** — activado por defecto. Si cambias tu contraseña, se cierran tus sesiones en otros lados como medida de seguridad.

### 3. Sesiones activas

Lista de todos los dispositivos donde tu cuenta está logueada. Para cada uno:

- **Tipo de dispositivo** (Chrome en macOS, Safari en iOS, etc.).
- **Cuándo se inició** la sesión y cuándo **expira**.
- **IP** (si la tenemos).
- **Botón "Cerrar"** — cierra esa sesión específica.

Si tienes otras sesiones, hay un botón **"Cerrar todas las demás (N)"** arriba a la derecha para cerrarlas todas de un golpe (excepto la que estás usando ahora). Útil si perdiste un dispositivo o sospechas que alguien accedió.

La sesión que estás usando **ahora mismo** está marcada con un badge verde "Esta sesión" y no tiene botón de cerrar (para eso usa "Cerrar sesión" del menú lateral).

### 4. Tokens MCP

Permite conectar **Claude Desktop** o **Claude Code** directamente al tablero para que Claude pueda consultar proyectos, tareas, equipo y costos en tu nombre — con tus mismos permisos.

Un token MCP es como una "contraseña de aplicación": no reemplaza tu cuenta, sólo permite que una herramienta externa acceda sin necesitar tu contraseña real.

- **"Nuevo token"** — abre un formulario donde:
  - Escribes un **nombre** descriptivo (ej. "Claude Desktop — MacBook").
  - Eliges la **caducidad** (30, 90, 180 o 365 días). La caducidad es obligatoria.
  - Al confirmar, el token aparece **una sola vez** en un recuadro destacado. Cópialo en ese momento — la app no lo vuelve a mostrar.
- **Lista de tokens activos** — muestra el prefijo visible de cada token, su nombre, cuándo se creó, cuándo expira y cuándo fue usado por última vez.
- **"Revocar"** — elimina un token de inmediato. La herramienta que lo usaba dejará de tener acceso.

> Si perdiste el token o sospechas que alguien más lo tiene, revócalo y genera uno nuevo. La revocación es instantánea.

### 5. Preferencias

#### Filtros guardados

El tablero recuerda tus filtros en cada sección (PM, estatus, hito, etc.) y los sincroniza entre dispositivos. Si quieres **borrar todo eso de un tirón** y empezar como nuevo, este es el botón.

**Botón "Limpiar todos"** — confirma y borra todos los filtros guardados en todas las secciones.

#### Layout del Dashboard

Tu personalización del Dashboard (qué widgets ves y en qué orden) está guardada **en este navegador**. Si quieres volver al orden por defecto, usa esto.

**Botón "Restablecer"** — vuelve los widgets a su estado original (todos visibles en el orden por defecto).

## ¿Cómo lo uso?

- **Al ingresar por primera vez:** revisa que tu nombre esté como quieres que aparezca.
- **Cuando cambies de dispositivo permanentemente** (laptop nueva, etc.): entra al perfil, ve a Sesiones activas y cierra la sesión del dispositivo anterior.
- **Cuando heredes una computadora compartida:** "Limpiar todos los filtros" + "Restablecer Dashboard" para empezar como sesión nueva.

## ¿Por qué importa?

Es el único lugar donde puedes:

- Recuperar control de tus sesiones (importante si pierdes un dispositivo).
- Borrar el estado guardado del tablero (útil si los filtros se quedaron "pegados" después de un cambio que olvidaste).

## Preguntas comunes

- **¿Puedo subir cualquier formato de foto?** PNG, JPG y WebP. La imagen se redimensiona sola a un tamaño razonable; no necesitas prepararla.
- **¿Mi foto es privada?** La URL es pública pero con nombre aleatorio, igual que los avatares de GitHub o Slack. Nadie la encuentra sin saber exactamente la URL.
- **Si entré con Google, ¿"Quitar" borrará mi foto de Google?** No. Sólo borra la foto que hayas subido manualmente aquí. Si luego vuelves a entrar con Google OAuth, tu foto de Google no se restaura sola — tendrías que subirla de nuevo desde este bloque.
- **¿Por qué no veo "Cambiar contraseña"?** Porque entraste con Google. Para cambiar contraseña tendrías que solicitar al admin agregar una credencial local a tu cuenta — pero normalmente no es necesario.
- **¿Por qué no puedo cambiar mi email?** Porque tu email es la **clave** de tu cuenta. Pídele al admin del tablero si necesitas cambiarlo.
- **¿Por qué tengo varias sesiones si sólo uso una?** Cada navegador o dispositivo genera una sesión. Si entraste desde móvil + laptop + tablet, son tres. Sesiones viejas pueden quedar abiertas hasta que expiran.
- **¿Borrar mis filtros guardados afecta a otros?** No, sólo a ti. Es per-usuario.
- **¿Por qué "Cerrar todas las demás" no cierra esta?** Por seguridad — si cerrara la actual, te sacaría del tablero ahora mismo. Para cerrar la actual usa "Cerrar sesión" del menú lateral.
- **¿Qué es un token MCP?** Es una "contraseña de aplicación" que le da a Claude Desktop o Claude Code acceso al tablero en tu nombre, con tus mismos permisos. La herramienta consulta datos igual que si fueras tú en el navegador.
- **¿El token MCP da acceso total?** No. Tiene exactamente los mismos permisos que tu cuenta. Si tu rol no puede ver costos, el MCP tampoco puede pedirlos.
- **Perdí el token — ¿puedo verlo de nuevo?** No. La app sólo lo muestra una vez al crearlo. Si lo perdiste, revoca el anterior y genera uno nuevo.
- **¿Cada cuánto debo renovar el token?** Depende de la caducidad que elegiste (30 a 365 días). Cuando expira, Claude dejará de tener acceso; genera uno nuevo en este bloque.
- **¿Puedo tener varios tokens a la vez?** Sí, uno por cliente/dispositivo es lo recomendable (ej. un token para Claude Desktop en la laptop, otro para Claude Code en el servidor).
