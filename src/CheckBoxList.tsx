export default function CheckBoxList() {
  return (
    <div id="route-checkboxes">
      <div>
        <input type="checkbox" id="routePoints" />
        <label htmlFor="routePoints">Route points</label>
      </div>
      <div>
        <input type="checkbox" id="instructions" />
        <label htmlFor="instructions">Guidance instructions</label>
      </div>
    </div>
  );
}
