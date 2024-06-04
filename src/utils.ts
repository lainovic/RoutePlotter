/**
 * Checks if any of the provided arrays have at least one element.
 * @param arrays - An array of arrays to check.
 * @returns `true` if any of the arrays have at least one element, `false` otherwise.
 */
export function anyOf(arrays: any[]) {
  return arrays.some((array) => array.length > 0);
}

/**
 * Represents the available tile layer providers for the map.
 */
export enum TileLayerProvider {
  OpenStreetMap = "OpenStreetMap",
  GoogleMap = "Google Maps",
  TomTom = "TomTom Genesis",
}
export const tileProviderLocalStorageKeys = new Map<TileLayerProvider, string>([
  [TileLayerProvider.TomTom, "tt_api_key"],
]);
