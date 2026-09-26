import { useEffect, useRef, useState } from "react";
import { getJSON, postJSON } from "./api";

declare const maplibregl: any;

type Node = { id: string; name: string; coord: [number, number]; load_mw: number };
type Flow = { line: string; loading: number };

const EDGES: [string, string, string][] = [
  ["sanford_gen", "apopka_sub", "duke_apopka_line"],
  ["apopka_sub", "dona_vista", "duke_apopka_dona_tie"],
  ["dona_vista", "deland_west", "duke_deland_dona_230"],
  ["dona_vista", "eustis_tap", "duke_eustis_feeder"],
  ["eustis_tap", "leesburg_sub", "tie_eustis_leesburg"],
  ["leesburg_sub", "clermont_sub", "teco_leesburg_line"],
];

function heatColor(load: number) {
  if (load > 1) return "#ff2d55";
  if (load > 0.85) return "#ff9500";
  if (load > 0.6) return "#ffd60a";
  return "#30e0c0";
}

export default function GridMap({ onStatus }: { onStatus?: (s: { peak: number }) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const [ready, setReady] = useState(false);
  const [nodes, setNodes] = useState<Node[]>([]);
  const [demand, setDemand] = useState(90);
  const flowsRef = useRef<Record<string, number>>({});
  const nodesRef = useRef<Record<string, Node>>({});
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pulsesRef = useRef<{ line: number; t: number }[]>([]);
  const pathsRef = useRef<Record<string, [number, number][]>>({});

  useEffect(() => {
    if (!ref.current || mapRef.current) return;
    const map = new maplibregl.Map({
      container: ref.current,
      style: "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json",
      center: [-81.5, 28.75],
      zoom: 8.5,
    });
    map.on("load", () => {
      map.resize();
      const layers = map.getStyle().layers || [];
      layers.forEach((l: any) => {
        const id = l.id.toLowerCase();
        if (l.type === "symbol" || id.includes("label") || id.includes("poi") || id.includes("place")) {
          try { map.setLayoutProperty(l.id, "visibility", "none"); } catch {}
        }
      });
      setReady(true);
    });
    mapRef.current = map;
  }, []);

  useEffect(() => {
    getJSON("/nodes").then((ns: Node[]) => {
      setNodes(ns);
      const by: Record<string, Node> = {};
      ns.forEach((n) => (by[n.id] = n));
      nodesRef.current = by;
    });
  }, []);

  useEffect(() => {
    if (nodes.length === 0) return;
    const by: Record<string, Node> = {};
    nodes.forEach((n) => (by[n.id] = n));

    async function routeAll() {
      for (const [a, b, lineId] of EDGES) {
        const na = by[a], nb = by[b];
        if (!na || !nb) continue;
        const coords = `${na.coord[0]},${na.coord[1]};${nb.coord[0]},${nb.coord[1]}`;
        try {
          const url = `https://router.project-osrm.org/route/v1/driving/${coords}?overview=full&geometries=geojson`;
          const res = await fetch(url);
          const data = await res.json();
          const line = data.routes?.[0]?.geometry?.coordinates;
          pathsRef.current[lineId] = (line && line.length > 1) ? line : [na.coord, nb.coord];
        } catch {
          pathsRef.current[lineId] = [na.coord, nb.coord];
        }
        await new Promise((r) => setTimeout(r, 1100));
      }
    }
    routeAll();
  }, [nodes]);

  useEffect(() => {
    const scale = demand / 90;
    postJSON("/powerflow/demand", { scale }).then((d: any) => {
      const map: Record<string, number> = {};
      (d.flows || []).forEach((f: Flow) => (map[f.line] = f.loading));
      flowsRef.current = map;
      let peak = 0;
      Object.values(map).forEach((l) => (l > peak ? (peak = l) : null));
      if (onStatus) onStatus({ peak });
    }).catch(() => {});
  }, [demand]);

  useEffect(() => {
    const p: { line: number; t: number }[] = [];
    EDGES.forEach((_, i) => { for (let k = 0; k < 5; k++) p.push({ line: i, t: Math.random() }); });
    pulsesRef.current = p;
  }, []);

  useEffect(() => {
    if (!ready || nodes.length === 0) return;
    const map = mapRef.current;
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    let raf = 0;

    function resize() {
      const r = ref.current!.getBoundingClientRect();
      canvas.width = r.width * devicePixelRatio;
      canvas.height = r.height * devicePixelRatio;
      canvas.style.width = r.width + "px";
      canvas.style.height = r.height + "px";
      ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
    }
    resize();
    window.addEventListener("resize", resize);

    function project(coord: [number, number]) {
      const p = map.project(coord);
      return [p.x, p.y];
    }

    function frame() {
      const r = ref.current!.getBoundingClientRect();
      ctx.clearRect(0, 0, r.width, r.height);

      EDGES.forEach(([a, b, lineId]) => {
        const na = nodesRef.current[a], nb = nodesRef.current[b];
        if (!na || !nb) return;
        const load = flowsRef.current[lineId] ?? 0;
        if (load <= 1) return;
        const pa = project(na.coord), pb = project(nb.coord);
        const mx = (pa[0] + pb[0]) / 2, my = (pa[1] + pb[1]) / 2;
        const pulse = 0.15 + 0.1 * Math.sin(Date.now() / 200);
        const grad = ctx.createRadialGradient(mx, my, 0, mx, my, 140);
        grad.addColorStop(0, `rgba(255,45,85,${pulse})`);
        grad.addColorStop(1, "rgba(255,45,85,0)");
        ctx.fillStyle = grad;
        ctx.fillRect(mx - 140, my - 140, 280, 280);
      });

      EDGES.forEach(([a, b, lineId]) => {
        const load = flowsRef.current[lineId] ?? 0;
        const col = heatColor(load);
        const path = pathsRef.current[lineId] || [nodesRef.current[a]?.coord, nodesRef.current[b]?.coord];
        if (!path || !path[0]) return;
        const pts = path.map((c: [number, number]) => project(c));
        ctx.strokeStyle = col;
        ctx.globalAlpha = 0.28;
        ctx.lineWidth = load > 1 ? 5 : 3;
        ctx.beginPath();
        pts.forEach((p, i) => (i === 0 ? ctx.moveTo(p[0], p[1]) : ctx.lineTo(p[0], p[1])));
        ctx.stroke();
        if (load > 1) {
          ctx.globalAlpha = 0.12 + 0.1 * Math.sin(Date.now() / 140);
          ctx.lineWidth = 14;
          ctx.stroke();
        }
      });

      pulsesRef.current.forEach((p) => {
        const [a, b, lineId] = EDGES[p.line];
        const load = flowsRef.current[lineId] ?? 0;
        const col = heatColor(load);
        const path = pathsRef.current[lineId] || [nodesRef.current[a]?.coord, nodesRef.current[b]?.coord];
        if (!path || !path[0]) return;
        const speed = 0.002 + load * 0.007;
        p.t += speed; if (p.t > 1) p.t -= 1;
        const seg = p.t * (path.length - 1);
        const idx = Math.floor(seg);
        const frac = seg - idx;
        const c1 = path[idx], c2 = path[Math.min(idx + 1, path.length - 1)];
        const p1 = project(c1), p2 = project(c2);
        const x = p1[0] + (p2[0] - p1[0]) * frac;
        const y = p1[1] + (p2[1] - p1[1]) * frac;
        const sz = load > 1 ? 3.5 : 2.2;
        ctx.globalAlpha = 0.95; ctx.fillStyle = col;
        ctx.beginPath(); ctx.arc(x, y, sz, 0, 7); ctx.fill();
        ctx.globalAlpha = 0.3;
        ctx.beginPath(); ctx.arc(x, y, sz * 2.6, 0, 7); ctx.fill();
      });

      ctx.globalAlpha = 1;
      raf = requestAnimationFrame(frame);
    }
    frame();
    return () => { cancelAnimationFrame(raf); window.removeEventListener("resize", resize); };
  }, [ready, nodes]);

  return (
    <>
      <div ref={ref} style={{ width: "100%", height: "100%", minHeight: 400 }} />
      <canvas ref={canvasRef} style={{ position: "absolute", inset: 0, pointerEvents: "none" }} />
      <div style={{ position: "absolute", left: 16, right: 16, bottom: 16, zIndex: 5,
        display: "flex", alignItems: "center", gap: 12,
        background: "rgba(10,14,20,0.82)", border: "1px solid #1E2530", borderRadius: 10,
        padding: "10px 14px", backdropFilter: "blur(8px)" }}>
        <span style={{ fontSize: 11, color: "#8A93A5", fontFamily: "var(--mono)", whiteSpace: "nowrap" }}>
          summer heat
        </span>
        <input type="range" min={60} max={180} value={demand} step={1}
          onChange={(e) => setDemand(+e.target.value)} style={{ flex: 1 }} />
        <span style={{ fontSize: 11, color: "#E6E9EF", fontFamily: "var(--mono)", minWidth: 44 }}>
          {demand}%
        </span>
      </div>
    </>
  );
}