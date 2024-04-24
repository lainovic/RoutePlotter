import React from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { GeoPoint, log } from "./utils";

export default function Map({ routePoints }: { routePoints: GeoPoint[] }) {
  const [map, setMap] = React.useState<L.Map | null>(null);
  const routeMarkers = React.useRef<L.LayerGroup>(L.layerGroup());

  React.useEffect(() => {
    const newMap = L.map("map");
    log("Map created");

    // Add tile layer from OpenStreetMap
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap contributors",
    }).addTo(newMap);

    setMap(newMap);

    // Clean up when component unmounts
    return () => {
      newMap.remove();
      log("Map removed");
    };
  }, []);

  React.useEffect(() => {
    if (map) {
      map.removeLayer(routeMarkers.current);
      const markers = createMarkers(map, routePoints);
      markers.addTo(map);
      routeMarkers.current = markers;
    }
  }, [routePoints]);

  log("Map render with routePoints:", routePoints);
  return <div id="map" style={{ height: "600px" }}></div>;
}

function createMarkers(map: L.Map, routePoints: GeoPoint[]): L.LayerGroup {
  const markers = L.layerGroup();
  routePoints.forEach((point: GeoPoint, index: number) => {
    const { latitude, longitude } = point;
    if (index === 0) {
      map.setView([latitude, longitude], 13);
    }
    // treat the first and last point differently
    const color =
      index === 0 ? "red" : index === routePoints.length - 1 ? "blue" : "green";
    const radius = index === 0 || index === routePoints.length - 1 ? 8 : 4;
    const m = L.circleMarker([latitude, longitude], {
      radius: radius,
      fillColor: color,
      color: "#000",
      weight: 1,
      opacity: 1,
      fillOpacity: 0.8,
    });
    markers.addLayer(m);
  });
  return markers;
}
