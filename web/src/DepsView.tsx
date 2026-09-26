import { useEffect, useRef, useState } from "react";
import { getJSON, postJSON } from "./api";

declare const maplibregl: any;

type Node = { id: string; name: string; coord: [number, number]; load_mw: number };
type Project = { id: string; name: string; geometry: number[][]; utility: string; kind: string };

export default function DepsView({ onDamage }: { onDamage?: (n: number) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markersRef = useRef<Record<string, HTMLDivElement>>({});
  const [ready, setReady] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);

  useEffect(() => {
    if (!ref.current || mapRef.current) return;
    const map = new maplibregl.Map({
      container: ref.current,
      style: "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json",
      center: [-81.5, 28.85],
      zoom: 8.3,
    });
    map.on("load", () => { map.resize(); setReady(true); });
    mapRef.current = map;
  }, []);

  useEffect(() => {
    getJSON("/projects").then(setProjects).catch(console.error);
  }, []);

  useEffect(() => {
    if (!ready || projects.length === 0) return;
    const map = mapRef.current;

    projects.forEach((p) => {
      const coord = p.geometry[0];
      if (!coord) return;
      const el = document.createElement("div");
      el.style.cssText = `width:14px;height:14px;border-radius:50%;background:${p.utility === "Duke" ? "#EA580C" : "#F59E0B"};border:2px solid #14110E;box-shadow:0 0 0 1px rgba(255,255,255,0.3);cursor:pointer;transition:all 0.3s`;
      el.title = p.name;
      el.addEventListener("click", (e) => { e.stopPropagation(); kill(p.id); });
      markersRef.current[p.id] = el;
      new maplibregl.Marker({ element: el }).setLngLat(coord)
        .setPopup(new maplibregl.Popup({ offset: 12 }).setText(p.name)).addTo(map);
    });
  }, [ready, projects]);

  function resetMarkers() {
    projects.forEach((p) => {
      const el = markersRef.current[p.id];
      if (el) {
        el.style.background = p.utility === "Duke" ? "#EA580C" : "#F59E0B";
        el.style.opacity = "1";
        el.style.transform = "scale(1)";
      }
    });
  }

  async function kill(id: string) {
    resetMarkers();
    const res = await postJSON("/dependencies/cascade", { failed_id: id });
    const levels: string[][] = res.levels || [];
    let dead = 0;

    levels.forEach((level, i) => {
      setTimeout(() => {
        level.forEach((pid) => {
          const el = markersRef.current[pid];
          if (!el) return;
          el.style.transition = "all 0.4s";
          el.style.background = "#F43F5E";
          el.style.transform = "scale(1.8)";
          setTimeout(() => {
            el.style.transform = "scale(1)";
            el.style.opacity = "0.25";
          }, 400);
        });
        dead += level.length;
        if (onDamage) onDamage(i === 0 ? 0 : dead - 1);
      }, i * 700);
    });
  }

  return (
    <>
      <div ref={ref} style={{ width: "100%", height: "100%", minHeight: 400 }} />
      <div style={{ position: "absolute", top: 14, left: 14, zIndex: 5,
        padding: "8px 14px", borderRadius: 8, background: "var(--panel)", color: "#fff",
        fontFamily: "var(--mono)", fontSize: 12 }}>
        click a project to cut it
      </div>
    </>
  );
}