"use client";

import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import { useFormState } from "react-dom";
import type { ZodError } from "zod";
import {
  AccessType,
  DeviceLinkType,
  DeviceStatus,
  DeviceType,
  HandoffStatus,
  MonitoringMode,
  OrganizationStatus,
  ProjectInstallationStatus,
  ProjectPriority,
  ProjectType,
  SiteStatus
} from "@prisma/client";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Plus,
  ShieldCheck,
  Trash2
} from "lucide-react";

import { submitProjectWizardAction } from "@/app/(protected)/projects/wizard-actions";
import { FormMessage } from "@/components/management/form-message";
import { SubmitButton } from "@/components/management/submit-button";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { EmptyState } from "@/components/dashboard/empty-state";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { initialManagementFormState } from "@/lib/management/form-state";
import {
  buildProjectWizardReviewSummary,
  createEmptyAccessReference,
  createEmptyCoreDevice,
  createEmptyDeviceLink,
  createEmptyEdgeDevice,
  createEmptyNetworkSegment,
  createEmptyNvrAssignment,
  createEmptyProjectWizardDraft,
  type WizardReadinessItem
} from "@/lib/management/project-wizard";
import type { OrganizationOption } from "@/lib/management/organizations";
import type { SiteOption } from "@/lib/management/sites";
import type { StatusTone } from "@/lib/dashboard/types";
import {
  projectWizardAccessReferenceSchema,
  coreDeviceTypeOptions,
  edgeDeviceTypeOptions,
  projectWizardCoreDeviceSchema,
  projectWizardDraftSchema,
  projectWizardEdgeDeviceSchema,
  projectWizardNetworkSegmentSchema,
  projectWizardNvrMappingSchema,
  projectWizardOrganizationSchema,
  projectWizardProjectSchema,
  projectWizardSiteSchema,
  projectWizardStepIds,
  type ProjectWizardDraftValues,
  type ProjectWizardStepId
} from "@/lib/validations/project-wizard";
import { formatEnumLabel } from "@/lib/utils";

type ProjectWizardProps = {
  organizations: OrganizationOption[];
  sites: SiteOption[];
  canCreateOrganizations: boolean;
  lockOrganizationId: string | null;
};

type StepConfig = {
  id: ProjectWizardStepId;
  label: string;
  description: string;
};

type StepErrors = Record<string, string[] | undefined>;

const SESSION_STORAGE_KEY = "networkconnectit-project-wizard-draft-v1";

const stepConfigs: StepConfig[] = [
  {
    id: "organization",
    label: "Organization",
    description: "Choose the customer account or create it inline."
  },
  {
    id: "site",
    label: "Site",
    description: "Select or create the primary deployment location."
  },
  {
    id: "project",
    label: "Project",
    description: "Define the installation record and internal ownership."
  },
  {
    id: "network",
    label: "Network profile",
    description: "Capture VLANs, subnets, and gateway information."
  },
  {
    id: "core-infrastructure",
    label: "Core infrastructure",
    description: "Register routers, switches, NVRs, and access points."
  },
  {
    id: "edge-devices",
    label: "Cameras & edge",
    description: "Add cameras and other field devices."
  },
  {
    id: "mapping",
    label: "Mappings",
    description: "Map NVR channels and device relationships."
  },
  {
    id: "access-monitoring",
    label: "Access & monitoring",
    description: "Add vault references and review onboarding readiness."
  },
  {
    id: "review",
    label: "Final review",
    description: "Validate the commissioning record before submission."
  }
];

function flattenZodErrors(error: ZodError, prefix = ""): StepErrors {
  return error.issues.reduce<StepErrors>((accumulator, issue) => {
    const key = [prefix, ...issue.path.map(String)].filter(Boolean).join(".");
    const entryKey = key || prefix || "root";

    if (!accumulator[entryKey]) {
      accumulator[entryKey] = [];
    }

    accumulator[entryKey]?.push(issue.message);
    return accumulator;
  }, {});
}

function mergeErrors(...errors: Array<StepErrors | undefined>): StepErrors {
  return errors.reduce<StepErrors>((accumulator, current) => {
    if (!current) {
      return accumulator;
    }

    for (const [key, value] of Object.entries(current)) {
      accumulator[key] = [...(accumulator[key] ?? []), ...(value ?? [])];
    }

    return accumulator;
  }, {});
}

function firstError(errors: StepErrors, key: string) {
  return errors[key]?.[0];
}

function filterErrorsByPrefix(errors: StepErrors, prefix: string) {
  return Object.fromEntries(
    Object.entries(errors).filter(([key]) => key.startsWith(prefix))
  );
}

