"use client";

import { useEffect, useState } from "react";
import type { Incident } from "@/types/incident";
import { supabase } from "@/lib/supabaseClient";
import IncidentMap from "../components/IncidentMap";
import IncidentTable from "../components/IncidentTable";

// NOTE: Do NOT export `dynamic` from a client component/page.
// export const dynamic = "force-dynamic";

export default function DashboardPage() {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [isOnline, setIsOnline] = useState(true);
  const [isReady, setIsReady] = useState(false);

  console.log("[DashboardPage] Rendering - incidents:", incidents.length, "isReady:", isReady);

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

  // Fetch + auto-update (realtime) + polling fallback
  useEffect(() => {
    console.log("=== Dashboard useEffect starting ===");
    console.log("Supabase client available?", !!supabase);

    let cancelled = false;

    const fetchIncidents = async () => {
      try {
        console.log("fetchIncidents() called at", new Date().toISOString());
        
        // First, try a simple query to see if we can access the table at all
        console.log("Testing basic access to reports table...");
        const testQuery = await supabase
          .from("reports")
          .select("id")
          .limit(1);
        
        console.log("Test query result:", testQuery);
        
        // Now do the full query
        const { data, error } = await supabase
          .from("reports")
          .select(
            [
              "id",
              "title",
              "description",
              "reporter_name",
              "incident_type",
              "severity",
              "incident_time",
              "latitude",
              "longitude",
              "synced",
              "sync_attempts",
              "created_at",
              "updated_at",
              "user_id",
            ].join(",")
          )
          .order("incident_time", { ascending: false });

        if (cancelled) return;

        if (error) {
          console.error("Supabase fetch error:", error);
          console.error("Error code:", error.code);
          console.error("Error message:", error.message);
          console.error("Error details:", error.details);
          setIsReady(true);
          return;
        }

        console.log("Raw data from Supabase (reports table):", data);
        console.log("Total records fetched:", data?.length ?? 0);

        const mapped: Incident[] = (data ?? [])
          .map((row: any) => {
            const incidentTime = row.incident_time ?? null;
            const createdAt = row.created_at ?? null;
            const timestamp = (incidentTime || createdAt || "") as string;

            const latitudeOk = typeof row.latitude === "number";
            const longitudeOk = typeof row.longitude === "number";
            
            if (!latitudeOk || !longitudeOk) {
              console.warn("Skipping row - missing coordinates:", {
                id: row.id,
                latitude: row.latitude,
                longitude: row.longitude,
              });
              return null;
            }

            const synced = Boolean(row.synced ?? false);

            const incident: Incident = {
              id: String(row.id),
              title: row.title ?? null,
              description: row.description ?? null,
              reporterName: row.reporter_name ?? null,
              incidentType: typeof row.incident_type === "number" ? row.incident_type : row.incident_type ?? null,
              severity: typeof row.severity === "number" ? row.severity : row.severity ?? null,
              incidentTime,
              latitude: row.latitude, // number (guarded above)
              longitude: row.longitude, // number (guarded above)
              synced,
              syncAttempts: typeof row.sync_attempts === "number" ? row.sync_attempts : row.sync_attempts ?? null,
              createdAt,
              updatedAt: row.updated_at ?? null,
              userId: row.user_id ?? null,

              // UI fields
              timestamp,
              status: synced ? "Synced" : "Pending Sync",
            };

            return incident;
          })
          .filter(Boolean) as Incident[];

        console.log("Mapped incidents (after filtering):", mapped);
        setIncidents(mapped);
        setIsReady(true);
      } catch (err) {
        console.error("Exception during fetchIncidents:", err);
        setIsReady(true);
      }
    };

    console.log("About to call fetchIncidents() immediately...");
    fetchIncidents();
    const interval = setInterval(fetchIncidents, 10_000);

    const channel = supabase
      .channel("reports-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "reports" }, () => {
        fetchIncidents();
      })
      .subscribe();

    return () => {
      cancelled = true;
      clearInterval(interval);
      // safer cleanup in v2
      channel.unsubscribe();
    };
  }, []);

  const total = incidents.length;
  const critical = incidents.filter((i) => i.severity === 1).length;
  const pending = incidents.filter((i) => i.status === "Pending Sync").length;

  if (!isReady) {
    return (
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Incidents Overview</h2>
        <div className="text-sm text-slate-400">Loading reports…</div>
      </div>
    );
  }

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