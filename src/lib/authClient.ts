import { createAuthClient } from 'better-auth/react';
import { adminClient } from 'better-auth/client/plugins';
import { ac } from './permissions/statements';
import { roles } from './permissions/roles';

export const authClient = createAuthClient({
  plugins: [adminClient({ ac, roles })],
});

export const { signIn, signOut, signUp, useSession, getSession } = authClient;
