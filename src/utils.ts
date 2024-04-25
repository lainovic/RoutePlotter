import { GeoPoint, Route, Summary, Instruction } from "./types";

export const supportedVersion = "0.0.12";

export function extractRoutes(
  text: string,
  onFailure: (message: string) => void
): Route[] {
  if (text.length === 0) return [];
  try {
    const json = JSON.parse(text);
    if (json.formatVersion !== supportedVersion) {
      onFailure(`Unsupported version: ${json.version}`);
      return [];
    }
    log("Parsed JSON:", json);
    if (json && json.routes && Array.isArray(json.routes)) {
      return json.routes;
    }
    onFailure("No routes found in JSON");
    return [];
  } catch (error) {
    onFailure("Error parsing JSON: " + error);
    console.error("Error parsing JSON:", error);
    return [];
  }
}

export function extractGuidanceInstructions(route: Route): Instruction[] {
  return route.guidance.instructions;
}

export function extractRouteSummary(route: Route): Summary {
  return route.summary;
  //   return `Length: ${route.summary.lengthInMeters} meters, Travel time: ${route.summary.travelTimeInSeconds} seconds`;
}

export function secondsToHoursMinutesSeconds(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = seconds % 60;
  return `${hours} hours, ${minutes} minutes, ${remainingSeconds} seconds`;
}

export function extractGeoPoints(
  route: Route,
  onFailure: (message: string) => void
): GeoPoint[] {
  try {
    const geoPoints: GeoPoint[] = [];
    route.legs.forEach((leg, index) => {
      if (leg && leg.points && Array.isArray(leg.points)) {
        if (index > 0) {
          geoPoints.push(...leg.points.slice(1)); // skip the first point,
          // as it's a duplicate of the last point of the previous leg
        } else {
          geoPoints.push(...leg.points);
        }
      }
    });
    if (geoPoints.length === 0) onFailure("No geo points found in JSON");
    return geoPoints;
  } catch (error) {
    onFailure("Error extracting geo points: " + error);
    return [];
  }
}

export function log(message: string, ...rest: any[]) {
  const debug = true;
  if (debug) console.log(message, rest);
}
