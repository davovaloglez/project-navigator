import type { ProjectRecord } from '../../utils/dataTransforms';
import { getEstatusColor, getSaludColor, getPrioridadColor } from '../../utils/colors';
import DetailDrawer, { DetailRow } from './DetailDrawer';
import StatusBadge from './StatusBadge';

interface Props {
  project: ProjectRecord | null;
  open: boolean;
  onClose: () => void;
}

export default function ProjectDetailDrawer({ project, open, onClose }: Props) {
  if (!project) return null;

  const estatusColor = getEstatusColor(project.estatus);
  const saludColor = getSaludColor(project.salud);
  const prioridadColor = getPrioridadColor(project.prioridad);

  return (
    <DetailDrawer
      title={project.folio}
      open={open}
      onClose={onClose}
      badges={
        <>
          {project.estatus && <StatusBadge label={project.estatus} {...estatusColor} size="md" />}
          {project.salud && <StatusBadge label={project.salud} bg={saludColor.bg} text={saludColor.text} size="md" />}
          {project.prioridad && <StatusBadge label={project.prioridad} bg={prioridadColor.bg} text={prioridadColor.text} size="md" />}
        </>
      }
    >
      <DetailRow label="Nombre" value={project.actividad} />
      <DetailRow label="PO" value={project.po} />
      <DetailRow label="PM" value={project.pm} />
      <DetailRow label="Arquitecto" value={project.arquitecto} />
      <DetailRow label="DEVs" value={project.devs.join(', ')} />
      <DetailRow label="SQA" value={project.sqa} />
      <DetailRow label="Producto" value={project.producto} />
      <DetailRow label="Servicio" value={project.servicio} />
      <DetailRow label="Aliado" value={project.aliado && project.aliado !== 'Ninguno' ? project.aliado : ''} />
      <DetailRow label="Tipo" value={project.tipo} />
      <DetailRow label="Épica" value={project.epica} />
      <DetailRow label="Q de entrega" value={project.cuatrimestre} />
      <DetailRow label="Sprint" value={project.sprint} />
      <DetailRow label="Progreso" value={`${Math.round(project.progreso * 100)}%`} />
      <DetailRow label="Puntos" value={project.puntos ? String(project.puntos) : ''} />
      <DetailRow label="Inicio" value={project.fechaInicio} />
      <DetailRow label="Fin estimado" value={project.finEstimado} />
      <DetailRow label="Fin real" value={project.finReal} />
      <DetailRow label="Registro" value={project.registro} />
      <DetailRow label="Requiere de" value={project.requiereDe} />
      <DetailRow label="Acción requerida" value={project.accionRequerida} />
      <DetailRow label="Fecha de acción" value={project.fechaAccion} />
      <DetailRow label="URL" value={project.url} />
    </DetailDrawer>
  );
}
