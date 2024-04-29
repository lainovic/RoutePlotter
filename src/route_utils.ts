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
  const route: Route = {
    legs: [
      {
        points: parseCSVPoints(locations),
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
  const route: Route = {
    legs: [
      {
        points: parseTTPPoints(lines),
      },
    ],
    summary: {
      lengthInMeters: 0,
      travelTimeInSeconds: 0,
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
      latitude: parseFloat(lat),
      longitude: parseFloat(lon),
      speed: parseFloat(speed).toFixed(2) as any as number,
    });
    seenTimestaps.add(reception_timestamp);
  });
  return points;
}

function calculateTravelTimeInSeconds(locations: GnssLocation[]): number {
  if (locations.length < 2) return 0;
  let startTimestamp = parseFloat(locations[0].source_timestamp);
  if (isNaN(startTimestamp)) {
    // try with the second timestamp
    startTimestamp = parseFloat(locations[1].source_timestamp);
    if (isNaN(startTimestamp)) {
      // if both are invalid, throw an error
      throw new Error(`Invalid timestamps in the first two locations:
      ${locations[0].source_timestamp}, ${locations[1].source_timestamp}`);
    }
  }
  let endTimestamp = parseFloat(
    locations[locations.length - 1].source_timestamp
  );
  if (isNaN(endTimestamp)) {
    // try with the second-to-last timestamp
    endTimestamp = parseFloat(locations[locations.length - 2].source_timestamp);
    if (isNaN(endTimestamp)) {
      // if both are invalid, throw an error
      throw new Error(`Invalid timestamps in the last two locations:
      ${locations[locations.length - 1].source_timestamp},
      ${locations[locations.length - 2].source_timestamp}`);
    }
  }
  const travelTimeInSeconds = (endTimestamp - startTimestamp).toFixed(
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
