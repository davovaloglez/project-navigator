import { useState, useEffect, useMemo, type SyntheticEvent } from 'react';
import {
  X,
  Plus,
  Loader2,
  AlertCircle,
  Building2,
  Calendar,
  Users,
  ChevronDown,
  ChevronUp,
  FolderKanban,
  Check,
} from 'lucide-react';
import { Avatar } from '../ui/Avatar';
import type { EquipoRecord } from '../../pages/api/equipo';

interface EmpresaItem {
  id: string;
  nombre: string;
  moneda: string;
  activa: boolean;
  logo_url: string | null;
}

interface NewProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function NewProjectModal({ isOpen, onClose, onSuccess }: NewProjectModalProps) {
  // Catálogos
  const [empresas, setEmpresas] = useState<EmpresaItem[]>([]);
  const [equipo, setEquipo] = useState<EquipoRecord[]>([]);
  const [loadingCatalogs, setLoadingCatalogs] = useState(false);

  // Form states - Esenciales
  const [actividad, setActividad] = useState('');
  const [empresaId, setEmpresaId] = useState('vortex-it');
  const [folio, setFolio] = useState('');
  const [fechaInicio, setFechaInicio] = useState(
    () => new Date().toISOString().split('T')[0],
  );
  const [finEstimado, setFinEstimado] = useState('');
  const [estatus, setEstatus] = useState('Activo');
  const [prioridad, setPrioridad] = useState('Media');

  // Asignación de Roles
  const [pmId, setPmId] = useState('');
  const [arquitectoId, setArquitectoId] = useState('');
  const [poId, setPoId] = useState('');
  const [sqaId, setSqaId] = useState('');
  const [selectedDevIds, setSelectedDevIds] = useState<string[]>([]);
  const [devSearch, setDevSearch] = useState('');
  const [showDevDropdown, setShowDevDropdown] = useState(false);

  // Avanzados (Colapsable)
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [puntos, setPuntos] = useState('0');
  const [tipo, setTipo] = useState('API');
  const [salud, setSalud] = useState('Verde');
  const [epica, setEpica] = useState('');
  const [cuatrimestre, setCuatrimestre] = useState(() => {
    const d = new Date();
    const q = Math.floor(d.getMonth() / 3) + 1;
    return `${d.getFullYear()} Q${q}`;
  });
  const [url, setUrl] = useState('');
  const [producto, setProducto] = useState('Academic');
  const [servicio, setServicio] = useState('Core');
  const [aliado, setAliado] = useState('Ninguno');
  const [sprint, setSprint] = useState('');
  const [accionRequerida, setAccionRequerida] = useState('');
  const [fechaAccion, setFechaAccion] = useState('');

