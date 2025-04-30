import { PromptComparator } from "@/components/prompt-comparator";
import { useProject } from "@/utils/dataHooks";

export default function Experiments() {
  const { project } = useProject();
  if (!project) return null;
  return <PromptComparator key={project.id} />;
}
