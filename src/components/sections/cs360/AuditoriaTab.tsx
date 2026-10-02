import { ClipboardX, FileCheck2 } from 'lucide-react';
import type { CsCliente } from '../../../utils/cs360';
import { parseFecha, normalizar } from '../../../utils/cs360';
import { sanitizeHtml } from '../../../lib/sanitizeHtml';

/**
 * Guías/Auditoría: muestra el resultado Magnum del cliente (HTML confiable del
 * back) + las actividades cuyo tipo o asunto refieren a guías/auditorías.
 */
export default function AuditoriaTab({ cliente }: { cliente: CsCliente }) {
  const guias = cliente.actividades.filter((a) => {
    const tipo = normalizar(a.tipo_nombre);
    const asunto = normalizar(a.asunto);
    return tipo.includes('guia') || tipo.includes('auditoria') || asunto.includes('auditoria');
  });

  if (guias.length === 0 && !cliente.resultado_html_magnum) {
    return (
      <div className="text-center py-10 flex flex-col items-center">
        <ClipboardX className="w-12 h-12 text-slate-300 mb-3" />
        <p className="text-slate-500 font-medium">No hay auditorías o guías documentadas explícitamente.</p>
        <p className="text-xs text-slate-400 mt-1 max-w-sm">
          Los resultados de auditorías se extraen automáticamente de las "Actividades" que contengan ese
          término o de los resultados de Magnum integrados.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {cliente.resultado_html_magnum && (
        <div className="bg-white border border-slate-200 p-5 rounded-xl text-sm shadow-sm">
          <h3 className="font-bold text-lg mb-4 border-b border-slate-200 pb-2 text-indigo-800">
            Resultado Guía Magnum
          </h3>
          {/* HTML confiable del back (decisión explícita; sanitización a futuro). */}
          <div className="html-content text-slate-700" dangerouslySetInnerHTML={{ __html: sanitizeHtml(cliente.resultado_html_magnum) }} />
        </div>
      )}

      {guias.map((g) => {
        if (!g.contenido) return null;
        const d = parseFecha(g.fecha_inicio);
        return (
          <div key={g.id} className="bg-white border border-slate-200 p-5 rounded-xl text-sm overflow-x-auto shadow-sm">
            <h3 className="font-bold mb-3 border-b border-slate-200 pb-2 text-indigo-800 flex items-center gap-1">
              <FileCheck2 className="w-4 h-4" /> {g.tipo_nombre || 'Auditoría'}
              {d ? ` - ${d.toLocaleDateString('es-MX')}` : ''}
            </h3>
            <div className="html-content text-slate-700" dangerouslySetInnerHTML={{ __html: sanitizeHtml(g.contenido) }} />
          </div>
        );
      })}
    </div>
  );
}
