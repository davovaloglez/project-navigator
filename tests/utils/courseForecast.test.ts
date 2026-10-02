import { describe, it, expect } from 'vitest';
import { computeCourseForecasts, courseTrendMeta } from '@/utils/courseForecast';
import type { CursoRecord } from '@/utils/dataTransforms';
import type { WeeklySnapshot } from '@/utils/snapshots';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeCurso(colaborador: string, progreso: number): CursoRecord {
  return {
    colaborador,
    emailColaborador: `${colaborador}@test.com`,
    ou: 'TI',
    rol: 'desarrollador-sr',
    jefeDirecto: '',
    emailJefe: '',
    pidsCreados: 0,
    progreso,
  };
}

/**
 * Build a WeeklySnapshot with a specific weekKey (ISO date string, "YYYY-MM-DD")
 * so we can control velocity calculations.
 */
function makeSnapshot(weekKey: string, entries: { colaborador: string; progreso: number }[]): WeeklySnapshot {
  return {
    weekKey,
    capturedAt: weekKey + 'T00:00:00.000Z',
    projects: [],
    cursos: entries,
  };
}

/**
 * Return an ISO date string N weeks before today (midnight UTC).
 */
function weeksAgo(n: number): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - n * 7);
  return d.toISOString().split('T')[0];
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('computeCourseForecasts — trend classification', () => {
  it("returns 'done' when progreso >= 100, regardless of snapshots", () => {
    const curso = makeCurso('Alice', 100);
    const snapshots: WeeklySnapshot[] = [];
    const [result] = computeCourseForecasts([curso], snapshots);
    expect(result.trend).toBe('done');
    expect(result.forecastFinishDate).toBeNull();
  });

  it("returns 'unknown' when there are no snapshots and progreso < 100", () => {
    const curso = makeCurso('Bob', 50);
    const [result] = computeCourseForecasts([curso], []);
    expect(result.trend).toBe('unknown');
    expect(result.velocityPerWeek).toBeNull();
  });

  it("returns 'advancing' when velocity > 0.5 pp/week", () => {
    // Snapshot 4 weeks ago: progreso = 40. Current progreso = 80.
    // delta = 40, weeks ≈ 4 → velocity ≈ 10 pp/week (> 0.5)
    const curso = makeCurso('Carlos', 80);
    const snapshots = [makeSnapshot(weeksAgo(4), [{ colaborador: 'Carlos', progreso: 40 }])];
    const [result] = computeCourseForecasts([curso], snapshots);
    expect(result.trend).toBe('advancing');
    expect(result.velocityPerWeek).toBeGreaterThan(0.5);
    expect(result.forecastFinishDate).not.toBeNull();
  });

  it("returns 'stalled' when velocity is within ±0.5 pp/week (flat progress)", () => {
    // Snapshot 4 weeks ago: progreso = 50. Current progreso = 51.
    // delta = 1, weeks ≈ 4 → velocity ≈ 0.25 (within ±0.5)
    const curso = makeCurso('Diana', 51);
    const snapshots = [makeSnapshot(weeksAgo(4), [{ colaborador: 'Diana', progreso: 50 }])];
    const [result] = computeCourseForecasts([curso], snapshots);
    expect(result.trend).toBe('stalled');
    expect(result.velocityPerWeek).toBeGreaterThanOrEqual(-0.5);
    expect(result.velocityPerWeek).toBeLessThanOrEqual(0.5);
  });

  it("returns 'stalled' when velocity is exactly -0.5 (boundary: >= -0.5)", () => {
    // We construct a scenario where delta / weeks ≈ -0.5 (boundary)
    // 4 weeks ago: progreso = 52. Current: 50. delta = -2, weeks = 4 → velocity = -0.5
    const curso = makeCurso('Eli', 50);
    const snapshots = [makeSnapshot(weeksAgo(4), [{ colaborador: 'Eli', progreso: 52 }])];
    const [result] = computeCourseForecasts([curso], snapshots);
    // velocity = -2/4 = -0.5 → boundary should be 'stalled' (>= -0.5)
    expect(result.trend).toBe('stalled');
  });

  it("returns 'declining' when velocity < -0.5 pp/week (regression bug fix)", () => {
    // Snapshot 4 weeks ago: progreso = 70. Current progreso = 60.
    // delta = -10, weeks ≈ 4 → velocity ≈ -2.5 (< -0.5)
    const curso = makeCurso('Fernando', 60);
    const snapshots = [makeSnapshot(weeksAgo(4), [{ colaborador: 'Fernando', progreso: 70 }])];
    const [result] = computeCourseForecasts([curso], snapshots);
    expect(result.trend).toBe('declining');
    expect(result.velocityPerWeek).toBeLessThan(-0.5);
    // No finish date because velocity is negative
    expect(result.forecastFinishDate).toBeNull();
  });

  it("'declining' is sorted after 'stalled' but before 'done' in results", () => {
    // advancing=0, stalled=1, declining=2, unknown=2, done=3
    const cursos = [
      makeCurso('G_done', 100),                 // done
      makeCurso('H_stalled', 51),               // stalled (small delta)
      makeCurso('I_declining', 60),             // declining (big negative delta)
      makeCurso('J_advancing', 80),             // advancing (big positive delta)
    ];
    const snapshots = [
      makeSnapshot(weeksAgo(4), [
        { colaborador: 'H_stalled', progreso: 50 },    // velocity ~0.25
        { colaborador: 'I_declining', progreso: 70 },  // velocity ~-2.5
        { colaborador: 'J_advancing', progreso: 40 },  // velocity ~10
      ]),
    ];
    const results = computeCourseForecasts(cursos, snapshots);
    const trends = results.map((r) => r.trend);
    const rankOf = (t: string) =>
      t === 'advancing' ? 0 : t === 'stalled' ? 1 : t === 'declining' ? 2 : t === 'unknown' ? 2 : 3;
    // Verify ascending rank order
    for (let i = 0; i < trends.length - 1; i++) {
      expect(rankOf(trends[i])).toBeLessThanOrEqual(rankOf(trends[i + 1]));
    }
    // And that all four trends appear
    expect(trends).toContain('advancing');
    expect(trends).toContain('stalled');
    expect(trends).toContain('declining');
    expect(trends).toContain('done');
  });
});

describe('courseTrendMeta — all 5 trends', () => {
  it("'advancing' returns green label", () => {
    const m = courseTrendMeta('advancing');
    expect(m.label).toBe('Avanzando');
    expect(m.color).toContain('green');
    expect(m.bg).toContain('green');
  });

  it("'stalled' returns amber label", () => {
    const m = courseTrendMeta('stalled');
    expect(m.label).toBe('Sin ritmo');
    expect(m.color).toContain('amber');
  });

  it("'declining' returns red label (new case)", () => {
    const m = courseTrendMeta('declining');
    expect(m.label).toBe('Retrocediendo');
    expect(m.color).toContain('red');
    expect(m.bg).toContain('red');
  });

  it("'done' returns slate label", () => {
    const m = courseTrendMeta('done');
    expect(m.label).toBe('Completado');
    expect(m.color).toContain('slate');
  });

  it("'unknown' returns slate label", () => {
    const m = courseTrendMeta('unknown');
    expect(m.label).toBe('Sin datos');
    expect(m.color).toContain('slate');
  });
});
