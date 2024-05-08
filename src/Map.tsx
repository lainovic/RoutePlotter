import React from "react";
import L from "leaflet";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import "leaflet/dist/leaflet.css";
import { log, error as logError } from "./logging_utils";
import { NavigationPoint, GuidanceInstruction } from "./types";
import { tomtomDarkBlue, tomtomGreen, tomtomOrange, tomtomYellow } from "./colors";
import { createLine, createMarker, createPopup, cleanup } from "./map_utils";

export default function Map({
  routePoints,
  guidanceInstructions,
  waypoints,
}: {
  routePoints: NavigationPoint[];
  guidanceInstructions: GuidanceInstruction[];
  waypoints: NavigationPoint[];
}) {
  const map = React.useRef<L.Map | null>(null);
  const [routeVisibility, setRouteVisibility] = React.useState(true);
  const [guidanceVisibility, setGuidanceVisibility] = React.useState(false);
  const [waypointVisibility, setWaypointVisibility] = React.useState(false);
  const routeMarkers = React.useRef<L.LayerGroup>(L.layerGroup());
  const guidanceMarkers = React.useRef<L.LayerGroup>(L.layerGroup());
  const waypointMarkers = React.useRef<L.LayerGroup>(L.layerGroup());
  const rulerStartMarker = React.useRef<L.Marker | null>(null);
  const rulerEndMarker = React.useRef<L.Marker | null>(null);
  const rulerLine = React.useRef<L.Polyline | null>(null);

  React.useLayoutEffect(() => {
    log("Creating map");
    const newMap = L.map("map");

    // Add tile layer from OpenStreetMap
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap contributors",
    }).addTo(newMap);

    var number1Icon = L.divIcon({
      className: "custom-div-icon",
      html: '<div class="number">1</div>',
      iconSize: [20, 20],
    });

    var number2Icon = L.divIcon({
      className: "custom-div-icon",
      html: '<div class="number">2</div>',
      iconSize: [20, 20],
    });

    newMap.on("click", (e) => {
      const { lat, lng } = e.latlng;
      if (rulerStartMarker.current === null) {
        rulerStartMarker.current = createMarker(lat, lng, number1Icon).addTo(
          newMap
        );
      } else if (rulerEndMarker.current === null) {
        rulerEndMarker.current = createMarker(lat, lng, number2Icon).addTo(
          newMap
        );
        rulerLine.current = createLine(
          rulerStartMarker.current.getLatLng(),
          rulerEndMarker.current.getLatLng()
        ).addTo(newMap);
        createPopup(
          e.latlng,
          "The distance between the points is: " +
            rulerStartMarker.current
              .getLatLng()
              .distanceTo(rulerEndMarker.current.getLatLng())
              .toFixed(2) +
            " meters"
        ).openOn(newMap);
      } else {
        cleanup(rulerStartMarker, rulerEndMarker, rulerLine);
      }
    });

    newMap.on("contextmenu", async (e) => {
      const latlng = newMap.mouseEventToLatLng(e.originalEvent);
      const coordinates = `${latlng.lat}, ${latlng.lng}`;
      log("Coordinates:", coordinates);

      try {
        await navigator.clipboard.writeText(coordinates);
        toast.success("Coordinates copied to clipboard!", {
          position: "top-center",
          hideProgressBar: true,
          autoClose: 500, // Duration in milliseconds
        });
      } catch (error) {
        logError("Failed to copy coordinates to clipboard:", error);
        toast.error("Failed to copy coordinates to clipboard!", {
          position: "top-center",
          hideProgressBar: true,
          autoClose: 500, // Duration in milliseconds
        });
      }

      log("end of contextmenu");
    });

    map.current = newMap;

    return () => {
      newMap.remove();
      log("Map removed");
    };
  }, []);

  React.useEffect(() => {
    log("Route points changed", routePoints);
    const m = map.current;
    if (m !== null) {
      m.removeLayer(routeMarkers.current);
      routeMarkers.current = createRouteMarkers(routePoints);
      routeMarkers.current.addTo(m);
      centerAroundRoute(m, routePoints);
      setRouteVisibility(true);
    }
  }, [routePoints]);

  React.useEffect(() => {
    log("Route visibility changed", routeVisibility);
    const m = map.current;
    if (m !== null) {
      if (routeVisibility) {
        routeMarkers.current.addTo(m);
      } else {
        m.removeLayer(routeMarkers.current);
      }
    }
  }, [routeVisibility]);

  React.useEffect(() => {
    log("Guidance instructions changed", guidanceInstructions);
    const m = map.current;
    if (m !== null) {
      m.removeLayer(guidanceMarkers.current);
      guidanceMarkers.current = createGuidanceMarkers(guidanceInstructions);
      guidanceMarkers.current.addTo(m);
      setGuidanceVisibility(false);
    }
  }, [guidanceInstructions]);

  React.useEffect(() => {
    log("Guidance visibility changed", guidanceVisibility);
    const m = map.current;
    if (m !== null) {
      if (guidanceVisibility) {
        guidanceMarkers.current.addTo(m);
      } else {
        m.removeLayer(guidanceMarkers.current);
      }
    }
  }, [guidanceVisibility]);

  React.useEffect(() => {
    log("Waypoints changed", guidanceInstructions);
    const m = map.current;
    if (m !== null) {
      m.removeLayer(waypointMarkers.current);
      waypointMarkers.current = createWaypointMarkers(waypoints);
      waypointMarkers.current.addTo(m);
      setWaypointVisibility(false);
    }
  }, [guidanceInstructions]);

  React.useEffect(() => {
    log("Waypoint visibility changed", guidanceVisibility);
    const m = map.current;
    if (m !== null) {
      if (waypointVisibility) {
        waypointMarkers.current.addTo(m);
      } else {
        m.removeLayer(waypointMarkers.current);
      }
    }
  }, [waypointVisibility]);

  React.useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      if (event.key === "c" || event.key === "C") {
        const m = map.current;
        if (m !== null) {
          const latitude = window.prompt("Enter latitude:");
          if (latitude === null) return;
          const longitude = window.prompt("Enter longitude:");
          if (longitude === null) return;
          if (latitude && longitude)
            m.setView([parseFloat(latitude), parseFloat(longitude)], 10);
        }
      } else if (event.key === "x" || event.key === "X") {
        const m = map.current;
        if (m !== null) {
          centerAroundRoute(m, routePoints);
        }
      } else if (event.key === "r" || event.key === "R") {
        setRouteVisibility((prev) => !prev);
      } else if (event.key === "g" || event.key === "G") {
        setGuidanceVisibility((prev) => !prev);
      } else if (event.key === "w" || event.key === "W") {
        setWaypointVisibility((prev) => !prev);
      }
    };
    document.addEventListener("keypress", handleKeyPress);
    return () => {
      document.removeEventListener("keypress", handleKeyPress);
    };
  }, [routePoints]);

  log("Map rendering:");
  log("- Route points:", routePoints);
  log("- Guidance instructions:", guidanceInstructions);
  log("- Waypoints:", waypoints);
  return (
    <>
      <div id="checkboxes">
        <div
          className="checkbox-container"
          style={{
            visibility: routePoints.length === 0 ? "hidden" : "visible",
          }}
        >
          <input
            type="checkbox"
            id="routePoints"
            checked={routeVisibility}
            onChange={(e) => setRouteVisibility(e.target.checked)}
          />
          <label htmlFor="routePoints">Route points</label>
        </div>
        <div
          className="checkbox-container"
          style={{
            visibility:
              guidanceInstructions.length === 0 ? "hidden" : "visible",
          }}
        >
          <input
            type="checkbox"
            id="instructions"
            checked={guidanceVisibility}
            onChange={(e) => setGuidanceVisibility(e.target.checked)}
          />
          <label htmlFor="instructions">Guidance instructions</label>
        </div>
        <div
          className="checkbox-container"
          style={{
            visibility: waypoints.length === 0 ? "hidden" : "visible",
          }}
        >
          <input
            type="checkbox"
            id="instructions"
            checked={waypointVisibility}
            onChange={(e) => setWaypointVisibility(e.target.checked)}
          />
          <label htmlFor="instructions">Waypoints</label>
        </div>
      </div>
      <div id="map" style={{ height: "600px" }}></div>
      <ToastContainer />
    </>
  );
}

