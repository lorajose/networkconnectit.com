import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import type { ProjectOption } from "@/lib/management/projects";

type ProjectScopeFilterProps = {
  actionPath: string;
  projects: readonly ProjectOption[];
  selectedProjectId?: string;
};

export function ProjectScopeFilter({
  actionPath,
  projects,
  selectedProjectId
}: ProjectScopeFilterProps) {
  if (projects.length === 0) {
    return null;
  }

  return (
    <form action={actionPath} className="flex flex-wrap items-center gap-2">
      <Select
        name="projectId"
        defaultValue={selectedProjectId ?? ""}
        className="min-w-[220px]"
      >
        <option value="">All projects</option>
        {projects.map((project) => (
          <option key={project.id} value={project.id}>
            {project.name}
          </option>
        ))}
      </Select>
      <Button type="submit" variant="outline" size="sm">
        Apply
      </Button>
      {selectedProjectId ? (
        <Button variant="ghost" size="sm" asChild>
          <Link href={actionPath}>Reset</Link>
        </Button>
      ) : null}
    </form>
  );
}
