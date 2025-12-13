// components/IncidentMap.tsx
"use client";

import dynamic from "next/dynamic";
import type { Incident } from "@/types/incident";
import { useEffect, useState } from "react";
import "leaflet/dist/leaflet.css";

const MapContainer = dynamic(
  () => import("react-leaflet").then((mod) => mod.MapContainer),
  { ssr: false }
);
const TileLayer = dynamic(
  () => import("react-leaflet").then((mod) => mod.TileLayer),
  { ssr: false }
);
const Marker = dynamic(
  () => import("react-leaflet").then((mod) => mod.Marker),
  { ssr: false }
);
const Popup = dynamic(
  () => import("react-leaflet").then((mod) => mod.Popup),
  { ssr: false }
);

let leafletInitialized = false;

function initializeLeaflet() {
  if (leafletInitialized || typeof window === "undefined") return;
  
  import("leaflet").then((L) => {
    // Fix Leaflet's default icon path
    delete (L.Icon.Default.prototype as any)._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: "/leaflet/marker-icon-2x.png",
      iconUrl: "/leaflet/marker-icon.png",
      shadowUrl: "/leaflet/marker-shadow.png",
    });
    
    leafletInitialized = true;
  });
}

export default function IncidentMap({ incidents }: { incidents: Incident[] }) {
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    initializeLeaflet();
    setMounted(true);
  }, []);
  
  if (!mounted) return <div className="w-full h-full bg-slate-800" />;
  const defaultCenter: [number, number] = [6.705, 80.384]; // Ratnapura-ish
  const center: [number, number] =
    incidents.length > 0
      ? ([incidents[0].latitude, incidents[0].longitude] as [number, number])
      : defaultCenter;

  return (
    <MapContainer
      center={center}
      zoom={11}
      className="w-full h-full"
      scrollWheelZoom={false}
    >
      <TileLayer
        attribution="&copy; OpenStreetMap contributors"
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {incidents.map((inc) => (
        <Marker
          key={inc.id}
          position={[inc.latitude, inc.longitude]}
        >
          <Popup>
            <div className="text-xs">
              <p className="font-semibold">{inc.incidentType}</p>
              <p>Severity: {inc.severity}</p>
              <p>Status: {inc.status}</p>
              <p>{new Date(inc.timestamp).toLocaleString()}</p>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
