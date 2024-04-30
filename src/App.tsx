import React from "react";
import "./App.css";
import Map from "./Map";
import FileReaderComponent from "./FileReaderComponent";
import { secondsToHoursMinutesSeconds } from "./time_utils";
import {
  extractGeoPoints,
  extractGuidanceInstructions,
  extractRoutes,
  extractRouteSummary,
} from "./route_utils";
import { GeoPoint, GuidanceInstruction, Route, Summary } from "./types";
import tomtomLogo from "./assets/tomtom-logo.png";
import mapPlaceholder from "./assets/map-placeholder.png";
import { log } from "./logging_utils";

const onFailedToParse = (message: string) => alert(message);

function App() {
  const [fileContent, setFileContent] = React.useState<string>("");
  const [routePoints, setRoutePoints] = React.useState<GeoPoint[]>([]);
  const [loaded, setLoaded] = React.useState<boolean>(false);
  const [guidanceInstructions, setGuidanceInstructions] = React.useState<
    GuidanceInstruction[]
  >([]);
  const [routeSummary, setRouteSummary] = React.useState<Summary | null>(null);

  React.useEffect(() => {
    const routes: Route[] = extractRoutes(fileContent, onFailedToParse);
    if (routes.length === 0) {
      setLoaded(false);
      return;
    }
    const route = routes[0];
    log("Route loaded", route);
    const geopoints: GeoPoint[] = extractGeoPoints(route, onFailedToParse);
    setRoutePoints(geopoints);
    const guidanceInstructions: GuidanceInstruction[] =
      extractGuidanceInstructions(route);
    setGuidanceInstructions(guidanceInstructions);
    const summary: Summary = extractRouteSummary(route);
    setRouteSummary(summary);
    setLoaded(true);
  }, [fileContent]);

  const fileInputRef = React.useRef<any>(null);

  return (
    <div className="App">
      <header className="App-header">
        <img id="header-logo" src={tomtomLogo} alt="TomTom Logo" />
        Route Plotter
      </header>
      <main>
        <div id="map-container">
          {loaded ? (
            <Map
              routePoints={routePoints}
              guidanceInstructions={guidanceInstructions}
            />
          ) : (
            <img
              id="map-placeholder"
              src={mapPlaceholder}
              alt="TomTom Logo"
              style={{ opacity: 0.5 }}
              onClick={() => fileInputRef.current?.click()}
            />
          )}
        </div>
        <div className="sidebar">
          {loaded && (
            <>
              <p className="note">
                Click once to add a point, then click again to display the
                Haversine distance between them.
              </p>
              <p className="note">
                Press <span className="key">C</span> to center the map on a specific latitude and
                longitude.
              </p>
              <p className="note">
                Right click on the map to copy the latitude and longitude of a point to the clipboard.
              </p>
            </>
          )}
          <br />
          <div className="textField">
            {loaded && routeSummary ? (
              <>
                <div>{`Length: ${routeSummary.lengthInMeters} meters`}</div>
                <div>{`Travel time: ${secondsToHoursMinutesSeconds(
                  routeSummary.travelTimeInSeconds || 0
                )}`}</div>
              </>
            ) : (
              "Upload a TTP or JSON file with route data from TomTom Routing API by click on the map or on the button below."
            )}
          </div>
          <FileReaderComponent
            fileInputRef={fileInputRef}
            onFileLoaded={setFileContent}
          />
          {loaded && routeSummary && <div className="textField"></div>}
        </div>
      </main>
    </div>
  );
}

export default App;
