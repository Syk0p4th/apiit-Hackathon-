export const INCIDENT_TYPE_MAP: Record<number, string> = {
  1: "Landslide",
  2: "Flood",
  3: "Road Block",
  4: "Power Line Down",
};

export function getIncidentTypeName(typeId: number | null | undefined): string {
  if (!typeId) return "-";
  return INCIDENT_TYPE_MAP[typeId] ?? String(typeId);
}
