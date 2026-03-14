"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireUser } from "@/lib/auth";
import { sanitizeInternalRedirectPath } from "@/lib/navigation-security";
import {
  acknowledgeAlert,
  resolveAlert
} from "@/lib/management/alerts";
import {
  simulateDeviceHealthRun,
  simulateSiteHealthRun
} from "@/lib/management/health";
import {
  canAcknowledgeAlerts,
  canResolveAlerts,
  canRunHealthSimulation
} from "@/lib/rbac";

function revalidateMonitoringPaths(paths: string[]) {
  for (const path of paths) {
    revalidatePath(path);
  }
}

export async function acknowledgeAlertAction(
  alertId: string,
  redirectTo: string,
  _formData: FormData
) {
  const user = await requireUser();
  const safeRedirectPath = sanitizeInternalRedirectPath(redirectTo, "/alerts");

  if (!canAcknowledgeAlerts(user.role)) {
    redirect("/alerts");
  }

  const alert = await acknowledgeAlert(user, alertId);
  const paths = ["/dashboard", "/viewer", "/alerts"];

  if (alert?.siteId) {
    paths.push(`/sites/${alert.siteId}`);
  }

  if (alert?.deviceId) {
    paths.push(`/devices/${alert.deviceId}`);
  }

  revalidateMonitoringPaths(paths);
  revalidatePath(safeRedirectPath);
  redirect(safeRedirectPath);
}

export async function resolveAlertAction(
  alertId: string,
  redirectTo: string,
  _formData: FormData
) {
  const user = await requireUser();
  const safeRedirectPath = sanitizeInternalRedirectPath(redirectTo, "/alerts");

  if (!canResolveAlerts(user.role)) {
    redirect("/alerts");
  }

  const alert = await resolveAlert(user, alertId);
  const paths = ["/dashboard", "/viewer", "/alerts"];

  if (alert?.siteId) {
    paths.push(`/sites/${alert.siteId}`);
  }

  if (alert?.deviceId) {
    paths.push(`/devices/${alert.deviceId}`);
  }

  revalidateMonitoringPaths(paths);
  revalidatePath(safeRedirectPath);
  redirect(safeRedirectPath);
}

export async function simulateDeviceHealthRunAction(
  deviceId: string,
  redirectTo: string,
  _formData: FormData
) {
  const user = await requireUser();
  const safeRedirectPath = sanitizeInternalRedirectPath(
    redirectTo,
    `/devices/${deviceId}`
  );

  if (!canRunHealthSimulation(user.role)) {
    redirect("/dashboard");
  }

  await simulateDeviceHealthRun(user, deviceId);

  revalidateMonitoringPaths([
    "/dashboard",
    "/viewer",
    "/alerts",
    "/devices",
    `/devices/${deviceId}`,
    "/sites"
  ]);
  revalidatePath(safeRedirectPath);
  redirect(safeRedirectPath);
}

export async function simulateSiteHealthRunAction(
  siteId: string,
  redirectTo: string,
  _formData: FormData
) {
  const user = await requireUser();
  const safeRedirectPath = sanitizeInternalRedirectPath(
    redirectTo,
    `/sites/${siteId}`
  );

  if (!canRunHealthSimulation(user.role)) {
    redirect("/dashboard");
  }

  await simulateSiteHealthRun(user, siteId);

  revalidateMonitoringPaths([
    "/dashboard",
    "/viewer",
    "/alerts",
    "/sites",
    `/sites/${siteId}`,
    "/devices"
  ]);
  revalidatePath(safeRedirectPath);
  redirect(safeRedirectPath);
}
