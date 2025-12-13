import type { Incident } from "@/types/incident";
import { getIncidentTypeName } from "@/lib/incidentTypes";

export default function IncidentDetail({
  incident,
  onClose,
  onShowOnMap,
}: {
  incident: Incident | null;
  onClose: () => void;
  onShowOnMap: (lat: number, lng: number) => void;
}) {
  if (!incident) return null;

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="absolute right-0 top-0 bottom-0 w-96 bg-slate-900 border-l border-slate-800 shadow-lg flex flex-col z-50">
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b border-slate-800">
          <h2 className="text-lg font-semibold">{getIncidentTypeName(incident.incidentType)}</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-slate-800 rounded transition text-lg"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-4 space-y-4">
          {/* ID */}
          <div>
            <p className="text-xs text-slate-500 mb-1">Incident ID</p>
            <p className="text-sm font-mono text-slate-300">{incident.id}</p>
          </div>

          {/* Title */}
          {incident.title && (
            <div>
              <p className="text-xs text-slate-500 mb-1">Title</p>
              <p className="text-sm text-slate-300">{incident.title}</p>
            </div>
          )}

          {/* Description */}
          {incident.description && (
            <div>
              <p className="text-xs text-slate-500 mb-1">Description</p>
              <p className="text-sm text-slate-300 whitespace-pre-wrap break-words">
                {incident.description}
              </p>
            </div>
          )}

          {/* Severity */}
          <div>
            <p className="text-xs text-slate-500 mb-1">Severity Level</p>
            <div className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-full"
                style={{
                  backgroundColor:
                    incident.severity === 4
                      ? "#ef4444"
                      : incident.severity === 5
                        ? "#f97316"
                        : incident.severity === 3
                          ? "#eab308"
                          : incident.severity === 2
                            ? "#3b82f6"
                            : "#22c55e",
                }}
              />
              <span className="text-sm text-slate-300">
                {incident.severity === 4
                  ? "Critical"
                  : incident.severity === 5
                    ? "Very Critical"
                    : incident.severity === 3
                      ? "Medium"
                      : incident.severity === 2
                        ? "Low"
                        : "Lowest"}
              </span>
            </div>
          </div>

          {/* Location */}
          <div>
            <p className="text-xs text-slate-500 mb-1">Location (GPS)</p>
            <p className="text-sm font-mono text-slate-300">
              {(incident.latitude ?? 0).toFixed(6)}, {(incident.longitude ?? 0).toFixed(6)}
            </p>
          </div>

          {/* Reporter */}
          {incident.reporterName && (
            <div>
              <p className="text-xs text-slate-500 mb-1">Reporter</p>
              <p className="text-sm text-slate-300">{incident.reporterName}</p>
            </div>
          )}

          {/* Sync Status */}
          <div>
            <p className="text-xs text-slate-500 mb-1">Sync Status</p>
            <div className="flex items-center gap-2">
              <div
                className={`w-2 h-2 rounded-full ${incident.synced ? "bg-emerald-500" : "bg-amber-500"
                  }`}
              />
              <span className="text-sm text-slate-300">{incident.status}</span>
            </div>
          </div>

          {/* Sync Attempts */}
          {incident.syncAttempts !== null && (
            <div>
              <p className="text-xs text-slate-500 mb-1">Sync Attempts</p>
              <p className="text-sm text-slate-300">{incident.syncAttempts}</p>
            </div>
          )}

          {/* Timestamp */}
          {incident.timestamp && (
            <div>
              <p className="text-xs text-slate-500 mb-1">Reported</p>
              <p className="text-sm text-slate-300">
                {new Date(incident.timestamp).toLocaleString()}
              </p>
            </div>
          )}

          {/* Created At */}
          {incident.createdAt && (
            <div>
              <p className="text-xs text-slate-500 mb-1">Created</p>
              <p className="text-sm text-slate-300">
                {new Date(incident.createdAt).toLocaleString()}
              </p>
            </div>
          )}

          {/* Updated At */}
          {incident.updatedAt && (
            <div>
              <p className="text-xs text-slate-500 mb-1">Last Updated</p>
              <p className="text-sm text-slate-300">
                {new Date(incident.updatedAt).toLocaleString()}
              </p>
            </div>
          )}

          {/* Photo/Image */}
          {incident.images && incident.images.length > 0 && (
            <div>
              <p className="text-xs text-slate-500 mb-2">Photo</p>
              <img
                src={
                  incident.images[0].startsWith("http") || incident.images[0].startsWith("data:")
                    ? incident.images[0]
                    : `data:image/jpeg;base64,${incident.images[0]}`
                }
                alt={incident.title || "Incident photo"}
                className="w-full h-auto rounded border border-slate-700 max-h-96 object-cover"
                onError={(e) => {
                  console.error("Failed to load image with current format, trying PNG...");
                  const img = e.currentTarget as HTMLImageElement;
                  const photoUrl = incident.images![0]!;
                  // If it failed and it's a base64 image, try with PNG format instead
                  if (!photoUrl.startsWith("http") && !photoUrl.startsWith("data:")) {
                    img.src = `data:image/png;base64,${photoUrl}`;
                  } else {
                    img.style.display = "none";
                  }
                }}
              />
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 flex gap-3">
          <button
            onClick={() => {
              if (incident.latitude && incident.longitude) {
                onShowOnMap(incident.latitude, incident.longitude);
              }
            }}
            className="flex-1 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 rounded text-sm text-white transition font-medium"
          >
            Show on Map
          </button>
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded text-sm text-slate-300 transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
