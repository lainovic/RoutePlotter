import { tomTomRed, tomTomWhite } from './colors'; // Import color constants


export default function Button({ text, onClick }: { text: string, onClick: () => void}) {
  return <button className="button" onClick={onClick} style={buttonStyle}>{text}</button>;
}

const buttonStyle: React.CSSProperties = {
  padding: "10px 20px",
  fontSize: "16px",
  backgroundColor: `${tomTomRed}`,
  color: `${tomTomWhite}`,
  border: "none",
  borderRadius: "5px",
  cursor: "pointer",
};
