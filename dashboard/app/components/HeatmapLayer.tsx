"use client";

import { useEffect } from "react";
import { useMap } from "react-leaflet";
import type { Incident } from "@/types/incident";

export default function HeatmapLayer({ incidents }: { incidents: Incident[] }) {
    const map = useMap();

    useEffect(() => {
        if (!map) return;

        // Dynamically require leaflet to avoid SSR issues with 'window'
        const L = require("leaflet");
        require("leaflet.heat");

        // Convert incidents to heatmap points: [lat, lng, intensity]
        const points = incidents
            .filter((i) => i.latitude && i.longitude)
            .map((i) => {
                // You can optionally use severity to weight the points
                // e.g. [i.latitude, i.longitude, i.severity * 0.2]
                // For now, let's just stick to density (intensity 1.0)
                return [i.latitude, i.longitude, 0.5]; // 0.5 intensity per point
            });

        const heat = (L as any).heatLayer(points, {
            radius: 25,
            blur: 15,
            maxZoom: 10,
            gradient: {
                0.4: "blue",
                0.65: "lime",
                1: "red",
            },
        });

        heat.addTo(map);

        return () => {
            map.removeLayer(heat);
        };
    }, [incidents, map]);

    return null;
}
