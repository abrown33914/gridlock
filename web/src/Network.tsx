import { useEffect, useState } from "react";
import { getJSON } from "./api";

type Node = { id: string; name: string; coord: [number, number]; utility: string; load_mw: number };
type Flow = { line: string; name: string; mw: number; loading: number; overloaded: boolean };

const POS: Record<string, [number, number]> = {
  sanford_gen: [130, 90],
  apopka_sub: [200, 250],
  dona_vista: [340, 150],
  deland_west: [470, 80],
  eustis_tap: [400, 280],
  leesburg_sub: [540, 240],
  clermont_sub: [560, 360],
};

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

export default function Network() {
  const [nodes, setNodes] = useState<Node[]>([]);
  const [flows, setFlows] = useState<Flow[]>([]);

  useEffect(() => {
    getJSON("/nodes").then(setNodes).catch(console.error);
    getJSON("/powerflow").then((d) => setFlows(d.flows || [])).catch(console.error);
  }, []);

  const flowByLine: Record<string, Flow> = {};
  flows.forEach((f) => (flowByLine[f.line] = f));

  return (
    <svg width="100%" height="100%" viewBox="0 0 680 420" preserveAspectRatio="xMidYMid meet">
      {EDGES.map(([a, b, lineId]) => {
        const pa = POS[a], pb = POS[b];
        if (!pa || !pb) return null;
        const f = flowByLine[lineId];
        const loading = f ? f.loading : 0;
        const color = loadColor(loading);
        const width = 2 + loading * 5;
        return (
          <g key={lineId}>
            <line x1={pa[0]} y1={pa[1]} x2={pb[0]} y2={pb[1]}
              stroke={color} strokeWidth={width} strokeLinecap="round" />
            {loading > 1 && (
              <text x={(pa[0] + pb[0]) / 2} y={(pa[1] + pb[1]) / 2 - 10}
                fill="#F43F5E" fontSize="12" fontWeight="600" fontFamily="var(--mono)" textAnchor="middle">
                {Math.round(loading * 100)}%
              </text>
            )}
          </g>
        );
      })}
      {Object.entries(POS).map(([id, [x, y]]) => {
        const node = nodes.find((n) => n.id === id);
        const isGen = node && node.load_mw > 0;
        return (
          <g key={id}>
            <circle cx={x} cy={y} r={isGen ? 8 : 6}
              fill={isGen ? "#EA580C" : "#57503F"} stroke="var(--surface)" strokeWidth="2.5" />
            <text x={x} y={y - 15} fill="#57503F" fontSize="10" fontFamily="var(--mono)"
              textAnchor="middle" fontWeight="500">
              {id.replace(/_/g, " ").replace(" sub", "").replace(" gen", "").replace(" tap", "").trim()}
            </text>
          </g>
        );
      })}
    </svg>
  );
}