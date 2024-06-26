import React from "react";
import L from "leaflet";
import "react-toastify/dist/ReactToastify.css";
import "leaflet/dist/leaflet.css";
import { log, error as logError } from "./logging_utils";
import { createMarker, RouteMarkerNode, createLineFromTo } from "./map_utils";

export default function RouteMap({}: {}) {
  const map = React.useRef<L.Map | null>(null);
  const markers = React.useRef<L.LayerGroup>(L.layerGroup());
  const lines = React.useRef<L.LayerGroup>(L.layerGroup());
  const markerToNode = React.useRef<Map<L.Marker, RouteMarkerNode>>(new Map());

  const routePointIcon = L.divIcon({
    className: "route-point-icon",
    iconSize: [10, 10],
  });

  React.useLayoutEffect(() => {
    const newRouteMapInstance = L.map("map");
    log("RouteMap created");

    // Add tile layer from OpenStreetMap
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap contributors",
    }).addTo(newRouteMapInstance);

    newRouteMapInstance.on("click", (e) => {
      const { lat, lng } = e.latlng;
      addNewMarker(lat, lng, newRouteMapInstance);
    });

    markers.current.addTo(newRouteMapInstance);
    lines.current.addTo(newRouteMapInstance);

    newRouteMapInstance.on("contextmenu", () => {
      // do nothing
    });

    // set the map view to Amsterdam
    newRouteMapInstance.setView([52.379189, 4.899431], 13);

    map.current = newRouteMapInstance;

    return () => {
      newRouteMapInstance.remove();
      log("RouteMap removed");
    };
  }, []);

  function addNewMarker(latitude: number, longitude: number, map: L.Map) {
    const marker = createMarker(latitude, longitude, routePointIcon).addTo(
      markers.current
    );

    marker.on("drag", (e) => {
      const marker = e.target as L.Marker;
      if (!markerToNode.current.has(marker)) {
        logError("Marker not found in map");
        return;
      }
      const node = markerToNode.current.get(marker)!;
      moveLines(node);
    });

    marker.on("contextmenu", (e) => {
      const marker = e.target as L.Marker;
      if (!markerToNode.current.has(marker)) {
        logError("Marker not found in map");
        return;
      }
      const node = markerToNode.current.get(marker)!;
      removeNode(node, map);
      if (node.prev && node.next) {
        createLineFromTo(node.prev, node.next).addTo(lines.current);
      }
    });

    const node: RouteMarkerNode = {
      marker: marker,
      prev: null,
      next: null,
      lineToPrev: null,
      lineToNext: null,
    };

    if (markers.current.getLayers().length > 1) {
      const prevMarker = markers.current.getLayers()[
        markers.current.getLayers().length - 2
      ] as L.Marker;
      const prevNode = markerToNode.current.get(prevMarker)!;
      createLineFromTo(prevNode, node).addTo(lines.current);
      node.prev = prevNode;
      prevNode.next = node;
    }

    markerToNode.current.set(marker, node);
  }

  React.useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      if (event.key === "c" || event.key === "C") {
        const m = map.current;
        if (m) {
          m.removeLayer(markers.current);
          m.removeLayer(lines.current);
          markerToNode.current.clear();
          markers.current = L.layerGroup().addTo(m);
          lines.current = L.layerGroup().addTo(m);
        }
      } else if (event.key === "x" || event.key === "X") {
        const m = map.current;
        if (m) {
          centerAroundMarkers(m);
        }
      } else if (event.key === "p" || event.key === "P") {
        const m = map.current;
        if (m !== null) {
          const latitude = window.prompt("Enter latitude:");
          if (latitude === null) return;
          const longitude = window.prompt("Enter longitude:");
          if (longitude === null) return;
          if (latitude && longitude) {
            const lat = Number(latitude);
            const lng = Number(longitude);
            addNewMarker(lat, lng, m);
            centerAroundMarkers(m);
          }
        }
      }
    };
    document.addEventListener("keypress", handleKeyPress);
    return () => {
      document.removeEventListener("keypress", handleKeyPress);
    };
  }, []);

  function moveLines(node: RouteMarkerNode) {
    if (node.prev) {
      const prev = node.prev.marker.getLatLng();
      const curr = node.marker.getLatLng();
      node.lineToPrev?.setLatLngs([
        [prev.lat, prev.lng],
        [curr.lat, curr.lng],
      ]);
    }
    if (node.next) {
      const next = node.next.marker.getLatLng();
      const curr = node.marker.getLatLng();
      node.lineToNext?.setLatLngs([
        [curr.lat, curr.lng],
        [next.lat, next.lng],
      ]);
    }
  }

  function removeNode(node: RouteMarkerNode, map: L.Map) {
    if (node.prev) {
      map.removeLayer(node.lineToPrev!);
      lines.current.removeLayer(node.lineToPrev!);
      node.prev.next = node.next;
      node.prev.lineToNext = null;
      node.lineToPrev = null;
    }
    if (node.next) {
      map.removeLayer(node.lineToNext!);
      lines.current.removeLayer(node.lineToNext!);
      node.next.prev = node.prev;
      node.next.lineToPrev = null;
      node.lineToNext = null;
    }

    markerToNode.current.delete(node.marker);
    map.removeLayer(node.marker);
    markers.current.removeLayer(node.marker);
  }

  function centerAroundMarkers(map: L.Map) {
    const points = markers.current.getLayers().map((layer) => {
      const marker = layer as L.Marker;
      return marker.getLatLng();
    });
    if (points.length === 0) {
      return;
    }
    const latitudes = points.map((point) => point.lat);
    const longitudes = points.map((point) => point.lng);
    const minLatitude = Math.min(...latitudes);
    const maxLatitude = Math.max(...latitudes);
    const minLongitude = Math.min(...longitudes);
    const maxLongitude = Math.max(...longitudes);
    const paddingFactor = 0;
    map.fitBounds([
      [minLatitude - paddingFactor, minLongitude - paddingFactor],
      [maxLatitude + paddingFactor, maxLongitude + paddingFactor],
    ]);
  }

  return <div id="map"></div>;
}
