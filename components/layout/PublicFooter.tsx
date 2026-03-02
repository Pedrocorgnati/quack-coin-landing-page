// components/layout/PublicFooter.tsx
// Marketing footer for (public) route group.

import Image from "next/image";

const FOOTER_LINKS = [
  { href: "/landing", label: "Home" },
  { href: "/pricing", label: "Pricing" },
  { href: "/faq", label: "FAQ" },
  { href: "/about", label: "About" },
  { href: "/roadmap", label: "Roadmap" },
  { href: "/privacy", label: "Privacy Policy" },
  { href: "/terms", label: "Terms of Service" },
];

export function PublicFooter() {
  return (
    <footer className="border-t bg-muted/30 py-10">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center gap-6">
          {/* Logo */}
          <div className="flex items-center gap-2 font-bold text-sm">
            <Image
              src="/rubber-duck.png"
              alt="QuackCoin"
              width={20}
              height={20}
              className="h-5 w-5"
            />
            QuackCoin
          </div>

          {/* Links */}
          <nav className="flex flex-wrap justify-center gap-x-5 gap-y-2" aria-label="Footer navigation">
            {FOOTER_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                {link.label}
              </a>
            ))}
          </nav>

          {/* Copyright */}
          <p className="text-xs text-muted-foreground">
            &copy; {new Date().getFullYear()} QuackCoin. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
