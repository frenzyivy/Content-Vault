import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import LoginForm from "./login-form";

export default async function LoginPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) redirect("/vault");
  return <LoginForm />;
}
