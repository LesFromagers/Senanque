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

export function Header() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <header className="relative border-b border-stone/40">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <Link href="/" className="flex items-baseline gap-3">
          <BelfryIcon className="h-7 w-7 shrink-0 self-center text-plum" />
          <span className="font-display text-lg leading-none font-light text-charcoal">
            Senanque
          </span>
          <span aria-hidden="true" className="h-3.5 w-px self-center bg-stone" />
          <span className="text-[11px] leading-none tracking-label uppercase text-stone">
            Intelligence
          </span>
        </Link>

        <nav className="hidden items-center gap-6 sm:flex">
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
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-controls="mobile-nav"
          aria-label={open ? "Close menu" : "Open menu"}
          className="-mr-2 flex h-11 w-11 items-center justify-center text-charcoal sm:hidden"
        >
          {open ? <CloseIcon className="h-5 w-5" /> : <MenuIcon className="h-5 w-5" />}
        </button>
      </div>

      {open && (
        <nav
          id="mobile-nav"
          className="absolute inset-x-0 top-full z-20 flex flex-col border-b border-stone/40 bg-oat px-6 pb-4 sm:hidden"
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
                    ? "border-b border-stone/20 py-3 text-sm font-medium text-charcoal"
                    : "border-b border-stone/20 py-3 text-sm font-medium text-charcoal/80"
                }
              >
                {link.label}
              </Link>
            );
          })}
          {PLACEHOLDER_LINKS.map((label) => (
            <span
              key={label}
              className="border-b border-stone/20 py-3 text-sm font-medium text-stone"
            >
              {label}
            </span>
          ))}
          <span className="mt-4 rounded-sm border border-plum px-3 py-3 text-center text-sm font-medium text-plum">
            Résumé
          </span>
        </nav>
      )}
    </header>
  );
}
