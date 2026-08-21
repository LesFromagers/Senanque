"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BelfryIcon } from "@/components/icons/BelfryIcon";

const NAV_LINKS = [
  { label: "Analytics", href: "/#work", match: "/analytics" },
  { label: "Agentics", href: "/#agentics", match: "/agentics" },
  { label: "Approach", href: "/#approach", match: "/__never__" },
];

// Not yet built — rendered as inert text rather than a dead link.
const PLACEHOLDER_LINKS = ["About"];

export function Header() {
  const pathname = usePathname();

  return (
    <header className="border-b border-stone/40">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <Link href="/" className="flex items-center gap-2">
          <BelfryIcon className="h-6 w-6 text-plum" />
          <span className="font-display text-lg font-light text-charcoal">
            Senanque
          </span>
          <span className="hidden text-xs tracking-label uppercase text-stone sm:inline">
            Intelligence
          </span>
        </Link>

        <nav className="flex items-center gap-6">
          {NAV_LINKS.map((link) => {
            const isActive = pathname.startsWith(link.match);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={
                  isActive
                    ? "text-sm font-medium text-charcoal underline decoration-gold decoration-2 underline-offset-8"
                    : "text-sm font-medium text-charcoal/80 transition-colors hover:text-plum"
                }
              >
                {link.label}
              </Link>
            );
          })}
          {PLACEHOLDER_LINKS.map((label) => (
            <span key={label} className="text-sm font-medium text-stone">
              {label}
            </span>
          ))}
          <span className="rounded-sm border border-plum px-3 py-1.5 text-sm font-medium text-plum">
            Résumé
          </span>
        </nav>
      </div>
    </header>
  );
}
