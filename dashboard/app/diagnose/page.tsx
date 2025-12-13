"use client";

import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";

export default function DeepDiagnosePage() {
    const [logs, setLogs] = useState<string[]>([]);

    const addLog = (msg: string) => setLogs(prev => [...prev, `${new Date().toISOString().split('T')[1].slice(0, 8)} ${msg}`]);

    useEffect(() => {
        const runDiagnostics = async () => {
            addLog("Starting diagnostics...");

            const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
            const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

            if (!url || !key) {
                addLog("ERROR: Env vars missing!");
                return;
            }

            const supabase = createClient(url, key);

            // 1. Simple count
            addLog("1. Testing simple count on 'reports'...");
            const countRes = await supabase.from('reports').select('*', { count: 'exact', head: true });
            if (countRes.error) {
                addLog(`ERROR: Count failed. ${countRes.error.message}`);
                addLog(`Hint: Check RLS policies. Does 'anon' have SELECT permissions?`);
                return;
            } else {
                addLog(`Success: Found ${countRes.count} rows (metadata check).`);
            }

            // 2. Fetch actual data with specific columns (mimicking dashboard)
            addLog("2. Fetching dashboard columns...");
            const columns = [
                "id", "title", "description", "reporter_name", "incident_type",
                "severity", "incident_time", "latitude", "longitude",
                "synced", "sync_attempts", "created_at", "updated_at", "user_id"
            ];

            const dataRes = await supabase.from('reports').select(columns.join(",")).limit(5);

            if (dataRes.error) {
                addLog(`ERROR: Data fetch failed. ${dataRes.error.message}`);
                addLog(`Potential causes: Column name mismatch? RLS blocking rows?`);
            } else {
                addLog(`Success: Fetched ${dataRes.data?.length} rows.`);
                if (dataRes.data && dataRes.data.length > 0) {
                    addLog("Sample Row 0: " + JSON.stringify(dataRes.data[0], null, 2));
                } else {
                    addLog("WARNING: Query succeeded but returned 0 rows.");
                    addLog("If table is not empty, this is 100% an RLS (Row Level Security) issue.");
                }
            }
        };

        runDiagnostics();
    }, []);

    return (
        <div className="p-8 font-mono bg-slate-950 text-slate-200 min-h-screen">
            <h1 className="text-xl font-bold mb-4 text-emerald-400">Supabase Deep Diagnostic</h1>
            <div className="p-4 border border-slate-800 rounded bg-slate-900 font-mono text-xs overflow-auto h-[600px]">
                {logs.map((log, i) => (
                    <div key={i} className="mb-1 border-b border-slate-800/50 pb-1">{log}</div>
                ))}
            </div>
        </div>
    );
}
