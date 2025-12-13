"use client";

import { useEffect, useState } from "react";
import type { Incident } from "@/types/incident";
import { supabase } from "@/lib/supabaseClient";
import { getIncidentTypeName } from "@/lib/incidentTypes";
import IncidentMap from "../components/IncidentMap";
import IncidentTable from "../components/IncidentTable";
import IncidentDetail from "../components/IncidentDetail";

// NOTE: Do NOT export `dynamic` from a client component/page.
// export const dynamic = "force-dynamic";

export default function DashboardPage() {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [isOnline, setIsOnline] = useState(true);
  const [isReady, setIsReady] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string>("");
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);
  const [filterType, setFilterType] = useState<string>("all");
  const [filterSeverity, setFilterSeverity] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"time" | "severity" | "type">("time");

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
        let { data, error } = await supabase
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
              "photo_url",
            ].join(",")
          )
          .order("incident_time", { ascending: false });

        // If error (possibly due to photo_url column not existing), retry without it
        if (error) {
          console.warn("Query with photo_url failed, retrying without photo_url...", error);
          const retryQuery = await supabase
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
          data = retryQuery.data;
          error = retryQuery.error;
        }

        if (cancelled) return;

        if (error) {
          console.error("Supabase fetch error - Full error object:", JSON.stringify(error, null, 2));
          console.error("Error code:", (error as any)?.code);
          console.error("Error message:", (error as any)?.message);
          console.error("Error details:", (error as any)?.details);
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
              photoUrl: row.photo_url ?? null,

              // UI fields
              timestamp,
              status: synced ? "Synced" : "Pending Sync",
            };

            return incident;
          })
          .filter(Boolean) as Incident[];

        console.log("Mapped incidents (after filtering):", mapped);
        setIncidents(mapped);
        setLastUpdated(new Date().toLocaleTimeString());
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

  // Apply filters and sorting
  const filteredIncidents = incidents
    .filter((inc) => {
      // Filter by type - compare using getIncidentTypeName to convert number to name
      if (filterType !== "all" && getIncidentTypeName(inc.incidentType) !== filterType) return false;
      // Filter by severity range
      const sev = inc.severity ?? 0;
      if (filterSeverity === "low" && sev > 2) return false;
      if (filterSeverity === "high" && sev <= 2) return false;
      return true;
    })
    .sort((a, b) => {
      if (sortBy === "severity") {
        return (b.severity ?? 0) - (a.severity ?? 0);
      }
      if (sortBy === "type") {
        const typeA = String(a.incidentType ?? "");
        const typeB = String(b.incidentType ?? "");
        return typeA.localeCompare(typeB);
      }
      // Sort by time (newest first)
      return new Date(b.timestamp || 0).getTime() - new Date(a.timestamp || 0).getTime();
    });

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
        <div className="flex items-center gap-4">
          <span className="text-xs text-slate-400">
            Last updated: <span className="text-slate-200 font-mono">{lastUpdated}</span>
          </span>
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
      </div>

      <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard label="Total incidents" value={total.toString()} />
        <StatCard label="Critical (S1)" value={critical.toString()} />
        <StatCard label="Pending sync" value={pending.toString()} />
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <div className="lg:col-span-2">
          <div className="h-[378px] bg-slate-900 rounded-xl border border-slate-800 overflow-hidden">
            <IncidentMap incidents={incidents} />
          </div>
          <div className="mt-4 bg-slate-900 rounded-xl border border-slate-800 p-4">
            <h3 className="text-sm font-semibold text-slate-200 mb-3">Severity Levels</h3>
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <div className="w-4 h-4 rounded-full" style={{ backgroundColor: "#ef4444" }}></div>
                <span className="text-xs text-slate-400">Severity 5 - Very Critical</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-4 h-4 rounded-full" style={{ backgroundColor: "#f97316" }}></div>
                <span className="text-xs text-slate-400">Severity 4 - Critical</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-4 h-4 rounded-full" style={{ backgroundColor: "#eab308" }}></div>
                <span className="text-xs text-slate-400">Severity 3 - Medium</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-4 h-4 rounded-full" style={{ backgroundColor: "#3b82f6" }}></div>
                <span className="text-xs text-slate-400">Severity 2 - Low</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-4 h-4 rounded-full" style={{ backgroundColor: "#22c55e" }}></div>
                <span className="text-xs text-slate-400">Severity 1 - Lowest</span>
              </div>
            </div>
          </div>
        </div>
        <div className="lg:col-span-3 bg-slate-900 rounded-xl border border-slate-800 overflow-hidden flex flex-col">
          <div className="p-4 border-b border-slate-800 space-y-3">
            <div className="flex gap-3">
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="text-xs px-2 py-1 bg-slate-800 border border-slate-700 rounded text-slate-300"
              >
                <option value="all">All Types</option>
                <option value="Landslide">Landslide</option>
                <option value="Flood">Flood</option>
                <option value="Road Block">Road Block</option>
                <option value="Power Line Down">Power Line Down</option>
              </select>
              <select
                value={filterSeverity}
                onChange={(e) => setFilterSeverity(e.target.value)}
                className="text-xs px-2 py-1 bg-slate-800 border border-slate-700 rounded text-slate-300"
              >
                <option value="all">All Severity</option>
                <option value="low">Low (1-2)</option>
                <option value="high">High (3-5)</option>
              </select>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as "time" | "severity" | "type")}
                className="text-xs px-2 py-1 bg-slate-800 border border-slate-700 rounded text-slate-300"
              >
                <option value="time">Sort by Time</option>
                <option value="severity">Sort by Severity</option>
                <option value="type">Sort by Type</option>
              </select>
            </div>
            <p className="text-xs text-slate-400">Showing {filteredIncidents.length} of {incidents.length} incidents</p>
          </div>
          <div className="flex-1 overflow-auto">
            <IncidentTable 
              incidents={filteredIncidents} 
              onSelectIncident={setSelectedIncident}
            />
          </div>
        </div>
      </section>

      <IncidentDetail 
        incident={selectedIncident}
        onClose={() => setSelectedIncident(null)}
      />
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