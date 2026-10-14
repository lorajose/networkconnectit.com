"use client";

import { useFormState } from "react-dom";

import type { ManagementFormState } from "@/lib/management/form-state";
import { Button } from "@/components/ui/button";

const initialState: ManagementFormState = { status: "idle" };

type MenuOption = { id: string; name: string };
type CampaignOption = { id: string; name: string; slides: { id: string }[]; publishes: { version: number }[] };

type Action = (state: ManagementFormState, payload: FormData) => Promise<ManagementFormState>;

function Feedback({ state }: { state: ManagementFormState }) {
  return state.message ? <p className={`mt-2 text-xs ${state.status === "error" ? "text-rose-300" : "text-muted-foreground"}`}>{state.message}</p> : null;
}

function MenuZoneControl({ displayGroupId, role, label, menus, currentMenuId, action }: { displayGroupId: string; role: "MENU_PRIMARY" | "MENU_SECONDARY"; label: string; menus: MenuOption[]; currentMenuId?: string | null; action: Action }) {
  const [state, formAction] = useFormState(action, initialState);
  return <form action={formAction} className="rounded-xl border border-border/60 p-3"><input type="hidden" name="displayGroupId" value={displayGroupId}/><input type="hidden" name="role" value={role}/><p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">{label}</p><div className="mt-2 flex gap-2"><select name="menuId" defaultValue={currentMenuId ?? ""} required className="h-9 min-w-0 flex-1 rounded-md border border-input bg-background px-2 text-sm"><option value="">Select menu</option>{menus.map((menu) => <option key={menu.id} value={menu.id}>{menu.name}</option>)}</select><Button type="submit" size="sm" variant="outline">Assign</Button></div><Feedback state={state}/></form>;
}

export function MenuBoardWallContentControls({ displayGroupId, organizationId, siteId, menus, campaigns, primaryMenuId, secondaryMenuId, promotionCampaignId, assignMenuAction, createPromotionAction, assignPromotionAction, addSlideAction, publishPromotionAction }: { displayGroupId: string; organizationId: string; siteId: string; menus: MenuOption[]; campaigns: CampaignOption[]; primaryMenuId?: string | null; secondaryMenuId?: string | null; promotionCampaignId?: string | null; assignMenuAction: Action; createPromotionAction: Action; assignPromotionAction: Action; addSlideAction: Action; publishPromotionAction: Action }) {
  const [createState, createAction] = useFormState(createPromotionAction, initialState);
  const [assignState, assignAction] = useFormState(assignPromotionAction, initialState);
  const [slideState, slideAction] = useFormState(addSlideAction, initialState);
  const [publishState, publishAction] = useFormState(publishPromotionAction, initialState);
  const selectedCampaign = campaigns.find((campaign) => campaign.id === promotionCampaignId) ?? null;
  return <div className="mt-4 space-y-3">
    <div className="grid gap-3 lg:grid-cols-2"><MenuZoneControl displayGroupId={displayGroupId} role="MENU_PRIMARY" label="TV1 · Menu Primary" menus={menus} currentMenuId={primaryMenuId} action={assignMenuAction}/><MenuZoneControl displayGroupId={displayGroupId} role="MENU_SECONDARY" label="TV2 · Menu Secondary" menus={menus} currentMenuId={secondaryMenuId} action={assignMenuAction}/></div>
    <div className="rounded-xl border border-border/60 p-3"><p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">TV3 · Promotions</p><form action={assignAction} className="mt-2 flex gap-2"><input type="hidden" name="displayGroupId" value={displayGroupId}/><select name="campaignId" defaultValue={promotionCampaignId ?? ""} required className="h-9 min-w-0 flex-1 rounded-md border border-input bg-background px-2 text-sm"><option value="">Select campaign</option>{campaigns.map((campaign) => <option key={campaign.id} value={campaign.id}>{campaign.name} · {campaign.slides.length} slides{campaign.publishes[0] ? ` · v${campaign.publishes[0].version}` : ""}</option>)}</select><Button type="submit" size="sm" variant="outline">Assign</Button></form><Feedback state={assignState}/>
    {!selectedCampaign ? <form action={createAction} className="mt-3 flex gap-2"><input type="hidden" name="organizationId" value={organizationId}/><input type="hidden" name="siteId" value={siteId}/><input type="hidden" name="displayGroupId" value={displayGroupId}/><input name="name" required maxLength={191} placeholder="Deli offers" className="h-9 min-w-0 flex-1 rounded-md border border-input bg-background px-2 text-sm"/><Button type="submit" size="sm">New campaign</Button><Feedback state={createState}/></form> : <div className="mt-3 space-y-3"><form action={slideAction} className="grid gap-2 md:grid-cols-2 xl:grid-cols-5"><input type="hidden" name="campaignId" value={selectedCampaign.id}/><input name="headline" required maxLength={191} placeholder="Headline" className="h-9 rounded-md border border-input bg-background px-2 text-sm"/><input name="offerText" maxLength={191} placeholder="$9.99 special" className="h-9 rounded-md border border-input bg-background px-2 text-sm"/><input name="mediaUrl" type="url" placeholder="Image URL (optional)" className="h-9 rounded-md border border-input bg-background px-2 text-sm"/><input name="durationSeconds" type="number" min={3} max={120} defaultValue={10} className="h-9 rounded-md border border-input bg-background px-2 text-sm"/><Button type="submit" size="sm" variant="outline">Add slide</Button><textarea name="body" maxLength={512} placeholder="Supporting text (optional)" className="min-h-16 rounded-md border border-input bg-background p-2 text-sm md:col-span-2 xl:col-span-5"/><Feedback state={slideState}/></form><form action={publishAction} className="flex items-center justify-between gap-3"><input type="hidden" name="campaignId" value={selectedCampaign.id}/><p className="text-xs text-muted-foreground">{selectedCampaign.slides.length} slide(s) · {selectedCampaign.publishes[0] ? `Latest v${selectedCampaign.publishes[0].version}` : "Not published"}</p><Button type="submit" size="sm" disabled={selectedCampaign.slides.length === 0}>Publish TV3</Button></form><Feedback state={publishState}/></div>}
    </div>
  </div>;
}
