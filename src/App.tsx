import React from "react";
import "./App.css";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import RouteMap from "./RouteMap";
import PlotMap from "./PlotMap";
import FileLoader from "./FileLoader";
import { parseRoutes, ParsedRoute } from "./route_utils";
import { Message } from "./types";
import tomtomLogo from "./assets/tomtom-logo.png";
import { log, logError } from "./logging_utils";
import BrowseMap from "./BrowseMap";
import { ParsedRawPoints, parseRawPoints } from "./raw_data_utils";
import { ParsedLogfile, parseLogfile } from "./logfile_utils";
import RawPointMap from "./RawDataMap";

enum AppMode {
  RouteCreator = "route-creator",
  RoutePlotter = "route-plotter",
}

enum DataSource {
  File = "file",
  Clipboard = "clipboard",
}

/**
 * The main React component for the application.
 * It manages the state of the file content, route points, guidance instructions, waypoints, route summary, and loading state.
 * It also handles user interactions such as pasting, dropping files, and clicking on the map.
 * The component renders different views based on the active tab (route plotter or route creator).
 */
function App() {
  const [inputData, setInputData] = React.useState<string>("");

  const [routes, setRoutes] = React.useState<ParsedRoute[]>([]);
  const [rawPoints, setRawPoints] = React.useState<ParsedRawPoints | null>(
    null
  );
  const [logFile, setLogfile] = React.useState<ParsedLogfile | null>(null);

  const [failureMessage, setFailureMessage] = React.useState<Message | null>(
    null
  );
  const [successMessage, setSuccessMessage] = React.useState<Message | null>(
    null
  );

  const [isLoading, setLoading] = React.useState<boolean>(false);

  const [activeTab, setActiveTab] = React.useState<AppMode>(
    AppMode.RoutePlotter
  );

  const [shouldUpdateData, setShouldUpdateData] =
    React.useState<boolean>(false);

  const fileInputRef = React.useRef<any>(null);

  const dataSource = React.useRef<DataSource>(DataSource.File);

  const resetInput = (content: string) => {
    setRoutes([]);
    setRawPoints(null);
    setLogfile(null);
    setInputData(content);
  };

  const handlePaste = (event: React.ClipboardEvent) => {
    event.preventDefault();
    const pastedText = event.clipboardData.getData("text");
    dataSource.current = DataSource.Clipboard;

    const updatedInput = shouldUpdateData
      ? `${inputData} ${pastedText}` // TODO: this doesn't work if the inputData got invalid and
      : // hence all subsequent updates fail
        pastedText;

    resetInput(updatedInput);
  };

  const handleDrop = (event: React.DragEvent) => {
    log("Dropped file", event);
    event.preventDefault();
    const file = event.dataTransfer.files[0];
    const reader = new FileReader();
    dataSource.current = DataSource.File;
    reader.onload = () => {
      const content = reader.result as string;
      resetInput(content);
    };
    reader.readAsText(file);
  };

  React.useEffect(() => {
    if (inputData === "") return;
    setLoading(true);
    setTimeout(() => {
      parseRoutes(inputData)
        .ifSuccess((maybeRoutes) => {
          if (maybeRoutes.result.length === 0) {
            setFailureMessage(maybeRoutes.message);
          } else {
            setSuccessMessage(maybeRoutes.message);
            setRoutes(maybeRoutes.result);
          }
        })
        .ifFailure((error) => {
          logError(error.value);
          setTimeout(() => {
            parseRawPoints(inputData)
              .ifSuccess((maybePoints) => {
                if (maybePoints.result.points.length === 0) {
                  setFailureMessage(maybePoints.message);
                } else {
                  setSuccessMessage(maybePoints.message);
                  setRawPoints(maybePoints.result);
                }
              })
              .ifFailure((error) => {
                logError(error.value);
                setTimeout(() => {
                  parseLogfile(inputData)
                    .ifSuccess((maybeLogfile) => {
                      if (maybeLogfile.result.log.length === 0) {
                        setFailureMessage(maybeLogfile.message);
                      } else {
                        setSuccessMessage(maybeLogfile.message);
                        setLogfile(maybeLogfile.result);
                      }
                    })
                    .ifFailure((error) => {
                      logError(error.value);
                      logError("Invalid input data.", inputData);
                      setFailureMessage({ value: `Invalid input data.` });
                    });
                });
              });
          });
        })
        .finally(() => {
          setLoading(false);
        });
    });
  }, [inputData]);

  React.useEffect(() => {
    if (failureMessage === null) return;
    if (failureMessage.value === "") return;
    toast.error(failureMessage.value);
  }, [failureMessage]);

  React.useEffect(() => {
    if (successMessage === null) return;
    if (successMessage.value === "") return;
    toast.success(successMessage.value);
  }, [successMessage]);

  return (
    <div
      className="App"
      {...(activeTab === AppMode.RoutePlotter && {
        onPaste: handlePaste,
        onDrop: handleDrop,
        onDragOver: (event: React.DragEvent) => {
          event.preventDefault();
          event.stopPropagation();
        },
      })}
    >
      <header>
        <img id="header-logo" src={tomtomLogo} alt="TomTom Logo" />
        route
        <ul className="tabs">
          <li>
            <div
              className={
                activeTab === AppMode.RoutePlotter ? "tab active" : "tab"
              }
              onClick={() => {
                setActiveTab(AppMode.RoutePlotter);
              }}
            >
              plotter
            </div>
          </li>
          <li>
            <div
              className={
                activeTab === AppMode.RouteCreator ? "tab active" : "tab"
              }
              onClick={() => {
                setActiveTab(AppMode.RouteCreator);
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
        {activeTab === AppMode.RouteCreator ? (
          <PlotMap />
        ) : (
          <>
            {routes.length > 0 ? (
              <RouteMap result={routes} />
            ) : (
              <>
                {rawPoints && rawPoints.points.length > 0 ? (
                  <RawPointMap result={rawPoints} />
                ) : (
                  <>
                    {logFile && logFile.log.length > 0 ? (
                      // <LogMap log={logFile} />
                      <div>TODO: LogMap not implemented yet</div>
                    ) : (
                      <BrowseMap />
                    )}
                  </>
                )}
              </>
            )}
          </>
        )}
      </main>
      <footer>
        <FileLoader
          fileInputRef={fileInputRef}
          onFileLoaded={(text) => {
            dataSource.current = DataSource.File;
            resetInput(text);
          }}
        />
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
      </footer>
    </div>
  );
}

export default App;
