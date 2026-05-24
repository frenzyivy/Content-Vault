import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { rowToItem, DEFAULT_ACCOUNTS, type VaultRow } from "@/lib/vault/types";
import VaultClient from "./vault-client";

export const dynamic = "force-dynamic";

export default async function VaultPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data, error } = await supabase
    .from("vault_items")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);

  const items = ((data ?? []) as VaultRow[]).map(rowToItem);
  const userAccounts = items.map((i) => i.account).filter((a): a is string => !!a);
  const accounts = Array.from(new Set([...DEFAULT_ACCOUNTS, ...userAccounts]));

  const displayName =
    (user.user_metadata?.name as string | undefined) ?? user.email ?? "you";

  return <VaultClient items={items} accounts={accounts} userName={displayName} />;
}
