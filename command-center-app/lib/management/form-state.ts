export type ManagementFormState = {
  status: "idle" | "error";
  message?: string;
  fieldErrors?: Record<string, string[] | undefined>;
};

export const initialManagementFormState: ManagementFormState = {
  status: "idle"
};
