import L from "leaflet";
import { tomTomBlack } from "./colors";

export function createMarker(lat: number, lng: number, icon: L.DivIcon) {
  return L.marker([lat, lng], { icon: icon });
}

export function createLine(start: L.LatLng, end: L.LatLng) {
  return L.polyline([start, end], { color: tomTomBlack });
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
