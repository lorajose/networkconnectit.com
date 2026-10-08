export const PROJECT_PASS_RETURN_STATUSES = [
  "success",
  "cancelled",
  "failed",
] as const;

export type ProjectPassReturnStatus = (typeof PROJECT_PASS_RETURN_STATUSES)[number];

export type ProjectPassReturnState = {
  status: ProjectPassReturnStatus;
  checkoutCompleted: boolean;
  shouldCheckServerEntitlement: boolean;
  message: string;
};

/**
 * Browser return state is UX only. It must never be used as payment authority
 * or as a substitute for the persisted, server-verified Project Pass
 * entitlement.
 */
export function getProjectPassReturnState(value: string | null | undefined): ProjectPassReturnState {
  const normalized = value?.trim().toLowerCase();

  if (normalized === "success") {
    return {
      status: "success",
      checkoutCompleted: true,
      shouldCheckServerEntitlement: true,
      message: "Checkout returned successfully. Verifying Project Pass access with the server.",
    };
  }

  if (normalized === "failed") {
    return {
      status: "failed",
      checkoutCompleted: false,
      shouldCheckServerEntitlement: false,
      message: "Payment was not completed. Project Pass access was not granted by this return state.",
    };
  }

  return {
    status: "cancelled",
    checkoutCompleted: false,
    shouldCheckServerEntitlement: false,
    message: "Checkout was cancelled. Project Pass access was not granted by this return state.",
  };
}
