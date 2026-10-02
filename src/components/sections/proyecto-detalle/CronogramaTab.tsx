import type { ProjectRecord, TareaRecord, HitoRecord } from '../../../utils/dataTransforms';
import ProjectGantt from '../../charts/ProjectGantt';
import ProjectBurndown from '../../charts/ProjectBurndown';

interface Props {
  project: ProjectRecord;
  projectTareas: TareaRecord[];
  projectHitos: HitoRecord[];
}

export default function CronogramaTab({ project, projectTareas, projectHitos }: Props) {
  return (
    <div className="space-y-6">
      <ProjectGantt project={project} tareas={projectTareas} hitos={projectHitos} />
      <ProjectBurndown project={project} tareas={projectTareas} />
    </div>
  );
}
