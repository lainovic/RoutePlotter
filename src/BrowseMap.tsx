import React from "react";
import { log, logError } from "./logging_utils";
import { toast } from "react-toastify";
import L from "leaflet";
import { Ruler } from "./map_utils";
import CachedInput from "./CachedInput";

/**
 * Represents the available tile layer providers for the map.
 */
enum TileLayerProvider {
  OpenStreetMap = "OpenStreetMap",
  GoogleMap = "Google Maps",
  TomTom = "TomTom Genesis",
}

interface TileProviderConfig {
  url: string;
  apiKey: string | null;
}

const tileProviderLocalStorageKeys = new Map<TileLayerProvider, string>([
  [TileLayerProvider.TomTom, "tt_api_key"],
]);

/**
 * A map that associates TileLayerProvider values with objects containing the URL and the optional API key for that provider.
 */
type TileLayerProviderMap = Map<TileLayerProvider, TileProviderConfig>;

/**
 * Represents a map of tile layer providers to their corresponding Leaflet tile layers.
 */
type TileLayerMap = Map<TileLayerProvider, L.TileLayer>;

const tileLayerProviderInitialConfig: TileLayerProviderMap = new Map([
  [
    TileLayerProvider.OpenStreetMap,
    {
      url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
      apiKey: null,
    },
  ],
  [
    TileLayerProvider.GoogleMap,
    {
      url: "https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}",
      apiKey: null,
    },
  ],
  [
    TileLayerProvider.TomTom,
    {
      url: "https://api.tomtom.com/map/1/tile/basic/main/{z}/{x}/{y}.png",
      apiKey: "",
    },
  ],
]);

