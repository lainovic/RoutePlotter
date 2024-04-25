export interface GeoPoint {
  latitude: number;
  longitude: number;
}

export interface Route {
  legs: {
    points: GeoPoint[];
  }[];
  summary: Summary;
  guidance: {
    instructions: Instruction[];
  };
}

export interface Summary {
  lengthInMeters: number;
  travelTimeInSeconds: number;
}

export interface Instruction {
  drivingSide: string;
  maneuver: string;
  maneuverPoint: GeoPoint;
  routeOffsetInMeters: number;
  routePath: RoutePath[];
}

export interface RoutePath {
  distanceInMeters: number;
  point: GeoPoint;
  travelTimeInSeconds: number;
}
