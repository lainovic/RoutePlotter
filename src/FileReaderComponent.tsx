import React from "react";

export default function FileReaderComponent({
  onFileLoaded,
  fileInputRef,
}: {
  onFileLoaded: (content: string) => void;
  fileInputRef: React.RefObject<HTMLInputElement>;
}) {
  const handleFileInputChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target?.result) {
          onFileLoaded(e.target.result as string);
        }
      };
      reader.readAsText(file);
    }
  };

  return (
    <input
      ref={fileInputRef}
      type="file"
      accept=".csv, .txt, .json"
      onChange={handleFileInputChange}
    />
  );
}
