import { auth } from '../src/lib/auth';
import { ROLE_NAMES, DEFAULT_ROLE } from '../src/lib/permissions/roles';

async function main() {
  const [email, password, name, roleArg] = parseArgs(process.argv.slice(2));

  if (!email || !password || !name) {
    console.error('Usage: npm run create-user <email> <password> <name> [role]');
    console.error("Example: npm run create-user me@bit.lat 'P@ssw0rd' 'Mi Nombre' admin");
    console.error('Roles válidos:', ROLE_NAMES.join(', '), `(default: ${DEFAULT_ROLE})`);
    process.exit(1);
  }

  const role = roleArg || DEFAULT_ROLE;
  if (!ROLE_NAMES.includes(role as (typeof ROLE_NAMES)[number])) {
    console.error(`✗ Rol inválido: "${role}". Válidos: ${ROLE_NAMES.join(', ')}`);
    process.exit(1);
  }

  try {
    const ctx = await auth.$context;
    const hash = await ctx.password.hash(password);
    const user = await ctx.internalAdapter.createUser({
      email: email.toLowerCase().trim(),
      name,
      emailVerified: false,
      role,
    });
    if (!user) throw new Error('createUser returned null');

    await ctx.internalAdapter.linkAccount({
      userId: user.id,
      providerId: 'credential',
      accountId: user.id,
      password: hash,
    });

    console.log('✓ Usuario creado');
    console.log('  id:', user.id);
    console.log('  email:', user.email);
    console.log('  name:', user.name);
    console.log('  role:', role);
    process.exit(0);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('✗ Error creando usuario:', message);
    process.exit(1);
  }
}

/**
 * El nombre puede tener espacios. Si se pasa un 4º token y coincide con un rol
 * válido, se trata como rol; si no, se considera parte del nombre.
 */
function parseArgs(argv: string[]): [string, string, string, string | undefined] {
  const [email, password, ...rest] = argv;
  const last = rest[rest.length - 1];
  if (rest.length > 1 && last && ROLE_NAMES.includes(last as (typeof ROLE_NAMES)[number])) {
    return [email, password, rest.slice(0, -1).join(' ').trim(), last];
  }
  return [email, password, rest.join(' ').trim(), undefined];
}

main();
