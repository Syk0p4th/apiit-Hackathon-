"use client";

import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";

export default function TestConnectionPage() {
    const [status, setStatus] = useState("Checking...");
    const [envStatus, setEnvStatus] = useState<any>({});

    useEffect(() => {
        const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

        setEnvStatus({
            urlLength: url ? url.length : 0,
            urlPreview: url ? url.slice(0, 8) + "..." : "MISSING",
            keyLength: key ? key.length : 0,
            keyPreview: key ? key.slice(0, 8) + "..." : "MISSING",
        });

        if (!url || !key) {
            setStatus("Environment variables missing");
            return;
        }

        const testConnection = async () => {
            try {
                const supabase = createClient(url, key);
                const { data, error } = await supabase.from('reports').select('count', { count: 'exact', head: true });

                if (error) {
                    setStatus(`Connection failed: ${error.message} (Code: ${error.code})`);
                } else {
                    setStatus("Connection successful! Supabase is reachable.");
                }
            } catch (err: any) {
                setStatus(`Unexpected error: ${err.message}`);
            }
        };

        testConnection();
    }, []);

    return (
        <div className="p-8 font-mono">
            <h1 className="text-xl font-bold mb-4">Supabase Connection Test</h1>

            <div className="mb-6 p-4 border rounded bg-slate-100 dark:bg-slate-900">
                <h2 className="font-semibold mb-2">Environment Variables</h2>
                <ul className="space-y-2">
                    <li>
                        URL: {envStatus.urlPreview}
                        <span className="text-sm text-slate-500 ml-2">({envStatus.urlLength} chars)</span>
                    </li>
                    <li>
                        Key: {envStatus.keyPreview}
                        <span className="text-sm text-slate-500 ml-2">({envStatus.keyLength} chars)</span>
                    </li>
                </ul>
            </div>

            <div className="p-4 border rounded bg-slate-100 dark:bg-slate-900">
                <h2 className="font-semibold mb-2">Connection Status</h2>
                <p className={status.includes("successful") ? "text-green-600" : "text-red-600"}>
                    {status}
                </p>
            </div>
        </div>
    );
}
