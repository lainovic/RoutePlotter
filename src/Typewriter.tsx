import React from "react";

export default function Typewriter({
  text,
  delay,
  infinite = false,
}: {
  text: string;
  delay: number;
  infinite: boolean;
}) {
  const [currentText, setCurrentText] = React.useState("");
  const [currentIndex, setCurrentIndex] = React.useState(0);

  React.useEffect(() => {
    let timeout: number;

    if (currentIndex < text.length) {
      timeout = setTimeout(() => {
        setCurrentText((prevText) => prevText + text[currentIndex]);
        setCurrentIndex((prevIndex) => prevIndex + 1);
      }, delay);
    } else if (infinite) {
      timeout = setTimeout(() => {
        setCurrentIndex(0);
        setCurrentText("");
      }, delay);
    }

    return () => clearTimeout(timeout);
  }, [currentIndex, delay, text, infinite]);

  return <>{currentText}</>;
}
