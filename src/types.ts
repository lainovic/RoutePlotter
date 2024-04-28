export interface GeoPoint {
  latitude: number | any;
  longitude: number | any;
  speed: number | any | null;
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

export interface GnssLocation {
  reception_timestamp: string;
  source_timestamp: string;
  id: string;
  channel: string;
  lon: number;
  lonAccuracy: number;
  lat: number;
  latAccuracy: number;
  alt: number;
  altAccuracy: number;
  heading: number;
  headingAccuracy: number;
  speed: number;
  speedAccuracy: number;
  slope: number;
  slopeAccuracy: number;
  distance: number;
  distanceAccuracy: number;
  utc: string;
  locationSourceQuality: string;
  locationSourceStatus: string;
  numberOfLanes: number;
  laneUsed: number;
  vehicleSpeed: number;
  drivingDirection: number;
  fixMode: number;
  numSatVisible: number;
  numSatUsed: number;
  roll: number;
  rollAccuracy: number;
}
