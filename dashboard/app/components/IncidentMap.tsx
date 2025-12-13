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
let DefaultIcon: any = null;
let IconCache: { [key: number]: any } = {};

const SEVERITY_COLORS = {
  1: { name: "green", hex: "#22c55e" },    // Lowest - Green
  2: { name: "blue", hex: "#3b82f6" },     // Low - Blue
  3: { name: "yellow", hex: "#eab308" },   // Medium - Yellow
  4: { name: "red", hex: "#ef4444" },      // Critical - Red
  5: { name: "orange", hex: "#f97316" },   // Very Critical - Orange
};

function getIconBySeverity(severity: number | null) {
  if (typeof window === "undefined" || !DefaultIcon) {
    return undefined;
  }
  
  // Default to severity 3 (yellow) if not specified
  const level = severity ?? 3;
  const clampedLevel = Math.max(1, Math.min(5, level));
  
  // Return cached icon if it exists
  if (IconCache[clampedLevel]) {
    return IconCache[clampedLevel];
  }
  
  try {
    const L = require("leaflet");
    const color = SEVERITY_COLORS[clampedLevel as keyof typeof SEVERITY_COLORS];
    
    // Create SVG as a compact string without extra whitespace
    const svgString = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 25 41"><path d="M12.5 0C5.59 0 0 5.59 0 12.5c0 8.75 12.5 28.75 12.5 28.75S25 21.25 25 12.5C25 5.59 19.41 0 12.5 0z" fill="${color.hex}"/><circle cx="12.5" cy="12.5" r="5" fill="white"/></svg>`;
    
    // Use btoa for reliable data URL encoding
    const encoded = "data:image/svg+xml;base64," + btoa(svgString);
    
    const icon = L.icon({
      iconUrl: encoded,
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
      shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      shadowSize: [41, 41],
    });
    
    IconCache[clampedLevel] = icon;
    return icon;
  } catch (err) {
    console.error("Failed to create colored icon:", err);
    return DefaultIcon;
  }
}

function getDefaultIcon() {
  if (typeof window === "undefined" || !DefaultIcon) {
    return undefined;
  }
  return DefaultIcon;
}

function initializeLeaflet() {
  if (leafletInitialized || typeof window === "undefined") return;
  
  try {
    const L = require("leaflet");
    
    // Create a default icon synchronously
    DefaultIcon = L.icon({
      iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
      iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
      shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
      shadowSize: [41, 41],
    });
    
    leafletInitialized = true;
  } catch (err) {
    console.error("Failed to initialize Leaflet icon:", err);
  }
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
          position={[inc.latitude || 0, inc.longitude || 0]}
          icon={getIconBySeverity(inc.severity ?? null)}
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
