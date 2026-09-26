import { useEffect, useRef, useState } from "react";
import { getJSON } from "./api";

declare const maplibregl: any;

type Node = { id: string; name: string; coord: [number, number]; load_mw: number };
type Flow = { line: string; loading: number; overloaded: boolean };

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

export default function MapView() {
  const ref = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const [ready, setReady] = useState(false);
  const [nodes, setNodes] = useState<Node[]>([]);
  const [flows, setFlows] = useState<Flow[]>([]);

  useEffect(() => {
    if (!ref.current || mapRef.current) return;
    const map = new maplibregl.Map({
      container: ref.current,
      style: "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json",
      center: [-81.5, 28.85],
      zoom: 8.3,
    });
    map.on("load", () => {
      map.resize();
      setReady(true);
    });
    mapRef.current = map;
  }, []);

  useEffect(() => {
    getJSON("/nodes").then(setNodes).catch(console.error);
    getJSON("/powerflow").then((d) => setFlows(d.flows || [])).catch(console.error);
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready || nodes.length === 0) return;

    const nodeById: Record<string, Node> = {};
    nodes.forEach((n) => (nodeById[n.id] = n));
    const flowByLine: Record<string, Flow> = {};
    flows.forEach((f) => (flowByLine[f.line] = f));

    EDGES.forEach(([a, b, lineId]) => {
      const na = nodeById[a], nb = nodeById[b];
      if (!na || !nb) return;
      const f = flowByLine[lineId];
      const loading = f ? f.loading : 0;
      const srcId = `line-${lineId}`;
      const geo: any = {
        type: "Feature", properties: {},
        geometry: { type: "LineString", coordinates: [na.coord, nb.coord] },
      };
      if (map.getSource(srcId)) {
        (map.getSource(srcId) as maplibregl.GeoJSONSource).setData(geo);
        map.setPaintProperty(srcId, "line-color", loadColor(loading));
        map.setPaintProperty(srcId, "line-width", 2 + loading * 6);
      } else {
        map.addSource(srcId, { type: "geojson", data: geo });
        map.addLayer({
          id: srcId, type: "line", source: srcId,
          paint: { "line-color": loadColor(loading), "line-width": 2 + loading * 6, "line-opacity": 0.9 },
        });
      }
    });

    nodes.forEach((n) => {
      const el = document.createElement("div");
      const isGen = n.load_mw > 0;
      el.style.cssText = `width:${isGen ? 16 : 12}px;height:${isGen ? 16 : 12}px;border-radius:50%;background:${isGen ? "#EA580C" : "#57503F"};border:2.5px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,0.3)`;
      new maplibregl.Marker({ element: el }).setLngLat(n.coord)
        .setPopup(new maplibregl.Popup({ offset: 14 }).setText(n.name))
        .addTo(map);
    });
  }, [ready, nodes, flows]);

  return <div ref={ref} style={{ position: "absolute", inset: 0 }} />;
}