import React from "react";

const KeyInput = ({ label }: { label: string }) => {
  const [inputValue, setInputValue] = React.useState("");
  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    localStorage.setItem("tt_api_key", event.target.value);
    setInputValue(event.target.value);
  };

  React.useEffect(() => {
    const storedValue = localStorage.getItem("tt_api_key");
    if (storedValue) {
      setInputValue(storedValue);
    }
  }, []);

  return (
    <>
      <label htmlFor="apiKeyField">{label}:</label>
      <input
        style={{
          marginLeft: "10px",
          backgroundColor: "white",
          border: "none",
          borderBottom: "1px solid #ccc",
        }}
        id="apiKeyField"
        type="password"
        value={inputValue}
        onChange={handleChange}
      />
    </>
  );
};

export default KeyInput;
