import React from "react";

/**
 * A React component that renders an input field with a label and caches the input value in `localStorage`.
 *
 * @param label - The label to display for the input field.
 * @param cacheKey - The key to use for storing the input value in localStorage.
 * @param onValueChange - A callback function that is called whenever the input value changes.
 * @param style - Optional CSS styles to apply to the component.
 */
const CachedInput = ({
  label,
  cacheKey,
  onValueChange,
  style,
}: {
  label: string;
  cacheKey: string;
  onValueChange: (key: string) => void;
  style?: React.CSSProperties;
}) => {
  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    localStorage.setItem(cacheKey, event.target.value);
    onValueChange(event.target.value);
  };

  React.useEffect(() => {
    const storedValue = localStorage.getItem(cacheKey);
    if (storedValue) {
      onValueChange(storedValue);
    }
  }, []);

  const value = localStorage.getItem(cacheKey) || "";

  return (
    <div
      style={{
        display: "inline-block",
        ...style,
      }}
    >
      <label htmlFor="apiKeyField">{label}:</label>
      <input
        onPaste={(e) => {
          e.stopPropagation();
        }}
        style={{
          marginLeft: "10px",
          backgroundColor: "white",
          border: "none",
          borderBottom: "1px solid #ccc",
        }}
        id="apiKeyField"
        type="password"
        value={value}
        onChange={handleChange}
      />
    </div>
  );
};

export default CachedInput;
