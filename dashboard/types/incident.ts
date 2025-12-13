export type SyncStatus = "Pending Sync" | "Synced";

export type Incident = {
  // reports table columns
  id: string;
  title?: string | null;
  description?: string | null;
  reporterName?: string | null;
  incidentType?: number | null;
  severity?: number | null;
  incidentTime?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  synced?: boolean | null;
  syncAttempts?: number | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  userId?: string | null;

  // UI-friendly fields (derived in the dashboard mapping)
  timestamp: string;
  status: SyncStatus;

  // kept for compatibility (not in reports schema)
  photoUrl?: string;
};