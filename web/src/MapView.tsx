import { useEffect, useRef, useState } from "react";
import { getJSON, postJSON } from "./api";

declare const maplibregl: any;

type Node = { id: string; name: string; coord: [number, number]; load_mw: number };
type Flow = { line: string; name: string; loading: number; overloaded: boolean };

const EDGES: [string, string, string][] = [
  ["sanford_gen", "apopka_sub", "duke_apopka_line"],
  ["apopka_sub", "dona_vista", "duke_apopka_dona_tie"],
  ["dona_vista", "deland_west", "duke_deland_dona_230"],
  ["dona_vista", "eustis_tap", "duke_eustis_feeder"],
  ["eustis_tap", "leesburg_sub", "tie_eustis_leesburg"],
  ["leesburg_sub", "clermont_sub", "teco_leesburg_line"],
];

function loadColor(loading: number) {
  if (loading > 1) return "#F43F5E";
  if (loading > 0.85) return "#F59E0B";
  return "#14B8A6";
}

export default function MapView({ onStatus }: { onStatus?: (s: { overloaded: boolean; max: number }) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const [ready, setReady] = useState(false);
  const [nodes, setNodes] = useState<Node[]>([]);
  const [flows, setFlows] = useState<Flow[]>([]);
  const [drawing, setDrawing] = useState(false);
  const [pick, setPick] = useState<string[]>([]);
  const drawingRef = useRef(false);
  const pickRef = useRef<string[]>([]);
  drawingRef.current = drawing;
  pickRef.current = pick;

  useEffect(() => {
    if (!ref.current || mapRef.current) return;
    const map = new maplibregl.Map({
      container: ref.current,
      style: "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json",
      center: [-81.5, 28.85],
      zoom: 8.3,
    });
    map.on("load", () => { map.resize(); setReady(true); });
    mapRef.current = map;
  }, []);

  useEffect(() => {
    getJSON("/nodes").then(setNodes).catch(console.error);
    getJSON("/powerflow").then((d) => setFlows(d.flows || [])).catch(console.error);
  }, []);

  function drawLines(currentFlows: Flow[], proposed?: [string, string]) {
    const map = mapRef.current;
    if (!map || nodes.length === 0) return;
    const nodeById: Record<string, Node> = {};
    nodes.forEach((n) => (nodeById[n.id] = n));
    const flowByLine: Record<string, Flow> = {};
    currentFlows.forEach((f) => (flowByLine[f.line] = f));

    const allEdges = [...EDGES];
    if (proposed) allEdges.push([proposed[0], proposed[1], "demo_new_line"]);

    let maxLoad = 0;
    allEdges.forEach(([a, b, lineId]) => {
      const na = nodeById[a], nb = nodeById[b];
      if (!na || !nb) return;
      const f = flowByLine[lineId];
      const loading = f ? f.loading : 0;
      if (loading > maxLoad) maxLoad = loading;
      const srcId = `line-${lineId}`;
      const geo: any = { type: "Feature", properties: {}, geometry: { type: "LineString", coordinates: [na.coord, nb.coord] } };
      if (map.getSource(srcId)) {
        map.getSource(srcId).setData(geo);
        map.setPaintProperty(srcId, "line-color", lineId === "demo_new_line" ? "#4a9eff" : loadColor(loading));
        map.setPaintProperty(srcId, "line-width", 2 + loading * 6);
      } else {
        map.addSource(srcId, { type: "geojson", data: geo });
        map.addLayer({ id: srcId, type: "line", source: srcId,
          paint: { "line-color": lineId === "demo_new_line" ? "#4a9eff" : loadColor(loading), "line-width": 2 + loading * 6, "line-opacity": 0.9 } });
      }
    });
    if (onStatus) onStatus({ overloaded: maxLoad > 1, max: maxLoad });
  }

  useEffect(() => {
    if (!ready || nodes.length === 0) return;
    drawLines(flows);
    const map = mapRef.current;
    nodes.forEach((n) => {
      const el = document.createElement("div");
      const isGen = n.load_mw > 0;
      el.style.cssText = `width:${isGen ? 18 : 13}px;height:${isGen ? 18 : 13}px;border-radius:50%;background:${isGen ? "#EA580C" : "#57503F"};border:2.5px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,0.3);cursor:pointer`;
      el.addEventListener("click", (e) => {
        e.stopPropagation();
        if (!drawingRef.current) return;
        const next = [...pickRef.current, n.id];
        if (next.length === 2) {
          proposeLine(next[0], next[1]);
          setPick([]);
          setDrawing(false);
        } else {
          setPick(next);
          el.style.background = "#4a9eff";
        }
      });
      new maplibregl.Marker({ element: el }).setLngLat(n.coord)
        .setPopup(new maplibregl.Popup({ offset: 14 }).setText(n.name)).addTo(map);
    });
  }, [ready, nodes]);

  useEffect(() => { if (ready) drawLines(flows); }, [flows]);

  async function proposeLine(from: string, to: string) {
    const body = {
      id: "demo_new_line",
      name: `Proposed ${from} - ${to}`,
      from_node: from, to_node: to,
      reactance: 0.03, capacity_mw: 150,
    };
    const res = await postJSON("/powerflow/whatif", body);
    drawLines(res.flows || [], [from, to]);
  }

  return (
    <>
      <div ref={ref} style={{ width: "100%", height: "100%", minHeight: 400 }} />
      <button onClick={() => { setDrawing(true); setPick([]); }}
        style={{ position: "absolute", top: 14, left: 14, zIndex: 5,
          padding: "8px 14px", borderRadius: 8, border: "none", cursor: "pointer",
          background: drawing ? "#4a9eff" : "var(--panel)", color: "#fff",
          fontFamily: "var(--mono)", fontSize: 12, fontWeight: 500 }}>
        {drawing ? `pick ${2 - pick.length} substation${2 - pick.length === 1 ? "" : "s"}` : "+ propose line"}
      </button>
    </>
  );
}