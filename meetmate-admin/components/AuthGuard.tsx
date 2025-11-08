import { ReactNode } from "react";
import { redirect } from "next/navigation";
import { getSupabaseServerClient } from "@/lib/supabase-server";

type AuthGuardProps = {
  children: ReactNode;
};

const AuthGuard = async ({ children }: AuthGuardProps) => {
  const supabase = getSupabaseServerClient();
  const {
    data: { session }
  } = await supabase.auth.getSession();

  if (!session) {
    redirect("/login");
  }

  const role = session.user.app_metadata?.role;
  if (role !== "admin") {
    redirect("/login?error=unauthorized");
  }

  return <>{children}</>;
};

export default AuthGuard;
