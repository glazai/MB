"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Trophy,
  Dices,
  Landmark,
  FileBarChart,
  Settings2,
  TrendingUp,
  Menu,
  X,
  LogOut,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";

const AUTH_PATHS = ["/login", "/signup"];

const LINKS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/sports", label: "Sports", icon: Trophy },
  { href: "/casino", label: "Casino", icon: Dices },
  { href: "/accounts", label: "Account", icon: Landmark },
  { href: "/reports", label: "Reports", icon: FileBarChart },
  { href: "/settings/bookmakers", label: "Settings", icon: Settings2 },
];

export function Nav() {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);

  function isActive(href: string) {
    return pathname === href || pathname?.startsWith(href + "/");
  }

  async function handleSignOut() {
    await authClient.signOut();
    router.push("/login");
  }

  if (pathname && AUTH_PATHS.includes(pathname)) {
    return null;
  }

  return (
    <>
      <header className="sm:hidden border-b bg-card relative">
        <div className="w-full px-4 h-16 flex items-center gap-4">
          <Link href="/dashboard" className="flex items-center gap-2 shrink-0 min-w-0">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <TrendingUp className="size-4.5" />
            </span>
          </Link>

          <div className="ml-auto flex items-center gap-1">
            <Button variant="ghost" size="icon" aria-label="Sign out" onClick={handleSignOut}>
              <LogOut className="size-4.5" />
            </Button>
            <ThemeToggle />
            <Button
              variant="ghost"
              size="icon"
              aria-label={mobileOpen ? "Close navigation menu" : "Open navigation menu"}
              onClick={() => setMobileOpen((v) => !v)}
            >
              {mobileOpen ? <X className="size-5" /> : <Menu className="size-5" />}
            </Button>
          </div>
        </div>

        {mobileOpen && (
          <>
            <button
              aria-hidden="true"
              className="fixed inset-0 z-40 bg-black/20"
              onClick={() => setMobileOpen(false)}
            />
            <nav className="absolute right-4 top-16 z-50 w-48 rounded-lg border bg-popover p-1 shadow-md">
              {LINKS.map((link) => {
                const Icon = link.icon;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setMobileOpen(false)}
                    className={cn(
                      "flex items-center gap-2 rounded-md px-2 py-2 text-sm font-medium",
                      isActive(link.href)
                        ? "bg-accent text-accent-foreground"
                        : "text-popover-foreground hover:bg-muted",
                    )}
                  >
                    <Icon className="size-4" />
                    {link.label}
                  </Link>
                );
              })}
            </nav>
          </>
        )}
      </header>

      <aside
        className={cn(
          "hidden sm:flex sm:flex-col border-r bg-card shrink-0 transition-[width] duration-150",
          expanded ? "sm:w-48" : "sm:w-16",
        )}
      >
        <div className={cn("flex items-center h-16 shrink-0", expanded ? "px-4 gap-2" : "justify-center")}>
          <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <TrendingUp className="size-4.5" />
          </span>
          {expanded && <span className="font-semibold tracking-tight truncate text-sm">Matched Betting</span>}
        </div>

        <nav className="flex flex-col gap-1 px-2.5 flex-1">
          {LINKS.map((link) => {
            const Icon = link.icon;
            return (
              <Link
                key={link.href}
                href={link.href}
                title={expanded ? undefined : link.label}
                className={cn(
                  "flex items-center gap-2.5 rounded-lg px-2.5 h-9 text-sm font-medium transition-colors overflow-hidden",
                  isActive(link.href)
                    ? "bg-accent text-accent-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                <Icon className="size-4.5 shrink-0" />
                {expanded && <span className="truncate">{link.label}</span>}
              </Link>
            );
          })}
        </nav>

        <div className="flex flex-col gap-1 px-2.5 pb-3">
          <div className={cn("flex items-center", expanded ? "gap-1" : "flex-col gap-1")}>
            <ThemeToggle />
            <Button variant="ghost" size="icon" aria-label="Sign out" onClick={handleSignOut}>
              <LogOut className="size-4.5" />
            </Button>
          </div>
          <Button
            variant="ghost"
            size="icon"
            aria-label={expanded ? "Collapse navigation" : "Expand navigation"}
            onClick={() => setExpanded((v) => !v)}
            className="self-end"
          >
            {expanded ? <ChevronLeft className="size-4" /> : <ChevronRight className="size-4" />}
          </Button>
        </div>
      </aside>
    </>
  );
}
