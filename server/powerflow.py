import numpy as np

def solve(nodes, lines):
    """DC power flow. Returns MW flow and loading fraction per line.
    Simplified linear model (DC approximation) used for first-pass screening."""
    ids = [n["id"] for n in nodes]
    idx = {nid: i for i, nid in enumerate(ids)}
    n = len(ids)

    # Build B matrix (susceptance) from lines that carry power
    B = np.zeros((n, n))
    carriers = [l for l in lines if l.get("reactance")]
    for l in carriers:
        i, j = idx[l["from_node"]], idx[l["to_node"]]
        b = 1.0 / l["reactance"]
        B[i, i] += b
        B[j, j] += b
        B[i, j] -= b
        B[j, i] -= b

    # Power injection per node (MW). load_mw: + generates, - consumes.
    P = np.array([node["load_mw"] for node in nodes], dtype=float)
    # Balance the system so total injection = 0 (physics requires it)
    P -= P.sum() / n

    # Slack bus = node 0; solve for voltage angles on the rest
    theta = np.zeros(n)
    try:
        theta[1:] = np.linalg.solve(B[1:, 1:], P[1:])
    except np.linalg.LinAlgError:
        return {"error": "network not solvable (disconnected node?)"}

    # Flow on each line = (angle difference) / reactance
    results = []
    for l in carriers:
        i, j = idx[l["from_node"]], idx[l["to_node"]]
        mw = (theta[i] - theta[j]) / l["reactance"]
        cap = l.get("capacity_mw", 1) or 1
        results.append({
            "line": l["id"],
            "name": l["name"],
            "mw": round(float(mw), 1),
            "loading": round(float(abs(mw) / cap), 3),
            "overloaded": bool(abs(mw) / cap > 1.0),
        })
    return {"flows": results}