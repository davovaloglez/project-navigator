import { Fragment, useState } from 'react';
import { Eye, ExternalLink } from 'lucide-react';
import type { CsTicket } from '../../../utils/cs360';
import { parseFecha, isTicketAbierto } from '../../../utils/cs360';
import { sanitizeHtml } from '../../../lib/sanitizeHtml';
import PaginationControls, {
  DEFAULT_PAGE_SIZE,
  paginate,
  sanitizePageSize,
  type PageSize,
} from '../../ui/PaginationControls';

const PAGE_SIZE_OPTIONS: PageSize[] = [10, 25, 50, 100, 'all'];
// cs360 no usa usePersistedFilters (app standalone); persiste como sus otras prefs.
const PAGE_SIZE_STORAGE_KEY = 'pn-cs360-tickets-page-size';

/** URL del ticket en Samva (misma convención que el mock; mesa=8 por default). */
function ticketUrl(t: CsTicket): string {
  if (t.url) return t.url;
  return `https://app.samva.io/PnlCliente/ListarClientesColasDetalle.aspx?s=${t.id}&P=8`;
}

/** Abierto → rojo, cerrado → verde (misma señal que usa el Health Score). */
function estatusBadgeClass(t: CsTicket): string {
  return isTicketAbierto(t)
    ? 'bg-red-50 text-red-700 border border-red-200'
    : 'bg-emerald-50 text-emerald-700 border border-emerald-200';
}

export default function TicketsTab({ tickets }: { tickets: CsTicket[] }) {
  const [page, setPage] = useState(0);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [pageSize, setPageSizeState] = useState<PageSize>(() => {
    if (typeof window === 'undefined') return DEFAULT_PAGE_SIZE;
    try {
      return sanitizePageSize(window.localStorage.getItem(PAGE_SIZE_STORAGE_KEY));
    } catch {
      return DEFAULT_PAGE_SIZE;
    }
  });
  const setPageSize = (next: PageSize) => {
    setPageSizeState(next);
    setPage(0);
    try {
      window.localStorage.setItem(PAGE_SIZE_STORAGE_KEY, String(next));
    } catch {
      // quota errors etc. — silent
    }
  };

  const { paged: pageTickets, totalPages, safePage } = paginate(tickets, page, pageSize);

  const toggle = (id: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <div className="bg-white border border-slate-200 shadow-sm rounded-xl overflow-hidden flex flex-col">
      <div className="overflow-x-auto">
      <table className="w-full min-w-176 text-sm text-left">
        <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b border-slate-200">
          <tr>
            <th className="px-6 py-4 font-semibold">ID / Folio</th>
            <th className="px-6 py-4 font-semibold">Fecha</th>
            <th className="px-6 py-4 font-semibold">Título</th>
            <th className="px-6 py-4 font-semibold">Estatus</th>
            <th className="px-6 py-4 font-semibold">Prioridad</th>
            <th className="px-6 py-4 font-semibold text-center">Detalle</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {pageTickets.length === 0 ? (
            <tr>
              <td colSpan={6} className="text-center py-8 text-slate-400">
                No hay tickets registrados
              </td>
            </tr>
          ) : (
            pageTickets.map((t) => {
              const d = parseFecha(t.fecha_registro);
              const dStr = d ? d.toLocaleDateString('es-MX') : t.fecha_registro;
              return (
                <Fragment key={t.id}>
                  <tr className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <a
                        href={ticketUrl(t)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 font-semibold hover:underline flex items-center gap-1"
                      >
                        {t.folio || t.id} <ExternalLink className="w-3 h-3" />
                      </a>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-slate-600">{dStr || '-'}</td>
                    <td className="px-6 py-4 max-w-sm truncate text-slate-700 font-medium" title={t.titulo}>
                      {t.titulo || '-'}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-md text-xs font-medium ${estatusBadgeClass(t)}`}>
                        {t.estatus || '-'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs font-semibold text-slate-600">{t.prioridad || '-'}</td>
                    <td className="px-6 py-4 text-center">
                      <button
                        onClick={() => toggle(t.id)}
                        className="text-indigo-600 hover:bg-indigo-50 p-1.5 rounded transition-colors"
                        title="Ver Detalle"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                  {expanded.has(t.id) && (
                    <tr className="bg-slate-50/80">
                      <td colSpan={6} className="px-6 py-4">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                          <div className="html-content text-sm text-slate-700 p-4 border border-slate-200 rounded bg-white shadow-sm overflow-x-auto">
                            <h4 className="font-bold mb-2 border-b border-slate-200 pb-1 text-blue-800">
                              Descripción del Ticket:
                            </h4>
                            {t.descripcion ? (
                              <div dangerouslySetInnerHTML={{ __html: sanitizeHtml(t.descripcion) }} />
                            ) : (
                              <em>Sin descripción.</em>
                            )}
                          </div>
                          <div className="html-content text-sm text-slate-700 p-4 border border-slate-200 rounded bg-white shadow-sm overflow-x-auto">
                            <h4 className="font-bold mb-2 border-b border-slate-200 pb-1 text-emerald-800">
                              Comentarios (Resolución/Seguimiento):
                            </h4>
                            {t.comentarios ? (
                              <div dangerouslySetInnerHTML={{ __html: sanitizeHtml(t.comentarios) }} />
                            ) : (
                              <em>Sin comentarios.</em>
                            )}
                          </div>
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

      {/* PaginationControls se auto-oculta con ≤10 resultados; el wrapper sigue la misma regla */}
      {tickets.length > 10 && (
        <div className="p-4 border-t border-slate-200 bg-slate-50">
          <PaginationControls
            total={tickets.length}
            page={safePage}
            totalPages={totalPages}
            pageSize={pageSize}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
            options={PAGE_SIZE_OPTIONS}
            variant="light"
          />
        </div>
      )}
    </div>
  );
}
