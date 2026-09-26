import { useState } from "react";
import Network from "./Network";
import MapView from "./MapView";
import DepsView from "./DepsView";
import GridMap from "./GridMap";

type Layer = "flow" | "deps" | "coord";

export default function App() {
  const [layer, setLayer] = useState<Layer>("flow");
  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column", background: "var(--bg)" }}>
      <TopBar layer={layer} setLayer={setLayer} />
      <div style={{ flex: 1, display: "grid", gridTemplateColumns: "180px 1fr 220px", minHeight: 0 }}>
        <LeftRail />
        <MapZone layer={layer} />
        <RightRail />
      </div>
    </div>
  );
}

function TopBar({ layer, setLayer }: { layer: Layer; setLayer: (l: Layer) => void }) {
  const tabs: [Layer, string][] = [["flow", "power flow"], ["deps", "dependencies"], ["coord", "coordination"]];
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: "12px 18px", background: "var(--panel)", borderBottom: "1px solid var(--panel-border)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
        <div style={{ width: 30, height: 30, borderRadius: 7,
          background: "linear-gradient(135deg,var(--amber),var(--orange))",
          display: "grid", placeItems: "center", color: "var(--panel)", fontWeight: 700, fontSize: 15 }}>G</div>
        <div>
          <div style={{ fontFamily: "var(--display)", fontSize: 15, color: "var(--text-on-dark)", letterSpacing: "-0.2px" }}>GRIDLOCK</div>
          <div style={{ fontSize: 9, color: "var(--text-dim)", fontFamily: "var(--mono)", letterSpacing: "0.5px", marginTop: 2 }}>
            CENTRAL FLORIDA · 2 UTILITIES · 9 PROJECTS
          </div>
        </div>
      </div>
      <div style={{ display: "flex", gap: 5 }}>
        {tabs.map(([id, label]) => (
          <button key={id} onClick={() => setLayer(id)}
            style={{ fontSize: 11, padding: "7px 14px", borderRadius: 20, cursor: "pointer",
              fontFamily: "var(--mono)", border: "none", letterSpacing: "0.3px",
              fontWeight: layer === id ? 700 : 400,
              background: layer === id ? "var(--amber)" : "transparent",
              color: layer === id ? "var(--panel)" : "var(--text-dim)" }}>
            {label}
          </button>
        ))}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 10,
        color: "var(--teal)", fontFamily: "var(--mono)", letterSpacing: "0.5px" }}>
        <span style={{ width: 7, height: 7, borderRadius: "50%", background: "var(--teal)" }} />
        LIVE
      </div>
    </div>
  );
}

function LeftRail() {
  return (
    <div style={{ borderRight: "1px solid var(--border)", background: "var(--surface)",
      padding: 14, display: "flex", flexDirection: "column", gap: 6 }}>
      <RailHead>utilities</RailHead>
      <RailItem color="var(--duke)" label="Duke Energy" />
      <RailItem color="var(--teco)" label="TECO" />
      <RailHead>proposed</RailHead>
      <RailItem label="+ New line" />
    </div>
  );
}

function RailHead({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: 9, textTransform: "uppercase", letterSpacing: 1,
    color: "var(--text-mute)", fontFamily: "var(--mono)", padding: "10px 8px 3px" }}>{children}</div>;
}

function RailItem({ color, label }: { color?: string; label: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 9, fontSize: 12.5,
      padding: "9px 11px", borderRadius: 8, color: "var(--text)", cursor: "pointer",
      background: "var(--surface-2)", border: "1px solid var(--border)", fontWeight: 500 }}>
      {color && <span style={{ width: 8, height: 8, borderRadius: 2, background: color }} />}
      {label}
    </div>
  );
}

function MapZone({ layer }: { layer: Layer }) {
  return (
    <div style={{ position: "relative", overflow: "hidden",
      background: "radial-gradient(circle at 35% 40%, var(--surface), var(--surface-2))" }}>
      {layer === "flow" && <GridMap />}
      {layer === "deps" && <DepsView />}
      {layer === "coord" && (
        <div style={{ height: "100%", display: "grid", placeItems: "center",
          color: "var(--text-mute)", fontFamily: "var(--mono)", fontSize: 13 }}>
          coordination view coming soon
        </div>
      )}
    </div>
  );
}

function RightRail() {
  return (
    <div style={{ background: "var(--panel)", padding: 14, display: "flex", flexDirection: "column", gap: 10 }}>
      <Metric k="network status" v="—" color="var(--text-on-dark)" />
      <div style={{ fontSize: 9, color: "var(--text-dim)", fontFamily: "var(--mono)",
        textTransform: "uppercase", letterSpacing: 1, marginTop: 4 }}>coordination</div>
      <div style={{ fontSize: 12, color: "var(--text-dim)", fontFamily: "var(--mono)" }}>opportunities appear here</div>
    </div>
  );
}

function Metric({ k, v, color }: { k: string; v: string; color: string }) {
  return (
    <div style={{ background: "var(--panel-2)", borderRadius: 10, padding: "11px 13px",
      border: "1px solid var(--panel-border)" }}>
      <div style={{ fontSize: 9, color: "var(--text-dim)", textTransform: "uppercase",
        letterSpacing: 1, fontFamily: "var(--mono)" }}>{k}</div>
      <div style={{ fontSize: 22, fontWeight: 600, fontFamily: "var(--mono)", marginTop: 3, color }}>{v}</div>
    </div>
  );
}