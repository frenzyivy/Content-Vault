"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { ItemType, Format, Source } from "@/lib/vault/types";

const STORAGE_BUCKET = "vault-images";

async function requireUser() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return { supabase, user };
}

type ItemInput = {
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
};

function parseItemInput(fd: FormData): ItemInput {
  const type = (fd.get("type") as ItemType) || "idea";
  const title = (fd.get("title") as string | null)?.trim() || null;
  const link = (fd.get("link") as string | null)?.trim() || null;
  const account = (fd.get("account") as string | null)?.trim() || null;
  const business = (fd.get("business") as string | null)?.trim() || null;
  const context = (fd.get("context") as string | null) ?? null;
  const tagsRaw = (fd.get("tags") as string | null) ?? "";
  const tags = tagsRaw
    .split(",")
    .map((t) => t.trim().replace(/^#/, ""))
    .filter(Boolean);
  const format = type === "reference" ? ((fd.get("format") as Format) || "reel") : null;
  const images = fd.getAll("images").map(String).filter(Boolean);
  const sourcesRaw = (fd.get("sources") as string | null) ?? "[]";
  let sources: Source[] = [];
  try {
    const parsed = JSON.parse(sourcesRaw);
    if (Array.isArray(parsed)) sources = parsed.filter((s) => s && typeof s.url === "string");
  } catch {}
  return { type, title, link, account, business, context, tags, format, images, sources };
}

export async function createItem(fd: FormData) {
  const { supabase, user } = await requireUser();
  const input = parseItemInput(fd);
  const { error } = await supabase.from("vault_items").insert({
    user_id: user.id,
    ...input,
  });
  if (error) throw new Error(error.message);
  revalidatePath("/vault");
}

export async function updateItem(fd: FormData) {
  const { supabase, user } = await requireUser();
  const id = fd.get("id") as string | null;
  if (!id) throw new Error("Missing id");
  const input = parseItemInput(fd);

  // Delete removed images from Storage so they don't pile up as orphans.
  const { data: existing } = await supabase
    .from("vault_items")
    .select("images")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();
  const oldImages: string[] = existing?.images ?? [];
  const removed = oldImages.filter((u) => !input.images.includes(u));
  await deleteStoragePaths(supabase, removed);

  const { error } = await supabase
    .from("vault_items")
    .update(input)
    .eq("id", id)
    .eq("user_id", user.id);
  if (error) throw new Error(error.message);
  revalidatePath("/vault");
}

export async function deleteItem(id: string) {
  const { supabase, user } = await requireUser();
  const { data: existing } = await supabase
    .from("vault_items")
    .select("images")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();
  await deleteStoragePaths(supabase, existing?.images ?? []);
  const { error } = await supabase
    .from("vault_items")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);
  if (error) throw new Error(error.message);
  revalidatePath("/vault");
}

export async function toggleUseful(id: string, value: boolean | null) {
  const { supabase, user } = await requireUser();
  const { error } = await supabase
    .from("vault_items")
    .update({ useful: value })
    .eq("id", id)
    .eq("user_id", user.id);
  if (error) throw new Error(error.message);
  revalidatePath("/vault");
}

// Upload images and return their public URLs. Called from the form before save.
export async function uploadImages(fd: FormData): Promise<string[]> {
  const { supabase, user } = await requireUser();
  const files = fd.getAll("files").filter((f): f is File => f instanceof File && f.size > 0);
  if (!files.length) return [];

  const urls: string[] = [];
  for (const file of files) {
    const ext = (file.name.split(".").pop() || "jpg").toLowerCase().slice(0, 5);
    const path = `${user.id}/${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(path, file, { contentType: file.type || "image/jpeg", upsert: false });
    if (error) throw new Error(`Upload failed: ${error.message}`);
    const { data } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(path);
    urls.push(data.publicUrl);
  }
  return urls;
}

async function deleteStoragePaths(
  supabase: ReturnType<typeof createClient>,
  urls: string[],
) {
  const paths = urls
    .map(extractStoragePath)
    .filter((p): p is string => !!p);
  if (!paths.length) return;
  await supabase.storage.from(STORAGE_BUCKET).remove(paths);
}

// Extract "<user_id>/<file>" from a Supabase public URL; returns null for
// legacy base64 or external URLs so we don't try to delete those.
function extractStoragePath(url: string): string | null {
  const marker = `/storage/v1/object/public/${STORAGE_BUCKET}/`;
  const i = url.indexOf(marker);
  if (i === -1) return null;
  return url.slice(i + marker.length);
}
