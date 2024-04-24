import React from "react";
import "./App.css";
import Map from "./Map";
import FileReaderComponent from "./FileReaderComponent";
import { GeoPoint, extractGeoPoints } from "./utils";

function App() {
  const [fileContent, setFileContent] = React.useState<string>("");
  const [routePoints, setRoutePoints] = React.useState<GeoPoint[]>([]);

  React.useEffect(() => {
    setRoutePoints(extractGeoPoints(fileContent, (message) => alert(message)));
  }, [fileContent]);

  return (
    <div className="App">
      <header className="App-header">TomTom Route Plotter</header>
      <main>
        <Map routePoints={routePoints} />
        <div className="buttons">
          <FileReaderComponent onFileLoaded={setFileContent} />
        </div>
      </main>
    </div>
  );
}

export default App;
