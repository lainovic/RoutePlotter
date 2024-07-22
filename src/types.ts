export interface NavigationPoint {
  timestamp: string | any | null;
  latitude: number | any;
  longitude: number | any;
  speed: number | any | null;
}

export interface RoutePoint {
  coordinates: NavigationPoint;
  routeOffset: number;
  travelTime: number;
}

export interface RouteStop {
  coordinates: NavigationPoint;
  routeOffset: number;
}

export interface Route {
  legs: RouteLeg[];
  summary: Summary;
  guidance: {
    instructions: GuidanceInstruction[];
  };
}

export interface RouteLeg {
  summary: Summary | null;
  points: NavigationPoint[];
}

export interface Summary {
  lengthInMeters: number;
  travelTimeInSeconds: number;
  trafficDelayInSeconds: number | null;
  trafficLengthInMeters: number | null;
  departureTime: string | null;
  arrivalTime: string | null;
}

export interface GuidanceInstruction {
  drivingSide: string;
  maneuver: string;
  maneuverPoint: NavigationPoint;
  routeOffsetInMeters: number;
  routePath: RoutePath[];
}

export interface RoutePath {
  distanceInMeters: number;
  point: NavigationPoint;
  travelTimeInSeconds: number;
}

export interface Message {
  value: string;
}

/**
 * Represents a value that may be either a successful result or an error.
 *
 * The `Maybe` class is a container that can hold either a successful result of type `T` or an error of type `E`.
 * It provides a set of methods to handle the success or failure cases.
 *
 * @template E - The type of the error.
 * @template T - The type of the successful result.
 */
export class Maybe<E, T> {
  error: E | null;
  result: T | null;

  constructor(error: E | null = null, result: T | null = null) {
    this.error = error;
    this.result = result;
  }

  static success<E, T>(result: T): Maybe<E, T> {
    return new Maybe<E, T>(null, result);
  }

  static failure<E, T>(error: E): Maybe<E, T> {
    return new Maybe<E, T>(error, null);
  }

  isFailure(): boolean {
    return this.error !== null;
  }
  isSuccess(): boolean {
    return this.result !== null;
  }

  getError(): E | null {
    return this.error;
  }

  getResult(): T | null {
    return this.result;
  }

  ifFailure(callback: (error: E) => void): Maybe<E, T> {
    if (this.isFailure()) {
      callback(this.error!!);
    }
    return this;
  }

  ifSuccess(callback: (result: T) => void): Maybe<E, T> {
    if (this.isSuccess()) {
      callback(this.result!!);
    }
    return this;
  }

  finally(callback: () => void) {
    callback();
  }
}

/**
 * Represents an error that occurred during the application's execution.
 * @property {string} message - A description of the error that occurred.
 */
export interface ApplicationError {
  message: string;
}
