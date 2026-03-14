"use client";

import type { ChangeEvent } from "react";
import { useMemo, useRef, useState } from "react";
import { useFormState } from "react-dom";
import { AlertTriangle, FileDown, FileUp, RotateCcw } from "lucide-react";

import { importDevicesFromCsvAction } from "@/app/(protected)/devices/import/actions";
import { EmptyState } from "@/components/dashboard/empty-state";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { FormMessage } from "@/components/management/form-message";
import { SubmitButton } from "@/components/management/submit-button";
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
import { initialManagementFormState } from "@/lib/management/form-state";
import {
  buildDeviceImportPreview,
  DEVICE_IMPORT_TEMPLATE_COLUMNS,
  DEVICE_IMPORT_TEMPLATE_ROWS,
  MAX_DEVICE_IMPORT_ROWS,
  parseDeviceImportCsv,
  type DeviceImportBootstrap
} from "@/lib/management/device-import";
import type { DeviceImportCsvRowInput } from "@/lib/validations/device-import";
import { formatEnumLabel } from "@/lib/utils";

type DeviceImportWorkbenchProps = DeviceImportBootstrap;

function downloadImportTemplate() {
  const csv = [
    DEVICE_IMPORT_TEMPLATE_COLUMNS.join(","),
    ...DEVICE_IMPORT_TEMPLATE_ROWS.map((row) =>
      row.map((value) => `"${value.replaceAll("\"", "\"\"")}"`).join(",")
    )
  ].join("\n");

  const blob = new Blob([csv], {
    type: "text/csv;charset=utf-8"
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = "networkconnectit-device-import-template.csv";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function DeviceImportWorkbench({
  organizations,
  sites,
  projects,
  networkSegments,
  existingNvrs,
  lockOrganizationId
}: DeviceImportWorkbenchProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [selectedOrganizationId, setSelectedOrganizationId] = useState(
    lockOrganizationId ?? organizations[0]?.id ?? ""
  );
  const [rows, setRows] = useState<DeviceImportCsvRowInput[]>([]);
  const [sourceFileName, setSourceFileName] = useState("");
  const [parseError, setParseError] = useState<string | null>(null);
  const [selectedRowNumbers, setSelectedRowNumbers] = useState<number[]>([]);
  const [submitState, submitAction] = useFormState(
    importDevicesFromCsvAction,
    initialManagementFormState
  );

  const preview = useMemo(
    () =>
      buildDeviceImportPreview(rows, selectedOrganizationId, {
        organizations,
        sites,
        projects,
        networkSegments,
        existingNvrs,
        lockOrganizationId
      }),
    [
      existingNvrs,
      lockOrganizationId,
      networkSegments,
      organizations,
      projects,
      rows,
      selectedOrganizationId,
      sites
    ]
  );

  const selectedRowNumberSet = useMemo(
    () => new Set(selectedRowNumbers),
    [selectedRowNumbers]
  );
  const selectionIssues = useMemo(
    () =>
      preview.rows.filter(
        (row) =>
          selectedRowNumberSet.has(row.rowNumber) &&
          row.dependencyRowNumbers.some(
            (dependencyRowNumber) => !selectedRowNumberSet.has(dependencyRowNumber)
          )
      ),
    [preview.rows, selectedRowNumberSet]
  );
  const selectedValidRows = useMemo(
    () =>
      preview.rows.filter(
        (row) =>
          selectedRowNumberSet.has(row.rowNumber) &&
          row.importValues
      ),
    [preview.rows, selectedRowNumberSet]
  );
  const canSubmitImport =
    selectedOrganizationId.length > 0 &&
    selectedValidRows.length > 0 &&
    selectionIssues.length === 0;

  async function handleFileSelection(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    try {
      const parsedRows = parseDeviceImportCsv(await file.text());
      const nextPreview = buildDeviceImportPreview(parsedRows, selectedOrganizationId, {
        organizations,
        sites,
        projects,
        networkSegments,
        existingNvrs,
        lockOrganizationId
      });

      setRows(parsedRows);
      setSourceFileName(file.name);
      setParseError(null);
      setSelectedRowNumbers(
        nextPreview.rows
          .filter((row) => row.importValues)
          .map((row) => row.rowNumber)
      );
    } catch (error) {
      setRows([]);
      setSourceFileName("");
      setSelectedRowNumbers([]);
      setParseError(
        error instanceof Error
          ? error.message
          : "Unable to parse the uploaded CSV."
      );
    }
  }

  function resetImportSession() {
    setRows([]);
    setSourceFileName("");
    setSelectedRowNumbers([]);
    setParseError(null);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  function toggleRowSelection(rowNumber: number, checked: boolean) {
    setSelectedRowNumbers((current) => {
      if (checked) {
        return current.includes(rowNumber) ? current : [...current, rowNumber];
      }

      return current.filter((value) => value !== rowNumber);
    });
  }

  return (
    <div className="space-y-6">
      <Card className="border-border/80 bg-card/70">
        <CardHeader>
          <CardTitle>Bulk device import</CardTitle>
          <CardDescription>
            Upload a CSV, preview the resolved site and project mappings, skip invalid rows, and import the selected devices plus any camera-to-NVR assignments in one transaction.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-6 xl:grid-cols-[1.1fr_1fr]">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="device-import-organization">Organization</Label>
              <Select
                id="device-import-organization"
                value={selectedOrganizationId}
                onChange={(event) => {
                  const nextOrganizationId = event.target.value;
                  setSelectedOrganizationId(nextOrganizationId);

                  if (rows.length > 0) {
                    const nextPreview = buildDeviceImportPreview(rows, nextOrganizationId, {
                      organizations,
                      sites,
                      projects,
                      networkSegments,
                      existingNvrs,
                      lockOrganizationId
                    });

                    setSelectedRowNumbers(
                      nextPreview.rows
                        .filter((row) => row.importValues)
                        .map((row) => row.rowNumber)
                    );
                  }
                }}
                disabled={Boolean(lockOrganizationId)}
              >
                <option value="">Select organization</option>
                {organizations.map((organization) => (
                  <option key={organization.id} value={organization.id}>
                    {organization.name}
                  </option>
                ))}
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="device-import-file">CSV file</Label>
              <Input
                id="device-import-file"
                ref={fileInputRef}
                type="file"
                accept=".csv,text/csv"
                onChange={handleFileSelection}
                disabled={!selectedOrganizationId}
              />
              <p className="text-sm text-muted-foreground">
                Expected columns: {DEVICE_IMPORT_TEMPLATE_COLUMNS.join(", ")}. For staging safety, import up to {MAX_DEVICE_IMPORT_ROWS} rows per file.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={downloadImportTemplate}
              >
                <FileDown className="h-4 w-4" />
                Download template
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={resetImportSession}
                disabled={!rows.length && !parseError}
              >
                <RotateCcw className="h-4 w-4" />
                Clear import
              </Button>
            </div>

            {sourceFileName ? (
              <div className="rounded-2xl border border-border/70 bg-background/35 px-4 py-3 text-sm text-muted-foreground">
                Loaded <span className="font-medium text-foreground">{sourceFileName}</span> with{" "}
                {preview.summary.totalRows} parsed rows.
              </div>
            ) : null}

            {parseError ? (
              <div className="rounded-2xl border border-rose-500/25 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
                {parseError}
              </div>
            ) : null}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-border/70 bg-background/35 px-4 py-4">
              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground/70">
                Valid rows
              </p>
              <p className="mt-2 text-2xl font-semibold text-foreground">
                {preview.summary.validRows}
              </p>
            </div>
            <div className="rounded-2xl border border-border/70 bg-background/35 px-4 py-4">
              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground/70">
                Invalid rows
              </p>
              <p className="mt-2 text-2xl font-semibold text-foreground">
                {preview.summary.invalidRows}
              </p>
            </div>
            <div className="rounded-2xl border border-border/70 bg-background/35 px-4 py-4">
              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground/70">
                Selected for import
              </p>
              <p className="mt-2 text-2xl font-semibold text-foreground">
                {selectedValidRows.length}
              </p>
            </div>
            <div className="rounded-2xl border border-border/70 bg-background/35 px-4 py-4">
              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground/70">
                NVR assignments
              </p>
              <p className="mt-2 text-2xl font-semibold text-foreground">
                {
                  selectedValidRows.filter((row) => row.importValues?.nvrAssignment)
                    .length
                }
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {rows.length === 0 ? (
        <EmptyState
          title="No CSV loaded yet"
          description="Select an organization, upload a device inventory CSV, and review the preview before confirming the import."
          action={
            <Button
              type="button"
              variant="outline"
              onClick={downloadImportTemplate}
            >
              <FileDown className="h-4 w-4" />
              Download template
            </Button>
          }
        />
      ) : (
        <>
          {preview.summary.validRows === 0 ? (
            <div className="rounded-2xl border border-rose-500/25 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
              None of the parsed rows are currently importable. Fix the validation issues in the preview or split the file into cleaner batches before retrying.
            </div>
          ) : null}

          {selectionIssues.length > 0 ? (
            <div className="rounded-2xl border border-amber-500/25 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
              Selected camera rows depend on imported NVR rows that are not currently selected. Re-select the referenced NVR rows or uncheck the dependent cameras before importing.
            </div>
          ) : null}

          <Card className="border-border/80 bg-card/70">
            <CardHeader>
              <CardTitle>Preview and validation</CardTitle>
              <CardDescription>
                Review each row before importing. Invalid rows stay excluded automatically, and valid rows can be unchecked to skip them.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="overflow-x-auto">
                <table className="min-w-full border-collapse">
                  <thead>
                    <tr className="border-b border-border/70 bg-background/40 text-left text-xs uppercase tracking-[0.14em] text-muted-foreground">
                      <th className="px-4 py-3 font-medium">Import</th>
                      <th className="px-4 py-3 font-medium">Row</th>
                      <th className="px-4 py-3 font-medium">Site / project</th>
                      <th className="px-4 py-3 font-medium">Device</th>
                      <th className="px-4 py-3 font-medium">Network</th>
                      <th className="px-4 py-3 font-medium">NVR mapping</th>
                      <th className="px-4 py-3 font-medium">Validation</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60 text-sm">
                    {preview.rows.map((row) => {
                      const hasSelectionIssue =
                        selectedRowNumberSet.has(row.rowNumber) &&
                        row.dependencyRowNumbers.some(
                          (dependencyRowNumber) =>
                            !selectedRowNumberSet.has(dependencyRowNumber)
                        );
                      const isImportable = Boolean(row.importValues);

                      return (
                        <tr
                          key={row.rowNumber}
                          className={row.errors.length > 0 ? "bg-rose-950/10" : undefined}
                        >
                          <td className="px-4 py-4 align-top">
                            <input
                              type="checkbox"
                              checked={selectedRowNumberSet.has(row.rowNumber)}
                              disabled={!isImportable}
                              onChange={(event) =>
                                toggleRowSelection(row.rowNumber, event.target.checked)
                              }
                            />
                          </td>
                          <td className="px-4 py-4 align-top">
                            <p className="font-medium text-foreground">#{row.rowNumber}</p>
                          </td>
                          <td className="space-y-1 px-4 py-4 align-top">
                            <p className="text-foreground">{row.siteLabel}</p>
                            <p className="text-xs text-muted-foreground">{row.projectLabel}</p>
                          </td>
                          <td className="space-y-1 px-4 py-4 align-top">
                            <p className="font-medium text-foreground">
                              {row.raw.name || "Unnamed device"}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {row.resolvedType
                                ? formatEnumLabel(row.resolvedType)
                                : row.raw.deviceType || "Unknown type"}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {row.raw.brand}
                              {row.raw.model ? ` · ${row.raw.model}` : ""}
                              {row.raw.ipAddress ? ` · ${row.raw.ipAddress}` : ""}
                            </p>
                          </td>
                          <td className="space-y-1 px-4 py-4 align-top">
                            <p className="text-foreground">{row.networkSegmentLabel}</p>
                            <p className="text-xs text-muted-foreground">
                              {row.raw.hostname || "No hostname"}
                            </p>
                          </td>
                          <td className="space-y-1 px-4 py-4 align-top">
                            <p className="text-foreground">{row.nvrLabel}</p>
                            <p className="text-xs text-muted-foreground">
                              {row.raw.recordingEnabled
                                ? `Recording: ${row.raw.recordingEnabled}`
                                : "—"}
                            </p>
                          </td>
                          <td className="space-y-3 px-4 py-4 align-top">
                            <StatusBadge
                              tone={
                                row.errors.length > 0
                                  ? "critical"
                                  : hasSelectionIssue || row.warnings.length > 0
                                    ? "warning"
                                    : "healthy"
                              }
                              label={
                                row.errors.length > 0
                                  ? "Invalid"
                                  : hasSelectionIssue
                                    ? "Selection issue"
                                    : row.warnings.length > 0
                                      ? "Valid with warnings"
                                      : "Ready"
                              }
                              withIcon
                            />
                            {row.errors.length > 0 ? (
                              <ul className="space-y-1 text-xs text-rose-200">
                                {row.errors.map((error) => (
                                  <li key={error} className="flex gap-2">
                                    <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                                    <span>{error}</span>
                                  </li>
                                ))}
                              </ul>
                            ) : null}
                            {row.warnings.length > 0 ? (
                              <ul className="space-y-1 text-xs text-amber-200">
                                {row.warnings.map((warning) => (
                                  <li key={warning} className="flex gap-2">
                                    <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                                    <span>{warning}</span>
                                  </li>
                                ))}
                              </ul>
                            ) : null}
                            {hasSelectionIssue ? (
                              <p className="text-xs text-amber-200">
                                This row depends on an imported NVR that is not currently selected.
                              </p>
                            ) : null}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          <form action={submitAction} className="space-y-4">
            <FormMessage state={submitState} />
            <input
              type="hidden"
              name="organizationId"
              value={selectedOrganizationId}
            />
            <input type="hidden" name="rows" value={JSON.stringify(rows)} />
            <input
              type="hidden"
              name="selectedRowNumbers"
              value={JSON.stringify(selectedRowNumbers)}
            />
            <Card className="border-border/80 bg-card/70">
              <CardContent className="flex flex-col gap-4 p-4 md:flex-row md:items-center md:justify-between">
                <div className="space-y-1 text-sm text-muted-foreground">
                  <p className="font-medium text-foreground">
                    {selectedValidRows.length} device
                    {selectedValidRows.length === 1 ? "" : "s"} selected for import
                  </p>
                  <p>
                    {selectedValidRows.filter((row) => row.importValues?.type === "CAMERA").length} camera
                    {selectedValidRows.filter((row) => row.importValues?.type === "CAMERA").length === 1
                      ? ""
                      : "s"}{" "}
                    and{" "}
                    {
                      selectedValidRows.filter((row) => row.importValues?.nvrAssignment)
                        .length
                    }{" "}
                    NVR channel assignment
                    {selectedValidRows.filter((row) => row.importValues?.nvrAssignment).length === 1
                      ? ""
                      : "s"}{" "}
                    will be created.
                  </p>
                </div>
                <div className="flex flex-wrap gap-3">
                  <Button type="button" variant="ghost" onClick={resetImportSession}>
                    Cancel import
                  </Button>
                  <SubmitButton
                    label="Confirm bulk import"
                    disabled={!canSubmitImport}
                  />
                </div>
              </CardContent>
            </Card>
          </form>
        </>
      )}
    </div>
  );
}
