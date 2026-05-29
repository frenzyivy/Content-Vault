"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

type Result = { error?: string; needsConfirmation?: boolean } | void;

async function originFromHeaders() {
  const h = await headers();
  const proto = h.get("x-forwarded-proto") ?? "http";
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  return `${proto}://${host}`;
}

export async function login(formData: FormData): Promise<Result> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  const supabase = createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: error.message };

  revalidatePath("/", "layout");
  redirect("/vault");
}

export async function signup(formData: FormData): Promise<Result> {
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  const supabase = createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { name },
      emailRedirectTo: `${originFromHeaders()}/auth/callback`,
    },
  });
  if (error) return { error: error.message };

  // If Supabase has email confirmations enabled, session will be null until the user clicks the link.
  if (!data.session) return { needsConfirmation: true };

  revalidatePath("/", "layout");
  redirect("/vault");
}

export async function signInWithGoogle(): Promise<{ error?: string } | void> {
  const supabase = createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: `${originFromHeaders()}/auth/callback` },
  });
  if (error) return { error: error.message };
  if (data?.url) redirect(data.url);
}

export async function logout() {
  const supabase = createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/login");
}
