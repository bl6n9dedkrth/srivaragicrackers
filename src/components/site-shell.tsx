import { Link } from "@tanstack/react-router";
import { Menu, Sparkles, X } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";

const links = [
  { label: "Home", to: "/" as const },
  { label: "Catalogue", to: "/catalogue" as const },
  { label: "Owner", to: "/admin" as const },
];

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-background/95 backdrop-blur">
      <div className="mx-auto grid h-18 max-w-7xl grid-cols-[minmax(0,1fr)_auto] items-center px-5 sm:flex sm:justify-between sm:px-8 lg:px-12">
        <Link to="/" className="flex min-w-0 items-center gap-3" aria-label="Sri Varagi Crackers home">
          <span className="brand-mark"><Sparkles size={17} /></span>
          <span className="truncate font-display text-xl text-foreground sm:text-2xl">Sri Varagi Crackers</span>
        </Link>
        <nav className="hidden items-center gap-8 sm:flex" aria-label="Main navigation">
          {links.map((link) => <Link key={link.to} to={link.to} activeOptions={{ exact: link.to === "/" }} className="nav-link" activeProps={{ className: "nav-link-active" }}>{link.label}</Link>)}
        </nav>
        <Button variant="ghost" size="icon" className="sm:hidden" onClick={() => setOpen((value) => !value)} aria-label={open ? "Close menu" : "Open menu"} aria-expanded={open}>
          {open ? <X /> : <Menu />}
        </Button>
      </div>
      {open && <nav className="border-t border-border px-5 py-3 sm:hidden" aria-label="Mobile navigation">{links.map((link) => <Link key={link.to} to={link.to} onClick={() => setOpen(false)} className="block border-b border-border/60 py-4 text-sm font-semibold uppercase text-muted-foreground last:border-0">{link.label}</Link>)}</nav>}
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="border-t border-border bg-surface-deep">
      <div className="mx-auto grid max-w-7xl gap-10 px-5 py-12 sm:grid-cols-2 sm:px-8 lg:px-12">
        <div><p className="font-display text-3xl text-primary">Sri Varagi Crackers</p><p className="mt-3 max-w-sm text-sm leading-6 text-muted-foreground">A premium seasonal catalogue for a brighter, more memorable Deepavali celebration.</p></div>
        <div className="sm:text-right"><p className="eyebrow">Enquiries</p><a className="mt-3 inline-block text-sm text-foreground transition hover:text-primary" href="mailto:hello@srivaragicrackers.example">hello@srivaragicrackers.example</a><p className="mt-2 text-xs text-muted-foreground">Business details shown are placeholders.</p></div>
      </div>
      <div className="border-t border-border px-5 py-5 text-center text-xs text-muted-foreground">© 2026 Sri Varagi Crackers. Catalogue presentation only.</div>
    </footer>
  );
}
