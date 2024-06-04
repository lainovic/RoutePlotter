import React from "react";
import L from "leaflet";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import "leaflet/dist/leaflet.css";
import "leaflet/dist/leaflet";
import "leaflet.markercluster";
import { log, logError } from "./logging_utils";
import { NavigationPoint, GuidanceInstruction, RouteSummary } from "./types";
import { tomtomDarkGray } from "./colors";
import {
  createInstructionsMarkers,
  createIndexedPointMarkers,
  createRouteStopMarkers,
  Ruler,
} from "./map_utils";
import { secondsToHoursMinutesSeconds } from "./time_utils";
import {
  ParsedRoute,
  extractInstructions,
  extractPoints,
  extractRouteSummary,
  extractStops,
} from "./route_utils";

class RouteLayer {
  points: {
    data: NavigationPoint[];
    markers: L.MarkerClusterGroup;
  };
  instructions: {
    data: GuidanceInstruction[];
    markers: L.LayerGroup;
  };
  stops: {
    data: NavigationPoint[];
    markers: L.LayerGroup;
  };
  description: string;
  summary: RouteSummary;

  constructor(result: ParsedRoute) {
    this.points = {
      data: extractPoints(result.route),
      markers: window.L.markerClusterGroup(),
    };
    this.points.markers = createIndexedPointMarkers(this.points.data);
    this.instructions = {
      data: extractInstructions(result.route),
      markers: L.layerGroup(),
    };
    this.instructions.markers = createInstructionsMarkers(
      this.instructions.data
    );
    this.stops = {
      data: extractStops(result.route),
      markers: L.layerGroup(),
    };
    this.stops.markers = createRouteStopMarkers(this.stops.data);
    this.description = result.message.value;
    this.summary = extractRouteSummary(result.route);
  }
}

