import { Fragment, useState } from 'react';
import { Eye, ExternalLink } from 'lucide-react';
import type { CsActividad } from '../../../utils/cs360';
import { parseFecha } from '../../../utils/cs360';
import { sanitizeHtml } from '../../../lib/sanitizeHtml';

/** URL del registro en Samva (misma convención que el mock aprobado). */
function actividadUrl(a: CsActividad): string {
  return `https://app.samva.io/PnlCliente/ListarClienteColaboradoresActividadesInfo.aspx?ID=${a.id}`;
}

export default function ActividadesTab({ actividades }: { actividades: CsActividad[] }) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const toggle = (id: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <div className="bg-white border border-slate-200 shadow-sm rounded-xl overflow-hidden">
      <div className="overflow-x-auto">
      <table className="w-full min-w-176 text-sm text-left">
        <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b border-slate-200">
          <tr>
            <th className="px-6 py-4 font-semibold">Fecha</th>
            <th className="px-6 py-4 font-semibold">Tipo</th>
            <th className="px-6 py-4 font-semibold">Responsable</th>
            <th className="px-6 py-4 font-semibold">Asunto</th>
            <th className="px-6 py-4 font-semibold text-center">Acción</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {actividades.length === 0 ? (
            <tr>
              <td colSpan={5} className="text-center py-8 text-slate-400">
                No hay actividades registradas
              </td>
            </tr>
          ) : (
            actividades.map((a) => {
              const d = parseFecha(a.fecha_inicio);
              const dStr = d
                ? `${d.toLocaleDateString('es-MX')} ${d.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}`
                : a.fecha_inicio;
              return (
                <Fragment key={a.id}>
                  <tr className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-slate-600">{dStr || '-'}</td>
                    <td className="px-6 py-4">
                      <span className="bg-blue-50 text-blue-700 px-2.5 py-1 rounded-md text-xs font-medium">
                        {a.tipo_nombre || '-'}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-medium text-slate-700">{a.responsable ?? '-'}</td>
                    <td className="px-6 py-4 max-w-sm truncate text-slate-600" title={a.asunto}>
                      {a.asunto || '-'}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex justify-center gap-2">
                        <button
                          onClick={() => toggle(a.id)}
                          className="text-indigo-600 hover:bg-indigo-50 p-1.5 rounded transition-colors"
                          title="Ver Contenido"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <a
                          href={actividadUrl(a)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-slate-400 hover:text-blue-600 p-1.5 rounded transition-colors"
                          title="Abrir en Samva"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      </div>
                    </td>
                  </tr>
                  {expanded.has(a.id) && (
                    <tr className="bg-slate-50/80">
                      <td colSpan={5} className="px-6 py-4">
                        <div className="html-content text-sm text-slate-700 p-4 border border-slate-200 rounded bg-white shadow-sm overflow-x-auto">
                          <h4 className="font-bold mb-2 border-b border-slate-200 pb-1">Detalle / Contenido:</h4>
                          {a.contenido ? (
                            // HTML confiable del back (decisión explícita; sanitización a futuro).
                            <div dangerouslySetInnerHTML={{ __html: sanitizeHtml(a.contenido) }} />
                          ) : (
                            <em>Sin contenido enriquecido.</em>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })
          )}
        </tbody>
      </table>
      </div>
    </div>
  );
}
