import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { Database } from "@/lib/types";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  if (!code) {
    return NextResponse.redirect(new URL("/login", request.url));
  }
  const supabase = createRouteHandlerClient<Database>({ cookies });
  await supabase.auth.exchangeCodeForSession(request);
  const redirectTo = requestUrl.searchParams.get("redirectedFrom") ?? "/";
  return NextResponse.redirect(new URL(redirectTo, request.url));
}

export async function POST(request: Request) {
  return GET(request);
}
