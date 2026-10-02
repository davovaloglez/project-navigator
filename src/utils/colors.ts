export const estatusColors: Record<string, { bg: string; text: string; dot: string; chart: string }> = {
  'On Track':           { bg: 'bg-green-500/20',   text: 'text-green-400',   dot: 'bg-green-400',   chart: '#4ade80' },
  'Done':               { bg: 'bg-emerald-500/20', text: 'text-emerald-400', dot: 'bg-emerald-400', chart: '#34d399' },
  'Hypercare':          { bg: 'bg-amber-500/20',   text: 'text-amber-400',   dot: 'bg-amber-400',   chart: '#fbbf24' },
  'At Risk':            { bg: 'bg-orange-500/20',  text: 'text-orange-400',  dot: 'bg-orange-400',  chart: '#fb923c' },
  'Upcoming':           { bg: 'bg-blue-500/20',    text: 'text-blue-400',    dot: 'bg-blue-400',    chart: '#60a5fa' },
  'On Hold':            { bg: 'bg-slate-500/20',   text: 'text-slate-400',   dot: 'bg-slate-400',   chart: '#94a3b8' },
  'Blocked / Critical': { bg: 'bg-red-500/20',     text: 'text-red-400',     dot: 'bg-red-400',     chart: '#f87171' },
  'LaunchPhase':        { bg: 'bg-violet-500/20',  text: 'text-violet-400',  dot: 'bg-violet-400',  chart: '#a78bfa' },
  'Cancelado':          { bg: 'bg-red-500/20',     text: 'text-red-400',     dot: 'bg-red-400',     chart: '#ef4444' },
};

export const saludColors: Record<string, { bg: string; text: string; chart: string }> = {
  'Estable':           { bg: 'bg-green-500/20',  text: 'text-green-400',  chart: '#4ade80' },
  'Requiere atencion': { bg: 'bg-yellow-500/20', text: 'text-yellow-400', chart: '#facc15' },
  'En riesgo':         { bg: 'bg-red-500/20',    text: 'text-red-400',    chart: '#f87171' },
};

export const prioridadColors: Record<string, { bg: string; text: string; chart: string }> = {
  'Bloqueadora': { bg: 'bg-red-500/20',    text: 'text-red-400',    chart: '#f87171' },
  'Crítica':     { bg: 'bg-orange-500/20', text: 'text-orange-400', chart: '#fb923c' },
  'Mayor':       { bg: 'bg-amber-500/20',  text: 'text-amber-400',  chart: '#fbbf24' },
  'Menor':       { bg: 'bg-blue-500/20',   text: 'text-blue-400',   chart: '#60a5fa' },
  'Trivial':     { bg: 'bg-slate-500/20',  text: 'text-slate-400',  chart: '#94a3b8' },
};

export const tipoTareaColors: Record<string, { bg: string; text: string; chart: string }> = {
  'API':             { bg: 'bg-blue-500/15',    text: 'text-blue-300',    chart: '#60a5fa' },
  'Store Procedure': { bg: 'bg-indigo-500/15',  text: 'text-indigo-300',  chart: '#818cf8' },
  'App':             { bg: 'bg-cyan-500/15',    text: 'text-cyan-300',    chart: '#22d3ee' },
  'Web':             { bg: 'bg-emerald-500/15', text: 'text-emerald-300', chart: '#34d399' },
  'Web/API':         { bg: 'bg-teal-500/15',    text: 'text-teal-300',    chart: '#2dd4bf' },
  'Análisis':        { bg: 'bg-amber-500/15',   text: 'text-amber-300',   chart: '#fbbf24' },
  'SQA':             { bg: 'bg-pink-500/15',    text: 'text-pink-300',    chart: '#f472b6' },
  'Prototipo':       { bg: 'bg-purple-500/15',  text: 'text-purple-300',  chart: '#c084fc' },
};

export const ouColors: Record<string, { bg: string; text: string; chart: string }> = {
  'Tech Ambition':       { bg: 'bg-blue-500/20',   text: 'text-blue-400',   chart: '#60a5fa' },
  'Growth Experiences':  { bg: 'bg-teal-500/20',   text: 'text-teal-400',   chart: '#2dd4bf' },
  'Allies Networking':   { bg: 'bg-orange-500/20',  text: 'text-orange-400', chart: '#fb923c' },
  'Analytics Solutions': { bg: 'bg-purple-500/20', text: 'text-purple-400', chart: '#c084fc' },
};

export function getEstatusColor(estatus: string) {
  return estatusColors[estatus] || { bg: 'bg-slate-500/20', text: 'text-slate-400', dot: 'bg-slate-400', chart: '#94a3b8' };
}

export function getSaludColor(salud: string) {
  return saludColors[salud] || { bg: 'bg-slate-500/20', text: 'text-slate-400', chart: '#94a3b8' };
}

export function getPrioridadColor(prioridad: string) {
  return prioridadColors[prioridad] || { bg: 'bg-slate-500/20', text: 'text-slate-400', chart: '#94a3b8' };
}

export function getOUColor(ou: string) {
  return ouColors[ou] || { bg: 'bg-slate-500/20', text: 'text-slate-400', chart: '#94a3b8' };
}

// Paleta de respaldo: los tipos de la hoja `actividades` cambian con el tiempo,
// así que en vez de pintar todo gris cuando un tipo no está en el mapa semántico,
// se asigna un color estable por hash del nombre (mismo tipo → mismo color).
const tipoTareaFallback: { bg: string; text: string; chart: string }[] = [
  { bg: 'bg-blue-500/15',    text: 'text-blue-300',    chart: '#60a5fa' },
  { bg: 'bg-emerald-500/15', text: 'text-emerald-300', chart: '#34d399' },
  { bg: 'bg-amber-500/15',   text: 'text-amber-300',   chart: '#fbbf24' },
  { bg: 'bg-purple-500/15',  text: 'text-purple-300',  chart: '#c084fc' },
  { bg: 'bg-pink-500/15',    text: 'text-pink-300',    chart: '#f472b6' },
  { bg: 'bg-teal-500/15',    text: 'text-teal-300',    chart: '#2dd4bf' },
  { bg: 'bg-orange-500/15',  text: 'text-orange-300',  chart: '#fb923c' },
  { bg: 'bg-indigo-500/15',  text: 'text-indigo-300',  chart: '#818cf8' },
  { bg: 'bg-rose-500/15',    text: 'text-rose-300',    chart: '#fb7185' },
  { bg: 'bg-lime-500/15',    text: 'text-lime-300',    chart: '#a3e635' },
];

export function getTipoTareaColor(tipo: string) {
  if (!tipo) return { bg: 'bg-slate-700/60', text: 'text-slate-300', chart: '#94a3b8' };
  // Exacto, luego case-insensitive contra el mapa semántico.
  if (tipoTareaColors[tipo]) return tipoTareaColors[tipo];
  const ci = Object.keys(tipoTareaColors).find((k) => k.toLowerCase() === tipo.toLowerCase());
  if (ci) return tipoTareaColors[ci];
  // Desconocido: color estable por hash (no gris).
  let h = 0;
  for (let i = 0; i < tipo.length; i++) h = (h * 31 + tipo.charCodeAt(i)) | 0;
  return tipoTareaFallback[Math.abs(h) % tipoTareaFallback.length];
}
