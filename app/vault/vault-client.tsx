"use client";

import { useMemo, useRef, useState, useTransition, type CSSProperties } from "react";
import { logout } from "@/app/login/actions";
import {
  createItem,
  updateItem,
  deleteItem,
  toggleUseful,
  uploadImages,
} from "./actions";
import {
  COLORS as C,
  DEFAULT_BUSINESSES,
  FONT_SANS,
  FONT_SERIF,
  FORMAT_LABELS,
  TABS,
  TAB_META,
  igEmbedSrc,
  igHandle,
  itemFormat,
  itemImages,
  itemSources,
  type Format,
  type ItemType,
  type Source,
  type VaultItem,
} from "@/lib/vault/types";

type Props = {
  items: VaultItem[];
  accounts: string[];
  userName: string;
};

export default function VaultClient({ items: initialItems, accounts: initialAccounts, userName }: Props) {
  const [items, setItems] = useState<VaultItem[]>(initialItems);
  const [accounts, setAccounts] = useState<string[]>(initialAccounts);

  const [activeTab, setActiveTab] = useState<ItemType>("idea");
  const [search, setSearch] = useState("");
  const [accountFilter, setAccountFilter] = useState("all");
  const [businessFilter, setBusinessFilter] = useState("all");
  const [usefulFilter, setUsefulFilter] = useState("all");
  const [formatFilter, setFormatFilter] = useState<"all" | Format>("all");
  const [editing, setEditing] = useState<VaultItem | null>(null);
  const [showForm, setShowForm] = useState(false);

  // ---------- derived ----------
  const allTags = useMemo(() => {
    const s = new Set<string>();
    items.filter((i) => i.type === activeTab).forEach((i) => (i.tags || []).forEach((t) => s.add(t)));
    return [...s].sort();
  }, [items, activeTab]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((i) => {
      if (i.type !== activeTab) return false;
      if (accountFilter !== "all" && i.account !== accountFilter) return false;
      if (businessFilter !== "all" && i.business !== businessFilter) return false;
      if (usefulFilter === "useful" && i.useful !== true) return false;
      if (usefulFilter === "notuseful" && i.useful !== false) return false;
      if (usefulFilter === "unrated" && i.useful !== null && i.useful !== undefined) return false;
      if (activeTab === "reference" && formatFilter !== "all" && itemFormat(i) !== formatFilter) return false;
      if (q) {
        const hay = [i.title, i.context, i.link, i.account, ...(i.tags || [])].join(" ").toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [items, search, activeTab, accountFilter, businessFilter, usefulFilter, formatFilter]);

  const counts = useMemo(
    () => ({
      idea: items.filter((i) => i.type === "idea").length,
      context: items.filter((i) => i.type === "context").length,
      reference: items.filter((i) => i.type === "reference").length,
      profile: items.filter((i) => i.type === "profile").length,
    }),
    [items],
  );

  // ---------- mutations (optimistic + persist) ----------
  function handlePatch(id: string, patch: Partial<VaultItem>) {
    setItems((p) => p.map((i) => (i.id === id ? { ...i, ...patch } : i)));
    if ("useful" in patch) {
      void toggleUseful(id, patch.useful ?? null);
    }
  }

  function handleDelete(id: string) {
    if (!confirm("Delete this item?")) return;
    setItems((p) => p.filter((i) => i.id !== id));
    void deleteItem(id);
  }

  function handleSave(saved: VaultItem, isNew: boolean) {
    if (isNew) {
      setItems((p) => [saved, ...p]);
    } else {
      setItems((p) => p.map((i) => (i.id === saved.id ? saved : i)));
    }
    if (saved.account && !accounts.includes(saved.account)) {
      setAccounts((p) => [...p, saved.account!]);
    }
    setShowForm(false);
    setEditing(null);
  }

  function addAccount(name: string) {
    const v = name.trim();
    if (v && !accounts.includes(v)) setAccounts((p) => [...p, v]);
  }

  function exportData() {
    const payload = { version: 2, exportedAt: new Date().toISOString(), accounts, items };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `content-vault-backup-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  const tabColor = TAB_META[activeTab].dot;

  return (
    <div style={{ background: C.bg, color: C.text, minHeight: "100vh", fontFamily: FONT_SANS, paddingBottom: 80 }}>
      {/* HEADER */}
      <header style={{ padding: "30px 28px 0", borderBottom: `1px solid ${C.line}`, position: "relative", overflow: "hidden" }}>
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: `radial-gradient(600px 200px at 85% -50%, ${tabColor}22, transparent)`,
            pointerEvents: "none",
            transition: "background .4s",
          }}
        />
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 16 }}>
          <div>
            <div style={{ fontSize: 11, letterSpacing: 3, color: C.accent, textTransform: "uppercase", marginBottom: 6 }}>
              Personal Content Command Center
            </div>
            <h1 style={{ margin: 0, fontFamily: FONT_SERIF, fontSize: 38, fontWeight: 400, letterSpacing: -0.5 }}>
              The Content Vault
            </h1>
            <div style={{ marginTop: 6, fontSize: 12.5, color: C.dim }}>Signed in as {userName}</div>
          </div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button onClick={exportData} style={btnGhost}>↓ Export</button>
            <form action={logout}>
              <button type="submit" style={btnGhost}>Log out</button>
            </form>
            <button
              onClick={() => {
                setEditing(null);
                setShowForm(true);
              }}
              style={{ background: C.accent, color: "#1a1714", border: "none", padding: "12px 22px", borderRadius: 2, fontWeight: 600, cursor: "pointer", fontSize: 14 }}
            >
              + Add to Vault
            </button>
          </div>
        </div>

        {/* TABS */}
        <div style={{ display: "flex", gap: 4, marginTop: 26, flexWrap: "wrap" }}>
          {TABS.map((t) => {
            const on = activeTab === t.key;
            return (
              <button
                key={t.key}
                onClick={() => {
                  setActiveTab(t.key);
                  setSearch("");
                }}
                style={{ background: "none", border: "none", cursor: "pointer", padding: "12px 18px 16px", textAlign: "left", borderBottom: `2px solid ${on ? t.dot : "transparent"}`, marginBottom: -1 }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ width: 8, height: 8, borderRadius: 9, background: t.dot, opacity: on ? 1 : 0.4 }} />
                  <span style={{ fontFamily: FONT_SERIF, fontSize: 17, color: on ? C.text : C.dim }}>{t.label}</span>
                  <span style={{ fontSize: 12, color: C.dim }}>({counts[t.key]})</span>
                </div>
                <div style={{ fontSize: 11.5, color: C.dim, marginTop: 3, paddingLeft: 16, maxWidth: 200 }}>{t.blurb}</div>
              </button>
            );
          })}
        </div>
      </header>

      {/* CONTROLS */}
      <div style={{ padding: "18px 28px", display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center", borderBottom: `1px solid ${C.line}` }}>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={`Search ${TAB_META[activeTab].label.toLowerCase()}…`}
          style={{ flex: "1 1 260px", background: C.panel, border: `1px solid ${C.line}`, color: C.text, padding: "10px 14px", borderRadius: 2, fontSize: 14, outline: "none", fontFamily: FONT_SANS }}
        />
        <Select value={accountFilter} onChange={setAccountFilter} opts={[["all", "All accounts/IDs"], ...accounts.map((a) => [a, a] as [string, string])]} />
        <Select
          value={businessFilter}
          onChange={setBusinessFilter}
          opts={[["all", "All businesses"], ...Array.from(new Set([...DEFAULT_BUSINESSES, ...items.map((i) => i.business).filter((b): b is string => !!b)])).map((b) => [b, b] as [string, string])]}
        />
        <Select
          value={usefulFilter}
          onChange={setUsefulFilter}
          opts={[
            ["all", "Any rating"],
            ["useful", "Useful"],
            ["notuseful", "Not useful"],
            ["unrated", "Unrated"],
          ]}
        />
      </div>

      {/* FORMAT FILTER — references only */}
      {activeTab === "reference" && (
        <div style={{ padding: "14px 28px 4px", display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <span style={{ fontSize: 11, letterSpacing: 1, textTransform: "uppercase", color: C.dim, marginRight: 4 }}>Format</span>
          {(
            [
              ["all", "All"],
              ["reel", "Reels"],
              ["static", "Static posts"],
              ["carousel", "Carousels"],
            ] as const
          ).map(([v, l]) => {
            const on = formatFilter === v;
            return (
              <button
                key={v}
                onClick={() => setFormatFilter(v as "all" | Format)}
                style={{ background: on ? tabColor : "transparent", color: on ? "#1a1714" : C.dim, border: `1px solid ${on ? tabColor : C.line}`, padding: "6px 14px", borderRadius: 3, fontSize: 12.5, cursor: "pointer", fontWeight: on ? 600 : 400 }}
              >
                {l}
              </button>
            );
          })}
        </div>
      )}

      {/* TAGS */}
      {allTags.length > 0 && (
        <div style={{ padding: "12px 28px", display: "flex", gap: 8, flexWrap: "wrap", borderBottom: `1px solid ${C.line}` }}>
          {allTags.map((t) => (
            <button
              key={t}
              onClick={() => setSearch(search === t ? "" : t)}
              style={{ background: search === t ? tabColor : C.panel2, color: search === t ? "#1a1714" : C.dim, border: `1px solid ${C.line}`, padding: "4px 10px", borderRadius: 20, fontSize: 12, cursor: "pointer" }}
            >
              #{t}
            </button>
          ))}
        </div>
      )}

      {/* GRID */}
      <div
        style={{
          padding: "24px 28px",
          display: "grid",
          gridTemplateColumns: activeTab === "reference" ? "repeat(auto-fill, minmax(340px, 1fr))" : "repeat(auto-fill, minmax(320px, 1fr))",
          gap: 18,
          alignItems: "start",
        }}
      >
        {filtered.length === 0 && <EmptyState tab={activeTab} hasAny={counts[activeTab] > 0} />}
        {filtered.map((item) => (
          <Card
            key={item.id}
            item={item}
            onEdit={() => {
              setEditing(item);
              setShowForm(true);
            }}
            onDelete={() => handleDelete(item.id)}
            onPatch={(p) => handlePatch(item.id, p)}
          />
        ))}
      </div>

      {showForm && (
        <ItemForm
          accounts={accounts}
          existing={editing}
          defaultType={activeTab}
          onAddAccount={addAccount}
          onClose={() => {
            setShowForm(false);
            setEditing(null);
          }}
          onSaved={handleSave}
        />
      )}
    </div>
  );
}

// ---------- subcomponents ----------

function EmptyState({ tab, hasAny }: { tab: ItemType; hasAny: boolean }) {
  const msg = hasAny
    ? "Nothing matches these filters."
    : tab === "idea"
    ? "No content ideas yet. Add a format or type you want to create."
    : tab === "context"
    ? "No saved knowledge yet. Drop in things you want to look up later."
    : tab === "profile"
    ? "No profiles yet. Save creators whose style you admire and want to study."
    : "No saved references yet. Save Instagram posts here to reuse and repurpose.";
  return (
    <div style={{ gridColumn: "1/-1", textAlign: "center", color: C.dim, padding: "60px 0", fontFamily: FONT_SERIF, fontSize: 18 }}>
      {msg}
    </div>
  );
}

function Select({
  value,
  onChange,
  opts,
}: {
  value: string;
  onChange: (v: string) => void;
  opts: [string, string][];
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      style={{ background: "#221e1a", color: "#ece5dc", border: `1px solid ${C.line}`, padding: "10px 12px", borderRadius: 2, fontSize: 13, cursor: "pointer", outline: "none" }}
    >
      {opts.map(([v, l]) => (
        <option key={v} value={v} style={{ background: "#221e1a" }}>
          {l}
        </option>
      ))}
    </select>
  );
}

function IgEmbed({ url, images, format }: { url: string | null; images: string[]; format: Format | null }) {
  const m = url ? url.match(/instagram\.com\/(p|reel|tv)\/([A-Za-z0-9_-]+)/) : null;
  const href = url || "#";
  const fmtLabel = format ? FORMAT_LABELS[format] : "Post";
  const [idx, setIdx] = useState(0);
  const scrollerRef = useRef<HTMLDivElement | null>(null);

  const onScroll = () => {
    const el = scrollerRef.current;
    if (!el) return;
    setIdx(Math.round(el.scrollLeft / el.clientWidth));
  };
  const goTo = (e: React.MouseEvent, n: number) => {
    e.preventDefault();
    e.stopPropagation();
    const el = scrollerRef.current;
    if (el) el.scrollTo({ left: n * el.clientWidth, behavior: "smooth" });
  };

  if (images && images.length) {
    const multi = images.length > 1;
    return (
      <div style={{ position: "relative", borderRadius: 6, overflow: "hidden", border: `1px solid ${C.line}`, background: "#000" }}>
        <div
          ref={scrollerRef}
          onScroll={onScroll}
          style={{ display: "flex", overflowX: "auto", scrollSnapType: "x mandatory", scrollbarWidth: "none" }}
        >
          {images.map((src, n) => (
            <a key={n} href={href} target="_blank" rel="noreferrer" style={{ flex: "0 0 100%", scrollSnapAlign: "start", lineHeight: 0 }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt={`Slide ${n + 1}`} style={{ width: "100%", display: "block" }} />
            </a>
          ))}
        </div>
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            height: 70,
            background: "linear-gradient(to top, rgba(0,0,0,.6), transparent)",
            pointerEvents: "none",
          }}
        />
        <a
          href={href}
          target="_blank"
          rel="noreferrer"
          style={{ position: "absolute", bottom: 10, left: 10, display: "inline-flex", alignItems: "center", gap: 6, background: C.accent, color: "#1a1714", padding: "6px 12px", borderRadius: 3, fontSize: 12, fontWeight: 600, textDecoration: "none" }}
        >
          ↗ Open on Instagram
        </a>
        <span style={{ position: "absolute", top: 10, left: 10, fontSize: 10, letterSpacing: 0.5, textTransform: "uppercase", color: "#fff", background: "#00000088", padding: "3px 8px", borderRadius: 10 }}>
          {fmtLabel}
        </span>
        <span style={{ position: "absolute", top: 10, right: 10, fontSize: 10, letterSpacing: 0.5, textTransform: "uppercase", color: "#fff", background: "#00000077", padding: "3px 7px", borderRadius: 10 }}>
          screenshot
        </span>
        {multi && (
          <>
            {idx > 0 && (
              <button onClick={(e) => goTo(e, idx - 1)} style={navBtn("left")}>
                ‹
              </button>
            )}
            {idx < images.length - 1 && (
              <button onClick={(e) => goTo(e, idx + 1)} style={navBtn("right")}>
                ›
              </button>
            )}
            <div style={{ position: "absolute", bottom: 12, left: 0, right: 0, display: "flex", justifyContent: "center", gap: 6, pointerEvents: "none" }}>
              {images.map((_, n) => (
                <span
                  key={n}
                  style={{ width: n === idx ? 18 : 6, height: 6, borderRadius: 6, background: n === idx ? "#fff" : "#ffffff88", transition: "width .2s" }}
                />
              ))}
            </div>
          </>
        )}
      </div>
    );
  }

  if (!m) return null;
  const kind = m[1] === "reel" ? "Reel" : m[1] === "tv" ? "IGTV" : "Post";
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      style={{ display: "block", textDecoration: "none", borderRadius: 6, overflow: "hidden", border: `1px solid ${C.line}`, background: "linear-gradient(135deg, #2a2521 0%, #221e1a 100%)" }}
    >
      <div style={{ padding: "26px 18px", display: "flex", flexDirection: "column", alignItems: "center", gap: 12, textAlign: "center" }}>
        <div
          style={{ width: 46, height: 46, borderRadius: 12, display: "grid", placeItems: "center", background: "linear-gradient(45deg, #f09433, #e6683c, #dc2743, #cc2366, #bc1888)" }}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2">
            <rect x="2" y="2" width="20" height="20" rx="5" />
            <circle cx="12" cy="12" r="4" />
            <circle cx="17.5" cy="6.5" r="1" fill="#fff" stroke="none" />
          </svg>
        </div>
        <div style={{ fontSize: 13, color: C.dim }}>Instagram {kind}</div>
        <span style={{ background: C.accent, color: "#1a1714", padding: "8px 18px", borderRadius: 3, fontSize: 13, fontWeight: 600 }}>
          ▶ Watch on Instagram
        </span>
      </div>
    </a>
  );
}

function navBtn(side: "left" | "right"): CSSProperties {
  return {
    position: "absolute",
    top: "50%",
    transform: "translateY(-50%)",
    [side]: 8,
    width: 30,
    height: 30,
    borderRadius: 30,
    border: "none",
    cursor: "pointer",
    background: "#000000aa",
    color: "#fff",
    fontSize: 18,
    lineHeight: "30px",
    padding: 0,
  };
}

function ProfileHeader({ handle, title, link }: { handle: string | null; title: string | null; link: string | null }) {
  const initial = (handle || "?").replace("@", "").charAt(0).toUpperCase();
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <div
          style={{ width: 56, height: 56, borderRadius: 56, flex: "0 0 auto", display: "grid", placeItems: "center", color: "#fff", fontFamily: FONT_SERIF, fontSize: 24, background: "linear-gradient(45deg, #f09433, #dc2743, #bc1888)" }}
        >
          {initial}
        </div>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontFamily: FONT_SERIF, fontSize: 21, lineHeight: 1.1 }}>{handle || "Profile"}</div>
          {title && handle && title !== handle && (
            <div style={{ fontSize: 12.5, color: C.dim, marginTop: 3 }}>{title}</div>
          )}
        </div>
      </div>
      {link && (
        <a
          href={link}
          target="_blank"
          rel="noreferrer"
          style={{ alignSelf: "flex-start", display: "inline-flex", alignItems: "center", gap: 6, background: C.accent, color: "#1a1714", padding: "8px 16px", borderRadius: 3, fontSize: 13, fontWeight: 600, textDecoration: "none" }}
        >
          ↗ View profile
        </a>
      )}
    </div>
  );
}

function ProfileShots({ images, link }: { images: string[]; link: string | null }) {
  const [idx, setIdx] = useState(0);
  const ref = useRef<HTMLDivElement | null>(null);
  const onScroll = () => {
    const el = ref.current;
    if (!el) return;
    setIdx(Math.round(el.scrollLeft / el.clientWidth));
  };
  const go = (e: React.MouseEvent, n: number) => {
    e.preventDefault();
    e.stopPropagation();
    const el = ref.current;
    if (el) el.scrollTo({ left: n * el.clientWidth, behavior: "smooth" });
  };
  const multi = images.length > 1;
  return (
    <div style={{ position: "relative", borderRadius: 6, overflow: "hidden", border: `1px solid ${C.line}`, background: "#000" }}>
      <div ref={ref} onScroll={onScroll} style={{ display: "flex", overflowX: "auto", scrollSnapType: "x mandatory", scrollbarWidth: "none" }}>
        {images.map((src, n) => (
          <a key={n} href={link || "#"} target="_blank" rel="noreferrer" style={{ flex: "0 0 100%", scrollSnapAlign: "start", lineHeight: 0 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={src} alt={`Profile shot ${n + 1}`} style={{ width: "100%", display: "block" }} />
          </a>
        ))}
      </div>
      {multi && (
        <>
          {idx > 0 && (
            <button onClick={(e) => go(e, idx - 1)} style={navBtn("left")}>
              ‹
            </button>
          )}
          {idx < images.length - 1 && (
            <button onClick={(e) => go(e, idx + 1)} style={navBtn("right")}>
              ›
            </button>
          )}
          <div style={{ position: "absolute", bottom: 10, left: 0, right: 0, display: "flex", justifyContent: "center", gap: 6, pointerEvents: "none" }}>
            {images.map((_, n) => (
              <span
                key={n}
                style={{ width: n === idx ? 18 : 6, height: 6, borderRadius: 6, background: n === idx ? "#fff" : "#ffffff88", transition: "width .2s" }}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function Card({
  item,
  onEdit,
  onDelete,
  onPatch,
}: {
  item: VaultItem;
  onEdit: () => void;
  onDelete: () => void;
  onPatch: (p: Partial<VaultItem>) => void;
}) {
  const meta = TAB_META[item.type] || TAB_META.idea;
  const isRef = item.type === "reference";
  const isProfile = item.type === "profile";
  const imgs = itemImages(item);
  const hasEmbed = isRef && (imgs.length > 0 || !!igEmbedSrc(item.link));
  const fmt = isRef ? itemFormat(item) : null;
  const handle = isProfile ? igHandle(item.link) : null;

  return (
    <div style={{ background: C.panel, border: `1px solid ${C.line}`, borderRadius: 4, padding: 18, display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 11, letterSpacing: 0.5, textTransform: "uppercase", color: C.dim }}>
          <span style={{ width: 7, height: 7, borderRadius: 9, background: meta.dot }} /> {meta.label}
          {isRef && fmt && <span style={{ color: C.dim, opacity: 0.7 }}>· {FORMAT_LABELS[fmt]}</span>}
        </span>
        <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {item.business && (
            <span style={{ fontSize: 10.5, color: C.blue, fontWeight: 600, border: `1px solid ${C.blue}55`, borderRadius: 10, padding: "2px 8px" }}>
              ◆ {item.business}
            </span>
          )}
          {item.account && <span style={{ fontSize: 11, color: C.accent, fontWeight: 600 }}>{item.account}</span>}
        </span>
      </div>

      {isProfile ? (
        <ProfileHeader handle={handle} title={item.title} link={item.link} />
      ) : (
        <h3 style={{ margin: 0, fontFamily: FONT_SERIF, fontWeight: 400, fontSize: 19, lineHeight: 1.25 }}>
          {item.title || "Untitled"}
        </h3>
      )}

      {isProfile && imgs.length > 0 && <ProfileShots images={imgs} link={item.link} />}

      {hasEmbed && <IgEmbed url={item.link} images={imgs} format={fmt} />}

      {item.context && (
        <p style={{ margin: 0, fontSize: 13.5, lineHeight: 1.55, color: C.dim, whiteSpace: "pre-wrap" }}>{item.context}</p>
      )}

      {item.tags && item.tags.length > 0 && (
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {item.tags.map((t) => (
            <span key={t} style={{ fontSize: 11, color: C.dim, background: C.panel2, padding: "2px 8px", borderRadius: 12 }}>
              #{t}
            </span>
          ))}
        </div>
      )}

      {!hasEmbed && !isProfile && (() => {
        const sources = itemSources(item);
        if (!sources.length) return null;
        if (sources.length === 1) {
          return (
            <a
              href={sources[0].url}
              target="_blank"
              rel="noreferrer"
              style={{ fontSize: 12.5, color: C.green, textDecoration: "none", wordBreak: "break-all", borderBottom: `1px solid ${C.green}44`, paddingBottom: 2, alignSelf: "flex-start" }}
            >
              ↗ {sources[0].label || "Open original"}
            </a>
          );
        }
        return (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <span style={{ fontSize: 10.5, letterSpacing: 0.8, textTransform: "uppercase", color: C.dim }}>
              {sources.length} sources on this
            </span>
            {sources.map((s, n) => (
              <a
                key={n}
                href={s.url}
                target="_blank"
                rel="noreferrer"
                style={{ fontSize: 12.5, color: C.green, textDecoration: "none", borderBottom: `1px solid ${C.green}44`, paddingBottom: 2, alignSelf: "flex-start" }}
              >
                ↗ {s.label || `Source ${n + 1}`}
              </a>
            ))}
          </div>
        );
      })()}

      <div style={{ display: "flex", gap: 8, marginTop: "auto", paddingTop: 10, borderTop: `1px solid ${C.line}`, flexWrap: "wrap" }}>
        <Toggle
          active={item.useful === true}
          onClick={() => onPatch({ useful: item.useful === true ? null : true })}
          on="★ Useful"
          off="☆ Useful?"
          activeColor={C.accent}
        />
        <Toggle
          active={item.useful === false}
          onClick={() => onPatch({ useful: item.useful === false ? null : false })}
          on="✕ Not useful"
          off="Not useful"
          activeColor={C.red}
        />
      </div>

      <div style={{ display: "flex", gap: 14, fontSize: 12 }}>
        <button onClick={onEdit} style={ghost(C.dim)}>Edit</button>
        <button onClick={onDelete} style={ghost(C.red)}>Delete</button>
      </div>
    </div>
  );
}

function Toggle({
  active,
  onClick,
  on,
  off,
  activeColor,
}: {
  active: boolean;
  onClick: () => void;
  on: string;
  off: string;
  activeColor: string;
}) {
  return (
    <button
      onClick={onClick}
      style={{ background: active ? activeColor : "transparent", color: active ? "#1a1714" : C.dim, border: `1px solid ${active ? activeColor : C.line}`, padding: "5px 10px", borderRadius: 2, fontSize: 11.5, cursor: "pointer", fontWeight: active ? 600 : 400 }}
    >
      {active ? on : off}
    </button>
  );
}

function ghost(color: string): CSSProperties {
  return {
    background: "none",
    border: "none",
    color,
    cursor: "pointer",
    padding: 0,
    fontSize: 12,
    textDecoration: "underline",
    textUnderlineOffset: 2,
  };
}

const btnGhost: CSSProperties = {
  background: "transparent",
  color: C.dim,
  border: `1px solid ${C.line}`,
  padding: "12px 16px",
  borderRadius: 2,
  fontWeight: 500,
  cursor: "pointer",
  fontSize: 13,
};

// ---------- form ----------

function ItemForm({
  accounts,
  existing,
  defaultType,
  onSaved,
  onClose,
  onAddAccount,
}: {
  accounts: string[];
  existing: VaultItem | null;
  defaultType: ItemType;
  onSaved: (saved: VaultItem, isNew: boolean) => void;
  onClose: () => void;
  onAddAccount: (name: string) => void;
}) {
  const [type, setType] = useState<ItemType>(existing?.type ?? defaultType ?? "idea");
  const [title, setTitle] = useState(existing?.title ?? "");
  const [link, setLink] = useState(existing?.link ?? "");
  const [account, setAccount] = useState<string>(existing?.account ?? accounts[0] ?? "");
  const [context, setContext] = useState(existing?.context ?? "");
  const [tagsStr, setTagsStr] = useState((existing?.tags ?? []).join(", "));
  const [newAccount, setNewAccount] = useState("");
  const [business, setBusiness] = useState(existing?.business ?? "");
  const [newBusiness, setNewBusiness] = useState("");
  const [images, setImages] = useState<string[]>(existing?.images ?? []);
  const [format, setFormat] = useState<Format>(existing?.format ?? (existing ? itemFormat(existing) : "reel"));
  const [sources] = useState<Source[]>(existing?.sources ?? []);
  const [uploading, setUploading] = useState(false);
  const [saving, startSaving] = useTransition();

  const onPickImages = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setUploading(true);
    try {
      const fd = new FormData();
      files.forEach((f) => fd.append("files", f));
      const urls = await uploadImages(fd);
      setImages((prev) => [...prev, ...urls]);
    } catch (err) {
      alert(`Upload failed: ${(err as Error).message}`);
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };
  const removeImage = (n: number) => setImages((prev) => prev.filter((_, i) => i !== n));

  const save = () => {
    const tags = tagsStr.split(",").map((t) => t.trim().replace(/^#/, "")).filter(Boolean);
    const payload: VaultItem = {
      id: existing?.id ?? crypto.randomUUID(),
      type,
      title: title.trim() || null,
      link: link.trim() || null,
      account: account || null,
      business: business || null,
      context: context || null,
      tags,
      format: type === "reference" ? format : null,
      images,
      sources,
      useful: existing?.useful ?? null,
      createdAt: existing?.createdAt ?? Date.now(),
    };

    const fd = new FormData();
    if (existing) fd.set("id", existing.id);
    fd.set("type", payload.type);
    if (payload.title) fd.set("title", payload.title);
    if (payload.link) fd.set("link", payload.link);
    if (payload.account) fd.set("account", payload.account);
    if (payload.business) fd.set("business", payload.business);
    if (payload.context) fd.set("context", payload.context);
    fd.set("tags", tags.join(","));
    if (payload.format) fd.set("format", payload.format);
    payload.images.forEach((u) => fd.append("images", u));
    fd.set("sources", JSON.stringify(payload.sources));

    startSaving(async () => {
      try {
        if (existing) {
          await updateItem(fd);
        } else {
          await createItem(fd);
        }
        onSaved(payload, !existing);
      } catch (err) {
        alert(`Save failed: ${(err as Error).message}`);
      }
    });
  };

  const field: CSSProperties = {
    background: C.panel2,
    border: `1px solid ${C.line}`,
    color: C.text,
    padding: "11px 13px",
    borderRadius: 2,
    fontSize: 14,
    outline: "none",
    width: "100%",
    boxSizing: "border-box",
    fontFamily: FONT_SANS,
  };
  const lbl: CSSProperties = {
    fontSize: 11,
    letterSpacing: 1,
    textTransform: "uppercase",
    color: C.dim,
    marginBottom: 6,
    display: "block",
  };
  const showEmbedPreview = type === "reference" && !!igEmbedSrc(link);

  const typeLabels: Record<ItemType, [string, string]> = {
    idea: ["Content Idea", "Format / type I want to create"],
    context: ["Context / Knowledge", "Something to look up later"],
    reference: ["Saved Reference", "IG post to reuse / repurpose"],
    profile: ["Profile", "A creator I admire & want to study"],
  };

  const valid = type === "profile" ? !!igHandle(link) : !!title.trim();

  return (
    <div
      onClick={onClose}
      style={{ position: "fixed", inset: 0, background: "#000000aa", display: "grid", placeItems: "center", padding: 20, zIndex: 50, backdropFilter: "blur(3px)" }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ background: C.panel, border: `1px solid ${C.line}`, borderRadius: 6, padding: 28, width: "min(560px, 100%)", maxHeight: "88vh", overflowY: "auto" }}
      >
        <h2 style={{ margin: "0 0 20px", fontFamily: FONT_SERIF, fontWeight: 400, fontSize: 26 }}>
          {existing ? "Edit item" : "Add to vault"}
        </h2>

        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 18 }}>
          {(Object.entries(typeLabels) as [ItemType, [string, string]][]).map(([t, [label, sub]]) => (
            <button
              key={t}
              onClick={() => setType(t)}
              style={{
                textAlign: "left",
                padding: "11px 14px",
                borderRadius: 2,
                cursor: "pointer",
                border: `1px solid ${type === t ? TAB_META[t].dot : C.line}`,
                background: type === t ? `${TAB_META[t].dot}22` : "transparent",
                color: C.text,
              }}
            >
              <div style={{ fontSize: 14, fontWeight: 600, display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ width: 8, height: 8, borderRadius: 9, background: TAB_META[t].dot }} /> {label}
              </div>
              <div style={{ fontSize: 12, color: C.dim, marginTop: 2, paddingLeft: 16 }}>{sub}</div>
            </button>
          ))}
        </div>

        <div style={{ marginBottom: 14 }}>
          <label style={lbl}>{type === "profile" ? "Name / who they are (optional)" : "Title"}</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            style={field}
            placeholder={type === "profile" ? "e.g. heytony — agency owner, talking-head reels" : "Short, scannable title"}
          />
        </div>

        <div style={{ marginBottom: 14 }}>
          <label style={lbl}>{type === "profile" ? "Instagram profile link" : "Instagram / source link"}</label>
          <input
            value={link}
            onChange={(e) => setLink(e.target.value)}
            style={field}
            placeholder={type === "profile" ? "https://instagram.com/username/" : "https://instagram.com/p/…"}
          />
          {showEmbedPreview && (
            <div style={{ marginTop: 10, padding: "12px 14px", border: `1px solid ${C.line}`, borderRadius: 4, background: C.panel2, fontSize: 12.5, color: C.green, display: "flex", alignItems: "center", gap: 8 }}>
              ✓ Instagram link detected — a “Watch on Instagram” card will show on this reference.
            </div>
          )}
        </div>

        {type === "reference" && (
          <div style={{ marginBottom: 14 }}>
            <label style={lbl}>Format</label>
            <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
              {([["reel", "Reel"], ["static", "Static post"], ["carousel", "Carousel"]] as [Format, string][]).map(([v, l]) => (
                <button
                  key={v}
                  onClick={() => setFormat(v)}
                  style={{
                    flex: 1,
                    padding: "9px",
                    borderRadius: 2,
                    cursor: "pointer",
                    fontSize: 13,
                    border: `1px solid ${format === v ? C.green : C.line}`,
                    background: format === v ? `${C.green}22` : "transparent",
                    color: C.text,
                    fontWeight: format === v ? 600 : 400,
                  }}
                >
                  {l}
                </button>
              ))}
            </div>

            <label style={lbl}>
              Screenshots (since IG can’t embed live here){format === "carousel" ? " — add each slide" : ""}
            </label>
            {images.length > 0 && (
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
                {images.map((src, n) => (
                  <div key={n} style={{ position: "relative", width: 84 }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={src} alt={`slide ${n + 1}`} style={{ width: "100%", borderRadius: 4, display: "block", border: `1px solid ${C.line}` }} />
                    <button
                      onClick={() => removeImage(n)}
                      style={{ position: "absolute", top: 3, right: 3, background: "#000000cc", color: "#fff", border: "none", borderRadius: 3, width: 20, height: 20, fontSize: 13, cursor: "pointer", lineHeight: "20px", padding: 0 }}
                    >
                      ×
                    </button>
                    <span style={{ position: "absolute", bottom: 3, left: 3, fontSize: 10, color: "#fff", background: "#000000aa", borderRadius: 8, padding: "1px 6px" }}>
                      {n + 1}
                    </span>
                  </div>
                ))}
              </div>
            )}
            <label
              style={{ display: "block", padding: "14px", textAlign: "center", border: `1px dashed ${C.line}`, borderRadius: 4, color: C.dim, fontSize: 13, cursor: "pointer", background: C.panel2 }}
            >
              {uploading ? "Uploading…" : images.length ? "+ Add more images" : format === "carousel" ? "+ Upload carousel slides (select multiple)" : "+ Upload a screenshot of the post"}
              <input type="file" accept="image/*" multiple onChange={onPickImages} style={{ display: "none" }} />
            </label>
          </div>
        )}

        {type === "profile" && (
          <div style={{ marginBottom: 14 }}>
            <label style={lbl}>Screenshots — profile / posts to scroll & refer</label>
            {images.length > 0 && (
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
                {images.map((src, n) => (
                  <div key={n} style={{ position: "relative", width: 84 }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={src} alt={`shot ${n + 1}`} style={{ width: "100%", borderRadius: 4, display: "block", border: `1px solid ${C.line}` }} />
                    <button
                      onClick={() => removeImage(n)}
                      style={{ position: "absolute", top: 3, right: 3, background: "#000000cc", color: "#fff", border: "none", borderRadius: 3, width: 20, height: 20, fontSize: 13, cursor: "pointer", lineHeight: "20px", padding: 0 }}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
            <label
              style={{ display: "block", padding: "14px", textAlign: "center", border: `1px dashed ${C.line}`, borderRadius: 4, color: C.dim, fontSize: 13, cursor: "pointer", background: C.panel2 }}
            >
              {uploading ? "Uploading…" : images.length ? "+ Add more screenshots" : "+ Upload profile screenshot(s)"}
              <input type="file" accept="image/*" multiple onChange={onPickImages} style={{ display: "none" }} />
            </label>
          </div>
        )}

        <div style={{ marginBottom: 14 }}>
          <label style={lbl}>For which account / ID</label>
          <select value={account} onChange={(e) => setAccount(e.target.value)} style={{ ...field, cursor: "pointer" }}>
            {accounts.map((a) => (
              <option key={a} value={a} style={{ background: C.panel2 }}>
                {a}
              </option>
            ))}
          </select>
          <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
            <input
              value={newAccount}
              onChange={(e) => setNewAccount(e.target.value)}
              placeholder="+ new account/ID"
              style={{ ...field, flex: 1 }}
            />
            <button
              onClick={() => {
                onAddAccount(newAccount);
                const v = newAccount.trim();
                if (v) setAccount(v);
                setNewAccount("");
              }}
              style={{ background: C.panel2, border: `1px solid ${C.line}`, color: C.text, padding: "0 16px", borderRadius: 2, cursor: "pointer" }}
            >
              Add
            </button>
          </div>
        </div>

        <div style={{ marginBottom: 14 }}>
          <label style={lbl}>Relevant to which business? (optional)</label>
          <select value={business} onChange={(e) => setBusiness(e.target.value)} style={{ ...field, cursor: "pointer" }}>
            <option value="" style={{ background: C.panel2 }}>— none —</option>
            {DEFAULT_BUSINESSES.map((b) => (
              <option key={b} value={b} style={{ background: C.panel2 }}>
                {b}
              </option>
            ))}
            {business && !DEFAULT_BUSINESSES.includes(business) && (
              <option value={business} style={{ background: C.panel2 }}>
                {business}
              </option>
            )}
          </select>
          <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
            <input
              value={newBusiness}
              onChange={(e) => setNewBusiness(e.target.value)}
              placeholder="+ other business"
              style={{ ...field, flex: 1 }}
            />
            <button
              onClick={() => {
                if (newBusiness.trim()) {
                  setBusiness(newBusiness.trim());
                  setNewBusiness("");
                }
              }}
              style={{ background: C.panel2, border: `1px solid ${C.line}`, color: C.text, padding: "0 16px", borderRadius: 2, cursor: "pointer" }}
            >
              Set
            </button>
          </div>
        </div>

        <div style={{ marginBottom: 14 }}>
          <label style={lbl}>
            {type === "context"
              ? "The knowledge / takeaway"
              : type === "idea"
              ? "Notes / angle for the content"
              : type === "profile"
              ? "Why I like this profile / what to study"
              : "Notes — what stood out to you"}
          </label>
          <textarea
            value={context}
            onChange={(e) => setContext(e.target.value)}
            rows={5}
            style={{ ...field, resize: "vertical" }}
            placeholder={type === "reference" ? "e.g. this performed really well, loved the hook, clean visuals, good pacing…" : "Paste the gist here so you never have to re-watch it…"}
          />
        </div>

        <div style={{ marginBottom: 24 }}>
          <label style={lbl}>Topic tags (comma separated)</label>
          <input value={tagsStr} onChange={(e) => setTagsStr(e.target.value)} style={field} placeholder="claude, hooks, ai" />
        </div>

        <div style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}>
          <button onClick={onClose} style={{ background: "transparent", border: `1px solid ${C.line}`, color: C.dim, padding: "11px 20px", borderRadius: 2, cursor: "pointer" }}>
            Cancel
          </button>
          <button
            onClick={save}
            disabled={!valid || saving || uploading}
            style={{
              background: valid && !saving && !uploading ? C.accent : C.line,
              color: "#1a1714",
              border: "none",
              padding: "11px 24px",
              borderRadius: 2,
              cursor: valid && !saving && !uploading ? "pointer" : "not-allowed",
              fontWeight: 600,
            }}
          >
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}
