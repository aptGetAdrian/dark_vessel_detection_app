import { Bell, Menu, Search } from "lucide-react";

export function Header() {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-border-subtle bg-bg-panel">
      <div className="relative mx-auto flex h-15 w-full max-w-7xl items-center justify-between px-6 lg:px-8">
        <a
          href="#"
          className="text-base font-semibold tracking-tight text-text-primary"
        >
          Heimdal
        </a>

        <nav
          aria-label="Primary navigation"
          className="pointer-events-none absolute left-1/2 hidden -translate-x-1/2 md:flex"
        >
          <a
            href="#"
            className="pointer-events-auto relative text-sm font-medium text-text-primary after:absolute after:-bottom-1 after:left-0 after:h-px after:w-full after:origin-center after:scale-x-0 after:bg-accent after:transition-transform after:duration-200 hover:after:scale-x-100"
          >
            Dashboard
          </a>
        </nav>

        <nav aria-label="Header actions" className="flex items-center gap-1">
          <button
            type="button"
            aria-label="Search"
            className="rounded-md p-2.5 text-text-muted transition-colors hover:bg-bg-surface hover:text-text-primary"
          >
            <Search className="size-4" aria-hidden="true" />
          </button>
          <button
            type="button"
            aria-label="Notifications"
            className="rounded-md p-2.5 text-text-muted transition-colors hover:bg-bg-surface hover:text-text-primary"
          >
            <Bell className="size-4" aria-hidden="true" />
          </button>

          <button
            type="button"
            aria-label="Open menu"
            className="rounded-md p-2.5 text-text-muted transition-colors hover:bg-bg-surface hover:text-text-primary md:hidden"
          >
            <Menu className="size-4" aria-hidden="true" />
          </button>

          <button
            type="button"
            aria-label="User menu"
            className="hidden items-center gap-2 rounded-md p-1 transition-colors hover:bg-bg-surface md:inline-flex"
          >
            <span className="flex size-8 items-center justify-center rounded-full bg-bg-surface text-xs font-semibold text-text-primary">
              TM
            </span>
            <span className="pr-1 text-sm font-medium text-text-muted">
              Account
            </span>
          </button>
        </nav>
      </div>
    </header>
  );
}