function createRouteMarkers(routePoints: NavigationPoint[]): L.LayerGroup {
  const markers = L.layerGroup();
  routePoints.forEach((point: NavigationPoint, index: number) => {
    const { latitude, longitude } = point;
    const color = tomtomDarkBlue;
    const radius = index === 0 || index === routePoints.length - 1 ? 8 : 4;
    const m = L.circleMarker([latitude, longitude], {
      radius: radius,
      fillColor: color,
      color: tomtomDarkBlue,
      weight: 1,
      opacity: 1,
      fillOpacity: 1,
    }).bindPopup(
      `<b>${index + 1}.</b> ${latitude}, ${longitude}${
        point.speed != null ? `<br>speed: ${point.speed} m/s` : ""
      }`
    );
    markers.addLayer(m);
  });
  return markers;
}

function createWaypointMarkers(waypoints: NavigationPoint[]): L.LayerGroup {
  const markers = L.layerGroup();
  waypoints.forEach((point: NavigationPoint, index: number) => {
    const color =
      index === 0
        ? tomtomOrange // origin
        : index === waypoints.length - 1
        ? tomtomGreen // destination
        : tomtomYellow; // the rest
    const radius = 8;
    const { latitude, longitude } = point;
    const m = L.circleMarker([latitude, longitude], {
      radius: radius,
      fillColor: color,
      color: tomtomDarkBlue,
      weight: 2,
      opacity: 1,
      fillOpacity: 1,
    }).bindPopup(
      `<b>${index + 1}.</b> ${latitude}, ${longitude}${
        point.speed != null ? `<br>speed: ${point.speed} m/s` : ""
      }`
    );
    markers.addLayer(m);
  });
  return markers;
}

function createGuidanceMarkers(
  guidanceInstructions: GuidanceInstruction[]
): L.LayerGroup {
  const markers = L.layerGroup();
  guidanceInstructions.forEach((instruction, index) => {
    const { latitude, longitude } = instruction.maneuverPoint;
    const marker = L.marker([latitude, longitude], {
      icon: L.icon({
        iconUrl:
          "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png",
        shadowUrl:
          "https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png",
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41],
      }),
    }).bindPopup(
      `<b>${index + 1}. ${
        instruction.maneuver
      }</b><br>point: ${latitude}, ${longitude}<br>route offset: ${
        instruction.routeOffsetInMeters
      } m`
    );
    markers.addLayer(marker);
  });
  return markers;
}

function centerAroundRoute(m: L.Map, routePoints: NavigationPoint[]) {
  if (routePoints.length === 0) return;
  const latitudes = routePoints.map((point) => point.latitude);
  const longitudes = routePoints.map((point) => point.longitude);
  const minLatitude = Math.min(...latitudes);
  const maxLatitude = Math.max(...latitudes);
  const minLongitude = Math.min(...longitudes);
  const maxLongitude = Math.max(...longitudes);
  const paddingFactor = 0;
  m.fitBounds([
    [minLatitude - paddingFactor, minLongitude - paddingFactor],
    [maxLatitude + paddingFactor, maxLongitude + paddingFactor],
  ]);
}