function StepErrorSummary({ errors }: { errors: StepErrors }) {
  const entries = Object.values(errors).flat().filter(Boolean);

  if (entries.length === 0) {
    return null;
  }

  return (
    <div className="rounded-2xl border border-amber-500/25 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
      <div className="flex items-start gap-2">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
        <div className="space-y-1">
          <p className="font-medium">Review this step before continuing</p>
          <ul className="list-disc space-y-1 pl-4">
            {entries.map((message, index) => (
              <li key={`${message}-${index}`}>{message}</li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

function FieldMessage({ message }: { message?: string }) {
  if (!message) {
    return null;
  }

  return <p className="text-xs text-rose-300">{message}</p>;
}

function StepPanel({
  title,
  description,
  children
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <Card className="border-border/80 bg-card/70">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">{children}</CardContent>
    </Card>
  );
}

function ReadinessRow({ item }: { item: WizardReadinessItem }) {
  return (
    <div className="rounded-2xl border border-border/70 bg-background/35 px-4 py-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="space-y-1">
          <p className="font-medium text-foreground">{item.label}</p>
          <p className="text-sm text-muted-foreground">{item.description}</p>
        </div>
        <StatusBadge tone={item.tone} label={item.value} withIcon />
      </div>
    </div>
  );
}

function getToneForStep(
  stepIndex: number,
  currentStepIndex: number,
  visitedStepIndexes: number[]
): StatusTone {
  if (stepIndex === currentStepIndex) {
    return "info";
  }

  if (visitedStepIndexes.includes(stepIndex)) {
    return "healthy";
  }

  return "unknown";
}

export function ProjectWizard({
  organizations,
  sites,
  canCreateOrganizations,
  lockOrganizationId
}: ProjectWizardProps) {
  const [draft, setDraft] = useState<ProjectWizardDraftValues>(() =>
    createEmptyProjectWizardDraft({
      lockOrganizationId,
      canCreateOrganizations
    })
  );
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [stepErrors, setStepErrors] = useState<StepErrors>({});
  const [visitedStepIndexes, setVisitedStepIndexes] = useState<number[]>([]);
  const [submitState, submitAction] = useFormState(
    submitProjectWizardAction,
    initialManagementFormState
  );

  const currentStep = stepConfigs[currentStepIndex];
  const selectedOrganizationId =
    draft.organization.mode === "existing"
      ? draft.organization.existingOrganizationId
      : "";
  const filteredSites = useMemo(
    () =>
      draft.organization.mode === "existing" && selectedOrganizationId
        ? sites.filter((site) => site.organizationId === selectedOrganizationId)
        : [],
    [draft.organization.mode, selectedOrganizationId, sites]
  );
  const allDevices = [...draft.coreDevices, ...draft.edgeDevices];
  const reviewSummary = buildProjectWizardReviewSummary(draft);

  useEffect(() => {
    const storedDraft = window.sessionStorage.getItem(SESSION_STORAGE_KEY);

    if (!storedDraft) {
      return;
    }

    try {
      const parsedDraft = projectWizardDraftSchema.safeParse(JSON.parse(storedDraft));

      if (parsedDraft.success) {
        setDraft((currentDraft) => {
          const nextDraft = parsedDraft.data;

          if (!canCreateOrganizations || lockOrganizationId) {
            return {
              ...nextDraft,
              organization: {
                ...nextDraft.organization,
                mode: "existing",
                existingOrganizationId: lockOrganizationId ?? nextDraft.organization.existingOrganizationId
              }
            };
          }

          return nextDraft;
        });
      }
    } catch {
      window.sessionStorage.removeItem(SESSION_STORAGE_KEY);
    }
  }, [canCreateOrganizations, lockOrganizationId]);

  useEffect(() => {
    window.sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(draft));
  }, [draft]);

  useEffect(() => {
    if (!canCreateOrganizations || lockOrganizationId) {
      setDraft((currentDraft) => ({
        ...currentDraft,
        organization: {
          ...currentDraft.organization,
          mode: "existing",
          existingOrganizationId: lockOrganizationId ?? currentDraft.organization.existingOrganizationId
        }
      }));
    }
  }, [canCreateOrganizations, lockOrganizationId]);

  useEffect(() => {
    if (draft.organization.mode !== "existing" || !draft.site.existingSiteId) {
      return;
    }

    if (!filteredSites.some((site) => site.id === draft.site.existingSiteId)) {
      setDraft((currentDraft) => ({
        ...currentDraft,
        site: {
          ...currentDraft.site,
          existingSiteId: ""
        }
      }));
    }
  }, [draft.organization.mode, draft.site.existingSiteId, filteredSites]);

  function resetWizard() {
    if (!window.confirm("Reset the current project wizard draft?")) {
      return;
    }

    const freshDraft = createEmptyProjectWizardDraft({
      lockOrganizationId,
      canCreateOrganizations
    });

    setDraft(freshDraft);
    setCurrentStepIndex(0);
    setVisitedStepIndexes([]);
    setStepErrors({});
    window.sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(freshDraft));
  }

  function validateStep(stepId: ProjectWizardStepId) {
    switch (stepId) {
      case "organization": {
        const parsed = projectWizardOrganizationSchema.safeParse(draft.organization);
        const errors = parsed.success
          ? {}
          : flattenZodErrors(parsed.error, "organization");

        if (!canCreateOrganizations && draft.organization.mode === "new") {
          errors["organization.mode"] = [
            "Only internal users can create organizations from the wizard."
          ];
        }

        return errors;
      }
      case "site": {
        const parsed = projectWizardSiteSchema.safeParse(draft.site);
        const baseErrors = parsed.success ? {} : flattenZodErrors(parsed.error, "site");
        const extraErrors: StepErrors = {};

        if (draft.organization.mode === "new" && draft.site.mode === "existing") {
          extraErrors["site.mode"] = [
            "A new organization requires a new site in this first wizard version."
          ];
        }

        return mergeErrors(baseErrors, extraErrors);
      }
      case "project": {
        const parsed = projectWizardProjectSchema.safeParse(draft.project);
        return parsed.success ? {} : flattenZodErrors(parsed.error, "project");
      }
      case "network": {
        const parsed = projectWizardNetworkSegmentSchema.array().safeParse(draft.networkSegments);
        return parsed.success ? {} : flattenZodErrors(parsed.error, "networkSegments");
      }
      case "core-infrastructure": {
        const parsed = projectWizardCoreDeviceSchema.array().safeParse(draft.coreDevices);
        return parsed.success ? {} : flattenZodErrors(parsed.error, "coreDevices");
      }
      case "edge-devices": {
        const parsed = projectWizardEdgeDeviceSchema.array().safeParse(draft.edgeDevices);
        return parsed.success ? {} : flattenZodErrors(parsed.error, "edgeDevices");
      }
      case "mapping": {
        const parsedAssignments = projectWizardNvrMappingSchema.array().safeParse(
          draft.mappings.nvrAssignments
        );
        const parsedDraft = projectWizardDraftSchema.safeParse(draft);

        return mergeErrors(
          parsedAssignments.success
            ? {}
            : flattenZodErrors(parsedAssignments.error, "mappings.nvrAssignments"),
          parsedDraft.success
            ? {}
            : filterErrorsByPrefix(flattenZodErrors(parsedDraft.error), "mappings.")
        );
      }
      case "access-monitoring": {
        const parsed = projectWizardAccessReferenceSchema.array().safeParse(
          draft.accessAndMonitoring.accessReferences
        );
        return parsed.success
          ? {}
          : flattenZodErrors(parsed.error, "accessAndMonitoring.accessReferences");
      }
      case "review": {
        const parsed = projectWizardDraftSchema.safeParse(draft);
        return parsed.success ? {} : flattenZodErrors(parsed.error);
      }
    }
  }

  function goToNextStep() {
    const errors = validateStep(currentStep.id);

    if (Object.keys(errors).length > 0) {
      setStepErrors(errors);
      return;
    }

    setStepErrors({});
    setVisitedStepIndexes((current) =>
      current.includes(currentStepIndex) ? current : [...current, currentStepIndex]
    );
    setCurrentStepIndex((current) => Math.min(current + 1, stepConfigs.length - 1));
  }

  function goToPreviousStep() {
    setStepErrors({});
    setCurrentStepIndex((current) => Math.max(current - 1, 0));
  }

  function renderOrganizationStep() {
    return (
      <StepPanel
        title="Organization step"
        description="Select an existing client account or create a new one inline before commissioning the installation."
      >
        {canCreateOrganizations ? (
          <div className="flex flex-wrap gap-3">
            <Button
              type="button"
              variant={draft.organization.mode === "existing" ? "default" : "outline"}
              onClick={() =>
                setDraft((currentDraft) => ({
                  ...currentDraft,
                  organization: {
                    ...currentDraft.organization,
                    mode: "existing"
                  }
                }))
              }
            >
              Use existing organization
            </Button>
            <Button
              type="button"
              variant={draft.organization.mode === "new" ? "default" : "outline"}
              onClick={() =>
                setDraft((currentDraft) => ({
                  ...currentDraft,
                  organization: {
                    ...currentDraft.organization,
                    mode: "new"
                  },
                  site: {
                    ...currentDraft.site,
                    mode: "new",
                    existingSiteId: ""
                  }
                }))
              }
            >
              Create new organization
            </Button>
          </div>
        ) : (
          <div className="rounded-2xl border border-border/70 bg-background/35 px-4 py-3 text-sm text-muted-foreground">
            Tenant-scoped users are locked to their organization for wizard onboarding.
          </div>
        )}

        {draft.organization.mode === "existing" ? (
          <div className="space-y-2">
            <Label htmlFor="wizard-existing-organization">Organization</Label>
            <Select
              id="wizard-existing-organization"
              value={draft.organization.existingOrganizationId}
              onChange={(event) =>
                setDraft((currentDraft) => ({
                  ...currentDraft,
                  organization: {
                    ...currentDraft.organization,
                    existingOrganizationId: event.target.value
                  },
                  site: {
                    ...currentDraft.site,
                    existingSiteId:
                      currentDraft.site.mode === "existing"
                        ? ""
                        : currentDraft.site.existingSiteId
                  }
                }))
              }
              disabled={!canCreateOrganizations && Boolean(lockOrganizationId)}
            >
              <option value="">Select organization</option>
              {organizations.map((organization) => (
                <option key={organization.id} value={organization.id}>
                  {organization.name}
                </option>
              ))}
            </Select>
            <FieldMessage
              message={firstError(stepErrors, "organization.existingOrganizationId")}
            />
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="wizard-org-name">Organization name</Label>
              <Input
                id="wizard-org-name"
                value={draft.organization.newOrganization.name}
                onChange={(event) =>
                  setDraft((currentDraft) => ({
                    ...currentDraft,
                    organization: {
                      ...currentDraft.organization,
                      newOrganization: {
                        ...currentDraft.organization.newOrganization,
                        name: event.target.value
                      }
                    }
                  }))
                }
                placeholder="Midtown Medical Group"
              />
              <FieldMessage message={firstError(stepErrors, "organization.newOrganization.name")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="wizard-org-slug">Slug</Label>
              <Input
                id="wizard-org-slug"
                value={draft.organization.newOrganization.slug}
                onChange={(event) =>
                  setDraft((currentDraft) => ({
                    ...currentDraft,
                    organization: {
                      ...currentDraft.organization,
                      newOrganization: {
                        ...currentDraft.organization.newOrganization,
                        slug: event.target.value
                      }
                    }
                  }))
                }
                placeholder="midtown-medical-group"
              />
              <FieldMessage message={firstError(stepErrors, "organization.newOrganization.slug")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="wizard-org-contact">Contact name</Label>
              <Input
                id="wizard-org-contact"
                value={draft.organization.newOrganization.contactName}
                onChange={(event) =>
                  setDraft((currentDraft) => ({
                    ...currentDraft,
                    organization: {
                      ...currentDraft.organization,
                      newOrganization: {
                        ...currentDraft.organization.newOrganization,
                        contactName: event.target.value
                      }
                    }
                  }))
                }
                placeholder="Operations director"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="wizard-org-email">Contact email</Label>
              <Input
                id="wizard-org-email"
                value={draft.organization.newOrganization.contactEmail}
                onChange={(event) =>
                  setDraft((currentDraft) => ({
                    ...currentDraft,
                    organization: {
                      ...currentDraft.organization,
                      newOrganization: {
                        ...currentDraft.organization.newOrganization,
                        contactEmail: event.target.value
                      }
                    }
                  }))
                }
                placeholder="ops@example.com"
              />
              <FieldMessage
                message={firstError(stepErrors, "organization.newOrganization.contactEmail")}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="wizard-org-phone">Phone</Label>
              <Input
                id="wizard-org-phone"
                value={draft.organization.newOrganization.phone}
                onChange={(event) =>
                  setDraft((currentDraft) => ({
                    ...currentDraft,
                    organization: {
                      ...currentDraft.organization,
                      newOrganization: {
                        ...currentDraft.organization.newOrganization,
                        phone: event.target.value
                      }
                    }
                  }))
                }
                placeholder="+1 (212) 555-0199"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="wizard-org-status">Status</Label>
              <Select
                id="wizard-org-status"
                value={draft.organization.newOrganization.status}
                onChange={(event) =>
                  setDraft((currentDraft) => ({
                    ...currentDraft,
                    organization: {
                      ...currentDraft.organization,
                      newOrganization: {
                        ...currentDraft.organization.newOrganization,
                        status: event.target.value as OrganizationStatus
                      }
                    }
                  }))
                }
              >
                {Object.values(OrganizationStatus).map((status) => (
                  <option key={status} value={status}>
                    {formatEnumLabel(status)}
                  </option>
                ))}
              </Select>
            </div>
          </div>
        )}
      </StepPanel>
    );
  }

  function renderSiteStep() {
    return (
      <StepPanel
        title="Site step"
        description="Choose or create the primary deployment location. This first version supports one primary site and can be extended later."
      >
        {draft.organization.mode === "existing" ? (
          <div className="flex flex-wrap gap-3">
            <Button
              type="button"
              variant={draft.site.mode === "existing" ? "default" : "outline"}
              onClick={() =>
                setDraft((currentDraft) => ({
                  ...currentDraft,
                  site: {
                    ...currentDraft.site,
                    mode: "existing"
                  }
                }))
              }
            >
              Use existing site
            </Button>
            <Button
              type="button"
              variant={draft.site.mode === "new" ? "default" : "outline"}
              onClick={() =>
                setDraft((currentDraft) => ({
                  ...currentDraft,
                  site: {
                    ...currentDraft.site,
                    mode: "new",
                    existingSiteId: ""
                  }
                }))
              }
            >
              Create new site
            </Button>
          </div>
        ) : (
          <div className="rounded-2xl border border-border/70 bg-background/35 px-4 py-3 text-sm text-muted-foreground">
            A new organization requires a new primary site in this wizard flow.
          </div>
        )}

        {draft.site.mode === "existing" ? (
          <div className="space-y-2">
            <Label htmlFor="wizard-existing-site">Primary site</Label>
            <Select
              id="wizard-existing-site"
              value={draft.site.existingSiteId}
              onChange={(event) =>
                setDraft((currentDraft) => ({
                  ...currentDraft,
                  site: {
                    ...currentDraft.site,
                    existingSiteId: event.target.value
                  }
                }))
              }
            >
              <option value="">Select site</option>
              {filteredSites.map((site) => (
                <option key={site.id} value={site.id}>
                  {site.name} · {site.organizationName}
                </option>
              ))}
            </Select>
            <FieldMessage message={firstError(stepErrors, "site.existingSiteId")} />
            {filteredSites.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No existing sites are available for the selected organization. Create a new site in this step instead.
              </p>
            ) : null}
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="wizard-site-name">Site name</Label>
              <Input
                id="wizard-site-name"
                value={draft.site.newSite.name}
                onChange={(event) =>
                  setDraft((currentDraft) => ({
                    ...currentDraft,
                    site: {
                      ...currentDraft.site,
                      newSite: {
                        ...currentDraft.site.newSite,
                        name: event.target.value
                      }
                    }
                  }))
                }
                placeholder="Manhattan Surgical Pavilion"
              />
              <FieldMessage message={firstError(stepErrors, "site.newSite.name")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="wizard-site-country">Country</Label>
              <Input
                id="wizard-site-country"
                value={draft.site.newSite.country}
                onChange={(event) =>
                  setDraft((currentDraft) => ({
                    ...currentDraft,
                    site: {
                      ...currentDraft.site,
                      newSite: {
                        ...currentDraft.site.newSite,
                        country: event.target.value
                      }
                    }
                  }))
                }
                placeholder="United States"
              />
              <FieldMessage message={firstError(stepErrors, "site.newSite.country")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="wizard-site-address1">Address line 1</Label>
              <Input
                id="wizard-site-address1"
                value={draft.site.newSite.addressLine1}
                onChange={(event) =>
                  setDraft((currentDraft) => ({
                    ...currentDraft,
                    site: {
                      ...currentDraft.site,
                      newSite: {
                        ...currentDraft.site.newSite,
                        addressLine1: event.target.value
                      }
                    }
                  }))
                }
                placeholder="245 East 54th Street"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="wizard-site-address2">Address line 2</Label>
              <Input
                id="wizard-site-address2"
                value={draft.site.newSite.addressLine2}
                onChange={(event) =>
                  setDraft((currentDraft) => ({
                    ...currentDraft,
                    site: {
                      ...currentDraft.site,
                      newSite: {
                        ...currentDraft.site.newSite,
                        addressLine2: event.target.value
                      }
                    }
                  }))
                }
                placeholder="Suite / building / floor"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="wizard-site-city">City</Label>
              <Input
                id="wizard-site-city"
                value={draft.site.newSite.city}
                onChange={(event) =>
                  setDraft((currentDraft) => ({
                    ...currentDraft,
                    site: {
                      ...currentDraft.site,
                      newSite: {
                        ...currentDraft.site.newSite,
                        city: event.target.value
                      }
                    }
                  }))
                }
                placeholder="New York"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="wizard-site-state">State / region</Label>
              <Input
                id="wizard-site-state"
                value={draft.site.newSite.stateRegion}
                onChange={(event) =>
                  setDraft((currentDraft) => ({
                    ...currentDraft,
                    site: {
                      ...currentDraft.site,
                      newSite: {
                        ...currentDraft.site.newSite,
                        stateRegion: event.target.value
                      }
                    }
                  }))
                }
                placeholder="NY"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="wizard-site-postal">Postal code</Label>
              <Input
                id="wizard-site-postal"
                value={draft.site.newSite.postalCode}
                onChange={(event) =>
                  setDraft((currentDraft) => ({
                    ...currentDraft,
                    site: {
                      ...currentDraft.site,
                      newSite: {
                        ...currentDraft.site.newSite,
                        postalCode: event.target.value
                      }
                    }
                  }))
                }
                placeholder="10022"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="wizard-site-timezone">Timezone</Label>
              <Input
                id="wizard-site-timezone"
                value={draft.site.newSite.timezone}
                onChange={(event) =>
                  setDraft((currentDraft) => ({
                    ...currentDraft,
                    site: {
                      ...currentDraft.site,
                      newSite: {
                        ...currentDraft.site.newSite,
                        timezone: event.target.value
                      }
                    }
                  }))
                }
                placeholder="America/New_York"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="wizard-site-latitude">Latitude</Label>
              <Input
                id="wizard-site-latitude"
                value={draft.site.newSite.latitude}
                onChange={(event) =>
                  setDraft((currentDraft) => ({
                    ...currentDraft,
                    site: {
                      ...currentDraft.site,
                      newSite: {
                        ...currentDraft.site.newSite,
                        latitude: event.target.value
                      }
                    }
                  }))
                }
                placeholder="40.7592"
              />
              <FieldMessage message={firstError(stepErrors, "site.newSite.latitude")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="wizard-site-longitude">Longitude</Label>
              <Input
                id="wizard-site-longitude"
                value={draft.site.newSite.longitude}
                onChange={(event) =>
                  setDraft((currentDraft) => ({
                    ...currentDraft,
                    site: {
                      ...currentDraft.site,
                      newSite: {
                        ...currentDraft.site.newSite,
                        longitude: event.target.value
                      }
                    }
                  }))
                }
                placeholder="-73.9693"
              />
              <FieldMessage message={firstError(stepErrors, "site.newSite.longitude")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="wizard-site-status">Site status</Label>
              <Select
                id="wizard-site-status"
                value={draft.site.newSite.status}
                onChange={(event) =>
                  setDraft((currentDraft) => ({
                    ...currentDraft,
                    site: {
                      ...currentDraft.site,
                      newSite: {
                        ...currentDraft.site.newSite,
                        status: event.target.value as SiteStatus
                      }
                    }
                  }))
                }
              >
                {Object.values(SiteStatus).map((status) => (
                  <option key={status} value={status}>
                    {formatEnumLabel(status)}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="wizard-site-notes">Notes</Label>
              <Textarea
                id="wizard-site-notes"
                value={draft.site.newSite.notes}
                onChange={(event) =>
                  setDraft((currentDraft) => ({
                    ...currentDraft,
                    site: {
                      ...currentDraft.site,
                      newSite: {
                        ...currentDraft.site.newSite,
                        notes: event.target.value
                      }
                    }
                  }))
                }
                placeholder="Loading dock access, after-hours coordination, or local install notes."
              />
            </div>
          </div>
        )}
      </StepPanel>
    );
  }

  function renderProjectStep() {
    return (
      <StepPanel
        title="Project step"
        description="Define the installation record, lifecycle state, dates, contacts, and internal owners."
      >
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="wizard-project-name">Project name</Label>
            <Input
              id="wizard-project-name"
              value={draft.project.name}
              onChange={(event) =>
                setDraft((currentDraft) => ({
                  ...currentDraft,
                  project: {
                    ...currentDraft.project,
                    name: event.target.value
                  }
                }))
              }
              placeholder="MMG Manhattan CCTV & Network Refresh"
            />
            <FieldMessage message={firstError(stepErrors, "project.name")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="wizard-project-code">Project code</Label>
            <Input
              id="wizard-project-code"
              value={draft.project.projectCode}
              onChange={(event) =>
                setDraft((currentDraft) => ({
                  ...currentDraft,
                  project: {
                    ...currentDraft.project,
                    projectCode: event.target.value
                  }
                }))
              }
              placeholder="MMG-NYC-Q2-2026"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="wizard-project-status">Status</Label>
            <Select
              id="wizard-project-status"
              value={draft.project.status}
              onChange={(event) =>
                setDraft((currentDraft) => ({
                  ...currentDraft,
                  project: {
                    ...currentDraft.project,
                    status: event.target.value as ProjectInstallationStatus
                  }
                }))
              }
            >
              {Object.values(ProjectInstallationStatus).map((status) => (
                <option key={status} value={status}>
                  {formatEnumLabel(status)}
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="wizard-project-type">Project type</Label>
            <Select
              id="wizard-project-type"
              value={draft.project.projectType}
              onChange={(event) =>
                setDraft((currentDraft) => ({
                  ...currentDraft,
                  project: {
                    ...currentDraft.project,
                    projectType: event.target.value as ProjectType
                  }
                }))
              }
            >
              {Object.values(ProjectType).map((type) => (
                <option key={type} value={type}>
                  {formatEnumLabel(type)}
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="wizard-project-priority">Priority</Label>
            <Select
              id="wizard-project-priority"
              value={draft.project.priority}
              onChange={(event) =>
                setDraft((currentDraft) => ({
                  ...currentDraft,
                  project: {
                    ...currentDraft.project,
                    priority: event.target.value as ProjectPriority
                  }
                }))
              }
            >
              {Object.values(ProjectPriority).map((priority) => (
                <option key={priority} value={priority}>
                  {formatEnumLabel(priority)}
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="wizard-project-handoff">Handoff status</Label>
            <Select
              id="wizard-project-handoff"
              value={draft.project.handoffStatus}
              onChange={(event) =>
                setDraft((currentDraft) => ({
                  ...currentDraft,
                  project: {
                    ...currentDraft.project,
                    handoffStatus: event.target.value as HandoffStatus
                  }
                }))
              }
            >
              {Object.values(HandoffStatus).map((status) => (
                <option key={status} value={status}>
                  {formatEnumLabel(status)}
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="wizard-install-date">Installation date</Label>
            <Input
              id="wizard-install-date"
              type="date"
              value={draft.project.installationDate}
              onChange={(event) =>
                setDraft((currentDraft) => ({
                  ...currentDraft,
                  project: {
                    ...currentDraft.project,
                    installationDate: event.target.value
                  }
                }))
              }
            />
            <FieldMessage message={firstError(stepErrors, "project.installationDate")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="wizard-go-live-date">Go-live date</Label>
            <Input
              id="wizard-go-live-date"
              type="date"
              value={draft.project.goLiveDate}
              onChange={(event) =>
                setDraft((currentDraft) => ({
                  ...currentDraft,
                  project: {
                    ...currentDraft.project,
                    goLiveDate: event.target.value
                  }
                }))
              }
            />
            <FieldMessage message={firstError(stepErrors, "project.goLiveDate")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="wizard-client-contact">Client contact</Label>
            <Input
              id="wizard-client-contact"
              value={draft.project.clientContactName}
              onChange={(event) =>
                setDraft((currentDraft) => ({
                  ...currentDraft,
                  project: {
                    ...currentDraft.project,
                    clientContactName: event.target.value
                  }
                }))
              }
              placeholder="Security manager"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="wizard-client-email">Client email</Label>
            <Input
              id="wizard-client-email"
              value={draft.project.clientContactEmail}
              onChange={(event) =>
                setDraft((currentDraft) => ({
                  ...currentDraft,
                  project: {
                    ...currentDraft.project,
                    clientContactEmail: event.target.value
                  }
                }))
              }
              placeholder="security@example.com"
            />
            <FieldMessage message={firstError(stepErrors, "project.clientContactEmail")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="wizard-client-phone">Client phone</Label>
            <Input
              id="wizard-client-phone"
              value={draft.project.clientContactPhone}
              onChange={(event) =>
                setDraft((currentDraft) => ({
                  ...currentDraft,
                  project: {
                    ...currentDraft.project,
                    clientContactPhone: event.target.value
                  }
                }))
              }
              placeholder="+1 (305) 555-0123"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="wizard-pm">Internal project manager</Label>
            <Input
              id="wizard-pm"
              value={draft.project.internalProjectManager}
              onChange={(event) =>
                setDraft((currentDraft) => ({
                  ...currentDraft,
                  project: {
                    ...currentDraft.project,
                    internalProjectManager: event.target.value
                  }
                }))
              }
              placeholder="NetworkConnectIT PM"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="wizard-lead-tech">Lead technician</Label>
            <Input
              id="wizard-lead-tech"
              value={draft.project.leadTechnician}
              onChange={(event) =>
                setDraft((currentDraft) => ({
                  ...currentDraft,
                  project: {
                    ...currentDraft.project,
                    leadTechnician: event.target.value
                  }
                }))
              }
              placeholder="Field lead"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="wizard-sales-owner">Sales owner</Label>
            <Input
              id="wizard-sales-owner"
              value={draft.project.salesOwner}
              onChange={(event) =>
                setDraft((currentDraft) => ({
                  ...currentDraft,
                  project: {
                    ...currentDraft.project,
                    salesOwner: event.target.value
                  }
                }))
              }
              placeholder="Account owner"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="wizard-remote-access">Remote access method</Label>
            <Input
              id="wizard-remote-access"
              value={draft.project.remoteAccessMethod}
              onChange={(event) =>
                setDraft((currentDraft) => ({
                  ...currentDraft,
                  project: {
                    ...currentDraft.project,
                    remoteAccessMethod: event.target.value
                  }
                }))
              }
              placeholder="VPN tunnel + cloud controller"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="wizard-vendor-systems">Vendor systems planned</Label>
            <Input
              id="wizard-vendor-systems"
              value={draft.project.vendorSystemsPlanned}
              onChange={(event) =>
                setDraft((currentDraft) => ({
                  ...currentDraft,
                  project: {
                    ...currentDraft.project,
                    vendorSystemsPlanned: event.target.value
                  }
                }))
              }
              placeholder="UniFi, Reolink, LTS"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="wizard-external-reference">External reference</Label>
            <Input
              id="wizard-external-reference"
              value={draft.project.externalReference}
              onChange={(event) =>
                setDraft((currentDraft) => ({
                  ...currentDraft,
                  project: {
                    ...currentDraft.project,
                    externalReference: event.target.value
                  }
                }))
              }
              placeholder="Quote / ticket / PM reference"
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="wizard-scope-summary">Scope summary</Label>
            <Textarea
              id="wizard-scope-summary"
              value={draft.project.scopeSummary}
              onChange={(event) =>
                setDraft((currentDraft) => ({
                  ...currentDraft,
                  project: {
                    ...currentDraft.project,
                    scopeSummary: event.target.value
                  }
                }))
              }
              placeholder="Summarize camera count, network scope, cabinet work, handoff expectations, and special constraints."
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="wizard-internal-notes">Internal notes</Label>
            <Textarea
              id="wizard-internal-notes"
              value={draft.project.internalNotes}
              onChange={(event) =>
                setDraft((currentDraft) => ({
                  ...currentDraft,
                  project: {
                    ...currentDraft.project,
                    internalNotes: event.target.value
                  }
                }))
              }
              placeholder="Crew notes, staging requirements, access constraints, or coordination items."
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="wizard-client-notes">Client-facing notes</Label>
            <Textarea
              id="wizard-client-notes"
              value={draft.project.clientFacingNotes}
              onChange={(event) =>
                setDraft((currentDraft) => ({
                  ...currentDraft,
                  project: {
                    ...currentDraft.project,
                    clientFacingNotes: event.target.value
                  }
                }))
              }
              placeholder="Optional summary or handoff note that can be retained for client-facing review."
            />
          </div>
          <label className="flex items-center gap-3 rounded-2xl border border-border/70 bg-background/35 px-4 py-3 text-sm text-foreground md:col-span-2">
            <input
              type="checkbox"
              checked={draft.project.monitoringReady}
              onChange={(event) =>
                setDraft((currentDraft) => ({
                  ...currentDraft,
                  project: {
                    ...currentDraft.project,
                    monitoringReady: event.target.checked
                  }
                }))
              }
            />
            Mark this project as monitoring-ready when the final handoff is complete.
          </label>
        </div>
      </StepPanel>
    );
  }

  function renderNetworkStep() {
    return (
      <StepPanel
        title="Network profile step"
        description="Document VLANs, subnets, and gateway details. You can skip this for now and resolve it during readiness review."
      >
        <div className="flex justify-between gap-3">
          <div className="text-sm text-muted-foreground">
            Segments added here will be created on the selected primary site during final submission.
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={() =>
              setDraft((currentDraft) => ({
                ...currentDraft,
                networkSegments: [...currentDraft.networkSegments, createEmptyNetworkSegment()]
              }))
            }
          >
            <Plus className="h-4 w-4" />
            Add segment
          </Button>
        </div>

        {draft.networkSegments.length === 0 ? (
          <EmptyState
            title="No segments yet"
            description="You can continue without VLAN details, but the readiness review will flag that network documentation is missing."
          />
        ) : (
          <div className="space-y-4">
            {draft.networkSegments.map((segment, index) => (
              <Card key={segment.clientId} className="border-border/70 bg-background/35">
                <CardHeader className="flex flex-row items-start justify-between gap-4">
                  <div>
                    <CardTitle className="text-base">Segment {index + 1}</CardTitle>
                    <CardDescription>VLAN / subnet profile for the project site.</CardDescription>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      setDraft((currentDraft) => ({
                        ...currentDraft,
                        networkSegments: currentDraft.networkSegments.filter(
                          (entry) => entry.clientId !== segment.clientId
                        )
                      }))
                    }
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </CardHeader>
                <CardContent className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Name</Label>
                    <Input
                      value={segment.name}
                      onChange={(event) =>
                        setDraft((currentDraft) => ({
                          ...currentDraft,
                          networkSegments: currentDraft.networkSegments.map((entry) =>
                            entry.clientId === segment.clientId
                              ? { ...entry, name: event.target.value }
                              : entry
                          )
                        }))
                      }
                      placeholder="Camera VLAN"
                    />
                    <FieldMessage message={firstError(stepErrors, `networkSegments.${index}.name`)} />
                  </div>
                  <div className="space-y-2">
                    <Label>VLAN ID</Label>
                    <Input
                      value={segment.vlanId}
                      onChange={(event) =>
                        setDraft((currentDraft) => ({
                          ...currentDraft,
                          networkSegments: currentDraft.networkSegments.map((entry) =>
                            entry.clientId === segment.clientId
                              ? { ...entry, vlanId: event.target.value }
                              : entry
                          )
                        }))
                      }
                      placeholder="20"
                    />
                    <FieldMessage message={firstError(stepErrors, `networkSegments.${index}.vlanId`)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Subnet CIDR</Label>
                    <Input
                      value={segment.subnetCidr}
                      onChange={(event) =>
                        setDraft((currentDraft) => ({
                          ...currentDraft,
                          networkSegments: currentDraft.networkSegments.map((entry) =>
                            entry.clientId === segment.clientId
                              ? { ...entry, subnetCidr: event.target.value }
                              : entry
                          )
                        }))
                      }
                      placeholder="10.20.20.0/24"
                    />
                    <FieldMessage
                      message={firstError(stepErrors, `networkSegments.${index}.subnetCidr`)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Gateway IP</Label>
                    <Input
                      value={segment.gatewayIp}
                      onChange={(event) =>
                        setDraft((currentDraft) => ({
                          ...currentDraft,
                          networkSegments: currentDraft.networkSegments.map((entry) =>
                            entry.clientId === segment.clientId
                              ? { ...entry, gatewayIp: event.target.value }
                              : entry
                          )
                        }))
                      }
                      placeholder="10.20.20.1"
                    />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label>Purpose</Label>
                    <Input
                      value={segment.purpose}
                      onChange={(event) =>
                        setDraft((currentDraft) => ({
                          ...currentDraft,
                          networkSegments: currentDraft.networkSegments.map((entry) =>
                            entry.clientId === segment.clientId
                              ? { ...entry, purpose: event.target.value }
                              : entry
                          )
                        }))
                      }
                      placeholder="Camera network / management / guest Wi-Fi"
                    />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label>Notes</Label>
                    <Textarea
                      value={segment.notes}
                      onChange={(event) =>
                        setDraft((currentDraft) => ({
                          ...currentDraft,
                          networkSegments: currentDraft.networkSegments.map((entry) =>
                            entry.clientId === segment.clientId
                              ? { ...entry, notes: event.target.value }
                              : entry
                          )
                        }))
                      }
                      placeholder="Tagging, uplink rules, or related install notes."
                    />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </StepPanel>
    );
  }

  function renderCoreInfrastructureStep() {
    return (
      <StepPanel
        title="Core infrastructure step"
        description="Register routers, switches, NVRs, and APs so the project has its core operational backbone."
      >
        <div className="flex flex-wrap gap-3">
          {coreDeviceTypeOptions.map((type) => (
            <Button
              key={type}
              type="button"
              variant="outline"
              onClick={() =>
                setDraft((currentDraft) => ({
                  ...currentDraft,
                  coreDevices: [...currentDraft.coreDevices, createEmptyCoreDevice(type)]
                }))
              }
            >
              <Plus className="h-4 w-4" />
              Add {formatEnumLabel(type)}
            </Button>
          ))}
        </div>

        {draft.coreDevices.length === 0 ? (
          <EmptyState
            title="No core devices yet"
            description="You can keep going, but the readiness review will flag that core infrastructure has not been registered."
          />
        ) : (
          <div className="space-y-4">
            {draft.coreDevices.map((device, index) => (
              <Card key={device.clientId} className="border-border/70 bg-background/35">
                <CardHeader className="flex flex-row items-start justify-between gap-4">
                  <div>
                    <CardTitle className="text-base">
                      Core device {index + 1}
                    </CardTitle>
                    <CardDescription>
                      Add identification, networking, and monitoring fields for this device.
                    </CardDescription>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      setDraft((currentDraft) => ({
                        ...currentDraft,
                        coreDevices: currentDraft.coreDevices.filter(
                          (entry) => entry.clientId !== device.clientId
                        ),
                        mappings: {
                          nvrAssignments: currentDraft.mappings.nvrAssignments.filter(
                            (assignment) => assignment.nvrDeviceClientId !== device.clientId
                          ),
                          deviceLinks: currentDraft.mappings.deviceLinks.filter(
                            (link) =>
                              link.sourceDeviceClientId !== device.clientId &&
                              link.targetDeviceClientId !== device.clientId
                          )
                        },
                        accessAndMonitoring: {
                          accessReferences:
                            currentDraft.accessAndMonitoring.accessReferences.filter(
                              (reference) => reference.deviceClientId !== device.clientId
                            )
                        }
                      }))
                    }
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </CardHeader>
                <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  <div className="space-y-2">
                    <Label>Name</Label>
                    <Input
                      value={device.name}
                      onChange={(event) =>
                        setDraft((currentDraft) => ({
                          ...currentDraft,
                          coreDevices: currentDraft.coreDevices.map((entry) =>
                            entry.clientId === device.clientId
                              ? { ...entry, name: event.target.value }
                              : entry
                          )
                        }))
                      }
                      placeholder="Main edge router"
                    />
                    <FieldMessage message={firstError(stepErrors, `coreDevices.${index}.name`)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Type</Label>
                    <Select
                      value={device.type}
                      onChange={(event) =>
                        setDraft((currentDraft) => ({
                          ...currentDraft,
                          coreDevices: currentDraft.coreDevices.map((entry) =>
                            entry.clientId === device.clientId
                              ? {
                                  ...entry,
                                  type: event.target.value as (typeof coreDeviceTypeOptions)[number]
                                }
                              : entry
                          )
                        }))
                      }
                    >
                      {coreDeviceTypeOptions.map((type) => (
                        <option key={type} value={type}>
                          {formatEnumLabel(type)}
                        </option>
                      ))}
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Brand</Label>
                    <Input
                      value={device.brand}
                      onChange={(event) =>
                        setDraft((currentDraft) => ({
                          ...currentDraft,
                          coreDevices: currentDraft.coreDevices.map((entry) =>
                            entry.clientId === device.clientId
                              ? { ...entry, brand: event.target.value }
                              : entry
                          )
                        }))
                      }
                      placeholder="Ubiquiti / TP-Link / LTS"
                    />
                    <FieldMessage message={firstError(stepErrors, `coreDevices.${index}.brand`)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Model</Label>
                    <Input
                      value={device.model}
                      onChange={(event) =>
                        setDraft((currentDraft) => ({
                          ...currentDraft,
                          coreDevices: currentDraft.coreDevices.map((entry) =>
                            entry.clientId === device.clientId
                              ? { ...entry, model: event.target.value }
                              : entry
                          )
                        }))
                      }
                      placeholder="UXG-Pro / 24P PoE"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Hostname</Label>
                    <Input
                      value={device.hostname}
                      onChange={(event) =>
                        setDraft((currentDraft) => ({
                          ...currentDraft,
                          coreDevices: currentDraft.coreDevices.map((entry) =>
                            entry.clientId === device.clientId
                              ? { ...entry, hostname: event.target.value }
                              : entry
                          )
                        }))
                      }
                      placeholder="mmg-nyc-core-sw1"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>IP address</Label>
                    <Input
                      value={device.ipAddress}
                      onChange={(event) =>
                        setDraft((currentDraft) => ({
                          ...currentDraft,
                          coreDevices: currentDraft.coreDevices.map((entry) =>
                            entry.clientId === device.clientId
                              ? { ...entry, ipAddress: event.target.value }
                              : entry
                          )
                        }))
                      }
                      placeholder="10.20.10.2"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Serial number</Label>
                    <Input
                      value={device.serialNumber}
                      onChange={(event) =>
                        setDraft((currentDraft) => ({
                          ...currentDraft,
                          coreDevices: currentDraft.coreDevices.map((entry) =>
                            entry.clientId === device.clientId
                              ? { ...entry, serialNumber: event.target.value }
                              : entry
                          )
                        }))
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Firmware version</Label>
                    <Input
                      value={device.firmwareVersion}
                      onChange={(event) =>
                        setDraft((currentDraft) => ({
                          ...currentDraft,
                          coreDevices: currentDraft.coreDevices.map((entry) =>
                            entry.clientId === device.clientId
                              ? { ...entry, firmwareVersion: event.target.value }
                              : entry
                          )
                        }))
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Monitoring mode</Label>
                    <Select
                      value={device.monitoringMode}
                      onChange={(event) =>
                        setDraft((currentDraft) => ({
                          ...currentDraft,
                          coreDevices: currentDraft.coreDevices.map((entry) =>
                            entry.clientId === device.clientId
                              ? {
                                  ...entry,
                                  monitoringMode: event.target.value as MonitoringMode
                                }
                              : entry
                          )
                        }))
                      }
                    >
                      {Object.values(MonitoringMode).map((mode) => (
                        <option key={mode} value={mode}>
                          {formatEnumLabel(mode)}
                        </option>
                      ))}
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Status</Label>
                    <Select
                      value={device.status}
                      onChange={(event) =>
                        setDraft((currentDraft) => ({
                          ...currentDraft,
                          coreDevices: currentDraft.coreDevices.map((entry) =>
                            entry.clientId === device.clientId
                              ? { ...entry, status: event.target.value as DeviceStatus }
                              : entry
                          )
                        }))
                      }
                    >
                      {Object.values(DeviceStatus).map((status) => (
                        <option key={status} value={status}>
                          {formatEnumLabel(status)}
                        </option>
                      ))}
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Network segment</Label>
                    <Select
                      value={device.networkSegmentClientId}
                      onChange={(event) =>
                        setDraft((currentDraft) => ({
                          ...currentDraft,
                          coreDevices: currentDraft.coreDevices.map((entry) =>
                            entry.clientId === device.clientId
                              ? { ...entry, networkSegmentClientId: event.target.value }
                              : entry
                          )
                        }))
                      }
                    >
                      <option value="">No segment assigned</option>
                      {draft.networkSegments.map((segment) => (
                        <option key={segment.clientId} value={segment.clientId}>
                          {segment.name}
                          {segment.vlanId ? ` · VLAN ${segment.vlanId}` : ""}
                        </option>
                      ))}
                    </Select>
                    <FieldMessage
                      message={firstError(stepErrors, `coreDevices.${index}.networkSegmentClientId`)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Installed at</Label>
                    <Input
                      type="date"
                      value={device.installedAt}
                      onChange={(event) =>
                        setDraft((currentDraft) => ({
                          ...currentDraft,
                          coreDevices: currentDraft.coreDevices.map((entry) =>
                            entry.clientId === device.clientId
                              ? { ...entry, installedAt: event.target.value }
                              : entry
                          )
                        }))
                      }
                    />
                  </div>
                  <div className="space-y-2 md:col-span-2 xl:col-span-3">
                    <Label>Notes</Label>
                    <Textarea
                      value={device.notes}
                      onChange={(event) =>
                        setDraft((currentDraft) => ({
                          ...currentDraft,
                          coreDevices: currentDraft.coreDevices.map((entry) =>
                            entry.clientId === device.clientId
                              ? { ...entry, notes: event.target.value }
                              : entry
                          )
                        }))
                      }
                      placeholder="Role, cabinet, uplink notes, or install comments."
                    />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </StepPanel>
    );
  }

  function renderEdgeDevicesStep() {
    return (
      <StepPanel
        title="Camera / edge device step"
        description="Capture cameras and other field devices. This structure is ready for future bulk import, but the first version is manual."
      >
        <div className="flex flex-wrap gap-3">
          {edgeDeviceTypeOptions.map((type) => (
            <Button
              key={type}
              type="button"
              variant="outline"
              onClick={() =>
                setDraft((currentDraft) => ({
                  ...currentDraft,
                  edgeDevices: [...currentDraft.edgeDevices, createEmptyEdgeDevice(type)]
                }))
              }
            >
              <Plus className="h-4 w-4" />
              Add {formatEnumLabel(type)}
            </Button>
          ))}
        </div>

        {draft.edgeDevices.length === 0 ? (
          <EmptyState
            title="No edge devices yet"
            description="Add cameras or other field devices now, or continue and fill them later from the standard CRUD screens."
          />
        ) : (
          <div className="space-y-4">
            {draft.edgeDevices.map((device, index) => (
              <Card key={device.clientId} className="border-border/70 bg-background/35">
                <CardHeader className="flex flex-row items-start justify-between gap-4">
                  <div>
                    <CardTitle className="text-base">
                      Edge device {index + 1}
                    </CardTitle>
                    <CardDescription>
                      Record hostname, IP, model, mount location, and monitoring context.
                    </CardDescription>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      setDraft((currentDraft) => ({
                        ...currentDraft,
                        edgeDevices: currentDraft.edgeDevices.filter(
                          (entry) => entry.clientId !== device.clientId
                        ),
                        mappings: {
                          nvrAssignments: currentDraft.mappings.nvrAssignments.filter(
                            (assignment) => assignment.cameraDeviceClientId !== device.clientId
                          ),
                          deviceLinks: currentDraft.mappings.deviceLinks.filter(
                            (link) =>
                              link.sourceDeviceClientId !== device.clientId &&
                              link.targetDeviceClientId !== device.clientId
                          )
                        },
                        accessAndMonitoring: {
                          accessReferences:
                            currentDraft.accessAndMonitoring.accessReferences.filter(
                              (reference) => reference.deviceClientId !== device.clientId
                            )
                        }
                      }))
                    }
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </CardHeader>
                <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  <div className="space-y-2">
                    <Label>Name</Label>
                    <Input
                      value={device.name}
                      onChange={(event) =>
                        setDraft((currentDraft) => ({
                          ...currentDraft,
                          edgeDevices: currentDraft.edgeDevices.map((entry) =>
                            entry.clientId === device.clientId
                              ? { ...entry, name: event.target.value }
                              : entry
                          )
                        }))
                      }
                      placeholder="CAM-LOBBY-01"
                    />
                    <FieldMessage message={firstError(stepErrors, `edgeDevices.${index}.name`)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Type</Label>
                    <Select
                      value={device.type}
                      onChange={(event) =>
                        setDraft((currentDraft) => ({
                          ...currentDraft,
                          edgeDevices: currentDraft.edgeDevices.map((entry) =>
                            entry.clientId === device.clientId
                              ? {
                                  ...entry,
                                  type: event.target.value as (typeof edgeDeviceTypeOptions)[number]
                                }
                              : entry
                          )
                        }))
                      }
                    >
                      {edgeDeviceTypeOptions.map((type) => (
                        <option key={type} value={type}>
                          {formatEnumLabel(type)}
                        </option>
                      ))}
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Brand</Label>
                    <Input
                      value={device.brand}
                      onChange={(event) =>
                        setDraft((currentDraft) => ({
                          ...currentDraft,
                          edgeDevices: currentDraft.edgeDevices.map((entry) =>
                            entry.clientId === device.clientId
                              ? { ...entry, brand: event.target.value }
                              : entry
                          )
                        }))
                      }
                      placeholder="Reolink / LTS / Axis"
                    />
                    <FieldMessage message={firstError(stepErrors, `edgeDevices.${index}.brand`)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Model</Label>
                    <Input
                      value={device.model}
                      onChange={(event) =>
                        setDraft((currentDraft) => ({
                          ...currentDraft,
                          edgeDevices: currentDraft.edgeDevices.map((entry) =>
                            entry.clientId === device.clientId
                              ? { ...entry, model: event.target.value }
                              : entry
                          )
                        }))
                      }
                      placeholder="RLC-811A / Turret / Sensor"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Hostname</Label>
                    <Input
                      value={device.hostname}
                      onChange={(event) =>
                        setDraft((currentDraft) => ({
                          ...currentDraft,
                          edgeDevices: currentDraft.edgeDevices.map((entry) =>
                            entry.clientId === device.clientId
                              ? { ...entry, hostname: event.target.value }
                              : entry
                          )
                        }))
                      }
                      placeholder="cam-lobby-01"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>IP address</Label>
                    <Input
                      value={device.ipAddress}
                      onChange={(event) =>
                        setDraft((currentDraft) => ({
                          ...currentDraft,
                          edgeDevices: currentDraft.edgeDevices.map((entry) =>
                            entry.clientId === device.clientId
                              ? { ...entry, ipAddress: event.target.value }
                              : entry
                          )
                        }))
                      }
                      placeholder="10.20.20.101"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>MAC address</Label>
                    <Input
                      value={device.macAddress}
                      onChange={(event) =>
                        setDraft((currentDraft) => ({
                          ...currentDraft,
                          edgeDevices: currentDraft.edgeDevices.map((entry) =>
                            entry.clientId === device.clientId
                              ? { ...entry, macAddress: event.target.value }
                              : entry
                          )
                        }))
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Serial number</Label>
                    <Input
                      value={device.serialNumber}
                      onChange={(event) =>
                        setDraft((currentDraft) => ({
                          ...currentDraft,
                          edgeDevices: currentDraft.edgeDevices.map((entry) =>
                            entry.clientId === device.clientId
                              ? { ...entry, serialNumber: event.target.value }
                              : entry
                          )
                        }))
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Mount / location</Label>
                    <Input
                      value={device.mountLocation}
                      onChange={(event) =>
                        setDraft((currentDraft) => ({
                          ...currentDraft,
                          edgeDevices: currentDraft.edgeDevices.map((entry) =>
                            entry.clientId === device.clientId
                              ? { ...entry, mountLocation: event.target.value }
                              : entry
                          )
                        }))
                      }
                      placeholder="Lobby entrance / east corridor"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Monitoring mode</Label>
                    <Select
                      value={device.monitoringMode}
                      onChange={(event) =>
                        setDraft((currentDraft) => ({
                          ...currentDraft,
                          edgeDevices: currentDraft.edgeDevices.map((entry) =>
                            entry.clientId === device.clientId
                              ? {
                                  ...entry,
                                  monitoringMode: event.target.value as MonitoringMode
                                }
                              : entry
                          )
                        }))
                      }
                    >
                      {Object.values(MonitoringMode).map((mode) => (
                        <option key={mode} value={mode}>
                          {formatEnumLabel(mode)}
                        </option>
                      ))}
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Status</Label>
                    <Select
                      value={device.status}
                      onChange={(event) =>
                        setDraft((currentDraft) => ({
                          ...currentDraft,
                          edgeDevices: currentDraft.edgeDevices.map((entry) =>
                            entry.clientId === device.clientId
                              ? { ...entry, status: event.target.value as DeviceStatus }
                              : entry
                          )
                        }))
                      }
                    >
                      {Object.values(DeviceStatus).map((status) => (
                        <option key={status} value={status}>
                          {formatEnumLabel(status)}
                        </option>
                      ))}
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Network segment</Label>
                    <Select
                      value={device.networkSegmentClientId}
                      onChange={(event) =>
                        setDraft((currentDraft) => ({
                          ...currentDraft,
                          edgeDevices: currentDraft.edgeDevices.map((entry) =>
                            entry.clientId === device.clientId
                              ? { ...entry, networkSegmentClientId: event.target.value }
                              : entry
                          )
                        }))
                      }
                    >
                      <option value="">No segment assigned</option>
                      {draft.networkSegments.map((segment) => (
                        <option key={segment.clientId} value={segment.clientId}>
                          {segment.name}
                          {segment.vlanId ? ` · VLAN ${segment.vlanId}` : ""}
                        </option>
                      ))}
                    </Select>
                    <FieldMessage
                      message={firstError(stepErrors, `edgeDevices.${index}.networkSegmentClientId`)}
                    />
                  </div>
                  <div className="space-y-2 md:col-span-2 xl:col-span-3">
                    <Label>Notes</Label>
                    <Textarea
                      value={device.notes}
                      onChange={(event) =>
                        setDraft((currentDraft) => ({
                          ...currentDraft,
                          edgeDevices: currentDraft.edgeDevices.map((entry) =>
                            entry.clientId === device.clientId
                              ? { ...entry, notes: event.target.value }
                              : entry
                          )
                        }))
                      }
                      placeholder="Lens, channel notes, bracket type, or any field install context."
                    />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </StepPanel>
    );
  }

  function renderMappingStep() {
    const nvrOptions = draft.coreDevices.filter((device) => device.type === DeviceType.NVR);
    const cameraOptions = draft.edgeDevices.filter((device) => device.type === DeviceType.CAMERA);

    return (
      <StepPanel
        title="Mapping step"
        description="Create structured NVR channel assignments and device-to-device topology relationships without leaving the wizard."
      >
        <div className="grid gap-6 xl:grid-cols-2">
          <Card className="border-border/70 bg-background/35">
            <CardHeader>
              <CardTitle className="text-base">NVR channel assignments</CardTitle>
              <CardDescription>
                Map one or more cameras to NVR channels for this installation.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button
                type="button"
                variant="outline"
                onClick={() =>
                  setDraft((currentDraft) => ({
                    ...currentDraft,
                    mappings: {
                      ...currentDraft.mappings,
                      nvrAssignments: [
                        ...currentDraft.mappings.nvrAssignments,
                        createEmptyNvrAssignment()
                      ]
                    }
                  }))
                }
                disabled={nvrOptions.length === 0 || cameraOptions.length === 0}
              >
                <Plus className="h-4 w-4" />
                Add mapping
              </Button>
              {draft.mappings.nvrAssignments.length === 0 ? (
                <EmptyState
                  title="No NVR mappings yet"
                  description={
                    nvrOptions.length === 0 || cameraOptions.length === 0
                      ? "Add at least one NVR and one camera before creating channel mappings."
                      : "Channel mappings can be added now or later from site/project detail pages."
                  }
                />
              ) : (
                <div className="space-y-3">
                  {draft.mappings.nvrAssignments.map((assignment, index) => (
                    <div
                      key={assignment.clientId}
                      className="rounded-2xl border border-border/70 bg-card/60 px-4 py-4"
                    >
                      <div className="flex justify-end">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            setDraft((currentDraft) => ({
                              ...currentDraft,
                              mappings: {
                                ...currentDraft.mappings,
                                nvrAssignments: currentDraft.mappings.nvrAssignments.filter(
                                  (entry) => entry.clientId !== assignment.clientId
                                )
                              }
                            }))
                          }
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                          <Label>NVR</Label>
                          <Select
                            value={assignment.nvrDeviceClientId}
                            onChange={(event) =>
                              setDraft((currentDraft) => ({
                                ...currentDraft,
                                mappings: {
                                  ...currentDraft.mappings,
                                  nvrAssignments: currentDraft.mappings.nvrAssignments.map(
                                    (entry) =>
                                      entry.clientId === assignment.clientId
                                        ? { ...entry, nvrDeviceClientId: event.target.value }
                                        : entry
                                  )
                                }
                              }))
                            }
                          >
                            <option value="">Select NVR</option>
                            {nvrOptions.map((device) => (
                              <option key={device.clientId} value={device.clientId}>
                                {device.name}
                              </option>
                            ))}
                          </Select>
                          <FieldMessage
                            message={firstError(
                              stepErrors,
                              `mappings.nvrAssignments.${index}.nvrDeviceClientId`
                            )}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Camera</Label>
                          <Select
                            value={assignment.cameraDeviceClientId}
                            onChange={(event) =>
                              setDraft((currentDraft) => ({
                                ...currentDraft,
                                mappings: {
                                  ...currentDraft.mappings,
                                  nvrAssignments: currentDraft.mappings.nvrAssignments.map(
                                    (entry) =>
                                      entry.clientId === assignment.clientId
                                        ? { ...entry, cameraDeviceClientId: event.target.value }
                                        : entry
                                  )
                                }
                              }))
                            }
                          >
                            <option value="">Select camera</option>
                            {cameraOptions.map((device) => (
                              <option key={device.clientId} value={device.clientId}>
                                {device.name}
                              </option>
                            ))}
                          </Select>
                          <FieldMessage
                            message={firstError(
                              stepErrors,
                              `mappings.nvrAssignments.${index}.cameraDeviceClientId`
                            )}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Channel number</Label>
                          <Input
                            value={assignment.channelNumber}
                            onChange={(event) =>
                              setDraft((currentDraft) => ({
                                ...currentDraft,
                                mappings: {
                                  ...currentDraft.mappings,
                                  nvrAssignments: currentDraft.mappings.nvrAssignments.map(
                                    (entry) =>
                                      entry.clientId === assignment.clientId
                                        ? { ...entry, channelNumber: event.target.value }
                                        : entry
                                  )
                                }
                              }))
                            }
                            placeholder="1"
                          />
                          <FieldMessage
                            message={firstError(
                              stepErrors,
                              `mappings.nvrAssignments.${index}.channelNumber`
                            )}
                          />
                        </div>
                        <label className="flex items-center gap-3 rounded-2xl border border-border/70 bg-background/35 px-4 py-3 text-sm text-foreground">
                          <input
                            type="checkbox"
                            checked={assignment.recordingEnabled}
                            onChange={(event) =>
                              setDraft((currentDraft) => ({
                                ...currentDraft,
                                mappings: {
                                  ...currentDraft.mappings,
                                  nvrAssignments: currentDraft.mappings.nvrAssignments.map(
                                    (entry) =>
                                      entry.clientId === assignment.clientId
                                        ? { ...entry, recordingEnabled: event.target.checked }
                                        : entry
                                  )
                                }
                              }))
                            }
                          />
                          Recording enabled
                        </label>
                        <div className="space-y-2 md:col-span-2">
                          <Label>Notes</Label>
                          <Textarea
                            value={assignment.notes}
                            onChange={(event) =>
                              setDraft((currentDraft) => ({
                                ...currentDraft,
                                mappings: {
                                  ...currentDraft.mappings,
                                  nvrAssignments: currentDraft.mappings.nvrAssignments.map(
                                    (entry) =>
                                      entry.clientId === assignment.clientId
                                        ? { ...entry, notes: event.target.value }
                                        : entry
                                  )
                                }
                              }))
                            }
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-border/70 bg-background/35">
            <CardHeader>
              <CardTitle className="text-base">Device links</CardTitle>
              <CardDescription>
                Record router uplinks, switch downstream paths, and PoE relationships.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button
                type="button"
                variant="outline"
                onClick={() =>
                  setDraft((currentDraft) => ({
                    ...currentDraft,
                    mappings: {
                      ...currentDraft.mappings,
                      deviceLinks: [...currentDraft.mappings.deviceLinks, createEmptyDeviceLink()]
                    }
                  }))
                }
                disabled={allDevices.length < 2}
              >
                <Plus className="h-4 w-4" />
                Add device link
              </Button>
              {draft.mappings.deviceLinks.length === 0 ? (
                <EmptyState
                  title="No device links yet"
                  description={
                    allDevices.length < 2
                      ? "Add at least two devices before mapping topology relationships."
                      : "You can leave topology for later, but the readiness summary will note that links are missing."
                  }
                />
              ) : (
                <div className="space-y-3">
                  {draft.mappings.deviceLinks.map((link, index) => (
                    <div
                      key={link.clientId}
                      className="rounded-2xl border border-border/70 bg-card/60 px-4 py-4"
                    >
                      <div className="flex justify-end">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            setDraft((currentDraft) => ({
                              ...currentDraft,
                              mappings: {
                                ...currentDraft.mappings,
                                deviceLinks: currentDraft.mappings.deviceLinks.filter(
                                  (entry) => entry.clientId !== link.clientId
                                )
                              }
                            }))
                          }
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                          <Label>Source device</Label>
                          <Select
                            value={link.sourceDeviceClientId}
                            onChange={(event) =>
                              setDraft((currentDraft) => ({
                                ...currentDraft,
                                mappings: {
                                  ...currentDraft.mappings,
                                  deviceLinks: currentDraft.mappings.deviceLinks.map((entry) =>
                                    entry.clientId === link.clientId
                                      ? { ...entry, sourceDeviceClientId: event.target.value }
                                      : entry
                                  )
                                }
                              }))
                            }
                          >
                            <option value="">Select source</option>
                            {allDevices.map((device) => (
                              <option key={device.clientId} value={device.clientId}>
                                {device.name} · {formatEnumLabel(device.type)}
                              </option>
                            ))}
                          </Select>
                          <FieldMessage
                            message={firstError(
                              stepErrors,
                              `mappings.deviceLinks.${index}.sourceDeviceClientId`
                            )}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Target device</Label>
                          <Select
                            value={link.targetDeviceClientId}
                            onChange={(event) =>
                              setDraft((currentDraft) => ({
                                ...currentDraft,
                                mappings: {
                                  ...currentDraft.mappings,
                                  deviceLinks: currentDraft.mappings.deviceLinks.map((entry) =>
                                    entry.clientId === link.clientId
                                      ? { ...entry, targetDeviceClientId: event.target.value }
                                      : entry
                                  )
                                }
                              }))
                            }
                          >
                            <option value="">Select target</option>
                            {allDevices.map((device) => (
                              <option key={device.clientId} value={device.clientId}>
                                {device.name} · {formatEnumLabel(device.type)}
                              </option>
                            ))}
                          </Select>
                          <FieldMessage
                            message={firstError(
                              stepErrors,
                              `mappings.deviceLinks.${index}.targetDeviceClientId`
                            )}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Link type</Label>
                          <Select
                            value={link.linkType}
                            onChange={(event) =>
                              setDraft((currentDraft) => ({
                                ...currentDraft,
                                mappings: {
                                  ...currentDraft.mappings,
                                  deviceLinks: currentDraft.mappings.deviceLinks.map((entry) =>
                                    entry.clientId === link.clientId
                                      ? { ...entry, linkType: event.target.value as DeviceLinkType }
                                      : entry
                                  )
                                }
                              }))
                            }
                          >
                            {Object.values(DeviceLinkType).map((type) => (
                              <option key={type} value={type}>
                                {formatEnumLabel(type)}
                              </option>
                            ))}
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>PoE provided</Label>
                          <Select
                            value={link.poeProvided}
                            onChange={(event) =>
                              setDraft((currentDraft) => ({
                                ...currentDraft,
                                mappings: {
                                  ...currentDraft.mappings,
                                  deviceLinks: currentDraft.mappings.deviceLinks.map((entry) =>
                                    entry.clientId === link.clientId
                                      ? { ...entry, poeProvided: event.target.value as "" | "true" | "false" }
                                      : entry
                                  )
                                }
                              }))
                            }
                          >
                            <option value="">Not specified</option>
                            <option value="true">Yes</option>
                            <option value="false">No</option>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>Source port</Label>
                          <Input
                            value={link.sourcePort}
                            onChange={(event) =>
                              setDraft((currentDraft) => ({
                                ...currentDraft,
                                mappings: {
                                  ...currentDraft.mappings,
                                  deviceLinks: currentDraft.mappings.deviceLinks.map((entry) =>
                                    entry.clientId === link.clientId
                                      ? { ...entry, sourcePort: event.target.value }
                                      : entry
                                  )
                                }
                              }))
                            }
                            placeholder="Port 24 / SFP1"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Target port</Label>
                          <Input
                            value={link.targetPort}
                            onChange={(event) =>
                              setDraft((currentDraft) => ({
                                ...currentDraft,
                                mappings: {
                                  ...currentDraft.mappings,
                                  deviceLinks: currentDraft.mappings.deviceLinks.map((entry) =>
                                    entry.clientId === link.clientId
                                      ? { ...entry, targetPort: event.target.value }
                                      : entry
                                  )
                                }
                              }))
                            }
                            placeholder="Port 7 / WAN"
                          />
                        </div>
                        <div className="space-y-2 md:col-span-2">
                          <Label>Notes</Label>
                          <Textarea
                            value={link.notes}
                            onChange={(event) =>
                              setDraft((currentDraft) => ({
                                ...currentDraft,
                                mappings: {
                                  ...currentDraft.mappings,
                                  deviceLinks: currentDraft.mappings.deviceLinks.map((entry) =>
                                    entry.clientId === link.clientId
                                      ? { ...entry, notes: event.target.value }
                                      : entry
                                  )
                                }
                              }))
                            }
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </StepPanel>
    );
  }

  function renderAccessAndMonitoringStep() {
    return (
      <StepPanel
        title="Access and monitoring step"
        description="Add secure access references and review onboarding readiness before final submission."
      >
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border border-border/70 bg-background/35 px-4 py-4">
            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground/70">
              Linked devices
            </p>
            <p className="mt-2 text-2xl font-semibold text-foreground">
              {reviewSummary.linkedDevicesCount}
            </p>
          </div>
          <div className="rounded-2xl border border-border/70 bg-background/35 px-4 py-4">
            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground/70">
              Monitoring-ready
            </p>
            <p className="mt-2 text-2xl font-semibold text-foreground">
              {reviewSummary.monitoringReadyDevicesCount}
            </p>
          </div>
          <div className="rounded-2xl border border-border/70 bg-background/35 px-4 py-4">
            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground/70">
              Access references
            </p>
            <p className="mt-2 text-2xl font-semibold text-foreground">
              {reviewSummary.accessReferencesCount}
            </p>
          </div>
          <div className="rounded-2xl border border-border/70 bg-background/35 px-4 py-4">
            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground/70">
              Readiness
            </p>
            <div className="mt-2">
              <StatusBadge
                tone={reviewSummary.readinessTone}
                label={reviewSummary.readinessLabel}
                withIcon
              />
            </div>
          </div>
        </div>

        <div className="flex justify-between gap-3">
          <div className="text-sm text-muted-foreground">
            Store only metadata and vault references. Raw passwords and secrets should never be entered here.
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={() =>
              setDraft((currentDraft) => ({
                ...currentDraft,
                accessAndMonitoring: {
                  accessReferences: [
                    ...currentDraft.accessAndMonitoring.accessReferences,
                    createEmptyAccessReference()
                  ]
                }
              }))
            }
          >
            <Plus className="h-4 w-4" />
            Add access reference
          </Button>
        </div>

        {draft.accessAndMonitoring.accessReferences.length === 0 ? (
          <EmptyState
            title="No access references yet"
            description="You can continue without them, but the readiness summary will note that secure access documentation is missing."
          />
        ) : (
          <div className="space-y-4">
            {draft.accessAndMonitoring.accessReferences.map((reference, index) => (
              <Card key={reference.clientId} className="border-border/70 bg-background/35">
                <CardHeader className="flex flex-row items-start justify-between gap-4">
                  <div>
                    <CardTitle className="text-base">
                      Access reference {index + 1}
                    </CardTitle>
                    <CardDescription>
                      Project-, site-, or device-scoped access metadata.
                    </CardDescription>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      setDraft((currentDraft) => ({
                        ...currentDraft,
                        accessAndMonitoring: {
                          accessReferences:
                            currentDraft.accessAndMonitoring.accessReferences.filter(
                              (entry) => entry.clientId !== reference.clientId
                            )
                        }
                      }))
                    }
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </CardHeader>
                <CardContent className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Name</Label>
                    <Input
                      value={reference.name}
                      onChange={(event) =>
                        setDraft((currentDraft) => ({
                          ...currentDraft,
                          accessAndMonitoring: {
                            accessReferences:
                              currentDraft.accessAndMonitoring.accessReferences.map((entry) =>
                                entry.clientId === reference.clientId
                                  ? { ...entry, name: event.target.value }
                                  : entry
                              )
                          }
                        }))
                      }
                      placeholder="1Password · Site VPN"
                    />
                    <FieldMessage
                      message={firstError(
                        stepErrors,
                        `accessAndMonitoring.accessReferences.${index}.name`
                      )}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Scope</Label>
                    <Select
                      value={reference.scope}
                      onChange={(event) =>
                        setDraft((currentDraft) => ({
                          ...currentDraft,
                          accessAndMonitoring: {
                            accessReferences:
                              currentDraft.accessAndMonitoring.accessReferences.map((entry) =>
                                entry.clientId === reference.clientId
                                  ? {
                                      ...entry,
                                      scope: event.target.value as "PROJECT" | "SITE" | "DEVICE",
                                      deviceClientId:
                                        event.target.value === "DEVICE"
                                          ? entry.deviceClientId
                                          : ""
                                    }
                                  : entry
                              )
                          }
                        }))
                      }
                    >
                      <option value="PROJECT">Project</option>
                      <option value="SITE">Site</option>
                      <option value="DEVICE">Device</option>
                    </Select>
                  </div>
                  {reference.scope === "DEVICE" ? (
                    <div className="space-y-2 md:col-span-2">
                      <Label>Device</Label>
                      <Select
                        value={reference.deviceClientId}
                        onChange={(event) =>
                          setDraft((currentDraft) => ({
                            ...currentDraft,
                            accessAndMonitoring: {
                              accessReferences:
                                currentDraft.accessAndMonitoring.accessReferences.map((entry) =>
                                  entry.clientId === reference.clientId
                                    ? { ...entry, deviceClientId: event.target.value }
                                    : entry
                                )
                            }
                          }))
                        }
                      >
                        <option value="">Select device</option>
                        {allDevices.map((device) => (
                          <option key={device.clientId} value={device.clientId}>
                            {device.name} · {formatEnumLabel(device.type)}
                          </option>
                        ))}
                      </Select>
                      <FieldMessage
                        message={firstError(
                          stepErrors,
                          `accessAndMonitoring.accessReferences.${index}.deviceClientId`
                        )}
                      />
                    </div>
                  ) : null}
                  <div className="space-y-2">
                    <Label>Access type</Label>
                    <Select
                      value={reference.accessType}
                      onChange={(event) =>
                        setDraft((currentDraft) => ({
                          ...currentDraft,
                          accessAndMonitoring: {
                            accessReferences:
                              currentDraft.accessAndMonitoring.accessReferences.map((entry) =>
                                entry.clientId === reference.clientId
                                  ? { ...entry, accessType: event.target.value as AccessType }
                                  : entry
                              )
                          }
                        }))
                      }
                    >
                      {Object.values(AccessType).map((accessType) => (
                        <option key={accessType} value={accessType}>
                          {formatEnumLabel(accessType)}
                        </option>
                      ))}
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Vault provider</Label>
                    <Input
                      value={reference.vaultProvider}
                      onChange={(event) =>
                        setDraft((currentDraft) => ({
                          ...currentDraft,
                          accessAndMonitoring: {
                            accessReferences:
                              currentDraft.accessAndMonitoring.accessReferences.map((entry) =>
                                entry.clientId === reference.clientId
                                  ? { ...entry, vaultProvider: event.target.value }
                                  : entry
                              )
                          }
                        }))
                      }
                      placeholder="1Password"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Vault path / item</Label>
                    <Input
                      value={reference.vaultPath}
                      onChange={(event) =>
                        setDraft((currentDraft) => ({
                          ...currentDraft,
                          accessAndMonitoring: {
                            accessReferences:
                              currentDraft.accessAndMonitoring.accessReferences.map((entry) =>
                                entry.clientId === reference.clientId
                                  ? { ...entry, vaultPath: event.target.value }
                                  : entry
                              )
                          }
                        }))
                      }
                      placeholder="NetworkConnectIT / Midtown / Site VPN"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Owner</Label>
                    <Input
                      value={reference.owner}
                      onChange={(event) =>
                        setDraft((currentDraft) => ({
                          ...currentDraft,
                          accessAndMonitoring: {
                            accessReferences:
                              currentDraft.accessAndMonitoring.accessReferences.map((entry) =>
                                entry.clientId === reference.clientId
                                  ? { ...entry, owner: event.target.value }
                                  : entry
                              )
                          }
                        }))
                      }
                      placeholder="Managed services"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Remote access method</Label>
                    <Input
                      value={reference.remoteAccessMethod}
                      onChange={(event) =>
                        setDraft((currentDraft) => ({
                          ...currentDraft,
                          accessAndMonitoring: {
                            accessReferences:
                              currentDraft.accessAndMonitoring.accessReferences.map((entry) =>
                                entry.clientId === reference.clientId
                                  ? { ...entry, remoteAccessMethod: event.target.value }
                                  : entry
                              )
                          }
                        }))
                      }
                      placeholder="VPN tunnel + web UI"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Last validated</Label>
                    <Input
                      type="datetime-local"
                      value={reference.lastValidatedAt}
                      onChange={(event) =>
                        setDraft((currentDraft) => ({
                          ...currentDraft,
                          accessAndMonitoring: {
                            accessReferences:
                              currentDraft.accessAndMonitoring.accessReferences.map((entry) =>
                                entry.clientId === reference.clientId
                                  ? { ...entry, lastValidatedAt: event.target.value }
                                  : entry
                              )
                          }
                        }))
                      }
                    />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label>Notes</Label>
                    <Textarea
                      value={reference.notes}
                      onChange={(event) =>
                        setDraft((currentDraft) => ({
                          ...currentDraft,
                          accessAndMonitoring: {
                            accessReferences:
                              currentDraft.accessAndMonitoring.accessReferences.map((entry) =>
                                entry.clientId === reference.clientId
                                  ? { ...entry, notes: event.target.value }
                                  : entry
                              )
                          }
                        }))
                      }
                      placeholder="Metadata only. Do not enter passwords or secrets."
                    />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <div className="rounded-3xl border border-border/70 bg-background/35 p-5">
          <div className="flex items-start gap-3">
            <ShieldCheck className="mt-0.5 h-5 w-5 text-sky-300" />
            <div className="space-y-2">
              <p className="font-medium text-foreground">Readiness preview</p>
              <p className="text-sm text-muted-foreground">
                The final review will use the same readiness model shown below to highlight missing onboarding data.
              </p>
            </div>
          </div>
          <div className="mt-4 grid gap-4 xl:grid-cols-2">
            {reviewSummary.readinessItems.map((item) => (
              <ReadinessRow key={item.key} item={item} />
            ))}
          </div>
        </div>
      </StepPanel>
    );
  }

  function renderReviewStep() {
    return (
      <StepPanel
        title="Final review step"
        description="Confirm the installation record before writing the project and all related infrastructure in one transaction."
      >
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border border-border/70 bg-background/35 px-4 py-4">
            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground/70">
              Linked sites
            </p>
            <p className="mt-2 text-2xl font-semibold text-foreground">
              {reviewSummary.linkedSitesCount}
            </p>
          </div>
          <div className="rounded-2xl border border-border/70 bg-background/35 px-4 py-4">
            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground/70">
              Linked devices
            </p>
            <p className="mt-2 text-2xl font-semibold text-foreground">
              {reviewSummary.linkedDevicesCount}
            </p>
          </div>
          <div className="rounded-2xl border border-border/70 bg-background/35 px-4 py-4">
            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground/70">
              Network segments
            </p>
            <p className="mt-2 text-2xl font-semibold text-foreground">
              {reviewSummary.totalNetworkSegments}
            </p>
          </div>
          <div className="rounded-2xl border border-border/70 bg-background/35 px-4 py-4">
            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground/70">
              Readiness
            </p>
            <div className="mt-2">
              <StatusBadge
                tone={reviewSummary.readinessTone}
                label={`${reviewSummary.readinessLabel} · ${reviewSummary.readinessScore}%`}
                withIcon
              />
            </div>
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-[1fr_1.05fr]">
          <Card className="border-border/70 bg-background/35">
            <CardHeader>
              <CardTitle className="text-base">Project summary</CardTitle>
              <CardDescription>
                Final pre-submit summary for the installation record.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground/70">
                  Organization
                </p>
                <p className="mt-1 text-foreground">
                  {draft.organization.mode === "existing"
                    ? organizations.find(
                        (organization) =>
                          organization.id === draft.organization.existingOrganizationId
                      )?.name ?? "Selected existing organization"
                    : draft.organization.newOrganization.name || "New organization"}
                </p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground/70">
                  Primary site
                </p>
                <p className="mt-1 text-foreground">
                  {draft.site.mode === "existing"
                    ? filteredSites.find((site) => site.id === draft.site.existingSiteId)?.name ??
                      "Selected existing site"
                    : draft.site.newSite.name || "New site"}
                </p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground/70">
                  Project
                </p>
                <p className="mt-1 text-foreground">
                  {draft.project.name || "Unnamed project"}{" "}
                  {draft.project.projectCode ? `· ${draft.project.projectCode}` : ""}
                </p>
                <p className="text-muted-foreground">
                  {formatEnumLabel(draft.project.projectType)} ·{" "}
                  {formatEnumLabel(draft.project.status)} ·{" "}
                  {formatEnumLabel(draft.project.priority)}
                </p>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <div className="rounded-2xl border border-border/70 bg-card/70 px-4 py-3">
                  <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground/70">
                    Core devices
                  </p>
                  <p className="mt-1 text-foreground">
                    {reviewSummary.totalRouters} routers · {reviewSummary.totalSwitches} switches ·{" "}
                    {reviewSummary.totalNvrs} NVRs · {reviewSummary.totalAccessPoints} APs
                  </p>
                </div>
                <div className="rounded-2xl border border-border/70 bg-card/70 px-4 py-3">
                  <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground/70">
                    Edge devices
                  </p>
                  <p className="mt-1 text-foreground">
                    {reviewSummary.totalCameras} cameras ·{" "}
                    {draft.edgeDevices.length - reviewSummary.totalCameras} other edge devices
                  </p>
                </div>
                <div className="rounded-2xl border border-border/70 bg-card/70 px-4 py-3">
                  <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground/70">
                    Topology
                  </p>
                  <p className="mt-1 text-foreground">
                    {reviewSummary.nvrMappingsCount} NVR mappings · {reviewSummary.deviceLinksCount} links
                  </p>
                </div>
                <div className="rounded-2xl border border-border/70 bg-card/70 px-4 py-3">
                  <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground/70">
                    Access refs
                  </p>
                  <p className="mt-1 text-foreground">
                    {reviewSummary.accessReferencesCount} recorded
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/70 bg-background/35">
            <CardHeader>
              <CardTitle className="text-base">Readiness checklist</CardTitle>
              <CardDescription>
                This is the same onboarding checklist used to estimate whether the project will land in the command center as operationally ready.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {reviewSummary.readinessItems.map((item) => (
                <ReadinessRow key={item.key} item={item} />
              ))}
            </CardContent>
          </Card>
        </div>

        <form action={submitAction} className="space-y-4">
          <FormMessage state={submitState} />
          <input type="hidden" name="draft" value={JSON.stringify(draft)} />
          <div className="rounded-2xl border border-border/70 bg-background/35 px-4 py-4 text-sm text-muted-foreground">
            Final submission will create the organization if needed, create or select the primary site, create the project installation, link the site, add network segments, register devices, build mappings, add access references, and redirect to the installation record.
          </div>
          <div className="flex justify-end">
            <SubmitButton label="Finish project onboarding" />
          </div>
        </form>
      </StepPanel>
    );
  }

  function renderCurrentStep() {
    switch (currentStep.id) {
      case "organization":
        return renderOrganizationStep();
      case "site":
        return renderSiteStep();
      case "project":
        return renderProjectStep();
      case "network":
        return renderNetworkStep();
      case "core-infrastructure":
        return renderCoreInfrastructureStep();
      case "edge-devices":
        return renderEdgeDevicesStep();
      case "mapping":
        return renderMappingStep();
      case "access-monitoring":
        return renderAccessAndMonitoringStep();
      case "review":
        return renderReviewStep();
    }
  }

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden border-border/80 bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.16),transparent_34%),linear-gradient(135deg,rgba(15,23,42,0.98),rgba(2,6,23,0.96))] shadow-panel">
        <CardContent className="space-y-6 p-6">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-2">
              <p className="text-xs uppercase tracking-[0.24em] text-sky-200/80">
                Internal onboarding workflow
              </p>
              <h2 className="text-3xl font-semibold tracking-tight text-white">
                New Project Wizard
              </h2>
              <p className="max-w-3xl text-sm leading-6 text-slate-300">
                Build a real installation record in the right order: customer, site, project profile, network, infrastructure, mappings, secure access, and final readiness review.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <div className="rounded-2xl border border-border/70 bg-slate-950/35 px-4 py-3">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-400">
                  Progress
                </p>
                <p className="mt-1 text-lg font-semibold text-white">
                  Step {currentStepIndex + 1} of {stepConfigs.length}
                </p>
              </div>
              <div className="rounded-2xl border border-border/70 bg-slate-950/35 px-4 py-3">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-400">
                  Draft state
                </p>
                <p className="mt-1 text-lg font-semibold text-white">
                  Session auto-saved
                </p>
              </div>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-9">
            {stepConfigs.map((step, index) => (
              <div
                key={step.id}
                className="rounded-2xl border border-border/70 bg-slate-950/35 px-4 py-3"
              >
                <div className="flex items-center gap-3">
                  <StatusBadge
                    tone={getToneForStep(index, currentStepIndex, visitedStepIndexes)}
                    label={`0${index + 1}`.slice(-2)}
                  />
                  <div className="space-y-0.5">
                    <p className="text-sm font-medium text-white">{step.label}</p>
                    <p className="text-xs text-slate-400">{step.description}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <StepErrorSummary errors={stepErrors} />

      {renderCurrentStep()}

      {currentStep.id !== "review" ? (
        <Card className="border-border/80 bg-card/70">
          <CardContent className="flex flex-col gap-4 p-4 md:flex-row md:items-center md:justify-between">
            <div className="flex flex-wrap items-center gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={goToPreviousStep}
                disabled={currentStepIndex === 0}
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </Button>
              <Button type="button" onClick={goToNextStep}>
                Next
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button type="button" variant="ghost" onClick={resetWizard}>
                Reset draft
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="flex justify-between">
          <Button type="button" variant="outline" onClick={goToPreviousStep}>
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          <Button type="button" variant="ghost" onClick={resetWizard}>
            Reset draft
          </Button>
        </div>
      )}
    </div>
  );
}
