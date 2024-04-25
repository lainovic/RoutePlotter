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
    instructions: GuidanceInstruction[];
  };
}

export interface Summary {
  lengthInMeters: number;
  travelTimeInSeconds: number;
}

export interface GuidanceInstruction {
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
