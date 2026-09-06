"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { PhoneCall, Search, LayoutDashboard, House, MapPinned } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/", label: "Home", icon: House },
  { href: "/hiring", label: "Hiring", icon: PhoneCall },
  { href: "/search", label: "Search", icon: Search },
  { href: "/results", label: "Results", icon: LayoutDashboard },
  { href: "/attendance", label: "Attendance", icon: MapPinned },
];

export function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[240px_1fr]">
      <aside className="border-b border-white/10 bg-[var(--sidebar)] text-[var(--sidebar-foreground)] lg:sticky lg:top-0 lg:h-screen lg:border-b-0 lg:border-r lg:border-white/10">
        <div className="flex items-center gap-3 px-5 py-6">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-500/20 text-teal-300 font-display text-xl">
            V
          </div>
          <div>
            <p className="font-display text-xl leading-none tracking-tight">VoxHire</p>
            <p className="mt-1.5 text-[11px] uppercase tracking-[0.16em] text-[var(--sidebar-muted)]">
              Voice hiring
            </p>
          </div>
        </div>

        <nav className="flex gap-1 overflow-x-auto px-3 pb-4 lg:flex-col lg:overflow-visible lg:px-3">
          {NAV.map((item) => {
            const active = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm whitespace-nowrap transition-colors",
                  active
                    ? "bg-white/10 text-white"
                    : "text-[var(--sidebar-muted)] hover:bg-white/5 hover:text-white",
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto hidden px-5 pb-6 lg:block">
          <div className="rounded-xl border border-white/10 bg-white/5 p-3">
            <p className="text-xs leading-relaxed text-[var(--sidebar-muted)]">
              Powered by Hunar Voice Agents. Secrets stay in server environment variables.
            </p>
          </div>
        </div>
      </aside>

      <div className="min-w-0">{children}</div>
    </div>
  );
}
