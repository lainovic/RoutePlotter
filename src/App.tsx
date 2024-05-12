import React from "react";
import "./App.css";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import Map from "./Map";
import FileLoader from "./FileLoader";
import { secondsToHoursMinutesSeconds } from "./time_utils";
import {
  extractPoints,
  extractGuidanceInstructions,
  extractRoutes,
  extractRouteSummary,
  extractWaypoints,
} from "./route_utils";
import {
  NavigationPoint,
  GuidanceInstruction,
  Route,
  Summary,
  Message,
} from "./types";
import tomtomLogo from "./assets/tomtom-logo.png";
import mapPlaceholder from "./assets/map-placeholder.png";
import { log } from "./logging_utils";
import { tomtomDarkBlue, tomtomDarkGray, tomTomRed } from "./colors";

function App() {
  const [fileContent, setFileContent] = React.useState<string>("");
  const [routePoints, setRoutePoints] = React.useState<NavigationPoint[]>([]);
  const [guidanceInstructions, setGuidanceInstructions] = React.useState<
    GuidanceInstruction[]
  >([]);
  const [waypoints, setWaypoints] = React.useState<NavigationPoint[]>([]);
  const [routeSummary, setRouteSummary] = React.useState<Summary | null>(null);
  const [failMessage, setFailMessage] = React.useState<Message | null>(null);
  const [successMessage, setSuccessMessage] = React.useState<Message | null>(
    null
  );
  const [isLoading, setIsLoading] = React.useState<boolean>(false);

  const fileInputRef = React.useRef<any>(null);

  const onFailureToParse = (message: Message) => {
    setFailMessage(message);
  };

  const onSuccessfulParse = (message: Message) => {
    setSuccessMessage(message);
  };

  const isFailMessageCleared = () => {
    return failMessage !== null && failMessage.value == "";
  };

  const handlePaste = (event: React.ClipboardEvent) => {
    event.preventDefault();
    const pastedText = event.clipboardData.getData("text");
    setFileContent(pastedText);
  };

  const handleDrop = (event: React.DragEvent) => {
    log("Dropped file", event);
    event.preventDefault();
    const file = event.dataTransfer.files[0];
    const reader = new FileReader();
    reader.onload = () => {
      const content = reader.result as string;
      setFileContent(content);
    };
    reader.readAsText(file);
  };

  React.useEffect(() => {
    if (fileContent === "") return;
    setIsLoading(true);
    setTimeout(() => {
      const routes: Route[] = extractRoutes(
        fileContent,
        onFailureToParse,
        onSuccessfulParse
      );
      if (routes.length === 0) {
        setFailMessage({ value: "No valid routes found." });
        setIsLoading(false);
        return;
      }
      const route = routes[0];
      log("Route loaded", route);
      const points: NavigationPoint[] = extractPoints(route, onFailureToParse);
      if (points.length === 0) {
        setFailMessage({ value: "No valid points found." });
        setIsLoading(false);
        return;
      }
      log("Geo-points extracted", points);
      setRoutePoints(points);
      setGuidanceInstructions(extractGuidanceInstructions(route));
      setWaypoints(extractWaypoints(route));
      setRouteSummary(extractRouteSummary(route));
      setFailMessage({ value: "" });
      setIsLoading(false);
    });
  }, [fileContent]);

  React.useEffect(() => {
    if (failMessage?.value === "") return;
    toast.error(failMessage?.value);
  }, [failMessage]);

  React.useEffect(() => {
    if (successMessage?.value === "") return;
    log("Success message", successMessage);
    toast.success(successMessage?.value);
  }, [successMessage]);

  return (
    <div
      className="App"
      onPaste={handlePaste}
      onDrop={handleDrop}
      onDragOver={(e) => {
        e.stopPropagation();
        e.preventDefault();
      }}
    >
      <header>
        <img id="header-logo" src={tomtomLogo} alt="TomTom Logo" />
        Route Plotter
      </header>
      {isLoading && (
        <div className="loader-container">
          <div className="loader-spinner"></div>
        </div>
      )}
      <main>
        {isFailMessageCleared() ? (
          <>
            <div id="map-container">
              <Map
                routePoints={routePoints}
                guidanceInstructions={guidanceInstructions}
                waypoints={waypoints}
              />
            </div>
            <div className="sidebar">
              <div
                className="highlighted-field"
                style={{ borderLeftColor: tomtomDarkBlue }}
              >
                <div className="note">
                  <div className="note-title">Legend</div>
                  <div className="legend">
                    <span className="orange circle"></span> departure
                  </div>
                  <div className="legend">
                    <span className="green circle"></span> arrival
                  </div>
                  <div className="legend">
                    <span className="yellow circle"></span> waypoint
                  </div>
                </div>
              </div>
              <div
                className="highlighted-field"
                style={{ borderLeftColor: tomtomDarkBlue }}
              >
                <div className="note">
                  <div className="note-title">Help</div>
                  Click once to add a point, then click again to display the
                  Haversine distance between them.
                  <br />
                  Press <span className="key">C</span> to center the map on a
                  specific latitude and longitude.
                  <br />
                  Press <span className="key">X</span> to center the map around
                  the route again.
                  <br />
                  Press <span className="key">R</span> to toggle the visibility
                  of the route.
                  <br />
                  Press <span className="key">G</span> to toggle the visibility
                  of guidance instructions.
                  <br />
                  Press <span className="key">W</span> to toggle the visibility
                  of waypoints.
                  <br />
                  Right click on the map to copy the latitude and longitude of a
                  point to the clipboard.
                  <br />
                  Refresh the page, drop the file again, or click the button
                  below to upload a new file and plot a new route.
                </div>
              </div>

              <summary
                className="highlighted-field"
                style={{ borderLeftColor: tomtomDarkBlue }}
              >
                <div className="note">
                  <div className="note-title">Summary</div>
                  <p>
                    Size:{" "}
                    <span style={{ color: tomtomDarkGray }}>
                      {routePoints.length} points
                    </span>
                  </p>
                  {routeSummary && (
                    <>
                      <p>
                        Distance:{" "}
                        <span style={{ color: tomtomDarkGray }}>
                          {routeSummary.lengthInMeters}
                          {` meters`}
                        </span>
                      </p>
                      <p>
                        Duration:{" "}
                        <span style={{ color: tomtomDarkGray }}>
                          {secondsToHoursMinutesSeconds(
                            routeSummary.travelTimeInSeconds || 0
                          )}
                        </span>
                      </p>
                    </>
                  )}
                </div>
              </summary>
              <FileLoader
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
                  Error: {failMessage.value}
                </div>
              ) : (
                <div
                  className="highlighted-field"
                  style={{ borderLeftColor: tomtomDarkBlue }}
                >
                  To get started, upload a TTP or JSON file containing route
                  data response from the TomTom Routing API.
                  <br />
                  You can click on the map or the button below to upload a file,
                  or drag and drop a file, or simply paste the content directly.
                </div>
              )}
              <FileLoader
                fileInputRef={fileInputRef}
                onFileLoaded={setFileContent}
              />
            </div>
          </>
        )}
      </main>
      <ToastContainer position="top-center" hideProgressBar autoClose={1500} />
    </div>
  );
}

export default App;
