// Re-export Cell without the @deprecated annotation from recharts types.
// Cell is still the correct API for per-item styling in recharts v2.
import type { ComponentType } from 'react';
import * as _Recharts from 'recharts';

export const Cell: ComponentType<{ fill?: string; stroke?: string }> =
  (_Recharts as any)['Cell'];
