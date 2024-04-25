import React from "react";
import "./App.css";
import Map from "./Map";
import FileReaderComponent from "./FileReaderComponent";
import {
  extractGeoPoints,
  extractRoutes,
  extractRouteSummary,
  secondsToHoursMinutesSeconds,
} from "./utils";
import { GeoPoint, Route, Summary } from "./types";

const onFailedToParse = (message: string) => alert(message);

function App() {
  const [fileContent, setFileContent] = React.useState<string>("");
  const [routePoints, setRoutePoints] = React.useState<GeoPoint[]>([]);
  const [routeTitle, setRouteTitle] = React.useState<string>("");

  React.useEffect(() => {
    const routes: Route[] = extractRoutes(fileContent, onFailedToParse);
    if (routes.length === 0) return;
    const route = routes[0];
    const geopoints: GeoPoint[] = extractGeoPoints(route, onFailedToParse);
    setRoutePoints(geopoints);
    const summary: Summary = extractRouteSummary(route);
    setRouteTitle(
      `Length: ${
        summary.lengthInMeters
      } meters, Travel time: ${secondsToHoursMinutesSeconds(
        summary.travelTimeInSeconds
      )}`
    );
    summary.lengthInMeters;
  }, [fileContent]);

  return (
    <div className="App">
      <header className="App-header">TomTom Route Plotter</header>
      <main>
        <Map routePoints={routePoints} routeTitle={routeTitle}/>
        <div className="buttons">
          <FileReaderComponent onFileLoaded={setFileContent} />
        </div>
      </main>
    </div>
  );
}

export default App;
