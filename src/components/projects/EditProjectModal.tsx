import { useState, useEffect, useMemo, type SyntheticEvent } from 'react';
import {
  X,
  Save,
  Loader2,
  AlertCircle,
  Building2,
  Calendar,
  Users,
  FolderKanban,
  Check,
  Percent,
} from 'lucide-react';
import { Avatar } from '../ui/Avatar';
import type { EquipoRecord } from '../../pages/api/equipo';
import type { ProjectRecord } from '../../utils/dataTransforms';

interface EmpresaItem {
  id: string;
  nombre: string;
  moneda: string;
  activa: boolean;
  logo_url: string | null;
}

interface EditProjectModalProps {
  isOpen: boolean;
  project: ProjectRecord;
  onClose: () => void;
  onSuccess: () => void;
}

export default function EditProjectModal({
  isOpen,
  project,
  onClose,
  onSuccess,
}: EditProjectModalProps) {
  // Catálogos
  const [empresas, setEmpresas] = useState<EmpresaItem[]>([]);
  const [equipo, setEquipo] = useState<EquipoRecord[]>([]);
  const [loadingCatalogs, setLoadingCatalogs] = useState(false);

  // Form states - Todos los campos
  const [actividad, setActividad] = useState(project.actividad || '');
  const [empresaId, setEmpresaId] = useState('vortex-it');
  const [folio, setFolio] = useState(project.folio || '');
  const [fechaInicio, setFechaInicio] = useState(project.fechaInicio || '');
  const [finEstimado, setFinEstimado] = useState(project.finEstimado || '');
  const [finReal, setFinReal] = useState(project.finReal || '');
  const [estatus, setEstatus] = useState(project.estatus || 'On Track');
  const [prioridad, setPrioridad] = useState(project.prioridad || 'Mayor');
  const [salud, setSalud] = useState(project.salud || 'Estable');
  const [progreso, setProgreso] = useState(
    project.progreso != null
      ? String(
          project.progreso <= 1
            ? Math.round(project.progreso * 100)
            : Math.round(project.progreso),
        )
      : '0',
  );

  // Roles y miembros
  const [pmId, setPmId] = useState(project.pmIds?.[0] || '');
  const [arquitectoId, setArquitectoId] = useState(
    project.arquitectoIds?.[0] || '',
  );
  const [poId, setPoId] = useState(project.poIds?.[0] || '');
  const [sqaId, setSqaId] = useState(project.sqaIds?.[0] || '');
  const [selectedDevIds, setSelectedDevIds] = useState<string[]>(
    project.devIds || [],
  );
  const [devSearch, setDevSearch] = useState('');
  const [showDevDropdown, setShowDevDropdown] = useState(false);

  // Clasificación y planeación
  const [puntos, setPuntos] = useState(String(project.puntos ?? 0));
  const [tipo, setTipo] = useState(project.tipo || 'API');
  const [epica, setEpica] = useState(project.epica || '');
  const [cuatrimestre, setCuatrimestre] = useState(project.cuatrimestre || '');
  const [sprint, setSprint] = useState(project.sprint || '');
  const [url, setUrl] = useState(project.url || '');
  const [producto, setProducto] = useState(project.producto || 'Academic');
  const [servicio, setServicio] = useState(project.servicio || 'Core');
  const [aliado, setAliado] = useState(project.aliado || 'Ninguno');

  // Acciones y dependencias
  const [accionRequerida, setAccionRequerida] = useState(
    project.accionRequerida || '',
  );
  const [fechaAccion, setFechaAccion] = useState(project.fechaAccion || '');
  const [requiereDe, setRequiereDe] = useState(project.requiereDe || '');

  // Submit states
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Inicializar valores al abrir
  useEffect(() => {
    if (!isOpen) return;
    setActividad(project.actividad || '');
    setFolio(project.folio || '');
    setFechaInicio(project.fechaInicio || '');
    setFinEstimado(project.finEstimado || '');
    setFinReal(project.finReal || '');
    setEstatus(project.estatus || 'On Track');
    setPrioridad(project.prioridad || 'Mayor');
    setSalud(project.salud || 'Estable');
    setProgreso(
      project.progreso != null
        ? String(
            project.progreso <= 1
              ? Math.round(project.progreso * 100)
              : Math.round(project.progreso),
          )
        : '0',
    );
    setPmId(project.pmIds?.[0] || '');
    setArquitectoId(project.arquitectoIds?.[0] || '');
    setPoId(project.poIds?.[0] || '');
    setSqaId(project.sqaIds?.[0] || '');
    setSelectedDevIds(project.devIds || []);
    setPuntos(String(project.puntos ?? 0));
    setTipo(project.tipo || 'API');
    setEpica(project.epica || '');
    setCuatrimestre(project.cuatrimestre || '');
    setSprint(project.sprint || '');
    setUrl(project.url || '');
    setProducto(project.producto || 'Academic');
    setServicio(project.servicio || 'Core');
    setAliado(project.aliado || 'Ninguno');
    setAccionRequerida(project.accionRequerida || '');
    setFechaAccion(project.fechaAccion || '');
    setRequiereDe(project.requiereDe || '');
  }, [isOpen, project]);

  // Cargar catálogos de empresas y equipo
  useEffect(() => {
    if (!isOpen) return;
    let mounted = true;
    setLoadingCatalogs(true);

    Promise.all([
      fetch('/api/empresas').then((r) => (r.ok ? r.json() : { empresas: [] })),
      fetch('/api/equipo').then((r) => (r.ok ? r.json() : { equipo: [] })),
    ])
      .then(([empRes, eqRes]) => {
        if (!mounted) return;
        const emps: EmpresaItem[] = empRes.empresas || [];
        setEmpresas(emps);
        if (emps.length > 0) {
          // Detectar empresa según el prefijo del folio
          if (project.folio?.startsWith('BIT-')) {
            setEmpresaId('bit-technologies');
          } else {
            setEmpresaId(emps[0].id);
          }
        }

        const eqList: EquipoRecord[] = (eqRes.equipo || []).filter(
          (m: EquipoRecord) => m.active,
        );
        setEquipo(eqList);
      })
      .catch((err) => {
        console.error('Error cargando catálogos:', err);
      })
      .finally(() => {
        if (mounted) setLoadingCatalogs(false);
      });

    return () => {
      mounted = false;
    };
  }, [isOpen, project]);

  const activeDevs = useMemo(() => {
    return equipo.filter((m) => {
      const q = devSearch.toLowerCase().trim();
      if (!q) return true;
      return (
        m.fullName.toLowerCase().includes(q) ||
        m.nickname.toLowerCase().includes(q) ||
        m.id.toLowerCase().includes(q)
      );
    });
  }, [equipo, devSearch]);

  const toggleDev = (id: string) => {
    setSelectedDevIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const removeDev = (id: string) => {
    setSelectedDevIds((prev) => prev.filter((x) => x !== id));
  };

  const handleSubmit = async (e: SyntheticEvent) => {
    e.preventDefault();
    if (!actividad.trim()) {
      setErrorMsg('El nombre o actividad del proyecto es obligatorio.');
      return;
    }

    setSubmitting(true);
    setErrorMsg(null);

    try {
      const payload = {
        id: project.id,
        actividad: actividad.trim(),
        empresaId,
        folio: folio.trim(),
        fechaInicio: fechaInicio || null,
        finEstimado: finEstimado || null,
        finReal: finReal || null,
        estatus,
        prioridad,
        salud,
        progreso: parseFloat(progreso) || 0,
        puntos: parseInt(puntos, 10) || 0,
        tipo,
        epica: epica.trim(),
        cuatrimestre: cuatrimestre.trim(),
        sprint: sprint.trim(),
        url: url.trim(),
        producto: producto.trim(),
        servicio: servicio.trim(),
        aliado: aliado.trim(),
        pmIds: pmId ? [pmId] : [],
        arquitectoIds: arquitectoId ? [arquitectoId] : [],
        poIds: poId ? [poId] : [],
        sqaIds: sqaId ? [sqaId] : [],
        devIds: selectedDevIds,
        accionRequerida: accionRequerida.trim(),
        fechaAccion: fechaAccion || null,
        requiereDe: requiereDe.trim(),
      };

      const res = await fetch('/api/proyectos', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `Error del servidor (${res.status})`);
      }

      onSuccess();
      onClose();
    } catch (err: unknown) {
      setErrorMsg(
        err instanceof Error
          ? err.message
          : 'Ocurrió un error inesperado al actualizar el proyecto.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-950/80 backdrop-blur-sm animate-fade-in overflow-y-auto">
      <div className="relative w-full max-w-3xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden my-8 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800/80 bg-slate-900/50 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400">
              <FolderKanban className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-100 flex items-center gap-2">
                Editar Proyecto
                <span className="text-xs font-mono font-normal text-slate-400 bg-slate-800 px-2 py-0.5 rounded">
                  {project.folio}
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Edición de todos los campos en Base de Datos &amp; Sincronización
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body Scrollable */}
        <form
          onSubmit={handleSubmit}
          className="p-6 space-y-6 overflow-y-auto flex-1"
        >
          {errorMsg && (
            <div className="flex items-start gap-2.5 p-3.5 bg-red-500/10 border border-red-500/30 rounded-xl text-red-300 text-sm">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Bloque 1: General */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              1. Información General
            </h3>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Nombre / Actividad <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                required
                value={actividad}
                onChange={(e) => setActividad(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-800/80 border border-slate-700/80 rounded-xl text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5 flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-slate-400" />
                  Empresa
                </label>
                <select
                  value={empresaId}
                  onChange={(e) => setEmpresaId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800/80 border border-slate-700/80 rounded-xl text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                >
                  {empresas.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.nombre}
                    </option>
                  ))}
                  {empresas.length === 0 && (
                    <option value="vortex-it">Vortex IT</option>
                  )}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Folio
                </label>
                <input
                  type="text"
                  value={folio}
                  onChange={(e) => setFolio(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800/80 border border-slate-700/80 rounded-xl text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Tipo
                </label>
                <input
                  type="text"
                  value={tipo}
                  onChange={(e) => setTipo(e.target.value)}
                  placeholder="API / Web / Mobile"
                  className="w-full px-3 py-2 bg-slate-800/80 border border-slate-700/80 rounded-xl text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                />
              </div>
            </div>
          </div>

          {/* Bloque 2: Estado, Progreso y Clasificación */}
          <div className="space-y-4 pt-4 border-t border-slate-800">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              2. Estado &amp; Monitoreo
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Estatus
                </label>
                <select
                  value={estatus}
                  onChange={(e) => setEstatus(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800/80 border border-slate-700/80 rounded-xl text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                >
                  <option value="On Track">On Track</option>
                  <option value="At Risk">At Risk</option>
                  <option value="Blocked / Critical">Blocked / Critical</option>
                  <option value="Done">Done</option>
                  <option value="Hypercare">Hypercare</option>
                  <option value="LaunchPhase">LaunchPhase</option>
                  <option value="On Hold">On Hold</option>
                  <option value="Upcoming">Upcoming</option>
                  <option value="Cancelado">Cancelado</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Salud
                </label>
                <select
                  value={salud}
                  onChange={(e) => setSalud(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800/80 border border-slate-700/80 rounded-xl text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                >
                  <option value="Estable">Estable</option>
                  <option value="Requiere atencion">Requiere atencion</option>
                  <option value="En riesgo">En riesgo</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Prioridad
                </label>
                <select
                  value={prioridad}
                  onChange={(e) => setPrioridad(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800/80 border border-slate-700/80 rounded-xl text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                >
                  <option value="Bloqueadora">Bloqueadora</option>
                  <option value="Crítica">Crítica</option>
                  <option value="Mayor">Mayor</option>
                  <option value="Menor">Menor</option>
                  <option value="Trivial">Trivial</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5 flex items-center gap-1">
                  <Percent className="w-3.5 h-3.5 text-slate-400" />
                  Progreso (%)
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={progreso}
                  onChange={(e) => setProgreso(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800/80 border border-slate-700/80 rounded-xl text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                />
              </div>
            </div>

            {/* Fechas */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  Fecha Inicio
                </label>
                <input
                  type="date"
                  value={fechaInicio}
                  onChange={(e) => setFechaInicio(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800/80 border border-slate-700/80 rounded-xl text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  Fin Estimado
                </label>
                <input
                  type="date"
                  value={finEstimado}
                  onChange={(e) => setFinEstimado(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800/80 border border-slate-700/80 rounded-xl text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  Fin Real (Cierre)
                </label>
                <input
                  type="date"
                  value={finReal}
                  onChange={(e) => setFinReal(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800/80 border border-slate-700/80 rounded-xl text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                />
              </div>
            </div>
          </div>

          {/* Bloque 3: Integrantes del Equipo */}
          <div className="space-y-4 pt-4 border-t border-slate-800">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-blue-400" />
              3. Asignación de Equipo
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Project Manager (PM)
                </label>
                <select
                  value={pmId}
                  onChange={(e) => setPmId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800/80 border border-slate-700/80 rounded-xl text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                >
                  <option value="">-- Sin asignar --</option>
                  {equipo.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.fullName || m.nickname} {m.tag ? `(${m.tag})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Arquitecto
                </label>
                <select
                  value={arquitectoId}
                  onChange={(e) => setArquitectoId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800/80 border border-slate-700/80 rounded-xl text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                >
                  <option value="">-- Sin asignar --</option>
                  {equipo.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.fullName || m.nickname} {m.tag ? `(${m.tag})` : ''}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Product Owner (PO)
                </label>
                <select
                  value={poId}
                  onChange={(e) => setPoId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800/80 border border-slate-700/80 rounded-xl text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                >
                  <option value="">-- Sin asignar --</option>
                  {equipo.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.fullName || m.nickname}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  SQA / Tester
                </label>
                <select
                  value={sqaId}
                  onChange={(e) => setSqaId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800/80 border border-slate-700/80 rounded-xl text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                >
                  <option value="">-- Sin asignar --</option>
                  {equipo.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.fullName || m.nickname}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Developers con chips */}
            <div className="space-y-2">
              <label className="block text-xs font-medium text-slate-300">
                Developers Asignados ({selectedDevIds.length})
              </label>

              {selectedDevIds.length > 0 && (
                <div className="flex flex-wrap gap-1.5 p-2 bg-slate-800/40 border border-slate-800 rounded-xl min-h-[42px] items-center">
                  {selectedDevIds.map((dId) => {
                    const dev = equipo.find((m) => m.id === dId);
                    return (
                      <span
                        key={dId}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-500/15 border border-blue-500/30 text-blue-200 text-xs font-medium"
                      >
                        <Avatar
                          image={dev?.image ?? null}
                          name={dev?.fullName || dId}
                          size={18}
                        />
                        <span>{dev?.nickname || dev?.fullName || dId}</span>
                        <button
                          type="button"
                          onClick={() => removeDev(dId)}
                          className="hover:text-red-300 transition-colors ml-0.5"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    );
                  })}
                </div>
              )}

              <div className="relative">
                <input
                  type="text"
                  value={devSearch}
                  onFocus={() => setShowDevDropdown(true)}
                  onChange={(e) => {
                    setDevSearch(e.target.value);
                    setShowDevDropdown(true);
                  }}
                  placeholder="Buscar desarrollador para añadir o remover..."
                  className="w-full px-3.5 py-2 bg-slate-800/80 border border-slate-700/80 rounded-xl text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                />

                {showDevDropdown && (
                  <>
                    <div
                      className="fixed inset-0 z-10"
                      onClick={() => setShowDevDropdown(false)}
                    />
                    <div className="absolute top-full left-0 right-0 mt-1 max-h-48 overflow-y-auto bg-slate-800 border border-slate-700 rounded-xl shadow-xl z-20 p-1 divide-y divide-slate-700/50">
                      {activeDevs.length > 0 ? (
                        activeDevs.map((m) => {
                          const isSelected = selectedDevIds.includes(m.id);
                          return (
                            <button
                              type="button"
                              key={m.id}
                              onClick={() => toggleDev(m.id)}
                              className={`w-full flex items-center justify-between px-3 py-2 text-left text-sm rounded-lg transition-colors ${
                                isSelected
                                  ? 'bg-blue-500/20 text-blue-300'
                                  : 'text-slate-300 hover:bg-slate-700/60'
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                <Avatar
                                  image={m.image}
                                  name={m.fullName}
                                  size={24}
                                />
                                <div>
                                  <div className="font-medium text-xs text-slate-200">
                                    {m.fullName}
                                  </div>
                                  <div className="text-[10px] text-slate-400">
                                    {m.title || m.department || m.id}
                                  </div>
                                </div>
                              </div>
                              {isSelected && <Check className="w-4 h-4" />}
                            </button>
                          );
                        })
                      ) : (
                        <div className="p-3 text-xs text-slate-400 text-center">
                          No se encontraron miembros
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Bloque 4: Planeación, Producto y URLs */}
          <div className="space-y-4 pt-4 border-t border-slate-800">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              4. Planeación, Producto &amp; Vínculos
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Puntos
                </label>
                <input
                  type="number"
                  value={puntos}
                  onChange={(e) => setPuntos(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800/80 border border-slate-700/80 rounded-xl text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Cuatrimestre
                </label>
                <input
                  type="text"
                  value={cuatrimestre}
                  onChange={(e) => setCuatrimestre(e.target.value)}
                  placeholder="2026 Q2"
                  className="w-full px-3 py-2 bg-slate-800/80 border border-slate-700/80 rounded-xl text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Sprint
                </label>
                <input
                  type="text"
                  value={sprint}
                  onChange={(e) => setSprint(e.target.value)}
                  placeholder="S18"
                  className="w-full px-3 py-2 bg-slate-800/80 border border-slate-700/80 rounded-xl text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Producto / Línea
                </label>
                <input
                  type="text"
                  value={producto}
                  onChange={(e) => setProducto(e.target.value)}
                  placeholder="Academic"
                  className="w-full px-3 py-2 bg-slate-800/80 border border-slate-700/80 rounded-xl text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Servicio
                </label>
                <input
                  type="text"
                  value={servicio}
                  onChange={(e) => setServicio(e.target.value)}
                  placeholder="Core / App"
                  className="w-full px-3 py-2 bg-slate-800/80 border border-slate-700/80 rounded-xl text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Aliado / Partner
                </label>
                <input
                  type="text"
                  value={aliado}
                  onChange={(e) => setAliado(e.target.value)}
                  placeholder="Ninguno / Riviera / ..."
                  className="w-full px-3 py-2 bg-slate-800/80 border border-slate-700/80 rounded-xl text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Épica
                </label>
                <input
                  type="text"
                  value={epica}
                  onChange={(e) => setEpica(e.target.value)}
                  placeholder="Nombre de la épica"
                  className="w-full px-3 py-2 bg-slate-800/80 border border-slate-700/80 rounded-xl text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                URL de Jira / Plataforma / Repositorio
              </label>
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://..."
                className="w-full px-3.5 py-2 bg-slate-800/80 border border-slate-700/80 rounded-xl text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
              />
            </div>
          </div>

          {/* Bloque 5: Dependencias y Acciones Requeridas */}
          <div className="space-y-4 pt-4 border-t border-slate-800">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              5. Dependencias &amp; Acciones Requeridas
            </h3>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Requiere de (Bloqueantes / Dependencias)
              </label>
              <input
                type="text"
                value={requiereDe}
                onChange={(e) => setRequiereDe(e.target.value)}
                placeholder="H/PROJECT-12, definición de requerimientos..."
                className="w-full px-3.5 py-2 bg-slate-800/80 border border-slate-700/80 rounded-xl text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Acción Requerida
                </label>
                <input
                  type="text"
                  value={accionRequerida}
                  onChange={(e) => setAccionRequerida(e.target.value)}
                  placeholder="Aprobar contrato, entregar credenciales..."
                  className="w-full px-3.5 py-2 bg-slate-800/80 border border-slate-700/80 rounded-xl text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  Fecha Límite de Acción
                </label>
                <input
                  type="date"
                  value={fechaAccion}
                  onChange={(e) => setFechaAccion(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-800/80 border border-slate-700/80 rounded-xl text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                />
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 pt-5 border-t border-slate-800 sticky bottom-0 bg-slate-900/95 py-2">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2 rounded-xl text-sm font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting || loadingCatalogs}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-medium text-sm shadow-lg shadow-purple-500/20 disabled:opacity-50 transition-all cursor-pointer"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Guardando cambios...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Guardar Proyecto</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

