import React from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { log } from "./logging_utils";
import { GeoPoint, GuidanceInstruction } from "./types";
import {
  tomTomBlack,
  tomtomDarkBlue,
  tomtomOrange,
  tomtomYellow,
} from "./colors";
import {
  createLine,
  createMarker,
  createPopup,
  cleanup,
} from "./map_utils";

export default function Map({
  routePoints,
  guidanceInstructions,
}: {
  routePoints: GeoPoint[];
  guidanceInstructions: GuidanceInstruction[];
}) {
  const [guidanceVisibility, setGuidanceVisibility] = React.useState(false);
  const [routeVisibility, setRouteVisibility] = React.useState(true);
  const map = React.useRef<L.Map | null>(null);
  const routeMarkers = React.useRef<L.LayerGroup>(L.layerGroup());
  const guidanceMarkers = React.useRef<L.LayerGroup>(L.layerGroup());
  const startPointMarker = React.useRef<L.Marker | null>(null);
  const endPointMarker = React.useRef<L.Marker | null>(null);
  const line = React.useRef<L.Polyline | null>(null);

  React.useLayoutEffect(() => {
    log("Creating map");
    const newMap = L.map("map");

    // Add tile layer from OpenStreetMap
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap contributors",
    }).addTo(newMap);

    centerMapAtPoint(newMap, routePoints[0]);

    var number1Icon = L.divIcon({
      className: "custom-div-icon",
      html: '<div class="number">1</div>',
      iconSize: [30, 30],
    });

    var number2Icon = L.divIcon({
      className: "custom-div-icon",
      html: '<div class="number">2</div>',
      iconSize: [30, 30],
    });

    newMap.on("click", (e) => {
      const { lat, lng } = e.latlng;
      if (startPointMarker.current === null) {
        startPointMarker.current = createMarker(lat, lng, number1Icon).addTo(
          newMap
        );
      } else if (endPointMarker.current === null) {
        endPointMarker.current = createMarker(lat, lng, number2Icon).addTo(
          newMap
        );
        line.current = createLine(
          startPointMarker.current.getLatLng(),
          endPointMarker.current.getLatLng()
        ).addTo(newMap);
        createPopup(
          e.latlng,
          "The distance between the points is: " +
            startPointMarker.current
              .getLatLng()
              .distanceTo(endPointMarker.current.getLatLng())
              .toFixed(2) +
            " meters"
        ).openOn(newMap);
      } else {
        cleanup(startPointMarker, endPointMarker, line);
      }
    });

    map.current = newMap;

    return () => {
      newMap.remove();
      log("Map removed");
    };
  }, []);

  React.useEffect(() => {
    log("Route points changed", routePoints);
    routeMarkers.current = createRouteMarkers(routePoints);
  }, [routePoints]);

  React.useEffect(() => {
    log("Guidance instructions changed", guidanceInstructions);
    guidanceMarkers.current = createGuidanceMarkers(guidanceInstructions);
  }, [guidanceInstructions]);

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

  log("Map rendering");
  return (
    <>
      <div id="checkboxes">
        <div className="checkbox-container">
          <input
            disabled={routePoints.length === 0}
            type="checkbox"
            id="routePoints"
            defaultChecked={true}
            onChange={(e) => setRouteVisibility(e.target.checked)}
          />
          <label htmlFor="routePoints">Route points</label>
        </div>
        <div className="checkbox-container">
          <input
            disabled={guidanceInstructions.length === 0}
            type="checkbox"
            id="instructions"
            defaultChecked={false}
            onChange={(e) => setGuidanceVisibility(e.target.checked)}
          />
          <label htmlFor="instructions">Guidance instructions</label>
        </div>
      </div>
      <div id="map" style={{ height: "600px" }}></div>
    </>
  );
}

function createRouteMarkers(routePoints: GeoPoint[]): L.LayerGroup {
  log("Creating route markers", routePoints);
  const markers = L.layerGroup();
  routePoints.forEach((point: GeoPoint, index: number) => {
    const { latitude, longitude } = point;
    const color =
      index === 0
        ? tomtomOrange // origin
        : index === routePoints.length - 1
        ? tomTomBlack // destination
        : tomtomYellow; // the rest
    const radius = index === 0 || index === routePoints.length - 1 ? 8 : 4;
    const m = L.circleMarker([latitude, longitude], {
      radius: radius,
      fillColor: color,
      color: tomtomDarkBlue,
      weight: 1,
      opacity: 1,
      fillOpacity: 1,
    }).bindPopup(`<b>${index + 1}.</b> ${latitude}, ${longitude}`);
    markers.addLayer(m);
  });
  return markers;
}

function centerMapAtPoint(map: L.Map, point: GeoPoint) {
  map.setView([point.latitude, point.longitude], 13);
}

function createGuidanceMarkers(
  guidanceInstructions: GuidanceInstruction[]
): L.LayerGroup {
  log("Creating guidance markers", guidanceInstructions);
  const markers = L.layerGroup();
  guidanceInstructions.forEach((instruction, index) => {
    const { latitude, longitude } = instruction.maneuverPoint;
    const marker = L.marker([latitude, longitude], {
      icon: L.divIcon({
        className: "guidance-marker",
        iconSize: [24, 24],
        iconAnchor: [0, 24],
        popupAnchor: [0, -36],
      }),
    }).bindPopup(
      `<b>${index + 1}. ${instruction.maneuver}</b><br>routeOffsetInMeters: ${
        instruction.routeOffsetInMeters
      }<br>Point: ${latitude}, ${longitude}`
    );
    markers.addLayer(marker);
  });
  return markers;
}
