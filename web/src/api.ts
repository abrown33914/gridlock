const BASE = "http://localhost:8000";

export async function getJSON(path: string) {
  const r = await fetch(`${BASE}${path}`);
  if (!r.ok) throw new Error(`${path} failed`);
  return r.json();
}

export async function postJSON(path: string, body: unknown) {
  const r = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error(`${path} failed`);
  return r.json();
}