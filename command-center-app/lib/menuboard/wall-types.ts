export const MENU_BOARD_WALL_ZONE_COUNT = 3 as const;

export const MENU_BOARD_WALL_ZONE_ROLES = [
  "MENU_PRIMARY",
  "MENU_SECONDARY",
  "PROMOTION",
] as const;

export type MenuBoardWallZoneRole =
  (typeof MENU_BOARD_WALL_ZONE_ROLES)[number];

export type MenuBoardWallZoneContentType = "MENU" | "PROMOTION";

export type MenuBoardWallMenuContent = {
  contentType: "MENU";
  publishId: string;
  version: number;
  payloadHash: string;
  payload: unknown;
};

export type MenuBoardPromotionSlide = {
  id: string;
  headline: string;
  body?: string | null;
  offerText?: string | null;
  mediaUrl?: string | null;
  durationSeconds: number;
};

export type MenuBoardPromotionPublishPayload = {
  schemaVersion: 1;
  campaignId: string;
  campaignName: string;
  slides: MenuBoardPromotionSlide[];
};

export type MenuBoardWallPromotionContent = {
  contentType: "PROMOTION";
  publishId: string;
  version: number;
  payloadHash: string;
  slides: MenuBoardPromotionSlide[];
};

export function isMenuBoardPromotionPublishPayload(
  value: unknown,
): value is MenuBoardPromotionPublishPayload {
  if (!value || typeof value !== "object") return false;

  const payload = value as Partial<MenuBoardPromotionPublishPayload>;
  if (payload.schemaVersion !== 1) return false;
  if (typeof payload.campaignId !== "string" || payload.campaignId.length === 0) {
    return false;
  }
  if (
    typeof payload.campaignName !== "string" ||
    payload.campaignName.length === 0
  ) {
    return false;
  }
  if (!Array.isArray(payload.slides) || payload.slides.length === 0) {
    return false;
  }

  return payload.slides.every(
    (slide) =>
      Boolean(slide) &&
      typeof slide.id === "string" &&
      slide.id.length > 0 &&
      typeof slide.headline === "string" &&
      slide.headline.length > 0 &&
      (slide.body == null || typeof slide.body === "string") &&
      (slide.offerText == null || typeof slide.offerText === "string") &&
      (slide.mediaUrl == null || typeof slide.mediaUrl === "string") &&
      Number.isSafeInteger(slide.durationSeconds) &&
      slide.durationSeconds >= 3 &&
      slide.durationSeconds <= 120,
  );
}

export type MenuBoardWallZoneManifest = {
  position: 1 | 2 | 3;
  role: MenuBoardWallZoneRole;
  content: MenuBoardWallMenuContent | MenuBoardWallPromotionContent;
};

export type MenuBoardWallManifest = {
  schemaVersion: 1;
  displayGroup: {
    id: string;
    name: string;
  };
  zones: [
    MenuBoardWallZoneManifest,
    MenuBoardWallZoneManifest,
    MenuBoardWallZoneManifest,
  ];
};

export function expectedContentTypeForRole(
  role: MenuBoardWallZoneRole,
): MenuBoardWallZoneContentType {
  return role === "PROMOTION" ? "PROMOTION" : "MENU";
}

export function isMenuBoardWallManifest(
  value: unknown,
): value is MenuBoardWallManifest {
  if (!value || typeof value !== "object") return false;

  const candidate = value as Partial<MenuBoardWallManifest>;
  if (candidate.schemaVersion !== 1) return false;
  if (!candidate.displayGroup || typeof candidate.displayGroup !== "object") {
    return false;
  }

  const group = candidate.displayGroup as { id?: unknown; name?: unknown };
  if (typeof group.id !== "string" || group.id.length === 0) return false;
  if (typeof group.name !== "string" || group.name.length === 0) return false;

  if (!Array.isArray(candidate.zones) || candidate.zones.length !== 3) {
    return false;
  }

  const positions = new Set<number>();
  const roles = new Set<string>();

  for (const rawZone of candidate.zones) {
    if (!rawZone || typeof rawZone !== "object") return false;
    const zone = rawZone as MenuBoardWallZoneManifest;

    if (![1, 2, 3].includes(zone.position)) return false;
    if (positions.has(zone.position)) return false;
    positions.add(zone.position);

    if (!MENU_BOARD_WALL_ZONE_ROLES.includes(zone.role)) return false;
    if (roles.has(zone.role)) return false;
    roles.add(zone.role);

    if (!zone.content || typeof zone.content !== "object") return false;
    if (zone.content.contentType !== expectedContentTypeForRole(zone.role)) {
      return false;
    }

    if (
      typeof zone.content.publishId !== "string" ||
      zone.content.publishId.length === 0 ||
      !Number.isSafeInteger(zone.content.version) ||
      zone.content.version < 1 ||
      typeof zone.content.payloadHash !== "string" ||
      !/^[a-f0-9]{64}$/i.test(zone.content.payloadHash)
    ) {
      return false;
    }

    if (zone.content.contentType === "PROMOTION") {
      if (!Array.isArray(zone.content.slides) || zone.content.slides.length === 0) {
        return false;
      }
      if (
        zone.content.slides.some(
          (slide) =>
            !slide ||
            typeof slide.id !== "string" ||
            typeof slide.headline !== "string" ||
            !Number.isSafeInteger(slide.durationSeconds) ||
            slide.durationSeconds < 3 ||
            slide.durationSeconds > 120,
        )
      ) {
        return false;
      }
    }
  }

  return (
    roles.has("MENU_PRIMARY") &&
    roles.has("MENU_SECONDARY") &&
    roles.has("PROMOTION")
  );
}


function canonicalizeWallJson(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(canonicalizeWallJson);
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, nested]) => [key, canonicalizeWallJson(nested)]),
    );
  }

  return value;
}

export function serializeMenuBoardPromotionPublishPayload(
  payload: MenuBoardPromotionPublishPayload,
) {
  return JSON.stringify(canonicalizeWallJson(payload));
}
