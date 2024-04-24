export interface GeoPoint {
  latitude: number;
  longitude: number;
}

interface Route {
  legs: {
    points: GeoPoint[];
  }[];
}

export function extractGeoPoints(
  text: string,
  onFailure: (message: string) => void
): GeoPoint[] {
  if (text.length === 0) return [];
  try {
    const json = JSON.parse(text);
    log("Parsed JSON:", json);
    const geoPoints: GeoPoint[] = [];
    if (json && json.routes && Array.isArray(json.routes)) {
      json.routes.forEach((route: Route) => {
        if (route && route.legs && Array.isArray(route.legs)) {
          route.legs.forEach((leg, index) => {
            if (leg && leg.points && Array.isArray(leg.points)) {
              if (index > 0) {
                geoPoints.push(...leg.points.slice(1));
              } else {
                geoPoints.push(...leg.points);
              }
            }
          });
        }
      });
    }
    if (geoPoints.length === 0) onFailure("No geo points found in JSON");
    return geoPoints;
  } catch (error) {
    onFailure("Error parsing JSON: " + error);
    console.error("Error parsing JSON:", error);
    return [];
  }
}

export function log(message: string, ...rest: any[]) {
  const debug = true;
  if (debug) console.log(message, rest);
}
