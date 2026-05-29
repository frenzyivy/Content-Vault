"use server";

import { signIn, signOut } from "@/auth"; // Imports your new Auth.js config
import { headers } from "next/headers";

/**
 * Dynamically tracks your subdomain headers safely in Next.js 16+
 */
async function originFromHeaders() {
  const h = await headers();
  const proto = h.get("x-forwarded-proto") ?? "http";
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  return `${proto}://${host}`;
}

/**
 * Handles independent Google Provider Login Actions
 */
export async function loginWithGoogle() {
  try {
    const origin = await originFromHeaders();
    await signIn("google", { 
      redirectTo: `${origin}/vault` 
    });
  } catch (error) {
    throw error;
  }
}

/**
 * Handles independent GitHub Provider Login Actions
 */
export async function loginWithGitHub() {
  try {
    const origin = await originFromHeaders();
    await signIn("github", { 
      redirectTo: `${origin}/vault` 
    });
  } catch (error) {
    throw error;
  }
}

/**
 * Handles system-wide User Session Disconnections
 */
export async function logOut() {
  try {
    const origin = await originFromHeaders();
    await signOut({ 
      redirectTo: `${origin}/login` 
    });
  } catch (error) {
    throw error;
  }
}