export default function RouteMap({ result }: { result: ParsedRoute[] }) {
  const map = React.useRef<L.Map | null>(null);

  const [routeVisibility, setRouteVisibility] = React.useState<
    Map<number, boolean>
  >(new Map<number, boolean>());
  const [guidanceVisibility, setGuidanceVisibility] = React.useState<
    Map<number, boolean>
  >(new Map<number, boolean>());
  const [routestopVisibility, setRouteStopVisibility] = React.useState<
    Map<number, boolean>
  >(new Map<number, boolean>());

  const routes = React.useRef<RouteLayer[]>(
    result.map((r) => new RouteLayer(r))
  );

  const ruler = React.useRef<Ruler>(new Ruler());

  React.useLayoutEffect(() => {
    const newMapInstance = L.map("map");
    log("RouteMap created");

    // Add tile layer from OpenStreetMap
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap contributors",
    }).addTo(newMapInstance);

    newMapInstance.on("click", (e: L.LeafletMouseEvent) => {
      const { lat, lng } = e.latlng;
      const r = ruler.current;
      if (r.start === null) {
        r.createStart(lat, lng).addTo(newMapInstance);
      } else if (r.end === null) {
        r.createEnd(lat, lng).addTo(newMapInstance);
        r.createLine()?.addTo(newMapInstance);
        r.createPopup(e).openOn(newMapInstance);
      } else {
        r.remove();
      }
    });

    newMapInstance.on("contextmenu", async (e) => {
      const latlng = newMapInstance.mouseEventToLatLng(e.originalEvent);
      const coordinates = `${latlng.lat}, ${latlng.lng}`;
      log("Coordinates:", coordinates);
      try {
        await navigator.clipboard.writeText(coordinates);
        toast.success("Coordinates copied to clipboard!");
      } catch (error) {
        logError("Failed to copy coordinates to clipboard:", error);
        toast.error("Failed to copy coordinates to clipboard!");
      }
    });

    map.current = newMapInstance;
    centerAroundRoutes();

    return () => {
      newMapInstance.remove();
      log("RouteMap removed");
    };
  }, []);

  // React.useEffect(() => {
  //   log("Route points changed", routePoints);
  //   const m = map.current;
  //   if (m !== null) {
  //     if (routeVisibility) m.removeLayer(routeMarkers.current);
  //     routeMarkers.current = createRouteMarkers(routePoints);
  //     if (routeVisibility) routeMarkers.current.addTo(m);
  //     centerAroundRoute(m, routePoints);
  //   }
  // }, [routePoints]) ;

  React.useEffect(() => {
    log("Route visibility changed", routeVisibility);
    const m = map.current;
    if (m !== null) {
      routes.current.forEach((r, idx) => {
        if (routeVisibility.get(idx)) r.points.markers.addTo(m);
        else m.removeLayer(r.points.markers);
      });
    }
  }, [routeVisibility]);

  // React.useEffect(() => {
  //   log("Guidance instructions changed", guidanceInstructions);
  //   const m = map.current;
  //   if (m !== null) {
  //     if (guidanceVisibility) m.removeLayer(guidanceMarkers.current);
  //     guidanceMarkers.current = createGuidanceMarkers(guidanceInstructions);
  //     if (guidanceVisibility) guidanceMarkers.current.addTo(m);
  //   }
  // }, [guidanceInstructions]);

  React.useEffect(() => {
    log("Guidance visibility changed", guidanceVisibility);
    const m = map.current;
    if (m !== null) {
      if (guidanceVisibility) {
        routes.current.forEach((r) => r.instructions.markers.addTo(m));
      } else {
        routes.current.forEach((r) => m.removeLayer(r.instructions.markers));
      }
    }
  }, [guidanceVisibility]);

  // React.useEffect(() => {
  //   log("Route stops changed", routeStops);
  //   const m = map.current;
  //   if (m !== null) {
  //     if (routestopVisibility) m.removeLayer(routeStopMarkers.current);
  //     routeStopMarkers.current = createRouteStopMarkers(routeStops);
  //     if (routestopVisibility) routeStopMarkers.current.addTo(m);
  //   }
  // }, [routeStops]);

  React.useEffect(() => {
    log("Route-stop visibility changed", guidanceVisibility);
    const m = map.current;
    if (m !== null) {
      if (routestopVisibility) {
        routes.current.forEach((r) => r.stops.markers.addTo(m));
      } else {
        routes.current.forEach((r) => m.removeLayer(r.stops.markers));
      }
    }
  }, [routestopVisibility]);

  React.useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      if (event.key === "p" || event.key === "P") {
        const latitude = window.prompt("Enter latitude:");
        if (latitude === null) return;
        const longitude = window.prompt("Enter longitude:");
        if (longitude === null) return;
        map.current?.setView([parseFloat(latitude), parseFloat(longitude)], 10);
      } else if (event.key === "x" || event.key === "X") {
        centerAroundRoutes();
      } else if (event.key === "r" || event.key === "R") {
        // setRouteVisibility((prev) => !prev);
      } else if (event.key === "g" || event.key === "G") {
        // setGuidanceVisibility((prev) => !prev);
      } else if (event.key === "w" || event.key === "W") {
        // setRouteStopVisibility((prev) => !prev);
      }
    };
    document.addEventListener("keypress", handleKeyPress);
    return () => {
      document.removeEventListener("keypress", handleKeyPress);
    };
  }, []);

  function centerAroundRoutes() {
    if (routes.current.length === 0) return;

    const latitudes = routes.current.flatMap((route) =>
      route.points.data.map((point) => point.latitude)
    );
    const longitudes = routes.current.flatMap((route) =>
      route.points.data.map((point) => point.longitude)
    );

    const minLatitude = Math.min(...latitudes);
    const maxLatitude = Math.max(...latitudes);
    const minLongitude = Math.min(...longitudes);
    const maxLongitude = Math.max(...longitudes);
    const paddingFactor = 0;

    log("Centering around:", {
      minLatitude,
      maxLatitude,
      minLongitude,
      maxLongitude,
    });

    map.current?.fitBounds([
      [minLatitude - paddingFactor, minLongitude - paddingFactor],
      [maxLatitude + paddingFactor, maxLongitude + paddingFactor],
    ]);
  }

  log("Rendering:");
  log("- routes:", result);
  return (
    <div className="map-container">
      <div className="sidebar">
        {routes.current.map((route, index) => (
          <React.Fragment key={`marker-${index}`}>
            <div className="note-title">{route.description}</div>
            <div className="checkboxes">
              {route.points.data.length > 0 && (
                <div className="checkbox-container">
                  <input
                    type="checkbox"
                    id="routePoints"
                    checked={routeVisibility.get(index)}
                    onChange={(e) =>
                      setRouteVisibility(
                        (prev) => new Map(prev.set(index, e.target.checked))
                      )
                    }
                  />
                  <label htmlFor="routePoints">Route points</label>
                </div>
              )}
              {route.instructions.data.length > 0 && (
                <div className="checkbox-container">
                  <input
                    type="checkbox"
                    id="instructions"
                    checked={guidanceVisibility.get(index)}
                    onChange={(e) =>
                      setGuidanceVisibility(
                        (prev) => new Map(prev.set(index, e.target.checked))
                      )
                    }
                  />
                  <label htmlFor="instructions">Guidance instructions</label>
                </div>
              )}
              {route.stops.data.length > 0 && (
                <div className="checkbox-container">
                  <input
                    type="checkbox"
                    id=""
                    checked={routestopVisibility.get(index)}
                    onChange={(e) =>
                      setRouteStopVisibility(
                        (prev) => new Map(prev.set(index, e.target.checked))
                      )
                    }
                  />
                  <label htmlFor="instructions">Waypoints</label>
                </div>
              )}
            </div>
            <div className="highlighted-field">
              <div className="note">
                <div className="note-title">Summary</div>
                <p>
                  Size:{" "}
                  <span style={{ color: tomtomDarkGray }}>
                    {route.points.data.length} points
                  </span>
                </p>
                {route.summary && (
                  <>
                    <p>
                      Distance:{" "}
                      <span style={{ color: tomtomDarkGray }}>
                        {route.summary.lengthInMeters}
                        {` meters`}
                      </span>
                    </p>
                    <p>
                      Duration:{" "}
                      <span style={{ color: tomtomDarkGray }}>
                        {secondsToHoursMinutesSeconds(
                          route.summary.travelTimeInSeconds
                        )}
                      </span>
                    </p>
                  </>
                )}
              </div>
            </div>
          </React.Fragment>
        ))}
      </div>
      <div id="map"></div>
      <div className="sidebar">
        <div className="highlighted-field">
          <div className="note">
            <div className="note-title">Legend</div>
            <div className="legend">
              <span className="red circle"></span> departure
            </div>
            <div className="legend">
              <span className="teal circle"></span> arrival
            </div>
            <div className="legend">
              <span className="blue circle"></span> waypoint
            </div>
          </div>
        </div>

        <div className="highlighted-field">
          <div className="note">
            <div className="note-title">Help</div>
            Click once to add a point, then click again to display the Haversine
            distance between them.
            <br />
            <br />
            Press <span className="key">P</span> to position the map on a
            specific latitude and longitude.
            <br />
            Press <span className="key">X</span> to center the map around the
            route.
            <br />
            Press <span className="key">R</span> to toggle the visibility of the
            route.
            <br />
            Press <span className="key">G</span> to toggle the visibility of
            guidance instructions.
            <br />
            Press <span className="key">W</span> to toggle the visibility of
            waypoints.
            <br />
            Right click on the map to copy the latitude and longitude of a point
            to the clipboard.
            <br />
            Paste the content, drop the file again, or click the button below to
            upload a new file and plot a new route.
          </div>
        </div>
      </div>
    </div>
  );
}

