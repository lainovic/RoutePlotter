import {
  GeoPoint,
  Route,
  Summary,
  GuidanceInstruction,
  GnssLocation,
} from "./types";
import { log } from "./logging_utils";
import Papa from "papaparse";

export const supportedVersion = "0.0.12";

export function extractRoutes(
  text: string,
  onFailure: (message: string) => void
): Route[] {
  if (text.length === 0) return [];
  try {
    return parseJSON(text);
  } catch (error) {
    console.error("Error parsing as JSON:", error);
    try {
      return parseCSV(text);
    } catch (error) {
      console.error("Error parsing as CSV:", error);
      onFailure("Error parsing file: " + error);
      return [];
    }
  }
}

function parseJSON(text: string): any {
  const json = JSON.parse(text);
  if (json.formatVersion !== supportedVersion) {
    throw new Error("Unsupported version: " + json.formatVersion);
  }
  log("Parsed JSON:", json);
  if (json && json.routes && Array.isArray(json.routes)) {
    return json.routes;
  }
  throw new Error("No routes found in JSON");
}

function parseCSV(text: string): Route[] {
  var data = Papa.parse<GnssLocation>(text, { header: true });
  log("Parsed CSV:", data.data);
  const locations = data.data as GnssLocation[];
  const route: Route = {
    legs: [
      {
        points: locations
          .filter(
            (location) =>
              location.lat !== undefined &&
              location.lon !== undefined &&
              location.source_timestamp !== undefined
          )
          .map((location) => ({
            latitude: location.lat,
            longitude: location.lon,
          })),
      },
    ],
    summary: {
      lengthInMeters: calculateDistanceInMeters(locations),
      travelTimeInSeconds: calculateTravelTimeInSeconds(locations),
    },
    guidance: {
      instructions: [],
    },
  };
  return [route];
}

function calculateTravelTimeInSeconds(locations: GnssLocation[]): number {
  if (locations.length < 2) return 0;
  let firstTimestamp = parseFloat(locations[0].source_timestamp);
  if (isNaN(firstTimestamp)) {
    // try with the second timestamp
    firstTimestamp = parseFloat(locations[1].source_timestamp);
    if (isNaN(firstTimestamp)) {
      // if both are invalid, throw an error
      throw new Error(`Invalid timestamps in the first two locations:
      ${locations[0].source_timestamp}, ${locations[1].source_timestamp}`);
    }
  }
  let lastTimestamp = parseFloat(
    locations[locations.length - 1].source_timestamp
  );
  if (isNaN(lastTimestamp)) {
    // try with the second-to-last timestamp
    lastTimestamp = parseFloat(
      locations[locations.length - 2].source_timestamp
    );
    if (isNaN(lastTimestamp)) {
      // if both are invalid, throw an error
      throw new Error(`Invalid timestamps in the last two locations:
      ${locations[locations.length - 1].source_timestamp},
      ${locations[locations.length - 2].source_timestamp}`);
    }
  }
  const travelTimeInSeconds = (lastTimestamp - firstTimestamp).toFixed(
    2
  ) as any as number;
  return travelTimeInSeconds;
}

function calculateDistanceInMeters(locations: GnssLocation[]): number {
  let distance = 0;
  if (locations.length >= 2) {
    for (let i = 1; i < locations.length; i++) {
      const previous = locations[i - 1];
      const current = locations[i];
      distance += calculateDistanceBetweenPointsInMeters(previous, current);
    }
  }
  const distanceInMeters = distance.toFixed(2) as any as number;
  return distanceInMeters;
}

/**
 * Haversine formula to calculate distance between two points
 * on the surface of a sphere, given their latitudes and longitudes
 * in degrees.
 */
function calculateDistanceBetweenPointsInMeters(
  previous: GnssLocation,
  current: GnssLocation
): number {
  if (!previous.lat || !previous.lon || !current.lat || !current.lon) {
    console.error("Invalid latitudes or longitudes");
    return 0;
  }
  const R = 6371e3; // Radius of the Earth in meters
  const toRadians = (degrees: number) => (degrees * Math.PI) / 180;
  const φ1 = toRadians(previous.lat);
  const φ2 = toRadians(current.lat);
  const Δφ = toRadians(current.lat - previous.lat);
  const Δλ = toRadians(current.lon - previous.lon);
  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export function extractGuidanceInstructions(
  route: Route
): GuidanceInstruction[] {
  return route.guidance.instructions;
}

export function extractRouteSummary(route: Route): Summary {
  return route.summary;
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
