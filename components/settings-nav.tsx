"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/settings/bookmakers", label: "Bookmakers" },
  { href: "/settings/bet-types", label: "Bet Types" },
  { href: "/settings/casino-offer-types", label: "Casino Offer Types" },
  { href: "/setup", label: "Setup" },
];

export function SettingsNav() {
  const pathname = usePathname();

  return (
    <div className="flex gap-2 border-b mb-6">
      {LINKS.map((link) => {
        const active = pathname === link.href;
        return (
          <Link
            key={link.href}
            href={link.href}
            className={cn(
              "px-3 py-2 text-sm border-b-2 border-transparent -mb-px transition-colors",
              active
                ? "border-primary text-primary font-medium"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {link.label}
          </Link>
        );
      })}
    </div>
  );
}
