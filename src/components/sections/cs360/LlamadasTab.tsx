import { Calendar, User, Clock, ExternalLink, MicOff } from 'lucide-react';
import type { CsLlamada } from '../../../utils/cs360';
import { parseFecha, sentimientoLlamada } from '../../../utils/cs360';

/** URL del historial de la llamada en Samva (misma convención que el mock). */
function llamadaUrl(ll: CsLlamada): string {
  return `https://app.samva.io/PnlCliente/ListarClientesConnectHistorialDetalle.aspx?ID=${ll.id}`;
}

export default function LlamadasTab({ llamadas }: { llamadas: CsLlamada[] }) {
  if (llamadas.length === 0) {
    return <div className="text-center py-10 text-slate-400">No hay registros de llamadas recientes.</div>;
  }

  return (
    <div className="space-y-4">
      {llamadas.map((ll) => {
        const d = parseFecha(ll.fecha_inicio);
        const dStr = d ? d.toLocaleString('es-MX') : (ll.fecha_inicio ?? 'Fecha N/A');
        const percepcion = ll.percepcion_cliente_estado ?? (ll.calificacion != null ? String(ll.calificacion) : '');
        const sentimiento = sentimientoLlamada(ll);
        const badgeColor =
          sentimiento === 'positivo'
            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
            : sentimiento === 'negativo'
              ? 'bg-red-50 text-red-700 border-red-200'
              : 'bg-slate-100 text-slate-600 border-slate-200';

        return (
          <div
            key={ll.id}
            className="bg-white border border-slate-200 p-5 rounded-xl shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="flex flex-col sm:flex-row sm:justify-between items-start gap-4">
              <div className="flex-1 min-w-0 w-full">
                <div className="flex items-center gap-3 mb-2 flex-wrap">
                  <span className="text-xs font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded border border-slate-200 flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {dStr}
                  </span>
                  <span className="text-sm font-semibold text-slate-800 flex items-center gap-1">
                    <User className="w-4 h-4 text-blue-500" /> Agente: {ll.agente_nombre ?? 'Desconocido'}
                  </span>
                  <span className="text-xs text-slate-500 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {ll.duracion_textual ?? '--'}
                  </span>
                  <a
                    href={llamadaUrl(ll)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-indigo-600 hover:underline flex items-center gap-1 ml-2 font-medium"
                  >
                    Ver en Samva <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
                <p className="text-sm text-slate-700 mt-2 font-medium">
                  Nota / Contexto:{' '}
                  <span className="font-normal text-slate-600">
                    {ll.percepcion_cliente_texto ?? ll.resumen ?? 'Sin descripción disponible.'}
                  </span>
                </p>
                {ll.grabacion ? (
                  <audio
                    controls
                    className="h-10 w-full mt-4 rounded outline-none border border-slate-200"
                    src={ll.grabacion}
                  />
                ) : (
                  <div className="text-xs text-slate-400 mt-3 flex items-center gap-1 bg-slate-50 p-2 rounded w-fit border border-slate-100">
                    <MicOff className="w-3 h-3" /> Sin grabación adjunta
                  </div>
                )}
              </div>
              {percepcion && (
                <div
                  className={`${badgeColor} border px-3 py-1 rounded-lg text-xs font-bold flex flex-col items-center shadow-sm`}
                >
                  <span>Sentimiento</span>
                  <span className="text-sm">{percepcion}</span>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
