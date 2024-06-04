import L from "leaflet";

import { tomTomRed } from "./colors";
import { NavigationPoint, GuidanceInstruction } from "./types";

import destinationImage from "./assets/teal-pin.png";
import routeStopImage from "./assets/blue-pin.png";
import departureImage from "./assets/red-pin.png";

export interface RouteMarkerNode {
  marker: L.Marker;
  prev: RouteMarkerNode | null;
  lineToPrev: L.Polyline | null;
  next: RouteMarkerNode | null;
  lineToNext: L.Polyline | null;
}

export function createMarker(
  lat: number,
  lng: number,
  icon: L.DivIcon,
  draggable: boolean = true
) {
  return L.marker([lat, lng], { icon: icon, draggable });
}

export function createLine(start: L.LatLng, end: L.LatLng) {
  return L.polyline([start, end], { color: tomTomRed });
}

export function createLineFromTo(
  nodeA: RouteMarkerNode,
  nodeB: RouteMarkerNode
) {
  const lineFromAtoB = createLine(
    nodeA.marker.getLatLng(),
    nodeB.marker.getLatLng()
  );

  nodeA.lineToNext = lineFromAtoB;
  nodeB.lineToPrev = lineFromAtoB;

  return lineFromAtoB;
}

export function createPopup(latlng: L.LatLng, text: string) {
  return L.popup().setLatLng(latlng).setContent(text);
}

export function cleanup(...refs: React.MutableRefObject<any>[]) {
  refs.forEach((ref) => {
    if (ref.current !== null) {
      ref.current.remove();
      ref.current = null;
    }
  });
}

export function createIndexedPointClusters(
  routePoints: NavigationPoint[]
): L.MarkerClusterGroup {
  const markers = window.L.markerClusterGroup();
  routePoints.forEach((point: NavigationPoint, index: number) => {
    const { latitude, longitude } = point;
    const m = createMarker(
      latitude,
      longitude,
      createIndexedIcon(index),
      false
    ).bindPopup(
      `${latitude}, ${longitude}${
        point.speed != null ? `<br>speed: ${point.speed} m/s` : ""
      }`
    );
    markers.addLayer(m);
  });
  return markers;
}

export function createIndexedPointMarkers(
  routePoints: NavigationPoint[]
): L.LayerGroup {
  const markers = L.layerGroup();
  routePoints.forEach((point: NavigationPoint, index: number) => {
    const { latitude, longitude } = point;
    const m = createMarker(
      latitude,
      longitude,
      createIndexedIcon(index),
      false
    ).bindPopup(
      `${latitude}, ${longitude}${
        point.speed != null ? `<br>speed: ${point.speed} m/s` : ""
      }`
    );
    markers.addLayer(m);
  });
  return markers;
}

export function createInstructionsMarkers(
  instructions: GuidanceInstruction[]
): L.LayerGroup {
  const markers = L.layerGroup();
  instructions.forEach((instruction, index) => {
    const { latitude, longitude } = instruction.maneuverPoint;
    const marker = L.marker([latitude, longitude], {
      icon: L.icon({
        iconUrl:
          "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png",
        shadowUrl:
          "https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png",
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41],
      }),
    }).bindPopup(
      `<b>${index}. ${instruction.maneuver}</b><br>point: ${latitude}, ${longitude}<br>route offset: ${instruction.routeOffsetInMeters} m`
    );
    markers.addLayer(marker);
  });
  return markers;
}

export function createRouteStopMarkers(
  routeStops: NavigationPoint[]
): L.LayerGroup {
  const markers = L.layerGroup();
  routeStops.forEach((point: NavigationPoint, index: number) => {
    const image =
      index === 0
        ? departureImage
        : index === routeStops.length - 1
        ? destinationImage
        : routeStopImage;
    const { latitude, longitude } = point;
    const m = L.marker([latitude, longitude], {
      icon: L.icon({
        iconUrl: image,
        iconSize: [41, 41],
        iconAnchor: [21, 40],
        popupAnchor: [0, -30],
      }),
    }).bindPopup(
      `<b>${index}.</b> ${latitude}, ${longitude}${
        point.speed != null ? `<br>speed: ${point.speed} m/s` : ""
      }`
    );
    markers.addLayer(m);
  });
  return markers;
}

function createIndexedIcon(idx: number): L.DivIcon {
  const iconSize = 24;
  return L.divIcon({
    className: "custom-div-icon",
    html: `<div class="number">${idx}</div>`,
    iconSize: [iconSize, iconSize],
    iconAnchor: [10, 10],
    popupAnchor: [0, -10],
  });
}

export class Ruler {
  start: L.Marker | null;
  end: L.Marker | null;
  line: L.Polyline | null;

  static readonly iconSize = 10;

  static startIcon = L.divIcon({
    className: "ruler-icon",
    iconSize: [Ruler.iconSize, Ruler.iconSize],
  });

  static endIcon = L.divIcon({
    className: "ruler-icon",
    iconSize: [Ruler.iconSize, Ruler.iconSize],
  });

  constructor() {
    this.start = null;
    this.end = null;
    this.line = null;
  }

  createStart(latitude: number, longitude: number): L.Marker {
    this.start = createMarker(latitude, longitude, Ruler.startIcon, false);
    return this.start;
  }

  createEnd(latitude: number, longitude: number): L.Marker {
    this.end = createMarker(latitude, longitude, Ruler.endIcon, false);
    return this.end;
  }

  createLine(): L.Polyline | null {
    if (this.start === null || this.end === null) {
      return null;
    }
    this.line = createLine(this.start.getLatLng(), this.end.getLatLng());
    return this.line;
  }

  createPopup(e: L.LeafletMouseEvent): L.Popup {
    if (this.start === null || this.end === null) {
      return createPopup(e.latlng, "Please select two points");
    }
    return createPopup(
      e.latlng,
      "The distance between the points is: " +
        this.start.getLatLng().distanceTo(this.end.getLatLng()).toFixed(2) +
        " meters"
    );
  }

  remove(): void {
    if (this.start !== null) {
      this.start.remove();
      this.start = null;
    }
    if (this.end !== null) {
      this.end.remove();
      this.end = null;
    }
    if (this.line !== null) {
      this.line.remove();
      this.line = null;
    }
  }
}
