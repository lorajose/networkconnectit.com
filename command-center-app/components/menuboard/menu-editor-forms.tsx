"use client";

import { useFormState } from "react-dom";

import { FieldError } from "@/components/management/field-error";
import { FormMessage } from "@/components/management/form-message";
import { SubmitButton } from "@/components/management/submit-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  initialManagementFormState,
  type ManagementFormState
} from "@/lib/management/form-state";

type StatefulAction = (
  state: ManagementFormState,
  payload: FormData
) => Promise<ManagementFormState>;

type SimpleAction = () => Promise<void>;

export function MenuSectionForm({
  action
}: {
  action: StatefulAction;
}) {
  const [state, formAction] = useFormState(action, initialManagementFormState);

  return (
    <form action={formAction} className="space-y-3 rounded-2xl border border-border/70 p-4">
      <FormMessage state={state} />
      <div className="space-y-2">
        <Label htmlFor="section-name">New section</Label>
        <Input
          id="section-name"
          name="name"
          placeholder="Hot Sandwiches"
        />
        <FieldError errors={state.fieldErrors?.name} />
      </div>
      <SubmitButton label="Add section" />
    </form>
  );
}

export function MenuItemForm({
  action,
  sections
}: {
  action: StatefulAction;
  sections: Array<{ id: string; name: string }>;
}) {
  const [state, formAction] = useFormState(action, initialManagementFormState);

  return (
    <form action={formAction} className="space-y-4 rounded-2xl border border-border/70 p-4">
      <FormMessage state={state} />

      <div className="space-y-2">
        <Label htmlFor="item-section">Section</Label>
        <Select
          id="item-section"
          name="sectionId"
          defaultValue={sections[0]?.id ?? ""}
        >
          {sections.map((section) => (
            <option key={section.id} value={section.id}>
              {section.name}
            </option>
          ))}
        </Select>
        <FieldError errors={state.fieldErrors?.sectionId} />
      </div>

      <div className="grid gap-4 sm:grid-cols-[1fr_160px]">
        <div className="space-y-2">
          <Label htmlFor="item-name">Item name</Label>
          <Input
            id="item-name"
            name="name"
            placeholder="Bacon Egg & Cheese"
          />
          <FieldError errors={state.fieldErrors?.name} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="item-price">Price</Label>
          <Input
            id="item-price"
            name="price"
            inputMode="decimal"
            placeholder="5.99"
          />
          <FieldError errors={state.fieldErrors?.price} />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="item-description">Description</Label>
        <Textarea
          id="item-description"
          name="description"
          placeholder="Optional short description"
        />
        <FieldError errors={state.fieldErrors?.description} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="item-image">Image URL</Label>
        <Input
          id="item-image"
          name="imageUrl"
          type="url"
          placeholder="https://..."
        />
        <FieldError errors={state.fieldErrors?.imageUrl} />
      </div>

      <SubmitButton
        label="Add item"
        disabled={sections.length === 0}
      />
    </form>
  );
}

export function QuickPriceForm({
  action,
  defaultValue
}: {
  action: StatefulAction;
  defaultValue: string;
}) {
  const [state, formAction] = useFormState(action, initialManagementFormState);

  return (
    <form action={formAction} className="flex flex-wrap items-end gap-2">
      <div className="min-w-[120px] flex-1 space-y-1">
        <Label className="text-xs">Price</Label>
        <Input
          name="price"
          inputMode="decimal"
          defaultValue={defaultValue}
          className="h-9"
        />
        <FieldError errors={state.fieldErrors?.price} />
      </div>
      <SubmitButton label="Save price" />
      {state.status === "error" && state.message ? (
        <p className="w-full text-xs text-rose-300">{state.message}</p>
      ) : null}
    </form>
  );
}

export function MenuItemActions({
  availabilityAction,
  duplicateAction,
  moveUpAction,
  moveDownAction,
  isAvailable
}: {
  availabilityAction: SimpleAction;
  duplicateAction: SimpleAction;
  moveUpAction: SimpleAction;
  moveDownAction: SimpleAction;
  isAvailable: boolean;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      <form action={availabilityAction}>
        <Button type="submit" size="sm" variant="outline">
          {isAvailable ? "Hide item" : "Show item"}
        </Button>
      </form>
      <form action={duplicateAction}>
        <Button type="submit" size="sm" variant="ghost">
          Duplicate
        </Button>
      </form>
      <form action={moveUpAction}>
        <Button type="submit" size="sm" variant="ghost">
          ↑
        </Button>
      </form>
      <form action={moveDownAction}>
        <Button type="submit" size="sm" variant="ghost">
          ↓
        </Button>
      </form>
    </div>
  );
}
