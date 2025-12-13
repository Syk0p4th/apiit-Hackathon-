"use client";

import { useMemo } from "react";
import { Circle, Tooltip } from "react-leaflet";
import type { Incident } from "@/types/incident";

interface Cluster {
    id: string;
    lat: number;
    lng: number;
    count: number;
    incidents: Incident[];
}

// Distance in degrees (roughly). 0.01 is approx 1.1km
const CLUSTER_RADIUS = 0.005; // ~550m

export default function DangerZoneLayer({ incidents }: { incidents: Incident[] }) {
    const clusters = useMemo(() => {
        const cls: Cluster[] = [];

        incidents.forEach((incident) => {
            if (!incident.latitude || !incident.longitude) return;

            // Simple greedy clustering
            let found = false;
            for (const c of cls) {
                const dLat = Math.abs(c.lat - incident.latitude);
                const dLng = Math.abs(c.lng - incident.longitude);

                // Use euclidean distance approximation for speed
                if (Math.sqrt(dLat * dLat + dLng * dLng) < CLUSTER_RADIUS) {
                    // Update cluster center (weighted average)
                    const newCount = c.count + 1;
                    c.lat = (c.lat * c.count + incident.latitude) / newCount;
                    c.lng = (c.lng * c.count + incident.longitude) / newCount;
                    c.count = newCount;
                    c.incidents.push(incident);
                    found = true;
                    break;
                }
            }

            if (!found) {
                cls.push({
                    id: `cluster-${incident.id}`, // Use first incident ID as base
                    lat: incident.latitude,
                    lng: incident.longitude,
                    count: 1,
                    incidents: [incident],
                });
            }
        });

        return cls;
    }, [incidents]);

    return (
        <>
            {clusters.map((cluster) => {
                // Style based on density
                const isHighDensity = cluster.count >= 3;

                return (
                    <Circle
                        key={cluster.id}
                        center={[cluster.lat, cluster.lng]}
                        radius={50 + (cluster.count * 20)} // Scale radius with number of people (even smaller)
                        pathOptions={{
                            color: isHighDensity ? "#ef4444" : "#f59e0b", // Red for high, Amber for low
                            fillColor: isHighDensity ? "#ef4444" : "#f59e0b",
                            fillOpacity: isHighDensity ? 0.3 : 0.1,
                            weight: isHighDensity ? 3 : 1, // Thicker border for high density
                        }}
                    >
                        <Tooltip direction="center" permanent={false}>
                            <div className="text-center">
                                <p className="font-bold">
                                    {isHighDensity ? "High Danger Zone" : "Danger Zone"}
                                </p>
                                <p>{cluster.count} Reports</p>
                            </div>
                        </Tooltip>
                    </Circle>
                );
            })}
        </>
    );
}
