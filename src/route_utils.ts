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
      return parseTTP(text);
    } catch (error) {
      console.error("Error parsing as TTP:", error);
      try {
        return parseCSV(text);
      } catch (error) {
        console.error("Error parsing as CSV:", error);
        onFailure("Error parsing file: " + error);
        return [];
      }
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
  const points = parseCSVPoints(locations);
  const route: Route = {
    legs: [
      {
        points: points,
      },
    ],
    summary: {
      lengthInMeters: calculateDistanceInMeters(points),
      travelTimeInSeconds: calculateTravelTimeInSeconds(points),
    },
    guidance: {
      instructions: [],
    },
  };
  return [route];
}

function parseCSVPoints(locations: GnssLocation[]): GeoPoint[] {
  return locations
    .filter(
      (location) =>
        location.lat !== undefined &&
        location.lon !== undefined &&
        location.source_timestamp !== undefined
    )
    .map((location) => {
      const point: GeoPoint = {
        timestamp: location.source_timestamp,
        latitude: parseFloat(location.lat.toString()),
        longitude: parseFloat(location.lon.toString()),
        speed: parseFloat(location.speed.toString()).toFixed(
          2
        ) as any as number,
      };
      return point;
    });
}

function parseTTP(text: string): Route[] {
  const lines = text.split("\n");
  const header = "BEGIN:ApplicationVersion=TomTom Positioning";
  if (!lines[0].startsWith(header)) {
    throw new Error("Invalid TTP format");
  }
  const supportedVersion = "0.7";
  const ttpVersion = lines[0].slice(header.length + 1);
  if (ttpVersion !== supportedVersion) {
    throw new Error(
      `Unsupported TTP version: ${ttpVersion}, expected ${supportedVersion}`
    );
  }
  const points = parseTTPPoints(lines);
  const route: Route = {
    legs: [
      {
        points: points,
      },
    ],
    summary: {
      lengthInMeters: calculateDistanceInMeters(points),
      travelTimeInSeconds: calculateTravelTimeInSeconds(points),
    },
    guidance: {
      instructions: [],
    },
  };
  return [route];
}

function parseTTPPoints(lines: string[]): GeoPoint[] {
  const points: GeoPoint[] = [];
  let seenTimestaps = new Set<string>();
  lines.forEach((line) => {
    if (line.startsWith("#")) {
      return; // skip comments
    }
    const parts = line.split(",");
    const reception_timestamp = parts[0];
    if (
      parseFloat(reception_timestamp) === 0 ||
      seenTimestaps.has(reception_timestamp)
    ) {
      return;
    }
    const lon = parts[3];
    const lat = parts[5];
    const speed = parts[11];
    if (!lon || !lat || !speed) {
      seenTimestaps.add(reception_timestamp);
      return;
    }
    points.push({
      timestamp: reception_timestamp,
      latitude: parseFloat(lat),
      longitude: parseFloat(lon),
      speed: parseFloat(speed).toFixed(2) as any as number,
    });
    seenTimestaps.add(reception_timestamp);
  });
  return points;
}

function calculateTravelTimeInSeconds(points: GeoPoint[]): number {
  if (points.length < 2) return 0;
  let startTimestamp = parseFloat(points[0].timestamp);
  if (isNaN(startTimestamp)) {
    // try with the second timestamp
    startTimestamp = parseFloat(points[1].timestamp);
    if (isNaN(startTimestamp)) {
      // if both are invalid, throw an error
      throw new Error(`Invalid timestamps in the first two locations:
      ${points[0].timestamp}, ${points[1].timestamp}`);
    }
  }
  let endTimestamp = parseFloat(points[points.length - 1].timestamp);
  if (isNaN(endTimestamp)) {
    // try with the second-to-last timestamp
    endTimestamp = parseFloat(points[points.length - 2].timestamp);
    if (isNaN(endTimestamp)) {
      // if both are invalid, throw an error
      throw new Error(`Invalid timestamps in the last two locations:
      ${points[points.length - 1].timestamp},
      ${points[points.length - 2].timestamp}`);
    }
  }
  const travelTimeInSeconds = (endTimestamp - startTimestamp).toFixed(
    2
  ) as any as number;
  return travelTimeInSeconds;
}

function calculateDistanceInMeters(points: GeoPoint[]): number {
  let distance = 0;
  if (points.length >= 2) {
    for (let i = 1; i < points.length; i++) {
      const previous = points[i - 1];
      const current = points[i];
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
  previous: GeoPoint,
  current: GeoPoint
): number {
  if (
    !previous.latitude ||
    !previous.longitude ||
    !current.latitude ||
    !current.longitude
  ) {
    console.error("Invalid latitudes or longitudes");
    return 0;
  }
  const R = 6371e3; // Radius of the Earth in meters
  const toRadians = (degrees: number) => (degrees * Math.PI) / 180;
  const φ1 = toRadians(previous.latitude);
  const φ2 = toRadians(current.latitude);
  const Δφ = toRadians(current.latitude - previous.latitude);
  const Δλ = toRadians(current.longitude - previous.longitude);
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
