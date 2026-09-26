import networkx as nx

def build_graph(projects):
    g = nx.DiGraph()
    for p in projects:
        g.add_node(p["id"], name=p["name"], kind=p["kind"])

    by_node = {}
    for p in projects:
        node = p.get("node") or p.get("host_node")
        if node:
            by_node.setdefault(node, []).append(p["id"])

    for p in projects:
        pid = p["id"]
        if p["kind"] == "line":
            for endpoint in (p.get("from_node"), p.get("to_node")):
                for other in by_node.get(endpoint, []):
                    if other != pid:
                        g.add_edge(other, pid, reason="endpoint")
        if p["kind"] == "upgrade":
            host = p.get("host_node")
            for other in by_node.get(host, []):
                if other != pid:
                    g.add_edge(other, pid, reason="host")
        hint = p.get("depends_on_hint")
        if hint:
            g.add_edge(hint, pid, reason="explicit")

    for p in projects:
        if p["kind"] == "line":
            fn, tn = p.get("from_node"), p.get("to_node")
            for q in projects:
                if q["kind"] == "line" and q["id"] != p["id"]:
                    if q.get("to_node") == fn or q.get("to_node") == tn:
                        pass
    return g

def graph_json(projects):
    g = build_graph(projects)
    return {
        "nodes": [{"id": n, "name": g.nodes[n]["name"], "kind": g.nodes[n]["kind"]} for n in g.nodes],
        "edges": [{"from": u, "to": v, "reason": d.get("reason", "")} for u, v, d in g.edges(data=True)],
    }

def cascade_levels(projects, failed_id):
    g = build_graph(projects)
    if failed_id not in g:
        return {"levels": []}
    levels = []
    seen = {failed_id}
    frontier = [failed_id]
    levels.append([failed_id])
    while frontier:
        nxt = []
        for node in frontier:
            for succ in g.successors(node):
                if succ not in seen:
                    seen.add(succ)
                    nxt.append(succ)
        if nxt:
            levels.append(nxt)
        frontier = nxt
    return {"levels": levels, "total": len(seen) - 1}