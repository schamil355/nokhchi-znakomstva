import "server-only";
import { cookies } from "next/headers";
import { createClient, type User } from "@supabase/supabase-js";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";

type Database = Record<string, never>;

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const assertPublicEnv = () => {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error("Supabase public environment variables are not configured.");
  }
};

export const getServerClient = () => {
  assertPublicEnv();
  return createRouteHandlerClient<Database>({ cookies });
};

export const getAdminClient = () => {
  assertPublicEnv();
  if (!SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is required for admin operations.");
  }
  return createClient<Database>(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  });
};

export const getUserIdFromCookies = async (): Promise<string | null> => {
  const client = getServerClient();
  const { data, error } = await client.auth.getUser();
  if (error) {
    console.warn("Failed to read session user", error);
    return null;
  }
  return data.user?.id ?? null;
};

export const getAuthenticatedUser = async (request?: Request): Promise<User | null> => {
  const client = getServerClient();
  const { data, error } = await client.auth.getUser();
  if (!error && data.user) {
    return data.user;
  }

  const bearer = request?.headers.get("authorization");
  const token = bearer?.startsWith("Bearer ") ? bearer.slice(7).trim() : null;
  if (!token) return null;

  try {
    const admin = getAdminClient();
    const { data: tokenData, error: tokenError } = await admin.auth.getUser(token);
    if (tokenError) {
      console.warn("Service token auth failed", tokenError);
      return null;
    }
    return tokenData.user ?? null;
  } catch (err) {
    console.warn("Unexpected auth error", err);
    return null;
  }
};
