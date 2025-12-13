// ...existing code...
import "leaflet/dist/leaflet.css";
// ...existing code...// ...existing code...
import "leaflet/dist/leaflet.css";
// ...existing code..."use client";

import Link from "next/link";

export default function Navigation() {
  return (
    <nav className="w-full bg-white shadow rounded-2xl mb-6 px-6 py-4 flex items-center justify-between">
      <h1 className="text-xl font-bold">🚨 Disaster Management</h1>

      <div className="flex gap-6 text-sm font-medium">
        <Link href="/dashboard" className="hover:text-red-600">
          Dashboard
        </Link>
        <Link href="/incidents" className="hover:text-red-600">
          Incidents
        </Link>
        <Link href="/map" className="hover:text-red-600">
          Live Map
        </Link>
        <Link href="/resources" className="hover:text-red-600">
          Resources
        </Link>
        <Link href="/settings" className="hover:text-red-600">
          Settings
        </Link>
      </div>
    </nav>
  );
}
