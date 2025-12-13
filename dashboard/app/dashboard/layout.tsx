// app/dashboard/layout.tsx
import type { ReactNode } from "react";

export const dynamic = "force-dynamic";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen flex bg-slate-950 text-slate-50">
      <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col">
        <div className="px-6 py-4 border-b border-slate-800">
          <h1 className="text-xl font-semibold">Project Aegis HQ</h1>
          <p className="text-xs text-slate-400">Ratnapura Disaster Command</p>
        </div>
        <nav className="flex-1 px-4 py-4 space-y-2 text-sm">
          <span className="block px-3 py-2 rounded-md bg-slate-800">
            Incidents
          </span>
        </nav>
        <div className="px-4 py-4 border-t border-slate-800 text-xs text-slate-400">
          Offline‑first disaster response dashboard.
        </div>
      </aside>

      <div className="flex-1 flex flex-col">
        <header className="h-14 border-b border-slate-800 flex items-center justify-between px-6 bg-slate-950/80">
          <div>
            <h2 className="text-sm font-medium">Command Dashboard</h2>
            <p className="text-xs text-slate-400">
              Live incident feed from field responders
            </p>
          </div>
        </header>
        <main className="flex-1 p-6 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
