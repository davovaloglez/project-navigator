import { sheets as sheetsApi } from '@googleapis/sheets';
import { GoogleAuth } from 'google-auth-library';

// Lee env vars de runtime de forma portable: `import.meta.env` (Vite/build) con
// fallback a `process.env`.
function envVar(name: string): string | undefined {
  const viteEnv = (import.meta as { env?: Record<string, string | undefined> }).env;
  return viteEnv?.[name] ?? process.env[name];
}

let _sheets: ReturnType<typeof sheetsApi> | null = null;

export function getSheets() {
  if (_sheets) return _sheets;
  const credentials = JSON.parse(envVar('GOOGLE_CREDENTIALS') || '{}');
  const auth = new GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  });
  _sheets = sheetsApi({ version: 'v4', auth });
  return _sheets;
}

export function getSheetId(): string {
  return envVar('SHEET_ID') ?? '';
}
