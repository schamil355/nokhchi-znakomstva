"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";
import { useState } from "react";

const links = [
  { href: "/", label: "Dashboard" },
  { href: "/reports", label: "Reports" },
  { href: "/blocks", label: "Blocks" },
  { href: "/users", label: "Users" }
];

const NavBar = () => {
  const pathname = usePathname();
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);

  const handleSignOut = async () => {
    setSigningOut(true);
    const supabase = getSupabaseBrowserClient();
    await supabase.auth.signOut();
    router.replace("/login");
  };

  return (
    <aside className="flex h-full flex-col border-r border-slate-800 bg-slate-900/60 px-6 py-8">
      <div className="mb-8 text-lg font-semibold">meetmate Admin</div>
      <nav className="flex flex-1 flex-col gap-2">
        {links.map((link) => {
          const active = pathname === link.href;
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
                active ? "bg-emerald-500 text-slate-950" : "text-slate-300 hover:bg-slate-800/60"
              }`}
            >
              {link.label}
            </Link>
          );
        })}
      </nav>
      <button
        onClick={handleSignOut}
        disabled={signingOut}
        className="mt-8 w-full rounded-md bg-slate-800 px-3 py-2 text-sm font-semibold text-slate-200 hover:bg-slate-700 disabled:opacity-60"
      >
        {signingOut ? "Signing out…" : "Sign out"}
      </button>
    </aside>
  );
};

export default NavBar;
