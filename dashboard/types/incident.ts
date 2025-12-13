// types/incident.ts
export type Incident = {
  id: string;
  incidentType: "Landslide" | "Flood" | "Road Block" | "Power Line Down";
  severity: 1 | 2 | 3 | 4 | 5;
  latitude: number;
  longitude: number;
  timestamp: string;
  photoUrl?: string;
  status: "Pending Sync" | "Synced";
};
