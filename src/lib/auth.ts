import { betterAuth } from 'better-auth';
import { admin } from 'better-auth/plugins';
import { LibsqlDialect } from '@libsql/kysely-libsql';
import { ac } from './permissions/statements';
import { roles, DEFAULT_ROLE, ADMIN_ROLES } from './permissions/roles';
import { BANNED_USER_MESSAGE } from './authErrors';
import { adminGuard, adminGuardAfter } from './adminGuard';

function envVar(name: string): string | undefined {
  const viteEnv = (import.meta as { env?: Record<string, string | undefined> }).env;
  return viteEnv?.[name] ?? process.env[name];
}

const allowedDomain = envVar('ALLOWED_GOOGLE_DOMAIN')?.trim();
const baseURL = envVar('BETTER_AUTH_URL');
const tursoUrl = envVar('TURSO_DATABASE_URL');
const tursoAuthToken = envVar('TURSO_AUTH_TOKEN');

if (!tursoUrl) {
  throw new Error('TURSO_DATABASE_URL is not set');
}

export const auth = betterAuth({
  database: {
    dialect: new LibsqlDialect({ url: tursoUrl, authToken: tursoAuthToken }),
    type: 'sqlite',
  },
  secret: envVar('BETTER_AUTH_SECRET'),
  baseURL,
  trustedOrigins: baseURL ? [baseURL] : [],
  emailAndPassword: {
    enabled: true,
    disableSignUp: true,
    autoSignIn: true,
  },
  socialProviders: {
    google: {
      clientId: envVar('GOOGLE_OAUTH_CLIENT_ID') ?? '',
      clientSecret: envVar('GOOGLE_OAUTH_CLIENT_SECRET') ?? '',
      disableSignUp: true,
    },
  },
  account: {
    // Los usuarios creados por el admin nacen con emailVerified:false y solo cuenta
    // `credential`. Por default Better-Auth se niega a vincular implícitamente una
    // cuenta de Google a un usuario cuyo email local no está verificado
    // (requireLocalEmailVerified:true) → el login con Google fallaba con
    // "account not linked". Seguro aquí: disableSignUp + ALLOWED_GOOGLE_DOMAIN
    // impiden que alguien pre-registre el email de otra persona.
    accountLinking: {
      enabled: true,
      trustedProviders: ['google'],
      requireLocalEmailVerified: false,
    },
  },
  databaseHooks: {
    user: {
      create: {
        before: async (user) => {
          if (allowedDomain && !user.email.toLowerCase().endsWith('@' + allowedDomain.toLowerCase())) {
            throw new Error(`Email domain not allowed. Must be @${allowedDomain}`);
          }
          return { data: user };
        },
      },
    },
  },
  rateLimit: {
    enabled: true,
    storage: 'database',
    window: 60,
    max: 100,
    customRules: {
      '/sign-in/email': { window: 300, max: 5 },
      '/sign-in/social/*': { window: 300, max: 10 },
      '/sign-out': { window: 60, max: 20 },
    },
  },
  advanced: {
    defaultCookieAttributes: {
      sameSite: 'lax',
      secure: (import.meta as { env?: { PROD?: boolean } }).env?.PROD ?? process.env.NODE_ENV === 'production',
    },
  },
  hooks: {
    before: adminGuard,
    after: adminGuardAfter,
  },
  plugins: [
    admin({
      ac,
      roles,
      defaultRole: DEFAULT_ROLE,
      adminRoles: ADMIN_ROLES,
      bannedUserMessage: BANNED_USER_MESSAGE,
    }),
  ],
});

export type Session = typeof auth.$Infer.Session;
