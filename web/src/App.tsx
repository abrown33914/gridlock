import { useEffect, useState } from "react";

export default function App() {
  const [status, setStatus] = useState("checking...");

  useEffect(() => {
    fetch("http://localhost:8000/health")
      .then((r) => r.json())
      .then((d) => setStatus(d.status))
      .catch(() => setStatus("backend not reachable"));
  }, []);

  return (
    <div style={{ fontFamily: "system-ui", padding: 40 }}>
      <h1>Gridlock</h1>
      <p>Backend: {status}</p>
    </div>
  );
}