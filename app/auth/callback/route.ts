import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/vault";

  if (code) {
    const supabase = createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      const forwardedHost = request.headers.get("x-forwarded-host");
      const target = forwardedHost ? `https://${forwardedHost}${next}` : `${origin}${next}`;
      return NextResponse.redirect(target);
    }
  }
  return NextResponse.redirect(`${origin}/login?error=auth`);
}
