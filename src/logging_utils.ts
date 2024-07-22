import {
  NavigationPoint,
  Route,
  RouteLeg,
  RoutePoint,
  RouteStop,
  Summary,
} from "./types";

const Logger = {
  debug: true,

  log(message: string, ...rest: any[]) {
    if (this.debug) console.log(message, rest);
  },

  error(message: string, ...rest: any[]) {
    if (this.debug) console.error(message, rest);
  },

  /**
   * Prints the provided JSON routes in an object representation.
   *
   * @param jsonRoutes - An array of route objects in JSON format.
   * @returns void
   */
  logAsRouteObjects(jsonRoutes: any) {
    jsonRoutes.forEach((route: Route, index: number) => {
      console.log(`Route ${index} serialized as Kotlin object:`);
      console.log("-------------------");
      const output = buildRouteObject(route);
      console.log(output);
    });
  },
};

const DEFAULT_INDENT = 2;

/**
 * Provides general methods eassmble the text of an object representation.
 * Manages the indentation levels.
 * Useful for building strings with nested structures, such as JSON objects, Kotlin objects, etc.
 */
class Serializer {
  private indentLevel: number;
  private output: string;

  constructor() {
    this.indentLevel = 0;
    this.output = "";
  }

  reset() {
    this.indentLevel = 0;
    this.output = "";
  }

  indent(): void {
    this.output += " ".repeat(this.indentLevel);
  }

  increaseIndent(amount: number = DEFAULT_INDENT): void {
    this.indentLevel += amount;
  }

  decreaseIndent(amount: number = DEFAULT_INDENT): void {
    this.indentLevel = Math.max(0, this.indentLevel - amount);
  }

  /**
   * Calls the provided lambda function with the current indentation level increased by
   * the specified amount.
   */
  withIncrease(amount: number, lambda: (serializer: Serializer) => void): void {
    this.increaseIndent(amount);
    lambda(this);
    this.decreaseIndent(amount);
  }

  /**
   * Calls the provided lambda function with the current indentation level increased by
   * the default amount.
   * This is a convenience method to simplify increasing the indentation level for a block of code.
   *
   * @param lambda - The function to call with the increased indentation level.
   * @returns void
   */
  withDefaultIncrease(lambda: (serializer: Serializer) => void): void {
    this.withIncrease(DEFAULT_INDENT, lambda);
  }

  /**
   * Appends the provided string to the current indentation level and adds a newline character.
   *
   * @param text - The string to append.
   * @returns The indented and appended string.
   */
  append(text: string): void {
    this.indent();
    this.output += text + "\n";
  }

  /**
   * Wraps the provided text with the start and end strings,
   * and calls the provided lambda function with the increased indentation level.
   */
  wrap(start: string, end: string, lambda: (serializer: Serializer) => void) {
    this.append(start);
    this.withDefaultIncrease(lambda);
    this.append(end);
  }

  build(): string {
    return this.output;
  }
}

/**
 * Builds a textual object representation of a route, including its summary, legs,
 * and route stops.
 *
 * The string can be used as a starting point to define a Kotlin object.
 *
 * @param route - The route object to build the output for.
 * @returns A string representation of the route.
 */
function buildRouteObject(route: Route) {
  let output = "";
  const serializer = new Serializer();

  serializer.wrap("Route(", ")", (serializer) => {
    // Add the route summary.
    buildSummary(route.summary, serializer);

    // Add the route legs.
    buildRouteLegs(route.legs, serializer);

    // Add the route stops.
    buildRouteStops(route.legs, serializer);

    // Add the route points.
    buildRoutePoints(route, serializer);

    // TODO add sections.
    output += serializer.append("sections = Sections(),");

    // Add the modification history.
    serializer.wrap(
      "modificationHistory = RouteModificationHistory(",
      "),",
      (serializer) => {
        output += serializer.append(
          "RouteTimestamp(0L, Calendar.getInstance()),"
        );
      }
    );
  });

  return serializer.build();
}

function buildSummary(summary: Summary, serializer: Serializer) {
  serializer.wrap("summary = Summary(", "),", (serializer) => {
    serializer.withDefaultIncrease((manager) => {
      manager.append(`length = Distance.meters(${summary.lengthInMeters}),`);
      manager.append(`travelTime = ${summary.travelTimeInSeconds}.seconds,`);
      if (summary.departureTime) {
        manager.append(
          `departureTimeWithZone = ${formatDateTimeWithMilliseconds(
            summary.departureTime
          )},`
        );
      }
      if (summary.arrivalTime) {
        manager.append(
          `arrivalTimeWithZone = ${formatDateTimeWithMilliseconds(
            summary.arrivalTime
          )},`
        );
      }
    });
  });
}

