import { describe, it, expect } from 'vitest';
import { roleCan, splitResource } from '@/lib/permissions/roleDefaults';

/**
 * Tests for the client-safe pure role evaluation in roleDefaults.ts.
 *
 * Resource strings come from src/lib/permissions/statements.ts:
 *   page: dashboard, resumen, alertas, portafolio, roadmap, timeline,
 *         cronograma, pronosticos, costos, distribucion, equipo, comparativa,
 *         cursos, novedades, glosario, metricas-dev, cs360, admin
 *   data: costos
 *   action: snapshot:create, user:manage, equipo:manage, evaluacion:view-all, evaluacion:manage
 *
 * Role capabilities (from roles.ts):
 *   admin: ALL pages, data:costos, all actions, user/session ops
 *   dev:   page:dashboard, portafolio, roadmap, timeline, cronograma, metricas-dev, glosario
 *          NO data:costos, NO admin pages, NO actions
 *   pm:    NON_ADMIN_PAGES minus 'costos', action:snapshot:create (no data:costos)
 *   ventas: dashboard, resumen, portafolio, distribucion, glosario
 */

describe('splitResource()', () => {
  it('splits a page resource correctly', () => {
    const result = splitResource('page:dashboard');
    expect(result).toEqual({ kind: 'page', value: 'dashboard' });
  });

  it('splits a data resource correctly', () => {
    const result = splitResource('data:costos');
    expect(result).toEqual({ kind: 'data', value: 'costos' });
  });

  it('splits an action resource correctly', () => {
    const result = splitResource('action:user:manage');
    expect(result).toEqual({ kind: 'action', value: 'user:manage' });
  });

  it('splits a block resource correctly', () => {
    const result = splitResource('block:dashboard-cost-overview');
    expect(result).toEqual({ kind: 'block', value: 'dashboard-cost-overview' });
  });

  it('handles simple single-colon resources', () => {
    const result = splitResource('action:snapshot:create');
    expect(result.kind).toBe('action');
    expect(result.value).toBe('snapshot:create');
  });
});

describe('roleCan() — admin role', () => {
  it('admin can access page:admin', () => {
    expect(roleCan('admin', 'page:admin')).toBe(true);
  });

  it('admin can access page:dashboard', () => {
    expect(roleCan('admin', 'page:dashboard')).toBe(true);
  });

  it('admin can access page:comparativa (admin-only by default)', () => {
    expect(roleCan('admin', 'page:comparativa')).toBe(true);
  });

  it('admin can access page:cs360 (admin-only by default)', () => {
    expect(roleCan('admin', 'page:cs360')).toBe(true);
  });

  it('admin can access data:costos', () => {
    expect(roleCan('admin', 'data:costos')).toBe(true);
  });

  it('admin can perform action:user:manage', () => {
    expect(roleCan('admin', 'action:user:manage')).toBe(true);
  });

  it('admin can perform action:equipo:manage', () => {
    expect(roleCan('admin', 'action:equipo:manage')).toBe(true);
  });
});

describe('roleCan() — dev role (least privilege)', () => {
  it('dev can access page:dashboard', () => {
    expect(roleCan('dev', 'page:dashboard')).toBe(true);
  });

  it('dev can access page:portafolio', () => {
    expect(roleCan('dev', 'page:portafolio')).toBe(true);
  });

  it('dev can access page:glosario', () => {
    expect(roleCan('dev', 'page:glosario')).toBe(true);
  });

  it('dev CANNOT access page:admin', () => {
    expect(roleCan('dev', 'page:admin')).toBe(false);
  });

  it('dev CANNOT access page:costos', () => {
    expect(roleCan('dev', 'page:costos')).toBe(false);
  });

  it('dev CANNOT access page:comparativa', () => {
    expect(roleCan('dev', 'page:comparativa')).toBe(false);
  });

  it('dev CANNOT access page:cs360', () => {
    expect(roleCan('dev', 'page:cs360')).toBe(false);
  });

  it('dev CANNOT access data:costos', () => {
    expect(roleCan('dev', 'data:costos')).toBe(false);
  });

  it('dev CANNOT perform action:user:manage', () => {
    expect(roleCan('dev', 'action:user:manage')).toBe(false);
  });

  it('dev CANNOT perform action:snapshot:create', () => {
    expect(roleCan('dev', 'action:snapshot:create')).toBe(false);
  });
});

describe('roleCan() — block resources (default-ALLOW)', () => {
  it('dev is denied block:dashboard-cost-overview (in blockDenyByRole)', () => {
    expect(roleCan('dev', 'block:dashboard-cost-overview')).toBe(false);
  });

  it('dev is denied block:equipo-capacity-heatmap', () => {
    expect(roleCan('dev', 'block:equipo-capacity-heatmap')).toBe(false);
  });

  it('admin has all blocks allowed (blockDenyByRole has no admin entry)', () => {
    expect(roleCan('admin', 'block:dashboard-cost-overview')).toBe(true);
    expect(roleCan('admin', 'block:equipo-capacity-heatmap')).toBe(true);
  });

  it('dev can see an arbitrary block not in their deny list (default-ALLOW)', () => {
    expect(roleCan('dev', 'block:some-unknown-block')).toBe(true);
  });

  it('pm is denied block:dashboard-cost-overview', () => {
    expect(roleCan('pm', 'block:dashboard-cost-overview')).toBe(false);
  });
});

describe('roleCan() — unknown role', () => {
  it('unknown role returns false for page access', () => {
    expect(roleCan('superadmin', 'page:dashboard')).toBe(false);
  });
});

describe('roleCan() — pm role', () => {
  it('pm can access page:dashboard', () => {
    expect(roleCan('pm', 'page:dashboard')).toBe(true);
  });

  it('pm can perform action:snapshot:create', () => {
    expect(roleCan('pm', 'action:snapshot:create')).toBe(true);
  });

  it('pm CANNOT access page:costos (filtered out of NON_ADMIN_PAGES for pm)', () => {
    expect(roleCan('pm', 'page:costos')).toBe(false);
  });

  it('pm CANNOT access data:costos', () => {
    expect(roleCan('pm', 'data:costos')).toBe(false);
  });

  it('pm CANNOT perform action:user:manage', () => {
    expect(roleCan('pm', 'action:user:manage')).toBe(false);
  });
});

describe('roleCan() — ventas role', () => {
  it('ventas can access page:dashboard', () => {
    expect(roleCan('ventas', 'page:dashboard')).toBe(true);
  });

  it('ventas can access page:resumen', () => {
    expect(roleCan('ventas', 'page:resumen')).toBe(true);
  });

  it('ventas CANNOT access page:admin', () => {
    expect(roleCan('ventas', 'page:admin')).toBe(false);
  });

  it('ventas CANNOT access page:cronograma', () => {
    expect(roleCan('ventas', 'page:cronograma')).toBe(false);
  });
});
