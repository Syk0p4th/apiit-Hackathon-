"use client";

import { useEffect, useState } from "react";
import type { Incident } from "@/types/incident";
import { getSupabaseClient } from "@/lib/superbaseClient";
import IncidentMap from "../components/IncidentMap";
import IncidentTable from "../components/IncidentTable";

export const dynamic = "force-dynamic";

export default function DashboardPage() {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [isOnline, setIsOnline] = useState(true);
  const [isReady, setIsReady] = useState(false);

  // Online / offline badge
  useEffect(() => {
    if (typeof window === "undefined") return;
    const updateStatus = () => setIsOnline(navigator.onLine);
    updateStatus();
    window.addEventListener("online", updateStatus);
    window.addEventListener("offline", updateStatus);
    return () => {
      window.removeEventListener("online", updateStatus);
      window.removeEventListener("offline", updateStatus);
    };
  }, []);

  // Poll Supabase directly every 10s
  useEffect(() => {
    const fetchIncidents = async () => {
      const supabase = getSupabaseClient();
      if (!supabase) {
        console.warn("Supabase client not initialized - environment variables missing");
        return;
      }
      
      const { data, error } = await supabase
        .from("incidents") // table name your teammate created
        .select("*")
        .order("timestamp", { ascending: false });

      if (error) {
        console.error("Supabase fetch error:", error);
        return;
      }

      const mapped: Incident[] =
        data?.map((row: any) => ({
          id: row.id,
          incidentType: row.incident_type,
          severity: row.severity,
          latitude: row.latitude,
          longitude: row.longitude,
          timestamp: row.timestamp,
          photoUrl: row.photo_url ?? undefined,
          status: (row.status as "Pending Sync" | "Synced") ?? "Synced",
        })) ?? [];

      setIncidents(mapped);
      setIsReady(true);
    };

    fetchIncidents();
    const interval = setInterval(fetchIncidents, 10_000);
    return () => clearInterval(interval);
  }, []);

  const total = incidents.length;
  const critical = incidents.filter((i) => i.severity === 1).length;
  const pending = incidents.filter((i) => i.status === "Pending Sync").length;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold">Incidents Overview</h2>
        <span
          className={
            "px-2 py-1 rounded-full text-xs border " +
            (isOnline
              ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/40"
              : "bg-amber-500/10 text-amber-400 border-amber-500/40")
          }
        >
          {isOnline ? "Online: receiving sync" : "Offline: waiting for sync"}
        </span>
      </div>

      <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard label="Total incidents" value={total.toString()} />
        <StatCard label="Critical (S1)" value={critical.toString()} />
        <StatCard label="Pending sync" value={pending.toString()} />
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <div className="lg:col-span-3 h-[420px] bg-slate-900 rounded-xl border border-slate-800 overflow-hidden">
          <IncidentMap incidents={incidents} />
        </div>
        <div className="lg:col-span-2 bg-slate-900 rounded-xl border border-slate-800">
          <IncidentTable incidents={incidents} />
        </div>
      </section>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl px-4 py-3">
      <p className="text-xs text-slate-400">{label}</p>
      <p className="text-2xl font-semibold mt-1">{value}</p>
    </div>
  );
}
