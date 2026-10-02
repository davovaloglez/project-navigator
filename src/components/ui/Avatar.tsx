/**
 * Avatar reutilizable: muestra la foto si existe, si no las iniciales (primera
 * letra del primer y último token del nombre). Usado en /admin, /cuenta,
 * /cronograma (cards + matriz Estado×Asignado), etc.
 */
export function initialsOf(name: string): string {
  const parts = (name || '').trim().split(/\s+/);
  if (parts.length === 0 || !parts[0]) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function Avatar({
  name,
  image,
  size = 40,
}: {
  name: string;
  image?: string | null;
  size?: number;
}) {
  const px = `${size}px`;
  if (image) {
    return (
      <img
        src={image}
        alt={name}
        style={{ width: px, height: px }}
        className="rounded-full object-cover border border-slate-700 shrink-0"
      />
    );
  }
  return (
    <div
      style={{ width: px, height: px, fontSize: size * 0.36 }}
      className="rounded-full bg-slate-700 text-slate-200 flex items-center justify-center font-semibold shrink-0"
      aria-label={name}
    >
      {initialsOf(name)}
    </div>
  );
}

export default Avatar;
