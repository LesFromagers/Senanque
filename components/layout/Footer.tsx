const LINKS = [
  { label: "senanque.dev", href: "https://senanque.dev" },
  { label: "GitHub", href: "https://github.com/LesFromagers/Senanque" },
  { label: "LinkedIn", href: "https://www.linkedin.com" },
  { label: "Email", href: "mailto:hello@senanque.dev" },
];

export function Footer() {
  return (
    <footer className="border-t border-stone/40">
      <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-4 px-6 py-8 text-sm text-stone sm:flex-row sm:items-center">
        <p className="font-display italic">Jeunesse, Courage, Affinage</p>
        <nav className="flex flex-wrap items-center gap-5">
          {LINKS.map((link) => (
            <a
              key={link.label}
              href={link.href}
              className="transition-colors hover:text-plum"
              target={link.href.startsWith("http") ? "_blank" : undefined}
              rel={link.href.startsWith("http") ? "noreferrer" : undefined}
            >
              {link.label}
            </a>
          ))}
        </nav>
      </div>
    </footer>
  );
}
