import {
  NavigationPoint,
  Route,
  Summary,
  GuidanceInstruction,
  GnssLocation,
  Message,
} from "./types";
import { log, error as logError } from "./logging_utils";
import Papa from "papaparse";

export const supportedVersion = "0.0.12";

export function extractRoutes(
  text: string,
  onFailure: (message: Message) => void,
  onSuccess: (message: Message) => void
): Route[] {
  if (text.length === 0) return [];
  try {
    return parseJSON(text, onSuccess);
  } catch (error) {
    logError("Error parsing as JSON:", error);
    try {
      return parseTTP(text, onSuccess);
    } catch (error) {
      logError("Error parsing as TTP:", error);
      try {
        return parsePastedCoordinates(text, onSuccess);
      } catch (error) {
        logError("Error parsing as pasted coordinates:", error);
        try {
          return parseCSV(text, onSuccess);
        } catch (error) {
          logError("Error parsing as CSV:", error);
          onFailure({ value: "Error parsing file: " + error });
          return [];
        }
      }
    }
  }
}

function parseJSON(text: string, onSuccess: (message: Message) => void): any {
  const json = JSON.parse(text);
  if (json.formatVersion !== supportedVersion) {
    throw new Error("Unsupported version: " + json.formatVersion);
  }
  log("Parsed JSON:", json);
  if (json && json.routes && Array.isArray(json.routes)) {
    onSuccess({ value: "Using routes from JSON response" });
    return json.routes;
  }
  throw new Error("No routes found in JSON");
}

/**
 * Parse CSV text into a Route object, assuming the following format:
 * reception_timestamp,source_timestamp,id,channel,lon,lonAccuracy,lat,latAccuracy,alt,altAccuracy,heading, ...
 * This format is outputted by the TTP utility coming from TomTom AS Positioning.
 *
 * It can also be used for pasted coordinates in the following format:
 * GeoPoint(latitude = 48.1441900, longitude = 11.5709049), ...
 */
function parseCSV(
  text: string,
  onSuccess: (message: Message) => void
): Route[] {
  var data = Papa.parse<GnssLocation>(text, { header: true });
  log("Parsed CSV:", data.data);
  const locations = data.data as GnssLocation[];
  let points = parseCSVPoints(locations);
  if (points.length === 0) {
    return [];
  }
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

  onSuccess({ value: "Using CSV locations" });

  return [route];
}

function parseCSVPoints(locations: GnssLocation[]): NavigationPoint[] {
  return locations
    .filter(
      (location) =>
        location.lat !== undefined &&
        location.lon !== undefined &&
        location.source_timestamp !== undefined
    )
    .map((location) => {
      const point: NavigationPoint = {
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

/**
 * Parse pasted coordinates in the following format:
 * GeoPoint(latitude = 48.1441900, longitude = 11.5709049), ...
 */
function parsePastedCoordinates(
  text: string,
  onSuccess: (message: Message) => void
): Route[] {
  log("Parsing for pasted coordinates:", text);
  const regex_with_named_args =
    /GeoPoint\(latitude = ([\d.-]+), longitude = ([\d.-]+)\)/g;
  const regex_with_args = /GeoPoint\(([\d.-]+), ([\d.-]+)\)/g;
  const regexes = [regex_with_named_args, regex_with_args];
  const navigationPoints: NavigationPoint[] = [];
  let match: RegExpExecArray | null;
  regexes.forEach((regex) => {
    while ((match = regex.exec(text))) {
      const latitude = parseFloat(match[1]);
      const longitude = parseFloat(match[2]);
      if (latitude && longitude) {
        navigationPoints.push({
          timestamp: null,
          latitude: latitude,
          longitude: longitude,
          speed: null,
        });
      }
    }
  });

  if (navigationPoints.length === 0) {
    throw new Error("No valid GeoPoints found in pasted text");
  }

  const route: Route = {
    legs: [
      {
        points: navigationPoints,
      },
    ],
    summary: {
      lengthInMeters: calculateDistanceInMeters(navigationPoints),
      travelTimeInSeconds: 0,
    },
    guidance: {
      instructions: [],
    },
  };

  onSuccess({ value: "Using pasted coordinates" });

  return [route];
}

function parseTTP(
  text: string,
  onSuccess: (message: Message) => void
): Route[] {
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
  const incoming_points = parseTTPPoints(lines, TYPE_INCOMING_LOCATION);
  const outgoing_points = parseTTPPoints(lines, TYPE_OUTGOING_LOCATION);
  let points: NavigationPoint[] = [];
  if (incoming_points.length === 0) {
    points = outgoing_points;
    onSuccess({
      value: "No incoming locations found in TTP, using outgoing locations",
    });
  } else if (outgoing_points.length === 0) {
    points = incoming_points;
    onSuccess({
      value: "No outgoing locations found in TTP, using incoming locations",
    });
  } else {
    // just take the longest list of points
    if (outgoing_points.length > incoming_points.length) {
      points = outgoing_points;
      onSuccess({ value: "Using TTP outgoing locations" });
    } else {
      points = incoming_points;
      onSuccess({ value: "Using TTP incoming locations" });
    }
  }
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

function parseTTPPoints(lines: string[], type: string): NavigationPoint[] {
  const points: NavigationPoint[] = [];
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
    if (parts[1] !== type) {
      return;
    }
    const lon = parts[3];
    const lat = parts[5];
    const speed = parts[11];
    // we only care about outgoing locations (i.e. post-processed input locations)
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

function calculateTravelTimeInSeconds(points: NavigationPoint[]): number {
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

function calculateDistanceInMeters(points: NavigationPoint[]): number {
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
  previous: NavigationPoint,
  current: NavigationPoint
): number {
  if (
    !previous.latitude ||
    !previous.longitude ||
    !current.latitude ||
    !current.longitude
  ) {
    logError("Invalid latitudes or longitudes");
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

export function extractWaypoints(route: Route): NavigationPoint[] {
  const waypoints: NavigationPoint[] = [];
  route.legs.forEach((leg, index) => {
    if (leg && leg.points && Array.isArray(leg.points)) {
      waypoints.push(leg.points[0]);
      if (index === route.legs.length - 1) {
        waypoints.push(leg.points[leg.points.length - 1]); // arrival point
      }
    }
  });
  return waypoints;
}

export function extractGuidanceInstructions(
  route: Route
): GuidanceInstruction[] {
  return route.guidance?.instructions || [];
}

export function extractRouteSummary(route: Route): Summary {
  return route.summary;
}

export function extractPoints(
  route: Route,
  onFailure: (message: Message) => void
): NavigationPoint[] {
  try {
    const points: NavigationPoint[] = [];
    route.legs.forEach((leg, index) => {
      if (leg && leg.points && Array.isArray(leg.points)) {
        if (index > 0) {
          points.push(...leg.points.slice(1)); // skip the first point,
          // as it's a duplicate of the last point of the previous leg
        } else {
          points.push(...leg.points);
        }
      }
    });
    return points;
  } catch (error) {
    onFailure({ value: "Error extracting geo points: " + error });
    return [];
  }
}

const TYPE_OUTGOING_LOCATION = "237";
const TYPE_INCOMING_LOCATION = "245";
