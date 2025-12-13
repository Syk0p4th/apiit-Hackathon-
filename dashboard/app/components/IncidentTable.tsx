// components/IncidentTable.tsx
"use client";

import type { Incident } from "@/types/incident";

export default function IncidentTable({ incidents }: { incidents: Incident[] }) {
  return (
    <div className="p-3 text-xs">
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-medium">Incoming reports</h3>
        <span className="text-slate-400">Auto‑refreshing every 10 seconds</span>
      </div>
      <div className="border border-slate-800 rounded-lg overflow-hidden">
        <table className="w-full border-collapse">
          <thead className="bg-slate-950 text-slate-400">
            <tr>
              <th className="px-2 py-2 text-left">ID</th>
              <th className="px-2 py-2 text-left">Type</th>
              <th className="px-2 py-2 text-left">Severity</th>
              <th className="px-2 py-2 text-left">Status</th>
              <th className="px-2 py-2 text-left">Time</th>
            </tr>
          </thead>
          <tbody>
            {incidents.map((i) => (
              <tr key={i.id} className="border-t border-slate-800">
                <td className="px-2 py-2">{i.id}</td>
                <td className="px-2 py-2">{i.incidentType}</td>
                <td className="px-2 py-2">S{i.severity}</td>
                <td className="px-2 py-2">
                  <span
                    className={
                      "px-2 py-1 rounded-full text-[10px] border " +
                      (i.status === "Pending Sync"
                        ? "bg-amber-500/10 text-amber-400 border-amber-500/40"
                        : "bg-emerald-500/10 text-emerald-400 border-emerald-500/40")
                    }
                  >
                    {i.status}
                  </span>
                </td>
                <td className="px-2 py-2">
                  {new Date(i.timestamp).toLocaleTimeString()}
                </td>
              </tr>
            ))}
            {incidents.length === 0 && (
              <tr>
                <td
                  className="px-2 py-4 text-center text-slate-500"
                  colSpan={5}
                >
                  No incidents yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
