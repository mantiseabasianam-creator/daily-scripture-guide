import { Link } from "@tanstack/react-router";
import { BookOpen, CalendarDays, Home, Search, User } from "lucide-react";
import type { ReactNode } from "react";
import { ThemeToggle } from "@/components/theme-toggle";

const NAV = [
  { to: "/", label: "Home", icon: Home },
  { to: "/read", label: "Read", icon: BookOpen },
  { to: "/search", label: "Search", icon: Search },
  { to: "/events", label: "Events", icon: CalendarDays },
  { to: "/profile", label: "Profile", icon: User },
] as const;

export function AppShell({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="sticky top-0 z-30 border-b border-border/60 bg-background/85 backdrop-blur-md">
        <div className="mx-auto grid max-w-3xl grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-3">
          <Link to="/" className="flex min-w-0 items-center gap-2">
            <span className="grid size-9 shrink-0 place-items-center rounded-xl gradient-dawn text-primary-foreground">
              <BookOpen className="size-4" />
            </span>
            <span className="min-w-0">
              <span className="block truncate font-display text-base font-semibold">
                Scripture Reader
              </span>
              <span className="block truncate text-xs text-muted-foreground">{title}</span>
            </span>
          </Link>
          <ThemeToggle />
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl px-4 py-6">{children}</main>

      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border/60 bg-background/95 backdrop-blur-md">
        <ul className="mx-auto flex max-w-3xl items-stretch">
          {NAV.map(({ to, label, icon: Icon }) => (
            <li key={to} className="flex-1">
              <Link
                to={to}
                activeOptions={{ exact: to === "/" }}
                className="flex flex-col items-center gap-1 py-2.5 text-[11px] text-muted-foreground transition-colors"
                activeProps={{ className: "text-primary font-medium" }}
              >
                <Icon className="size-5" />
                {label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}