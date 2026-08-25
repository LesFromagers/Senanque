"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BelfryIcon } from "@/components/icons/BelfryIcon";
import { MenuIcon } from "@/components/icons/MenuIcon";
import { CloseIcon } from "@/components/icons/CloseIcon";

const NAV_LINKS = [
  { label: "Analytics", href: "/#work", match: "/analytics" },
  { label: "Agentics", href: "/#agentics", match: "/agentics" },
  { label: "Approach", href: "/#approach", match: "/__never__" },
];

// Not yet built — rendered as inert text rather than a dead link.
const PLACEHOLDER_LINKS = ["About"];

/**
 * Root cause of the sitewide horizontal-scroll bug: this row of nav links
 * plus the Résumé badge was a single non-wrapping flex line with no
 * mobile treatment — five-plus items easily wider than any phone
 * viewport, forcing the whole page to overflow horizontally on every
 * route that renders it (i.e. every route, via the root layout). Below
 * `md` the full nav now collapses behind a hamburger toggle instead of
 * trying to fit on one line.
 */
export function Header() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <header className="border-b border-stone/40">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-6 sm:py-5">
        <Link
          href="/"
          className="flex min-w-0 items-center gap-2"
          onClick={() => setOpen(false)}
        >
          <BelfryIcon className="h-6 w-6 shrink-0 text-plum" />
          {/*
            "Senanque | Intelligence" reads as one lockup, baseline-aligned,
            at every width — no longer dropping "Intelligence" below `sm`.
            Each piece is its own flex child so a very narrow viewport
            truncates the wordmark itself before it ever pushes the pipe
            or "Intelligence" off — those two stay put as the fixed part
            of the mark.
          */}
          <span className="flex min-w-0 items-baseline gap-2">
            <span className="truncate font-display text-wordmark font-light text-charcoal">
              Senanque
            </span>
            <span className="shrink-0 text-stone/50" aria-hidden="true">
              |
            </span>
            <span className="shrink-0 text-xs tracking-label uppercase text-stone">
              Intelligence
            </span>
          </span>
        </Link>

        <nav className="hidden items-center gap-6 md:flex">
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

        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          aria-controls="mobile-nav"
          aria-label={open ? "Close menu" : "Open menu"}
          className="flex h-9 w-9 shrink-0 items-center justify-center text-charcoal md:hidden"
        >
          {open ? <CloseIcon className="h-6 w-6" /> : <MenuIcon className="h-6 w-6" />}
        </button>
      </div>

      {open && (
        <nav
          id="mobile-nav"
          className="flex flex-col gap-1 border-t border-stone/40 px-4 py-4 md:hidden"
        >
          {NAV_LINKS.map((link) => {
            const isActive = pathname.startsWith(link.match);
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className={
                  isActive
                    ? "rounded-sm px-2 py-2.5 text-sm font-medium text-charcoal underline decoration-gold decoration-2 underline-offset-4"
                    : "rounded-sm px-2 py-2.5 text-sm font-medium text-charcoal/80 transition-colors hover:bg-stone/10 hover:text-plum"
                }
              >
                {link.label}
              </Link>
            );
          })}
          {PLACEHOLDER_LINKS.map((label) => (
            <span key={label} className="px-2 py-2.5 text-sm font-medium text-stone">
              {label}
            </span>
          ))}
          <span className="mt-2 w-fit rounded-sm border border-plum px-3 py-1.5 text-sm font-medium text-plum">
            Résumé
          </span>
        </nav>
      )}
    </header>
  );
}
