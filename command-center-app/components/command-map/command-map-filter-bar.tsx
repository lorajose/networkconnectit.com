import Link from "next/link";

import { FilterBar } from "@/components/management/filter-bar";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import {
  commandMapAlertSeverityPresenceOptions,
  commandMapHealthStates,
  type CommandMapSnapshot
} from "@/lib/command-map/types";
import { formatEnumLabel } from "@/lib/utils";

type CommandMapFilterBarProps = {
  snapshot: Pick<CommandMapSnapshot, "filterOptions" | "selectedFilters">;
};

const offlinePresenceOptions = [
  {
    value: "with_offline",
    label: "Has offline devices"
  },
  {
    value: "without_offline",
    label: "No offline devices"
  }
] as const;

export function CommandMapFilterBar({
  snapshot
}: CommandMapFilterBarProps) {
  const { filterOptions, selectedFilters } = snapshot;

  return (
    <FilterBar>
      <form className="grid gap-3 xl:grid-cols-[220px_240px_180px_180px_220px_200px_auto]">
        <Select
          name="organizationId"
          defaultValue={selectedFilters.organizationId}
        >
          <option value="">All organizations</option>
          {filterOptions.organizations.map((organization) => (
            <option key={organization.id} value={organization.id}>
              {organization.label}
            </option>
          ))}
        </Select>
        <Select
          name="projectInstallationId"
          defaultValue={selectedFilters.projectInstallationId}
        >
          <option value="">All projects</option>
          {filterOptions.projects.map((project) => (
            <option key={project.id} value={project.id}>
              {project.label}
            </option>
          ))}
        </Select>
        <Select name="country" defaultValue={selectedFilters.country}>
          <option value="">All countries</option>
          {filterOptions.countries.map((country) => (
            <option key={country.id} value={country.id}>
              {country.label}
            </option>
          ))}
        </Select>
        <Select name="healthState" defaultValue={selectedFilters.healthState}>
          <option value="">All health states</option>
          {commandMapHealthStates.map((state) => (
            <option key={state} value={state}>
              {formatEnumLabel(state)}
            </option>
          ))}
        </Select>
        <Select
          name="alertSeverityPresence"
          defaultValue={selectedFilters.alertSeverityPresence}
        >
          <option value="">All alert postures</option>
          {commandMapAlertSeverityPresenceOptions.map((severity) => (
            <option key={severity} value={severity}>
              {severity === "any"
                ? "Any active alert"
                : `${formatEnumLabel(severity)} alerts`}
            </option>
          ))}
        </Select>
        <Select
          name="offlinePresence"
          defaultValue={selectedFilters.offlinePresence}
        >
          <option value="">All device states</option>
          {offlinePresenceOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>
        <div className="flex gap-3">
          <Button type="submit" variant="outline">
            Apply filters
          </Button>
          <Button variant="ghost" asChild>
            <Link href="/command-map">Reset</Link>
          </Button>
        </div>
      </form>
    </FilterBar>
  );
}
