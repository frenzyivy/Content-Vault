// One-time importer: pulls items from the prototype's JSON export into
// Supabase, scoped to a single user. Run via `npm run import`.
//
// Defaults: reads ./vault-export.json, looks up the user by the email in
// CLAUDE.md (komal.aitools@gmail.com). Flags:
//   --email=<addr>     override the email
//   --file=<path>      override the export file path
//   --force            wipe this user's existing items first (clean re-import)

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

// --- load .env.local (no dotenv dep) ---
function loadEnv(file) {
  if (!fs.existsSync(file)) return;
  for (const raw of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    if (!raw || raw.trim().startsWith("#")) continue;
    const m = raw.match(/^\s*([\w.-]+)\s*=\s*(.*?)\s*$/);
    if (!m) continue;
    let val = m[2];
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (!process.env[m[1]]) process.env[m[1]] = val;
  }
}
loadEnv(path.join(root, ".env.local"));

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SERVICE_ROLE) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

// --- args ---
const args = process.argv.slice(2);
const force = args.includes("--force");
const emailArg = args.find((a) => a.startsWith("--email="));
const email = (emailArg ? emailArg.split("=")[1] : "aniketyadav12559@gmail.com").trim();
const fileArg = args.find((a) => a.startsWith("--file="));
const exportFile = fileArg ? path.resolve(fileArg.split("=")[1]) : path.join(root, "vault-export.json");

if (!fs.existsSync(exportFile)) {
  console.error(`Export file not found: ${exportFile}`);
  console.error(`Drop the prototype's JSON export at that path, or pass --file=<path>.`);
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } });

// --- find user ---
console.log(`Looking up user: ${email}`);
const { data: list, error: lookupErr } = await supabase.auth.admin.listUsers({ perPage: 200 });
if (lookupErr) {
  console.error("User lookup failed:", lookupErr.message);
  process.exit(1);
}
const user = list.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
if (!user) {
  console.error(`No user with email "${email}". Sign up at /login first, then re-run this script.`);
  process.exit(1);
}
console.log(`Found user id: ${user.id}`);

// --- idempotency check ---
const { count, error: countErr } = await supabase
  .from("vault_items")
  .select("*", { count: "exact", head: true })
  .eq("user_id", user.id);
if (countErr) {
  console.error("Count check failed:", countErr.message);
  process.exit(1);
}
if ((count ?? 0) > 0) {
  if (!force) {
    console.error(`User already has ${count} item(s). Refusing to re-import.`);
    console.error(`Pass --force to wipe their existing items and re-import from scratch.`);
    process.exit(1);
  }
  console.log(`--force: wiping ${count} existing item(s) for ${email}...`);
  const { error: delErr } = await supabase.from("vault_items").delete().eq("user_id", user.id);
  if (delErr) {
    console.error("Wipe failed:", delErr.message);
    process.exit(1);
  }
}

// --- read + transform ---
const payload = JSON.parse(fs.readFileSync(exportFile, "utf8"));
const incoming = Array.isArray(payload.items) ? payload.items : [];
if (!incoming.length) {
  console.error("No `items` array found in export file.");
  process.exit(1);
}
console.log(`Read ${incoming.length} item(s) from ${exportFile}`);

const rows = incoming.map((it) => {
  const images = Array.isArray(it.images) && it.images.length
    ? it.images
    : it.image
    ? [it.image]
    : [];
  const tags = Array.isArray(it.tags) ? it.tags.filter((t) => typeof t === "string") : [];
  const sources = Array.isArray(it.sources) ? it.sources.filter((s) => s && s.url) : [];
  const createdAt = typeof it.createdAt === "number"
    ? new Date(it.createdAt).toISOString()
    : new Date().toISOString();
  return {
    user_id: user.id,
    type: it.type || "idea",
    title: it.title || null,
    link: it.link || null,
    account: it.account || null,
    business: it.business || null,
    context: it.context || null,
    tags,
    format: it.type === "reference" ? (it.format || null) : null,
    images,
    sources,
    useful: it.useful === true ? true : it.useful === false ? false : null,
    created_at: createdAt,
  };
});

// --- insert in small batches (base64 image payloads can be large) ---
const BATCH = 5;
let inserted = 0;
for (let i = 0; i < rows.length; i += BATCH) {
  const batch = rows.slice(i, i + BATCH);
  const { error } = await supabase.from("vault_items").insert(batch);
  if (error) {
    console.error(`Batch ${Math.floor(i / BATCH) + 1} failed:`, error.message);
    console.error(`Inserted ${inserted} item(s) before failure.`);
    process.exit(1);
  }
  inserted += batch.length;
  console.log(`Inserted ${inserted} / ${rows.length}`);
}
console.log(`\nDone. Imported ${inserted} item(s) for ${email}.`);
