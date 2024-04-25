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
} from "./utils";
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
  const [routeTitle, setRouteTitle] = React.useState<string>("");

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
    setRouteTitle(
      `Length: ${
        summary.lengthInMeters
      } meters, Travel time: ${secondsToHoursMinutesSeconds(
        summary.travelTimeInSeconds
      )}`
    );
    summary.lengthInMeters;
    setLoaded(true);
  }, [fileContent]);

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
            <img id="map-placeholder" src={mapPlaceholder} alt="TomTom Logo" />
          )}
        </div>
        <div className="buttons">
          <FileReaderComponent onFileLoaded={setFileContent} />
          {loaded && <div>{routeTitle}</div>}
        </div>
      </main>
    </div>
  );
}

export default App;
