// Shared types, constants, and pure helpers for the vault.
// Mirrors the prototype's behavior so the port stays faithful.

export type ItemType = "idea" | "context" | "reference" | "profile";
export type Format = "reel" | "static" | "carousel";

export type Source = { label: string; url: string };

export type VaultItem = {
  id: string;
  type: ItemType;
  title: string | null;
  link: string | null;
  account: string | null;
  business: string | null;
  context: string | null;
  tags: string[];
  format: Format | null;
  images: string[];
  sources: Source[];
  useful: boolean | null;
  createdAt: number;
};

// Row as returned by Supabase (snake_case timestamps + jsonb sources).
export type VaultRow = {
  id: string;
  user_id: string;
  type: ItemType;
  title: string | null;
  link: string | null;
  account: string | null;
  business: string | null;
  context: string | null;
  tags: string[] | null;
  format: Format | null;
  images: string[] | null;
  sources: unknown;
  useful: boolean | null;
  created_at: string;
  updated_at: string;
};

export function rowToItem(r: VaultRow): VaultItem {
  return {
    id: r.id,
    type: r.type,
    title: r.title,
    link: r.link,
    account: r.account,
    business: r.business,
    context: r.context,
    tags: r.tags ?? [],
    format: r.format,
    images: r.images ?? [],
    sources: normalizeSources(r.sources),
    useful: r.useful,
    createdAt: new Date(r.created_at).getTime(),
  };
}

function normalizeSources(s: unknown): Source[] {
  if (!Array.isArray(s)) return [];
  return s
    .map((x) => (typeof x === "string" ? { url: x, label: "" } : (x as Source)))
    .filter((x) => x && typeof x.url === "string" && x.url.length > 0);
}

// ---------- constants (kept identical to the prototype) ----------
export const DEFAULT_ACCOUNTS = ["@theaigirlhere", "Myself", "Allianza Biz", "Client"];
export const DEFAULT_BUSINESSES = ["Allianza Biz", "RojaFume", "KomalFi", "Aim Funnels", "Personal brand"];

export const TABS: { key: ItemType; label: string; blurb: string; dot: string }[] = [
  { key: "idea", label: "Content Ideas", blurb: "Formats & types I can create", dot: "#d4a373" },
  { key: "context", label: "Context Library", blurb: "Knowledge saved to look up later", dot: "#8a9bd4" },
  { key: "reference", label: "Saved References", blurb: "IG posts to reuse / repurpose", dot: "#7a8b6f" },
  { key: "profile", label: "Profiles", blurb: "Creators I admire & study", dot: "#c98bb9" },
];
export const TAB_META: Record<ItemType, (typeof TABS)[number]> = Object.fromEntries(
  TABS.map((t) => [t.key, t])
) as Record<ItemType, (typeof TABS)[number]>;

export const FORMAT_LABELS: Record<Format, string> = {
  reel: "Reel",
  static: "Static post",
  carousel: "Carousel",
};

export const COLORS = {
  bg: "#1a1714",
  panel: "#221e1a",
  panel2: "#2a2521",
  line: "#39322c",
  text: "#ece5dc",
  dim: "#9c9088",
  accent: "#d4a373",
  green: "#7a8b6f",
  blue: "#8a9bd4",
  red: "#b56b5a",
} as const;

export const FONT_SERIF = `"Georgia", "Iowan Old Style", serif`;
export const FONT_SANS = `"Helvetica Neue", "Inter", system-ui, sans-serif`;

// ---------- pure helpers ----------
export function igEmbedSrc(url: string | null | undefined): string | null {
  if (!url) return null;
  const m = url.match(/instagram\.com\/(p|reel|tv)\/([A-Za-z0-9_-]+)/);
  if (!m) return null;
  return `https://www.instagram.com/${m[1]}/${m[2]}/embed`;
}

export function igHandle(url: string | null | undefined): string | null {
  if (!url) return null;
  const m = url.match(/instagram\.com\/([A-Za-z0-9_.]+)/);
  if (!m) return null;
  const h = m[1];
  if (["p", "reel", "reels", "tv", "stories", "explore"].includes(h)) return null;
  return "@" + h;
}

export function itemImages(i: Pick<VaultItem, "images">): string[] {
  return Array.isArray(i.images) ? i.images : [];
}

export function itemSources(i: Pick<VaultItem, "sources" | "link">): Source[] {
  if (Array.isArray(i.sources) && i.sources.length) return i.sources;
  if (i.link) return [{ url: i.link, label: "Open original" }];
  return [];
}

export function itemFormat(i: Pick<VaultItem, "format" | "link" | "images">): Format {
  if (i.format) return i.format;
  if (i.link && /instagram\.com\/(reel|tv)\//.test(i.link)) return "reel";
  if (itemImages(i).length > 1) return "carousel";
  return "static";
}
