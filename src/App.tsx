import React from "react";
import "./App.css";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import PlotMap from "./PlotMap";
import RouteMap from "./RouteMap";
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
  Summary,
  Message,
  Route,
  Maybe,
  ApplicationError,
} from "./types";
import tomtomLogo from "./assets/tomtom-logo.png";
import { log } from "./logging_utils";
import { tomtomDarkGray, tomTomRed } from "./colors";

const ROUTE_CREATOR_MODE = "route-creator";
const ROUTE_PLOTTER_MODE = "route-plotter";

type MaybeMessage = Maybe<ApplicationError, Message | null>;

/**
 * The main React component for the application.
 * It manages the state of the file content, route points, guidance instructions, waypoints, route summary, and loading state.
 * It also handles user interactions such as pasting, dropping files, and clicking on the map.
 * The component renders different views based on the active tab (route plotter or route creator).
 */
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
  const [isLoading, setLoading] = React.useState<boolean>(false);

  const [activeTab, setActiveTab] = React.useState<string>(ROUTE_PLOTTER_MODE);

  const [replaceInputData, setReplaceInputData] = React.useState<boolean>(true);

  const [ifPasted, setIfPasted] = React.useState<boolean>(false);

  const fileInputRef = React.useRef<any>(null);

  const handlePaste = (event: React.ClipboardEvent) => {
    event.preventDefault();
    const pastedText = event.clipboardData.getData("text");
    if (replaceInputData) {
      setFileContent(pastedText);
    } else {
      setFileContent(fileContent + " " + pastedText);
    }
    setIfPasted(true);
  };

  const handleDrop = (event: React.DragEvent) => {
    log("Dropped file", event);
    event.preventDefault();
    const file = event.dataTransfer.files[0];
    const reader = new FileReader();
    reader.onload = () => {
      const content = reader.result as string;
      setFileContent(content);
      setIfPasted(false);
    };
    reader.readAsText(file);
  };

  React.useEffect(() => {
    if (fileContent === "") return;
    setLoading(true);
    setTimeout(() => {
      extractRoutes(fileContent)
        .ifSuccess((result) => {
          setSuccessMessage(result.message);
          handleExtractedRoutes(result.routes)
            .ifSuccess(setSuccessMessage)
            .ifFailure((error) => {
              log("Failed to handle the route extraction", error);
              setFailMessage({ value: error.message });
            });
        })
        .ifFailure((error) => {
          log("Failed to extract routes", error);
          setFailMessage({ value: error.message });
        })
        .finally(() => {
          setLoading(false);
        });
    });
  }, [fileContent]);

  /**
   * Handles the extraction of routes from a given array of routes.
   *
   * If no valid routes are found, a failure message is returned.
   * Otherwise, the first route is loaded, and its points, guidance instructions, waypoints, and route summary are extracted and set in the component state.
   * If any errors occur during the extraction process, a failure message is set in the component state.
   *
   * @param routes - An array of routes to be processed.
   * @returns A `Maybe` object containing a success or failure message.
   */
  const handleExtractedRoutes = (routes: Route[]): MaybeMessage => {
    if (routes.length === 0) {
      return Maybe.failure({ message: "No valid routes found." });
    }
    log("Routes extracted:", routes);
    const route = routes[0];
    log("Only the first route is loaded:", route);
    extractPoints(route)
      .ifSuccess((result) => {
        const points = result.points;
        if (points.length === 0) {
          return Maybe.failure({ message: "No valid points found." });
        }
        log(result.message.value, points);
        setRoutePoints(points);
        setGuidanceInstructions(extractGuidanceInstructions(route));
        setWaypoints(extractWaypoints(route));
        setRouteSummary(extractRouteSummary(route));
        return Maybe.success(result.message);
      })
      .ifFailure((error) => {
        log("Failed to extract routes", error);
        return Maybe.failure({ message: error.message });
      });

    return Maybe.success(null);
  };

  React.useEffect(() => {
    if (failMessage === null) return;
    if (failMessage.value === "") return;
    toast.error(failMessage.value);
  }, [failMessage]);

  React.useEffect(() => {
    if (successMessage === null) return;
    if (successMessage.value === "") return;
    toast.success(successMessage.value);
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
        route
        <ul className="tabs">
          <li>
            <div
              className={
                activeTab === ROUTE_PLOTTER_MODE ? "tab active" : "tab"
              }
              onClick={() => {
                setActiveTab(ROUTE_PLOTTER_MODE);
              }}
            >
              plotter
            </div>
          </li>
          <li>
            <div
              className={
                activeTab === ROUTE_CREATOR_MODE ? "tab active" : "tab"
              }
              onClick={() => {
                setActiveTab(ROUTE_CREATOR_MODE);
              }}
            >
              creator
            </div>
          </li>
        </ul>
      </header>
      {isLoading && (
        <div className="loader-container">
          <div className="loader-spinner"></div>
        </div>
      )}
      <main>
        {activeTab === ROUTE_CREATOR_MODE ? (
          // Route Creator
          <>
            <div id="map-container">
              <RouteMap />
            </div>
            <div className="sidebar">
              <div
                className="highlighted-field"
                style={{ borderLeftColor: tomTomRed }}
              >
                <div className="note">
                  <div className="note-title">Help</div>
                  <ul>
                    <li>Press left click on the map to add a point.</li>
                    <li>Press right click on the point to remove it.</li>
                    <li>You can drag the points around.</li>
                  </ul>
                  Press <span className="key">C</span> to clear all elements.
                  <br />
                  Press <span className="key">X</span> to center the map around
                  the route.
                </div>
              </div>
            </div>
          </>
        ) : (
          // Route Plotter
          <>
            <div id="map-container">
              <PlotMap
                routePoints={routePoints}
                guidanceInstructions={guidanceInstructions}
                waypoints={waypoints}
              />
            </div>
            {routePoints.length > 0 ? (
              <>
                <div className="sidebar">
                  {ifPasted && (
                    <>
                      <div className="checkbox-container">
                        <input
                          type="checkbox"
                          id="replace-data"
                          name="replace-data"
                          checked={replaceInputData}
                          onChange={() =>
                            setReplaceInputData(!replaceInputData)
                          }
                        />
                        <label htmlFor="replace-data">
                          Replace current data
                        </label>
                      </div>
                      <div className="note">
                        <div className="note-content">
                          Check the box above to replace the current data with
                          the content in your clipboard. Uncheck it to append
                          the clipboard data to the existing data.
                        </div>
                      </div>
                    </>
                  )}
                  <div
                    className="highlighted-field"
                    style={{ borderLeftColor: tomTomRed }}
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
                    style={{ borderLeftColor: tomTomRed }}
                  >
                    <div className="note">
                      <div className="note-title">Help</div>
                      Click once to add a point, then click again to display the
                      Haversine distance between them.
                      <br />
                      <br />
                      Press <span className="key">P</span> to position the map
                      on a specific latitude and longitude.
                      <br />
                      Press <span className="key">X</span> to center the map
                      around the route.
                      <br />
                      Press <span className="key">R</span> to toggle the
                      visibility of the route.
                      <br />
                      Press <span className="key">G</span> to toggle the
                      visibility of guidance instructions.
                      <br />
                      Press <span className="key">W</span> to toggle the
                      visibility of waypoints.
                      <br />
                      Right click on the map to copy the latitude and longitude
                      of a point to the clipboard.
                      <br />
                      Paste the content, drop the file again, or click the
                      button below to upload a new file and plot a new route.
                    </div>
                  </div>

                  <summary
                    className="highlighted-field"
                    style={{ borderLeftColor: tomTomRed }}
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
                <div className="sidebar">
                  {
                    <div
                      className="highlighted-field"
                      style={{
                        borderLeftColor: tomTomRed,
                      }}
                    >
                      <div className="note">
                        <div className="note-title">Help</div>
                        <ul>
                          <li>
                            Click the button below to upload a file containing
                            route data.
                            <br />
                            The file can be in TTP or JSON format coming from
                            the TomTom Routing API.
                          </li>
                          <li>Drag and drop a file to upload it.</li>
                          <li>
                            Paste the coordinates directly. The coordinates need
                            to be separated by white spaces. The latitude and
                            longitude values need to be separated by a comma, or
                            a space, or a combination of both. The following
                            formats are accepted:
                            <div
                              style={{
                                textAlign: "center",
                                display: "flex",
                                flexDirection: "column",
                                font: "monospace",
                              }}
                            >
                              <code>Geopoint(latitude, longitude)</code>
                              <code>
                                Geopoint(latitude=value, longitude=value)
                              </code>
                              <code>latitude, longitude</code>
                              <code>latitude=value, longitude=value</code>
                            </div>
                          </li>
                        </ul>
                      </div>
                    </div>
                  }
                  <FileLoader
                    fileInputRef={fileInputRef}
                    onFileLoaded={(text) => {
                      setFileContent(text);
                      setIfPasted(false);
                    }}
                  />
                </div>
              </>
            )}
          </>
        )}
      </main>
      <ToastContainer
        position="top-center"
        hideProgressBar
        autoClose={1500}
        closeOnClick
        pauseOnHover
        style={{
          height: "50px",
          textAlign: "center",
        }}
      />
    </div>
  );
}

export default App;
