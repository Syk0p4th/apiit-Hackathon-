// components/IncidentTable.tsx
"use client";

import type { Incident } from "@/types/incident";
import { getIncidentTypeName } from "@/lib/incidentTypes";

function formatDateTime(value?: string | null) {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleString();
}

export default function IncidentTable({
  incidents,
  onSelectIncident
}: {
  incidents: Incident[];
  onSelectIncident?: (incident: Incident) => void;
}) {
  return (
    <div className="p-3 flex flex-col h-full">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-slate-200">Latest reports</h3>
        <span className="text-xs text-slate-400">{incidents.length} shown</span>
      </div>

      <div className="overflow-auto flex-1">
        <table className="w-full text-sm">
          <thead className="text-slate-400 sticky top-0 bg-slate-900">
            <tr className="border-b border-slate-800">
              <th className="text-left py-2 pr-3">Title</th>
              <th className="text-left py-2 pr-3">Reporter</th>
              <th className="text-left py-2 pr-3">Type</th>
              <th className="text-left py-2 pr-3">Severity</th>
              <th className="text-left py-2 pr-3">Time</th>
              <th className="text-left py-2 pr-3">Sync</th>
              <th className="text-left py-2 pr-0">Attempts</th>
            </tr>
          </thead>

          <tbody className="text-slate-200">
            {incidents.map((i) => (
              <tr
                key={i.id}
                className="border-b border-slate-800/70 hover:bg-slate-800/30 cursor-pointer transition"
                onClick={() => onSelectIncident?.(i)}
              >
                <td className="py-2 pr-3">
                  <div className="font-medium">{i.title ?? "-"}</div>
                  {i.description ? (
                    <div className="text-xs text-slate-400 line-clamp-1">{i.description}</div>
                  ) : null}
                </td>
                <td className="py-2 pr-3">{i.reporterName ?? "-"}</td>
                <td className="py-2 pr-3">{getIncidentTypeName(i.incidentType)}</td>
                <td className="py-2 pr-3">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-2 h-2 rounded-full"
                      style={{
                        backgroundColor:
                          i.severity === 5
                            ? "#ef4444"
                            : i.severity === 4
                              ? "#f97316"
                              : i.severity === 3
                                ? "#eab308"
                                : i.severity === 2
                                  ? "#3b82f6"
                                  : "#22c55e",
                      }}
                    />
                    {i.severity ?? "-"}
                  </div>
                </td>
                <td className="py-2 pr-3">{formatDateTime(i.incidentTime ?? i.timestamp)}</td>
                <td className="py-2 pr-3">
                  <span
                    className={
                      "px-2 py-0.5 rounded-full text-xs border " +
                      (i.status === "Synced"
                        ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/30"
                        : "bg-amber-500/10 text-amber-300 border-amber-500/30")
                    }
                  >
                    {i.status}
                  </span>
                </td>
                <td className="py-2 pr-0">{i.syncAttempts ?? 0}</td>
              </tr>
            ))}

            {incidents.length === 0 ? (
              <tr>
                <td className="py-6 text-center text-slate-400" colSpan={7}>
                  No reports found.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