function buildRouteLegs(legs: RouteLeg[], serializer: Serializer) {
  serializer.wrap("legs = listOf(", "),", (serializer) => {
    legs.forEach((leg) => {
      serializer.wrap("RouteLeg(", "),", (serializer) => {
        serializer.wrap("points = listOf(", "),", (serializer) => {
          leg.points.forEach((point) => {
            serializer.append(
              `GeoPoint(latitude = ${point.latitude}, longitude = ${point.longitude}),`
            );
          });
        });
        // TODO generate some guidance instructions
        serializer.append("instructions = emptyList(),");
        serializer.wrap("Summary(", "),", (serializer) => {
          serializer.append(`length = ${leg.summary?.lengthInMeters},`);
          serializer.append(`travelTime = ${leg.summary?.travelTimeInSeconds},`);
          if (leg.summary?.trafficDelayInSeconds) {
            serializer.append(
              `trafficDelay = ${leg.summary?.trafficDelayInSeconds},`
            );
          }
          if (leg.summary?.trafficLengthInMeters) {
            serializer.append(
              `trafficLength = ${leg.summary.trafficLengthInMeters},`
            );
          }
          if (leg.summary?.departureTime) {
            serializer.append(
              `departureTimeWithZone = ${formatDateTimeWithMilliseconds(
                leg.summary.departureTime
              )},`
            );
          }
          if (leg.summary?.arrivalTime) {
            serializer.append(
              `arrivalTimeWithZone = ${formatDateTimeWithMilliseconds(
                leg.summary.arrivalTime
              )},`
            );
          }
        });
      });
    });
  });
}

function buildRouteStops(legs: RouteLeg[], serializer: Serializer) {
  serializer.wrap("routeStops = listOf(", "),", (serializer) => {
    getRouteStops(legs).forEach((routeStop) => {
      buildRouteStop(routeStop, serializer);
    });
  });
}

function buildRoutePoints(route: Route, serializer: Serializer) {
  serializer.wrap("routePoints = listOf(", "),", (serializer) => {
    getRoutePoints(route).forEach((routePoint) => {
      buildRoutePoint(routePoint, serializer);
    });
  });
}

function buildRoutePoint(routePoint: RoutePoint, serializer: Serializer) {
  serializer.wrap("RoutePoint(", "),", (serializer) => {
    serializer.append(
      `coordinate = GeoPoint(latitude = ${routePoint.coordinates.latitude}, longitude = ${routePoint.coordinates.longitude}),`
    );
    serializer.append(`routeOffset = ${routePoint.routeOffset},`);
    serializer.append(`travelTime = ${routePoint.travelTime}`);
  });
}

function buildRouteStop(routeStop: RouteStop, serializer: Serializer) {
  serializer.wrap("RouteStop(", "),", (serializer) => {
    serializer.append("id = RouteStopId(),");
    serializer.append(
      `place = Place(GeoPoint(latitude = ${routeStop.coordinates.latitude}, longitude = ${routeStop.coordinates.longitude})),`
    );
    serializer.append("navigableCoordinates = emptyList(),");
    serializer.append(`routeOffset = ${routeStop.routeOffset}`);
  });
}

function getRoutePoints(route: Route): RoutePoint[] {
  const geometry = getRouteGeometry(route);
  const output: RoutePoint[] = [];
  geometry.forEach((point, index) => {
    if (index === 0) {
      output.push({
        coordinates: point,
        routeOffset: 0.0,
        travelTime: 0.0,
      });
    } else {
      const prevPoint = geometry[index - 1];
      const routeOffset =
        output[index - 1].routeOffset + distanceTo(prevPoint, point);
      output.push({
        coordinates: point,
        routeOffset: routeOffset,
        travelTime: 0.0,
      });
    }
  });

  return output;
}

function getRouteStops(legs: RouteLeg[]): RouteStop[] {
  const output: RouteStop[] = [];
  legs.forEach((leg, index) => {
    if (index == 0) {
      output.push({
        coordinates: leg.points[0],
        routeOffset: 0.0,
      });
    }
    output.push({
      coordinates: leg.points[leg.points.length - 1],
      routeOffset: 0.0,
    });
  });

  return output;
}

/**
 * Retrieves the navigation points that make up the geometry of a given route.
 * @param route - The route object containing the leg information.
 * @returns An array of navigation points representing the route geometry.
 */
function getRouteGeometry(route: Route): NavigationPoint[] {
  return route.legs.flatMap((leg, index) => {
    if (index > 0) {
      return leg.points.slice(1);
    } else {
      return leg.points;
    }
  });
}

const EARTH_RADIUS = 6371e3;

/**
 * Calculates the distance between two navigation points on the Earth's surface using the Haversine formula.
 * @param point1 - The first navigation point.
 * @param point2 - The second navigation point.
 * @returns The distance between the two navigation points in meters.
 */
function distanceTo(point1: NavigationPoint, point2: NavigationPoint): number {
  const { latitude: lat1, longitude: lon1 } = point1;
  const { latitude: lat2, longitude: lon2 } = point2;

  const phi1 = toRadians(lat1);
  const phi2 = toRadians(lat2);
  const deltaPhi = phi2 - phi1;
  const deltaLambda = toRadians(lon2 - lon1);

  const a =
    Math.sin(deltaPhi / 2) ** 2 +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return c * EARTH_RADIUS;
}

/**
 * Converts a value in degrees to radians.
 * @param degrees - The value in degrees.
 * @returns The value in radians.
 */
function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * Formats a date-time string by adding '.000' milliseconds before the timezone.
 */
function formatDateTimeWithMilliseconds(dateTimeStr: string): string {
  // Split the dateTimeStr at the '+' sign to separate the timezone
  const [dateTime, timezone] = dateTimeStr.split("+");
  // Add '.000' to the dateTime part and reassemble the string with the '+' and timezone part
  return `${dateTime}.000+${timezone}`;
}

export default Logger;
export const log = Logger.log.bind(Logger);
export const error = Logger.error.bind(Logger);
export const logAsRouteObjects = Logger.logAsRouteObjects.bind(Logger);
