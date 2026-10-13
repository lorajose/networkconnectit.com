export type MenuBoardPublishPayload = {
  schemaVersion: 1;
  templateKey: string;
  menuId: string;
  menuName: string;
  storeDisplayName: string | null;
  logoUrl: string | null;
  promotionTitle: string | null;
  promotionText: string | null;
  currency: string;
  sections: Array<{
    id: string;
    name: string;
    items: Array<{
      id: string;
      name: string;
      description: string | null;
      priceCents: number;
      imageUrl: string | null;
    }>;
  }>;
};

export type MenuBoardPlayerContent = {
  screen: {
    id: string;
    name: string;
    orientation: "LANDSCAPE" | "PORTRAIT";
    widthPx: number;
    heightPx: number;
    status: string;
  };
  menuId: string | null;
  activePublish: {
    id: string;
    version: number;
    payload: MenuBoardPublishPayload;
    payloadHash: string;
    publishedAt: string;
  } | null;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNullableString(value: unknown) {
  return value === null || typeof value === "string";
}

export function isMenuBoardPublishPayload(
  value: unknown
): value is MenuBoardPublishPayload {
  if (!isRecord(value)) {
    return false;
  }

  if (
    value.schemaVersion !== 1 ||
    typeof value.templateKey !== "string" ||
    typeof value.menuId !== "string" ||
    typeof value.menuName !== "string" ||
    !isNullableString(value.storeDisplayName) ||
    !isNullableString(value.logoUrl) ||
    !isNullableString(value.promotionTitle) ||
    !isNullableString(value.promotionText) ||
    typeof value.currency !== "string" ||
    value.currency.length !== 3 ||
    !Array.isArray(value.sections) ||
    value.sections.length > 12
  ) {
    return false;
  }

  return value.sections.every((section) => {
    if (
      !isRecord(section) ||
      typeof section.id !== "string" ||
      typeof section.name !== "string" ||
      !Array.isArray(section.items) ||
      section.items.length > 100
    ) {
      return false;
    }

    return section.items.every(
      (item) =>
        isRecord(item) &&
        typeof item.id === "string" &&
        typeof item.name === "string" &&
        isNullableString(item.description) &&
        typeof item.priceCents === "number" &&
        Number.isSafeInteger(item.priceCents) &&
        item.priceCents >= 0 &&
        isNullableString(item.imageUrl)
    );
  });
}

export function isMenuBoardPlayerContent(
  value: unknown
): value is MenuBoardPlayerContent {
  if (!isRecord(value) || !isRecord(value.screen)) {
    return false;
  }

  const { screen } = value;
  if (
    typeof screen.id !== "string" ||
    typeof screen.name !== "string" ||
    (screen.orientation !== "LANDSCAPE" &&
      screen.orientation !== "PORTRAIT") ||
    typeof screen.widthPx !== "number" ||
    !Number.isInteger(screen.widthPx) ||
    typeof screen.heightPx !== "number" ||
    !Number.isInteger(screen.heightPx) ||
    typeof screen.status !== "string" ||
    !isNullableString(value.menuId)
  ) {
    return false;
  }

  if (value.activePublish === null) {
    return true;
  }

  if (!isRecord(value.activePublish)) {
    return false;
  }

  return (
    typeof value.activePublish.id === "string" &&
    typeof value.activePublish.version === "number" &&
    Number.isInteger(value.activePublish.version) &&
    value.activePublish.version >= 1 &&
    typeof value.activePublish.payloadHash === "string" &&
    /^[a-f0-9]{64}$/.test(value.activePublish.payloadHash) &&
    typeof value.activePublish.publishedAt === "string" &&
    isMenuBoardPublishPayload(value.activePublish.payload)
  );
}
