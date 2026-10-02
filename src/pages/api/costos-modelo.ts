import type { APIRoute } from 'astro';
import { getSheets, getSheetId } from '../../lib/sheets';
import type { FinancialModel, FinancialStep, FinancialStepKind } from '../../utils/dataTransforms';
import { serverErrorResponse } from '../../lib/apiError';
import { parseNumber } from '../../lib/sheetParsers';
import { createSheetCache } from '../../lib/sheetCache';

const cache = createSheetCache<FinancialModel[]>();

function isNumericString(value: string): boolean {
  if (!value) return false;
  const n = parseFloat(value.replace(/[$,\s]/g, ''));
  return !isNaN(n);
}

function classify(label: string): FinancialStepKind {
  const l = label.toLowerCase().trim();
  if (l === 'iva') return 'tax';
  if (l === 'total') return 'total';
  if (l.includes('subtotal')) return 'subtotal';
  if (l.includes('costo operativo')) return 'base';
  return 'markup';
}

export const GET: APIRoute = async () => {
  const cached = cache.get();
  if (cached) {
    return new Response(JSON.stringify(cached), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const sheets = getSheets();
    const sheetId = getSheetId();

    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: 'Costos!A1:G50',
    });

    const rows = res.data.values || [];
    if (rows.length < 2) {
      cache.set([]);
      return new Response('[]', { headers: { 'Content-Type': 'application/json' } });
    }

    const headers = rows[0].map((h: string) => (h || '').trim().toLowerCase());
    const rolIdx = headers.indexOf('rol');
    const costoMensualIdx = headers.indexOf('costo/mensual');
    const horasIdx = headers.indexOf('horas');
    const totalIdx = headers.indexOf('total');

    const steps: FinancialStep[] = [];

    for (const row of rows.slice(1)) {
      const rol = (row[rolIdx] || '').trim();
      if (rol) continue;

      const colMensual = (row[costoMensualIdx] || '').trim();
      const colHoras = (row[horasIdx] || '').trim();
      const colTotal = (row[totalIdx] || '').trim();

      let label = '';
      let factor: number | null = null;

      if (colMensual && !isNumericString(colMensual)) {
        label = colMensual;
        factor = isNumericString(colHoras) ? parseNumber(colHoras) : null;
      } else if (colHoras && !isNumericString(colHoras)) {
        label = colHoras;
        factor = null;
      }

      if (!label) continue;

      const kind = classify(label);
      const value = parseNumber(colTotal);

      if (kind !== 'markup') factor = null;

      // Normalize: if factor is > 1, it's in percentage form (e.g. "40%" → 40). Divide to get decimal.
      if (factor !== null && factor > 1) factor = factor / 100;

      steps.push({ label, factor, value, kind });
    }

    const findStep = (match: string) => steps.find((s) => s.label.toLowerCase().includes(match.toLowerCase()));

    const costoOperativo = findStep('costo operativo')?.value ?? 0;
    const ivaStep = steps.find((s) => s.kind === 'tax');
    const subtotalsBeforeTax = steps.filter((s) => s.kind === 'subtotal');
    const lastSubtotal = subtotalsBeforeTax[subtotalsBeforeTax.length - 1]?.value ?? 0;
    const ivaRate = ivaStep && lastSubtotal > 0 ? ivaStep.value / lastSubtotal : 0.16;

    if (ivaStep) ivaStep.factor = ivaRate;

    const model: FinancialModel = {
      steps,
      costoOperativo,
      valorExperienciaRate: findStep('valor de la experiencia')?.factor ?? 0,
      costoAdminRate: findStep('costo administrativo')?.factor ?? 0,
      margenRate: findStep('margen')?.factor ?? 0,
      ivaRate,
      total: steps.find((s) => s.kind === 'total')?.value ?? 0,
    };

    const data = [model];
    cache.set(data);
    return new Response(JSON.stringify(data), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return serverErrorResponse(error, 'costos-modelo');
  }
};
