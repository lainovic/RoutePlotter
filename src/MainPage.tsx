export default function MainPage() {
  return (
    <div className="map-container">
      <h1>Hello, route</h1>
      <div className="highlighted-field">
        <div className="note">
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
    </div>
  );
}
