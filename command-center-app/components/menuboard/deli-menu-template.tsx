import { formatPriceFromCents } from "@/lib/menuboard/money";

type DeliMenuTemplateProps = {
  menu: {
    name: string;
    displayName?: string | null;
    logoUrl?: string | null;
    promotionTitle?: string | null;
    promotionText?: string | null;
    currency: string;
    sections: Array<{
      id: string;
      name: string;
      items: Array<{
        id: string;
        name: string;
        description?: string | null;
        priceCents: number;
        imageUrl?: string | null;
        isAvailable: boolean;
      }>;
    }>;
  };
  storeFallbackName?: string;
  className?: string;
};

function sectionColumns(sectionCount: number) {
  if (sectionCount <= 1) {
    return "grid-cols-1";
  }

  if (sectionCount === 2) {
    return "grid-cols-2";
  }

  return "grid-cols-3";
}

export function DeliMenuTemplate({
  menu,
  storeFallbackName,
  className = ""
}: DeliMenuTemplateProps) {
  const visibleSections = menu.sections
    .map((section) => ({
      ...section,
      items: section.items.filter((item) => item.isAvailable)
    }))
    .filter((section) => section.items.length > 0);

  const storeName =
    menu.displayName?.trim() ||
    storeFallbackName?.trim() ||
    menu.name;

  return (
    <div
      className={`relative aspect-video w-full overflow-hidden rounded-[1.6rem] bg-zinc-950 text-white shadow-2xl ${className}`}
      data-menuboard-template="DELI_LANDSCAPE_V1"
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.08),transparent_35%)]" />

      <div className="relative flex h-full flex-col p-[3.2%]">
        <header className="flex min-h-[12%] items-center justify-between gap-[3%] border-b border-white/15 pb-[2.2%]">
          <div className="flex min-w-0 items-center gap-[2.4%]">
            {menu.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={menu.logoUrl}
                alt=""
                className="h-[4.8vw] max-h-[78px] min-h-[38px] w-[4.8vw] min-w-[38px] max-w-[78px] rounded-2xl object-contain bg-white p-[0.4vw]"
              />
            ) : (
              <div className="flex h-[4.8vw] max-h-[78px] min-h-[38px] w-[4.8vw] min-w-[38px] max-w-[78px] items-center justify-center rounded-2xl bg-white text-[clamp(0.9rem,1.4vw,1.8rem)] font-black text-zinc-950">
                {storeName.slice(0, 2).toUpperCase()}
              </div>
            )}

            <div className="min-w-0">
              <p className="truncate text-[clamp(1.6rem,3.3vw,4.5rem)] font-black uppercase leading-none tracking-[-0.03em]">
                {storeName}
              </p>
              <p className="mt-[0.45vw] text-[clamp(0.62rem,1vw,1.35rem)] font-medium uppercase tracking-[0.22em] text-zinc-400">
                Fresh · Fast · Made to order
              </p>
            </div>
          </div>

          <div className="shrink-0 rounded-full border border-white/15 bg-white/5 px-[1.5vw] py-[0.7vw] text-[clamp(0.55rem,0.8vw,1rem)] font-semibold uppercase tracking-[0.18em] text-zinc-300">
            Digital Menu
          </div>
        </header>

        <main
          className={`mt-[2.2%] grid min-h-0 flex-1 gap-[2.2%] ${sectionColumns(
            visibleSections.length
          )}`}
        >
          {visibleSections.length === 0 ? (
            <div className="col-span-full flex items-center justify-center rounded-3xl border border-dashed border-white/20 bg-white/[0.03] text-center text-[clamp(0.8rem,1.3vw,1.6rem)] text-zinc-400">
              Add visible products to preview this menu.
            </div>
          ) : (
            visibleSections.map((section) => (
              <section
                key={section.id}
                className="min-w-0 overflow-hidden rounded-[1.2rem] border border-white/10 bg-white/[0.045] p-[1.5vw]"
              >
                <h2 className="truncate text-[clamp(1rem,1.8vw,2.4rem)] font-extrabold uppercase tracking-[0.04em] text-amber-300">
                  {section.name}
                </h2>

                <div className="mt-[0.9vw] space-y-[0.72vw]">
                  {section.items.map((item) => (
                    <div
                      key={item.id}
                      className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-start gap-[1vw]"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-[clamp(0.75rem,1.25vw,1.72rem)] font-bold leading-tight">
                          {item.name}
                        </p>
                        {item.description ? (
                          <p className="mt-[0.12vw] truncate text-[clamp(0.48rem,0.7vw,0.95rem)] leading-tight text-zinc-400">
                            {item.description}
                          </p>
                        ) : null}
                      </div>
                      <p className="whitespace-nowrap text-[clamp(0.8rem,1.32vw,1.8rem)] font-black tabular-nums">
                        {formatPriceFromCents(
                          item.priceCents,
                          menu.currency
                        )}
                      </p>
                    </div>
                  ))}
                </div>
              </section>
            ))
          )}
        </main>

        {menu.promotionTitle || menu.promotionText ? (
          <footer className="mt-[2.1%] grid min-h-[10%] grid-cols-[auto_minmax(0,1fr)] items-center gap-[1.3vw] rounded-[1.1rem] bg-amber-300 px-[1.7vw] py-[0.9vw] text-zinc-950">
            <p className="whitespace-nowrap text-[clamp(0.75rem,1.35vw,1.8rem)] font-black uppercase tracking-[0.04em]">
              {menu.promotionTitle || "Today’s Special"}
            </p>
            <p className="truncate text-right text-[clamp(0.6rem,0.95vw,1.2rem)] font-semibold">
              {menu.promotionText}
            </p>
          </footer>
        ) : null}
      </div>
    </div>
  );
}