export default function BrowseMap() {
  const map = React.useRef<L.Map | null>(null);
  const ruler = React.useRef<Ruler>(new Ruler());

  const [tileLayerProviderConfigs, setTileLayerProviderConfigs] =
    React.useState<TileLayerProviderMap>(
      new Map(tileLayerProviderInitialConfig)
    );

  const tileLayers = React.useRef<TileLayerMap>(
    new Map(
      [...tileLayerProviderConfigs.keys()].map((provider) => {
        return [
          provider,
          L.tileLayer(getTilesUrlFrom(provider), {
            attribution: `&copy; ${provider}`,
          }),
        ];
      })
    )
  );

  const [currentTileLayerProvider, setCurrentTileLayerProvider] =
    React.useState<TileLayerProvider>(TileLayerProvider.OpenStreetMap);

  function getTilesUrlFrom(provider: TileLayerProvider): string {
    const data = tileLayerProviderConfigs.get(provider);
    if (data === undefined) {
      logError("Tile layer not found:", provider);
      return "";
    }
    return getTilesUrl(data);
  }

  function getTilesUrl(data: TileProviderConfig): string {
    return data.url + (data.apiKey ? `?key=${data.apiKey}` : "");
  }

  React.useLayoutEffect(() => {
    const newMapInstance = L.map("browse-map");
    log("BrowseMap created");

    newMapInstance.on("click", (e: L.LeafletMouseEvent) => {
      const { lat, lng } = e.latlng;
      const r = ruler.current;
      if (r.start === null) {
        r.createStart(lat, lng).addTo(newMapInstance);
      } else if (r.end === null) {
        r.createEnd(lat, lng).addTo(newMapInstance);
        r.createLine()?.addTo(newMapInstance);
        r.createPopup(e).openOn(newMapInstance);
      } else {
        r.remove();
      }
    });

    newMapInstance.on("contextmenu", async (e) => {
      const latlng = newMapInstance.mouseEventToLatLng(e.originalEvent);
      const coordinates = `${latlng.lat}, ${latlng.lng}`;
      log("Coordinates:", coordinates);
      try {
        await navigator.clipboard.writeText(coordinates);
        toast.success("Coordinates copied to clipboard!");
      } catch (error) {
        logError("Failed to copy coordinates to clipboard:", error);
        toast.error("Failed to copy coordinates to clipboard!");
      }
    });

    map.current = newMapInstance;

    // center the map on Amsterdam
    newMapInstance.setView([52.379189, 4.899431], 13);

    return () => {
      newMapInstance.remove();
      log("BrowseMap removed");
    };
  }, []);

  React.useEffect(() => {
    const m = map.current;
    if (m) {
      tileLayers.current.forEach((layer, provider) => {
        if (provider === currentTileLayerProvider) {
          layer.addTo(m);
        } else {
          layer.remove();
        }
      });
    }
  }, [currentTileLayerProvider]);

  function requireApiKey(tileLayerProvider: TileLayerProvider): boolean {
    return (
      tileLayerProviderConfigs.get(tileLayerProvider)?.apiKey !== null ?? false
    );
  }

  function setApiKey(apiKey: string, tileLayerProvider: TileLayerProvider) {
    const data = tileLayerProviderConfigs.get(tileLayerProvider);
    if (data === undefined || data.apiKey === apiKey) {
      return;
    }
    log(`Setting API key for ${tileLayerProvider}`);
    const newConfig: TileProviderConfig = { ...data, apiKey };
    const newMap = new Map(
      tileLayerProviderConfigs.set(tileLayerProvider, newConfig)
    );
    refreshTileLayer(tileLayerProvider, newConfig);
    setTileLayerProviderConfigs(newMap);
  }

  function refreshTileLayer(
    tileLayerProvider: TileLayerProvider,
    newConfig: TileProviderConfig
  ) {
    if (!map.current) {
      return;
    }
    const isCurrent = tileLayerProvider === currentTileLayerProvider;
    if (isCurrent) {
      tileLayers.current.get(tileLayerProvider)?.remove();
    }
    const newTileLayer = L.tileLayer(getTilesUrl(newConfig), {
      attribution: `&copy; ${tileLayerProvider}`,
    });
    tileLayers.current.set(tileLayerProvider, newTileLayer);
    if (isCurrent) {
      newTileLayer.addTo(map.current);
    }
  }

  function handleSelect(e: React.ChangeEvent<HTMLSelectElement>) {
    const selectedProvider = e.target.value as TileLayerProvider;
    log("Selected tile layer provider:", selectedProvider);
    const selectedTileLayer = tileLayers.current.get(selectedProvider);
    if (selectedTileLayer === undefined) {
      logError("Tile layer not found for:", selectedProvider);
      return;
    }
    setCurrentTileLayerProvider(selectedProvider);
  }

  return (
    <>
      <h1>Hello, route</h1>
      <div id="browse-map"></div>
      <div className="highlighted-field">
        <div className="note">
          <div className="note-title">
            Select a tile layer from the list of providers below.
          </div>
          <select onChange={handleSelect} value={currentTileLayerProvider}>
            {[...tileLayers.current.keys()].map((layer) => (
              <option key={layer} value={layer}>
                {layer}
              </option>
            ))}
          </select>
          {requireApiKey(currentTileLayerProvider) &&
            tileProviderLocalStorageKeys.has(currentTileLayerProvider) && (
              <CachedInput
                cacheKey={
                  tileProviderLocalStorageKeys.get(currentTileLayerProvider)!!
                }
                label={`API key`}
                onValueChange={(key) =>
                  setApiKey(key, currentTileLayerProvider)
                }
                style={{ marginLeft: "10px" }}
              />
            )}
          <div className="note-title">Help</div>
          <ul>
            <li>
              Click the button to upload a file containing route data.
              <br />
              The file can be in TTP or JSON format coming from the TomTom
              Routing API.
            </li>
            <li>Drag and drop a file to upload it.</li>
            <li>
              Paste the coordinates directly. The coordinates need to be
              separated by white spaces. The latitude and longitude values need
              to be separated by a comma, or a space, or a combination of both.
              The following formats are accepted:
              <div
                style={{
                  textAlign: "start",
                  display: "flex",
                  flexDirection: "column",
                  font: "monospace",
                }}
              >
                <code>Geopoint(latitude, longitude)</code>
                <code>Geopoint(latitude=value, longitude=value)</code>
                <code>latitude, longitude</code>
                <code>latitude=value, longitude=value</code>
              </div>
            </li>
          </ul>
        </div>
      </div>
    </>
  );
}
