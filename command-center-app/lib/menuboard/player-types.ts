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
    organizationId: string;
    siteId: string;
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
