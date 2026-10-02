/**
 * Traducción de errores del admin plugin de Better-Auth a español.
 *
 * Better-Auth emite errores con `code` (estable) + `message` (inglés). Mapeamos
 * por `code`; si no hay match, devolvemos el mensaje crudo o un genérico.
 */

export const BANNED_USER_MESSAGE =
  'Tu cuenta ha sido desactivada. Contacta al administrador.';

const ES: Record<string, string> = {
  FAILED_TO_CREATE_USER: 'No se pudo crear el usuario.',
  USER_ALREADY_EXISTS: 'El usuario ya existe.',
  USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL: 'El usuario ya existe. Usa otro correo.',
  YOU_CANNOT_BAN_YOURSELF: 'No puedes desactivarte a ti mismo.',
  YOU_ARE_NOT_ALLOWED_TO_CHANGE_USERS_ROLE: 'No tienes permiso para cambiar el rol de usuarios.',
  YOU_ARE_NOT_ALLOWED_TO_CREATE_USERS: 'No tienes permiso para crear usuarios.',
  YOU_ARE_NOT_ALLOWED_TO_LIST_USERS: 'No tienes permiso para listar usuarios.',
  YOU_ARE_NOT_ALLOWED_TO_LIST_USERS_SESSIONS: 'No tienes permiso para ver las sesiones de usuarios.',
  YOU_ARE_NOT_ALLOWED_TO_BAN_USERS: 'No tienes permiso para desactivar usuarios.',
  YOU_ARE_NOT_ALLOWED_TO_IMPERSONATE_USERS: 'No tienes permiso para suplantar usuarios.',
  YOU_ARE_NOT_ALLOWED_TO_REVOKE_USERS_SESSIONS: 'No tienes permiso para revocar sesiones de usuarios.',
  YOU_ARE_NOT_ALLOWED_TO_DELETE_USERS: 'No tienes permiso para eliminar usuarios.',
  YOU_ARE_NOT_ALLOWED_TO_SET_USERS_PASSWORD: 'No tienes permiso para cambiar contraseñas.',
  BANNED_USER: BANNED_USER_MESSAGE,
  YOU_ARE_NOT_ALLOWED_TO_GET_USER: 'No tienes permiso para ver este usuario.',
  NO_DATA_TO_UPDATE: 'No hay cambios para guardar.',
  YOU_ARE_NOT_ALLOWED_TO_UPDATE_USERS: 'No tienes permiso para editar usuarios.',
  YOU_CANNOT_REMOVE_YOURSELF: 'No puedes eliminarte a ti mismo.',
  YOU_ARE_NOT_ALLOWED_TO_SET_NON_EXISTENT_VALUE: 'El rol indicado no existe.',
  YOU_CANNOT_IMPERSONATE_ADMINS: 'No puedes suplantar a otros administradores.',
  INVALID_ROLE_TYPE: 'Tipo de rol inválido.',
  UNAUTHORIZED: 'No autorizado. Inicia sesión de nuevo.',
  FORBIDDEN: 'No tienes permiso para realizar esta acción.',
};

export function translateAuthError(
  error: { code?: string | null; message?: string | null } | null | undefined,
  fallback = 'Ocurrió un error. Inténtalo de nuevo.',
): string {
  if (!error) return fallback;
  if (error.code && ES[error.code]) return ES[error.code];
  return error.message || fallback;
}