// function createRoutePointMarkers(routePoints: NavigationPoint[]): L.LayerGroup {
//   const markers = L.layerGroup();
//   routePoints.forEach((point: NavigationPoint, index: number) => {
//     const { latitude, longitude } = point;
//     const color = tomtomDarkBlue;
//     const radius = 4;
//     const m = L.circleMarker([latitude, longitude], {
//       radius: radius,
//       fillColor: color,
//       color: tomtomDarkBlue,
//       weight: 1,
//       opacity: 1,
//       fillOpacity: 1,
//     }).bindPopup(
//       `<b>${index + 1}.</b> ${latitude}, ${longitude}${
//         point.speed != null ? `<br>speed: ${point.speed} m/s` : ""
//       }`
//     );
//     markers.addLayer(m);
//   });
//   return markers;
// }

// function createRouteStopMarkers(routeStops: NavigationPoint[]): L.LayerGroup {
//   const markers = L.layerGroup();
//   routeStops.forEach((point: NavigationPoint, index: number) => {
//     const image =
//       index === 0
//         ? departureImage
//         : index === routeStops.length - 1
//         ? destinationImage
//         : routeStopImage;
//     const { latitude, longitude } = point;
//     const m = L.marker([latitude, longitude], {
//       icon: L.icon({
//         iconUrl: image,
//         iconSize: [41, 41],
//         iconAnchor: [21, 40],
//         popupAnchor: [0, -30],
//       }),
//     }).bindPopup(
//       `<b>${index}.</b> ${latitude}, ${longitude}${
//         point.speed != null ? `<br>speed: ${point.speed} m/s` : ""
//       }`
//     );
//     markers.addLayer(m);
//   });
//   return markers;
// }

// function createGuidanceMarkers(
//   guidanceInstructions: GuidanceInstruction[]
// ): L.LayerGroup {
//   const markers = L.layerGroup();
//   guidanceInstructions.forEach((instruction, index) => {
//     const { latitude, longitude } = instruction.maneuverPoint;
//     const marker = L.marker([latitude, longitude], {
//       icon: L.icon({
//         iconUrl:
//           "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png",
//         shadowUrl:
//           "https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png",
//         iconSize: [25, 41],
//         iconAnchor: [12, 41],
//         popupAnchor: [1, -34],
//         shadowSize: [41, 41],
//       }),
//     }).bindPopup(
//       `<b>${index}. ${instruction.maneuver}</b><br>point: ${latitude}, ${longitude}<br>route offset: ${instruction.routeOffsetInMeters} m`
//     );
//     markers.addLayer(marker);
//   });
//   return markers;
// }
