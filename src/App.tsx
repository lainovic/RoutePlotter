import React from "react";
import "./App.css";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import Map from "./Map";
import FileReaderComponent from "./FileReaderComponent";
import { secondsToHoursMinutesSeconds } from "./time_utils";
import {
  extractPoints,
  extractGuidanceInstructions,
  extractRoutes,
  extractRouteSummary,
} from "./route_utils";
import { NavigationPoint, GuidanceInstruction, Route, Summary } from "./types";
import tomtomLogo from "./assets/tomtom-logo.png";
import mapPlaceholder from "./assets/map-placeholder.png";
import { log } from "./logging_utils";
import { tomtomDarkBlue, tomTomRed } from "./colors";
import Note from "./Note";

function App() {
  const [fileContent, setFileContent] = React.useState<string>("");
  const [routePoints, setRoutePoints] = React.useState<NavigationPoint[]>([]);
  const [guidanceInstructions, setGuidanceInstructions] = React.useState<
    GuidanceInstruction[]
  >([]);
  const [routeSummary, setRouteSummary] = React.useState<Summary | null>(null);
  const [failMessage, setFailMessage] = React.useState<string | null>(null);
  const fileInputRef = React.useRef<any>(null);

  const onFailedToParse = (message: string) => {
    setFailMessage(message);
  };

  const isFailMessageCleared = () => {
    return failMessage !== null && failMessage == "";
  };

  const handlePaste = (event: React.ClipboardEvent) => {
    const pastedText = event.clipboardData.getData("text");
    setFileContent(pastedText);
  };

  React.useEffect(() => {
    if (fileContent === "") return;
    const routes: Route[] = extractRoutes(fileContent, onFailedToParse);
    if (routes.length === 0) {
      setFailMessage("No routes found in file.");
      return;
    }
    const route = routes[0];
    log("Route loaded", route);
    const points: NavigationPoint[] = extractPoints(route, onFailedToParse);
    if (points.length === 0) {
      setFailMessage("No valid points found.");
      return;
    }
    log("Geo-points extracted", points);
    setRoutePoints(points);
    setGuidanceInstructions(extractGuidanceInstructions(route));
    setRouteSummary(extractRouteSummary(route));
    setFailMessage("");
  }, [fileContent]);

  React.useEffect(() => {
    if (failMessage === "") return;
    toast.error(failMessage, {
      position: "top-center",
      hideProgressBar: true,
      autoClose: 500, // Duration in milliseconds
    });
  }, [failMessage]);

  return (
    <div className="App" onPaste={handlePaste}>
      <header className="App-header">
        <img id="header-logo" src={tomtomLogo} alt="TomTom Logo" />
        Route Plotter
      </header>
      <main>
        {isFailMessageCleared() ? (
          <>
            <div id="map-container">
              <Map
                routePoints={routePoints}
                guidanceInstructions={guidanceInstructions}
              />
            </div>
            <div className="sidebar">
              <div
                className="highlighted-field"
                style={{ borderLeftColor: tomtomDarkBlue }}
              >
                <div className="note-container">
                  <Note />
                  <p className="note">
                    <div className="legend">
                      <span className="orange circle"></span> departure
                    </div>
                    <div className="legend">
                      <span className="green circle"></span> arrival
                    </div>
                    <br />
                    Click once to add a point, then click again to display the
                    Haversine distance between them.
                    <br />
                    <br />
                    Press <span className="key">C</span> to center the map on a
                    specific latitude and longitude.
                    <br />
                    Press <span className="key">X</span> to center the map
                    around the route again.
                    <br />
                    Press <span className="key">R</span> to toggle the
                    visibility of the route.
                    <br />
                    Press <span className="key">G</span> to toggle the
                    visibility of guidance instructions.
                    <br />
                    <br />
                    Right click on the map to copy the latitude and longitude of
                    a point to the clipboard.
                    <br />
                    <br />
                    Refresh the page or click the button below to upload a new
                    file and plot a new route.
                  </p>
                </div>
                <br />
                <p>
                  Size:{" "}
                  <span style={{ color: tomtomDarkBlue }}>
                    {routePoints.length} points
                  </span>
                </p>
                {routeSummary && (
                  <>
                    <div>
                      {`Length: `}
                      <span style={{ color: tomtomDarkBlue }}>
                        {routeSummary.lengthInMeters}
                        {` meters`}
                      </span>
                    </div>
                    <div>
                      {`Travel time: `}
                      <span style={{ color: tomtomDarkBlue }}>
                        {secondsToHoursMinutesSeconds(
                          routeSummary.travelTimeInSeconds || 0
                        )}
                      </span>
                    </div>
                  </>
                )}
              </div>
              <FileReaderComponent
                fileInputRef={fileInputRef}
                onFileLoaded={setFileContent}
              />
            </div>
          </>
        ) : (
          <>
            <div id="map-container">
              <img
                id="map-placeholder"
                src={mapPlaceholder}
                alt="TomTom Logo"
                style={{ opacity: 0.5 }}
                onClick={() => fileInputRef.current?.click()}
              />
            </div>
            <div className="sidebar">
              {failMessage ? (
                <div
                  className="highlighted-field"
                  style={{ borderLeftColor: tomTomRed }}
                >
                  Error: {failMessage}
                </div>
              ) : (
                <div
                  className="highlighted-field"
                  style={{ borderLeftColor: tomtomDarkBlue }}
                >
                  To get started, upload a TTP or JSON file containing route
                  data response from the TomTom Routing API. You can click on
                  the map or the button below to upload, or simply paste the
                  content directly.
                </div>
              )}
              <FileReaderComponent
                fileInputRef={fileInputRef}
                onFileLoaded={setFileContent}
              />
            </div>
            <ToastContainer />
          </>
        )}
      </main>
    </div>
  );
}

export default App;
