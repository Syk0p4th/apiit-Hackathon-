// app/page.tsx
import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-50">
      <div className="text-center space-y-4">
        <h1 className="text-2xl font-semibold">Project Aegis</h1>
        <p className="text-sm text-slate-400">
          Command Dashboard for Ratnapura disaster response.
        </p>
        <Link
          href="/dashboard"
          className="inline-flex items-center px-4 py-2 rounded-md bg-emerald-600 text-sm"
        >
          Open Dashboard
        </Link>
      </div>
    </main>
  );
}
