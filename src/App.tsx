import React from "react";
import "./App.css";
import Map from "./Map";
import FileReaderComponent from "./FileReaderComponent";
import {
  extractGeoPoints,
  extractGuidanceInstructions,
  extractRoutes,
  extractRouteSummary,
  secondsToHoursMinutesSeconds,
} from "./route_utils";
import { GeoPoint, GuidanceInstruction, Route, Summary } from "./types";
import tomtomLogo from "./assets/tomtom-logo.png";
import mapPlaceholder from "./assets/map-placeholder.png";

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
          <div className="textField">
            {loaded && routeSummary ? (
              <>
                <div>{`Length: ${routeSummary.lengthInMeters} meters`}</div>
                <div>{`Travel time: ${secondsToHoursMinutesSeconds(
                  routeSummary.travelTimeInSeconds || 0
                )}`}</div>
              </>
            ) : (
              "Upload a JSON file with route data from TomTom Routing API."
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
