# Administración — Usuarios y permisos

Sección exclusiva para el administrador del tablero. Desde aquí puedes gestionar quién tiene acceso, con qué rol y qué puede ver exactamente.

## ¿Para qué sirve?

- Crear cuentas para nuevos miembros del equipo sin que ellos puedan registrarse solos.
- Asignar o cambiar el rol de un usuario (lo que determina a qué secciones tiene acceso).
- Desactivar cuentas de personas que ya no pertenecen al equipo.
- Cerrar sesiones activas de otro usuario (si perdió un dispositivo, por ejemplo).
- Afinar permisos individuales: darle acceso a algo que su rol normalmente no incluye, o quitarle acceso a algo que sí incluye.

## ¿Quién puede entrar?

Sólo usuarios con rol **admin**. Si intentas entrar sin ese rol, el sistema te redirige a la página de inicio.

## ¿Qué ves?

### Listado de usuarios

Una cuadrícula con todos los miembros del sistema. Cada tarjeta muestra:

- Foto de perfil (o iniciales si no tiene).
- Nombre y correo.
- Badge de rol (morado = admin, azul = directores/gerentes, ámbar = pm, verde = ventas, gris = dev).
- Badge de estado: **Activo** o **Desactivado**.

Hay un buscador rápido para encontrar usuarios por nombre, correo o rol.

### Crear usuario

Formulario en la parte superior con: correo, nombre, contraseña y rol inicial. La contraseña debe tener mínimo 8 caracteres. El usuario recibirá acceso inmediato con el rol asignado.

### Detalle de usuario (`/admin/[id]`)

Al entrar a una tarjeta, ves cuatro bloques:

#### Perfil y rol

- Edita el nombre del usuario.
- Cambia su rol con un selector. El rol define los accesos por defecto. No puedes cambiar tu propio rol (protección anti-bloqueo).

#### Estado de la cuenta

- Desactiva la cuenta con un motivo y opcionalmente una fecha de expiración. Un usuario desactivado no puede iniciar sesión.
- Reactiva la cuenta con un botón.
- No puedes desactivarte a ti mismo.

#### Sesiones activas

Lista de todos los dispositivos donde el usuario está logueado. Puedes cerrar sesiones individuales o todas a la vez.

#### Permisos

Árbol interactivo que muestra cada sección del tablero y sus bloques internos. Para cada elemento puedes elegir:

- **Hereda** — el usuario usa lo que diga su rol (se muestra si su rol lo permite o no).
- **Permitir** — este usuario específico SÍ puede ver/usar el elemento, aunque su rol no lo incluya.
- **Denegar** — este usuario específico NO puede ver/usar el elemento, aunque su rol sí lo incluya.

Si una sección está denegada, sus bloques internos también quedan ocultos aunque estén en "Permitir".

## ¿Cómo lo uso?

### Dar acceso a alguien nuevo

1. En el listado, llena el formulario "Crear usuario" con correo, nombre, contraseña y rol.
2. El usuario ya puede entrar con esas credenciales.
3. Si entrará con Google, igualmente créalo (puede ser sin contraseña o con cualquier contraseña temporal) — al hacer login con su cuenta de Google, el sistema lo enlazará automáticamente.

### Cambiar el rol de alguien

1. Entra al detalle del usuario.
2. En el bloque Perfil, despliega el selector de Rol y elige el nuevo.
3. El cambio aplica de inmediato — si el usuario tiene sesión abierta, en su próxima navegación verá las secciones de su nuevo rol.

### Afinar acceso sin cambiar el rol

Usa el árbol de Permisos para hacer excepciones individuales. Por ejemplo, un usuario con rol `dev` normalmente no ve `/costos`, pero puedes darle acceso explícito activando "Permitir" en la página Costos. O un usuario con rol `gerentes` puede ver todo, pero puedes quitarle el bloque de costos financieros marcándolo como "Denegar".

### Desactivar una cuenta

1. Entra al detalle del usuario.
2. En Estado de la cuenta, escribe el motivo (opcional) y define si expira automáticamente.
3. Haz clic en "Desactivar cuenta". Sus sesiones activas quedan cerradas.

## ¿Por qué importa?

Sin este módulo, controlar quién puede ver información sensible (costos, pronósticos financieros) requeriría acceso directo al servidor o a la base de datos. Este módulo permite que el administrador del tablero gestione accesos de forma autónoma y auditada.

## Preguntas comunes

- **¿Por qué no puedo cambiar mi propio rol?** Protección anti-bloqueo: si te bajaras el rol a uno sin acceso a `/admin`, quedarías sin forma de revertirlo.
- **¿Qué pasa si desactivo al único admin?** El sistema no lo permite. Antes de bajar el rol del último admin activo, debes asignar el rol `admin` a otro usuario.
- **¿El usuario ve el cambio de permisos inmediatamente?** Sí. Al guardar un override, el servidor invalida el cache de permisos. En la próxima navegación del usuario, los cambios ya están activos.
- **¿Hay log de quién cambió qué?** Hoy no hay auditoría automática. Si necesitas rastrear cambios, agrega una entrada en la tabla de auditoría manualmente.
