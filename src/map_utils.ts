import L from "leaflet";
import { tomTomRed } from "./colors";

export interface RouteMarkerNode {
  marker: L.Marker;
  prev: RouteMarkerNode | null;
  lineToPrev: L.Polyline | null;
  next: RouteMarkerNode | null;
  lineToNext: L.Polyline | null;
}

export function createMarker(lat: number, lng: number, icon: L.DivIcon) {
  return L.marker([lat, lng], { icon: icon, draggable: true });
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
