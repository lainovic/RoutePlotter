import {
  NavigationPoint,
  Route,
  Summary,
  GuidanceInstruction,
  Message,
  Maybe,
  ApplicationError,
} from "./types";
import { log, error as logError, logAsRouteObjects } from "./logging_utils";

export const supportedVersion = "0.0.12";

export interface Routes {
  routes: Route[];
  message: Message;
}

interface Points {
  points: NavigationPoint[];
  message: Message;
}

export type MaybeRoutes = Maybe<ApplicationError, Routes>;
export type MaybePoints = Maybe<ApplicationError, Points>;

/**
 * Attempts to extract routes from the provided text, trying various parsing methods.
 * The order of parsing methods is important, as the first successful method will be used.
 * The order is:
 * 1. JSON
 * 2. TTP
 * 3. pasted coordinates
 *
 * @param text - The text to parse for routes.
 * @returns A `Maybe` containing the parsed routes, or a failure with an error message.
 */
export function extractRoutes(text: string): MaybeRoutes {
  if (text.length === 0) return Maybe.failure({ message: "Empty file" });
  try {
    return parseJSON(text);
  } catch (error) {
    logError("Error parsing as JSON:", error);
    try {
      return parseTTP(text);
    } catch (error) {
      logError("Error parsing as TTP:", error);
      try {
        return parsePastedCoordinates(text);
      } catch (error) {
        logError("Error parsing as pasted coordinates:", error);
        return Maybe.failure({ message: "Error parsing text" });
      }
    }
  }
}

function parseJSON(text: string): MaybeRoutes {
  const json = JSON.parse(text);
  if (!json) {
    throw new Error("Invalid JSON");
  }
  if (json.formatVersion !== supportedVersion) {
    return Maybe.failure({
      message: `Unsupported version: ${json.formatVersion}`,
    });
  }
  log("Parsed JSON:", json);
  if (json && json.routes && Array.isArray(json.routes)) {
    logAsRouteObjects(json.routes);
    return Maybe.success({
      routes: json.routes,
      message: { value: "JSON" },
    });
  }
  throw new Error("No routes found in JSON");
}

/**
 * Parse pasted coordinates in the following format:
 * GeoPoint(latitude = 48.1441900, longitude = 11.5709049), ...
 */
function parsePastedCoordinates(text: string): MaybeRoutes {
  log("Parsing for pasted coordinates:", text);
  const points: NavigationPoint[] = findMatches(text);
  if (points.length === 0) {
    throw new Error("No valid GeoPoints found in pasted text");
  }

  const route: Route = {
    legs: [
      {
        points: points,
        summary: null
      },
    ],
    summary: {
      lengthInMeters: calculateDistanceInMeters(points),
      travelTimeInSeconds: 0,
      trafficDelayInSeconds: null,
      trafficLengthInMeters: null,
      departureTime: null,
      arrivalTime: null,
    },
    guidance: {
      instructions: [],
    },
  };

  return Maybe.success({
    routes: [route],
    message: { value: "Pasted points" },
  });
}

function findMatches(text: string): NavigationPoint[] {
  const regex_raw_coordinates = /([\d.-]+)[,\s]+([\d.-]+)/g;
  const regex_raw_coordinates_with_named_args =
    /latitude\s?=\s?([\d.-]+)[,\s]+longitude\s?=\s?([\d.-]+)/g;
  const regex_with_named_args =
    /GeoPoint\(latitude\s?=\s?([\d.-]+)[,\s]+longitude\s?=\s?([\d.-]+)\)/g;
  const regex_with_args = /GeoPoint\(([\d.-]+)[,\s]+([\d.-]+)\)/g;
  const regexes = [
    regex_with_named_args,
    regex_with_args,
    regex_raw_coordinates_with_named_args,
    regex_raw_coordinates,
  ];
  const result: NavigationPoint[] = [];
  let match: RegExpExecArray | null;
  for (let regex of regexes) {
    while ((match = regex.exec(text))) {
      log("Match:", match);
      const latitude = parseFloat(match[1]);
      const longitude = parseFloat(match[2]);
      if (latitude && longitude) {
        result.push({
          timestamp: null,
          latitude: latitude,
          longitude: longitude,
          speed: null,
        });
      }
    }
    if (result.length > 0) {
      break;
    }
  }
  return result;
}

function parseTTP(text: string): MaybeRoutes {
  const lines = text.split("\n");
  const header = "BEGIN:ApplicationVersion=TomTom Positioning";
  if (!lines[0].startsWith(header)) {
    throw new Error("Invalid TTP format");
  }
  const supportedVersion = "0.7";
  const ttpVersion = lines[0].slice(header.length + 1);
  if (ttpVersion !== supportedVersion) {
    return Maybe.failure({
      message: `Unsupported TTP version: ${ttpVersion}, expected ${supportedVersion}`,
    });
  }
  const incoming_points = parseTTPPoints(lines, TYPE_INCOMING_LOCATION);
  const outgoing_points = parseTTPPoints(lines, TYPE_OUTGOING_LOCATION);
  let points: NavigationPoint[] = [];
  const message: Message = { value: "" };
  if (incoming_points.length === 0) {
    points = outgoing_points;
    message.value = "TTP: outgoing locations";
  } else if (outgoing_points.length === 0) {
    points = incoming_points;
    message.value = "TTP: incoming locations";
  } else {
    // just take the longest list of points
    if (outgoing_points.length > incoming_points.length) {
      points = outgoing_points;
      message.value = "TTP: outgoing locations";
    } else {
      points = incoming_points;
      message.value = "TTP: incoming locations";
    }
  }
  const route: Route = {
    legs: [
      {
        points: points,
        summary: null
      },
    ],
    summary: {
      lengthInMeters: calculateDistanceInMeters(points),
      travelTimeInSeconds: calculateTravelTimeInSeconds(points),
      trafficDelayInSeconds: null,
      trafficLengthInMeters: null,
      departureTime: null,
      arrivalTime: null,
    },
    guidance: {
      instructions: [],
    },
  };
  return Maybe.success({ routes: [route], message: message });
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

export function extractPoints(route: Route): MaybePoints {
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
    return Maybe.success({ points, message: { value: "Extracted points" } });
  } catch (error) {
    return Maybe.failure({ message: "Error extracting points: " + error });
  }
}

const TYPE_OUTGOING_LOCATION = "237";
const TYPE_INCOMING_LOCATION = "245";