  // Submit states
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Cargar catálogos
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
        if (emps.length > 0 && !emps.some((e) => e.id === empresaId)) {
          setEmpresaId(emps[0].id);
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
  }, [isOpen]);

  // Sugerir folio automático según empresa
  useEffect(() => {
    if (!folio || folio.startsWith('VOR-') || folio.startsWith('BIT-')) {
      const prefix = empresaId === 'bit-technologies' ? 'BIT' : 'VOR';
      const year = new Date().getFullYear();
      setFolio(`${prefix}-${year}-`);
    }
  }, [empresaId]);

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
        actividad: actividad.trim(),
        empresaId,
        folio: folio.trim(),
        fechaInicio,
        finEstimado: finEstimado || null,
        estatus,
        prioridad,
        salud,
        puntos: parseInt(puntos, 10) || 0,
        tipo,
        epica: epica.trim(),
        cuatrimestre: cuatrimestre.trim(),
        url: url.trim(),
        producto: producto.trim(),
        servicio: servicio.trim(),
        aliado: aliado.trim(),
        sprint: sprint.trim(),
        pmIds: pmId ? [pmId] : [],
        arquitectoIds: arquitectoId ? [arquitectoId] : [],
        poIds: poId ? [poId] : [],
        sqaIds: sqaId ? [sqaId] : [],
        devIds: selectedDevIds,
        accionRequerida: accionRequerida.trim(),
        fechaAccion: fechaAccion || null,
      };

      const res = await fetch('/api/proyectos', {
        method: 'POST',
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
          : 'Ocurrió un error inesperado al dar de alta el proyecto.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-950/80 backdrop-blur-sm animate-fade-in overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden my-8">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800/80 bg-slate-900/50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400">
              <FolderKanban className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-100">
                Nuevo Proyecto
              </h2>
              <p className="text-xs text-slate-400">
                Registro en Base de Datos &amp; Sincronización
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

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {errorMsg && (
            <div className="flex items-start gap-2.5 p-3.5 bg-red-500/10 border border-red-500/30 rounded-xl text-red-300 text-sm">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Actividad / Nombre */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Nombre / Actividad <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              required
              autoFocus
              value={actividad}
              onChange={(e) => setActividad(e.target.value)}
              placeholder="p. ej. Migración de plataforma de pagos a Core V2"
              className="w-full px-3.5 py-2.5 bg-slate-800/80 border border-slate-700/80 rounded-xl text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all"
            />
          </div>

          {/* Empresa & Folio */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-slate-400" />
                Empresa <span className="text-red-400">*</span>
              </label>
              <select
                value={empresaId}
                onChange={(e) => setEmpresaId(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-800/80 border border-slate-700/80 rounded-xl text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
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
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Folio / Código{' '}
                <span className="text-slate-500 text-[10px] lowercase">
                  (sugerido)
                </span>
              </label>
              <input
                type="text"
                value={folio}
                onChange={(e) => setFolio(e.target.value)}
                placeholder="VOR-2026-001"
                className="w-full px-3.5 py-2.5 bg-slate-800/80 border border-slate-700/80 rounded-xl text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
              />
            </div>
          </div>

          {/* Fechas */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                Fecha Inicio <span className="text-red-400">*</span>
              </label>
              <input
                type="date"
                required
                value={fechaInicio}
                onChange={(e) => setFechaInicio(e.target.value)}
                className="w-full px-3.5 py-2 bg-slate-800/80 border border-slate-700/80 rounded-xl text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                Fin Estimado
              </label>
              <input
                type="date"
                value={finEstimado}
                onChange={(e) => setFinEstimado(e.target.value)}
                className="w-full px-3.5 py-2 bg-slate-800/80 border border-slate-700/80 rounded-xl text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
              />
            </div>
          </div>

          {/* Estatus & Prioridad */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Estatus Inicial
              </label>
              <select
                value={estatus}
                onChange={(e) => setEstatus(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-800/80 border border-slate-700/80 rounded-xl text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
              >
                <option value="Activo">Activo</option>
                <option value="On Track">On Track</option>
                <option value="At Risk">At Risk</option>
                <option value="Upcoming">Upcoming</option>
                <option value="On Hold">On Hold</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Prioridad
              </label>
              <select
                value={prioridad}
                onChange={(e) => setPrioridad(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-800/80 border border-slate-700/80 rounded-xl text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
              >
                <option value="Mayor">Mayor</option>
                <option value="Crítica">Crítica</option>
                <option value="Bloqueadora">Bloqueadora</option>
                <option value="Menor">Menor</option>
                <option value="Trivial">Trivial</option>
              </select>
            </div>
          </div>

          {/* SECCIÓN ASIGNACIÓN ÁGIL DE EQUIPO */}
          <div className="pt-2 border-t border-slate-800">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-blue-400" />
              Integrantes del Equipo
            </h3>

            {/* PM y Arquitecto */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-3">
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

            {/* PO y SQA */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Product Owner (PO)
                </label>
                <select
                  value={poId}
                  onChange={(e) => setPoId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800/80 border border-slate-700/80 rounded-xl text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                >
                  <option value="">-- Opcional --</option>
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
                  <option value="">-- Opcional --</option>
                  {equipo.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.fullName || m.nickname}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Developers (Multi-select con Chips) */}
            <div className="space-y-2">
              <label className="block text-xs font-medium text-slate-300">
                Developers Asignados ({selectedDevIds.length})
              </label>

              {/* Chips de devs seleccionados */}
              {selectedDevIds.length > 0 && (
                <div className="flex flex-wrap gap-1.5 p-2 bg-slate-800/40 border border-slate-800 rounded-xl min-h-[42px] items-center">
                  {selectedDevIds.map((id) => {
                    const dev = equipo.find((m) => m.id === id);
                    return (
                      <span
                        key={id}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-500/15 border border-blue-500/30 text-blue-200 text-xs font-medium"
                      >
                        <Avatar
                          image={dev?.image ?? null}
                          name={dev?.fullName || id}
                          size={18}
                        />
                        <span>{dev?.nickname || dev?.fullName || id}</span>
                        <button
                          type="button"
                          onClick={() => removeDev(id)}
                          className="hover:text-red-300 transition-colors ml-0.5"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    );
                  })}
                </div>
              )}

              {/* Buscador de devs */}
              <div className="relative">
                <input
                  type="text"
                  value={devSearch}
                  onFocus={() => setShowDevDropdown(true)}
                  onChange={(e) => {
                    setDevSearch(e.target.value);
                    setShowDevDropdown(true);
                  }}
                  placeholder="Buscar y seleccionar desarrolladores..."
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
                              onClick={() => {
                                toggleDev(m.id);
                              }}
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

          {/* OPCIONES AVANZADAS COLAPSABLES */}
          <div className="pt-2 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setShowAdvanced((prev) => !prev)}
              className="flex items-center justify-between w-full py-2 text-xs font-semibold text-slate-400 hover:text-slate-200 uppercase tracking-wider transition-colors"
            >
              <span>Detalles Adicionales (Puntos, Epica, URLs)</span>
              {showAdvanced ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </button>

            {showAdvanced && (
              <div className="pt-3 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-medium text-slate-400 mb-1">
                      Puntos
                    </label>
                    <input
                      type="number"
                      value={puntos}
                      onChange={(e) => setPuntos(e.target.value)}
                      className="w-full px-3 py-1.5 bg-slate-800/80 border border-slate-700/80 rounded-xl text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-slate-400 mb-1">
                      Cuatrimestre
                    </label>
                    <input
                      type="text"
                      value={cuatrimestre}
                      onChange={(e) => setCuatrimestre(e.target.value)}
                      placeholder="2026 Q2"
                      className="w-full px-3 py-1.5 bg-slate-800/80 border border-slate-700/80 rounded-xl text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-slate-400 mb-1">
                      Tipo
                    </label>
                    <input
                      type="text"
                      value={tipo}
                      onChange={(e) => setTipo(e.target.value)}
                      placeholder="API / Web / Mobile"
                      className="w-full px-3 py-1.5 bg-slate-800/80 border border-slate-700/80 rounded-xl text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-medium text-slate-400 mb-1">
                      Producto / Línea
                    </label>
                    <input
                      type="text"
                      value={producto}
                      onChange={(e) => setProducto(e.target.value)}
                      placeholder="Academic, Atrevus, ..."
                      className="w-full px-3 py-1.5 bg-slate-800/80 border border-slate-700/80 rounded-xl text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-slate-400 mb-1">
                      Épica
                    </label>
                    <input
                      type="text"
                      value={epica}
                      onChange={(e) => setEpica(e.target.value)}
                      placeholder="Nombre de la épica"
                      className="w-full px-3 py-1.5 bg-slate-800/80 border border-slate-700/80 rounded-xl text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-slate-400 mb-1">
                    URL de Jira / Repositorio / Documento
                  </label>
                  <input
                    type="url"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="https://..."
                    className="w-full px-3 py-1.5 bg-slate-800/80 border border-slate-700/80 rounded-xl text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
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
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-medium text-sm shadow-lg shadow-blue-500/20 disabled:opacity-50 transition-all cursor-pointer"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Guardando...</span>
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  <span>Crear Proyecto</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

